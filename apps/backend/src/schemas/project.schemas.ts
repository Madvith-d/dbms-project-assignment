import { z } from 'zod';
import { ProjectStatus } from '@prisma/client';

export const createProjectSchema = z.object({
  project_name: z.string().min(1),
  description: z.string().optional().nullable(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date().optional().nullable(),
  budget: z.coerce.number().nonnegative().optional().nullable(),
  status: z.nativeEnum(ProjectStatus).optional(),
});

export const updateProjectSchema = z.object({
  project_name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional().nullable(),
  budget: z.coerce.number().nonnegative().optional().nullable(),
  status: z.nativeEnum(ProjectStatus).optional(),
});

export const addProjectMemberSchema = z.object({
  user_id: z.coerce.number().int().positive(),
  assigned_role: z.string().trim().min(1).max(50).optional(),
});

export const updateProjectMemberRoleSchema = z.object({
  assigned_role: z.string().trim().min(1).max(50),
});
