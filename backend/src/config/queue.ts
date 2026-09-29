import { Queue } from 'bullmq';
import { getRedisClient } from './redis';
import { logger } from './logger';

export const QUEUE_NAME = 'email-queue';

export interface EmailJobPayload {
  emailJobId: string;
}

let emailQueue: Queue<EmailJobPayload> | null = null;

export function getEmailQueue(): Queue<EmailJobPayload> {
  if (!emailQueue) {
    emailQueue = new Queue<EmailJobPayload>(QUEUE_NAME, {
      connection: getRedisClient(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5s base, then 25s, then 125s
        },
        removeOnComplete: {
          age: 24 * 3600, // keep completed jobs 24h for inspection
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // keep failed jobs 7d
        },
      },
    });

    emailQueue.on('error', (err) => {
      logger.error('Email queue error', { error: err.message });
    });

    logger.info(`Email queue "${QUEUE_NAME}" initialized`);
  }
  return emailQueue;
}

export async function closeEmailQueue(): Promise<void> {
  if (emailQueue) {
    await emailQueue.close();
    emailQueue = null;
    logger.info('Email queue closed');
  }
}
