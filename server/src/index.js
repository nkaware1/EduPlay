import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import { createDb } from './db/index.js';
import { authMiddleware } from './auth.js';
import { seedIfEmpty } from './seed.js';
import authRoutes from './routes/auth.js';
import activityRoutes from './routes/activities.js';
import resultRoutes from './routes/results.js';
import classRoutes from './routes/classes.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/upload.js';
import statsRoutes from './routes/stats.js';
import exportRoutes from './routes/export.js';
import aiRoutes from './routes/ai.js';
import liveRoutes from './routes/live.js';
import { attachLive } from './live/hub.js';

const db = await createDb();
await seedIfEmpty(db);
const auth = authMiddleware(db);

const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.isProd ? false : config.clientOrigin }));
app.use(express.json({ limit: '2mb' }));

fs.mkdirSync(config.uploadDir, { recursive: true });
app.use('/uploads', express.static(config.uploadDir, { setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff') }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false, message: { error: 'محاولات كثيرة، حاول لاحقًا' } });
app.use('/api/auth', authLimiter, authRoutes(db, auth));
app.use('/api/activities', activityRoutes(db, auth));
app.use('/api/results', resultRoutes(db, auth));
app.use('/api/classes', classRoutes(db, auth));
app.use('/api/admin', adminRoutes(db, auth));
app.use('/api/upload', uploadRoutes(auth));
app.use('/api/stats', statsRoutes(db, auth));
app.use('/api/export', exportRoutes(db, auth));
app.use('/api/ai', aiRoutes(db, auth));
const httpServer = http.createServer(app);
const live = attachLive(httpServer, db);
app.use('/api/live', liveRoutes(live));
app.get('/api/health', (_req, res) => res.json({ ok: true, db: db.name }));
app.use('/api', (_req, res) => res.status(404).json({ error: 'غير موجود' }));

if (fs.existsSync(config.clientDist)) {
  app.use(express.static(config.clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(config.clientDist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'الحجم كبير جدًا' });
  if (!err.status || err.status >= 500) console.error(err);
  res.status(err.status || 500).json({ error: err.expose || (err.status && err.status < 500) ? err.message : 'خطأ في الخادم' });
});

const server = httpServer.listen(config.port, () => console.log(`✔ لمعة تعمل على http://localhost:${config.port}  (قاعدة البيانات: ${db.name})`));
const shutdown = async () => {
  live.close();
  server.close();
  await db.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
