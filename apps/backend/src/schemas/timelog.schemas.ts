import { z } from 'zod';

export const createTimeLogSchema = z.object({
  hours_logged: z.coerce
    .number()
    .gt(0, 'hours_logged must be greater than 0')
    .max(24, 'hours_logged must be at most 24'),
  log_date: z.coerce.date(),
  description: z.string().optional().nullable(),
});
