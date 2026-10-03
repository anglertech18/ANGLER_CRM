import { Router } from 'express';
import {
  getFollowUpTask,
  getFollowUpTasksForService,
  getMyFollowUpTasks,
  getPendingTasks,
  getTasksByGroupKey,
  createTask,
  updateTask,
  cancelTask,
  completeTask,
  deleteTask,
} from '../controllers/renewalFollowUpTaskController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET routes
router.get('/:id', getFollowUpTask);
router.get('/service/:serviceInstanceId/cycle/:cycleId', getFollowUpTasksForService);
router.get('/my-tasks', getMyFollowUpTasks);
router.get('/pending', getPendingTasks);
router.get('/group/:renewalAccountId/:serviceInstanceId/:cycleId/:groupKey', getTasksByGroupKey);

// POST routes
router.post('/', createTask);
router.post('/:id/cancel', cancelTask);
router.post('/:id/complete', completeTask);

// PUT routes
router.put('/:id', updateTask);

// DELETE routes
router.delete('/:id', deleteTask);

export default router;
