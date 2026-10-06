import express from 'express';
import { authenticate } from '../middleware/auth';
import { checkPrivilege } from '../middleware/rbac';
import {
  getCategories, getAllCategories, createCategory, updateCategory, deleteCategory,
  getServiceMasters, getServiceMasterById, createServiceMaster, updateServiceMaster, deleteServiceMaster,
  getProviders, createProvider, updateProvider, deleteProvider,
  getProviderSubItems, getServicePlans,
  getContactsByCompany, createContact, updateContact, deleteContact,
} from '../controllers/renewalMasterController';

const router = express.Router();

// Service Categories
router.get('/categories', authenticate, getCategories);
router.get('/all-categories', authenticate, getAllCategories);
router.post('/categories', authenticate, checkPrivilege('RenewalMasters', 'can_add'), createCategory);
router.put('/categories/:id', authenticate, checkPrivilege('RenewalMasters', 'can_edit'), updateCategory);
router.delete('/categories/:id', authenticate, checkPrivilege('RenewalMasters', 'can_delete'), deleteCategory);

// Service Masters
router.get('/services', authenticate, getServiceMasters);
router.get('/services/:id', authenticate, getServiceMasterById);
router.post('/services', authenticate, checkPrivilege('RenewalMasters', 'can_add'), createServiceMaster);
router.put('/services/:id', authenticate, checkPrivilege('RenewalMasters', 'can_edit'), updateServiceMaster);
router.delete('/services/:id', authenticate, checkPrivilege('RenewalMasters', 'can_delete'), deleteServiceMaster);

// Providers & Sub-Categories
router.get('/providers', authenticate, getProviders);
router.get('/provider-sub-items', authenticate, getProviderSubItems);
router.get('/sub-categories', authenticate, getProviderSubItems);
router.get('/service-plans', authenticate, getServicePlans);
router.post('/providers', authenticate, checkPrivilege('RenewalMasters', 'can_add'), createProvider);
router.put('/providers/:id', authenticate, checkPrivilege('RenewalMasters', 'can_edit'), updateProvider);
router.delete('/providers/:id', authenticate, checkPrivilege('RenewalMasters', 'can_delete'), deleteProvider);

// Contacts
router.get('/contacts', authenticate, getContactsByCompany);
router.post('/contacts', authenticate, createContact);
router.put('/contacts/:id', authenticate, updateContact);
router.delete('/contacts/:id', authenticate, deleteContact);

export default router;
