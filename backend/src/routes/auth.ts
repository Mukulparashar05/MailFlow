import { Router } from 'express';
import passport from 'passport';
import { getMe, logout, devLogin } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { logger } from '../config/logger';

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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    passport.authenticate('google', (err: Error | null, user: Express.User | false | null) => {
      // Log the real cause server-side; the browser only gets a generic error flag
      if (err || !user) {
        logger.error('Google OAuth callback failed', {
          error: err ? err.message : 'No user returned from Google',
        });
        return res.redirect(`${frontendUrl}/login?error=auth_failed`);
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          logger.error('Session login failed after Google OAuth', { error: loginErr.message });
          return res.redirect(`${frontendUrl}/login?error=auth_failed`);
        }
        return res.redirect(`${frontendUrl}/dashboard`);
      });
    })(req, res, next);
  },
);

// Get current user
router.get('/me', requireAuth, getMe);

// Logout
router.post('/logout', requireAuth, logout);

export default router;
