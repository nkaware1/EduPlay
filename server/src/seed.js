import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { now } from './util.js';
import { sampleActivities, sampleStudents } from './sampleData.js';
import { GRADED, countItems } from './validate.js';

const DEFAULT_SETTINGS = { timeLimit: 0, maxAttempts: 0, shuffle: true, showFeedback: true, sound: true, requireName: false, mode: 'practice', color: '' };

export async function seedIfEmpty(db) {
  if ((await db.count('users')) > 0) return;
  const hash = (p) => bcrypt.hash(p, 10);

  if (config.isProd && process.env.SEED_DEMO !== 'true') {
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      await db.insert('users', { name: 'مدير المنصة', email: process.env.ADMIN_EMAIL.toLowerCase(), passwordHash: await hash(process.env.ADMIN_PASSWORD), role: 'admin', school: '', favorites: [], createdAt: now() });
      console.log('✔ تم إنشاء حساب مدير المنصة');
    } else console.log('ℹ لا يوجد مستخدمون. اضبط ADMIN_EMAIL و ADMIN_PASSWORD لإنشاء مدير المنصة.');
    return;
  }

  const admin = await db.insert('users', { name: 'مدير المنصة', email: 'admin@demo.com', passwordHash: await hash('admin123'), role: 'admin', school: '', favorites: [], createdAt: now() });
  const teacher = await db.insert('users', { name: 'أ. منى الحربي', email: 'teacher@demo.com', passwordHash: await hash('teacher123'), role: 'teacher', school: 'مدرسة الأمل الابتدائية', favorites: [], createdAt: now() });
  const student = await db.insert('users', { name: 'ليلى أحمد', email: 'student@demo.com', passwordHash: await hash('student123'), role: 'student', school: '', favorites: [], createdAt: now() });

  const created = [];
  for (const [i, s] of sampleActivities.entries()) {
    const when = new Date(Date.now() - i * 3600e3 * 7).toISOString();
    const a = await db.insert('activities', {
      ...s, settings: { ...DEFAULT_SETTINGS, ...(s.type === 'asterquiz' ? { timeLimit: 0 } : {}) }, topic: '', folder: i < 5 ? 'الوحدة الأولى' : '',
      ownerId: teacher.id, ownerName: teacher.name, published: true, isPublic: true, plays: 0, createdAt: when, updatedAt: when,
    });
    created.push(a);
  }

  // نتائج تجريبية
  let n = 0;
  for (const a of created.filter((x) => GRADED.has(x.type)).slice(0, 8)) {
    const total = countItems(a.type, a.content);
    const k = 4 + (n++ % 4);
    for (let j = 0; j < k; j++) {
      const score = Math.max(0, total - ((j * 7 + n) % (Math.max(2, Math.ceil(total / 2)))));
      await db.insert('results', {
        activityId: a.id, activityTitle: a.title, userId: null, studentName: sampleStudents[(j + n) % sampleStudents.length],
        score, total, percent: Math.round((score / total) * 100), durationSec: 30 + ((j * 13 + n * 7) % 120),
        createdAt: new Date(Date.now() - (j + n) * 3600e3 * 5).toISOString(),
      });
    }
    await db.update('activities', a.id, { plays: k });
  }

  await db.insert('classes', {
    name: 'الصف الرابع (أ)', grade: 'الصف الرابع', code: 'DEMO42', ownerId: teacher.id, ownerName: teacher.name,
    students: [{ id: 's1', name: 'أحمد', userId: null }, { id: 's2', name: 'سارة', userId: null }, { id: 's3', name: student.name, userId: student.id }],
    activityIds: created.slice(0, 3).map((a) => a.id), createdAt: now(),
  });

  console.log('✔ تم إنشاء بيانات تجريبية — حسابات: admin@demo.com/admin123 ، teacher@demo.com/teacher123 ، student@demo.com/student123');
}
