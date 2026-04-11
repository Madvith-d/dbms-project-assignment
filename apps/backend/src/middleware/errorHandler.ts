import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large (max 10 MB)' });
    }
    return res.status(400).json({ error: err.message });
  }

  if (err instanceof Error && err.message.startsWith('Invalid file type')) {
    return res.status(400).json({ error: err.message });
  }

  const status =
    err && typeof err === 'object' && 'status' in err && typeof (err as { status: unknown }).status === 'number'
      ? (err as { status: number }).status
      : 500;
  const message =
    err instanceof Error ? err.message : 'Internal server error';
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' &&
      err instanceof Error && { stack: err.stack }),
  });
}
