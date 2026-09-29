import { Router } from 'express';
import { z } from 'zod';
import {
  createCampaign,
  getCampaigns,
  getCampaignById,
  parseCsv,
} from '../controllers/campaignController';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validation';

const router = Router();

const createCampaignSchema = z.object({
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  recipients: z.array(z.string().email()).min(1),
  startAt: z.string().datetime(),
  delayBetweenEmails: z.number().int().min(0).max(3600),
  hourlyLimit: z.number().int().min(1).max(10000),
});

router.use(requireAuth);

router.post('/', validateBody(createCampaignSchema), createCampaign);
router.get('/', getCampaigns);
router.get('/:id', getCampaignById);
router.post('/parse-csv', parseCsv);

export default router;
