import nodemailer, { Transporter } from 'nodemailer';
import { logger } from './logger';

let transporter: Transporter | null = null;

export async function getMailTransporter(): Promise<Transporter> {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const secure = process.env.SMTP_SECURE === 'true';

  if (!host || !user || !pass) {
    // Auto-create Ethereal test account for development
    logger.warn('SMTP credentials not configured — creating Ethereal test account');
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    logger.info(`Ethereal test account created: ${testAccount.user}`);
    logger.info(`Preview emails at: https://ethereal.email/`);
  } else {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  await transporter.verify();
  logger.info('SMTP transporter verified and ready');
  return transporter;
}
