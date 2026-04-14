import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validateBody } from '../middleware/validate';
import {
  createProjectSchema,
  updateProjectSchema,
  addProjectMemberSchema,
} from '../schemas/project.schemas';
import { createTaskSchema } from '../schemas/task.schemas';
import { createMilestoneSchema } from '../schemas/milestone.schemas';
import {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  listProjectMembers,
  addProjectMember,
  removeProjectMember,
} from '../controllers/project.controller';
import { listProjectTasks, createProjectTask } from '../controllers/task.controller';
import { listProjectMilestones, createMilestone } from '../controllers/milestone.controller';
import { listProjectTimeLogs } from '../controllers/timelog.controller';

const router = Router();

const managerOrMember = [Role.admin, Role.manager, Role.member];

router.use(authenticate);
router.use(requireRole(...managerOrMember));

router.get('/', listProjects);
router.post('/', requireRole(Role.admin, Role.manager), validateBody(createProjectSchema), createProject);

router.get('/:id/tasks', listProjectTasks);
router.post(
  '/:id/tasks',
  requireRole(Role.admin, Role.manager, Role.member),
  validateBody(createTaskSchema),
  createProjectTask
);

router.get('/:id/members', listProjectMembers);
router.post(
  '/:id/members',
  requireRole(Role.admin, Role.manager),
  validateBody(addProjectMemberSchema),
  addProjectMember
);
router.delete('/:id/members/:userId', requireRole(Role.admin, Role.manager), removeProjectMember);

router.get('/:id/milestones', listProjectMilestones);
router.post(
  '/:id/milestones',
  requireRole(Role.admin, Role.manager),
  validateBody(createMilestoneSchema),
  createMilestone
);
router.get('/:id/timelogs', listProjectTimeLogs);

router.get('/:id', getProject);
router.patch('/:id', requireRole(Role.admin, Role.manager), validateBody(updateProjectSchema), updateProject);
router.delete('/:id', requireRole(Role.admin, Role.manager), deleteProject);

export default router;
