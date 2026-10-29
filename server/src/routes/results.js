import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { wrap, clean, now, clampInt } from '../util.js';

export default function resultRoutes(db, auth) {
  const r = Router();
  const limiter = rateLimit({ windowMs: 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false, message: { error: 'محاولات كثيرة، حاول بعد قليل' } });

  r.post('/', limiter, auth.optional, wrap(async (req, res) => {
    const b = req.body || {};
    const a = await db.findOne('activities', { id: String(b.activityId || '') });
    if (!a || !a.published) return res.status(404).json({ error: 'النشاط غير موجود أو غير منشور' });

    const total = clampInt(b.total, 0, 1000, 0);
    if (!total) return res.status(400).json({ error: 'لا توجد درجة لحفظها' });
    const score = clampInt(b.score, 0, total, 0);
    const studentName = req.user ? req.user.name : clean(b.studentName, 80) || 'زائر';

    const max = a.settings?.maxAttempts || 0;
    if (max > 0) {
      const prior = await db.find('results', { activityId: a.id });
      const mine = prior.filter((x) => (req.user ? x.userId === req.user.id : !x.userId && x.studentName.toLowerCase() === studentName.toLowerCase())).length;
      if (mine >= max) return res.status(403).json({ error: 'استنفدت عدد المحاولات المسموح بها' });
    }

    const result = await db.insert('results', {
      activityId: a.id, activityTitle: a.title, userId: req.user?.id || null, studentName,
      score, total, percent: Math.round((score / total) * 100),
      durationSec: clampInt(b.durationSec, 0, 86400, 0), createdAt: now(),
    });
    await db.update('activities', a.id, { plays: (a.plays || 0) + 1 });
    res.status(201).json(result);
  }));

  // نتائج المستخدم المسجّل (الطالب)
  r.get('/mine', auth.required, wrap(async (req, res) => {
    const list = await db.find('results', { userId: req.user.id });
    list.sort((x, y) => y.createdAt.localeCompare(x.createdAt));
    res.json(list.slice(0, 200));
  }));

  return r;
}
