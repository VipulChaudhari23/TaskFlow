import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { grantAccess, revokeAccess, myViewers, myOwners, getMemberTasks } from '../controllers/team.controller';

const router = Router();
router.use(authenticate);

router.post('/grant', grantAccess);           // grant access to manager
router.delete('/revoke/:viewerId', revokeAccess); // revoke access
router.get('/my-viewers', myViewers);         // who can see my tasks
router.get('/my-owners', myOwners);           // whose tasks can I see
router.get('/member/:memberId/tasks', getMemberTasks); // see a member's tasks

export default router;