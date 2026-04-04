import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { improveTask, getProductivityReport, getMemberReport } from '../controllers/ai.controller';

const router = Router();
router.use(authenticate);

router.post('/improve-task',         improveTask);
router.get('/productivity-report',   getProductivityReport);
router.get('/member-report',         getMemberReport);

export default router;