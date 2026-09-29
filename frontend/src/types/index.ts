export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  slackConnection?: {
    teamName: string;
    slackUserId: string;
    createdAt: string;
  } | null;
}

export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PAUSED';
export type EmailStatus = 'PENDING' | 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED';

export interface Campaign {
  id: string;
  userId: string;
  subject: string;
  body: string;
  startAt: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
  _count?: { emailJobs: number };
  emailJobs?: EmailJob[];
}

export interface EmailJob {
  id: string;
  campaignId: string;
  recipientEmail: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt?: string;
  failedAt?: string;
  attempts: number;
  errorMessage?: string;
  bullJobId?: string;
  providerMessageId?: string;
  createdAt: string;
  updatedAt: string;
  campaign?: Pick<Campaign, 'id' | 'subject' | 'status' | 'hourlyLimit'>;
}

export interface SlackStatus {
  connected: boolean;
  teamName: string | null;
  slackUserId: string | null;
  connectedAt: string | null;
}

export interface CreateCampaignInput {
  subject: string;
  body: string;
  recipients: string[];
  startAt: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CsvParseResult {
  emails: string[];
  invalid: string[];
  errors: string[];
}
