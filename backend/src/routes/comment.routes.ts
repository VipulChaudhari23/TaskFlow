// routes/comment.routes.ts
import { Router } from 'express';
import { addComment, getComments, updateComment } from '../controllers/comment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/', addComment);
router.get('/:taskId', getComments);
router.patch('/:id', updateComment);

export default router;