import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import prisma from '../lib/prisma';
import { assertTaskProjectMember } from '../lib/taskProject';
import { assertProjectMember } from '../lib/projectAccess';
import { publicUserMini } from '../lib/userPublic';

function uploadDir(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
}

function diskPath(storedFileName: string): string {
  return path.join(uploadDir(), storedFileName);
}

export async function listTaskAttachments(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const taskId = Number(req.params.id);
    const task = await assertTaskProjectMember(res, userId, taskId);
    if (!task) return;

    const attachments = await prisma.taskAttachment.findMany({
      where: { task_id: taskId },
      orderBy: { uploaded_at: 'desc' },
      include: {
        user: {
          select: { user_id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    const out = attachments.map((a) => ({
      attachment_id: a.attachment_id,
      file_name: a.file_name,
      uploaded_at: a.uploaded_at,
      task_id: a.task_id,
      uploaded_by: a.uploaded_by,
      uploader: publicUserMini(a.user),
    }));
    return res.json({ attachments: out });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function uploadTaskAttachment(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const taskId = Number(req.params.id);
    const task = await assertTaskProjectMember(res, userId, taskId);
    if (!task) return;

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'File is required (field name: file)' });
    }

    const attachment = await prisma.taskAttachment.create({
      data: {
        file_name: file.originalname,
        file_path: file.filename,
        task_id: taskId,
        uploaded_by: userId,
      },
      include: {
        user: {
          select: { user_id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    return res.status(201).json({
      attachment: {
        attachment_id: attachment.attachment_id,
        file_name: attachment.file_name,
        uploaded_at: attachment.uploaded_at,
        task_id: attachment.task_id,
        uploaded_by: attachment.uploaded_by,
        uploader: publicUserMini(attachment.user),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

async function loadAttachmentForAccess(res: Response, userId: number, attachmentId: number) {
  if (!Number.isFinite(attachmentId) || attachmentId <= 0) {
    res.status(400).json({ error: 'Invalid attachment id' });
    return null;
  }
  const attachment = await prisma.taskAttachment.findUnique({
    where: { attachment_id: attachmentId },
    include: { task: true },
  });
  if (!attachment) {
    res.status(404).json({ error: 'Attachment not found' });
    return null;
  }
  const access = await assertProjectMember(res, userId, attachment.task.project_id);
  if (!access) return null;
  return attachment;
}

export async function downloadAttachment(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const attachmentId = Number(req.params.id);
    const attachment = await loadAttachmentForAccess(res, userId, attachmentId);
    if (!attachment) return;

    const full = diskPath(attachment.file_path);
    if (!fs.existsSync(full)) {
      return res.status(404).json({ error: 'File missing on disk' });
    }

    return res.download(full, attachment.file_name);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function deleteAttachment(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const attachmentId = Number(req.params.id);
    const attachment = await loadAttachmentForAccess(res, userId, attachmentId);
    if (!attachment) return;

    const isUploader = attachment.uploaded_by === userId;
    const isManager = req.user!.role === Role.manager;
    if (!isUploader && !isManager) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const full = diskPath(attachment.file_path);
    await prisma.taskAttachment.delete({ where: { attachment_id: attachmentId } });
    try {
      if (fs.existsSync(full)) fs.unlinkSync(full);
    } catch {
      /* ignore disk cleanup errors */
    }

    return res.status(204).send();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
