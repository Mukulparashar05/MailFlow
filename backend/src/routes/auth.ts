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
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth_failed`,
    session: true,
  }),
  (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`);
  },
);

// Get current user
router.get('/me', requireAuth, getMe);

// Logout
router.post('/logout', requireAuth, logout);

export default router;
