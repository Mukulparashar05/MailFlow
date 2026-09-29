import { Router } from 'express';
import { getScheduledEmails, getSentEmails, getFailedEmails } from '../controllers/emailController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/scheduled', getScheduledEmails);
router.get('/sent', getSentEmails);
router.get('/failed', getFailedEmails);

export default router;
