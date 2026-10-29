// اللعب الجماعي المباشر: غرف برمز PIN عبر Socket.IO.
// كل المنطق (الدرجات، المؤقتات، التحقق من الإجابات) على الخادم؛ العملاء لا يرون الإجابة الصحيحة قبل الكشف.
import { Server } from 'socket.io';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { clean, clampInt, now as iso } from '../util.js';
import { LIVE_MODES, liveContent } from './content.js';

const MAX_PLAYERS = 300;
const IDLE_MS = 3 * 3600e3;
const HOST_GONE_MS = 20 * 60e3;
const PENALTY_MS = 3000;
const COUNTDOWN_MS = 3000;

const cleanName = (s) => clean(String(s ?? ''), 24).replace(/[\u0000-\u001f<>]/g, '').trim();
const cleanText = (s, n) => clean(String(s ?? ''), n).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim();
const shuffle = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [r[i], r[j]] = [r[j], r[i]]; } return r; };

export function attachLive(httpServer, db) {
  const io = new Server(httpServer, {
    maxHttpBufferSize: 1e5, pingInterval: 10000, pingTimeout: 8000,
    cors: config.isProd ? undefined : { origin: config.clientOrigin },
  });
  const rooms = new Map();
  const badPins = new Map(); // ip -> {n, t}

  /* ---------- أدوات ---------- */
  const hit = (socket, cost = 1) => {
    const d = socket.data, t = Date.now();
    if (!d.win || t - d.win > 5000) { d.win = t; d.n = 0; }
    d.n += cost;
    return d.n <= 60;
  };
  const pinBlocked = (ip) => { const e = badPins.get(ip); return !!e && Date.now() - e.t < 60_000 && e.n >= 15; };
  const pinFailed = (ip) => { const e = badPins.get(ip); if (!e || Date.now() - e.t > 60_000) badPins.set(ip, { n: 1, t: Date.now() }); else e.n++; };
  const genPin = () => { for (let k = 0; k < 50; k++) { const p = String(crypto.randomInt(100000, 1000000)); if (!rooms.has(p)) return p; } return null; };

  const rankOf = (room) => [...room.players.values()].sort((a, b) => b.score - a.score || b.correct - a.correct || a.joinedAt - b.joinedAt);
  const teamScores = (room) => room.teams.map((name, i) => {
    const ms = [...room.players.values()].filter((p) => p.team === i);
    return { name, score: ms.reduce((n, p) => n + p.score, 0), members: ms.length };
  });
  const countsFor = (room, qi) => {
    const q = room.questions[qi];
    const counts = q.options.map(() => 0);
    for (const p of room.players.values()) { const a = p.answers[qi]; if (a) counts[a.choice]++; }
    return counts;
  };
  const answeredCount = (room) => [...room.players.values()].filter((p) => p.answers[room.qIndex]).length;
  const connectedCount = (room) => [...room.players.values()].filter((p) => p.connected).length;

  const raceQuestion = (room, p) => {
    const qi = p.seq[p.qPos % p.seq.length];
    const q = room.questions[qi];
    return { id: qi, text: q.text, options: q.options, image: q.image };
  };
  const standings = (room, n) => [...room.players.values()]
    .sort((a, b) => b.progress - a.progress || (a.finishedAt || Infinity) - (b.finishedAt || Infinity) || b.correct - a.correct || a.joinedAt - b.joinedAt)
    .slice(0, n).map((p) => ({ id: p.id, name: p.name, progress: p.progress, finished: !!p.finishedAt }));

  /* ---------- لقطات الحالة (لكل دور) ---------- */
  function baseView(room) {
    return {
      pin: room.pin, mode: room.mode, type: room.type, title: room.title, phase: room.phase, now: Date.now(),
      playerCount: room.players.size, teams: room.teams, locked: room.locked, hostOnline: room.hostOnline, settings: room.settings,
    };
  }
  function hostView(room) {
    const v = { ...baseView(room), role: 'host' };
    const ps = [...room.players.values()];
    v.players = ps.map((p) => ({ id: p.id, name: p.name, team: p.team, score: p.score, connected: p.connected, progress: p.progress, answered: !!p.answers[room.qIndex] }));
    if (room.mode === 'quiz') {
      v.total = room.questions.length; v.qIndex = room.qIndex;
      if (room.phase === 'question' || room.phase === 'reveal') {
        const q = room.questions[room.qIndex];
        v.question = { index: room.qIndex, text: q.text, options: q.options, image: q.image, answer: q.answer };
        v.qStart = room.qStart; v.endsAt = room.qEnd; v.limit = room.settings.limit;
        v.answered = answeredCount(room); v.counts = countsFor(room, room.qIndex);
      }
      v.leaderboard = rankOf(room).slice(0, 10).map((p) => ({ id: p.id, name: p.name, score: p.score, team: p.team }));
      if (room.teams.length) v.teamScores = teamScores(room);
    } else if (room.mode === 'race') {
      v.goal = room.settings.goal; v.startAt = room.raceStart; v.standings = standings(room, 12); v.winner = room.winner;
      v.leaderboard = rankOf(room).slice(0, 10).map((p) => ({ id: p.id, name: p.name, score: p.progress }));
    } else if (room.mode === 'poll') {
      v.total = room.polls.length; v.qIndex = room.qIndex;
      const q = room.polls[room.qIndex];
      v.question = { index: room.qIndex, text: q.text, options: q.options };
      v.counts = pollCounts(room); v.showResults = room.showResults;
    } else if (room.mode === 'board') {
      v.board = boardView(room, true);
    }
    return v;
  }
  function pollCounts(room) {
    const q = room.polls[room.qIndex];
    const counts = q.options.map(() => 0);
    for (const p of room.players.values()) { const c = p.votes[room.qIndex]; if (c !== undefined) counts[c]++; }
    return counts;
  }
  function boardView(room, host) {
    return {
      prompt: room.board.prompt, columns: room.board.columns, open: room.boardOpen, anonymous: room.settings.anonymous,
      notes: room.notes.map((n) => ({ id: n.id, col: n.col, text: n.text, votes: n.voters.size, author: room.settings.anonymous && !host ? '' : n.author, authorId: n.authorId })),
    };
  }
  function playerView(room, p, shared) {
    const v = { ...baseView(room), role: 'player' };
    const rank = shared.rank.findIndex((x) => x.id === p.id) + 1;
    v.you = { id: p.id, name: p.name, team: p.team, score: p.score, rank, correct: p.correct, streak: p.streak };
    if (room.mode === 'quiz') {
      v.total = room.questions.length; v.qIndex = room.qIndex;
      if (room.phase === 'question' || room.phase === 'reveal') {
        const q = room.questions[room.qIndex];
        v.question = { index: room.qIndex, text: q.text, options: q.options, image: q.image };
        v.qStart = room.qStart; v.endsAt = room.qEnd; v.limit = room.settings.limit;
        const a = p.answers[room.qIndex];
        v.myAnswer = a ? { choice: a.choice } : null;
        if (room.phase === 'reveal') {
          v.reveal = { answer: q.answer, counts: countsFor(room, room.qIndex), correct: !!a?.correct, gained: a?.points || 0 };
          v.leaderboard = shared.rank.slice(0, 5).map((x) => ({ id: x.id, name: x.name, score: x.score, team: x.team }));
        }
      }
      if (room.phase === 'final') v.leaderboard = shared.rank.slice(0, 10).map((x) => ({ id: x.id, name: x.name, score: x.score, team: x.team }));
      if (room.teams.length && (room.phase === 'reveal' || room.phase === 'final')) v.teamScores = teamScores(room);
    } else if (room.mode === 'race') {
      v.goal = room.settings.goal; v.startAt = room.raceStart; v.winner = room.winner;
      v.progress = p.progress; v.penaltyUntil = p.penaltyUntil; v.finished = !!p.finishedAt;
      v.standings = standings(room, 6);
      v.myPlace = standings(room, room.players.size).findIndex((x) => x.id === p.id) + 1;
      if (room.phase === 'race' && !p.finishedAt) v.question = raceQuestion(room, p);
    } else if (room.mode === 'poll') {
      v.total = room.polls.length; v.qIndex = room.qIndex;
      const q = room.polls[room.qIndex];
      v.question = { index: room.qIndex, text: q.text, options: q.options };
      v.myVote = p.votes[room.qIndex] ?? null;
      v.showResults = room.showResults;
      if (room.showResults) v.counts = pollCounts(room);
    } else if (room.mode === 'board') {
      v.board = boardView(room, false);
      v.myVotes = room.notes.filter((n) => n.voters.has(p.id)).map((n) => n.id);
    }
    return v;
  }

  // دمج التحديثات المتقاربة في بثّ واحد
  function schedule(room) {
    if (room.flushT) return;
    room.flushT = setTimeout(() => { room.flushT = null; flush(room); }, 120);
  }
  function flush(room) {
    room.lastActive = Date.now();
    if (room.hostSocket) io.to(room.hostSocket).emit('room:update', hostView(room));
    const shared = { rank: rankOf(room) };
    for (const p of room.players.values()) if (p.connected && p.socketId) io.to(p.socketId).emit('room:update', playerView(room, p, shared));
  }

  /* ---------- دورة اللعبة ---------- */
  function startQuestion(room) {
    room.phase = 'question';
    room.qStart = Date.now();
    room.qEnd = room.qStart + room.settings.limit * 1000;
    clearTimeout(room.timer);
    room.timer = setTimeout(() => endQuestion(room), room.settings.limit * 1000 + 250);
    schedule(room);
  }
  function endQuestion(room) {
    if (room.phase !== 'question') return;
    clearTimeout(room.timer);
    room.phase = 'reveal';
    for (const p of room.players.values()) {
      if (!p.answers[room.qIndex]) p.streak = 0; // لم يجب
    }
    schedule(room);
  }
  async function finish(room) {
    if (room.phase === 'final') return;
    clearTimeout(room.timer);
    room.phase = 'final';
    schedule(room);
    try {
      let n = 0;
      for (const p of room.players.values()) {
        if (n++ >= MAX_PLAYERS) break;
        const total = room.mode === 'race' ? p.correct + p.wrong : room.questions.length;
        if (!total) continue;
        await db.insert('results', {
          activityId: room.activityId, activityTitle: room.title, userId: null, studentName: p.name, source: 'live',
          score: p.correct, total, percent: Math.round((p.correct / total) * 100),
          durationSec: Math.round((Date.now() - room.createdAt) / 1000), createdAt: iso(),
        });
      }
      const a = await db.findOne('activities', { id: room.activityId });
      if (a) await db.update('activities', a.id, { plays: (a.plays || 0) + room.players.size });
    } catch (e) { console.error('live results save failed', e.message); }
  }
  function closeRoom(room, reason) {
    clearTimeout(room.timer); clearTimeout(room.flushT);
    io.to(`r:${room.pin}`).emit('room:closed', { reason });
    io.in(`r:${room.pin}`).socketsLeave(`r:${room.pin}`);
    rooms.delete(room.pin);
  }

  /* ---------- الاتصالات ---------- */
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (token) {
        const p = jwt.verify(token, config.jwtSecret);
        socket.data.user = await db.findOne('users', { id: p.id });
      }
    } catch { /* زائر */ }
    next();
  });

  io.on('connection', (socket) => {
    const ip = socket.handshake.address;
    const guard = (fn) => (payload, ack) => {
      const cb = typeof ack === 'function' ? ack : () => {};
      if (!hit(socket)) return cb({ ok: false, error: 'محاولات كثيرة، تمهّل قليلًا' });
      Promise.resolve().then(() => fn(payload && typeof payload === 'object' ? payload : {}, cb)).catch((e) => { console.error('live error', e); cb({ ok: false, error: 'خطأ في الخادم' }); });
    };
    const hostRoom = () => {
      const room = rooms.get(socket.data.hostPin);
      return room && room.hostUserId === socket.data.user?.id ? room : null;
    };
    const myPlayer = () => {
      const room = rooms.get(socket.data.pin);
      const p = room?.players.get(socket.data.playerId);
      return room && p && p.socketId === socket.id ? { room, p } : null;
    };

    /* ----- المعلم ----- */
    socket.on('host:create', guard(async (m, ack) => {
      const u = socket.data.user;
      if (!u || !['teacher', 'admin'].includes(u.role)) return ack({ ok: false, error: 'للمعلمين فقط' });
      const a = await db.findOne('activities', { id: String(m.activityId || '') });
      if (!a || !(a.ownerId === u.id || u.role === 'admin' || (a.published && a.isPublic))) return ack({ ok: false, error: 'النشاط غير موجود' });
      const lc = liveContent(a);
      if (lc.error) return ack({ ok: false, error: lc.error });
      const mode = lc.modes.includes(m.mode) ? m.mode : lc.modes[0];
      if ([...rooms.values()].filter((r) => r.hostUserId === u.id).length >= 5) return ack({ ok: false, error: 'لديك 5 جلسات مفتوحة. أنهِ إحداها أولًا.' });
      const pin = genPin();
      if (!pin) return ack({ ok: false, error: 'تعذّر إنشاء رمز، حاول مجددًا' });
      const n = lc.questions?.length || 0;
      const settings = {
        limit: clampInt(m.limit, 5, 120, 20),
        goal: clampInt(m.goal, 2, Math.max(2, n), Math.min(10, Math.max(2, n))),
        anonymous: !!m.anonymous,
      };
      const room = {
        pin, activityId: a.id, type: a.type, title: a.title, mode, hostUserId: u.id, hostSocket: socket.id, hostOnline: true, hostGoneAt: 0,
        questions: lc.questions || [], polls: lc.polls || [], board: lc.board || null, teams: lc.teams || [],
        settings, players: new Map(), phase: 'lobby', qIndex: 0, qStart: 0, qEnd: 0, timer: null, flushT: null, locked: false,
        raceStart: 0, winner: null, showResults: true, notes: [], boardOpen: true, createdAt: Date.now(), lastActive: Date.now(),
      };
      rooms.set(pin, room);
      socket.data.hostPin = pin;
      socket.join(`r:${pin}`);
      ack({ ok: true, pin, modes: lc.modes });
      schedule(room);
    }));

    socket.on('host:resume', guard(async (m, ack) => {
      const room = rooms.get(String(m.pin || ''));
      if (!room || room.hostUserId !== socket.data.user?.id) return ack({ ok: false, error: 'الجلسة غير موجودة' });
      room.hostSocket = socket.id; room.hostOnline = true; room.hostGoneAt = 0;
      socket.data.hostPin = room.pin; socket.join(`r:${room.pin}`);
      ack({ ok: true, pin: room.pin });
      schedule(room);
    }));

    const hostOnly = (fn) => guard((m, ack) => { const room = hostRoom(); return room ? fn(room, m, ack) : ack({ ok: false, error: 'غير مصرّح' }); });

    socket.on('host:start', hostOnly((room, m, ack) => {
      if (room.phase !== 'lobby') return ack({ ok: false, error: 'بدأت اللعبة مسبقًا' });
      if (['quiz', 'race'].includes(room.mode) && room.players.size < 1) return ack({ ok: false, error: 'لا يوجد لاعبون بعد' });
      room.locked = room.mode === 'race' ? true : room.locked;
      if (room.mode === 'quiz') { room.qIndex = 0; startQuestion(room); }
      else if (room.mode === 'race') {
        room.phase = 'race'; room.raceStart = Date.now() + COUNTDOWN_MS;
        const ids = room.questions.map((_, i) => i);
        for (const p of room.players.values()) { p.seq = shuffle(ids); p.qPos = 0; p.progress = 0; }
      } else { room.phase = room.mode; room.qIndex = 0; }
      ack({ ok: true }); schedule(room);
    }));

    socket.on('host:next', hostOnly((room, m, ack) => {
      if (room.mode === 'quiz') {
        if (room.phase === 'question') endQuestion(room);
        else if (room.phase === 'reveal') { if (room.qIndex + 1 < room.questions.length) { room.qIndex++; startQuestion(room); } else finish(room); }
      } else if (room.mode === 'poll') room.qIndex = Math.min(room.polls.length - 1, room.qIndex + 1);
      ack({ ok: true }); schedule(room);
    }));
    socket.on('host:prev', hostOnly((room, m, ack) => { if (room.mode === 'poll') room.qIndex = Math.max(0, room.qIndex - 1); ack({ ok: true }); schedule(room); }));
    socket.on('host:finish', hostOnly((room, m, ack) => { finish(room); ack({ ok: true }); }));
    socket.on('host:lock', hostOnly((room, m, ack) => { room.locked = !!m.locked; ack({ ok: true }); schedule(room); }));
    socket.on('host:kick', hostOnly((room, m, ack) => {
      const p = room.players.get(String(m.playerId || ''));
      if (p) { if (p.socketId) { io.to(p.socketId).emit('room:closed', { reason: 'kicked' }); io.sockets.sockets.get(p.socketId)?.leave(`r:${room.pin}`); } room.players.delete(p.id); }
      ack({ ok: true }); schedule(room);
    }));
    socket.on('host:poll-show', hostOnly((room, m, ack) => { room.showResults = !!m.show; ack({ ok: true }); schedule(room); }));
    socket.on('host:board', hostOnly((room, m, ack) => {
      if (m.open !== undefined) room.boardOpen = !!m.open;
      if (m.anonymous !== undefined) room.settings.anonymous = !!m.anonymous;
      ack({ ok: true }); schedule(room);
    }));
    socket.on('host:note-delete', hostOnly((room, m, ack) => { room.notes = room.notes.filter((n) => n.id !== String(m.id || '')); ack({ ok: true }); schedule(room); }));
    socket.on('host:end', hostOnly((room, m, ack) => { ack({ ok: true }); closeRoom(room, 'ended'); }));

    /* ----- الطلاب ----- */
    socket.on('player:join', guard(async (m, ack) => {
      if (pinBlocked(ip)) return ack({ ok: false, error: 'محاولات خاطئة كثيرة. حاول بعد دقيقة.' });
      const room = rooms.get(String(m.pin || '').trim());
      if (!room) { pinFailed(ip); return ack({ ok: false, error: 'رمز اللعبة غير صحيح' }); }
      // إعادة الاتصال بنفس اللاعب
      const old = m.playerId ? room.players.get(String(m.playerId)) : null;
      if (old) {
        old.socketId = socket.id; old.connected = true;
        socket.data.pin = room.pin; socket.data.playerId = old.id; socket.join(`r:${room.pin}`);
        ack({ ok: true, playerId: old.id, name: old.name }); schedule(room); return;
      }
      if (room.locked) return ack({ ok: false, error: 'تم إغلاق الانضمام لهذه اللعبة' });
      if (room.players.size >= MAX_PLAYERS) return ack({ ok: false, error: 'اللعبة ممتلئة' });
      let name = cleanName(m.name);
      if (!name) return ack({ ok: false, error: 'اكتب اسمك' });
      const taken = new Set([...room.players.values()].map((p) => p.name.toLowerCase()));
      if (taken.has(name.toLowerCase())) { let k = 2; while (taken.has(`${name} ${k}`.toLowerCase())) k++; name = `${name} ${k}`; }
      let team = null;
      if (room.teams.length) {
        const t = Number(m.team);
        if (Number.isInteger(t) && t >= 0 && t < room.teams.length) team = t;
        else { const sizes = room.teams.map((_, i) => [...room.players.values()].filter((p) => p.team === i).length); team = sizes.indexOf(Math.min(...sizes)); }
      }
      const p = {
        id: crypto.randomUUID(), name, team, score: 0, correct: 0, wrong: 0, streak: 0, answers: {}, votes: {}, connected: true, socketId: socket.id,
        joinedAt: Date.now(), progress: 0, seq: shuffle(room.questions.map((_, i) => i)), qPos: 0, penaltyUntil: 0, finishedAt: 0, noteCount: 0,
      };
      room.players.set(p.id, p);
      socket.data.pin = room.pin; socket.data.playerId = p.id; socket.join(`r:${room.pin}`);
      ack({ ok: true, playerId: p.id, name: p.name });
      schedule(room);
    }));

    socket.on('player:answer', guard((m, ack) => {
      const ctx = myPlayer();
      if (!ctx) return ack({ ok: false, error: 'غير منضم' });
      const { room, p } = ctx;
      const choice = clampInt(m.choice, 0, 9, -1);
      if (room.mode === 'quiz') {
        if (room.phase !== 'question' || Number(m.q) !== room.qIndex) return ack({ ok: false, error: 'انتهى وقت السؤال' });
        if (p.answers[room.qIndex]) return ack({ ok: false, error: 'أجبت مسبقًا' });
        const q = room.questions[room.qIndex];
        if (choice < 0 || choice >= q.options.length) return ack({ ok: false, error: 'خيار غير صالح' });
        const elapsed = Date.now() - room.qStart, lim = room.settings.limit * 1000;
        if (elapsed > lim + 500) return ack({ ok: false, error: 'انتهى وقت السؤال' });
        const correct = choice === q.answer;
        p.streak = correct ? p.streak + 1 : 0;
        const points = correct ? Math.round(1000 * (1 - Math.min(1, elapsed / lim) / 2)) + Math.min(p.streak - 1, 5) * 100 : 0;
        p.answers[room.qIndex] = { choice, correct, points, ms: elapsed };
        p.score += points; if (correct) p.correct++;
        ack({ ok: true });
        if (answeredCount(room) >= connectedCount(room)) endQuestion(room);
        schedule(room);
      } else if (room.mode === 'race') {
        const t = Date.now();
        if (room.phase !== 'race' || t < room.raceStart) return ack({ ok: false, error: 'السباق لم يبدأ' });
        if (p.finishedAt) return ack({ ok: false, error: 'أنهيت السباق' });
        if (t < p.penaltyUntil) return ack({ ok: false, error: 'انتظر انتهاء العقوبة', penaltyUntil: p.penaltyUntil });
        const cur = raceQuestion(room, p);
        if (Number(m.q) !== cur.id) return ack({ ok: false, error: 'سؤال قديم' });
        if (choice < 0 || choice >= cur.options.length) return ack({ ok: false, error: 'خيار غير صالح' });
        const correct = choice === room.questions[cur.id].answer;
        p.qPos++;
        if (correct) {
          p.progress++; p.correct++; p.score += 100;
          if (p.progress >= room.settings.goal) { p.finishedAt = t; if (!room.winner) { room.winner = { id: p.id, name: p.name }; finish(room); } }
        } else { p.wrong++; p.penaltyUntil = t + PENALTY_MS; }
        ack({ ok: true, correct, progress: p.progress, penaltyUntil: p.penaltyUntil });
        schedule(room);
      } else ack({ ok: false, error: 'غير مدعوم' });
    }));

    socket.on('player:vote', guard((m, ack) => {
      const ctx = myPlayer();
      if (!ctx || ctx.room.mode !== 'poll' || ctx.room.phase !== 'poll') return ack({ ok: false, error: 'غير متاح' });
      const { room, p } = ctx;
      const q = room.polls[room.qIndex];
      const choice = clampInt(m.choice, 0, 9, -1);
      if (Number(m.q) !== room.qIndex || choice < 0 || choice >= q.options.length) return ack({ ok: false, error: 'صوت غير صالح' });
      p.votes[room.qIndex] = choice;
      ack({ ok: true }); schedule(room);
    }));

    socket.on('player:note', guard((m, ack) => {
      const ctx = myPlayer();
      if (!ctx || ctx.room.mode !== 'board' || ctx.room.phase !== 'board') return ack({ ok: false, error: 'اللوحة غير متاحة' });
      const { room, p } = ctx;
      if (!room.boardOpen) return ack({ ok: false, error: 'أغلق المعلم إضافة الملاحظات' });
      const text = cleanText(m.text, 140);
      const col = Number(m.col);
      if (!Number.isInteger(col) || col < 0 || col >= room.board.columns.length) return ack({ ok: false, error: 'عمود غير صالح' });
      if (!text) return ack({ ok: false, error: 'اكتب فكرة قصيرة' });
      if (p.noteCount >= 20 || room.notes.length >= 400) return ack({ ok: false, error: 'وصلت للحد الأقصى من الملاحظات' });
      room.notes.push({ id: crypto.randomUUID(), col, text, author: p.name, authorId: p.id, voters: new Set() });
      p.noteCount++;
      ack({ ok: true }); schedule(room);
    }));
    socket.on('player:note-vote', guard((m, ack) => {
      const ctx = myPlayer();
      if (!ctx || ctx.room.mode !== 'board') return ack({ ok: false, error: 'غير متاح' });
      const n = ctx.room.notes.find((x) => x.id === String(m.id || ''));
      if (!n) return ack({ ok: false, error: 'الملاحظة غير موجودة' });
      n.voters.has(ctx.p.id) ? n.voters.delete(ctx.p.id) : n.voters.add(ctx.p.id);
      ack({ ok: true }); schedule(ctx.room);
    }));

    socket.on('disconnect', () => {
      const room = rooms.get(socket.data.hostPin);
      if (room && room.hostSocket === socket.id) { room.hostOnline = false; room.hostGoneAt = Date.now(); schedule(room); }
      const ctx = myPlayer();
      if (ctx) {
        ctx.p.connected = false;
        schedule(ctx.room);
        // إن كان آخر المتصلين لم يجب بعد، قد تكتمل الإجابات
        if (ctx.room.mode === 'quiz' && ctx.room.phase === 'question' && connectedCount(ctx.room) > 0 && answeredCount(ctx.room) >= connectedCount(ctx.room)) endQuestion(ctx.room);
      }
    });
  });

  // تنظيف الغرف الخاملة
  setInterval(() => {
    const t = Date.now();
    for (const room of rooms.values()) {
      if (t - room.lastActive > IDLE_MS || (!room.hostOnline && t - room.hostGoneAt > HOST_GONE_MS)) closeRoom(room, 'expired');
    }
  }, 60_000).unref();

  return {
    modes: LIVE_MODES,
    peek(pin, ip) {
      if (pinBlocked(ip)) return { ok: false, error: 'محاولات خاطئة كثيرة. حاول بعد دقيقة.' };
      const room = rooms.get(String(pin || '').trim());
      if (!room) { pinFailed(ip); return { ok: false, error: 'رمز اللعبة غير صحيح' }; }
      return { ok: true, title: room.title, mode: room.mode, type: room.type, teams: room.teams, locked: room.locked, phase: room.phase };
    },
    close: () => { for (const r of [...rooms.values()]) closeRoom(r, 'server'); io.close(); },
    _rooms: rooms,
  };
}
