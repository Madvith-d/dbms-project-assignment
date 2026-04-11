import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import prisma from '../lib/prisma';
import { assertTaskProjectMember } from '../lib/taskProject';
import { assertProjectMember } from '../lib/projectAccess';
import { publicUserMini } from '../lib/userPublic';

export async function listTaskComments(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const taskId = Number(req.params.id);
    const task = await assertTaskProjectMember(res, userId, taskId);
    if (!task) return;

    const comments = await prisma.taskComment.findMany({
      where: { task_id: taskId },
      orderBy: { created_at: 'asc' },
      include: {
        user: {
          select: { user_id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    const out = comments.map((c) => ({
      comment_id: c.comment_id,
      comment_text: c.comment_text,
      created_at: c.created_at,
      task_id: c.task_id,
      user_id: c.user_id,
      user: publicUserMini(c.user),
    }));
    return res.json({ comments: out });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function addTaskComment(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const taskId = Number(req.params.id);
    const task = await assertTaskProjectMember(res, userId, taskId);
    if (!task) return;

    const { comment_text } = req.body as { comment_text: string };

    const comment = await prisma.taskComment.create({
      data: {
        comment_text,
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
      comment: {
        comment_id: comment.comment_id,
        comment_text: comment.comment_text,
        created_at: comment.created_at,
        task_id: comment.task_id,
        user_id: comment.user_id,
        user: publicUserMini(comment.user),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function deleteComment(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const commentId = Number(req.params.id);
    if (Number.isNaN(commentId)) {
      return res.status(400).json({ error: 'Invalid comment id' });
    }

    const comment = await prisma.taskComment.findUnique({
      where: { comment_id: commentId },
      include: { task: true },
    });
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const access = await assertProjectMember(res, userId, comment.task.project_id);
    if (!access) return;

    const isAuthor = comment.user_id === userId;
    const isManager = req.user!.role === Role.manager;
    if (!isAuthor && !isManager) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.taskComment.delete({ where: { comment_id: commentId } });
    return res.status(204).send();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
