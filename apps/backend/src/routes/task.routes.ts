import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validateBody } from '../middleware/validate';
import {
  updateTaskSchema,
  assignTaskSchema,
  createSubtaskSchema,
  moveTaskSchema,
  updateTaskLabelsSchema,
} from '../schemas/task.schemas';
import { createCommentSchema } from '../schemas/comment.schemas';
import { createTimeLogSchema } from '../schemas/timelog.schemas';
import {
  getTaskById,
  updateTaskById,
  deleteTaskById,
  createSubtask,
  listTaskSubtasks,
  assignTask,
  moveTask,
  updateTaskLabels,
} from '../controllers/task.controller';
import { listTaskComments, addTaskComment } from '../controllers/comment.controller';
import {
  listTaskAttachments,
  uploadTaskAttachment,
} from '../controllers/attachment.controller';
import { listTaskTimeLogs, createTaskTimeLog } from '../controllers/timelog.controller';
import { attachmentUpload } from '../middleware/upload';

const router = Router();

router.use(authenticate);
router.use(requireRole(Role.admin, Role.manager, Role.member));

router.get('/:id/comments', listTaskComments);
router.post('/:id/comments', validateBody(createCommentSchema), addTaskComment);

router.get('/:id/attachments', listTaskAttachments);
router.post(
  '/:id/attachments',
  (req, res, next) => {
    attachmentUpload.single('file')(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  },
  uploadTaskAttachment
);

router.get('/:id/timelogs', listTaskTimeLogs);
router.post('/:id/timelogs', validateBody(createTimeLogSchema), createTaskTimeLog);

router.get('/:id', getTaskById);
router.patch('/:id', validateBody(updateTaskSchema), updateTaskById);
router.patch('/:id/move', validateBody(moveTaskSchema), moveTask);
router.delete('/:id', deleteTaskById);
router.get('/:id/subtasks', listTaskSubtasks);
router.post('/:id/subtasks', validateBody(createSubtaskSchema), createSubtask);
router.patch('/:id/assign', requireRole(Role.admin, Role.manager), validateBody(assignTaskSchema), assignTask);
router.post('/:id/labels', requireRole(Role.admin, Role.manager), validateBody(updateTaskLabelsSchema), updateTaskLabels);

export default router;
