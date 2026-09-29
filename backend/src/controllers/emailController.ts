import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { EmailStatus } from '@prisma/client';

export async function getScheduledEmails(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const emails = await prisma.emailJob.findMany({
    where: {
      campaign: { userId },
      status: { in: [EmailStatus.SCHEDULED, EmailStatus.PENDING, EmailStatus.PROCESSING] },
    },
    include: {
      campaign: {
        select: { id: true, subject: true, status: true, hourlyLimit: true },
      },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  res.json({ success: true, data: emails });
}

export async function getSentEmails(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const emails = await prisma.emailJob.findMany({
    where: {
      campaign: { userId },
      status: EmailStatus.SENT,
    },
    include: {
      campaign: {
        select: { id: true, subject: true, status: true },
      },
    },
    orderBy: { sentAt: 'desc' },
  });

  res.json({ success: true, data: emails });
}

export async function getFailedEmails(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const emails = await prisma.emailJob.findMany({
    where: {
      campaign: { userId },
      status: EmailStatus.FAILED,
    },
    include: {
      campaign: {
        select: { id: true, subject: true },
      },
    },
    orderBy: { failedAt: 'desc' },
  });

  res.json({ success: true, data: emails });
}
