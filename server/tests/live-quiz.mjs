// اختبار بروتوكول اللعب المباشر: المسابقة المباشرة + الأمان + إعادة الاتصال
// التشغيل: شغّل الخادم على قاعدة بيانات جديدة (احذف server/data) ثم: BASE=http://localhost:4000 node tests/live-quiz.mjs
import { io } from 'socket.io-client';
const B = process.env.BASE || 'http://localhost:4000';
const api = async (m, u, b, tok) => { const r = await fetch(B + '/api' + u, { method: m, headers: { 'content-type': 'application/json', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: b ? JSON.stringify(b) : undefined }); return r.json(); };
const login = async (e, p) => (await api('POST', '/auth/login', { email: e, password: p })).token;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const conn = (token) => new Promise((res) => { const s = io(B, { auth: token ? { token } : {}, transports: ['websocket'] }); s.views = []; s.on('room:update', (v) => { s.last = v; s.views.push(v); }); s.on('room:closed', (d) => (s.closed = d)); s.on('connect', () => res(s)); });
const emit = (s, ev, p) => new Promise((res) => s.emit(ev, p, res));
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : (fail++, console.log('  ✗ FAIL:', m)); if (c) console.log('  ✓', m); };

const T = await login('teacher@demo.com', 'teacher123'), S = await login('student@demo.com', 'student123');
const mk = async (type, content, tok = T) => (await api('POST', '/activities', { type, title: 'live ' + type, content, published: true, isPublic: true }, tok));
const mcq = (q, o, a) => ({ question: q, options: o, answer: a, feedback: '', image: '' });
const quiz = await mk('quiz', { questions: [mcq('2+2؟', ['3', '4', '5', '6'], 1), mcq('3+3؟', ['5', '6', '7', '8'], 1), mcq('1+1؟', ['1', '2', '3', '4'], 1)] });

console.log('== أمان ==');
const stu = await conn(S), anon = await conn(null), host = await conn(T);
ok(!(await emit(stu, 'host:create', { activityId: quiz.id })).ok, 'الطالب لا يستطيع إنشاء جلسة');
ok(!(await emit(anon, 'host:create', { activityId: quiz.id })).ok, 'الزائر لا يستطيع إنشاء جلسة');
ok(!(await emit(host, 'host:create', { activityId: 'nope' })).ok, 'نشاط غير موجود مرفوض');
const draft = await api('POST', '/activities', { type: 'quiz', title: 'x', content: { questions: [] } }, T);
ok(!(await emit(host, 'host:create', { activityId: draft.id })).ok, 'نشاط غير مكتمل مرفوض');

const created = await emit(host, 'host:create', { activityId: quiz.id, mode: 'quiz', limit: 20 });
ok(created.ok && /^\d{6}$/.test(created.pin), `إنشاء جلسة برمز من 6 أرقام (${created.pin})`);
const pin = created.pin;
ok(!(await emit(anon, 'host:start', {})).ok && !(await emit(stu, 'host:next', {})).ok, 'غير المعلم لا يستطيع التحكم');
const peek = await (await fetch(`${B}/api/live/peek/${pin}`)).json();
ok(peek.ok && peek.title === 'live quiz', 'معاينة الرمز تعيد العنوان');
ok(!(await emit(anon, 'player:join', { pin: '000000', name: 'x' })).ok, 'رمز خاطئ مرفوض');

console.log('== انضمام ==');
const p = [await conn(), await conn(), await conn()];
const j = await Promise.all(p.map((s, i) => emit(s, 'player:join', { pin, name: i === 1 ? 'سارة' : i === 2 ? 'سارة' : 'أحمد' })));
ok(j.every((x) => x.ok), 'ثلاثة لاعبين انضموا');
ok([j[1].name, j[2].name].includes('سارة 2'), `الاسم المكرر يُعدَّل تلقائيًا (${j[1].name} / ${j[2].name})`);
ok(!(await emit(await conn(), 'player:join', { pin, name: '<b>' + 'x'.repeat(40) + '</b>' })).ok === false, 'اسم طويل/ملغَّم يُقبل بعد التنظيف');
await sleep(300);
ok(host.last.playerCount === 4 && host.last.phase === 'lobby', 'المعلم يرى اللاعبين في اللوبي');
ok(!JSON.stringify(p[0].last).includes('"answer"'), 'لقطة اللاعب في اللوبي بلا إجابات');
ok(!host.last.players.some((x) => /[<>]/.test(x.name)) && host.last.players.every((x) => x.name.length <= 24), 'الأسماء منظَّفة ومقصوصة');

console.log('== اختبار مباشر ==');
ok((await emit(host, 'host:start', {})).ok, 'بدء اللعبة');
await sleep(300);
ok(p[0].last.phase === 'question' && p[0].last.question.text === '2+2؟', 'اللاعبون يتلقون السؤال الأول');
ok(!JSON.stringify(p[0].last).includes('"answer"'), 'اللاعب لا يتلقى الإجابة الصحيحة أثناء السؤال (لا تسريب)');
ok(host.last.question.answer === 1, 'المعلم يرى الإجابة الصحيحة');
const a0 = await emit(p[0], 'player:answer', { q: 0, choice: 1 });          // صحيح وسريع
await sleep(1200);
const a1 = await emit(p[1], 'player:answer', { q: 0, choice: 1 });          // صحيح وأبطأ
const a1b = await emit(p[1], 'player:answer', { q: 0, choice: 2 });
ok(a0.ok && a1.ok, 'إجابتان صحيحتان');
ok(!a1b.ok, 'لا يمكن الإجابة مرتين');
ok(!(await emit(p[2], 'player:answer', { q: 5, choice: 1 })).ok, 'رقم سؤال خاطئ مرفوض');
ok(!(await emit(p[2], 'player:answer', { q: 0, choice: 99 })).ok, 'خيار خارج النطاق مرفوض');
await emit(p[2], 'player:answer', { q: 0, choice: 0 });                       // خاطئ
await sleep(300);
const extra = (await Promise.all([0]).then(() => null));
ok(host.last.phase === 'question' || host.last.phase === 'reveal', 'الحالة بعد الإجابات');
// اللاعب الرابع (من تجربة الاسم الملغّم) لم يجب: ننهي السؤال من المعلم
await emit(host, 'host:next', {});
await sleep(300);
ok(p[0].last.phase === 'reveal' && p[0].last.reveal.answer === 1, 'الكشف: الإجابة الصحيحة تظهر الآن');
ok(p[0].last.reveal.correct === true && p[0].last.reveal.gained > 0, `اللاعب 1 حصل على نقاط (${p[0].last.reveal.gained})`);
ok(p[1].last.reveal.gained < p[0].last.reveal.gained, `الأسرع أعلى نقاطًا (${p[0].last.reveal.gained} > ${p[1].last.reveal.gained})`);
ok(p[2].last.reveal.correct === false && p[2].last.reveal.gained === 0, 'الإجابة الخاطئة بلا نقاط');
ok(host.last.counts.join() === '1,2,1,0' || host.last.counts[1] === 2, `توزيع الإجابات للمعلم (${host.last.counts})`);
ok(!(await emit(p[1], 'player:answer', { q: 0, choice: 1 })).ok, 'لا إجابة بعد انتهاء السؤال');
// السؤالان الباقيان: الكل يجيب فتنتهي الأسئلة مبكرًا (اللاعب الرابع غير متصل؟ متصل ولم يجب)
for (const qi of [1, 2]) {
  await emit(host, 'host:next', {}); await sleep(200);
  for (const s of p) await emit(s, 'player:answer', { q: qi, choice: 1 });
  await emit(host, 'host:next', {}); await sleep(200);
}
await emit(host, 'host:next', {}); await sleep(500);
ok(host.last.phase === 'final' && p[0].last.phase === 'final', 'نهاية اللعبة');
ok(host.last.leaderboard[0].name === 'أحمد' || host.last.leaderboard[0].score >= host.last.leaderboard[1].score, `لوحة الصدارة مرتبة (${host.last.leaderboard.map((x) => x.name + ':' + x.score).join(', ')})`);
const res = await api('GET', `/activities/${quiz.id}/results`, null, T);
ok(res.results.filter((r) => r.studentName).length >= 3, `النتائج حُفظت للمعلم (${res.results.length} سجل)`);

console.log('== إعادة اتصال ==');
const pid = j[0].playerId; p[0].disconnect(); await sleep(300);
ok(host.last.players.find((x) => x.id === pid).connected === false, 'المعلم يرى انقطاع اللاعب');
const p0b = await conn(); const rj = await emit(p0b, 'player:join', { pin, playerId: pid, name: 'x' });
ok(rj.ok && rj.playerId === pid, 'إعادة انضمام بنفس الهوية');
await sleep(300); ok(p0b.last?.you?.name === 'أحمد', 'اللاعب يستعيد حالته واسمه');
console.log('== طرد وإغلاق ==');
await emit(host, 'host:kick', { playerId: j[2].playerId }); await sleep(300);
ok(p[2].closed?.reason === 'kicked', 'اللاعب المطرود يتلقى إشعار الطرد');
await emit(host, 'host:end', {}); await sleep(300);
ok(p0b.closed?.reason === 'ended', 'إنهاء الجلسة يُعلم اللاعبين');
ok(!(await (await fetch(`${B}/api/live/peek/${pin}`)).json()).ok, 'الرمز لا يعمل بعد الإنهاء');
console.log(`\nالنتيجة: ${pass} نجح، ${fail} فشل`);
[stu, anon, host, p0b, ...p].forEach((s) => s.close()); process.exit(fail ? 1 : 0);
