import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import { requireBranch } from '../../middleware/requireBranch';
import * as controller from './sop.controller';

const MAX_MB = parseInt(process.env.FILE_UPLOAD_MAX_MB || '50', 10);

const storage = multer.diskStorage({
  destination: path.join(process.cwd(), 'uploads', 'sop'),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
});

const router = Router();
router.use(authenticate, requireBranch);

const readRoles = requireRole('staff', 'cashier', 'manager', 'owner');
const writeRoles = requireRole('manager', 'owner');

// Documents
router.get('/documents', readRoles, controller.listDocuments);
router.post('/documents', writeRoles, upload.single('file'), controller.uploadDocument);
router.post('/documents/:id/complete', readRoles, controller.completeDocument);

// Videos
router.get('/videos', readRoles, controller.listVideos);
router.post('/videos', writeRoles, controller.createVideo);
router.post('/videos/:id/complete', readRoles, controller.completeVideo);

// Recipes
router.get('/recipes', readRoles, controller.listRecipes);
router.post('/recipes', writeRoles, controller.createRecipe);
router.get('/recipes/:id/scale', readRoles, controller.scaleRecipe);

export default router;
