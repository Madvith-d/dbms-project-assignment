import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { assertProjectMember } from '../lib/projectAccess';

export async function listProjectActivity(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const projectId = Number(req.params.id);
    const access = await assertProjectMember(res, userId, projectId);
    if (!access) return;

    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const [total, rows] = await Promise.all([
      prisma.activityLog.count({ where: { project_id: projectId } }),
      prisma.activityLog.findMany({
        where: { project_id: projectId },
        include: {
          actor: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return res.json({
      data: rows,
      meta: { page, pageSize, total },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
