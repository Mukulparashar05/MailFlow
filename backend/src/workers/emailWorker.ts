import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { EmailStatus } from '@prisma/client';
import { prisma, connectDatabase } from '../config/database';
import { getRedisClient, connectRedis } from '../config/redis';
import { QUEUE_NAME, EmailJobPayload, getEmailQueue } from '../config/queue';
import { sendEmail } from '../services/emailService';
import { checkAndIncrementRateLimit } from '../services/rateLimiter';
import { reconcileScheduledJobs } from '../services/schedulerService';
import { sendSlackNotification } from '../services/slackService';
import { logger } from '../config/logger';

const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);

/**
 * Email Worker
 *
 * Processes BullMQ jobs with the following guarantees:
 * 1. IDEMPOTENCY: Always checks DB status before sending
 * 2. RATE LIMITING: Atomic Redis counter per campaign per hour
 * 3. DUPLICATE PROTECTION: DB unique constraint + state machine
 * 4. GRACEFUL ERRORS: Slack errors never crash the worker
 */
async function processEmailJob(job: Job<EmailJobPayload>): Promise<void> {
  const { emailJobId } = job.data;

  logger.info('Processing email job', { emailJobId, jobId: job.id, attempt: job.attemptsMade });

  // --- IDEMPOTENCY CHECK ---
  // Always read fresh from DB. If already SENT, skip silently.
  const emailJob = await prisma.emailJob.findUnique({
    where: { id: emailJobId },
    include: { campaign: true },
  });

  if (!emailJob) {
    logger.error('Email job not found in database', { emailJobId });
    return; // Don't retry - job doesn't exist
  }

  if (emailJob.status === EmailStatus.SENT) {
    logger.info('Email already sent — skipping (idempotent)', { emailJobId });
    return;
  }

  if (emailJob.status === EmailStatus.FAILED && emailJob.attempts >= 3) {
    logger.info('Email job exhausted retries — skipping', { emailJobId });
    return;
  }

  const campaign = emailJob.campaign;

  // --- DISTRIBUTED RATE LIMIT CHECK ---
  const rateLimitResult = await checkAndIncrementRateLimit(campaign.id, campaign.hourlyLimit);

  if (!rateLimitResult.allowed) {
    const delayMs = rateLimitResult.nextWindowAt.getTime() - Date.now() + 1000; // +1s buffer
    
    logger.warn('Rate limit reached — rescheduling email job', {
      emailJobId,
      campaignId: campaign.id,
      nextWindowAt: rateLimitResult.nextWindowAt,
      delayMs,
    });

    // Re-add the job with delay to reschedule properly
    // BullMQ's moveToDelayed can be unreliable, so we add a new delayed job
    const queue = getEmailQueue();
    const newJobId = `email-job-${emailJobId}-retry-${Date.now()}`;
    
    await queue.add(
      'send-email',
      { emailJobId },
      {
        delay: delayMs,
        jobId: newJobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    logger.info('Email job rescheduled for next rate limit window', {
      emailJobId,
      newJobId,
      delayMs,
      nextWindowAt: rateLimitResult.nextWindowAt,
    });

    // Send Slack notification if connected (only once per campaign per hour)
    const slackNotifKey = `slack_notif:${campaign.id}:${Math.floor(Date.now() / 3600000)}`;
    const redis = getRedisClient();
    const alreadyNotified = await redis.get(slackNotifKey);
    
    if (!alreadyNotified) {
      try {
        await sendSlackNotification(campaign.userId, {
          text: `⚠️ *OutBox Rate Limit Reached*\nCampaign: *${campaign.subject}*\nHourly limit of ${campaign.hourlyLimit} emails reached.\nNext window opens at ${rateLimitResult.nextWindowAt.toLocaleTimeString()}.\nScheduled emails will resume automatically.`,
        });
        await redis.setex(slackNotifKey, 3600, '1'); // Don't notify again for 1 hour
      } catch (slackErr) {
        logger.error('Failed to send Slack rate-limit notification', {
          error: slackErr instanceof Error ? slackErr.message : 'Unknown',
        });
      }
    }

    return; // Job complete - new delayed job will handle it
  }

  // --- MARK AS PROCESSING (optimistic state transition) ---
  // Use a transaction to prevent race conditions with concurrent workers
  let updated;
  try {
    updated = await prisma.emailJob.updateMany({
      where: {
        id: emailJobId,
        status: { in: [EmailStatus.SCHEDULED, EmailStatus.PENDING] }, // Guard: only transition from non-terminal
      },
      data: {
        status: EmailStatus.PROCESSING,
        attempts: { increment: 1 },
      },
    });
  } catch (err) {
    logger.error('Failed to transition email job to PROCESSING', { emailJobId, err });
    throw err;
  }

  if (updated.count === 0) {
    // Another worker already picked this up (concurrency race)
    logger.warn('Email job state conflict — another worker processing it', { emailJobId });
    return;
  }

  // --- SEND EMAIL ---
  try {
    const result = await sendEmail({
      to: emailJob.recipientEmail,
      subject: campaign.subject,
      html: campaign.body,
    });

    // --- MARK AS SENT ---
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: EmailStatus.SENT,
        sentAt: new Date(),
        providerMessageId: result.messageId,
        errorMessage: null,
      },
    });

    logger.info('Email sent successfully', {
      emailJobId,
      to: emailJob.recipientEmail,
      messageId: result.messageId,
      previewUrl: result.previewUrl,
    });

    // Check if all jobs in campaign are done
    await checkAndUpdateCampaignStatus(campaign.id);
  } catch (sendError) {
    const errorMessage = sendError instanceof Error ? sendError.message : 'Unknown error';
    const errorStack = sendError instanceof Error ? sendError.stack : '';

    logger.error('Email send failed', {
      emailJobId,
      to: emailJob.recipientEmail,
      error: errorMessage,
      stack: errorStack,
      attempt: job.attemptsMade,
    });

    // Mark as FAILED in DB
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: EmailStatus.FAILED,
        failedAt: new Date(),
        errorMessage,
      },
    });

    // Re-throw so BullMQ can apply retry/backoff
    throw sendError;
  }
}

async function checkAndUpdateCampaignStatus(campaignId: string): Promise<void> {
  const stats = await prisma.emailJob.groupBy({
    by: ['status'],
    where: { campaignId },
    _count: { status: true },
  });

  const total = stats.reduce((acc, s) => acc + s._count.status, 0);
  const sentCount = stats.find((s) => s.status === EmailStatus.SENT)?._count.status || 0;
  const failedCount = stats.find((s) => s.status === EmailStatus.FAILED)?._count.status || 0;

  if (sentCount + failedCount === total) {
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: failedCount > 0 && sentCount === 0 ? 'FAILED' : 'COMPLETED' },
    });
    logger.info('Campaign completed', { campaignId, sent: sentCount, failed: failedCount });
  } else if (sentCount > 0) {
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: 'RUNNING' },
    });
  }
}

async function startWorker(): Promise<void> {
  logger.info('Starting email worker', { concurrency: WORKER_CONCURRENCY });

  await connectDatabase();
  await connectRedis();

  // Startup reconciliation: recreate missing BullMQ jobs from DB
  await reconcileScheduledJobs();

  const worker = new Worker<EmailJobPayload>(QUEUE_NAME, processEmailJob, {
    connection: getRedisClient(),
    concurrency: WORKER_CONCURRENCY,
  });

  worker.on('completed', (job) => {
    logger.info('Job completed', { jobId: job.id, emailJobId: job.data.emailJobId });
  });

  worker.on('failed', (job, err) => {
    logger.error('Job failed', {
      jobId: job?.id,
      emailJobId: job?.data.emailJobId,
      error: err.message,
      attempts: job?.attemptsMade,
    });
  });

  worker.on('error', (err) => {
    logger.error('Worker error', { error: err.message });
  });

  worker.on('stalled', (jobId) => {
    logger.warn('Job stalled', { jobId });
  });

  logger.info('Email worker started and listening for jobs');

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal} — gracefully shutting down worker`);
    await worker.close();
    await prisma.$disconnect();
    logger.info('Worker shut down gracefully');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startWorker().catch((err) => {
  logger.error('Failed to start worker', { error: err.message, stack: err.stack });
  process.exit(1);
});
