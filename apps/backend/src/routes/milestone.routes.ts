import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validateBody } from '../middleware/validate';
import { updateMilestoneSchema } from '../schemas/milestone.schemas';
import { updateMilestone, deleteMilestone } from '../controllers/milestone.controller';

const router = Router();

router.use(authenticate);
router.use(requireRole(Role.admin, Role.manager, Role.member));

router.patch('/:id', requireRole(Role.admin, Role.manager), validateBody(updateMilestoneSchema), updateMilestone);
router.delete('/:id', requireRole(Role.admin, Role.manager), deleteMilestone);

export default router;
