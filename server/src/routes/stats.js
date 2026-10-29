import { Router } from 'express';
import { wrap } from '../util.js';

export default function statsRoutes(db, auth) {
  const r = Router();

  r.get('/public', wrap(async (_req, res) => {
    const list = await db.find('activities', { published: true, isPublic: true });
    res.json({ activities: list.length, plays: list.reduce((n, a) => n + (a.plays || 0), 0) });
  }));

  r.get('/me', auth.required, wrap(async (req, res) => {
    if (req.user.role === 'student') {
      const results = await db.find('results', { userId: req.user.id });
      const avg = results.length ? Math.round(results.reduce((n, x) => n + x.percent, 0) / results.length) : 0;
      return res.json({ role: 'student', attempts: results.length, avgPercent: avg });
    }
    const acts = await db.find('activities', { ownerId: req.user.id });
    let attempts = 0, sum = 0;
    const students = new Set();
    for (const a of acts) {
      for (const x of await db.find('results', { activityId: a.id })) {
        attempts++; sum += x.percent; students.add(x.userId || x.studentName.toLowerCase());
      }
    }
    res.json({
      role: req.user.role, activities: acts.length, published: acts.filter((a) => a.published).length,
      attempts, students: students.size, avgPercent: attempts ? Math.round(sum / attempts) : 0,
      classes: await db.count('classes', { ownerId: req.user.id }),
    });
  }));
  return r;
}
