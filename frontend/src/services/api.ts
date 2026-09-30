import axios from 'axios';
import type {
  User,
  Campaign,
  EmailJob,
  CreateCampaignInput,
  CsvParseResult,
  ApiResponse,
} from '../types';

// Use environment variable for API base URL in production
// In dev, Vite proxy handles /api routes
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
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
  getMe: () => api.get<ApiResponse<User>>('/api/auth/me'),
  logout: () => api.post<ApiResponse<void>>('/api/auth/logout'),
  devLogin: (email?: string, name?: string) =>
    api.post<ApiResponse<User>>('/api/auth/dev-login', { email, name }),
  googleLoginUrl: `${API_BASE_URL}/auth/google`,
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

export default api;
