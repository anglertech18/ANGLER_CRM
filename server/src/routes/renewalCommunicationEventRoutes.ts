import { Router } from 'express';
import {
  getCommunicationEvent,
  getEventsForTask,
  getEventsForChannelAction,
  getEventsForAccount,
  getEventsForServiceInstance,
  getEventsForReminder,
  getTimeline,
  createEvent,
  logActionStarted,
  logActionCompleted,
  logActionFailed,
  logCustomerResponseEvent,
} from '../controllers/renewalCommunicationEventController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET routes
router.get('/:id', getCommunicationEvent);
router.get('/task/:followUpTaskId', getEventsForTask);
router.get('/channel-action/:channelActionId', getEventsForChannelAction);
router.get('/account/:renewalAccountId', getEventsForAccount);
router.get('/service/:serviceInstanceId', getEventsForServiceInstance);
router.get('/reminder/:reminderId', getEventsForReminder);
router.get('/timeline/:renewalAccountId', getTimeline);

// POST routes
router.post('/', createEvent);
router.post('/log-started', logActionStarted);
router.post('/log-completed', logActionCompleted);
router.post('/log-failed', logActionFailed);
router.post('/log-customer-response', logCustomerResponseEvent);

export default router;
