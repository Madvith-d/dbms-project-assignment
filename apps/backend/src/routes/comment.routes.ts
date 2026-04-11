import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { deleteComment } from '../controllers/comment.controller';

const router = Router();

router.use(authenticate);
router.use(requireRole(Role.manager, Role.member));

router.delete('/:id', deleteComment);

export default router;
