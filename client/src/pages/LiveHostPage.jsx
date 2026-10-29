import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';
import { Logo } from '../Layout.jsx';
import { SHAPES, emit, joinUrl, useLiveSocket, useServerClock } from '../lib/live.js';
import { TEMPLATE_MAP } from '../templates/meta.js';
import { ErrorBox, Spinner, useConfirm, useFetch, useToast } from '../ui.jsx';

const MODE_LABEL = {
  quiz: ['مسابقة مباشرة (الكل يجيب معًا)', 'Live quiz (everyone answers together)'],
  race: ['سباق (كل لاعب بسرعته)', 'Race (each at their own pace)'],
  poll: ['تصويت حي', 'Live poll'], board: ['لوحة عصف ذهني مشتركة', 'Shared brainstorm board'],
};

const Podium = ({ list, t }) => (
  <div className="podium">
    {[1, 0, 2].map((i) => list[i] && <div key={i} className={'pod p' + (i + 1)}><span className="medal">{['🥇', '🥈', '🥉'][i]}</span><b>{list[i].name}</b><small>{list[i].score}</small><i style={{ height: [150, 110, 80][i] }} /></div>)}
    {!list.length && <p className="muted">{t('لا يوجد لاعبون', 'No players')}</p>}
  </div>
);

function Board({ list, t, goal }) {
  return <ol className="lb">{list.map((p, i) => <li key={p.id}><span>{i + 1}</span><b>{p.name}</b><em>{goal ? `${p.score}/${goal}` : p.score}</em></li>)}</ol>;
}

function LiveShell({ a, meta, view, connected, t, onEnd, children }) {
  return (
    <div className="live-screen">
      <header className="live-top"><Logo />
        <span className="chip">{meta.icon} {a.title}</span>
        {view && <span className="chip pinchip">PIN <b>{view.pin}</b></span>}
        {view && !connected && <span className="chip warm">⚠ {t('جارٍ إعادة الاتصال…', 'Reconnecting…')}</span>}
        <span className="grow" />
        {view && <button className="btn small danger-soft" onClick={onEnd}>{t('إنهاء الجلسة', 'End session')}</button>}
        {!view && <Link className="btn small" to={`/activity/${a.id}`}>{t('رجوع', 'Back')}</Link>}
      </header>{children}</div>
  );
}

export default function LiveHostPage() {
  const { activityId } = useParams();
  const { t, lang } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const { connect, connected } = useLiveSocket();
  const act = useFetch(() => api.get('/activities/' + activityId), [activityId]);
  const modes = useFetch(() => api.get('/live/modes'), []);
  const [view, setView] = useState(null);
  const [err, setErr] = useState('');
  const [closed, setClosed] = useState(null);
  const [opts, setOpts] = useState({ mode: '', limit: 20, goal: 10, anonymous: false });
  const [qr, setQr] = useState('');
  const sockRef = useRef(null);
  const now = useServerClock(view);
  const key = `live_host_${activityId}`;

  const bind = (s) => {
    s.off('room:update'); s.off('room:closed');
    s.on('room:update', setView);
    s.on('room:closed', (d) => { sessionStorage.removeItem(key); setClosed(d); });
    sockRef.current = s;
  };
  // استئناف جلسة قائمة بعد تحديث الصفحة أو انقطاع الاتصال
  useEffect(() => {
    const pin = sessionStorage.getItem(key);
    if (!pin) return;
    const s = connect(); bind(s);
    const resume = () => emit(s, 'host:resume', { pin }).then((r) => { if (!r.ok) sessionStorage.removeItem(key); });
    if (s.connected) resume(); else s.once('connect', resume);
    s.on('connect', resume);
    return () => s.off('connect', resume);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (view?.pin) QRCode.toDataURL(joinUrl(view.pin), { margin: 1, width: 240 }).then(setQr).catch(() => {}); }, [view?.pin]);

  const create = async () => {
    setErr('');
    const s = connect(); bind(s);
    if (!s.connected) await new Promise((r) => s.once('connect', r));
    const r = await emit(s, 'host:create', { activityId, ...opts, mode: opts.mode || undefined });
    if (!r.ok) return setErr(r.error);
    sessionStorage.setItem(key, r.pin);
  };
  const send = async (ev, p) => { const r = await emit(sockRef.current, ev, p); if (!r.ok) toast(r.error, 'error'); return r; };
  const end = async () => {
    if (!(await confirm({ text: t('إنهاء الجلسة وإخراج جميع اللاعبين؟', 'End the session and remove all players?'), ok: t('إنهاء', 'End') }))) return;
    await send('host:end'); sessionStorage.removeItem(key);
  };

  if (act.loading || modes.loading) return <div className="live-screen"><Spinner /></div>;
  if (act.error) return <div className="live-screen"><ErrorBox error={act.error} /></div>;
  const a = act.data, meta = TEMPLATE_MAP[a.type];
  const avail = modes.data?.[a.type] || [];

  const sp = { a, meta, view, connected, t, onEnd: end };

  if (closed) return <LiveShell {...sp}><div className="stage-card result"><div className="stars">🏁</div><h2>{t('انتهت الجلسة', 'Session ended')}</h2><Link className="btn primary" to={`/activity/${a.id}/results`}>{t('نتائج الطلاب', 'Student results')}</Link></div></LiveShell>;

  /* ---------- الإعداد قبل إنشاء الجلسة ---------- */
  if (!view) {
    const mode = opts.mode || avail[0];
    return (
      <LiveShell {...sp}>
        <div className="stage-card live-setup">
          <div className="intro-icon">{meta.icon}</div>
          <h1>{t('لعبة مباشرة', 'Live game')}</h1>
          <p className="muted">{a.title}</p>
          {!avail.length ? <ErrorBox error={t('هذا القالب لا يدعم اللعب المباشر.', 'This template does not support live play.')} /> : (
            <>
              {avail.length > 1 && <div className="role-pick">{avail.map((m) => <button key={m} className={mode === m ? 'on' : ''} onClick={() => setOpts({ ...opts, mode: m })}><span>{m === 'race' ? '🏎️' : '🎯'}</span>{t(...MODE_LABEL[m])}</button>)}</div>}
              {mode === 'quiz' && <label className="field"><span>{t('وقت كل سؤال (ثانية)', 'Seconds per question')}: <b>{opts.limit}</b></span><input type="range" min={5} max={120} step={5} value={opts.limit} onChange={(e) => setOpts({ ...opts, limit: Number(e.target.value) })} /></label>}
              {mode === 'race' && <label className="field"><span>{t('عدد الإجابات الصحيحة للفوز', 'Correct answers to win')}: <b>{opts.goal}</b></span><input type="range" min={2} max={30} value={opts.goal} onChange={(e) => setOpts({ ...opts, goal: Number(e.target.value) })} /></label>}
              {mode === 'board' && <label className="check"><input type="checkbox" checked={opts.anonymous} onChange={(e) => setOpts({ ...opts, anonymous: e.target.checked })} /> {t('إخفاء أسماء الكاتبين عن الطلاب', 'Hide authors from students')}</label>}
              {err && <ErrorBox error={err} />}
              <button className="btn primary big" onClick={create}>🔴 {t('إنشاء الجلسة', 'Create session')}</button>
              <p className="muted small-text">{t('الجلسة مؤقتة وتُحفظ نتائجها في صفحة النتائج عند انتهاء المسابقة.', 'Sessions are temporary; results are saved when the game ends.')}</p>
            </>
          )}
        </div>
      </LiveShell>
    );
  }

  const v = view;
  const names = v.players || [];

  /* ---------- اللوبي ---------- */
  if (v.phase === 'lobby') return (
    <LiveShell {...sp}>
      <div className="lobby">
        <div className="pin-card">
          <p>{t('انضم من أي جهاز:', 'Join from any device:')} <b dir="ltr">{window.location.host}/join</b></p>
          <div className="pin-big" dir="ltr">{v.pin}</div>
          {qr && <img src={qr} alt="QR" className="qr" />}
          <label className="check"><input type="checkbox" checked={v.locked} onChange={(e) => send('host:lock', { locked: e.target.checked })} /> {t('إغلاق الانضمام', 'Lock joining')}</label>
        </div>
        <div className="lobby-players">
          <h2>👥 {v.playerCount} {t('لاعب', 'players')}</h2>
          <div className="player-chips">{names.map((p) => <span key={p.id} className={'pchip' + (p.connected ? '' : ' off')} style={p.team !== null && p.team !== undefined ? { '--tc': ['#E5484D', '#2D7BFF', '#19A974', '#F59F00'][p.team] } : undefined}>{p.name}<button onClick={() => send('host:kick', { playerId: p.id })} aria-label="kick">✕</button></span>)}</div>
          {!names.length && <p className="muted">{t('بانتظار اللاعبين…', 'Waiting for players…')}</p>}
          <button className="btn primary big" disabled={['quiz', 'race'].includes(v.mode) && !names.length} onClick={() => send('host:start')}>▶ {t('ابدأ', 'Start')}</button>
        </div>
      </div>
    </LiveShell>
  );

  /* ---------- مسابقة مباشرة ---------- */
  if (v.mode === 'quiz') {
    if (v.phase === 'final') return (
      <LiveShell {...sp}><div className="live-final"><h1>🏆 {t('النتيجة النهائية', 'Final results')}</h1>
        {v.teamScores && <div className="team-bars">{[...v.teamScores].sort((x, y) => y.score - x.score).map((tm, i) => <div key={i} className="tb"><b>{tm.name}</b><i style={{ width: `${(tm.score / Math.max(1, ...v.teamScores.map((x) => x.score))) * 100}%` }} /><span>{tm.score}</span></div>)}</div>}
        <Podium list={v.leaderboard} t={t} /><Board list={v.leaderboard.slice(3)} t={t} />
        <div className="row center"><Link className="btn primary" to={`/activity/${a.id}/results`}>{t('نتائج الطلاب', 'Student results')}</Link><button className="btn" onClick={end}>{t('إنهاء الجلسة', 'End session')}</button></div></div></LiveShell>
    );
    const q = v.question, left = Math.max(0, Math.ceil((v.endsAt - now()) / 1000));
    const reveal = v.phase === 'reveal', maxC = Math.max(1, ...(v.counts || [0]));
    return (
      <LiveShell {...sp}><div className="live-q">
        <div className="live-q-top"><span>{q.index + 1}/{v.total}</span>{!reveal && <span className={'live-timer' + (left <= 5 ? ' low' : '')}>{left}</span>}<span>✋ {v.answered}/{v.playerCount}</span></div>
        <h1 className="live-q-text">{q.text}</h1>{q.image && <img className="q-img" src={q.image} alt="" />}
        <div className="live-opts">{q.options.map((o, i) => (
          <div key={i} className={`live-opt lo${i % 4}` + (reveal ? (i === q.answer ? ' right' : ' dim') : '')}><b>{SHAPES[i % 4]}</b><span>{o}</span>{reveal && <em>{v.counts[i]}</em>}{reveal && <i style={{ height: `${(v.counts[i] / maxC) * 100}%` }} />}</div>))}</div>
        {reveal && <div className="reveal-lb"><Board list={v.leaderboard.slice(0, 5)} t={t} /></div>}
        <div className="row center"><button className="btn primary big" onClick={() => send('host:next')}>{reveal ? (q.index + 1 >= v.total ? t('النتائج النهائية', 'Final results') : t('السؤال التالي', 'Next question')) : t('إنهاء السؤال الآن', 'End question now')} ⏭</button></div>
      </div></LiveShell>
    );
  }

  /* ---------- سباق ---------- */
  if (v.mode === 'race') {
    const cd = Math.ceil((v.startAt - now()) / 1000);
    return (
      <LiveShell {...sp}><div className="live-race">
        {v.phase === 'race' && cd > 0 && <div className="countdown">{cd}</div>}
        {v.phase === 'final' && <h1 className="center-text">🏆 {v.winner ? `${v.winner.name} ${t('فاز!', 'wins!')}` : t('انتهى السباق', 'Race over')}</h1>}
        <div className="track">{v.standings.map((p) => <div key={p.id} className="lane2"><b>{p.name}</b><div className="rail"><span className="car2" style={{ insetInlineStart: `calc(${Math.min(100, (p.progress / v.goal) * 100)}% - ${Math.min(100, (p.progress / v.goal) * 100) * 0.44}px)` }}>🏎️</span><i className="goal-flag">🏁</i></div><em>{p.progress}/{v.goal}</em></div>)}</div>
        {v.phase === 'final' ? <div className="row center"><Link className="btn primary" to={`/activity/${a.id}/results`}>{t('نتائج الطلاب', 'Student results')}</Link></div> : <div className="row center"><button className="btn" onClick={() => send('host:finish')}>{t('إنهاء السباق', 'Finish race')}</button></div>}
      </div></LiveShell>
    );
  }

  /* ---------- تصويت حي ---------- */
  if (v.mode === 'poll') {
    const q = v.question, total = v.counts.reduce((x, y) => x + y, 0);
    return (
      <LiveShell {...sp}><div className="live-q">
        <div className="live-q-top"><span>{q.index + 1}/{v.total}</span><span>🗳 {total}/{v.playerCount}</span></div>
        <h1 className="live-q-text">{q.text}</h1>
        <div className="poll-live">{q.options.map((o, i) => { const pct = total ? Math.round((v.counts[i] / total) * 100) : 0; return <div key={i} className={`pl lo${i % 4}`}><span>{SHAPES[i % 4]} {o}</span><i style={{ width: pct + '%' }} /><b>{pct}% ({v.counts[i]})</b></div>; })}</div>
        <div className="row center">
          <button className="btn" disabled={q.index === 0} onClick={() => send('host:prev')}>{t('السابق', 'Previous')}</button>
          <label className="check"><input type="checkbox" checked={v.showResults} onChange={(e) => send('host:poll-show', { show: e.target.checked })} /> {t('إظهار النتائج للطلاب', 'Show results to students')}</label>
          <button className="btn primary" disabled={q.index + 1 >= v.total} onClick={() => send('host:next')}>{t('التالي', 'Next')}</button>
        </div>
      </div></LiveShell>
    );
  }

  /* ---------- لوحة العصف ---------- */
  const b = v.board;
  const copy = async () => { const txt = `${b.prompt}\n\n` + b.columns.map((c, i) => `${c}:\n` + b.notes.filter((n) => n.col === i).sort((x, y) => y.votes - x.votes).map((n) => `- ${n.text} (${n.votes})`).join('\n')).join('\n\n'); try { await navigator.clipboard.writeText(txt); toast(t('تم النسخ', 'Copied')); } catch { toast(txt); } };
  return (
    <LiveShell {...sp}><div className="live-board">
      <h1 className="center-text">💡 {b.prompt}</h1>
      <div className="cols" style={{ '--n': b.columns.length }}>{b.columns.map((c, i) => (
        <div key={i} className="bcol"><h3>{c} <small>({b.notes.filter((n) => n.col === i).length})</small></h3>
          <div className="bnotes">{b.notes.filter((n) => n.col === i).sort((x, y) => y.votes - x.votes).map((n) => <div key={n.id} className="sticky" style={{ background: ['#FFE680', '#B8F2D8', '#CFE6FF', '#FFC9CC', '#E1D4FF'][n.id.charCodeAt(0) % 5] }}><p>{n.text}</p><div><span>👍 {n.votes}{n.author ? ` · ${n.author}` : ''}</span><button onClick={() => send('host:note-delete', { id: n.id })} aria-label="delete">🗑</button></div></div>)}</div></div>))}</div>
      <div className="row center">
        <label className="check"><input type="checkbox" checked={b.open} onChange={(e) => send('host:board', { open: e.target.checked })} /> {t('السماح بإضافة ملاحظات', 'Allow new notes')}</label>
        <label className="check"><input type="checkbox" checked={b.anonymous} onChange={(e) => send('host:board', { anonymous: e.target.checked })} /> {t('إخفاء الأسماء عن الطلاب', 'Hide authors from students')}</label>
        <button className="btn" onClick={copy}>📋 {t('نسخ كنص', 'Copy as text')}</button>
      </div>
    </div></LiveShell>
  );
}
