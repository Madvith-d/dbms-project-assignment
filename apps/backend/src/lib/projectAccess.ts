import { Response } from 'express';
import prisma from './prisma';

export type ProjectWithMembership = Awaited<
  ReturnType<typeof fetchProjectWithMembership>
>;

async function fetchProjectWithMembership(projectId: number, userId: number) {
  return prisma.project.findUnique({
    where: { project_id: projectId },
    include: {
      members: { where: { user_id: userId } },
    },
  });
}

export function isProjectMember(
  project: NonNullable<Awaited<ReturnType<typeof fetchProjectWithMembership>>>,
  userId: number
): boolean {
  return project.created_by === userId || project.members.length > 0;
}

export async function assertProjectMember(
  res: Response,
  userId: number,
  projectId: number
) {
  if (!Number.isFinite(projectId) || projectId <= 0) {
    res.status(400).json({ error: 'Invalid project id' });
    return null;
  }

  const project = await fetchProjectWithMembership(projectId, userId);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return null;
  }
  if (!isProjectMember(project, userId)) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return project;
}

export async function assertProjectOwner(
  res: Response,
  userId: number,
  projectId: number,
  isAdmin = false
) {
  if (!Number.isFinite(projectId) || projectId <= 0) {
    res.status(400).json({ error: 'Invalid project id' });
    return null;
  }

  const project = await prisma.project.findUnique({
    where: { project_id: projectId },
  });
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return null;
  }
  if (!isAdmin && project.created_by !== userId) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return project;
}

export async function isUserProjectMember(
  projectId: number,
  userId: number
): Promise<boolean> {
  const project = await fetchProjectWithMembership(projectId, userId);
  if (!project) return false;
  return isProjectMember(project, userId);
}
