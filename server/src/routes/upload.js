import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import { config } from '../config.js';

// امتداد الملف يُشتق من نوعه المعلن وليس من اسمه الأصلي، ولا يُسمح بـ SVG/HTML.
const EXT = {
  'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif',
  'audio/mpeg': '.mp3', 'audio/wav': '.wav', 'audio/ogg': '.ogg', 'video/mp4': '.mp4', 'video/webm': '.webm',
};

export default function uploadRoutes(auth) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
  const upload = multer({
    storage: multer.diskStorage({
      destination: config.uploadDir,
      filename: (_req, file, cb) => cb(null, crypto.randomUUID() + EXT[file.mimetype]),
    }),
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => (EXT[file.mimetype] ? cb(null, true) : cb(Object.assign(new Error('نوع الملف غير مدعوم (صور PNG/JPG/WebP/GIF، صوت MP3/WAV/OGG، فيديو MP4/WebM)'), { status: 400 }))),
  });

  const r = Router();
  r.post('/', auth.required, auth.role('teacher', 'admin'), (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'الحجم الأقصى 8 ميغابايت' : err.message });
      if (!req.file) return res.status(400).json({ error: 'لم يتم اختيار ملف' });
      res.status(201).json({ url: '/uploads/' + req.file.filename });
    });
  });
  return r;
}
