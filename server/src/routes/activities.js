import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { wrap, clean, now, clampInt } from '../util.js';
import { validateContent, TYPES, countItems } from '../validate.js';

const DIFF = ['easy', 'medium', 'hard'];
const isOwner = (a, u) => !!u && (a.ownerId === u.id || u.role === 'admin');

export const summary = (a) => ({
  id: a.id, type: a.type, title: a.title, description: a.description, subject: a.subject, topic: a.topic,
  grade: a.grade, difficulty: a.difficulty, ownerId: a.ownerId, ownerName: a.ownerName,
  published: !!a.published, isPublic: !!a.isPublic, folder: a.folder || '', plays: a.plays || 0,
  items: countItems(a.type, a.content), color: a.settings?.color || '', createdAt: a.createdAt, updatedAt: a.updatedAt,
});

function normSettings(s = {}) {
  return {
    timeLimit: clampInt(s.timeLimit, 0, 7200, 0),
    maxAttempts: clampInt(s.maxAttempts, 0, 100, 0),
    shuffle: s.shuffle !== false,
    showFeedback: s.showFeedback !== false,
    sound: s.sound !== false,
    requireName: !!s.requireName,
    mode: s.mode === 'homework' ? 'homework' : 'practice',
    color: /^#[0-9a-fA-F]{6}$/.test(s.color || '') ? s.color : '',
  };
}

const metaFrom = (b) => ({
  title: clean(b.title, 120) || 'نشاط بدون عنوان',
  description: clean(b.description, 500),
  subject: clean(b.subject, 60),
  topic: clean(b.topic, 80),
  grade: clean(b.grade, 60),
  difficulty: DIFF.includes(b.difficulty) ? b.difficulty : 'medium',
  folder: clean(b.folder, 60),
  settings: normSettings(b.settings),
});

export default function activityRoutes(db, auth) {
  const r = Router();
  const teacher = auth.role('teacher', 'admin');

  // ---- قوائم ----
  r.get('/public', auth.optional, wrap(async (req, res) => {
    const q = clean(req.query.q || '', 80).toLowerCase();
    const type = clean(req.query.type || '', 30);
    const subject = clean(req.query.subject || '', 60).toLowerCase();
    let list = (await db.find('activities', { published: true, isPublic: true })).filter(
      (a) =>
        (!type || a.type === type) &&
        (!subject || (a.subject || '').toLowerCase().includes(subject)) &&
        (!q || [a.title, a.description, a.subject, a.topic, a.ownerName].join(' ').toLowerCase().includes(q)),
    );
    list.sort((a, b) => (req.query.sort === 'popular' ? (b.plays || 0) - (a.plays || 0) : b.updatedAt.localeCompare(a.updatedAt)));
    res.json(list.slice(0, 120).map(summary));
  }));

  r.get('/mine', auth.required, teacher, wrap(async (req, res) => {
    const list = await db.find('activities', { ownerId: req.user.id });
    list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    res.json(list.map(summary));
  }));

  r.get('/favorites', auth.required, wrap(async (req, res) => {
    const out = [];
    for (const id of req.user.favorites || []) {
      const a = await db.findOne('activities', { id });
      if (a && (a.published || isOwner(a, req.user))) out.push(summary(a));
    }
    res.json(out);
  }));

  // ---- نشاط واحد ----
  r.get('/:id', auth.optional, wrap(async (req, res) => {
    const a = await db.findOne('activities', { id: req.params.id });
    if (!a || (!a.published && !isOwner(a, req.user))) return res.status(404).json({ error: 'النشاط غير موجود أو غير منشور' });
    res.json({ ...a, canEdit: isOwner(a, req.user) });
  }));

  r.post('/', auth.required, teacher, wrap(async (req, res) => {
    const b = req.body || {};
    if (!TYPES.includes(b.type)) return res.status(400).json({ error: 'نوع القالب غير معروف' });
    const published = !!b.published;
    const err = validateContent(b.type, b.content, published);
    if (err) return res.status(published ? 422 : 400).json({ error: err });
    const a = await db.insert('activities', {
      ...metaFrom(b), type: b.type, content: b.content,
      ownerId: req.user.id, ownerName: req.user.name,
      published, isPublic: published && !!b.isPublic, plays: 0, createdAt: now(), updatedAt: now(),
    });
    res.status(201).json(a);
  }));

  r.put('/:id', auth.required, wrap(async (req, res) => {
    const a = await db.findOne('activities', { id: req.params.id });
    if (!a || !isOwner(a, req.user)) return res.status(404).json({ error: 'النشاط غير موجود' });
    const b = req.body || {};
    // تغيير نوع القالب مسموح بشرط إرسال محتوى مناسب للنوع الجديد
    const type = b.type !== undefined && TYPES.includes(b.type) ? b.type : a.type;
    if (type !== a.type && b.content === undefined) return res.status(400).json({ error: 'تغيير القالب يتطلب إرسال المحتوى الجديد' });
    const content = b.content !== undefined ? b.content : a.content;
    const published = b.published !== undefined ? !!b.published : a.published;
    const err = validateContent(type, content, published);
    if (err) return res.status(published ? 422 : 400).json({ error: err });
    const isPublic = published && (b.isPublic !== undefined ? !!b.isPublic : a.isPublic);
    const merged = metaFrom({ ...a, ...b, settings: { ...a.settings, ...(b.settings || {}) } });
    res.json(await db.update('activities', a.id, { ...merged, type, content, published, isPublic, updatedAt: now() }));
  }));

  r.delete('/:id', auth.required, wrap(async (req, res) => {
    const a = await db.findOne('activities', { id: req.params.id });
    if (!a || !isOwner(a, req.user)) return res.status(404).json({ error: 'النشاط غير موجود' });
    await db.remove('activities', a.id);
    await db.removeWhere('results', { activityId: a.id });
    await db.removeWhere('votes', { activityId: a.id });
    res.json({ ok: true });
  }));

  r.post('/:id/duplicate', auth.required, teacher, wrap(async (req, res) => {
    const a = await db.findOne('activities', { id: req.params.id });
    if (!a || !(isOwner(a, req.user) || (a.published && a.isPublic))) return res.status(404).json({ error: 'النشاط غير موجود' });
    const copy = await db.insert('activities', {
      ...structuredClone({ ...a, id: undefined }),
      title: `${a.title} (نسخة)`, ownerId: req.user.id, ownerName: req.user.name,
      published: false, isPublic: false, plays: 0, createdAt: now(), updatedAt: now(),
    });
    res.status(201).json(copy);
  }));

  r.post('/:id/favorite', auth.required, wrap(async (req, res) => {
    const a = await db.findOne('activities', { id: req.params.id });
    if (!a || (!a.published && !isOwner(a, req.user))) return res.status(404).json({ error: 'النشاط غير موجود' });
    const favs = new Set(req.user.favorites || []);
    favs.has(a.id) ? favs.delete(a.id) : favs.add(a.id);
    const u = await db.update('users', req.user.id, { favorites: [...favs] });
    res.json({ favorites: u.favorites, favorite: favs.has(a.id) });
  }));

  // ---- نتائج النشاط (للمعلم صاحب النشاط) ----
  const ownedActivity = async (req, res) => {
    const a = await db.findOne('activities', { id: req.params.id });
    if (!a || !isOwner(a, req.user)) {
      res.status(404).json({ error: 'النشاط غير موجود' });
      return null;
    }
    return a;
  };

  r.get('/:id/results', auth.required, wrap(async (req, res) => {
    const a = await ownedActivity(req, res);
    if (!a) return;
    const list = await db.find('results', { activityId: a.id });
    list.sort((x, y) => y.createdAt.localeCompare(x.createdAt));
    res.json({ activity: summary(a), results: list });
  }));

  r.get('/:id/results.csv', auth.required, wrap(async (req, res) => {
    const a = await ownedActivity(req, res);
    if (!a) return;
    const list = await db.find('results', { activityId: a.id });
    list.sort((x, y) => y.createdAt.localeCompare(x.createdAt));
    // حماية من حقن الصيغ في Excel: أي خلية تبدأ بـ = + - @ تُسبق بفاصلة عليا
    const cell = (v) => {
      let t = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
      return `"${t.replace(/"/g, '""')}"`;
    };
    const rows = [['الاسم', 'الدرجة', 'الإجمالي', 'النسبة %', 'الزمن (ثانية)', 'التاريخ']];
    for (const x of list) rows.push([x.studentName, x.score, x.total, x.percent, x.durationSec, x.createdAt]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="results.csv"');
    res.send('\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n'));
  }));

  // عدد محاولات الطالب (للأنشطة المحدودة المحاولات)
  r.get('/:id/attempts', auth.optional, wrap(async (req, res) => {
    const a = await db.findOne('activities', { id: req.params.id });
    if (!a || !a.published) return res.status(404).json({ error: 'النشاط غير موجود' });
    const name = clean(req.query.name || '', 80).toLowerCase();
    const list = await db.find('results', { activityId: a.id });
    const used = list.filter((x) => (req.user ? x.userId === req.user.id : !x.userId && x.studentName.toLowerCase() === name)).length;
    res.json({ used, max: a.settings?.maxAttempts || 0 });
  }));

  // ---- التصويت الفوري (قوالب الاستطلاع) ----
  const tally = async (activityId) => {
    const out = {};
    for (const v of await db.find('votes', { activityId })) ((out[v.q] ||= {})[v.choice] = (out[v.q][v.choice] || 0) + 1);
    return out;
  };
  const voteLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false, message: { error: 'محاولات كثيرة، حاول بعد قليل' } });

  r.get('/:id/votes', wrap(async (req, res) => {
    const a = await db.findOne('activities', { id: req.params.id });
    if (!a || !a.published) return res.status(404).json({ error: 'النشاط غير موجود' });
    res.json(await tally(a.id));
  }));

  r.post('/:id/vote', voteLimiter, wrap(async (req, res) => {
    const a = await db.findOne('activities', { id: req.params.id });
    if (!a || !a.published || !['poll', 'wyr'].includes(a.type)) return res.status(404).json({ error: 'النشاط غير موجود' });
    const q = clampInt(req.body?.q, 0, 200, -1);
    const choice = clampInt(req.body?.choice, 0, 20, -1);
    const clientId = clean(req.body?.clientId, 64);
    const list = a.type === 'wyr' ? a.content.items : a.content.questions;
    const opts = a.type === 'wyr' ? 2 : list?.[q]?.options?.length;
    if (!clientId || q < 0 || !list?.[q] || choice < 0 || choice >= opts) return res.status(400).json({ error: 'صوت غير صالح' });
    const old = (await db.find('votes', { activityId: a.id })).find((v) => v.clientId === clientId && v.q === q);
    if (old) await db.update('votes', old.id, { choice });
    else await db.insert('votes', { activityId: a.id, q, choice, clientId, createdAt: now() });
    res.json(await tally(a.id));
  }));

  return r;
}
