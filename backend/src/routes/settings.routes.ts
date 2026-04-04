import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getSettings, toggleReminder, deleteAccount, exportTasks } from '../controllers/settings.controller';

const router = Router();
router.use(authenticate);

router.get('/',               getSettings);
router.patch('/reminder',     toggleReminder);
router.delete('/account',     deleteAccount);
router.get('/export',         exportTasks);

export default router;