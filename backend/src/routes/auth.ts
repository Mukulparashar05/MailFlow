import { Router } from 'express';
import passport from 'passport';
import { getMe, logout, devLogin } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Dev / Demo login (for instant local testing without OAuth setup)
// SECURITY: Only available in development environment
if (process.env.NODE_ENV === 'development') {
  router.post('/dev-login', devLogin);
}

// Initiate Google OAuth
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  }),
);

// Google OAuth callback
router.get(
  '/google/callback',
  (req, res, next) => {
    passport.authenticate('google', (err: Error | null, user: Express.User | false | null, info: unknown) => {
      if (err) {
        console.error('OAuth callback error:', err);
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth_failed&reason=${encodeURIComponent(err.message)}`);
      }
      if (!user) {
        console.error('OAuth callback: no user returned', info);
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth_failed&reason=no_user`);
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error('OAuth login error:', loginErr);
          return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth_failed&reason=${encodeURIComponent(loginErr.message)}`);
        }
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`);
      });
    })(req, res, next);
  },
);

// Get current user
router.get('/me', requireAuth, getMe);

// Logout
router.post('/logout', requireAuth, logout);

export default router;
