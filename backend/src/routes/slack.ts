import { Router } from 'express';
import {
  connectSlack,
  slackCallback,
  disconnectSlack,
  getSlackStatus,
} from '../controllers/slackController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Public callback (Slack redirects here)
router.get('/callback', slackCallback);

// Protected routes
router.use(requireAuth);
router.get('/connect', connectSlack);
router.post('/disconnect', disconnectSlack);
router.get('/status', getSlackStatus);

export default router;
