import { Router } from 'express';
import { wrap } from '../util.js';
import { publicUser } from '../auth.js';
import { summary } from './activities.js';

export default function adminRoutes(db, auth) {
  const r = Router();
  r.use(auth.required, auth.role('admin'));

  r.get('/stats', wrap(async (_req, res) => {
    const [users, activities, results, classes] = await Promise.all(['users', 'activities', 'results', 'classes'].map((c) => db.count(c)));
    const published = await db.count('activities', { published: true });
    res.json({ users, activities, published, results, classes, driver: db.name });
  }));

  r.get('/users', wrap(async (_req, res) => {
    const list = await db.find('users');
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json(list.map(publicUser));
  }));

  r.put('/users/:id', wrap(async (req, res) => {
    const role = req.body?.role;
    if (!['teacher', 'student', 'admin'].includes(role)) return res.status(400).json({ error: 'دور غير صالح' });
    if (req.params.id === req.user.id && role !== 'admin') return res.status(400).json({ error: 'لا يمكنك تغيير دور حسابك' });
    const u = await db.update('users', req.params.id, { role });
    u ? res.json(publicUser(u)) : res.status(404).json({ error: 'المستخدم غير موجود' });
  }));

  r.delete('/users/:id', wrap(async (req, res) => {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'لا يمكنك حذف حسابك' });
    const acts = await db.find('activities', { ownerId: req.params.id });
    for (const a of acts) await db.removeWhere('results', { activityId: a.id });
    await db.removeWhere('activities', { ownerId: req.params.id });
    await db.removeWhere('classes', { ownerId: req.params.id });
    const ok = await db.remove('users', req.params.id);
    ok ? res.json({ ok: true }) : res.status(404).json({ error: 'المستخدم غير موجود' });
  }));

  r.get('/activities', wrap(async (_req, res) => {
    const list = await db.find('activities');
    list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    res.json(list.map(summary));
  }));

  return r;
}
