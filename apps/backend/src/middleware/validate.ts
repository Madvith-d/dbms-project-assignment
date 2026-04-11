import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const message = formatZodError(parsed.error);
      return res.status(400).json({ error: message });
    }
    req.body = parsed.data;
    next();
  };
}

function formatZodError(err: ZodError): string {
  return err.errors.map((e) => e.message).join('; ');
}
