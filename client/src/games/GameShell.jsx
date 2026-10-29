import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { sfx } from '../lib/sfx.js';
import { fmtTime } from '../lib/text.js';
import { TEMPLATE_MAP } from '../templates/meta.js';
import { ErrorBoundary } from '../ui.jsx';
import { players } from './index.js';

const DEFAULTS = { timeLimit: 0, maxAttempts: 0, shuffle: true, showFeedback: true, sound: true, requireName: false, mode: 'practice', color: '' };

// غلاف مشترك لكل الألعاب: شاشة البداية، المؤقت، التقدم، النتيجة، إعادة اللعب، حفظ النتيجة
export default function GameShell({ activity, preview: previewProp = false, standalone = false }) {
  const preview = previewProp || standalone; // لا اتصال بالخادم في المعاينة أو النسخة المستقلة
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const meta = TEMPLATE_MAP[activity.type];
  const Game = players[activity.type];
  const s = useMemo(() => ({ ...DEFAULTS, ...(activity.settings || {}) }), [activity.settings]);
  const total = meta ? meta.count(activity.content) : 0;

  const [phase, setPhase] = useState('intro');
  const [run, setRun] = useState(0);
  const [name, setName] = useState(user?.name || '');
  const [prog, setProg] = useState({ correct: 0, answered: 0 });
  const [left, setLeft] = useState(s.timeLimit);
  const [saveState, setSaveState] = useState(null);
  const [attempts, setAttempts] = useState(null);
  const [duration, setDuration] = useState(0);
  const progRef = useRef(prog);
  const startRef = useRef(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const needName = !user && (s.requireName || s.mode === 'homework') && meta?.graded;

  useEffect(() => {
    setAttempts(null);
    if (preview || !s.maxAttempts || !meta?.graded) return;
    api.get(`/activities/${activity.id}/attempts?name=${encodeURIComponent(name)}`).then(setAttempts).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity.id, user?.id, phase === 'intro' ? name : '']);

  const report = useCallback((correct, answered) => {
    progRef.current = { correct, answered };
    setProg({ correct, answered });
  }, []);

  const finish = useCallback(() => {
    if (phaseRef.current !== 'play') return;
    phaseRef.current = 'done';
    const dur = Math.round((Date.now() - startRef.current) / 1000);
    setDuration(dur);
    setPhase('done');
    const { correct } = progRef.current;
    if (s.sound && total && correct / total >= 0.7) sfx.win();
    if (!preview && meta?.graded && total) {
      setSaveState('saving');
      api.post('/results', { activityId: activity.id, studentName: name || t('زائر', 'Guest'), score: correct, total, durationSec: dur })
        .then(() => setSaveState('ok')).catch((e) => setSaveState(e.message || 'err'));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity.id, name, total, preview, s.sound]);

  useEffect(() => {
    if (phase !== 'play' || !s.timeLimit) return;
    const h = setInterval(() => setLeft((x) => x - 1), 1000);
    return () => clearInterval(h);
  }, [phase, s.timeLimit, run]);
  useEffect(() => { if (phase === 'play' && s.timeLimit && left <= 0) finish(); }, [left, phase, s.timeLimit, finish]);

  const start = () => {
    progRef.current = { correct: 0, answered: 0 };
    setProg({ correct: 0, answered: 0 });
    setLeft(s.timeLimit);
    setSaveState(null);
    startRef.current = Date.now();
    phaseRef.current = 'play';
    setRun((r) => r + 1);
    setPhase('play');
  };

  const snd = useMemo(() => ({ ok: () => s.sound && sfx.ok(), bad: () => s.sound && sfx.bad() }), [s.sound]);
  const accent = s.color || meta?.color || '#6C4CF1';
  const outOfAttempts = attempts && attempts.max > 0 && attempts.used >= attempts.max;
  const pct = total ? Math.round((prog.correct / total) * 100) : 0;

  if (!meta || !Game) return <div className="error-box">⚠️ {t('قالب غير معروف', 'Unknown template')}</div>;

  return (
    <div className="stage" style={{ '--accent': accent }}>
      {phase === 'intro' && (
        <div className="stage-card intro">
          <div className="intro-icon">{meta.icon}</div>
          <h1>{activity.title || t('نشاط بدون عنوان', 'Untitled activity')}</h1>
          {activity.description && <p className="muted">{activity.description}</p>}
          <p className="how">{lang === 'en' ? meta.howEn : meta.howAr}</p>
          <div className="chips">
            <span className="chip">{lang === 'en' ? meta.en : meta.ar}</span>
            {total > 0 && <span className="chip">{total} {t('عنصر', 'items')}</span>}
            {s.timeLimit > 0 && <span className="chip">⏱ {fmtTime(s.timeLimit)}</span>}
            {s.maxAttempts > 0 && <span className="chip">{t('المحاولات', 'Attempts')}: {attempts ? `${attempts.used}/${s.maxAttempts}` : s.maxAttempts}</span>}
            {s.mode === 'homework' && <span className="chip warm">📚 {t('واجب منزلي', 'Homework')}</span>}
          </div>
          {needName && (
            <label className="field">
              <span>{t('اسمك', 'Your name')}</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={t('اكتب اسمك قبل البدء', 'Enter your name to begin')} />
            </label>
          )}
          {total === 0 && <div className="error-box">{t('لا توجد عناصر في هذا النشاط بعد.', 'This activity has no items yet.')}</div>}
          {outOfAttempts && <div className="error-box">{t('استنفدت عدد المحاولات المسموح بها.', 'You have used all your attempts.')}</div>}
          <button className="btn primary big" disabled={total === 0 || outOfAttempts || (needName && !name.trim())} onClick={start}>
            ▶ {t('ابدأ اللعب', 'Start')}
          </button>
        </div>
      )}

      {phase === 'play' && (
        <div className="stage-play">
          <div className="play-bar">
            <span className="chip">{meta.icon} {lang === 'en' ? meta.en : meta.ar}</span>
            {meta.graded && <span className="chip score">⭐ {prog.correct}/{total}</span>}
            {s.timeLimit > 0 && <span className={'chip timer' + (left <= 10 ? ' low' : '')}>⏱ {fmtTime(Math.max(0, left))}</span>}
            <button className="btn small ghost" onClick={finish}>{t('إنهاء', 'End')}</button>
          </div>
          <ErrorBoundary key={run}>
            <Game key={run} content={activity.content} s={s} report={report} finish={finish} snd={snd} lang={lang} t={t} activityId={activity.id} offline={preview} templateId={activity.type} />
          </ErrorBoundary>
        </div>
      )}

      {phase === 'done' && (
        <div className="stage-card result">
          {meta.graded && total ? (
            <>
              <div className="stars">{pct >= 80 ? '🌟🌟🌟' : pct >= 50 ? '⭐⭐' : '⭐'}</div>
              <h1>{pct >= 80 ? t('ممتاز!', 'Excellent!') : pct >= 50 ? t('أحسنت!', 'Well done!') : t('حاول مرة أخرى', 'Try again')}</h1>
              <div className="big-score" aria-label={`${pct}%`}>{pct}%</div>
              <p className="muted">{t('الإجابات الصحيحة', 'Correct')}: {prog.correct} {t('من', 'of')} {total} · ⏱ {fmtTime(duration)}</p>
            </>
          ) : (
            <>
              <div className="stars">🎉</div>
              <h1>{t('أنهيت النشاط', 'Activity complete')}</h1>
            </>
          )}
          {saveState === 'saving' && <p className="muted">{t('جارٍ حفظ النتيجة…', 'Saving result…')}</p>}
          {saveState === 'ok' && <p className="ok-text">✅ {t('تم حفظ نتيجتك', 'Your result was saved')}</p>}
          {saveState && !['saving', 'ok'].includes(saveState) && <p className="bad-text">⚠️ {saveState}</p>}
          {preview && meta.graded && <p className="muted">{standalone ? t('(نسخة مستقلة: النتيجة تظهر لك فقط ولا تُرسل لأي خادم)', '(Standalone copy: the result is not sent anywhere)') : t('(معاينة: لا تُحفظ النتيجة)', '(Preview: results are not saved)')}</p>}
          <div className="row center">
            <button className="btn primary big" onClick={start} disabled={outOfAttempts}>↻ {t('إعادة اللعب', 'Play again')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
