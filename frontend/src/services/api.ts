import axios from 'axios';
import type {
  User,
  Campaign,
  EmailJob,
  CreateCampaignInput,
  SlackStatus,
  CsvParseResult,
  ApiResponse,
} from '../types';

const api = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login if unauthorized
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// Auth
export const authApi = {
  getMe: () => api.get<ApiResponse<User & { slackConnection: SlackStatus | null }>>('/api/auth/me'),
  logout: () => api.post<ApiResponse<void>>('/api/auth/logout'),
  devLogin: (email?: string, name?: string) =>
    api.post<ApiResponse<User>>('/api/auth/dev-login', { email, name }),
  googleLoginUrl: '/auth/google',
};

// Campaigns
export const campaignApi = {
  create: (data: CreateCampaignInput) =>
    api.post<ApiResponse<Campaign>>('/api/campaigns', data),
  list: () => api.get<ApiResponse<Campaign[]>>('/api/campaigns'),
  getById: (id: string) => api.get<ApiResponse<Campaign>>(`/api/campaigns/${id}`),
  parseCsv: (content: string) =>
    api.post<ApiResponse<CsvParseResult>>('/api/campaigns/parse-csv', { content }),
};

// Emails
export const emailApi = {
  scheduled: () => api.get<ApiResponse<EmailJob[]>>('/api/emails/scheduled'),
  sent: () => api.get<ApiResponse<EmailJob[]>>('/api/emails/sent'),
  failed: () => api.get<ApiResponse<EmailJob[]>>('/api/emails/failed'),
};

// Slack
export const slackApi = {
  status: () => api.get<ApiResponse<SlackStatus>>('/api/slack/status'),
  connectUrl: '/api/slack/connect',
  disconnect: () => api.post<ApiResponse<void>>('/api/slack/disconnect'),
};

export default api;
