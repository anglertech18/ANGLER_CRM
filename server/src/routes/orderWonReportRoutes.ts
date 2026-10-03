import express from 'express';
import { authenticate } from '../middleware/auth';
import { getOrderWonReport } from '../controllers/orderWonReportController';

const router = express.Router();

router.get('/', authenticate, getOrderWonReport);

export default router;
