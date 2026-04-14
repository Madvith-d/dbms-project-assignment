import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export async function getDashboardStats(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;

    // Projects visible to this user
    const projectWhere = {
      OR: [
        { created_by: userId },
        { members: { some: { user_id: userId } } },
      ],
    };

    const [totalProjects, activeProjects, totalTasks, completedTasks, overdueTasks] =
      await Promise.all([
        prisma.project.count({ where: projectWhere }),
        prisma.project.count({ where: { ...projectWhere, status: 'active' } }),
        prisma.task.count({
          where: {
            project: projectWhere,
          },
        }),
        prisma.task.count({
          where: {
            project: projectWhere,
            status: 'done',
          },
        }),
        prisma.task.count({
          where: {
            project: projectWhere,
            status: { not: 'done' },
            due_date: { lt: new Date() },
          },
        }),
      ]);

    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return res.json({
      stats: {
        total_projects: totalProjects,
        active_projects: activeProjects,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        overdue_tasks: overdueTasks,
        completion_rate: completionRate,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
