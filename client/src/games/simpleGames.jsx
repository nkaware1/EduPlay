import { useEffect, useMemo, useRef, useState } from 'react';
import { norm, shuffle } from '../lib/text.js';
import { FeedbackBar, ProgressBar, speak, useKeys } from './common.jsx';

/* ---------- الألغاز ---------- */
function RiddleGame({ content, s, report, finish, snd, t }) {
  const items = useMemo(() => (s.shuffle ? shuffle(content.items) : content.items), []); // eslint-disable-line
  const [i, setI] = useState(0);
  const [val, setVal] = useState('');
  const [tries, setTries] = useState(0);
  const [hint, setHint] = useState(false);
  const [status, setStatus] = useState(null);
  const [ok, setOk] = useState(0);
  const it = items[i];
  const last = i + 1 >= items.length;
  const accepted = [it.answer, ...String(it.alternatives || '').split(/[,،]/)].map(norm).filter(Boolean);

  const check = (e) => {
    e?.preventDefault();
    if (!val.trim() || status) return;
    if (accepted.includes(norm(val))) {
      snd.ok(); setStatus('right');
      const n = ok + 1; setOk(n); report(n, i + 1);
    } else {
      snd.bad();
      const tr = tries + 1; setTries(tr);
      if (tr >= 3) { setStatus('reveal'); report(ok, i + 1); }
    }
  };
  const reveal = () => { setStatus('reveal'); report(ok, i + 1); };
  const next = () => {
    if (last) return finish();
    setI(i + 1); setVal(''); setTries(0); setHint(false); setStatus(null);
  };

  return (
    <div className="mcq">
      <ProgressBar value={i + (status ? 1 : 0)} max={items.length} />
      <div className="q-card riddle"><div className="riddle-mark">❓</div><h2 className="q-text">{it.question}</h2></div>
      <form className="riddle-form" onSubmit={check}>
        <input value={val} onChange={(e) => setVal(e.target.value)} disabled={!!status} placeholder={t('اكتب إجابتك هنا', 'Type your answer')} autoFocus aria-label="answer" />
        <button className="btn primary" disabled={!!status || !val.trim()}>{t('تحقق', 'Check')}</button>
      </form>
      {!status && tries > 0 && <p className="bad-text">{t('ليست الإجابة الصحيحة، حاول مرة أخرى.', 'Not quite — try again.')} ({3 - tries} {t('محاولات متبقية', 'tries left')})</p>}
      {hint && it.hint && <p className="hint-box">💡 {it.hint}</p>}
      {!status && (
        <div className="row center">
          {it.hint && !hint && <button className="btn" onClick={() => setHint(true)}>💡 {t('تلميح', 'Hint')}</button>}
          <button className="btn ghost" onClick={reveal}>{t('أظهر الإجابة', 'Show answer')}</button>
        </div>
      )}
      {status && (
        <FeedbackBar ok={status === 'right'} text={status === 'reveal' ? `${t('الإجابة', 'Answer')}: ${it.answer}` : ''} onNext={next} last={last} />
      )}
    </div>
  );
}

/* ---------- البطاقات التعليمية ---------- */
function FlashcardsGame({ content, s, finish, t }) {
  const cards = useMemo(() => (s.shuffle ? shuffle(content.cards) : content.cards), []); // eslint-disable-line
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const [known, setKnown] = useState(0);
  const c = cards[i];
  const go = (k) => {
    if (k) setKnown((x) => x + 1);
    if (i + 1 >= cards.length) finish();
    else { setI(i + 1); setFlip(false); }
  };
  useKeys((e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlip((f) => !f); } }, []);
  return (
    <div className="mcq">
      <ProgressBar value={i} max={cards.length} />
      <button className={'flip' + (flip ? ' on' : '')} onClick={() => setFlip(!flip)} aria-label={t('اقلب البطاقة', 'Flip card')}>
        <div className="flip-in">
          <div className="face front"><span>{c.front}</span><small>{t('اضغط للقلب', 'Tap to flip')}</small></div>
          <div className="face back"><span>{c.back}</span></div>
        </div>
      </button>
      <div className="row center">
        <button className="btn danger-soft" disabled={!flip} onClick={() => go(false)}>🤔 {t('لم أعرفها', "Didn't know")}</button>
        <button className="btn ok-soft" disabled={!flip} onClick={() => go(true)}>😀 {t('عرفتها', 'Knew it')}</button>
      </div>
      <p className="muted center-text">{t('عرفتَ', 'Known')}: {known}</p>
    </div>
  );
}

/* ---------- عرض الشرائح ---------- */
function SlideshowGame({ content, finish, t }) {
  const slides = content.slides;
  const [i, setI] = useState(0);
  const sl = slides[i];
  const rtl = document.documentElement.dir === 'rtl';
  const prev = () => setI((x) => Math.max(0, x - 1));
  const next = () => (i + 1 >= slides.length ? finish() : setI(i + 1));
  useKeys((e) => {
    if (e.key === 'ArrowLeft') (rtl ? next : prev)();
    if (e.key === 'ArrowRight') (rtl ? prev : next)();
  }, [i]);
  return (
    <div className="slide-wrap">
      <div className="slide">
        {sl.image && <img src={sl.image} alt="" />}
        <div className="slide-text">
          {sl.title && <h2>{sl.title}</h2>}
          {sl.text && <p>{sl.text}</p>}
        </div>
      </div>
      <div className="dots">{slides.map((_, k) => <button key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`slide ${k + 1}`} />)}</div>
      <div className="row center">
        <button className="btn" onClick={prev} disabled={i === 0}>{t('السابق', 'Previous')}</button>
        <button className="btn primary" onClick={next}>{i + 1 >= slides.length ? t('إنهاء', 'Finish') : t('التالي', 'Next')}</button>
      </div>
    </div>
  );
}

/* ---------- الحوار ---------- */
function DialogueGame({ content, s, report, finish, snd, t }) {
  const steps = content.steps;
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [log, setLog] = useState([{ who: 'p', text: steps[0].line }]);
  const [ok, setOk] = useState(0);
  const endRef = useRef(null);
  const st = steps[i];
  const shown = useMemo(() => (s.shuffle ? shuffle(st.choices) : st.choices), [i]); // eslint-disable-line
  const last = i + 1 >= steps.length;
  const partner = content.partner || t('المحاور', 'Partner');
  const you = content.you || t('أنت', 'You');

  const pick = (c) => {
    if (picked) return;
    setPicked(c);
    const g = !!c.correct;
    g ? snd.ok() : snd.bad();
    const n = ok + (g ? 1 : 0); setOk(n); report(n, i + 1);
    setLog((l) => [...l, { who: 'u', text: c.text, good: g }, ...(st.response ? [{ who: 'p', text: st.response }] : [])]);
  };
  const next = () => {
    if (last) return finish();
    setLog((l) => [...l, { who: 'p', text: steps[i + 1].line }]);
    setI(i + 1); setPicked(null);
  };
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [log]);

  return (
    <div className="dialogue">
      <ProgressBar value={i + (picked ? 1 : 0)} max={steps.length} />
      <div className="chat">
        {log.map((m, k) => (
          <div key={k} className={`bubble ${m.who} ${m.good === true ? 'good' : m.good === false ? 'bad' : ''}`}>
            <small>{m.who === 'p' ? partner : you}</small>
            <span>{m.text}</span>
            {m.who === 'p' && <button className="icon-btn" aria-label="listen" onClick={() => speak(m.text, /[a-z]/i.test(m.text) && !/[\u0600-\u06FF]/.test(m.text) ? 'en' : 'ar')}>🔊</button>}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {!picked ? (
        <div className="choices">{shown.map((c, k) => <button key={k} className="btn choice" onClick={() => pick(c)}>{c.text}</button>)}</div>
      ) : (
        <FeedbackBar ok={!!picked.correct} text={!picked.correct ? `${t('الرد المناسب', 'Best reply')}: ${st.choices.find((c) => c.correct)?.text}` : ''} onNext={next} last={last} />
      )}
    </div>
  );
}

/* ---------- العجلة العشوائية ---------- */
const pt = (deg, r) => { const a = (deg * Math.PI) / 180; return [Math.sin(a) * r, -Math.cos(a) * r]; };

function WheelGame({ content, finish, t }) {
  const [items, setItems] = useState(content.items);
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [remove, setRemove] = useState(false);
  const n = items.length;
  const seg = 360 / Math.max(1, n);

  const spin = () => {
    if (spinning || n < 1) return;
    setWinner(null); setSpinning(true);
    const target = rot + 360 * 5 + Math.random() * 360;
    const rm = remove;
    const snapshot = items;
    setRot(target);
    setTimeout(() => {
      const angle = (360 - (target % 360)) % 360;
      const idx = Math.floor(angle / seg) % snapshot.length;
      setWinner(snapshot[idx]);
      setSpinning(false);
      if (rm && snapshot.length > 1) setItems(snapshot.filter((_, k) => k !== idx));
    }, 4200);
  };

  return (
    <div className="wheel-wrap">
      <div className="wheel">
        <svg viewBox="-115 -118 230 230" role="img" aria-label="wheel">
          <g style={{ transform: `rotate(${rot}deg)`, transition: spinning ? 'transform 4s cubic-bezier(.12,.7,.1,1)' : 'none' }}>
            {n === 1 ? <circle r="100" fill="hsl(200 75% 60%)" /> : items.map((_, k) => {
              const [x0, y0] = pt(k * seg, 100), [x1, y1] = pt((k + 1) * seg, 100);
              return <path key={k} d={`M0 0 L${x0} ${y0} A100 100 0 ${seg > 180 ? 1 : 0} 1 ${x1} ${y1} Z`} fill={`hsl(${(k * 360) / n + 10} 78% 62%)`} stroke="#fff" strokeWidth="1.5" />;
            })}
            {items.map((it, k) => (
              <text key={k} transform={`rotate(${k * seg + seg / 2}) translate(0,-58)`} textAnchor="middle" fontSize={n > 14 ? 6 : n > 8 ? 8 : 10} fontWeight="700" fill="#1b1b3a">
                {String(it).length > 14 ? String(it).slice(0, 13) + '…' : it}
              </text>
            ))}
            <circle r="9" fill="#fff" stroke="#1b1b3a" strokeWidth="2" />
          </g>
          <polygon points="-9,-114 9,-114 0,-94" fill="#1b1b3a" />
        </svg>
      </div>
      <div className="wheel-side">
        <button className="btn primary big" onClick={spin} disabled={spinning}>{spinning ? t('تدور…', 'Spinning…') : '🎡 ' + t('أدر العجلة', 'Spin')}</button>
        <label className="check"><input type="checkbox" checked={remove} onChange={(e) => setRemove(e.target.checked)} /> {t('إزالة العنصر بعد اختياره', 'Remove item after it is picked')}</label>
        {winner !== null && <div className="winner" role="status">🎉 {winner}</div>}
        <button className="btn ghost small" onClick={finish}>{t('إنهاء', 'Done')}</button>
      </div>
    </div>
  );
}

/* ---------- الإملاء ---------- */
function DictationGame({ content, s, report, finish, snd, t }) {
  const items = useMemo(() => (s.shuffle ? shuffle(content.items) : content.items), []); // eslint-disable-line
  const [i, setI] = useState(0);
  const [val, setVal] = useState('');
  const [res, setRes] = useState(null);
  const [ok, setOk] = useState(0);
  const [noTts, setNoTts] = useState(false);
  const audio = useRef(null);
  const it = items[i];
  const last = i + 1 >= items.length;

  const play = () => {
    if (it.audioUrl && audio.current) { audio.current.src = it.audioUrl; audio.current.play().catch(() => {}); }
    else if (!speak(it.text, it.lang)) setNoTts(true);
  };
  const check = (e) => {
    e.preventDefault();
    if (res || !val.trim()) return;
    const g = norm(val) === norm(it.text);
    g ? snd.ok() : snd.bad();
    setRes({ good: g });
    const n = ok + (g ? 1 : 0); setOk(n); report(n, i + 1);
  };
  const next = () => { if (last) return finish(); setI(i + 1); setVal(''); setRes(null); };

  return (
    <div className="mcq">
      <ProgressBar value={i + (res ? 1 : 0)} max={items.length} />
      <div className="q-card dict">
        <button className="listen" onClick={play} aria-label={t('استمع', 'Listen')}>🔊</button>
        <p className="muted">{t('اضغط للاستماع ثم اكتب ما سمعته', 'Press to listen, then type what you heard')}</p>
        {noTts && <p className="bad-text">{t('متصفحك لا يدعم النطق الصوتي.', 'Your browser has no speech support.')}</p>}
        <audio ref={audio} hidden />
      </div>
      <form className="riddle-form" onSubmit={check}>
        <input value={val} onChange={(e) => setVal(e.target.value)} disabled={!!res} dir={it.lang === 'en' ? 'ltr' : 'rtl'} placeholder={t('اكتب هنا', 'Type here')} aria-label="dictation" />
        <button className="btn primary" disabled={!!res || !val.trim()}>{t('تحقق', 'Check')}</button>
      </form>
      {res && <FeedbackBar ok={res.good} text={res.good ? '' : `${t('الصحيح', 'Correct')}: ${it.text}`} onNext={next} last={last} />}
    </div>
  );
}

export const simpleGames = { riddle: RiddleGame, flashcards: FlashcardsGame, slideshow: SlideshowGame, dialogue: DialogueGame, wheel: WheelGame, dictation: DictationGame };
