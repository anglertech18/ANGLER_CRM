import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as sealController from '../controllers/sealController';
import * as poaController from '../controllers/poaController';
import * as partnerController from '../controllers/partnerController';

const router = Router();

router.get('/', authenticate, sealController.getSealData);
router.get('/bdes', authenticate, sealController.getBdes);

router.get('/weekly-reports', authenticate, sealController.getWeeklyReports);
router.get('/weekly-reports/latest', authenticate, sealController.getLatestWeeklyReport);
router.get('/weekly-reports/leads', authenticate, sealController.getWeeklyReportLeads);
router.post('/weekly-reports', authenticate, sealController.createWeeklyReport);
router.put('/weekly-reports/:id', authenticate, sealController.updateWeeklyReport);

// POA Routes
router.get('/poas/mapped-products', authenticate, poaController.getMappedProducts);
router.get('/poas/mapped-bdes', authenticate, poaController.getMappedBdes);
router.get('/poas', authenticate, poaController.getPOAs);
router.get('/poas/summary', authenticate, poaController.getPOASummary);
router.get('/poas/weekly-summary', authenticate, poaController.getWeeklyPOASummary);
router.post('/poas', authenticate, poaController.createPOA);
router.put('/poas/:id', authenticate, poaController.updatePOA);
router.delete('/poas/:id', authenticate, poaController.deletePOA);

// Partner Onboarding Routes
router.get('/partners', authenticate, partnerController.getPartners);
router.get('/partners/:id', authenticate, partnerController.getPartnerById);
router.post('/partners', authenticate, partnerController.createPartner);
router.put('/partners/:id', authenticate, partnerController.updatePartner);
router.delete('/partners/:id', authenticate, partnerController.deletePartner);

export default router;
