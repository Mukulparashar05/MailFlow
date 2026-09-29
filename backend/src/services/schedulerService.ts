import { prisma } from '../config/database';
import { getEmailQueue } from '../config/queue';
import { logger } from '../config/logger';
import { EmailStatus } from '@prisma/client';

/**
 * Scheduler Service
 *
 * Converts a campaign's recipients into BullMQ delayed jobs.
 * Each email gets a unique deterministic jobId = `email-job-${emailJobId}`
 * to prevent duplicate enqueuing.
 */

export async function scheduleCampaign(campaignId: string): Promise<void> {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
    include: {
      emailJobs: {
        where: {
          status: { in: [EmailStatus.PENDING, EmailStatus.FAILED] },
        },
        orderBy: { scheduledAt: 'asc' },
      },
    },
  });

  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found`);
  }

  const queue = getEmailQueue();
  let enqueued = 0;

  for (const emailJob of campaign.emailJobs) {
    const now = Date.now();
    const scheduledMs = emailJob.scheduledAt.getTime();
    const delay = Math.max(0, scheduledMs - now);
    const bullJobId = `email-job-${emailJob.id}`;

    try {
      await queue.add(
        'send-email',
        { emailJobId: emailJob.id },
        {
          delay,
          jobId: bullJobId, // idempotent - BullMQ ignores if already exists
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );

      // Update status to SCHEDULED and store bullJobId
      await prisma.emailJob.update({
        where: { id: emailJob.id },
        data: {
          status: EmailStatus.SCHEDULED,
          bullJobId,
        },
      });

      enqueued++;
      logger.debug('Email job scheduled', {
        emailJobId: emailJob.id,
        bullJobId,
        scheduledAt: emailJob.scheduledAt,
        delayMs: delay,
      });
    } catch (err) {
      // BullMQ throws if job with same ID exists - that's fine (idempotent)
      logger.debug('Email job already exists in queue (idempotent)', {
        bullJobId,
        error: err instanceof Error ? err.message : 'Unknown',
      });
    }
  }

  // Update campaign status
  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: { status: 'SCHEDULED' },
  });

  logger.info('Campaign scheduled', { campaignId, enqueued });
}

/**
 * Restart Recovery / Reconciliation
 *
 * On worker startup, find all EmailJob records that are SCHEDULED or PENDING
 * but whose BullMQ job may have been lost. Recreate only missing jobs.
 *
 * This is SAFE because:
 * 1. BullMQ jobId is deterministic — adding same jobId is a no-op.
 * 2. Worker checks DB status before sending — already-SENT jobs are skipped.
 */
export async function reconcileScheduledJobs(): Promise<void> {
  logger.info('Starting startup reconciliation...');

  const pendingJobs = await prisma.emailJob.findMany({
    where: {
      status: { in: [EmailStatus.SCHEDULED, EmailStatus.PENDING] },
    },
    include: { campaign: true },
    orderBy: { scheduledAt: 'asc' },
  });

  if (pendingJobs.length === 0) {
    logger.info('Reconciliation: no pending/scheduled jobs found');
    return;
  }

  const queue = getEmailQueue();
  let reconciled = 0;
  let skipped = 0;

  for (const emailJob of pendingJobs) {
    const bullJobId = emailJob.bullJobId || `email-job-${emailJob.id}`;
    const now = Date.now();
    const scheduledMs = emailJob.scheduledAt.getTime();
    const delay = Math.max(0, scheduledMs - now);

    try {
      await queue.add(
        'send-email',
        { emailJobId: emailJob.id },
        {
          delay,
          jobId: bullJobId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );

      if (!emailJob.bullJobId) {
        await prisma.emailJob.update({
          where: { id: emailJob.id },
          data: { bullJobId, status: EmailStatus.SCHEDULED },
        });
      }

      reconciled++;
    } catch {
      skipped++; // Already exists - ok
    }
  }

  logger.info('Reconciliation complete', {
    total: pendingJobs.length,
    reconciled,
    skipped,
  });
}
