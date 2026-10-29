import { Router } from 'express';
import crypto from 'crypto';
import { wrap, clean, now } from '../util.js';
import { summary } from './activities.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const genCode = () => Array.from({ length: 6 }, () => CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]).join('');
const canManage = (c, u) => c.ownerId === u.id || u.role === 'admin';

export default function classRoutes(db, auth) {
  const r = Router();
  const teacher = auth.role('teacher', 'admin');

  const withActivities = async (c, user) => {
    const activities = [];
    for (const id of c.activityIds || []) {
      const a = await db.findOne('activities', { id });
      if (a && a.published) activities.push(summary(a));
    }
    return { ...c, activities };
  };

  // المعلم: صفوفه — الطالب: الصفوف التي انضم إليها
  r.get('/', auth.required, wrap(async (req, res) => {
    let list;
    if (req.user.role === 'student') {
      list = (await db.find('classes')).filter((c) => (c.students || []).some((s) => s.userId === req.user.id));
    } else {
      list = await db.find('classes', req.user.role === 'admin' ? {} : { ownerId: req.user.id });
    }
    const out = [];
    for (const c of list) out.push(await withActivities(c, req.user));
    res.json(out);
  }));

  r.post('/', auth.required, teacher, wrap(async (req, res) => {
    const name = clean(req.body?.name, 80);
    if (!name) return res.status(400).json({ error: 'اسم الصف مطلوب' });
    let code = genCode();
    while (await db.findOne('classes', { code })) code = genCode();
    const c = await db.insert('classes', {
      name, grade: clean(req.body?.grade, 60), code, ownerId: req.user.id, ownerName: req.user.name,
      students: [], activityIds: [], createdAt: now(),
    });
    res.status(201).json(await withActivities(c, req.user));
  }));

  r.put('/:id', auth.required, teacher, wrap(async (req, res) => {
    const c = await db.findOne('classes', { id: req.params.id });
    if (!c || !canManage(c, req.user)) return res.status(404).json({ error: 'الصف غير موجود' });
    const b = req.body || {};
    const patch = {};
    if (b.name !== undefined) patch.name = clean(b.name, 80) || c.name;
    if (b.grade !== undefined) patch.grade = clean(b.grade, 60);
    if (Array.isArray(b.students)) {
      patch.students = b.students.slice(0, 300).map((s) => {
        const old = (c.students || []).find((x) => x.id === s.id);
        return { id: old?.id || crypto.randomUUID(), name: clean(s.name, 80), userId: old?.userId || null };
      }).filter((s) => s.name);
    }
    if (Array.isArray(b.activityIds)) {
      const ids = [];
      for (const id of [...new Set(b.activityIds.map(String))].slice(0, 100)) {
        const a = await db.findOne('activities', { id });
        if (a && (a.ownerId === req.user.id || (a.published && a.isPublic) || req.user.role === 'admin')) ids.push(id);
      }
      patch.activityIds = ids;
    }
    res.json(await withActivities(await db.update('classes', c.id, patch), req.user));
  }));

  r.delete('/:id', auth.required, teacher, wrap(async (req, res) => {
    const c = await db.findOne('classes', { id: req.params.id });
    if (!c || !canManage(c, req.user)) return res.status(404).json({ error: 'الصف غير موجود' });
    await db.remove('classes', c.id);
    res.json({ ok: true });
  }));

  // انضمام الطالب بالرمز
  r.post('/join', auth.required, wrap(async (req, res) => {
    const code = clean(req.body?.code, 12).toUpperCase();
    const c = code && (await db.findOne('classes', { code }));
    if (!c) return res.status(404).json({ error: 'رمز الصف غير صحيح' });
    if (!(c.students || []).some((s) => s.userId === req.user.id)) {
      c.students = [...(c.students || []), { id: crypto.randomUUID(), name: req.user.name, userId: req.user.id }];
      await db.update('classes', c.id, { students: c.students });
    }
    res.json(await withActivities(c, req.user));
  }));

  // تقرير الصف: أفضل نسبة لكل طالب في كل نشاط مُسند
  r.get('/:id/report', auth.required, teacher, wrap(async (req, res) => {
    const c = await db.findOne('classes', { id: req.params.id });
    if (!c || !canManage(c, req.user)) return res.status(404).json({ error: 'الصف غير موجود' });
    const full = await withActivities(c, req.user);
    const matrix = {};
    for (const a of full.activities) {
      const results = await db.find('results', { activityId: a.id });
      for (const s of c.students || []) {
        const mine = results.filter((x) => (s.userId ? x.userId === s.userId : !x.userId && x.studentName.trim().toLowerCase() === s.name.toLowerCase()));
        (matrix[s.id] ||= {})[a.id] = mine.length ? Math.max(...mine.map((x) => x.percent)) : null;
      }
    }
    res.json({ students: c.students || [], activities: full.activities, matrix });
  }));

  return r;
}
