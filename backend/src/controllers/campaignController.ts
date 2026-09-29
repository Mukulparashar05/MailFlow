import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { scheduleCampaign } from '../services/schedulerService';
import { logger } from '../config/logger';
import { parseCsvRecipients } from '../utils/csvParser';

export { parseCsvRecipients };

const createCampaignSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(500),
  body: z.string().min(1, 'Body is required'),
  recipients: z
    .array(z.string().email('Invalid email address'))
    .min(1, 'At least one recipient is required'),
  startAt: z.string().datetime(),
  delayBetweenEmails: z.number().int().min(0).max(3600),
  hourlyLimit: z.number().int().min(1).max(10000),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export async function createCampaign(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const body = req.body as CreateCampaignInput;

  // Deduplicate recipients
  const uniqueRecipients = [...new Set(body.recipients.map((r) => r.toLowerCase().trim()))];

  const startAt = new Date(body.startAt);

  try {
    // Use a transaction to create campaign + all email jobs atomically
    const result = await prisma.$transaction(async (tx) => {
      const campaign = await tx.emailCampaign.create({
        data: {
          userId,
          subject: body.subject,
          body: body.body,
          startAt,
          delayBetweenEmails: body.delayBetweenEmails,
          hourlyLimit: body.hourlyLimit,
          status: 'DRAFT',
        },
      });

      // Calculate scheduled times for each recipient
      const emailJobs = uniqueRecipients.map((email, index) => {
        const delayMs = index * body.delayBetweenEmails * 1000;
        const scheduledAt = new Date(startAt.getTime() + delayMs);
        return {
          campaignId: campaign.id,
          recipientEmail: email,
          scheduledAt,
          status: 'PENDING' as const,
        };
      });

      // createMany with skipDuplicates for idempotency
      await tx.emailJob.createMany({
        data: emailJobs,
        skipDuplicates: true,
      });

      return campaign;
    });

    logger.info('Campaign created', {
      campaignId: result.id,
      userId,
      recipients: uniqueRecipients.length,
      startAt,
    });

    // Schedule the campaign (enqueue BullMQ jobs)
    await scheduleCampaign(result.id);

    const campaignWithJobs = await prisma.emailCampaign.findUnique({
      where: { id: result.id },
      include: {
        _count: { select: { emailJobs: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: campaignWithJobs,
      message: `Campaign scheduled for ${uniqueRecipients.length} recipients`,
    });
  } catch (error) {
    logger.error('Failed to create campaign', {
      error: error instanceof Error ? error.message : 'Unknown',
      userId,
    });
    throw error;
  }
}

export async function getCampaigns(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const campaigns = await prisma.emailCampaign.findMany({
    where: { userId },
    include: {
      _count: { select: { emailJobs: true } },
      emailJobs: {
        select: { status: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: campaigns });
}

export async function getCampaignById(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = req.params['id'] as string;

  const campaign = await prisma.emailCampaign.findFirst({
    where: { id, userId },
    include: {
      emailJobs: {
        orderBy: { scheduledAt: 'asc' },
      },
    },
  });

  if (!campaign) {
    res.status(404).json({ success: false, error: 'Campaign not found' });
    return;
  }

  res.json({ success: true, data: campaign });
}



export async function parseCsv(req: Request, res: Response): Promise<void> {
  if (!req.body?.content) {
    res.status(400).json({ success: false, error: 'CSV content is required' });
    return;
  }

  const result = parseCsvRecipients(req.body.content);
  res.json({ success: true, data: result });
}
