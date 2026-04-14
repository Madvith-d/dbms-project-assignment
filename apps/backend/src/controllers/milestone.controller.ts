import { Request, Response } from 'express';
import { Prisma, MilestoneStatus, Role } from '@prisma/client';
import prisma from '../lib/prisma';
import { assertProjectMember, assertProjectOwner } from '../lib/projectAccess';
import { logActivity } from '../lib/activityLog';

export async function listProjectMilestones(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const projectId = Number(req.params.id);
    const access = await assertProjectMember(res, userId, projectId);
    if (!access) return;

    const milestones = await prisma.milestone.findMany({
      where: { project_id: projectId },
      orderBy: { due_date: 'asc' },
    });
    return res.json({ milestones });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function createMilestone(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const projectId = Number(req.params.id);
    const isAdmin = req.user!.role === Role.admin;
    const owner = await assertProjectOwner(res, userId, projectId, isAdmin);
    if (!owner) return;

    const body = req.body as {
      title: string;
      description?: string | null;
      due_date: Date;
      status?: MilestoneStatus;
    };

    const milestone = await prisma.$transaction(async (tx) => {
      const created = await tx.milestone.create({
        data: {
          title: body.title,
          description: body.description ?? null,
          due_date: body.due_date,
          status: body.status ?? undefined,
          project_id: projectId,
        },
      });
      await logActivity(
        {
          project_id: projectId,
          actor_user_id: userId,
          entity_type: 'MILESTONE',
          entity_id: created.milestone_id,
          action: 'CREATED',
          summary: `Created milestone \"${created.title}\"`,
        },
        tx
      );
      return created;
    });
    return res.status(201).json({ milestone });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

async function milestoneForOwner(res: Response, userId: number, milestoneId: number, isAdmin = false) {
  if (!Number.isFinite(milestoneId) || milestoneId <= 0) {
    res.status(400).json({ error: 'Invalid milestone id' });
    return null;
  }
  const milestone = await prisma.milestone.findUnique({
    where: { milestone_id: milestoneId },
  });
  if (!milestone) {
    res.status(404).json({ error: 'Milestone not found' });
    return null;
  }
  const owner = await assertProjectOwner(res, userId, milestone.project_id, isAdmin);
  if (!owner) return null;
  return milestone;
}

export async function updateMilestone(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const milestoneId = Number(req.params.id);
    const isAdmin = req.user!.role === Role.admin;
    const existing = await milestoneForOwner(res, userId, milestoneId, isAdmin);
    if (!existing) return;

    const body = req.body as Record<string, unknown>;
    const hasField =
      body.title !== undefined ||
      body.description !== undefined ||
      body.due_date !== undefined ||
      body.status !== undefined;
    if (!hasField) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const data: Prisma.MilestoneUpdateInput = {};
    if (body.title !== undefined) data.title = body.title as string;
    if (body.description !== undefined) data.description = body.description as string | null;
    if (body.due_date !== undefined) data.due_date = body.due_date as Date;
    if (body.status !== undefined) data.status = body.status as MilestoneStatus;

    const milestone = await prisma.$transaction(async (tx) => {
      const updated = await tx.milestone.update({
        where: { milestone_id: milestoneId },
        data,
      });
      await logActivity(
        {
          project_id: existing.project_id,
          actor_user_id: userId,
          entity_type: 'MILESTONE',
          entity_id: milestoneId,
          action: 'UPDATED',
          summary: `Updated milestone \"${updated.title}\"`,
        },
        tx
      );
      return updated;
    });
    return res.json({ milestone });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function deleteMilestone(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const milestoneId = Number(req.params.id);
    const isAdmin = req.user!.role === Role.admin;
    const existing = await milestoneForOwner(res, userId, milestoneId, isAdmin);
    if (!existing) return;

    await prisma.$transaction(async (tx) => {
      await tx.milestone.delete({ where: { milestone_id: milestoneId } });
      await logActivity(
        {
          project_id: existing.project_id,
          actor_user_id: userId,
          entity_type: 'MILESTONE',
          entity_id: milestoneId,
          action: 'DELETED',
          summary: `Deleted milestone \"${existing.title}\"`,
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
