import { Request, Response } from 'express';
import {
  createChannelAction,
  getChannelActionById,
  getChannelActionsByTask,
  getChannelActionByIdempotencyKey,
  updateChannelAction,
  startChannelAction,
  completeChannelAction,
  failChannelAction,
  skipChannelAction,
  deleteChannelAction,
  getPendingChannelActions,
  getChannelActionsByReminderId,
  linkChannelActionToDigest,
  getChannelActionsByDigestOutboxId,
  previewEmailForChannelAction,
  queueEmailForChannelAction,
  sendTestEmailForChannelAction,
  approveEmailForChannelAction,
  previewWhatsAppForChannelAction,
  queueWhatsAppForChannelAction,
  approveWhatsAppForChannelAction,
  completeChannelActionFromOutbox,
  failChannelActionFromOutbox,
} from '../services/renewalFollowUpChannelActionService';

const ip = (req: Request) => req.ip ?? '';

/**
 * GET /api/renewal-channel-actions/:id
 * Get a channel action by ID with full relations
 */
export const getChannelAction = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const action = await getChannelActionById(id);
    if (!action) return res.status(404).json({ message: 'Channel action not found' });
    res.json(action);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching channel action', detail: err.message });
  }
};

/**
 * GET /api/renewal-channel-actions/task/:followUpTaskId
 * Get channel actions for a follow-up task
 */
export const getChannelActionsForTask = async (req: Request, res: Response) => {
  try {
    const followUpTaskId = parseInt(req.params.followUpTaskId);
    const { status, channel } = req.query;

    const actions = await getChannelActionsByTask(followUpTaskId, {
      status: status as string,
      channel: channel as string,
    });
    res.json(actions);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching channel actions', detail: err.message });
  }
};

/**
 * GET /api/renewal-channel-actions/idempotency/:idempotencyKey
 * Get a channel action by idempotency key (for deduplication)
 */
export const getChannelActionByIdempotency = async (req: Request, res: Response) => {
  try {
    const idempotencyKey = req.params.idempotencyKey;
    const action = await getChannelActionByIdempotencyKey(idempotencyKey);
    if (!action) return res.status(404).json({ message: 'Channel action not found' });
    res.json(action);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching channel action', detail: err.message });
  }
};

/**
 * GET /api/renewal-channel-actions/reminder/:reminderId
 * Get channel actions by reminder ID
 */
export const getChannelActionsForReminder = async (req: Request, res: Response) => {
  try {
    const reminderId = parseInt(req.params.reminderId);
    const actions = await getChannelActionsByReminderId(reminderId);
    res.json(actions);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching channel actions', detail: err.message });
  }
};

/**
 * GET /api/renewal-channel-actions/digest/:digestOutboxId
 * Get channel actions that are part of a digest
 */
export const getChannelActionsForDigest = async (req: Request, res: Response) => {
  try {
    const digestOutboxId = parseInt(req.params.digestOutboxId);
    const actions = await getChannelActionsByDigestOutboxId(digestOutboxId);
    res.json(actions);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching channel actions', detail: err.message });
  }
};

/**
 * GET /api/renewal-channel-actions/pending
 * Get pending channel actions that need execution (for cron jobs)
 */
export const getPendingActions = async (req: Request, res: Response) => {
  try {
    const { limit = 100 } = req.query;
    const actions = await getPendingChannelActions(parseInt(String(limit)));
    res.json(actions);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching pending actions', detail: err.message });
  }
};

/**
 * POST /api/renewal-channel-actions
 * Create a new channel action
 */
export const createAction = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const action = await createChannelAction(req.body, user.id, ip(req));
    res.status(201).json(action);
  } catch (err: any) {
    res.status(400).json({ message: 'Error creating channel action', detail: err.message });
  }
};

/**
 * PUT /api/renewal-channel-actions/:id
 * Update a channel action
 */
export const updateAction = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const action = await updateChannelAction(id, req.body, user.id, ip(req));
    res.json(action);
  } catch (err: any) {
    res.status(400).json({ message: 'Error updating channel action', detail: err.message });
  }
};

/**
 * POST /api/renewal-channel-actions/:id/start
 * Start execution of a channel action
 */
export const startAction = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const action = await startChannelAction(id, user.id, ip(req));
    res.json(action);
  } catch (err: any) {
    res.status(400).json({ message: 'Error starting channel action', detail: err.message });
  }
};

/**
 * POST /api/renewal-channel-actions/:id/complete
 * Complete a channel action
 */
export const completeAction = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const { provider_message_id, outcome_code, customer_response, notes } = req.body;
    const action = await completeChannelAction(
      id,
      { provider_message_id, outcome_code, customer_response, notes },
      user.id,
      ip(req)
    );
    res.json(action);
  } catch (err: any) {
    res.status(400).json({ message: 'Error completing channel action', detail: err.message });
  }
};

/**
 * POST /api/renewal-channel-actions/:id/fail
 * Fail a channel action
 */
export const failAction = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const { outcome_code, notes } = req.body;
    const action = await failChannelAction(id, { outcome_code, notes }, user.id, ip(req));
    res.json(action);
  } catch (err: any) {
    res.status(400).json({ message: 'Error failing channel action', detail: err.message });
  }
};

/**
 * POST /api/renewal-channel-actions/:id/skip
 * Skip a channel action (for optional actions)
 */
export const skipAction = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ message: 'reason is required' });

    const action = await skipChannelAction(id, reason, user.id, ip(req));
    res.json(action);
  } catch (err: any) {
    res.status(400).json({ message: 'Error skipping channel action', detail: err.message });
  }
};

/**
 * POST /api/renewal-channel-actions/:id/link-digest
 * Link a channel action to a digest outbox message
 */
export const linkActionToDigest = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const { digest_outbox_id } = req.body;
    if (!digest_outbox_id) return res.status(400).json({ message: 'digest_outbox_id is required' });

    const action = await linkChannelActionToDigest(id, digest_outbox_id, user.id, ip(req));
    res.json(action);
  } catch (err: any) {
    res.status(400).json({ message: 'Error linking to digest', detail: err.message });
  }
};

/**
 * DELETE /api/renewal-channel-actions/:id
 * Soft delete a channel action
 */
export const deleteAction = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const action = await deleteChannelAction(id, user.id, ip(req));
    res.json(action);
  } catch (err: any) {
    res.status(400).json({ message: 'Error deleting channel action', detail: err.message });
  }
};

/**
 * GET /api/renewal-channel-actions/:id/preview-email
 * Preview email for a channel action
 */
export const previewEmailAction = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const preview = await previewEmailForChannelAction(id);
    res.json(preview);
  } catch (err: any) {
    res.status(400).json({ message: 'Error previewing email', detail: err.message });
  }
};

/**
 * POST /api/renewal-channel-actions/:id/queue-email
 * Queue email for a channel action (manual send)
 */
export const queueEmailAction = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    // Recipient is resolved from the action/contact stored for this renewal.
    // Do not accept an arbitrary request-body address because order forms and
    // renewal details must not be redirected outside the client account.
    const action = await queueEmailForChannelAction(id, user.id, ip(req));
    res.json(action);
  } catch (err: any) {
    res.status(400).json({ message: 'Error queuing email', detail: err.message });
  }
};

/**
 * POST /api/renewal-channel-actions/:id/send-test-email
 * Send the rendered email preview only to the configured developer test address.
 */
export const sendTestEmailAction = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const result = await sendTestEmailForChannelAction(id, user.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ message: 'Error sending test email', detail: err.message });
  }
};

/**
 * POST /api/renewal-channel-actions/:id/approve-email
 * Approve email for a channel action (approval-required workflow)
 */
export const approveEmailAction = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const action = await approveEmailForChannelAction(id, user.id, ip(req));
    res.json(action);
  } catch (err: any) {
    res.status(400).json({ message: 'Error approving email', detail: err.message });
  }
};

/**
 * GET /api/renewal-channel-actions/:id/preview-whatsapp
 * Preview WhatsApp message for a channel action
 */
export const previewWhatsAppAction = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const preview = await previewWhatsAppForChannelAction(id);
    res.json(preview);
  } catch (err: any) {
    res.status(400).json({ message: 'Error previewing WhatsApp message', detail: err.message });
  }
};

/**
 * POST /api/renewal-channel-actions/:id/queue-whatsapp
 * Queue WhatsApp message for a channel action (manual send)
 */
export const queueWhatsAppAction = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const action = await queueWhatsAppForChannelAction(id, user.id, ip(req));
    res.json(action);
  } catch (err: any) {
    res.status(400).json({ message: 'Error queuing WhatsApp message', detail: err.message });
  }
};

/**
 * POST /api/renewal-channel-actions/:id/approve-whatsapp
 * Approve WhatsApp message for a channel action (approval-required workflow)
 */
export const approveWhatsAppAction = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const action = await approveWhatsAppForChannelAction(id, user.id, ip(req));
    res.json(action);
  } catch (err: any) {
    res.status(400).json({ message: 'Error approving WhatsApp message', detail: err.message });
  }
};

/**
 * POST /api/renewal-channel-actions/:id/complete-from-outbox
 * Complete a channel action from outbox processing (transactional)
 */
export const completeFromOutbox = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const { provider_message_id } = req.body;
    const action = await completeChannelActionFromOutbox(id, provider_message_id, user.id);
    res.json(action);
  } catch (err: any) {
    res.status(400).json({ message: 'Error completing channel action', detail: err.message });
  }
};

/**
 * POST /api/renewal-channel-actions/:id/fail-from-outbox
 * Fail a channel action from outbox processing (transactional)
 */
export const failFromOutbox = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const { error_message } = req.body;
    const action = await failChannelActionFromOutbox(id, error_message, user.id);
    res.json(action);
  } catch (err: any) {
    res.status(400).json({ message: 'Error failing channel action', detail: err.message });
  }
};
