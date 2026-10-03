"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const callTrackerController_1 = require("../controllers/callTrackerController");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const upload_1 = require("../utils/upload");
const router = express_1.default.Router();
const uploadSingle = (req, res, next) => {
    upload_1.upload.single('file')(req, res, (err) => {
        if (err instanceof multer_1.default.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File size is too large. Please upload a file smaller than or equal to 10 MB.' });
        }
        next(err);
    });
};
router.get('/', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Calls', 'can_view'), callTrackerController_1.getCalls);
router.get('/template', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Calls', 'can_add'), callTrackerController_1.downloadTemplate);
router.get('/staged', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Calls', 'can_view'), callTrackerController_1.getStagedUploads);
router.post('/transfer', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Calls', 'can_add'), callTrackerController_1.transferStagedRecords);
router.put('/staged/:id', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Calls', 'can_edit'), callTrackerController_1.updateStagedRecord);
router.delete('/staged', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Calls', 'can_delete'), callTrackerController_1.deleteStagedRecords);
router.delete('/staged/all', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Calls', 'can_delete'), callTrackerController_1.clearAllStagedRecords);
router.get('/:id', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Calls', 'can_view'), callTrackerController_1.getCallById);
router.post('/', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Calls', 'can_add'), callTrackerController_1.createCall);
router.post('/bulk-upload', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Calls', 'can_add'), uploadSingle, callTrackerController_1.bulkUpload);
router.put('/:id', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Calls', 'can_edit'), callTrackerController_1.updateCall);
router.delete('/:id', auth_1.authenticate, (0, rbac_1.checkPrivilege)('Calls', 'can_delete'), callTrackerController_1.deleteCall);
exports.default = router;
