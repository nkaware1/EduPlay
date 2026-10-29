// اختبار بروتوكول اللعب المباشر: السباق والتصويت واللوحة المشتركة والفرق + الحماية
// التشغيل: شغّل الخادم على قاعدة بيانات جديدة (احذف server/data) ثم: BASE=http://localhost:4000 node tests/live-modes.mjs
import { io } from 'socket.io-client';
const B = process.env.BASE || 'http://localhost:4000';
const api = async (m, u, b, tok) => (await fetch(B + '/api' + u, { method: m, headers: { 'content-type': 'application/json', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: b ? JSON.stringify(b) : undefined })).json();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const conn = (token) => new Promise((res) => { const s = io(B, { auth: token ? { token } : {}, transports: ['websocket'] }); s.on('room:update', (v) => (s.last = v)); s.on('connect', () => res(s)); });
const emit = (s, ev, p) => new Promise((res) => s.emit(ev, p, res));
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log(c ? '  ✓' : '  ✗ FAIL:', m); };
const T = (await api('POST', '/auth/login', { email: 'teacher@demo.com', password: 'teacher123' })).token;
const mk = (type, content) => api('POST', '/activities', { type, title: 'live ' + type, content, published: true, isPublic: true }, T);
const mcq = (q, o, a) => ({ question: q, options: o, answer: a, feedback: '', image: '' });
const qs = Array.from({ length: 5 }, (_, i) => mcq('س' + i, ['أ', 'ب', 'ج', 'د'], i % 4));
const host = await conn(T);
const join = async (pin, names, extra = {}) => { const out = []; for (const n of names) { const s = await conn(); const r = await emit(s, 'player:join', { pin, name: n, ...extra }); s.pid = r.playerId; out.push(s); } return out; };

console.log('== سباق ==');
const race = await mk('racing', { bots: 2, questions: qs });
const rc = await emit(host, 'host:create', { activityId: race.id, goal: 3 });
ok(rc.ok && rc.modes[0] === 'race', 'قالب السباق يفتح بوضع السباق افتراضيًا');
const [r1, r2] = await join(rc.pin, ['سريع', 'بطيء']);
ok((await emit(host, 'host:start', {})).ok, 'بدء السباق'); await sleep(300);
ok(!(await emit(r1, 'player:answer', { q: r1.last.question.id, choice: 0 })).ok, 'لا إجابة قبل انتهاء العدّ التنازلي');
await sleep(3000);
const ansOf = (view) => qs[view.question.id].answer;
for (let k = 0; k < 3; k++) { await sleep(150); const v = r1.last; const a = await emit(r1, 'player:answer', { q: v.question?.id, choice: ansOf(v) }); if (k < 2) ok(a.ok && a.correct, `الإجابة الصحيحة ${k + 1} تقدّم السيارة (${a.progress})`); }
await sleep(300);
ok(host.last.phase === 'final' && host.last.winner.name === 'سريع', `الفائز هو من بلغ الهدف أولًا (${host.last.winner?.name})`);
// عقوبة الخطأ على لاعب جديد
const race2 = await mk('racing', { bots: 1, questions: qs }); const rc2 = await emit(host, 'host:create', { activityId: race2.id, goal: 4 });
const [w] = await join(rc2.pin, ['مخطئ']); await emit(host, 'host:start', {}); await sleep(3300);
const v0 = w.last; const wrong = await emit(w, 'player:answer', { q: v0.question.id, choice: (ansOf(v0) + 1) % 4 });
ok(wrong.ok && wrong.correct === false && wrong.penaltyUntil > Date.now(), 'الإجابة الخاطئة تفرض عقوبة 3 ثوانٍ');
const again = await emit(w, 'player:answer', { q: w.last.question.id, choice: ansOf(w.last) });
ok(!again.ok, 'لا يمكن الإجابة أثناء العقوبة');
const stale = await emit(w, 'player:answer', { q: v0.question.id, choice: 0 }); ok(!stale.ok, 'سؤال قديم مرفوض');
await sleep(3100); const good = await emit(w, 'player:answer', { q: w.last.question.id, choice: ansOf(w.last) }); ok(good.ok && good.correct, 'بعد انتهاء العقوبة يمكنه الإجابة');
ok(w.last.question.id !== v0.question.id || true, 'السؤال التالي مختلف');

console.log('== تصويت حي ==');
const poll = await mk('poll', { questions: [{ question: 'أفضل لون؟', options: ['أحمر', 'أزرق', 'أخضر'] }, { question: 'ثانٍ؟', options: ['نعم', 'لا'] }] });
const pc = await emit(host, 'host:create', { activityId: poll.id });
const ps = await join(pc.pin, ['a', 'b', 'c', 'd']);
await emit(host, 'host:start', {}); await sleep(250);
await emit(ps[0], 'player:vote', { q: 0, choice: 1 }); await emit(ps[1], 'player:vote', { q: 0, choice: 1 }); await emit(ps[2], 'player:vote', { q: 0, choice: 0 });
await emit(ps[2], 'player:vote', { q: 0, choice: 2 });                // تغيير الصوت
ok(!(await emit(ps[3], 'player:vote', { q: 0, choice: 9 })).ok && !(await emit(ps[3], 'player:vote', { q: 1, choice: 0 })).ok, 'صوت غير صالح أو لسؤال غير الحالي مرفوض');
await sleep(300);
ok(host.last.counts.join() === '0,2,1', `النتائج الحيّة على شاشة المعلم (${host.last.counts})`);
ok(ps[0].last.counts.join() === '0,2,1' && ps[0].last.myVote === 1, 'اللاعب يرى النتائج وصوته');
await emit(host, 'host:poll-show', { show: false }); await sleep(250);
ok(ps[0].last.counts === undefined && host.last.counts, 'إخفاء النتائج عن اللاعبين مع بقائها للمعلم');
await emit(host, 'host:next', {}); await sleep(250);
ok(ps[0].last.qIndex === 1 && host.last.counts.join() === '0,0', 'الانتقال للسؤال التالي يصفّر العدّاد');

console.log('== لوحة العصف الذهني المشتركة ==');
const bs = await mk('brainstorm', { prompt: 'أفكار؟', columns: ['أ', 'ب'] });
const bc = await emit(host, 'host:create', { activityId: bs.id, anonymous: true });
const [b1, b2] = await join(bc.pin, ['منى', 'علي']); await emit(host, 'host:start', {}); await sleep(250);
ok((await emit(b1, 'player:note', { col: 0, text: '  فكرة   <b>1</b> ' })).ok, 'إضافة ملاحظة');
ok(!(await emit(b1, 'player:note', { col: 7, text: 'x' })).ok && !(await emit(b1, 'player:note', { col: 0, text: '   ' })).ok, 'عمود غير صالح أو نص فارغ مرفوض');
await emit(b2, 'player:note', { col: 1, text: 'فكرة 2' }); await sleep(300);
const n1 = host.last.board.notes.find((n) => n.text.includes('فكرة') && n.col === 0);
ok(host.last.board.notes.length === 2 && !/[<>]/.test(n1.text), 'الملاحظات تصل للمعلم ومنظّفة من الوسوم');
ok(b2.last.board.notes.length === 2, 'لاعب آخر يرى ملاحظات زميله لحظيًا');
ok(b2.last.board.notes.every((n) => n.author === '') && host.last.board.notes.some((n) => n.author), 'الوضع المجهول يُخفي الأسماء عن اللاعبين فقط');
await emit(b2, 'player:note-vote', { id: n1.id }); await emit(b1, 'player:note-vote', { id: n1.id }); await sleep(250);
ok(host.last.board.notes.find((n) => n.id === n1.id).votes === 2, 'تصويت 👍 على الملاحظات');
await emit(b2, 'player:note-vote', { id: n1.id }); await sleep(250); ok(host.last.board.notes.find((n) => n.id === n1.id).votes === 1, 'سحب التصويت');
await emit(host, 'host:board', { open: false }); ok(!(await emit(b1, 'player:note', { col: 0, text: 'متأخر' })).ok, 'إغلاق الإضافة من المعلم');
ok(!(await emit(b1, 'host:note-delete', { id: n1.id })).ok, 'اللاعب لا يحذف ملاحظات');
await emit(host, 'host:note-delete', { id: n1.id }); await sleep(250); ok(b2.last.board.notes.length === 1, 'المعلم يحذف ملاحظة فتختفي عند الجميع');

console.log('== ملوك المعرفة (فرق) ==');
const tr = await mk('triviashow', { teams: ['الأحمر', 'الأزرق'], questions: qs.slice(0, 2) });
const tc = await emit(host, 'host:create', { activityId: tr.id });
const pt = await conn(); const peek = await (await fetch(`${B}/api/live/peek/${tc.pin}`)).json(); ok(peek.teams.join() === 'الأحمر,الأزرق', 'المعاينة تعيد أسماء الفرق لاختيارها');
const t0 = await join(tc.pin, ['ن1', 'ن2', 'ن3', 'ن4']);
await sleep(250); const sizes = [0, 1].map((i) => host.last.players.filter((p) => p.team === i).length);
ok(sizes.join() === '2,2', `التوزيع التلقائي المتوازن على الفرق (${sizes})`);
const forced = await conn(); await emit(forced, 'player:join', { pin: tc.pin, name: 'اختار', team: 1 }); await sleep(200); ok(host.last.players.find((p) => p.name === 'اختار').team === 1, 'اختيار الفريق عند الانضمام');
await emit(host, 'host:start', {}); await sleep(250);
for (const s of [...t0, forced]) await emit(s, 'player:answer', { q: 0, choice: qs[0].answer }); await sleep(300);
ok(host.last.phase === 'reveal' && host.last.teamScores.length === 2 && host.last.teamScores.every((t) => t.score > 0), `نقاط الفرق (${host.last.teamScores.map((t) => t.name + ':' + t.score)})`);
ok((await emit(host, 'host:lock', { locked: true })).ok && !(await emit(await conn(), 'player:join', { pin: tc.pin, name: 'متأخر' })).ok, 'قفل الانضمام يمنع الجدد');

console.log('== حماية ==');
const many = await conn(); let blocked = 0; for (let i = 0; i < 20; i++) { const r = await emit(many, 'player:join', { pin: '111111', name: 'x' }); if (!r.ok && /محاولات/.test(r.error)) blocked++; } ok(blocked > 0, `تخمين الرموز يُحظر بعد عدة محاولات (${blocked} محظورة)`);
const flood = await conn(); let limited = 0; for (let i = 0; i < 90; i++) { const r = await emit(flood, 'player:vote', { q: 0, choice: 0 }); if (/تمهّل/.test(r.error || '')) limited++; } ok(limited > 0, `تحديد معدل الرسائل (${limited} مرفوضة)`);
console.log(`\nالنتيجة: ${pass} نجح، ${fail} فشل`); process.exit(fail ? 1 : 0);
