import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getProfiles, createProfile, deleteProfile, updateProfile } from '../controllers/profile.controller';

const router = Router();
router.use(authenticate);

router.get('/', getProfiles);
router.post('/', createProfile);
router.patch('/:id', updateProfile);
router.delete('/:id', deleteProfile);

export default router;