import { Request, Response } from 'express';
import { prisma } from '../config/database';

export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      createdAt: true,
    },
  });

  res.json({ success: true, data: user });
}

export async function logout(req: Request, res: Response): Promise<void> {
  req.logout((err) => {
    if (err) {
      res.status(500).json({ success: false, error: 'Logout failed' });
      return;
    }
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });
}

/**
 * Development-only login endpoint for quick testing without OAuth.
 * 
 * SECURITY WARNING:
 * This endpoint bypasses all authentication and allows impersonation of any user.
 * It is ONLY available when NODE_ENV=development.
 * The route is conditionally registered in routes/auth.ts.
 * 
 * @security This should NEVER be accessible in production
 */
export async function devLogin(req: Request, res: Response): Promise<void> {
  const email = (req.body?.email as string) || 'demo.user@outbox.dev';
  const name = (req.body?.name as string) || 'Demo User';
  const googleId = 'dev_user_mock_' + email.replace(/[^a-zA-Z0-9]/g, '_');

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      googleId,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=OutBoxDemo',
    },
    update: {
      name,
    },
  });

  req.login(user, (err) => {
    if (err) {
      res.status(500).json({ success: false, error: 'Login session failed' });
      return;
    }
    res.json({ success: true, data: user });
  });
}

