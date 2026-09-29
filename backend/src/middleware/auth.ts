import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  next();
}

export function requireGuest(req: Request, res: Response, next: NextFunction): void {
  if (req.user) {
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
    return;
  }
  next();
}
