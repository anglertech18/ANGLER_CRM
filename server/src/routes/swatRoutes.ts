import express from 'express';
import { saveSwatPerformance, getSwatPerformance, getSwatStats, getMyMappings } from '../controllers/swatController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticate, getSwatPerformance);
router.post('/', authenticate, saveSwatPerformance);
router.get('/my-mappings', authenticate, getMyMappings);
router.get('/stats', authenticate, getSwatStats);

export default router;
