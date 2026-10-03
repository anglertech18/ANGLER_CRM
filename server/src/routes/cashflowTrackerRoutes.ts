import express from 'express';
import { authenticate } from '../middleware/auth';
import {
    getCashflowTrackers, getCashflowTrackerById,
    createCashflowTracker, updateCashflowTracker, deleteCashflowTracker,
} from '../controllers/cashflowTrackerController';

const router = express.Router();

router.get('/', authenticate, getCashflowTrackers);
router.get('/:id', authenticate, getCashflowTrackerById);
router.post('/', authenticate, createCashflowTracker);
router.put('/:id', authenticate, updateCashflowTracker);
router.delete('/:id', authenticate, deleteCashflowTracker);

export default router;
