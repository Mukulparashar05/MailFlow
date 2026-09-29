import { User as PrismaUser } from '@prisma/client';

// Extend Passport's User interface to include Prisma User fields
declare global {
  namespace Express {
    // This merges our Prisma User into Passport's User interface
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends PrismaUser {}
  }
}

export type AuthenticatedUser = PrismaUser;

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Type-safe helper to get authenticated user ID from request
export function getUserId(req: { user?: Express.User }): string {
  if (!req.user?.id) throw new Error('User not authenticated');
  return req.user.id;
}
