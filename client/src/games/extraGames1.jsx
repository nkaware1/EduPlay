import { useEffect, useMemo, useRef, useState } from 'react';
import { norm, shuffle } from '../lib/text.js';
import { FeedbackBar, ProgressBar, useKeys } from './common.jsx';
import { QuizGame, prepQuestions, useMcq } from './mcqGames.jsx';

const LET = ['A', 'B', 'C', 'D', 'E', 'F'];
const splitList = (s) => String(s || '').split(/[,،]/).map((x) => x.trim()).filter(Boolean);

/* ---------- محوّلات تحوّل المحتوى إلى أسئلة اختيار من متعدد ---------- */
const adapt = (build) => function Adapted(p) {
  const content = useMemo(() => ({ questions: build(p.content, p.t) }), []); // eslint-disable-line
  return <QuizGame {...p} content={content} />;
};

const VocabGame = adapt((c, t) => {
  const words = [...new Set(c.items.map((x) => x.word))];
  return c.items.map((it) => {
    const options = shuffle([it.word, ...shuffle(words.filter((w) => w !== it.word)).slice(0, 3)]);
    return { question: t('ما اسم هذه الصورة؟', 'What is this?'), image: it.image, options, answer: options.indexOf(it.word), feedback: '' };
  });
});
const OddOneGame = adapt((c, t) => c.items.map((it) => {
  const options = shuffle([...it.group, it.odd]);
  return { question: t('اختر الكلمة التي لا تنتمي للمجموعة', 'Pick the word that does not belong'), options, answer: options.indexOf(it.odd), feedback: it.reason || '' };
}));
const PatternGame = adapt((c, t) => c.items.map((it) => {
  const options = [...new Set([String(it.answer), ...splitList(it.distractors)])].slice(0, 6);
  const sh = shuffle(options);
  return { question: `${it.sequence} ، ؟`, options: sh, answer: sh.indexOf(String(it.answer)), feedback: '' };
}));
const TruthLieGame = adapt((c, t) => c.items.map((it) => {
  const options = shuffle([...it.truths, it.lie]);
  return { question: `${it.who ? it.who + ': ' : ''}${t('أي عبارة منها كذبة؟', 'Which statement is the lie?')}`, options, answer: options.indexOf(it.lie), feedback: '' };
}));

/* ---------- سباق السيارات ---------- */
function RacingGame(p) {
  const m = useMcq(p);
  const n = m.qs.length;
  const nb = Math.min(3, Math.max(1, p.content.bots || 2));
  const [bots, setBots] = useState(() => Array(nb).fill(0));
  useEffect(() => {
    const h = setInterval(() => setBots((b) => b.map((x, i) => Math.min(1, x + (0.012 + i * 0.004) * (0.6 + Math.random())))), 700);
    return () => clearInterval(h);
  }, []);
  const me = m.ok / n;
  const rank = 1 + bots.filter((b) => b > me).length;
  const L = ['🚙', '🚕', '🚓'];
  const lane = (x, icon, k, mine) => (
    <div className={'lane' + (mine ? ' mine' : '')} key={k}><span className="car" style={{ insetInlineStart: `calc(${x * 100}% - ${x * 40}px)` }}>{icon}</span><span className="flag">🏁</span></div>
  );
  const { q } = m;
  return (
    <div className="mcq">
      <div className="race">{bots.map((b, i) => lane(b, L[i], i, false))}{lane(me, '🏎️', 'me', true)}</div>
      <p className="center-text"><b>{p.t('مركزك', 'Position')}: {rank}</b> · {m.i + (m.picked !== null ? 1 : 0)}/{n}</p>
      <div className="q-card">{q.image && <img className="q-img" src={q.image} alt="" />}<h2 className="q-text">{q.question}</h2></div>
      <div className="opts">
        {q.opts.map((o, k) => {
          const st = m.picked === null ? '' : o.ok ? 'right' : m.picked === k ? 'wrong' : 'dim';
          return <button key={k} className={`opt c${k % 6} ${st}`} onClick={() => m.pick(k)} disabled={m.picked !== null}><b>{LET[k]}</b><span>{o.text}</span></button>;
        })}
      </div>
      {m.picked !== null && <FeedbackBar ok={m.good} text={p.s.showFeedback ? q.feedback : ''} onNext={m.next} last={m.last} />}
    </div>
  );
}

/* ---------- من سيربح المليون ---------- */
const PRIZES = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000];
function MillionaireGame(p) {
  const m = useMcq(p);
  const { t } = p;
  const n = m.qs.length;
  const prizes = PRIZES.slice(-Math.min(n, PRIZES.length));
  const [used, setUsed] = useState({});
  const [hidden, setHidden] = useState([]);
  const [info, setInfo] = useState(null);
  useEffect(() => { setHidden([]); setInfo(null); }, [m.i]);
  const { q } = m;
  const correctIdx = q.opts.findIndex((o) => o.ok);

  const life = (kind) => {
    if (used[kind] || m.picked !== null) return;
    setUsed({ ...used, [kind]: true });
    if (kind === 'fifty') setHidden(shuffle(q.opts.map((_, k) => k).filter((k) => k !== correctIdx)).slice(0, Math.max(0, q.opts.length - 2)));
    if (kind === 'audience') {
      const raw = q.opts.map((_, k) => (k === correctIdx ? 45 + Math.random() * 30 : 5 + Math.random() * 20));
      const sum = raw.reduce((a, b) => a + b, 0);
      setInfo({ type: 'audience', v: raw.map((x) => Math.round((x / sum) * 100)) });
    }
    if (kind === 'phone') {
      const right = Math.random() < 0.8;
      const pick = right ? correctIdx : shuffle(q.opts.map((_, k) => k).filter((k) => k !== correctIdx))[0];
      setInfo({ type: 'phone', v: q.opts[pick].text });
    }
  };
  const next = () => (m.picked !== null && !m.good ? p.finish() : m.next());

  return (
    <div className="mill">
      <div className="mill-main">
        <div className="lifelines">
          {[['fifty', '50:50'], ['audience', '👥 ' + t('الجمهور', 'Audience')], ['phone', '📞 ' + t('صديق', 'Friend')]].map(([k, l]) => <button key={k} className="life" disabled={used[k] || m.picked !== null} onClick={() => life(k)}>{l}</button>)}
        </div>
        <div className="mill-q">{q.image && <img className="q-img" src={q.image} alt="" />}<h2>{q.question}</h2></div>
        <div className="mill-opts">
          {q.opts.map((o, k) => {
            const st = m.picked === null ? '' : o.ok ? 'right' : m.picked === k ? 'wrong' : 'dim';
            return <button key={k} className={'mill-opt ' + st} style={{ visibility: hidden.includes(k) ? 'hidden' : 'visible' }} onClick={() => m.pick(k)} disabled={m.picked !== null}><b>{LET[k]}</b>{o.text}{info?.type === 'audience' && <i className="aud" style={{ width: info.v[k] + '%' }}>{info.v[k]}%</i>}</button>;
          })}
        </div>
        {info?.type === 'phone' && <p className="hint-box">📞 {t('صديقك يقول: أظن أن الإجابة', 'Your friend says: I think it is')} «{info.v}»</p>}
        {m.picked !== null && <FeedbackBar ok={m.good} text={!m.good ? t('انتهت اللعبة — الإجابة الصحيحة: ', 'Game over — correct answer: ') + q.opts[correctIdx].text : p.s.showFeedback ? q.feedback : ''} onNext={next} last={m.last || !m.good} nextLabel={!m.good ? t('إنهاء', 'Finish') : undefined} />}
      </div>
      <ol className="ladder" reversed>
        {prizes.map((pr, k) => <li key={k} className={k === m.i ? 'now' : k < m.i ? 'done' : ''}>{k + 1} · {pr.toLocaleString('en')} 💰</li>).reverse()}
      </ol>
    </div>
  );
}

/* ---------- الاختبار السريع ---------- */
function SpeedGame(p) {
  const secs = p.content.seconds || 60;
  const qs = useMemo(() => prepQuestions(p.content, { ...p.s, shuffle: true }), []); // eslint-disable-line
  const [i, setI] = useState(0);
  const [ok, setOk] = useState(0);
  const [flash, setFlash] = useState(null);
  const [left, setLeft] = useState(secs);
  useEffect(() => { const h = setInterval(() => setLeft((x) => x - 1), 1000); return () => clearInterval(h); }, []);
  useEffect(() => { if (left <= 0) p.finish(); }, [left]); // eslint-disable-line
  const q = qs[i];
  const pick = (k) => {
    if (flash) return;
    const g = q.opts[k].ok;
    g ? p.snd.ok() : p.snd.bad();
    const n = ok + (g ? 1 : 0);
    setOk(n); p.report(n, i + 1); setFlash(g ? 'g' : 'b');
    setTimeout(() => { setFlash(null); i + 1 >= qs.length ? p.finish() : setI(i + 1); }, 300);
  };
  useKeys((e) => { if (/^[1-6]$/.test(e.key)) pick(Number(e.key) - 1); }, [i, flash, ok]);
  return (
    <div className="mcq">
      <div className="speed-bar"><div style={{ width: `${(Math.max(0, left) / secs) * 100}%` }} className={left <= 10 ? 'low' : ''} /><span>⏱ {Math.max(0, left)}s · ⭐ {ok}</span></div>
      <div className={'q-card ' + (flash === 'g' ? 'flash-g' : flash === 'b' ? 'flash-b' : '')}><h2 className="q-text">{q.question}</h2></div>
      <div className="opts">{q.opts.map((o, k) => <button key={k} className={`opt c${k % 6}`} onClick={() => pick(k)}><b>{LET[k]}</b><span>{o.text}</span></button>)}</div>
    </div>
  );
}

/* ---------- ملوك المعرفة (فرق على جهاز واحد) ---------- */
const TEAM_COLORS = ['#E5484D', '#2D7BFF', '#19A974', '#F59F00'];
function TriviaShowGame(p) {
  const { t } = p;
  const teams = p.content.teams.slice(0, 4);
  const qs = useMemo(() => prepQuestions(p.content, p.s), []); // eslint-disable-line
  const [i, setI] = useState(0);
  const [scores, setScores] = useState(() => teams.map(() => 0));
  const [buzz, setBuzz] = useState(null);
  const [picked, setPicked] = useState(null);
  const [gain, setGain] = useState(0);
  const t0 = useRef(Date.now());
  const [over, setOver] = useState(false);
  const q = qs[i];
  useEffect(() => { t0.current = Date.now(); }, [i]);

  const doBuzz = (k) => { if (buzz === null && picked === null) { setBuzz(k); p.snd.ok(); t0.current = Date.now() - (Date.now() - t0.current); } };
  useKeys((e) => { if (/^[1-4]$/.test(e.key) && Number(e.key) <= teams.length) doBuzz(Number(e.key) - 1); }, [buzz, picked, i]);
  const pick = (k) => {
    if (picked !== null) return;
    const g = q.opts[k].ok;
    const sec = (Date.now() - t0.current) / 1000;
    const pts = g ? 100 + Math.max(0, Math.round((10 - sec) * 10)) : -50;
    g ? p.snd.ok() : p.snd.bad();
    setPicked(k); setGain(pts);
    setScores((s) => s.map((x, j) => (j === buzz ? x + pts : x)));
  };
  const next = () => { if (i + 1 >= qs.length) setOver(true); else { setI(i + 1); setBuzz(null); setPicked(null); } };

  if (over) {
    const max = Math.max(...scores);
    return (
      <div className="stage-card result">
        <div className="stars">🏆</div>
        <h2>{t('النتيجة النهائية', 'Final standings')}</h2>
        {teams.map((tm, k) => <p key={k} className="team-score" style={{ '--tc': TEAM_COLORS[k] }}><b>{tm}</b> {scores[k]} {scores[k] === max ? '👑' : ''}</p>)}
        <button className="btn primary big" onClick={p.finish}>{t('إنهاء', 'Finish')}</button>
      </div>
    );
  }
  return (
    <div className="mcq">
      <div className="teams">{teams.map((tm, k) => <button key={k} className={'team' + (buzz === k ? ' on' : '')} style={{ '--tc': TEAM_COLORS[k] }} onClick={() => doBuzz(k)} disabled={buzz !== null || picked !== null}><b>{tm}</b><span>{scores[k]}</span><small>[{k + 1}]</small></button>)}</div>
      <ProgressBar value={i} max={qs.length} />
      <div className="q-card"><h2 className="q-text">{q.question}</h2></div>
      {buzz === null ? <p className="center-text muted">{t('اضغط زر فريقك (أو رقمه) للإجابة أولًا!', 'Press your team button (or its number) first!')}</p> : (
        <>
          <p className="center-text"><b style={{ color: TEAM_COLORS[buzz] }}>{teams[buzz]}</b> {t('يجيب', 'is answering')}</p>
          <div className="opts">{q.opts.map((o, k) => { const st = picked === null ? '' : o.ok ? 'right' : picked === k ? 'wrong' : 'dim'; return <button key={k} className={`opt c${k % 6} ${st}`} onClick={() => pick(k)} disabled={picked !== null}><b>{LET[k]}</b><span>{o.text}</span></button>; })}</div>
        </>
      )}
      {picked !== null && <FeedbackBar ok={gain > 0} text={`${gain > 0 ? '+' : ''}${gain} ${t('نقطة', 'pts')}`} onNext={next} last={i + 1 >= qs.length} />}
    </div>
  );
}

/* ---------- الصورة المخبأة ---------- */
function HiddenImageGame(p) {
  const m = useMcq(p);
  const g = Math.min(6, Math.max(2, p.content.grid || 4));
  const cells = g * g;
  const order = useMemo(() => shuffle(Array.from({ length: cells }, (_, k) => k)), [cells]);
  const n = m.qs.length;
  const done = m.picked !== null && m.last;
  const revealed = new Set(order.slice(0, done ? cells : Math.round((cells * m.ok) / n)));
  const { q } = m;
  return (
    <div className="mcq">
      <div className="hidden-img" style={{ '--g': g }}>
        <img src={p.content.image} alt="" />
        <div className="cover">{Array.from({ length: cells }, (_, k) => <i key={k} className={revealed.has(k) ? 'open' : ''} />)}</div>
      </div>
      <ProgressBar value={m.i + (m.picked !== null ? 1 : 0)} max={n} />
      <div className="q-card"><h2 className="q-text">{q.question}</h2></div>
      <div className="opts">{q.opts.map((o, k) => { const st = m.picked === null ? '' : o.ok ? 'right' : m.picked === k ? 'wrong' : 'dim'; return <button key={k} className={`opt c${k % 6} ${st}`} onClick={() => m.pick(k)} disabled={m.picked !== null}><b>{LET[k]}</b><span>{o.text}</span></button>; })}</div>
      {m.picked !== null && <FeedbackBar ok={m.good} text={p.s.showFeedback ? q.feedback : ''} onNext={m.next} last={m.last} />}
    </div>
  );
}

/* ---------- غرفة الهروب ---------- */
function EscapeGame({ content, report, finish, snd, t }) {
  const items = content.items;
  const [i, setI] = useState(0);
  const [val, setVal] = useState('');
  const [hint, setHint] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [ok, setOk] = useState(0);
  const [unlocked, setUnlocked] = useState(0);
  const it = items[i];
  const accepted = [it.answer, ...splitList(it.alternatives)].map(norm);

  const submit = (e) => {
    e.preventDefault();
    if (!val.trim()) return;
    if (accepted.includes(norm(val))) {
      snd.ok();
      const n = ok + (usedHint ? 0 : 1);
      setOk(n); report(n, i + 1); setUnlocked(i + 1);
      if (i + 1 >= items.length) return setTimeout(finish, 900);
      setTimeout(() => { setI(i + 1); setVal(''); setHint(false); setUsedHint(false); }, 700);
    } else { snd.bad(); setWrong(true); setTimeout(() => setWrong(false), 500); }
  };
  return (
    <div className="escape">
      {i === 0 && unlocked === 0 && content.intro && <p className="hint-box">{content.intro}</p>}
      <div className="locks">{items.map((_, k) => <span key={k} className={k < unlocked ? 'open' : k === i ? 'cur' : ''}>{k < unlocked ? '🔓' : '🔒'}</span>)}</div>
      <div className="q-card esc-card">
        {it.scene && <p className="muted">🚪 {it.scene}</p>}
        <h2 className="q-text">{it.question}</h2>
      </div>
      <form className={'riddle-form' + (wrong ? ' shake' : '')} onSubmit={submit}>
        <input value={val} onChange={(e) => setVal(e.target.value)} placeholder={t('اكتب الرمز أو الإجابة', 'Type the code or answer')} autoFocus disabled={unlocked > i} aria-label="answer" />
        <button className="btn primary" disabled={!val.trim() || unlocked > i}>🔑 {t('افتح', 'Unlock')}</button>
      </form>
      {wrong && <p className="bad-text center-text">{t('القفل لم ينفتح. حاول مجددًا!', 'The lock did not open. Try again!')}</p>}
      {hint && it.hint && <p className="hint-box">💡 {it.hint}</p>}
      {it.hint && !hint && <div className="row center"><button className="btn" onClick={() => { setHint(true); setUsedHint(true); }}>💡 {t('تلميح (لا يحتسب نقطة)', 'Hint (no point)')}</button></div>}
    </div>
  );
}

/* ---------- الصورة + النقاط (خريطة) ---------- */
function useClickPos() {
  const ref = useRef(null);
  const pos = (e) => { const r = ref.current.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, w: r.width, h: r.height }; };
  return [ref, pos];
}
const near = (a, b, c, rad = 0.08) => Math.hypot(((a - c.x) / 100) * c.w, ((b - c.y) / 100) * c.h) <= rad * c.w;

function MapQuizGame({ content, report, finish, snd, t }) {
  const pts = useMemo(() => shuffle(content.points), []); // eslint-disable-line
  const [i, setI] = useState(0);
  const [res, setRes] = useState(null);
  const [ok, setOk] = useState(0);
  const [ref, pos] = useClickPos();
  const target = pts[i];
  const click = (e) => {
    if (res) return;
    const c = pos(e);
    const good = near(target.x, target.y, c);
    good ? snd.ok() : snd.bad();
    setRes({ good, x: c.x, y: c.y });
    const n = ok + (good ? 1 : 0); setOk(n); report(n, i + 1);
  };
  const next = () => { if (i + 1 >= pts.length) return finish(); setI(i + 1); setRes(null); };
  return (
    <div className="mcq">
      <ProgressBar value={i + (res ? 1 : 0)} max={pts.length} />
      <div className="q-card"><h2 className="q-text">{t('اضغط على:', 'Tap on:')} {target.name}</h2></div>
      <div className="map" ref={ref} onClick={click}>
        <img src={content.image} alt="" draggable="false" />
        {res && <><span className="pin guess" style={{ left: res.x + '%', top: res.y + '%' }}>{res.good ? '✅' : '❌'}</span>{!res.good && <span className="pin target" style={{ left: target.x + '%', top: target.y + '%' }}>📍</span>}</>}
      </div>
      {res && <FeedbackBar ok={res.good} text={res.good ? '' : t('الموقع الصحيح موضّح بالدبوس', 'The correct spot is pinned')} onNext={next} last={i + 1 >= pts.length} />}
    </div>
  );
}

function HotspotsGame({ content, finish, t }) {
  const [sel, setSel] = useState(null);
  const [seen, setSeen] = useState(() => new Set());
  const p = sel !== null ? content.points[sel] : null;
  return (
    <div className="mcq">
      <p className="muted center-text">{t('اضغط النقاط لتقرأ المعلومات', 'Tap the hotspots to read more')} ({seen.size}/{content.points.length})</p>
      <div className="map">
        <img src={content.image} alt="" draggable="false" />
        {content.points.map((pt, k) => <button key={k} className={'pin hot' + (sel === k ? ' on' : '') + (seen.has(k) ? ' seen' : '')} style={{ left: pt.x + '%', top: pt.y + '%' }} onClick={() => { setSel(k); setSeen(new Set(seen).add(k)); }} aria-label={pt.title}>{k + 1}</button>)}
      </div>
      {p && <div className="q-card"><h3>{p.title}</h3><p>{p.info}</p></div>}
      <div className="row center"><button className="btn primary" onClick={finish}>{t('إنهاء', 'Finish')}</button></div>
    </div>
  );
}

export const extra1 = {
  vocab: VocabGame, oddone: OddOneGame, pattern: PatternGame, truthslie: TruthLieGame, racing: RacingGame, millionaire: MillionaireGame,
  speedtest: SpeedGame, triviashow: TriviaShowGame, hiddenimage: HiddenImageGame, escape: EscapeGame, mapquiz: MapQuizGame, hotspots: HotspotsGame,
};
