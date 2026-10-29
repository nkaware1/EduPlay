import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { signToken, publicUser } from '../auth.js';
import { wrap, clean, isEmail, now } from '../util.js';

export default function authRoutes(db, auth) {
  const r = Router();

  r.post('/register', wrap(async (req, res) => {
    const { name, email, password, role } = req.body || {};
    if (!clean(name, 80) || !isEmail(email) || typeof password !== 'string' || password.length < 6 || password.length > 100)
      return res.status(400).json({ error: 'تحقق من الاسم والبريد الإلكتروني وكلمة المرور (6 أحرف على الأقل)' });
    const em = email.trim().toLowerCase();
    if (await db.findOne('users', { email: em })) return res.status(409).json({ error: 'هذا البريد مسجّل مسبقًا' });
    const user = await db.insert('users', {
      name: clean(name, 80),
      email: em,
      passwordHash: await bcrypt.hash(password, 10),
      role: role === 'student' ? 'student' : 'teacher', // لا يمكن إنشاء مدير من التسجيل العام
      school: '',
      favorites: [],
      createdAt: now(),
    });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  }));

  r.post('/login', wrap(async (req, res) => {
    const { email, password } = req.body || {};
    const user = isEmail(email) ? await db.findOne('users', { email: email.trim().toLowerCase() }) : null;
    if (!user || typeof password !== 'string' || !(await bcrypt.compare(password, user.passwordHash)))
      return res.status(401).json({ error: 'البريد أو كلمة المرور غير صحيحة' });
    res.json({ token: signToken(user), user: publicUser(user) });
  }));

  r.get('/me', auth.required, (req, res) => res.json({ user: publicUser(req.user) }));

  r.put('/me', auth.required, wrap(async (req, res) => {
    const { name, school, currentPassword, newPassword } = req.body || {};
    const patch = {};
    if (name !== undefined) {
      if (!clean(name, 80)) return res.status(400).json({ error: 'الاسم مطلوب' });
      patch.name = clean(name, 80);
    }
    if (school !== undefined) patch.school = clean(school, 120);
    if (newPassword) {
      if (typeof newPassword !== 'string' || newPassword.length < 6)
        return res.status(400).json({ error: 'كلمة المرور الجديدة قصيرة (6 أحرف على الأقل)' });
      if (typeof currentPassword !== 'string' || !(await bcrypt.compare(currentPassword, req.user.passwordHash)))
        return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
      patch.passwordHash = await bcrypt.hash(newPassword, 10);
    }
    const user = await db.update('users', req.user.id, patch);
    res.json({ user: publicUser(user) });
  }));

  return r;
}
