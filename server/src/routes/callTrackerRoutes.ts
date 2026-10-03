import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import {
    getCalls,
    getCallById,
    createCall,
    updateCall,
    deleteCall,
    downloadTemplate,
    bulkUpload,
    getStagedUploads,
    updateStagedRecord,
    transferStagedRecords,
    deleteStagedRecords,
    clearAllStagedRecords
} from '../controllers/callTrackerController';
import { authenticate } from '../middleware/auth';
import { checkPrivilege } from '../middleware/rbac';
import { upload } from '../utils/upload';

const router = express.Router();

const uploadSingle = (req: Request, res: Response, next: NextFunction) => {
    upload.single('file')(req, res, (err: any) => {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File size is too large. Please upload a file smaller than or equal to 10 MB.' });
        }
        next(err);
    });
};

router.get('/', authenticate, checkPrivilege('Calls', 'can_view'), getCalls);
router.get('/template', authenticate, checkPrivilege('Calls', 'can_add'), downloadTemplate);
router.get('/staged', authenticate, checkPrivilege('Calls', 'can_view'), getStagedUploads);
router.post('/transfer', authenticate, checkPrivilege('Calls', 'can_add'), transferStagedRecords);
router.put('/staged/:id', authenticate, checkPrivilege('Calls', 'can_edit'), updateStagedRecord);
router.delete('/staged', authenticate, checkPrivilege('Calls', 'can_delete'), deleteStagedRecords);
router.delete('/staged/all', authenticate, checkPrivilege('Calls', 'can_delete'), clearAllStagedRecords);
router.get('/:id', authenticate, checkPrivilege('Calls', 'can_view'), getCallById);
router.post('/', authenticate, checkPrivilege('Calls', 'can_add'), createCall);
router.post('/bulk-upload', authenticate, checkPrivilege('Calls', 'can_add'), uploadSingle, bulkUpload);
router.put('/:id', authenticate, checkPrivilege('Calls', 'can_edit'), updateCall);
router.delete('/:id', authenticate, checkPrivilege('Calls', 'can_delete'), deleteCall);

export default router;
