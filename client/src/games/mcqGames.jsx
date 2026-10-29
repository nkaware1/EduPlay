import { useEffect, useMemo, useState } from 'react';
import { shuffle } from '../lib/text.js';
import { FeedbackBar, ProgressBar, VideoEmbed, useKeys } from './common.jsx';

const LETTERS = { ar: ['أ', 'ب', 'ج', 'د', 'هـ', 'و'], en: ['A', 'B', 'C', 'D', 'E', 'F'] };

// محرّك مشترك لكل ألعاب الأسئلة (اختيار من متعدد، النجوم، الضفدع، الفيديو، صح/خطأ)
export function prepQuestions(content, s, shuffleOptions = true) {
  const base = content.questions.map((q) => ({ ...q, opts: q.options.map((text, k) => ({ text, ok: k === q.answer })) }));
  const ordered = s.shuffle ? shuffle(base) : base;
  return ordered.map((q) => ({ ...q, opts: s.shuffle && shuffleOptions ? shuffle(q.opts) : q.opts }));
}

export function useMcq({ content, s, report, finish, snd }, { shuffleOptions = true } = {}) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const qs = useMemo(() => prepQuestions(content, s, shuffleOptions), []);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [ok, setOk] = useState(0);
  const q = qs[i];
  const good = picked !== null && q.opts[picked].ok;
  const last = i + 1 >= qs.length;

  const pick = (k) => {
    if (picked !== null || !q.opts[k]) return;
    const g = q.opts[k].ok;
    setPicked(k);
    g ? snd.ok() : snd.bad();
    const n = ok + (g ? 1 : 0);
    setOk(n);
    report(n, i + 1);
  };
  const next = () => {
    if (last) finish();
    else { setI(i + 1); setPicked(null); }
  };
  useKeys((e) => {
    if (/^[1-6]$/.test(e.key)) pick(Number(e.key) - 1);
    else if ((e.key === 'Enter' || e.key === ' ') && picked !== null) { e.preventDefault(); next(); }
  }, [picked, i, ok]);
  return { qs, i, q, picked, pick, next, ok, good, last };
}

export function QuizGame(p) {
  const m = useMcq(p);
  const { q } = m;
  const L = LETTERS[p.lang] || LETTERS.ar;
  return (
    <div className="mcq">
      <ProgressBar value={m.i + (m.picked !== null ? 1 : 0)} max={m.qs.length} />
      <div className="q-card">
        {q.image && <img className="q-img" src={q.image} alt="" />}
        <h2 className="q-text">{q.question}</h2>
      </div>
      <div className="opts">
        {q.opts.map((o, k) => {
          const st = m.picked === null ? '' : o.ok ? 'right' : m.picked === k ? 'wrong' : 'dim';
          return (
            <button key={k} className={`opt c${k % 6} ${st}`} onClick={() => m.pick(k)} disabled={m.picked !== null}>
              <b>{L[k]}</b><span>{o.text}</span>
            </button>
          );
        })}
      </div>
      {m.picked !== null && <FeedbackBar ok={m.good} text={p.s.showFeedback ? q.feedback : ''} onNext={m.next} last={m.last} />}
    </div>
  );
}

function VideoQuizGame(p) {
  return (
    <div>
      <VideoEmbed url={p.content.videoUrl} />
      <QuizGame {...p} />
    </div>
  );
}

function AsterGame(p) {
  const m = useMcq(p);
  const [lives, setLives] = useState(3);
  const { q } = m;
  const pick = (k) => {
    if (m.picked !== null) return;
    if (!q.opts[k].ok) setLives((l) => l - 1);
    m.pick(k);
  };
  useEffect(() => {
    if (lives > 0) return;
    const h = setTimeout(p.finish, 1100);
    return () => clearTimeout(h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lives]);
  return (
    <div className="space">
      <div className="space-top">
        <span className="lives" aria-label="lives">{'❤️'.repeat(Math.max(0, lives))}{'🖤'.repeat(Math.max(0, 3 - lives))}</span>
        <ProgressBar value={m.i + (m.picked !== null ? 1 : 0)} max={m.qs.length} />
      </div>
      <div className="space-q">
        {q.image && <img className="q-img" src={q.image} alt="" />}
        <h2>{q.question}</h2>
      </div>
      <div className="asteroids">
        {q.opts.map((o, k) => {
          const st = m.picked === null ? '' : o.ok ? 'blasted' : m.picked === k ? 'hit' : 'fade';
          return <button key={k} className={`asteroid a${k % 6} ${st}`} onClick={() => pick(k)} disabled={m.picked !== null}><span>{o.text}</span></button>;
        })}
      </div>
      <div className={'ship ' + (m.picked !== null && m.good ? 'fire' : m.picked !== null ? 'shake' : '')}>🚀</div>
      {lives <= 0 && <div className="space-over">{p.t('انتهت المحاولات! 💥', 'Out of lives! 💥')}</div>}
      {m.picked !== null && lives > 0 && <FeedbackBar ok={m.good} text={p.s.showFeedback ? q.feedback : ''} onNext={m.next} last={m.last} />}
    </div>
  );
}

function FroggyGame(p) {
  const m = useMcq(p);
  const n = m.qs.length;
  const { q } = m;
  const L = LETTERS[p.lang] || LETTERS.ar;
  const pos = (k) => `${(k / n) * 100}%`;
  return (
    <div className="froggy">
      <div className="pond">
        <div className="pond-track">
          {Array.from({ length: n + 1 }, (_, k) => <span key={k} className="pad" style={{ insetInlineStart: pos(k) }}>{k === n ? '🏁' : ''}</span>)}
          <span className={'frog' + (m.picked !== null && !m.good ? ' splash' : '')} style={{ insetInlineStart: pos(m.ok) }}>🐸</span>
        </div>
      </div>
      <div className="q-card">
        {q.image && <img className="q-img" src={q.image} alt="" />}
        <h2 className="q-text">{q.question}</h2>
      </div>
      <div className="opts">
        {q.opts.map((o, k) => {
          const st = m.picked === null ? '' : o.ok ? 'right' : m.picked === k ? 'wrong' : 'dim';
          return <button key={k} className={`opt c${k % 6} ${st}`} onClick={() => m.pick(k)} disabled={m.picked !== null}><b>{L[k]}</b><span>{o.text}</span></button>;
        })}
      </div>
      {m.picked !== null && <FeedbackBar ok={m.good} text={p.s.showFeedback ? q.feedback : ''} onNext={m.next} last={m.last} />}
    </div>
  );
}

function TrueFalseGame(p) {
  const { t } = p;
  const adapted = useMemo(() => ({
    questions: p.content.statements.map((x) => ({ question: x.text, options: [t('صح', 'True'), t('خطأ', 'False')], answer: x.answer ? 0 : 1, feedback: x.feedback })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);
  const m = useMcq({ ...p, content: adapted }, { shuffleOptions: false });
  const { q } = m;
  return (
    <div className="mcq">
      <ProgressBar value={m.i + (m.picked !== null ? 1 : 0)} max={m.qs.length} />
      <div className="q-card"><h2 className="q-text">{q.question}</h2></div>
      <div className="tf">
        {q.opts.map((o, k) => {
          const st = m.picked === null ? '' : o.ok ? 'right' : m.picked === k ? 'wrong' : 'dim';
          return <button key={k} className={`tf-btn ${k === 0 ? 'yes' : 'no'} ${st}`} onClick={() => m.pick(k)} disabled={m.picked !== null}><span>{k === 0 ? '✔' : '✘'}</span>{o.text}</button>;
        })}
      </div>
      {m.picked !== null && <FeedbackBar ok={m.good} text={p.s.showFeedback ? q.feedback : ''} onNext={m.next} last={m.last} />}
    </div>
  );
}

export const quizGames = { quiz: QuizGame, asterquiz: AsterGame, froggy: FroggyGame, videoquiz: VideoQuizGame, truefalse: TrueFalseGame };
