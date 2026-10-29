import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { Logo } from '../Layout.jsx';
import { SHAPES, emit, useLiveSocket, useServerClock } from '../lib/live.js';
import { TEMPLATE_MAP } from '../templates/meta.js';

const SESSION = 'live_player';
const TEAM_COLORS = ['#E5484D', '#2D7BFF', '#19A974', '#F59F00'];
const loadSession = () => { try { return JSON.parse(sessionStorage.getItem(SESSION) || 'null'); } catch { return null; } };

function Lb({ list, me }) {
  return <ol className="lb">{list.map((p, i) => <li key={p.id} className={p.id === me ? 'me' : ''}><span>{i + 1}</span><b>{p.name}</b><em>{p.score}</em></li>)}</ol>;
}

function Frame({ view, connected, t, leave, children }) {
  return (
    <div className="live-screen player"><header className="live-top"><Logo /><span className="grow" />{view && !connected && <span className="chip warm">⚠ {t('انقطع الاتصال… نعيد المحاولة', 'Reconnecting…')}</span>}{view && <button className="btn small ghost" onClick={leave}>{t('خروج', 'Leave')}</button>}</header>{children}</div>
  );
}

export default function JoinPage() {
  const params = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const { connect, connected } = useLiveSocket();
  const saved = loadSession();
  const [pin, setPin] = useState(params.pin || saved?.pin || '');
  const [name, setName] = useState(saved?.name || user?.name || '');
  const [teams, setTeams] = useState([]);
  const [team, setTeam] = useState(null);
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState('');
  const [view, setView] = useState(null);
  const [gone, setGone] = useState(null);
  const [busy, setBusy] = useState(false);
  const sockRef = useRef(null);
  const sessRef = useRef(saved);
  const now = useServerClock(view);
  const [flash, setFlash] = useState(null);

  const attach = (s) => {
    s.off('room:update'); s.off('room:closed');
    s.on('room:update', setView);
    s.on('room:closed', (d) => { sessionStorage.removeItem(SESSION); sessRef.current = null; setGone(d.reason); });
    sockRef.current = s;
  };
  // إعادة الانضمام تلقائيًا عند انقطاع الاتصال أو تحديث الصفحة
  useEffect(() => {
    const sess = loadSession();
    if (!sess || (params.pin && params.pin !== sess.pin)) return;
    const s = connect(); attach(s);
    const rejoin = () => emit(s, 'player:join', { pin: sess.pin, playerId: sess.playerId, name: sess.name }).then((r) => { if (!r.ok) { sessionStorage.removeItem(SESSION); sessRef.current = null; setView(null); } });
    if (s.connected) rejoin(); else s.once('connect', rejoin);
    s.on('connect', rejoin);
    return () => s.off('connect', rejoin);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // معاينة الرمز لعرض الفرق
  useEffect(() => {
    setInfo(null); setTeams([]);
    if (!/^\d{6}$/.test(pin)) return;
    fetch(`/api/live/peek/${pin}`).then((r) => r.json()).then((d) => { if (d.ok) { setInfo(d); setTeams(d.teams || []); setErr(''); } else setErr(d.error); }).catch(() => {});
  }, [pin]);

  const join = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    const s = connect(); attach(s);
    if (!s.connected) await new Promise((r) => s.once('connect', r));
    const r = await emit(s, 'player:join', { pin: pin.trim(), name, team });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    sessRef.current = { pin: pin.trim(), playerId: r.playerId, name: r.name };
    sessionStorage.setItem(SESSION, JSON.stringify(sessRef.current));
    nav(`/join/${pin.trim()}`, { replace: true });
  };
  const send = (ev, p) => emit(sockRef.current, ev, p);
  const leave = () => { sessionStorage.removeItem(SESSION); sockRef.current?.close(); window.location.assign('/join'); };

  const fp = { view, connected, t, leave };

  if (gone) return <Frame {...fp}><div className="stage-card result"><div className="stars">{gone === 'kicked' ? '🚫' : '🏁'}</div><h2>{gone === 'kicked' ? t('تم إخراجك من اللعبة', 'You were removed from the game') : t('انتهت اللعبة', 'The game has ended')}</h2><Link className="btn primary" to="/join" onClick={() => { setGone(null); setView(null); }}>{t('انضم للعبة أخرى', 'Join another game')}</Link></div></Frame>;

  /* ---------- شاشة الانضمام ---------- */
  if (!view) return (
    <Frame {...fp}>
      <form className="stage-card join-card" onSubmit={join}>
        <div className="intro-icon">🎮</div>
        <h1>{t('انضم إلى لعبة', 'Join a game')}</h1>
        <label className="field"><span>{t('رمز اللعبة (PIN)', 'Game PIN')}</span><input className="pin-input" dir="ltr" inputMode="numeric" pattern="\d{6}" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="000000" autoFocus={!pin} /></label>
        {info && <p className="ok-text">✅ {info.title} — {info.locked ? t('الانضمام مغلق', 'joining locked') : t('جاهز للانضمام', 'ready to join')}</p>}
        <label className="field"><span>{t('اسمك', 'Your name')}</span><input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} autoFocus={!!pin} /></label>
        {teams.length > 0 && <div className="field"><span>{t('اختر فريقك', 'Choose your team')}</span><div className="team-pick">{teams.map((tm, i) => <button type="button" key={i} className={team === i ? 'on' : ''} style={{ '--tc': TEAM_COLORS[i] }} onClick={() => setTeam(i)}>{tm}</button>)}<button type="button" className={team === null ? 'on' : ''} onClick={() => setTeam(null)}>{t('تلقائي', 'Auto')}</button></div></div>}
        {err && <div className="error-box">⚠️ {err}</div>}
        <button className="btn primary big" disabled={busy || pin.length !== 6 || !name.trim() || (info && info.locked)}>{busy ? '…' : t('انضم', 'Join')}</button>
      </form>
    </Frame>
  );

  const v = view, me = v.you;
  const head = <div className="me-bar"><b>{me.name}</b>{me.team !== null && me.team !== undefined && v.teams[me.team] && <span className="chip" style={{ borderColor: TEAM_COLORS[me.team] }}>{v.teams[me.team]}</span>}<span className="grow" />{v.mode === 'quiz' && <span className="chip">⭐ {me.score}</span>}</div>;
  const hostGone = !v.hostOnline && <p className="bad-text center-text">⚠ {t('المعلم غير متصل حاليًا', 'Host is offline')}</p>;

  if (v.phase === 'lobby') return <Frame {...fp}><div className="stage-card result">{head}<div className="stars">🎉</div><h2>{t('أنت في اللعبة!', "You're in!")}</h2><p className="muted">{t('بانتظار أن يبدأ المعلم…', 'Waiting for the host to start…')}</p><p>👥 {v.playerCount}</p>{hostGone}</div></Frame>;

  /* ---------- مسابقة ---------- */
  if (v.mode === 'quiz') {
    if (v.phase === 'final') return <Frame {...fp}><div className="stage-card result">{head}<div className="stars">{me.rank === 1 ? '🥇' : me.rank === 2 ? '🥈' : me.rank === 3 ? '🥉' : '🏁'}</div><h2>{t('مركزك', 'Your rank')}: {me.rank}/{v.playerCount}</h2><div className="big-score">{me.score}</div><Lb list={v.leaderboard} me={me.id} /></div></Frame>;
    const q = v.question, left = Math.max(0, Math.ceil((v.endsAt - now()) / 1000)), picked = v.myAnswer?.choice;
    if (v.phase === 'reveal') return (
      <Frame {...fp}><div className={'stage-card result reveal ' + (v.reveal.correct ? 'good' : 'bad')}>{head}
        <div className="stars">{v.reveal.correct ? '✅' : picked === undefined || picked === null ? '⏰' : '❌'}</div>
        <h2>{v.reveal.correct ? t('إجابة صحيحة!', 'Correct!') : picked === undefined || picked === null ? t('لم تُجب', 'No answer') : t('إجابة خاطئة', 'Wrong')}</h2>
        {v.reveal.gained > 0 && <p className="gain">+{v.reveal.gained}</p>}
        {!v.reveal.correct && <p>{t('الإجابة الصحيحة', 'Correct answer')}: <b>{q.options[v.reveal.answer]}</b></p>}
        <p className="muted">{t('مركزك', 'Rank')}: {me.rank}/{v.playerCount}{me.streak > 1 ? ` · 🔥 ${me.streak}` : ''}</p><Lb list={v.leaderboard} me={me.id} /></div></Frame>
    );
    return (
      <Frame {...fp}><div className="mcq live-pq">{head}<div className="live-q-top"><span>{q.index + 1}/{v.total}</span><span className={'live-timer' + (left <= 5 ? ' low' : '')}>{left}</span></div>
        <div className="q-card"><h2 className="q-text">{q.text}</h2>{q.image && <img className="q-img" src={q.image} alt="" />}</div>
        {picked !== undefined && picked !== null ? <div className="stage-card result"><p className="ok-text">✔ {t('تم إرسال إجابتك. بانتظار البقية…', 'Answer sent. Waiting for others…')}</p></div> : (
          <div className="live-opts player">{q.options.map((o, i) => <button key={i} className={`live-opt lo${i % 4}`} onClick={() => send('player:answer', { q: q.index, choice: i })}><b>{SHAPES[i % 4]}</b><span>{o}</span></button>)}</div>)}
        {hostGone}</div></Frame>
    );
  }

  /* ---------- سباق ---------- */
  if (v.mode === 'race') {
    if (v.phase === 'final') return <Frame {...fp}><div className="stage-card result"><div className="stars">{v.winner?.id === me.id ? '🏆' : '🏁'}</div><h2>{v.winner ? (v.winner.id === me.id ? t('فزت بالسباق!', 'You won!') : `${v.winner.name} ${t('فاز', 'won')}`) : t('انتهى السباق', 'Race over')}</h2><p>{t('مركزك', 'Your place')}: {v.myPlace}/{v.playerCount}</p><p>{v.progress}/{v.goal} ✔</p></div></Frame>;
    const cd = Math.ceil((v.startAt - now()) / 1000), pen = Math.max(0, Math.ceil((v.penaltyUntil - now()) / 1000)), q = v.question;
    return (
      <Frame {...fp}><div className="mcq live-pq">{head}
        <div className="rail me-rail"><span className="car2" style={{ insetInlineStart: `calc(${Math.min(100, (v.progress / v.goal) * 100)}% - ${Math.min(100, (v.progress / v.goal) * 100) * 0.44}px)` }}>🏎️</span><i className="goal-flag">🏁</i></div>
        <p className="center-text"><b>{t('المركز', 'Place')} {v.myPlace}</b> · {v.progress}/{v.goal}</p>
        {cd > 0 ? <div className="countdown">{cd}</div> : q && (
          <>
            {flash && <p className={flash.correct ? 'ok-text center-text' : 'bad-text center-text'}>{flash.correct ? '✔ ' + t('صحيح! تقدّمت', 'Correct!') : '✘ ' + t('خطأ! عقوبة 3 ثوانٍ', 'Wrong! 3s penalty')}</p>}
            <div className="q-card"><h2 className="q-text">{q.text}</h2>{q.image && <img className="q-img" src={q.image} alt="" />}</div>
            {pen > 0 ? <div className="penalty">⏳ {pen}</div> : <div className="live-opts player">{q.options.map((o, i) => <button key={i} className={`live-opt lo${i % 4}`} onClick={async () => { const r = await send('player:answer', { q: q.id, choice: i }); if (r.ok) setFlash({ correct: r.correct }); }}><b>{SHAPES[i % 4]}</b><span>{o}</span></button>)}</div>}
          </>)}
        {hostGone}</div></Frame>
    );
  }

  /* ---------- تصويت ---------- */
  if (v.mode === 'poll') {
    const q = v.question, counts = v.counts, total = counts ? counts.reduce((x, y) => x + y, 0) : 0;
    return (
      <Frame {...fp}><div className="mcq live-pq">{head}<p className="center-text muted">{q.index + 1}/{v.total}</p><div className="q-card"><h2 className="q-text">{q.text}</h2></div>
        <div className="poll-opts">{q.options.map((o, i) => { const pct = counts && total ? Math.round((counts[i] / total) * 100) : 0; return <button key={i} className={`poll-opt lo${i % 4}` + (v.myVote === i ? ' mine' : '')} onClick={() => send('player:vote', { q: q.index, choice: i })}>{counts && <i style={{ width: pct + '%' }} />}<span>{SHAPES[i % 4]} {o}</span>{counts && <b>{pct}%</b>}</button>; })}</div>
        {v.myVote !== null && <p className="ok-text center-text">✔ {t('تم تسجيل صوتك (يمكنك تغييره)', 'Vote recorded (you can change it)')}</p>}{hostGone}</div></Frame>
    );
  }

  /* ---------- لوحة العصف ---------- */
  const b = v.board;
  return <BoardPlayer b={b} v={v} send={send} t={t} head={head} hostGone={hostGone} fp={fp} />;
}

function BoardPlayer({ b, v, send, t, head, hostGone, fp }) {
  const [drafts, setDrafts] = useState({});
  const [msg, setMsg] = useState('');
  const add = async (c) => {
    const text = (drafts[c] || '').trim();
    if (!text) return;
    const r = await send('player:note', { col: c, text });
    if (r.ok) { setDrafts({ ...drafts, [c]: '' }); setMsg(''); } else setMsg(r.error);
  };
  return (
    <Frame {...fp}><div className="live-board">{head}<h2 className="center-text">💡 {b.prompt}</h2>
      <div className="cols" style={{ '--n': b.columns.length }}>{b.columns.map((c, i) => (
        <div key={i} className="bcol"><h3>{c}</h3>
          <div className="bnotes">{b.notes.filter((n) => n.col === i).sort((x, y) => y.votes - x.votes).map((n) => <div key={n.id} className="sticky" style={{ background: ['#FFE680', '#B8F2D8', '#CFE6FF', '#FFC9CC', '#E1D4FF'][n.id.charCodeAt(0) % 5] }}><p>{n.text}</p><div><button onClick={() => send('player:note-vote', { id: n.id })} className={v.myVotes?.includes(n.id) ? 'voted' : ''}>👍 {n.votes}</button><span>{n.author}</span></div></div>)}</div>
          {b.open && <input value={drafts[i] || ''} maxLength={140} onChange={(e) => setDrafts({ ...drafts, [i]: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && add(i)} placeholder={t('اكتب فكرة ثم Enter', 'Type an idea, press Enter')} />}</div>))}</div>
      {!b.open && <p className="bad-text center-text">{t('أغلق المعلم إضافة الملاحظات', 'The host closed new notes')}</p>}{msg && <p className="bad-text center-text">{msg}</p>}{hostGone}</div></Frame>
  );
}
