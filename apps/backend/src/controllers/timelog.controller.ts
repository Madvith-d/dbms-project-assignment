import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { assertTaskProjectMember } from '../lib/taskProject';
import { assertProjectMember } from '../lib/projectAccess';
import { publicUserMini } from '../lib/userPublic';

export async function listTaskTimeLogs(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const taskId = Number(req.params.id);
    const task = await assertTaskProjectMember(res, userId, taskId);
    if (!task) return;

    const time_logs = await prisma.timeLog.findMany({
      where: { task_id: taskId },
      orderBy: { log_date: 'desc' },
      include: {
        user: {
          select: { user_id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    const out = time_logs.map((t) => ({
      time_log_id: t.time_log_id,
      hours_logged: t.hours_logged,
      log_date: t.log_date,
      description: t.description,
      task_id: t.task_id,
      user_id: t.user_id,
      user: publicUserMini(t.user),
    }));
    return res.json({ time_logs: out });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function createTaskTimeLog(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const taskId = Number(req.params.id);
    const task = await assertTaskProjectMember(res, userId, taskId);
    if (!task) return;

    const body = req.body as {
      hours_logged: number;
      log_date: Date;
      description?: string | null;
    };

    const time_log = await prisma.timeLog.create({
      data: {
        hours_logged: body.hours_logged,
        log_date: body.log_date,
        description: body.description ?? null,
        task_id: taskId,
        user_id: userId,
      },
      include: {
        user: {
          select: { user_id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    return res.status(201).json({
      time_log: {
        time_log_id: time_log.time_log_id,
        hours_logged: time_log.hours_logged,
        log_date: time_log.log_date,
        description: time_log.description,
        task_id: time_log.task_id,
        user_id: time_log.user_id,
        user: publicUserMini(time_log.user),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function listProjectTimeLogs(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const projectId = Number(req.params.id);
    const access = await assertProjectMember(res, userId, projectId);
    if (!access) return;

    const time_logs = await prisma.timeLog.findMany({
      where: { task: { project_id: projectId } },
      orderBy: { log_date: 'desc' },
      include: {
        user: {
          select: { user_id: true, first_name: true, last_name: true, email: true },
        },
        task: {
          select: { task_id: true, title: true },
        },
      },
    });

    const out = time_logs.map((t) => ({
      time_log_id: t.time_log_id,
      hours_logged: t.hours_logged,
      log_date: t.log_date,
      description: t.description,
      task_id: t.task_id,
      user_id: t.user_id,
      user: publicUserMini(t.user),
      task: t.task,
    }));
    return res.json({ time_logs: out });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
