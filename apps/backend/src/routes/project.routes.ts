import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validateBody } from '../middleware/validate';
import {
  createProjectSchema,
  updateProjectSchema,
  addProjectMemberSchema,
  updateProjectMemberRoleSchema,
} from '../schemas/project.schemas';
import { createTaskSchema } from '../schemas/task.schemas';
import { createMilestoneSchema } from '../schemas/milestone.schemas';
import { createLabelSchema } from '../schemas/label.schemas';
import {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  listProjectMembers,
  addProjectMember,
  removeProjectMember,
  listProjectRoles,
  updateProjectMemberRole,
} from '../controllers/project.controller';
import { listProjectTasks, createProjectTask } from '../controllers/task.controller';
import { listProjectMilestones, createMilestone } from '../controllers/milestone.controller';
import { listProjectTimeLogs } from '../controllers/timelog.controller';
import { listProjectLabels, createProjectLabel } from '../controllers/label.controller';
import { listProjectActivity } from '../controllers/activity.controller';

const router = Router();

const managerOrMember = [Role.admin, Role.manager, Role.member];

router.use(authenticate);
router.use(requireRole(...managerOrMember));

router.get('/', listProjects);
router.post('/', requireRole(Role.admin, Role.manager), validateBody(createProjectSchema), createProject);

router.get('/:id/tasks', listProjectTasks);
router.post(
  '/:id/tasks',
  requireRole(Role.manager),
  validateBody(createTaskSchema),
  createProjectTask
);

router.get('/:id/members', listProjectMembers);
router.post(
  '/:id/members',
  requireRole(Role.manager),
  validateBody(addProjectMemberSchema),
  addProjectMember
);
router.patch(
  '/:id/members/:userId/role',
  requireRole(Role.manager),
  validateBody(updateProjectMemberRoleSchema),
  updateProjectMemberRole
);
router.delete('/:id/members/:userId', requireRole(Role.manager), removeProjectMember);
router.get('/:id/roles', listProjectRoles);

router.get('/:id/milestones', listProjectMilestones);
router.post(
  '/:id/milestones',
  requireRole(Role.admin, Role.manager),
  validateBody(createMilestoneSchema),
  createMilestone
);
router.get('/:id/timelogs', listProjectTimeLogs);
router.get('/:id/labels', listProjectLabels);
router.post('/:id/labels', requireRole(Role.admin, Role.manager), validateBody(createLabelSchema), createProjectLabel);
router.get('/:id/activity', listProjectActivity);

router.get('/:id', getProject);
router.patch('/:id', requireRole(Role.admin, Role.manager), validateBody(updateProjectSchema), updateProject);
router.delete('/:id', requireRole(Role.admin, Role.manager), deleteProject);

export default router;
