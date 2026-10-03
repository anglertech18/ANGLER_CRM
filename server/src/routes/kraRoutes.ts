import { Router } from 'express';
import * as kraController from '../controllers/kraController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, kraController.getKraMonthlyData);

export default router;
