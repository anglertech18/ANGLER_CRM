import { Request, Response } from 'express';
import {
  createCommunicationEvent,
  getCommunicationEventById,
  getCommunicationEventsByTask,
  getCommunicationEventsByChannelAction,
  getCommunicationEventsByAccount,
  getCommunicationEventsByServiceInstance,
  getCommunicationEventsByReminder,
  getCommunicationTimeline,
  logChannelActionStarted,
  logChannelActionCompleted,
  logChannelActionFailed,
  logCustomerResponse,
} from '../services/renewalCommunicationEventService';

/**
 * GET /api/renewal-communication-events/:id
 * Get a communication event by ID
 */
export const getCommunicationEvent = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const event = await getCommunicationEventById(id);
    if (!event) return res.status(404).json({ message: 'Communication event not found' });
    res.json(event);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching communication event', detail: err.message });
  }
};

/**
 * GET /api/renewal-communication-events/task/:followUpTaskId
 * Get communication events for a follow-up task
 */
export const getEventsForTask = async (req: Request, res: Response) => {
  try {
    const followUpTaskId = parseInt(req.params.followUpTaskId);
    const { channel, event_type, direction, limit } = req.query;

    const events = await getCommunicationEventsByTask(followUpTaskId, {
      channel: channel as string,
      event_type: event_type as string,
      direction: direction as string,
      limit: limit ? parseInt(String(limit)) : undefined,
    });
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching communication events', detail: err.message });
  }
};

/**
 * GET /api/renewal-communication-events/channel-action/:channelActionId
 * Get communication events for a channel action
 */
export const getEventsForChannelAction = async (req: Request, res: Response) => {
  try {
    const channelActionId = parseInt(req.params.channelActionId);
    const { limit = 50 } = req.query;
    const events = await getCommunicationEventsByChannelAction(channelActionId, parseInt(String(limit)));
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching communication events', detail: err.message });
  }
};

/**
 * GET /api/renewal-communication-events/account/:renewalAccountId
 * Get communication events for a renewal account
 */
export const getEventsForAccount = async (req: Request, res: Response) => {
  try {
    const renewalAccountId = parseInt(req.params.renewalAccountId);
    const { channel, event_type, direction, from, to, limit } = req.query;

    const events = await getCommunicationEventsByAccount(renewalAccountId, {
      channel: channel as string,
      event_type: event_type as string,
      direction: direction as string,
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
      limit: limit ? parseInt(String(limit)) : undefined,
    });
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching communication events', detail: err.message });
  }
};

/**
 * GET /api/renewal-communication-events/service/:serviceInstanceId
 * Get communication events for a service instance
 */
export const getEventsForServiceInstance = async (req: Request, res: Response) => {
  try {
    const serviceInstanceId = parseInt(req.params.serviceInstanceId);
    const { channel, event_type, from, to, limit } = req.query;

    const events = await getCommunicationEventsByServiceInstance(serviceInstanceId, {
      channel: channel as string,
      event_type: event_type as string,
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
      limit: limit ? parseInt(String(limit)) : undefined,
    });
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching communication events', detail: err.message });
  }
};

/**
 * GET /api/renewal-communication-events/reminder/:reminderId
 * Get communication events for a reminder
 */
export const getEventsForReminder = async (req: Request, res: Response) => {
  try {
    const reminderId = parseInt(req.params.reminderId);
    const { limit = 50 } = req.query;
    const events = await getCommunicationEventsByReminder(reminderId, parseInt(String(limit)));
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching communication events', detail: err.message });
  }
};

/**
 * GET /api/renewal-communication-events/timeline/:renewalAccountId
 * Get communication timeline for a renewal account (grouped by service/cycle)
 */
export const getTimeline = async (req: Request, res: Response) => {
  try {
    const renewalAccountId = parseInt(req.params.renewalAccountId);
    const { from, to, channel, limit } = req.query;

    const events = await getCommunicationTimeline(renewalAccountId, {
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
      channel: channel as string,
      limit: limit ? parseInt(String(limit)) : undefined,
    });
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching communication timeline', detail: err.message });
  }
};

/**
 * POST /api/renewal-communication-events
 * Create a new communication event
 */
export const createEvent = async (req: Request, res: Response) => {
  try {
    const event = await createCommunicationEvent(req.body);
    res.status(201).json(event);
  } catch (err: any) {
    res.status(400).json({ message: 'Error creating communication event', detail: err.message });
  }
};

/**
 * POST /api/renewal-communication-events/log-started
 * Log a channel action started event
 */
export const logActionStarted = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { channel_action_id, actor_type = 'SYSTEM' } = req.body;
    const event = await logChannelActionStarted(
      channel_action_id,
      user.id,
      actor_type
    );
    res.status(201).json(event);
  } catch (err: any) {
    res.status(400).json({ message: 'Error logging action started', detail: err.message });
  }
};

/**
 * POST /api/renewal-communication-events/log-completed
 * Log a channel action completed event
 */
export const logActionCompleted = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { channel_action_id, provider_message_id, outcome_code, customer_response, notes, actor_type = 'SYSTEM' } = req.body;
    const event = await logChannelActionCompleted(
      channel_action_id,
      { provider_message_id, outcome_code, customer_response, notes },
      user.id,
      actor_type
    );
    res.status(201).json(event);
  } catch (err: any) {
    res.status(400).json({ message: 'Error logging action completed', detail: err.message });
  }
};

/**
 * POST /api/renewal-communication-events/log-failed
 * Log a channel action failed event
 */
export const logActionFailed = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { channel_action_id, error_code, error_message, actor_type = 'SYSTEM' } = req.body;
    const event = await logChannelActionFailed(
      channel_action_id,
      { error_code, error_message },
      user.id,
      actor_type
    );
    res.status(201).json(event);
  } catch (err: any) {
    res.status(400).json({ message: 'Error logging action failed', detail: err.message });
  }
};

/**
 * POST /api/renewal-communication-events/log-customer-response
 * Log a customer response event (incoming communication)
 */
export const logCustomerResponseEvent = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { channel_action_id, customer_response, provider_message_id, actor_type = 'CUSTOMER' } = req.body;
    const event = await logCustomerResponse(
      channel_action_id,
      { customer_response, provider_message_id },
      user.id,
      actor_type
    );
    res.status(201).json(event);
  } catch (err: any) {
    res.status(400).json({ message: 'Error logging customer response', detail: err.message });
  }
};
