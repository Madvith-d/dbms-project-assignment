import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  listUsers,
  getUser,
  updateUserRole,
  updateUserStatus,
  listUserDirectory,
} from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validateBody } from '../middleware/validate';
import { updateRoleSchema, updateStatusSchema } from '../schemas/user.schemas';

const router = Router();

// Directory is accessible to all authenticated users (for adding project members)
router.get('/directory', authenticate, listUserDirectory);

router.use(authenticate, requireRole(Role.admin));

router.get('/', listUsers);
router.get('/:id', getUser);
router.patch('/:id/role', validateBody(updateRoleSchema), updateUserRole);
router.patch('/:id/status', validateBody(updateStatusSchema), updateUserStatus);

export default router;
