import nodemailer from 'nodemailer';
import { Resend } from 'resend';
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
  const from = options.from || process.env.SMTP_FROM || 'MailFlow <noreply@mailflow.dev>';

  // Use Resend API if RESEND_API_KEY is set (HTTP-based, more reliable on Railway)
  if (process.env.RESEND_API_KEY) {
    return sendWithResend(options, from);
  }

  // Fallback to SMTP
  return sendWithSMTP(options, from);
}

async function sendWithResend(options: SendEmailOptions, from: string): Promise<SendEmailResult> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  logger.info('Sending email via Resend API', { to: options.to, subject: options.subject });
  
  const { data, error } = await resend.emails.send({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  if (error) {
    logger.error('Resend API error', { error });
    throw new Error(error.message);
  }

  logger.info('Email sent successfully via Resend', {
    to: options.to,
    subject: options.subject,
    messageId: data?.id,
  });

  return {
    messageId: data?.id || 'unknown',
  };
}

async function sendWithSMTP(options: SendEmailOptions, from: string): Promise<SendEmailResult> {
  const transporter = await getMailTransporter();

  const info = await transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;

  logger.info('Email sent successfully via SMTP', {
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
