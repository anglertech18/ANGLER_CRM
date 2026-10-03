import express from 'express';
import { createMasterController } from '../controllers/masterController';
import { checkPrivilege } from '../middleware/rbac';
import { authenticate } from '../middleware/auth';
import {
    getBantCategories, getBantQuestions,
    getBantCategoriesAdmin, createBantCategory, updateBantCategory, deleteBantCategory,
    getBantQuestionsAdmin, createBantQuestion, updateBantQuestion, deleteBantQuestion,
} from '../controllers/bantController';

const router = express.Router();

const masters = [
    'company', 'sBU', 'jobTitle', 'leadSource', 'industry',
    'country', 'state', 'city', 'product', 'eitService', 'imService', 'persona',
    'collateral', 'salesStage', 'activity', 'avatar', 'sourceOfDB', 'callStatus', 'department', 'emailStatus',
    'vertical', 'paymentType', 'clientCompany'
];

masters.forEach((master) => {
    const controller = createMasterController(master);
    const routeName = master.toLowerCase();

    router.get(`/${routeName}`, authenticate, controller.getAll);
    router.get(`/${routeName}/:id`, authenticate, controller.getById);
    router.post(`/${routeName}`, authenticate, checkPrivilege('Masters', 'can_add'), controller.create);
    router.put(`/${routeName}/:id`, authenticate, checkPrivilege('Masters', 'can_edit'), controller.update);
    router.delete(`/${routeName}/:id`, authenticate, checkPrivilege('Masters', 'can_delete'), controller.delete);
});

// Alias for plural /companies route
router.get('/companies', authenticate, createMasterController('company').getAll);

// BANT master routes (lead-facing reads — no privilege check, auth only)
router.get('/bant-categories', authenticate, getBantCategories);
router.get('/bant-questions', authenticate, getBantQuestions);

// BANT admin CRUD routes
router.get('/bant-categories/admin', authenticate, checkPrivilege('Masters', 'can_view'), getBantCategoriesAdmin);
router.post('/bant-categories', authenticate, checkPrivilege('Masters', 'can_add'), createBantCategory);
router.put('/bant-categories/:id', authenticate, checkPrivilege('Masters', 'can_edit'), updateBantCategory);
router.delete('/bant-categories/:id', authenticate, checkPrivilege('Masters', 'can_delete'), deleteBantCategory);

router.get('/bant-questions/admin', authenticate, checkPrivilege('Masters', 'can_view'), getBantQuestionsAdmin);
router.post('/bant-questions', authenticate, checkPrivilege('Masters', 'can_add'), createBantQuestion);
router.put('/bant-questions/:id', authenticate, checkPrivilege('Masters', 'can_edit'), updateBantQuestion);
router.delete('/bant-questions/:id', authenticate, checkPrivilege('Masters', 'can_delete'), deleteBantQuestion);

export default router;
