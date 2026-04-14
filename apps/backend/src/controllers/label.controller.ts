import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { assertProjectMember } from '../lib/projectAccess';
import { logActivity } from '../lib/activityLog';

export async function listProjectLabels(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const projectId = Number(req.params.id);
    const access = await assertProjectMember(res, userId, projectId);
    if (!access) return;

    const labels = await prisma.label.findMany({
      where: { project_id: projectId },
      orderBy: { name: 'asc' },
    });
    return res.json({ labels });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function createProjectLabel(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const projectId = Number(req.params.id);
    const access = await assertProjectMember(res, userId, projectId);
    if (!access) return;

    const { name, color } = req.body as { name: string; color: string };
    try {
      const label = await prisma.label.create({
        data: { project_id: projectId, name, color },
      });
      await logActivity({
        project_id: projectId,
        actor_user_id: userId,
        entity_type: 'PROJECT',
        entity_id: projectId,
        action: 'UPDATED',
        summary: `Created label "${label.name}"`,
        metadata: { label_id: label.label_id, name: label.name, color: label.color },
      });
      return res.status(201).json({ label });
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        return res.status(409).json({ error: 'Label name already exists in this project' });
      }
      throw err;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

async function loadLabelWithAccess(res: Response, userId: number, labelId: number) {
  if (!Number.isFinite(labelId) || labelId <= 0) {
    res.status(400).json({ error: 'Invalid label id' });
    return null;
  }
  const label = await prisma.label.findUnique({ where: { label_id: labelId } });
  if (!label) {
    res.status(404).json({ error: 'Label not found' });
    return null;
  }
  const access = await assertProjectMember(res, userId, label.project_id);
  if (!access) return null;
  return label;
}

export async function updateLabelById(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const labelId = Number(req.params.id);
    const existing = await loadLabelWithAccess(res, userId, labelId);
    if (!existing) return;

    const body = req.body as { name?: string; color?: string };
    if (body.name === undefined && body.color === undefined) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    try {
      const label = await prisma.label.update({
        where: { label_id: labelId },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.color !== undefined && { color: body.color }),
        },
      });
      await logActivity({
        project_id: existing.project_id,
        actor_user_id: userId,
        entity_type: 'PROJECT',
        entity_id: existing.project_id,
        action: 'UPDATED',
        summary: `Updated label "${label.name}"`,
        metadata: { label_id: label.label_id, name: label.name, color: label.color },
      });
      return res.json({ label });
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        return res.status(409).json({ error: 'Label name already exists in this project' });
      }
      throw err;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function deleteLabelById(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const labelId = Number(req.params.id);
    const existing = await loadLabelWithAccess(res, userId, labelId);
    if (!existing) return;

    await prisma.$transaction(async (tx) => {
      await tx.taskLabel.deleteMany({ where: { label_id: existing.label_id } });
      await tx.label.delete({ where: { label_id: existing.label_id } });
      await logActivity(
        {
          project_id: existing.project_id,
          actor_user_id: userId,
          entity_type: 'PROJECT',
          entity_id: existing.project_id,
          action: 'UPDATED',
          summary: `Deleted label "${existing.name}"`,
          metadata: { label_id: existing.label_id, name: existing.name },
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
