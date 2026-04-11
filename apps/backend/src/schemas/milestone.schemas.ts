import { z } from 'zod';
import { MilestoneStatus } from '@prisma/client';

export const createMilestoneSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  due_date: z.coerce.date(),
  status: z.nativeEnum(MilestoneStatus).optional(),
});

export const updateMilestoneSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  due_date: z.coerce.date().optional(),
  status: z.nativeEnum(MilestoneStatus).optional(),
});
