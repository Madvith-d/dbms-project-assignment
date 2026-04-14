import { z } from 'zod';

export const createLabelSchema = z.object({
  name: z.string().trim().min(1).max(50),
  color: z.string().trim().regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/, 'Color must be a valid hex value'),
});

export const updateLabelSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  color: z.string().trim().regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/, 'Color must be a valid hex value').optional(),
});
