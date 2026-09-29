import nodemailer from 'nodemailer';
import { getMailTransporter } from '../config/mailer';
import { logger } from '../config/logger';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const transporter = await getMailTransporter();
  const from = options.from || process.env.SMTP_FROM || 'OutBox <noreply@outbox.dev>';

  const info = await transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;

  logger.info('Email sent successfully', {
    to: options.to,
    subject: options.subject,
    messageId: info.messageId,
    previewUrl,
  });

  return {
    messageId: info.messageId,
    previewUrl: previewUrl ? String(previewUrl) : undefined,
  };
}
