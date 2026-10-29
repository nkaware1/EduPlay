import { useEffect, useMemo, useRef, useState } from 'react';
import { hasArabic, norm, shuffle, shuffleDiff } from '../lib/text.js';
import { Cell, FeedbackBar, ProgressBar } from './common.jsx';

/* ---------- المطابقة (نقر ثم نقر — يعمل على اللمس) ---------- */
function MatchingGame({ content, s, report, finish, snd, t }) {
  const pairs = content.pairs;
  const left = useMemo(() => { const l = pairs.map((p, i) => ({ i, text: p.left })); return s.shuffle ? shuffle(l) : l; }, []); // eslint-disable-line
  const right = useMemo(() => shuffle(pairs.map((p, i) => ({ i, text: p.right }))), []); // eslint-disable-line
  const [sel, setSel] = useState(null);
  const [doneL, setDoneL] = useState({});
  const [doneR, setDoneR] = useState({});
  const [dirty, setDirty] = useState({});
  const [wrong, setWrong] = useState(null);

  const clickR = (j) => {
    if (sel === null || doneR[j] !== undefined) return;
    if (pairs[sel].right === pairs[j].right) {
      snd.ok();
      const dl = { ...doneL, [sel]: j };
      setDoneL(dl); setDoneR({ ...doneR, [j]: sel }); setSel(null);
      report(Object.keys(dl).filter((k) => !dirty[k]).length, Object.keys(dl).length);
      if (Object.keys(dl).length === pairs.length) setTimeout(finish, 900);
    } else {
      snd.bad();
      setDirty({ ...dirty, [sel]: true });
      setWrong(j); setTimeout(() => setWrong(null), 450);
    }
  };
  return (
    <div className="match">
      <p className="muted center-text">{sel === null ? t('اختر عنصرًا من العمود الأول', 'Pick an item from the first column') : t('الآن اختر ما يطابقه', 'Now pick its match')}</p>
      <div className="match-cols">
        <div className="match-col">
          {left.map((l) => {
            const done = doneL[l.i] !== undefined;
            return <button key={l.i} className={'m-item' + (sel === l.i ? ' sel' : '') + (done ? ' done' : '')} style={done ? { '--h': (l.i * 47) % 360 } : undefined} disabled={done} onClick={() => setSel(l.i)}><Cell text={l.text} /></button>;
          })}
        </div>
        <div className="match-col">
          {right.map((r, k) => {
            const done = doneR[r.i] !== undefined;
            return <button key={k} className={'m-item' + (done ? ' done' : '') + (wrong === r.i ? ' wrong' : '')} style={done ? { '--h': (doneR[r.i] * 47) % 360 } : undefined} disabled={done || sel === null} onClick={() => clickR(r.i)}><Cell text={r.text} /></button>;
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- ترتيب العناصر (سحب وإفلات + أسهم للّمس) ---------- */
function LineUpGame({ content, report, finish, snd, t }) {
  const [order, setOrder] = useState(() => shuffleDiff(content.items.map((text, id) => ({ id, text })), (x, i) => x.id === i));
  const [checked, setChecked] = useState(false);
  const dragId = useRef(null);
  const [over, setOver] = useState(null);

  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    const a = [...order]; [a[i], a[j]] = [a[j], a[i]];
    setOrder(a); setChecked(false);
  };
  const drop = (to) => {
    const from = order.findIndex((x) => x.id === dragId.current);
    setOver(null);
    if (from < 0 || from === to) return;
    const a = [...order]; const [it] = a.splice(from, 1); a.splice(to, 0, it);
    setOrder(a); setChecked(false);
  };
  const correct = order.filter((x, i) => x.id === i).length;
  const check = () => { setChecked(true); report(correct, order.length); correct === order.length ? snd.ok() : snd.bad(); };

  return (
    <div className="lineup">
      {content.prompt && <h2 className="q-text center-text">{content.prompt}</h2>}
      <ol className="lu-list">
        {order.map((x, i) => (
          <li key={x.id} draggable onDragStart={() => (dragId.current = x.id)} onDragOver={(e) => { e.preventDefault(); setOver(i); }} onDragLeave={() => setOver(null)} onDrop={() => drop(i)} onDragEnd={() => setOver(null)}
            className={'lu-item' + (over === i ? ' over' : '') + (checked ? (x.id === i ? ' right' : ' wrong') : '')}>
            <span className="grip" aria-hidden>⠿</span>
            <span className="lu-num">{i + 1}</span>
            <span className="lu-text">{x.text}</span>
            <span className="lu-btns">
              <button className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="up">▲</button>
              <button className="icon-btn" onClick={() => move(i, 1)} disabled={i === order.length - 1} aria-label="down">▼</button>
            </span>
          </li>
        ))}
      </ol>
      <div className="row center">
        <button className="btn primary" onClick={check}>{t('تحقق', 'Check')}</button>
        {checked && <button className="btn" onClick={finish}>{t('إنهاء', 'Finish')}</button>}
      </div>
      {checked && <p className={correct === order.length ? 'ok-text center-text' : 'bad-text center-text'}>{correct === order.length ? t('الترتيب صحيح 🎉', 'Perfect order 🎉') : `${correct}/${order.length} ${t('في مكانها الصحيح — عدّل وأعد التحقق', 'in place — adjust and check again')}`}</p>}
    </div>
  );
}

/* ---------- إعادة ترتيب الحروف أو الكلمات ---------- */
const tokensOf = (it, mode) => { const a = it.answer.trim(); return mode === 'words' ? a.split(/\s+/) : Array.from(a.replace(/\s+/g, '')); };
const mix = (toks) => shuffleDiff(toks.map((t, id) => ({ id, t })), (x, i) => x.t === toks[i]);

function UnscrambleGame({ content, s, report, finish, snd, t }) {
  const mode = content.mode === 'words' ? 'words' : 'letters';
  const items = useMemo(() => { const a = content.items.map((it) => ({ ...it, toks: tokensOf(it, mode) })); return s.shuffle ? shuffle(a) : a; }, []); // eslint-disable-line
  const [i, setI] = useState(0);
  const [bank, setBank] = useState(() => mix(items[0].toks));
  const [ans, setAns] = useState([]);
  const [status, setStatus] = useState(null);
  const [ok, setOk] = useState(0);
  const it = items[i];
  const last = i + 1 >= items.length;
  const sep = mode === 'words' ? ' ' : '';

  const add = (x) => { if (status) return; setBank(bank.filter((b) => b.id !== x.id)); setAns([...ans, x]); };
  const back = (x) => { if (status) return; setAns(ans.filter((b) => b.id !== x.id)); setBank([...bank, x]); };
  const check = () => {
    const g = ans.map((x) => x.t).join(sep) === it.toks.join(sep);
    g ? snd.ok() : snd.bad();
    setStatus(g ? 'right' : 'wrong');
    const n = ok + (g ? 1 : 0); setOk(n); report(n, i + 1);
  };
  const next = () => {
    if (last) return finish();
    setBank(mix(items[i + 1].toks)); setAns([]); setStatus(null); setI(i + 1);
  };
  return (
    <div className="mcq">
      <ProgressBar value={i + (status ? 1 : 0)} max={items.length} />
      {it.hint && <p className="hint-box">💡 {it.hint}</p>}
      <div className={'slots ' + (status || '')} aria-label="answer">
        {ans.length === 0 && <span className="muted">{t('اضغط القطع بالترتيب الصحيح', 'Tap tiles in the right order')}</span>}
        {ans.map((x) => <button key={x.id} className="tile placed" onClick={() => back(x)}>{x.t}</button>)}
      </div>
      <div className="tiles">{bank.map((x) => <button key={x.id} className="tile" onClick={() => add(x)}>{x.t}</button>)}</div>
      {!status && (
        <div className="row center">
          <button className="btn" onClick={() => { setBank(mix(it.toks)); setAns([]); }} disabled={!ans.length}>{t('مسح', 'Clear')}</button>
          <button className="btn primary" onClick={check} disabled={bank.length > 0}>{t('تحقق', 'Check')}</button>
        </div>
      )}
      {status && <FeedbackBar ok={status === 'right'} text={status === 'wrong' ? `${t('الصحيح', 'Correct')}: ${it.toks.join(sep)}` : ''} onNext={next} last={last} />}
    </div>
  );
}

/* ---------- لعبة الذاكرة ---------- */
function MemoryGame({ content, report, finish, snd, t }) {
  const n = content.pairs.length;
  const cards = useMemo(() => shuffle(content.pairs.flatMap((p, k) => [{ id: k * 2, k, text: p.a }, { id: k * 2 + 1, k, text: p.b }])), []); // eslint-disable-line
  const [open, setOpen] = useState([]);
  const [matched, setMatched] = useState(() => new Set());
  const [moves, setMoves] = useState(0);
  const lock = useRef(false);
  const cols = cards.length <= 12 ? 4 : cards.length <= 20 ? 5 : 6;

  const flip = (c) => {
    if (lock.current || open.includes(c.id) || matched.has(c.k)) return;
    const o = [...open, c.id];
    setOpen(o);
    if (o.length < 2) return;
    setMoves((m) => m + 1);
    lock.current = true;
    const [a, b] = o.map((id) => cards.find((x) => x.id === id));
    if (a.k === b.k) {
      snd.ok();
      setTimeout(() => {
        const m = new Set(matched).add(a.k);
        setMatched(m); setOpen([]); lock.current = false;
        report(m.size, m.size);
        if (m.size === n) setTimeout(finish, 700);
      }, 450);
    } else {
      snd.bad();
      setTimeout(() => { setOpen([]); lock.current = false; }, 900);
    }
  };
  return (
    <div className="memory">
      <p className="muted center-text">{t('المحاولات', 'Moves')}: {moves} · {t('الأزواج', 'Pairs')}: {matched.size}/{n}</p>
      <div className="mem-grid" style={{ '--cols': cols }}>
        {cards.map((c) => {
          const up = open.includes(c.id) || matched.has(c.k);
          return (
            <button key={c.id} className={'mem-card' + (up ? ' up' : '') + (matched.has(c.k) ? ' done' : '')} onClick={() => flip(c)} aria-label={up ? c.text : 'card'}>
              <span className="mem-in"><span className="mem-back">?</span><span className="mem-front"><Cell text={c.text} /></span></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- املأ الفراغات ---------- */
function parse(text) {
  const parts = [];
  const re = /\[\[(.+?)\]\]/g;
  let last = 0, m, b = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ t: text.slice(last, m.index) });
    parts.push({ blank: b++, ans: m[1].trim() });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ t: text.slice(last) });
  return parts;
}

function FillItem({ text, distractors, snd, t, last, onChecked, onNext }) {
  const parts = useMemo(() => parse(text), [text]);
  const blanks = parts.filter((p) => p.blank !== undefined);
  const bank = useMemo(() => shuffle([...blanks.map((b, k) => ({ id: 'b' + k, text: b.ans })), ...distractors.map((d, k) => ({ id: 'd' + k, text: d }))]), []); // eslint-disable-line
  const [fills, setFills] = useState({});
  const [res, setRes] = useState(null);
  const used = new Set(Object.values(fills));
  const full = blanks.every((b) => fills[b.blank] !== undefined);

  const place = (id) => {
    if (res) return;
    const free = blanks.find((b) => fills[b.blank] === undefined);
    if (free) setFills({ ...fills, [free.blank]: id });
  };
  const clear = (bi) => { if (res) return; const f = { ...fills }; delete f[bi]; setFills(f); };
  const check = () => {
    const r = {}; let c = 0;
    blanks.forEach((b) => { const w = bank.find((x) => x.id === fills[b.blank]); const g = !!w && norm(w.text) === norm(b.ans); r[b.blank] = g; if (g) c++; });
    setRes(r);
    c === blanks.length ? snd.ok() : snd.bad();
    onChecked(c, blanks.length);
  };
  return (
    <>
      <div className="q-card fill-text">
        {parts.map((p, k) => p.blank === undefined ? <span key={k}>{p.t}</span> : (
          <button key={k} className={'blank' + (fills[p.blank] !== undefined ? ' filled' : '') + (res ? (res[p.blank] ? ' right' : ' wrong') : '')} onClick={() => clear(p.blank)} aria-label="blank">
            {fills[p.blank] !== undefined ? bank.find((x) => x.id === fills[p.blank]).text : '＿＿＿'}
          </button>
        ))}
      </div>
      <div className="tiles">{bank.map((x) => <button key={x.id} className="tile" disabled={used.has(x.id) || !!res} onClick={() => place(x.id)}>{x.text}</button>)}</div>
      {!res ? <div className="row center"><button className="btn primary" disabled={!full} onClick={check}>{t('تحقق', 'Check')}</button></div>
        : <FeedbackBar ok={Object.values(res).every(Boolean)} text={Object.values(res).every(Boolean) ? '' : `${t('الصحيح', 'Correct')}: ${blanks.map((b) => b.ans).join('، ')}`} onNext={onNext} last={last} />}
    </>
  );
}

function FillBlanksGame({ content, s, report, finish, snd, t }) {
  const items = useMemo(() => (s.shuffle ? shuffle(content.items) : content.items), []); // eslint-disable-line
  const [i, setI] = useState(0);
  const [tally, setTally] = useState({ ok: 0, n: 0 });
  const last = i + 1 >= items.length;
  return (
    <div className="mcq">
      <ProgressBar value={i} max={items.length} />
      <FillItem key={i} text={items[i].text} distractors={(content.distractors || []).filter(Boolean)} snd={snd} t={t} last={last}
        onChecked={(c, n) => { const nt = { ok: tally.ok + c, n: tally.n + n }; setTally(nt); report(nt.ok, nt.n); }}
        onNext={() => (last ? finish() : setI(i + 1))} />
    </div>
  );
}

/* ---------- البحث عن الكلمات ---------- */
const rnd = (n) => Math.floor(Math.random() * n);
const AR = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي';
const EN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const cleanWord = (w) => w.replace(/\s+/g, '').replace(/[\u064B-\u065F\u0670]/g, '');

function buildGrid(words, sizeIn) {
  const ws = words.map((w) => ({ w, chars: Array.from(cleanWord(w)) })).filter((x) => x.chars.length);
  const size = Math.min(20, Math.max(6, sizeIn || 10, ...ws.map((x) => x.chars.length)));
  const rtl = ws.some((x) => hasArabic(x.w));
  const sg = rtl ? -1 : 1;
  const dirs = [[0, sg], [1, 0], [1, sg], [1, -sg]];
  for (let attempt = 0; attempt < 12; attempt++) {
    const grid = Array.from({ length: size }, () => Array(size).fill(''));
    const placed = [];
    let allOk = true;
    for (const x of [...ws].sort((a, b) => b.chars.length - a.chars.length)) {
      let ok = false;
      for (let tr = 0; tr < 300 && !ok; tr++) {
        const [dr, dc] = dirs[rnd(dirs.length)];
        const r0 = rnd(size), c0 = rnd(size);
        const r1 = r0 + dr * (x.chars.length - 1), c1 = c0 + dc * (x.chars.length - 1);
        if (r1 < 0 || r1 >= size || c1 < 0 || c1 >= size) continue;
        if (!x.chars.every((ch, k) => !grid[r0 + dr * k][c0 + dc * k] || grid[r0 + dr * k][c0 + dc * k] === ch)) continue;
        x.chars.forEach((ch, k) => (grid[r0 + dr * k][c0 + dc * k] = ch));
        placed.push({ word: x.w, chars: x.chars });
        ok = true;
      }
      if (!ok) { allOk = false; break; }
    }
    if (allOk || attempt === 11) {
      const abc = rtl ? AR : EN;
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!grid[r][c]) grid[r][c] = abc[rnd(abc.length)];
      return { grid, size, placed };
    }
  }
}

const lineBetween = (a, b) => {
  const dr = b.r - a.r, dc = b.c - a.c;
  if (!(dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc))) return null;
  const n = Math.max(Math.abs(dr), Math.abs(dc));
  return Array.from({ length: n + 1 }, (_, k) => ({ r: a.r + Math.sign(dr) * k, c: a.c + Math.sign(dc) * k }));
};

function WordSearchGame({ content, report, finish, snd, t }) {
  const { grid, size, placed } = useMemo(() => buildGrid(content.words, content.size), []); // eslint-disable-line
  const [start, setStart] = useState(null);
  const [found, setFound] = useState({});
  const [cells, setCells] = useState({});
  const [bad, setBad] = useState(null);

  const click = (r, c) => {
    if (!start) return setStart({ r, c });
    const path = lineBetween(start, { r, c });
    if (!path || path.length < 2) return setStart(path ? null : { r, c });
    const str = path.map((p) => grid[p.r][p.c]).join('');
    const hit = placed.find((p) => !found[p.word] && (str === p.chars.join('') || str === [...p.chars].reverse().join('')));
    if (hit) {
      snd.ok();
      const idx = Object.keys(found).length;
      const nf = { ...found, [hit.word]: true };
      const nc = { ...cells };
      path.forEach((p) => (nc[`${p.r},${p.c}`] = idx % 6));
      setFound(nf); setCells(nc);
      report(Object.keys(nf).length, Object.keys(nf).length);
      if (Object.keys(nf).length === placed.length) setTimeout(finish, 800);
    } else {
      snd.bad();
      setBad(path.map((p) => `${p.r},${p.c}`));
      setTimeout(() => setBad(null), 400);
    }
    setStart(null);
  };

  return (
    <div className="ws">
      <div className="ws-grid" dir="ltr" style={{ '--n': size }}>
        {grid.map((row, r) => row.map((ch, c) => {
          const k = `${r},${c}`;
          const cls = 'ws-cell' + (cells[k] !== undefined ? ` f${cells[k]}` : '') + (start && start.r === r && start.c === c ? ' start' : '') + (bad?.includes(k) ? ' bad' : '');
          return <button key={k} className={cls} onClick={() => click(r, c)} aria-label={ch}>{ch}</button>;
        }))}
      </div>
      <div className="ws-words">
        <h3>{t('الكلمات', 'Words')} ({Object.keys(found).length}/{placed.length})</h3>
        <ul>{content.words.map((w) => <li key={w} className={found[w] ? 'found' : ''}>{found[w] ? '✔ ' : ''}{w}</li>)}</ul>
        <p className="muted small-text">{t('اضغط أول حرف ثم آخر حرف في الكلمة.', 'Tap the first and the last letter of a word.')}</p>
      </div>
    </div>
  );
}

/* ---------- التصنيف ---------- */
function GroupSortGame({ content, report, finish, snd, t }) {
  const pool = useMemo(() => shuffle(content.groups.flatMap((g, gi) => g.items.map((text, k) => ({ id: `${gi}-${k}`, text, g: gi })))), []); // eslint-disable-line
  const [sel, setSel] = useState(null);
  const [placed, setPlaced] = useState({});
  const [dirty, setDirty] = useState({});
  const [shake, setShake] = useState(null);
  const left = pool.filter((x) => placed[x.id] === undefined);

  const drop = (gi) => {
    if (!sel) return;
    const it = pool.find((x) => x.id === sel);
    if (it.g === gi) {
      snd.ok();
      const np = { ...placed, [sel]: gi };
      setPlaced(np); setSel(null);
      report(Object.keys(np).filter((k) => !dirty[k]).length, Object.keys(np).length);
      if (Object.keys(np).length === pool.length) setTimeout(finish, 800);
    } else {
      snd.bad();
      setDirty({ ...dirty, [sel]: true });
      setShake(gi); setTimeout(() => setShake(null), 400);
    }
  };
  return (
    <div className="gsort">
      <p className="muted center-text">{sel ? t('اضغط المجموعة المناسبة', 'Now tap the right group') : t('اختر عنصرًا ثم المجموعة التي ينتمي إليها', 'Pick an item, then its group')}</p>
      <div className="gs-pool">{left.map((x) => <button key={x.id} className={'tile' + (sel === x.id ? ' sel' : '')} onClick={() => setSel(x.id)}>{x.text}</button>)}</div>
      <div className="gs-groups">
        {content.groups.map((g, gi) => (
          <button key={gi} className={'gs-box g' + (gi % 4) + (shake === gi ? ' shake' : '') + (sel ? ' ready' : '')} onClick={() => drop(gi)}>
            <h3>{g.name}</h3>
            <div className="gs-in">{pool.filter((x) => placed[x.id] === gi).map((x) => <span key={x.id} className="tile placed">{x.text}</span>)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export const puzzleGames = { matching: MatchingGame, lineup: LineUpGame, unscramble: UnscrambleGame, memory: MemoryGame, fillblanks: FillBlanksGame, wordsearch: WordSearchGame, groupsort: GroupSortGame };
