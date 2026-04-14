import { Request, Response } from 'express';
import { Prisma, Role, TaskStatus, Priority } from '@prisma/client';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { assertProjectMember, isUserProjectMember } from '../lib/projectAccess';
import { logActivity } from '../lib/activityLog';

const assigneeSelect = {
  user_id: true,
  first_name: true,
  last_name: true,
  email: true,
} as const;

const taskInclude = {
  assignee: { select: assigneeSelect },
  labels: {
    include: {
      label: true,
    },
  },
} as const;

const listTasksQuerySchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  assigned_to: z.coerce.number().int().positive().optional(),
  priority: z.nativeEnum(Priority).optional(),
  q: z.string().trim().min(1).optional(),
  due_before: z.coerce.date().optional(),
  due_after: z.coerce.date().optional(),
  sort: z.enum(['due_date', 'priority', 'created_at']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  label_id: z.coerce.number().int().positive().optional(),
});

function serializeTask(task: any) {
  return {
    ...task,
    assignee_id: task.assigned_to,
    labels: task.labels?.map((x: any) => x.label) ?? [],
  };
}

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

async function getNextSortOrder(tx: Prisma.TransactionClient, projectId: number, status: TaskStatus) {
  const currentMax = await tx.task.findFirst({
    where: { project_id: projectId, status },
    orderBy: { sort_order: 'desc' },
    select: { sort_order: true },
  });
  return (currentMax?.sort_order ?? 0) + 1;
}

function canEditTask(user: NonNullable<Request['user']>, assignedTo: number | null) {
  const isManagerOrAdmin = user.role === Role.manager || user.role === Role.admin;
  if (isManagerOrAdmin) return true;
  return assignedTo != null && assignedTo === user.user_id;
}

export async function listProjectTasks(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const projectId = Number(req.params.id);
    const access = await assertProjectMember(res, userId, projectId);
    if (!access) return;

    const parsed = listTasksQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid query params' });
    }

    const {
      status,
      assigned_to,
      priority,
      q,
      due_before,
      due_after,
      sort,
      order,
      page,
      pageSize,
      label_id,
    } = parsed.data;

    const where: Prisma.TaskWhereInput = { project_id: projectId };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigned_to) where.assigned_to = assigned_to;
    if (q) {
      where.AND = [
        {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }
    if (due_before || due_after) {
      where.due_date = {
        ...(due_after && { gte: due_after }),
        ...(due_before && { lte: due_before }),
      };
    }
    if (label_id) {
      where.labels = { some: { label_id } };
    }

    const sortOrder = (order ?? 'asc') as Prisma.SortOrder;
    const orderBy: Prisma.TaskOrderByWithRelationInput[] = sort
      ? [
          { [sort]: sortOrder },
          { status: 'asc' },
          { sort_order: 'asc' },
          { created_at: 'asc' },
        ]
      : [{ status: 'asc' }, { sort_order: 'asc' }, { created_at: 'asc' }];

    const skip = (page - 1) * pageSize;

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        include: taskInclude,
        orderBy,
        skip,
        take: pageSize,
      }),
    ]);

    const data = tasks.map(serializeTask);

    return res.json({
      data,
      tasks: data,
      meta: { page, pageSize, total },
    });
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
      start_date?: Date;
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

    const status = body.status ?? TaskStatus.backlog;

    const task = await prisma.$transaction(async (tx) => {
      const sort_order = await getNextSortOrder(tx, projectId, status);
      const created = await tx.task.create({
        data: {
          title: body.title,
          description: body.description ?? null,
          priority: body.priority ?? undefined,
          status,
          sort_order,
          start_date: body.start_date ?? new Date(),
          due_date: body.due_date ?? null,
          estimated_hours: body.estimated_hours ?? null,
          actual_hours: body.actual_hours ?? null,
          assigned_to: body.assigned_to ?? null,
          parent_task_id: body.parent_task_id ?? null,
          project_id: projectId,
          created_by: userId,
        },
        include: taskInclude,
      });

      await logActivity(
        {
          project_id: projectId,
          actor_user_id: userId,
          entity_type: 'TASK',
          entity_id: created.task_id,
          action: 'CREATED',
          summary: `Created task "${created.title}"`,
          metadata: { status: created.status, assigned_to: created.assigned_to },
        },
        tx
      );

      return created;
    });

    return res.status(201).json({ task: serializeTask(task) });
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
        ...taskInclude,
        subtasks: {
          include: taskInclude,
          orderBy: [{ status: 'asc' }, { sort_order: 'asc' }, { created_at: 'asc' }],
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

    return res.json({
      task: {
        ...serializeTask(task),
        subtasks: task.subtasks.map(serializeTask),
      },
    });
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
    const isManagerOrAdmin = req.user!.role === Role.manager || req.user!.role === Role.admin;

    if (body.assigned_to !== undefined && !isManagerOrAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!canEditTask(req.user!, existing.assigned_to)) {
      return res.status(403).json({ error: 'Forbidden' });
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

    const task = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
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
        include: taskInclude,
      });

      await logActivity(
        {
          project_id: existing.project_id,
          actor_user_id: userId,
          entity_type: 'TASK',
          entity_id: updated.task_id,
          action:
            body.status !== undefined && body.status !== existing.status
              ? 'STATUS_CHANGED'
              : body.assigned_to !== undefined && body.assigned_to !== existing.assigned_to
                ? 'ASSIGNED'
                : 'UPDATED',
          summary: `Updated task "${updated.title}"`,
          metadata: {
            before: {
              status: existing.status,
              assigned_to: existing.assigned_to,
              priority: existing.priority,
              due_date: existing.due_date?.toISOString() ?? null,
            },
            after: {
              status: updated.status,
              assigned_to: updated.assigned_to,
              priority: updated.priority,
              due_date: updated.due_date?.toISOString() ?? null,
            },
          },
        },
        tx
      );

      return updated;
    });

    return res.json({ task: serializeTask(task) });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function moveTask(req: Request, res: Response) {
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

    if (!canEditTask(req.user!, existing.assigned_to)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { status, sort_order } = req.body as { status: TaskStatus; sort_order: number };

    const task = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { task_id: taskId },
        data: { status, sort_order },
        include: taskInclude,
      });

      await logActivity(
        {
          project_id: existing.project_id,
          actor_user_id: userId,
          entity_type: 'TASK',
          entity_id: updated.task_id,
          action: 'STATUS_CHANGED',
          summary: `Moved task "${updated.title}" to ${status.replace('_', ' ')}`,
          metadata: {
            from_status: existing.status,
            to_status: status,
            sort_order,
          },
        },
        tx
      );

      return updated;
    });

    return res.json({ task: serializeTask(task) });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function updateTaskLabels(req: Request, res: Response) {
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

    const { label_ids } = req.body as { label_ids: number[] };
    const uniqueLabelIds = Array.from(new Set(label_ids));

    const labels = await prisma.label.findMany({
      where: { label_id: { in: uniqueLabelIds }, project_id: existing.project_id },
      select: { label_id: true },
    });
    if (labels.length !== uniqueLabelIds.length) {
      return res.status(400).json({ error: 'One or more labels are invalid for this project' });
    }

    const task = await prisma.$transaction(async (tx) => {
      await tx.taskLabel.deleteMany({ where: { task_id: taskId } });
      if (uniqueLabelIds.length > 0) {
        await tx.taskLabel.createMany({
          data: uniqueLabelIds.map((labelId) => ({ task_id: taskId, label_id: labelId })),
          skipDuplicates: true,
        });
      }

      const updated = await tx.task.findUniqueOrThrow({
        where: { task_id: taskId },
        include: taskInclude,
      });

      await logActivity(
        {
          project_id: existing.project_id,
          actor_user_id: userId,
          entity_type: 'TASK',
          entity_id: taskId,
          action: 'LABELS_UPDATED',
          summary: `Updated labels for task "${updated.title}"`,
          metadata: { label_ids: uniqueLabelIds },
        },
        tx
      );

      return updated;
    });

    return res.json({ task: serializeTask(task) });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function deleteTaskById(req: Request, res: Response) {
  try {
    if (req.user!.role !== Role.manager && req.user!.role !== Role.admin) {
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

    await prisma.$transaction(async (tx) => {
      await tx.task.delete({ where: { task_id: taskId } });
      await logActivity(
        {
          project_id: existing.project_id,
          actor_user_id: userId,
          entity_type: 'TASK',
          entity_id: taskId,
          action: 'DELETED',
          summary: `Deleted task "${existing.title}"`,
        },
        tx
      );
    });

    return res.status(204).send();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function listTaskSubtasks(req: Request, res: Response) {
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

    const access = await assertProjectMember(res, userId, parent.project_id);
    if (!access) return;

    const subtasks = await prisma.task.findMany({
      where: { parent_task_id: parentTaskId },
      include: taskInclude,
      orderBy: [{ status: 'asc' }, { sort_order: 'asc' }, { created_at: 'asc' }],
    });
    return res.json({ tasks: subtasks.map(serializeTask) });
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
      start_date?: Date;
      due_date?: Date | null;
      estimated_hours?: number | null;
    };

    const status = body.status ?? TaskStatus.todo;

    const task = await prisma.$transaction(async (tx) => {
      const sort_order = await getNextSortOrder(tx, parent.project_id, status);
      const created = await tx.task.create({
        data: {
          title: body.title,
          description: body.description ?? null,
          priority: body.priority ?? undefined,
          status,
          sort_order,
          start_date: body.start_date ?? new Date(),
          due_date: body.due_date ?? null,
          estimated_hours: body.estimated_hours ?? null,
          project_id: parent.project_id,
          parent_task_id: parentTaskId,
          created_by: userId,
          assigned_to: null,
        },
        include: taskInclude,
      });

      await logActivity(
        {
          project_id: parent.project_id,
          actor_user_id: userId,
          entity_type: 'TASK',
          entity_id: created.task_id,
          action: 'CREATED',
          summary: `Created subtask "${created.title}"`,
          metadata: { parent_task_id: parentTaskId },
        },
        tx
      );

      return created;
    });

    return res.status(201).json({ task: serializeTask(task) });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function assignTask(req: Request, res: Response) {
  try {
    if (req.user!.role !== Role.manager && req.user!.role !== Role.admin) {
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

    const task = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { task_id: taskId },
        data: { assigned_to },
        include: taskInclude,
      });
      await logActivity(
        {
          project_id: existing.project_id,
          actor_user_id: userId,
          entity_type: 'TASK',
          entity_id: taskId,
          action: 'ASSIGNED',
          summary: `Updated assignee for task "${updated.title}"`,
          metadata: { from: existing.assigned_to, to: assigned_to },
        },
        tx
      );
      return updated;
    });

    return res.json({ task: serializeTask(task) });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
