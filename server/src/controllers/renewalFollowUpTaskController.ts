import { Request, Response } from 'express';
import {
  createFollowUpTask,
  getFollowUpTaskById,
  getFollowUpTasksByServiceInstance,
  getFollowUpTasksByUser,
  updateFollowUpTask,
  cancelFollowUpTask,
  completeFollowUpTask,
  deleteFollowUpTask,
  getPendingFollowUpTasks,
  getFollowUpTasksByGroupKey,
} from '../services/renewalFollowUpTaskService';

const ip = (req: Request) => req.ip ?? '';

/**
 * GET /api/renewal-follow-up-tasks/:id
 * Get a follow-up task by ID with full relations
 */
export const getFollowUpTask = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const task = await getFollowUpTaskById(id);
    if (!task) return res.status(404).json({ message: 'Follow-up task not found' });
    res.json(task);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching follow-up task', detail: err.message });
  }
};

/**
 * GET /api/renewal-follow-up-tasks/service/:serviceInstanceId/cycle/:cycleId
 * Get follow-up tasks for a service instance within a cycle
 */
export const getFollowUpTasksForService = async (req: Request, res: Response) => {
  try {
    const serviceInstanceId = parseInt(req.params.serviceInstanceId);
    const cycleId = parseInt(req.params.cycleId);
    const { status, assigned_user_id, policy_version } = req.query;

    const tasks = await getFollowUpTasksByServiceInstance(serviceInstanceId, cycleId, {
      status: status as string,
      assigned_user_id: assigned_user_id ? parseInt(String(assigned_user_id)) : undefined,
      policy_version: policy_version ? parseInt(String(policy_version)) : undefined,
    });
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching follow-up tasks', detail: err.message });
  }
};

/**
 * GET /api/renewal-follow-up-tasks/my-tasks
 * Get follow-up tasks assigned to the current user
 */
export const getMyFollowUpTasks = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { status, scheduled_from, scheduled_to } = req.query;

    const tasks = await getFollowUpTasksByUser(user.id, {
      status: status as string,
      scheduled_from: scheduled_from ? new Date(scheduled_from as string) : undefined,
      scheduled_to: scheduled_to ? new Date(scheduled_to as string) : undefined,
    });
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching my tasks', detail: err.message });
  }
};

/**
 * GET /api/renewal-follow-up-tasks/pending
 * Get pending follow-up tasks that need execution (for cron jobs)
 */
export const getPendingTasks = async (req: Request, res: Response) => {
  try {
    const { limit = 100 } = req.query;
    const tasks = await getPendingFollowUpTasks(parseInt(String(limit)));
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching pending tasks', detail: err.message });
  }
};

/**
 * GET /api/renewal-follow-up-tasks/group/:renewalAccountId/:serviceInstanceId/:cycleId/:groupKey
 * Get follow-up tasks by group key (for policy version tracking)
 */
export const getTasksByGroupKey = async (req: Request, res: Response) => {
  try {
    const renewalAccountId = parseInt(req.params.renewalAccountId);
    const serviceInstanceId = parseInt(req.params.serviceInstanceId);
    const cycleId = parseInt(req.params.cycleId);
    const followUpGroupKey = req.params.groupKey;

    const tasks = await getFollowUpTasksByGroupKey(
      renewalAccountId,
      serviceInstanceId,
      cycleId,
      followUpGroupKey
    );
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching tasks by group key', detail: err.message });
  }
};

/**
 * POST /api/renewal-follow-up-tasks
 * Create a new follow-up task
 */
export const createTask = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const task = await createFollowUpTask(req.body, user.id, ip(req));
    res.status(201).json(task);
  } catch (err: any) {
    res.status(400).json({ message: 'Error creating follow-up task', detail: err.message });
  }
};

/**
 * PUT /api/renewal-follow-up-tasks/:id
 * Update a follow-up task
 */
export const updateTask = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const task = await updateFollowUpTask(id, req.body, user.id, ip(req));
    res.json(task);
  } catch (err: any) {
    res.status(400).json({ message: 'Error updating follow-up task', detail: err.message });
  }
};

/**
 * POST /api/renewal-follow-up-tasks/:id/cancel
 * Cancel a follow-up task
 */
export const cancelTask = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const { cancel_reason } = req.body;
    if (!cancel_reason) return res.status(400).json({ message: 'cancel_reason is required' });

    const task = await cancelFollowUpTask(id, cancel_reason, user.id, ip(req));
    res.json(task);
  } catch (err: any) {
    res.status(400).json({ message: 'Error cancelling follow-up task', detail: err.message });
  }
};

/**
 * POST /api/renewal-follow-up-tasks/:id/complete
 * Complete a follow-up task
 */
export const completeTask = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const task = await completeFollowUpTask(id, user.id, ip(req));
    res.json(task);
  } catch (err: any) {
    res.status(400).json({ message: 'Error completing follow-up task', detail: err.message });
  }
};

/**
 * DELETE /api/renewal-follow-up-tasks/:id
 * Soft delete a follow-up task
 */
export const deleteTask = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const task = await deleteFollowUpTask(id, user.id, ip(req));
    res.json(task);
  } catch (err: any) {
    res.status(400).json({ message: 'Error deleting follow-up task', detail: err.message });
  }
};
