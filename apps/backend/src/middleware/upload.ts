import fs from 'fs';
import path from 'path';
import multer, { FileFilterCallback } from 'multer';
import type { Request } from 'express';
import { randomBytes } from 'crypto';

const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

function uploadDir(): string {
  const dir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir());
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const safe = `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`;
    cb(null, safe);
  },
});

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
  if (ALLOWED_MIMES.has(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(new Error('Invalid file type. Allowed: jpg, png, gif, pdf, docx, xlsx'));
}

export const attachmentUpload = multer({
  storage,
  limits: { fileSize: MAX_BYTES },
  fileFilter,
});
