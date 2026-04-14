import { z } from 'zod';
import { TaskStatus, Priority } from '@prisma/client';

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  priority: z.nativeEnum(Priority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  start_date: z.coerce.date().optional(),
  due_date: z.coerce.date().optional().nullable(),
  estimated_hours: z.coerce.number().nonnegative().optional().nullable(),
  actual_hours: z.coerce.number().nonnegative().optional().nullable(),
  assigned_to: z.coerce.number().int().positive().optional().nullable(),
  parent_task_id: z.coerce.number().int().positive().optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  priority: z.nativeEnum(Priority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  start_date: z.coerce.date().optional(),
  due_date: z.coerce.date().optional().nullable(),
  estimated_hours: z.coerce.number().nonnegative().optional().nullable(),
  actual_hours: z.coerce.number().nonnegative().optional().nullable(),
  assigned_to: z.union([z.number().int().positive(), z.null()]).optional(),
});

export const assignTaskSchema = z.object({
  assigned_to: z.union([z.number().int().positive(), z.null()]),
});

export const moveTaskSchema = z.object({
  status: z.nativeEnum(TaskStatus),
  sort_order: z.coerce.number(),
});

export const createSubtaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  priority: z.nativeEnum(Priority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  start_date: z.coerce.date().optional(),
  due_date: z.coerce.date().optional().nullable(),
  estimated_hours: z.coerce.number().nonnegative().optional().nullable(),
});

export const updateTaskLabelsSchema = z.object({
  label_ids: z.array(z.coerce.number().int().positive()).default([]),
});
