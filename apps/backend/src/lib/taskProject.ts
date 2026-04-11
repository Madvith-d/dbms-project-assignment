import { Response } from 'express';
import prisma from './prisma';
import { assertProjectMember } from './projectAccess';

export async function assertTaskProjectMember(
  res: Response,
  userId: number,
  taskId: number
) {
  if (!Number.isFinite(taskId) || taskId <= 0) {
    res.status(400).json({ error: 'Invalid task id' });
    return null;
  }

  const task = await prisma.task.findUnique({ where: { task_id: taskId } });
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return null;
  }

  const access = await assertProjectMember(res, userId, task.project_id);
  if (!access) return null;

  return task;
}
