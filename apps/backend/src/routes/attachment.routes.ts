import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { downloadAttachment, deleteAttachment } from '../controllers/attachment.controller';

const router = Router();

router.use(authenticate);
router.use(requireRole(Role.manager, Role.member));

router.get('/:id', downloadAttachment);
router.delete('/:id', deleteAttachment);

export default router;
