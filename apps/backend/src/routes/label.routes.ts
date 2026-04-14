import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validateBody } from '../middleware/validate';
import { updateLabelSchema } from '../schemas/label.schemas';
import { updateLabelById, deleteLabelById } from '../controllers/label.controller';

const router = Router();

router.use(authenticate);
router.use(requireRole(Role.admin, Role.manager));

router.patch('/:id', validateBody(updateLabelSchema), updateLabelById);
router.delete('/:id', deleteLabelById);

export default router;
