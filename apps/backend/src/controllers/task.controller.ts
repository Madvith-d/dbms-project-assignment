import { Request, Response } from 'express';
import { Prisma, Role, TaskStatus, Priority } from '@prisma/client';
import prisma from '../lib/prisma';
import { assertProjectMember, isUserProjectMember } from '../lib/projectAccess';

const assigneeSelect = {
  user_id: true,
  first_name: true,
  last_name: true,
  email: true,
} as const;

async function validateAssigneeInProject(
  res: Response,
  projectId: number,
  assigneeId: number | null | undefined
): Promise<boolean> {
  if (assigneeId == null) return true;
  const ok = await isUserProjectMember(projectId, assigneeId);
  if (!ok) {
    res.status(400).json({ error: 'Assignee must be a member of this project' });
    return false;
  }
  return true;
}

export async function listProjectTasks(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const projectId = Number(req.params.id);
    const access = await assertProjectMember(res, userId, projectId);
    if (!access) return;

    const { status, assignee, priority } = req.query;

    const where: Prisma.TaskWhereInput = { project_id: projectId };

    if (typeof status === 'string' && status.length > 0) {
      if (!Object.values(TaskStatus).includes(status as TaskStatus)) {
        return res.status(400).json({ error: 'Invalid status filter' });
      }
      where.status = status as TaskStatus;
    }
    if (typeof priority === 'string' && priority.length > 0) {
      if (!Object.values(Priority).includes(priority as Priority)) {
        return res.status(400).json({ error: 'Invalid priority filter' });
      }
      where.priority = priority as Priority;
    }
    if (typeof assignee === 'string' && assignee.length > 0) {
      const aid = Number(assignee);
      if (Number.isNaN(aid)) {
        return res.status(400).json({ error: 'Invalid assignee filter' });
      }
      where.assigned_to = aid;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: assigneeSelect },
      },
      orderBy: { task_id: 'asc' },
    });
    return res.json({ tasks });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function createProjectTask(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const projectId = Number(req.params.id);
    const access = await assertProjectMember(res, userId, projectId);
    if (!access) return;

    const body = req.body as {
      title: string;
      description?: string | null;
      priority?: import('@prisma/client').Priority;
      status?: import('@prisma/client').TaskStatus;
      start_date: Date;
      due_date?: Date | null;
      estimated_hours?: number | null;
      actual_hours?: number | null;
      assigned_to?: number | null;
      parent_task_id?: number | null;
    };

    if (body.parent_task_id != null) {
      const parent = await prisma.task.findUnique({
        where: { task_id: body.parent_task_id },
      });
      if (!parent || parent.project_id !== projectId) {
        return res.status(400).json({ error: 'Invalid parent task' });
      }
      if (parent.parent_task_id != null) {
        return res.status(400).json({ error: 'Subtasks cannot have their own subtasks' });
      }
    }

    if (!(await validateAssigneeInProject(res, projectId, body.assigned_to))) {
      return;
    }

    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        priority: body.priority ?? undefined,
        status: body.status ?? undefined,
        start_date: body.start_date,
        due_date: body.due_date ?? null,
        estimated_hours: body.estimated_hours ?? null,
        actual_hours: body.actual_hours ?? null,
        assigned_to: body.assigned_to ?? null,
        parent_task_id: body.parent_task_id ?? null,
        project_id: projectId,
        created_by: userId,
      },
      include: { assignee: { select: assigneeSelect } },
    });
    return res.status(201).json({ task });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function getTaskById(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const taskId = Number(req.params.id);
    if (Number.isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task id' });
    }

    const task = await prisma.task.findUnique({
      where: { task_id: taskId },
      include: {
        assignee: { select: assigneeSelect },
        subtasks: {
          include: { assignee: { select: assigneeSelect } },
          orderBy: { task_id: 'asc' },
        },
        comments: {
          orderBy: { created_at: 'asc' },
          include: {
            user: { select: assigneeSelect },
          },
        },
      },
    });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const access = await assertProjectMember(res, userId, task.project_id);
    if (!access) return;

    return res.json({ task });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function updateTaskById(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const taskId = Number(req.params.id);
    if (Number.isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task id' });
    }

    const existing = await prisma.task.findUnique({ where: { task_id: taskId } });
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const access = await assertProjectMember(res, userId, existing.project_id);
    if (!access) return;

    const body = req.body as Record<string, unknown>;
    const isManager = req.user!.role === Role.manager;

    if (body.assigned_to !== undefined && !isManager) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!isManager) {
      if (existing.assigned_to == null || existing.assigned_to !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const hasField = Object.keys(body).length > 0;
    if (!hasField) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    if (body.assigned_to !== undefined) {
      const nextAssignee = body.assigned_to as number | null;
      if (!(await validateAssigneeInProject(res, existing.project_id, nextAssignee))) {
        return;
      }
    }

    const task = await prisma.task.update({
      where: { task_id: taskId },
      data: {
        ...(body.title !== undefined && { title: body.title as string }),
        ...(body.description !== undefined && {
          description: body.description as string | null,
        }),
        ...(body.priority !== undefined && { priority: body.priority as import('@prisma/client').Priority }),
        ...(body.status !== undefined && { status: body.status as import('@prisma/client').TaskStatus }),
        ...(body.start_date !== undefined && { start_date: body.start_date as Date }),
        ...(body.due_date !== undefined && {
          due_date: body.due_date as Date | null,
        }),
        ...(body.estimated_hours !== undefined && {
          estimated_hours: body.estimated_hours as number | null,
        }),
        ...(body.actual_hours !== undefined && {
          actual_hours: body.actual_hours as number | null,
        }),
        ...(body.assigned_to !== undefined && {
          assigned_to: body.assigned_to as number | null,
        }),
      },
      include: { assignee: { select: assigneeSelect } },
    });
    return res.json({ task });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function deleteTaskById(req: Request, res: Response) {
  try {
    if (req.user!.role !== Role.manager) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userId = req.user!.user_id;
    const taskId = Number(req.params.id);
    if (Number.isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task id' });
    }

    const existing = await prisma.task.findUnique({ where: { task_id: taskId } });
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const access = await assertProjectMember(res, userId, existing.project_id);
    if (!access) return;

    await prisma.task.delete({ where: { task_id: taskId } });
    return res.status(204).send();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function createSubtask(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const parentTaskId = Number(req.params.id);
    if (Number.isNaN(parentTaskId)) {
      return res.status(400).json({ error: 'Invalid task id' });
    }

    const parent = await prisma.task.findUnique({ where: { task_id: parentTaskId } });
    if (!parent) {
      return res.status(404).json({ error: 'Task not found' });
    }
    if (parent.parent_task_id != null) {
      return res.status(400).json({ error: 'Subtasks cannot have their own subtasks' });
    }

    const access = await assertProjectMember(res, userId, parent.project_id);
    if (!access) return;

    const body = req.body as {
      title: string;
      description?: string | null;
      priority?: import('@prisma/client').Priority;
      status?: import('@prisma/client').TaskStatus;
      start_date: Date;
      due_date?: Date | null;
      estimated_hours?: number | null;
    };

    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        priority: body.priority ?? undefined,
        status: body.status ?? undefined,
        start_date: body.start_date,
        due_date: body.due_date ?? null,
        estimated_hours: body.estimated_hours ?? null,
        project_id: parent.project_id,
        parent_task_id: parentTaskId,
        created_by: userId,
        assigned_to: null,
      },
      include: { assignee: { select: assigneeSelect } },
    });
    return res.status(201).json({ task });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function assignTask(req: Request, res: Response) {
  try {
    if (req.user!.role !== Role.manager) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userId = req.user!.user_id;
    const taskId = Number(req.params.id);
    if (Number.isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task id' });
    }

    const existing = await prisma.task.findUnique({ where: { task_id: taskId } });
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const access = await assertProjectMember(res, userId, existing.project_id);
    if (!access) return;

    const { assigned_to } = req.body as { assigned_to: number | null };

    if (!(await validateAssigneeInProject(res, existing.project_id, assigned_to))) {
      return;
    }

    const task = await prisma.task.update({
      where: { task_id: taskId },
      data: { assigned_to },
      include: { assignee: { select: assigneeSelect } },
    });
    return res.json({ task });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
