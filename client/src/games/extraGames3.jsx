import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { shuffle } from '../lib/text.js';
import { sfx } from '../lib/sfx.js';
import { speak } from './common.jsx';

/* ---------- لعب الأدوار + شجرة القرارات ---------- */
function BranchingGame({ content, finish, snd, t, templateId }) {
  const byId = useMemo(() => Object.fromEntries(content.nodes.map((n) => [n.id, n])), [content]);
  const [id, setId] = useState(content.start);
  const [trail, setTrail] = useState([]);
  const node = byId[id] || { id: 'x', text: t('نهاية', 'The end'), end: true, outcome: 'neutral', choices: [] };
  const choose = (ch) => { snd.ok(); setTrail([...trail, { from: node.text, pick: ch.text }]); setId(ch.next); };
  const icon = { good: '🎉', neutral: '🙂', bad: '⚠️' }[node.outcome] || '🙂';
  return (
    <div className="branch">
      {templateId === 'roleplay' && content.role && <div className="role-badge">🎭 {content.role}</div>}
      {content.scenario && trail.length === 0 && <p className="hint-box">{content.scenario}</p>}
      <div className={'q-card node ' + (node.end ? 'end-' + (node.outcome || 'neutral') : '')}>
        {node.end && <div className="stars">{icon}</div>}
        <h2 className="q-text">{node.text}</h2>
        <button className="icon-btn" aria-label="listen" onClick={() => speak(node.text, /[\u0600-\u06FF]/.test(node.text) ? 'ar' : 'en')}>🔊</button>
      </div>
      {!node.end ? <div className="choices">{node.choices.map((c, k) => <button key={k} className="btn choice" onClick={() => choose(c)}>{c.text}</button>)}</div> : (
        <>
          {trail.length > 0 && <div className="trail"><h3>{t('مسارك', 'Your path')}</h3><ol>{trail.map((x, k) => <li key={k}>{x.pick}</li>)}</ol></div>}
          <div className="row center"><button className="btn" onClick={() => { setId(content.start); setTrail([]); }}>↻ {t('جرّب مسارًا آخر', 'Try another path')}</button><button className="btn primary" onClick={finish}>{t('إنهاء', 'Finish')}</button></div>
        </>
      )}
    </div>
  );
}

/* ---------- لوحة العصف الذهني (على الجهاز نفسه) ---------- */
const NOTE_COLORS = ['#FFE680', '#B8F2D8', '#CFE6FF', '#FFC9CC', '#E1D4FF'];
function BrainstormGame({ content, finish, t }) {
  const [notes, setNotes] = useState(() => content.columns.map(() => []));
  const [drafts, setDrafts] = useState(() => content.columns.map(() => ''));
  const add = (c) => {
    const v = drafts[c].trim();
    if (!v) return;
    setNotes((n) => n.map((l, k) => (k === c ? [...l, { text: v, votes: 0, color: NOTE_COLORS[l.length % NOTE_COLORS.length] }] : l)));
    setDrafts((d) => d.map((x, k) => (k === c ? '' : x)));
  };
  const upd = (c, i, fn) => setNotes((n) => n.map((l, k) => (k === c ? l.flatMap((x, j) => (j === i ? fn(x) : [x])) : l)));
  const copy = async () => {
    const txt = `${content.prompt}\n\n` + content.columns.map((col, c) => `${col}:\n` + notes[c].map((x) => `- ${x.text} (${x.votes})`).join('\n')).join('\n\n');
    try { await navigator.clipboard.writeText(txt); } catch { /* غير متاح */ }
  };
  return (
    <div className="board">
      <div className="q-card"><h2 className="q-text">💡 {content.prompt}</h2><p className="muted small-text">{t('الملاحظات تبقى على هذا الجهاز فقط خلال الجلسة.', 'Notes stay on this device for this session only.')}</p></div>
      <div className="cols" style={{ '--n': content.columns.length }}>
        {content.columns.map((col, c) => (
          <div key={c} className="bcol"><h3>{col}</h3>
            <div className="bnotes">{notes[c].map((x, i) => <div key={i} className="sticky" style={{ background: x.color }}><p>{x.text}</p><div><button onClick={() => upd(c, i, (y) => [{ ...y, votes: y.votes + 1 }])}>👍 {x.votes}</button><button onClick={() => upd(c, i, () => [])} aria-label="delete">🗑</button></div></div>)}</div>
            <input value={drafts[c]} onChange={(e) => setDrafts((d) => d.map((v, k) => (k === c ? e.target.value : v)))} onKeyDown={(e) => e.key === 'Enter' && add(c)} placeholder={t('اكتب فكرة ثم Enter', 'Type an idea, press Enter')} />
          </div>))}
      </div>
      <div className="row center"><button className="btn" onClick={copy}>📋 {t('نسخ كنص', 'Copy as text')}</button><button className="btn primary" onClick={finish}>{t('إنهاء', 'Finish')}</button></div>
    </div>
  );
}

/* ---------- التصويت (استطلاع) و«سؤال أم خيار؟» ---------- */
const getCid = () => {
  try {
    let c = localStorage.getItem('lamaa_cid');
    if (!c) { c = (crypto.randomUUID?.() || String(Math.random()).slice(2) + Date.now()); localStorage.setItem('lamaa_cid', c); }
    return c;
  } catch { return 'anon-' + Math.random().toString(36).slice(2); }
};

function PollGame({ content, finish, t, activityId, offline, templateId }) {
  const questions = useMemo(() => (templateId === 'wyr' ? content.items.map((x) => ({ question: t('أيهما تفضّل؟', 'Which would you rather?'), options: [x.a, x.b] })) : content.questions), []); // eslint-disable-line
  const cid = useMemo(getCid, []);
  const [votes, setVotes] = useState({});
  const [mine, setMine] = useState({});
  const [err, setErr] = useState('');
  useEffect(() => {
    if (offline) return;
    const load = () => api.get(`/activities/${activityId}/votes`).then(setVotes).catch(() => {});
    load();
    const h = setInterval(load, 3000);
    return () => clearInterval(h);
  }, [offline, activityId]);

  const vote = async (q, k) => {
    setErr('');
    if (offline) {
      setVotes((v) => { const cur = { ...(v[q] || {}) }; if (mine[q] !== undefined) cur[mine[q]] = Math.max(0, (cur[mine[q]] || 0) - 1); cur[k] = (cur[k] || 0) + 1; return { ...v, [q]: cur }; });
      setMine({ ...mine, [q]: k });
      return;
    }
    try { setVotes(await api.post(`/activities/${activityId}/vote`, { q, choice: k, clientId: cid })); setMine({ ...mine, [q]: k }); sfx.ok(); } catch (e) { setErr(e.message); }
  };
  return (
    <div className="poll">
      {offline && <p className="muted small-text center-text">{t('في المعاينة/النسخة المستقلة تُحتسب أصواتك أنت فقط.', 'In preview / standalone copy only your own vote is counted.')}</p>}
      {questions.map((q, qi) => {
        const counts = votes[qi] || {};
        const total = q.options.reduce((n, _, k) => n + (counts[k] || 0), 0);
        return (
          <div key={qi} className="q-card poll-q"><h2 className="q-text">{q.question}</h2>
            <div className="poll-opts">
              {q.options.map((o, k) => {
                const pct = total ? Math.round(((counts[k] || 0) / total) * 100) : 0;
                return <button key={k} className={'poll-opt' + (mine[qi] === k ? ' mine' : '')} onClick={() => vote(qi, k)}><i style={{ width: pct + '%' }} /><span>{o}</span><b>{mine[qi] !== undefined || total ? `${pct}% (${counts[k] || 0})` : ''}</b></button>;
              })}
            </div>
            <small className="muted">{total} {t('صوت', 'votes')}</small>
          </div>
        );
      })}
      {err && <p className="bad-text center-text">{err}</p>}
      <div className="row center"><button className="btn primary" onClick={finish}>{t('إنهاء', 'Finish')}</button></div>
    </div>
  );
}

/* ---------- بطاقات المؤقت: شرح بدون كلام، البحث، 5 ثوانٍ، البرج، الابتكار ---------- */
const DECK_LABELS = {
  charades: ['🤫', 'مثّل أو ارسم', 'Act or draw'], scavenger: ['🏃', 'أحضر', 'Bring me'], fivesec: ['5️⃣', 'في 5 ثوانٍ', 'In 5 seconds'],
  tower: ['🗼', 'التحدي', 'Challenge'], innovation: ['🚀', 'المشكلة', 'Problem'],
};
function DeckGame({ content, s, finish, snd, t, templateId }) {
  const items = useMemo(() => (s.shuffle ? shuffle(content.items) : content.items), []); // eslint-disable-line
  const secs = content.seconds || 60;
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(secs);
  const [run, setRun] = useState(false);
  const [score, setScore] = useState(0);
  const [lab] = [DECK_LABELS[templateId] || ['🃏', '', '']];
  const lang = document.documentElement.lang;
  useEffect(() => {
    if (!run) return;
    const h = setInterval(() => setLeft((x) => x - 1), 1000);
    return () => clearInterval(h);
  }, [run]);
  useEffect(() => { if (run && left <= 0) { setRun(false); snd.bad(); } }, [left, run]); // eslint-disable-line
  const next = (won) => {
    if (won) setScore(score + 1);
    setRun(false); setLeft(secs);
    i + 1 >= items.length ? finish() : setI(i + 1);
  };
  const pct = (left / secs) * 100;
  return (
    <div className="deck">
      <p className="muted center-text">{i + 1}/{items.length}{templateId === 'charades' ? ` · ✔ ${score}` : ''}</p>
      <div className="deck-card"><small>{lab[0]} {lang === 'en' ? lab[2] : lab[1]}</small><h2>{items[i]}</h2></div>
      <div className={'ring-timer' + (left <= 5 && run ? ' low' : '')} style={{ '--p': pct }}><span>{Math.max(0, left)}</span></div>
      <div className="row center">
        {!run && left > 0 && <button className="btn primary big" onClick={() => { setRun(true); sfx.ok(); }}>▶ {t('ابدأ المؤقت', 'Start timer')}</button>}
        {run && <button className="btn big" onClick={() => setRun(false)}>⏸ {t('إيقاف', 'Pause')}</button>}
        {templateId === 'charades' ? (<><button className="btn ok-soft big" onClick={() => next(true)}>✔ {t('نجح', 'Got it')}</button><button className="btn big" onClick={() => next(false)}>⏭ {t('تخطي', 'Skip')}</button></>) : <button className="btn big" onClick={() => next(false)}>{i + 1 >= items.length ? t('إنهاء', 'Finish') : t('التالي', 'Next')} ⏭</button>}
      </div>
      {left <= 0 && <p className="bad-text center-text">⏰ {t('انتهى الوقت!', "Time's up!")}</p>}
    </div>
  );
}

/* ---------- قصة في كلمة ---------- */
function StoryWordGame({ content, finish, t }) {
  const players = content.players;
  const [words, setWords] = useState(content.starter ? [content.starter] : []);
  const [val, setVal] = useState('');
  const [turn, setTurn] = useState(0);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);
  const add = (e) => {
    e.preventDefault();
    const w = val.trim();
    if (!w) return;
    if (/\s/.test(w)) return setMsg(t('كلمة واحدة فقط!', 'One word only!'));
    setMsg(''); setWords([...words, w]); setVal(''); setTurn((turn + 1) % players.length);
  };
  const story = words.join(' ');
  if (done) return (
    <div className="stage-card result"><div className="stars">📖</div><h2>{t('قصتنا', 'Our story')}</h2><p className="story">{story}</p>
      <div className="row center"><button className="btn" onClick={() => navigator.clipboard?.writeText(story)}>📋 {t('نسخ', 'Copy')}</button><button className="btn primary" onClick={finish}>{t('إنهاء', 'Finish')}</button></div></div>
  );
  return (
    <div className="mcq">
      <div className="q-card"><p className="story">{story || '…'}</p></div>
      <p className="center-text"><b>{t('الدور على', 'Turn')}: {players[turn]}</b></p>
      <form className="riddle-form" onSubmit={add}><input value={val} onChange={(e) => setVal(e.target.value)} placeholder={t('كلمة واحدة فقط', 'One word only')} autoFocus aria-label="word" /><button className="btn primary" disabled={!val.trim()}>{t('أضف', 'Add')}</button></form>
      {msg && <p className="bad-text center-text">{msg}</p>}
      <div className="row center"><button className="btn" onClick={() => setDone(true)} disabled={words.length < 2}>{t('إنهاء القصة', 'End the story')}</button></div>
    </div>
  );
}

/* ---------- حجر ورقة مقص ---------- */
const MOVES = [['✊', 'حجر', 'Rock'], ['✋', 'ورقة', 'Paper'], ['✌️', 'مقص', 'Scissors']];
const beats = (a, b) => (a - b + 3) % 3 === 1; // ورقة تغلب حجر، مقص يغلب ورقة، حجر يغلب مقص
function RpsGame({ content, finish, snd, t }) {
  const rounds = content.rounds || 5;
  const lang = document.documentElement.lang;
  const [mode, setMode] = useState('solo');
  const [r, setR] = useState(0);
  const [score, setScore] = useState({ me: 0, cpu: 0 });
  const [last, setLast] = useState(null);
  const [cls, setCls] = useState({ phase: 'idle', n: 0, cpu: null });
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const play = (m) => {
    if (last && r >= rounds) return;
    const cpu = Math.floor(Math.random() * 3);
    const res = m === cpu ? 'draw' : beats(m, cpu) ? 'win' : 'lose';
    res === 'win' ? snd.ok() : res === 'lose' && snd.bad();
    setLast({ m, cpu, res }); setR(r + 1);
    setScore((s) => ({ me: s.me + (res === 'win' ? 1 : 0), cpu: s.cpu + (res === 'lose' ? 1 : 0) }));
  };
  const classRound = () => {
    timers.current.forEach(clearTimeout); timers.current = [];
    setCls({ phase: 'count', n: 3, cpu: null });
    [2, 1].forEach((n, k) => timers.current.push(setTimeout(() => setCls({ phase: 'count', n, cpu: null }), (k + 1) * 900)));
    timers.current.push(setTimeout(() => { snd.ok(); setCls({ phase: 'show', n: 0, cpu: Math.floor(Math.random() * 3) }); }, 2700));
  };
  const nm = (k) => (lang === 'en' ? MOVES[k][2] : MOVES[k][1]);
  return (
    <div className="rps">
      <div className="tabs"><button className={mode === 'solo' ? 'on' : ''} onClick={() => setMode('solo')}>{t('ضد الحاسوب', 'Vs computer')}</button><button className={mode === 'class' ? 'on' : ''} onClick={() => setMode('class')}>{t('وضع الصف', 'Class mode')}</button></div>
      {mode === 'solo' ? (
        <>
          <p className="center-text"><b>{t('الجولة', 'Round')} {Math.min(r + 1, rounds)}/{rounds}</b> · {t('أنت', 'You')} {score.me} — {score.cpu} {t('الحاسوب', 'CPU')}</p>
          {last && <div className="rps-res"><span>{MOVES[last.m][0]}</span><b>{last.res === 'win' ? '🎉 ' + t('فزت', 'You win') : last.res === 'lose' ? '😅 ' + t('خسرت', 'You lose') : '🤝 ' + t('تعادل', 'Draw')}</b><span>{MOVES[last.cpu][0]}</span></div>}
          {r < rounds ? <div className="row center">{MOVES.map((m, k) => <button key={k} className="btn big rps-btn" onClick={() => play(k)}><span>{m[0]}</span>{nm(k)}</button>)}</div>
            : <div className="row center"><button className="btn primary big" onClick={finish}>{t('إنهاء', 'Finish')}</button></div>}
        </>
      ) : (
        <div className="center-text">
          <p className="muted">{t('يلعب الجميع ضد حركة الحاسوب: من يخسر أو يتعادل يخرج، ومن يفوز يبقى.', 'Everyone plays against the computer’s move: losers and draws are out.')}</p>
          {cls.phase === 'count' && <div className="big-count">{cls.n}</div>}
          {cls.phase === 'show' && <><div className="big-move">{MOVES[cls.cpu][0]}</div><p className="deck-card"><b>{t('الحاسوب اختار', 'Computer chose')}: {nm(cls.cpu)}</b><br />{t('ليبقى اللاعب، يجب أن يكون اختار', 'To stay in, you must have played')}: <b>{MOVES[(cls.cpu + 1) % 3][0]} {nm((cls.cpu + 1) % 3)}</b></p></>}
          <div className="row center"><button className="btn primary big" onClick={classRound} disabled={cls.phase === 'count'}>{cls.phase === 'idle' ? t('ابدأ الجولة', 'Start round') : t('جولة جديدة', 'New round')}</button><button className="btn" onClick={finish}>{t('إنهاء', 'Finish')}</button></div>
        </div>
      )}
    </div>
  );
}

/* ---------- شبكة المعارف (بنغو) ---------- */
function BingoGame({ content, finish, snd, t }) {
  const size = content.traits.length >= 16 ? 4 : content.traits.length >= 9 ? 3 : 2;
  const cells = useMemo(() => shuffle(content.traits).slice(0, size * size), []); // eslint-disable-line
  const [names, setNames] = useState(() => cells.map(() => ''));
  const filled = names.map((n) => n.trim() !== '');
  const lines = [];
  for (let k = 0; k < size; k++) { lines.push(Array.from({ length: size }, (_, j) => k * size + j), Array.from({ length: size }, (_, j) => j * size + k)); }
  lines.push(Array.from({ length: size }, (_, j) => j * size + j), Array.from({ length: size }, (_, j) => j * size + (size - 1 - j)));
  const wins = lines.filter((l) => l.every((x) => filled[x])).length;
  const full = filled.every(Boolean);
  const prev = useRef(0);
  useEffect(() => { if (wins > prev.current) snd.ok(); prev.current = wins; }, [wins]); // eslint-disable-line
  return (
    <div className="bingo">
      <p className="muted center-text">{t('اكتب اسم شخص يطابق كل صفة (لا تكرر الشخص نفسه كثيرًا!).', 'Write the name of someone matching each trait.')}</p>
      <div className="bingo-grid" style={{ '--n': size }}>
        {cells.map((c, k) => <label key={k} className={'bingo-cell' + (filled[k] ? ' on' : '')}><span>{c}</span><input value={names[k]} maxLength={30} onChange={(e) => setNames(names.map((n, j) => (j === k ? e.target.value : n)))} placeholder={t('الاسم', 'Name')} /></label>)}
      </div>
      {wins > 0 && <p className="ok-text center-text">🎉 BINGO! ({wins})</p>}
      <div className="row center"><button className={'btn ' + (full ? 'primary' : '')} onClick={finish}>{t('إنهاء', 'Finish')}</button></div>
    </div>
  );
}

export const extra3 = {
  roleplay: BranchingGame, decisiontree: BranchingGame, brainstorm: BrainstormGame, poll: PollGame, wyr: PollGame,
  charades: DeckGame, scavenger: DeckGame, fivesec: DeckGame, tower: DeckGame, innovation: DeckGame,
  storyword: StoryWordGame, rps: RpsGame, bingo: BingoGame,
};
