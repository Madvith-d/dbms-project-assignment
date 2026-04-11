import { z } from 'zod';

export const createCommentSchema = z.object({
  comment_text: z.string().min(1),
});
