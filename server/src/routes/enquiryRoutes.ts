import { Router } from 'express';
import * as enquiryController from '../controllers/enquiryController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, enquiryController.getEnquiries as any);
router.get('/:id', authenticate, enquiryController.getEnquiryById as any);
router.post('/', authenticate, enquiryController.createEnquiry as any);
router.put('/:id', authenticate, enquiryController.updateEnquiry as any);
router.delete('/:id', authenticate, enquiryController.deleteEnquiry as any);

export default router;
