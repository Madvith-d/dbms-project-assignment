import { Request, Response } from 'express';
import { Prisma, ProjectStatus, Role } from '@prisma/client';
import prisma from '../lib/prisma';
import {
  assertProjectMember,
  assertProjectOwner,
} from '../lib/projectAccess';
import { publicUserMini } from '../lib/userPublic';

export async function listProjects(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { created_by: userId },
          { members: { some: { user_id: userId } } },
        ],
      },
      orderBy: { project_id: 'asc' },
    });
    return res.json({ projects });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function createProject(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const body = req.body as {
      project_name: string;
      description?: string | null;
      start_date: Date;
      end_date?: Date | null;
      budget?: number | null;
      status?: import('@prisma/client').ProjectStatus;
    };

    const project = await prisma.project.create({
      data: {
        project_name: body.project_name,
        description: body.description ?? null,
        start_date: body.start_date,
        end_date: body.end_date ?? null,
        budget: body.budget ?? null,
        status: body.status ?? undefined,
        created_by: userId,
      },
    });
    return res.status(201).json({ project });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function getProject(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const projectId = Number(req.params.id);
    const access = await assertProjectMember(res, userId, projectId);
    if (!access) return;

    const project = await prisma.project.findUnique({
      where: { project_id: projectId },
      include: {
        tasks: {
          include: {
            assignee: {
              select: {
                user_id: true,
                first_name: true,
                last_name: true,
                email: true,
              },
            },
            subtasks: {
              include: {
                assignee: {
                  select: {
                    user_id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                  },
                },
                labels: {
                  include: { label: true },
                },
              },
              orderBy: [{ status: 'asc' }, { sort_order: 'asc' }, { created_at: 'asc' }],
            },
            labels: {
              include: { label: true },
            },
          },
          orderBy: [{ status: 'asc' }, { sort_order: 'asc' }, { created_at: 'asc' }],
        },
        milestones: { orderBy: { due_date: 'asc' } },
      },
    });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    return res.json({ project });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function updateProject(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const projectId = Number(req.params.id);
    const isAdmin = req.user!.role === Role.admin;
    const owner = await assertProjectOwner(res, userId, projectId, isAdmin);
    if (!owner) return;

    const body = req.body as Record<string, unknown>;
    const hasField =
      body.project_name !== undefined ||
      body.description !== undefined ||
      body.start_date !== undefined ||
      body.end_date !== undefined ||
      body.budget !== undefined ||
      body.status !== undefined;
    if (!hasField) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const data: Prisma.ProjectUpdateInput = {};
    if (body.project_name !== undefined) {
      data.project_name = body.project_name as string;
    }
    if (body.description !== undefined) {
      data.description = body.description as string | null;
    }
    if (body.start_date !== undefined) {
      data.start_date = body.start_date as Date;
    }
    if (body.end_date !== undefined) {
      data.end_date = body.end_date as Date | null;
    }
    if (body.budget !== undefined) {
      data.budget = body.budget as number | null;
    }
    if (body.status !== undefined) {
      data.status = body.status as ProjectStatus;
    }

    const project = await prisma.project.update({
      where: { project_id: projectId },
      data,
    });
    return res.json({ project });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function deleteProject(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const projectId = Number(req.params.id);
    const isAdmin = req.user!.role === Role.admin;
    const owner = await assertProjectOwner(res, userId, projectId, isAdmin);
    if (!owner) return;

    await prisma.project.delete({ where: { project_id: projectId } });
    return res.status(204).send();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function listProjectMembers(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const projectId = Number(req.params.id);
    const access = await assertProjectMember(res, userId, projectId);
    if (!access) return;

    const rows = await prisma.projectMember.findMany({
      where: { project_id: projectId },
      include: {
        user: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
      orderBy: { project_member_id: 'asc' },
    });

    const members = rows.map((r) => ({
      project_member_id: r.project_member_id,
      project_id: r.project_id,
      assigned_role: r.assigned_role,
      joined_date: r.joined_date,
      user: {
        user_id: r.user.user_id,
        first_name: r.user.first_name,
        last_name: r.user.last_name,
        email: r.user.email,
        role: r.user.role,
        status: r.user.status,
      },
    }));

    return res.json({ members });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function addProjectMember(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const projectId = Number(req.params.id);
    const isAdmin = req.user!.role === Role.admin;
    const owner = await assertProjectOwner(res, userId, projectId, isAdmin);
    if (!owner) return;

    const { user_id: newUserId, assigned_role } = req.body as {
      user_id: number;
      assigned_role?: string;
    };

    const target = await prisma.user.findUnique({ where: { user_id: newUserId } });
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (target.status !== 'active') {
      return res.status(400).json({ error: 'User is not active' });
    }

    try {
      const member = await prisma.projectMember.create({
        data: {
          project_id: projectId,
          user_id: newUserId,
          assigned_role: assigned_role ?? 'member',
        },
        include: {
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
      });
      return res.status(201).json({
        member: {
          project_member_id: member.project_member_id,
          project_id: member.project_id,
          assigned_role: member.assigned_role,
          joined_date: member.joined_date,
          user: publicUserMini(member.user),
        },
      });
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        return res.status(409).json({ error: 'User is already a member of this project' });
      }
      throw err;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

export async function removeProjectMember(req: Request, res: Response) {
  try {
    const userId = req.user!.user_id;
    const projectId = Number(req.params.id);
    const removeUserId = Number(req.params.userId);
    if (Number.isNaN(removeUserId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const isAdmin = req.user!.role === Role.admin;
    const owner = await assertProjectOwner(res, userId, projectId, isAdmin);
    if (!owner) return;

    if (removeUserId === owner.created_by) {
      return res.status(400).json({ error: 'Cannot remove the project owner from the team' });
    }

    const result = await prisma.projectMember.deleteMany({
      where: { project_id: projectId, user_id: removeUserId },
    });
    if (result.count === 0) {
      return res.status(404).json({ error: 'Member not found on this project' });
    }
    return res.status(204).send();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
