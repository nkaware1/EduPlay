import { useEffect, useMemo, useRef, useState } from 'react';
import { hasArabic, norm, shuffle } from '../lib/text.js';
import { FeedbackBar, ProgressBar, useKeys } from './common.jsx';
import { prepQuestions } from './mcqGames.jsx';

const rnd = (n) => Math.floor(Math.random() * n);
const clean = (w) => Array.from(String(w).replace(/\s+/g, '').replace(/[\u064B-\u065F\u0670]/g, ''));

/* ---------- الكلمات المتقاطعة: توليد الشبكة ---------- */
function buildCrossword(entries) {
  const base = entries.map((e, idx) => ({ idx, chars: clean(e.answer), clue: e.clue }));
  let best = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    const order = attempt === 0 ? [...base].sort((a, b) => b.chars.length - a.chars.length) : shuffle(base);
    const cells = new Map();
    const placed = [];
    const get = (r, c) => cells.get(r + ',' + c);
    const can = (w, r, c, dir) => {
      const dr = dir ? 1 : 0, dc = dir ? 0 : 1, n = w.chars.length;
      if (get(r - dr, c - dc) || get(r + dr * n, c + dc * n)) return false;
      let cross = 0;
      for (let k = 0; k < n; k++) {
        const rr = r + dr * k, cc = c + dc * k, ex = get(rr, cc);
        if (ex) { if (ex !== w.chars[k]) return false; cross++; }
        else if (get(rr + dc, cc + dr) || get(rr - dc, cc - dr)) return false;
      }
      return placed.length === 0 || (cross > 0 && cross < n);
    };
    const put = (w, r, c, dir) => {
      w.chars.forEach((ch, k) => cells.set(`${r + (dir ? k : 0)},${c + (dir ? 0 : k)}`, ch));
      placed.push({ ...w, r, c, dir });
    };
    for (const w of order) {
      if (!placed.length) { put(w, 0, 0, 0); continue; }
      let done = false;
      for (const pw of shuffle(placed)) {
        for (let a = 0; a < w.chars.length && !done; a++) for (let b = 0; b < pw.chars.length && !done; b++) {
          if (w.chars[a] !== pw.chars[b]) continue;
          const dir = pw.dir ? 0 : 1;
          const r = dir ? pw.r + (pw.dir ? b : 0) - a : pw.r + (pw.dir ? b : 0);
          const c = dir ? pw.c + (pw.dir ? 0 : b) : pw.c + (pw.dir ? 0 : b) - a;
          if (can(w, r, c, dir)) { put(w, r, c, dir); done = true; }
        }
        if (done) break;
      }
    }
    if (!best || placed.length > best.placed.length) best = { placed, cells };
    if (placed.length === base.length) break;
  }
  const rs = best.placed.flatMap((w) => [w.r]), cs = best.placed.flatMap((w) => [w.c]);
  const r0 = Math.min(...rs), c0 = Math.min(...cs);
  const placed = best.placed.map((w) => ({ ...w, r: w.r - r0, c: w.c - c0 }));
  const rows = Math.max(...placed.map((w) => w.r + (w.dir ? w.chars.length : 1)));
  const cols = Math.max(...placed.map((w) => w.c + (w.dir ? 1 : w.chars.length)));
  const starts = [...placed].sort((a, b) => a.r - b.r || a.c - b.c);
  const nums = {};
  let k = 0;
  starts.forEach((w) => { const key = `${w.r},${w.c}`; if (!nums[key]) nums[key] = ++k; w.num = nums[key]; });
  const unplaced = base.filter((b) => !placed.some((p) => p.idx === b.idx));
  return { placed, rows, cols, nums, unplaced };
}

function CrosswordGame({ content, report, finish, snd, t }) {
  const cw = useMemo(() => buildCrossword(content.entries), []); // eslint-disable-line
  const rtl = content.entries.some((e) => hasArabic(e.answer));
  const [solved, setSolved] = useState({});
  const [vals, setVals] = useState({});
  const [focus, setFocus] = useState(null);
  const [bad, setBad] = useState(null);
  const all = [...cw.placed, ...cw.unplaced.map((u) => ({ ...u, off: true }))];
  const letterAt = {};
  cw.placed.forEach((w) => { if (solved[w.idx]) w.chars.forEach((ch, k) => (letterAt[`${w.r + (w.dir ? k : 0)},${w.c + (w.dir ? 0 : k)}`] = ch)); });
  const focusCells = new Set();
  const fw = cw.placed.find((w) => w.idx === focus);
  if (fw) fw.chars.forEach((_, k) => focusCells.add(`${fw.r + (fw.dir ? k : 0)},${fw.c + (fw.dir ? 0 : k)}`));
  const cellSet = new Set();
  cw.placed.forEach((w) => w.chars.forEach((_, k) => cellSet.add(`${w.r + (w.dir ? k : 0)},${w.c + (w.dir ? 0 : k)}`)));

  const submit = (w, e) => {
    e.preventDefault();
    const v = vals[w.idx] || '';
    if (!v.trim() || solved[w.idx]) return;
    if (norm(v) === norm(w.chars.join(''))) {
      snd.ok();
      const ns = { ...solved, [w.idx]: true };
      setSolved(ns); report(Object.keys(ns).length, Object.keys(ns).length);
      if (Object.keys(ns).length === all.length) setTimeout(finish, 900);
    } else { snd.bad(); setBad(w.idx); setTimeout(() => setBad(null), 450); }
  };
  const list = (dir, title) => (
    <div className="cw-clues"><h3>{title}</h3>
      {all.filter((w) => (dir === 2 ? w.off : !w.off && w.dir === dir)).sort((a, b) => (a.num || 99) - (b.num || 99)).map((w) => (
        <form key={w.idx} className={'cw-clue' + (solved[w.idx] ? ' done' : '') + (bad === w.idx ? ' shake' : '')} onSubmit={(e) => submit(w, e)}>
          <span className="cw-num">{w.num || '•'}</span>
          <label><span>{w.clue} <small className="muted">({w.chars.length})</small></span>
            <input value={solved[w.idx] ? w.chars.join('') : vals[w.idx] || ''} disabled={!!solved[w.idx]} onFocus={() => setFocus(w.idx)} onChange={(e) => setVals({ ...vals, [w.idx]: e.target.value })} aria-label={w.clue} /></label>
        </form>))}
    </div>
  );
  return (
    <div className="cw">
      <div className="cw-grid" dir={rtl ? 'rtl' : 'ltr'} style={{ '--cols': cw.cols, '--rows': cw.rows }}>
        {Array.from({ length: cw.rows * cw.cols }, (_, n) => {
          const r = Math.floor(n / cw.cols), c = n % cw.cols, key = `${r},${c}`;
          if (!cellSet.has(key)) return <i key={key} className="cw-void" />;
          return <b key={key} className={'cw-cell' + (focusCells.has(key) ? ' foc' : '') + (letterAt[key] ? ' fill' : '')}>{cw.nums[key] && <sup>{cw.nums[key]}</sup>}{letterAt[key] || ''}</b>;
        })}
      </div>
      <div>
        {list(0, t('أفقي', 'Across'))}{list(1, t('عمودي', 'Down'))}{cw.unplaced.length > 0 && list(2, t('إضافية', 'Extra'))}
        <p className="muted small-text">{t('اكتب الإجابة ثم Enter.', 'Type the answer then press Enter.')}</p>
      </div>
    </div>
  );
}

/* ---------- المشنوق ---------- */
const AR = Array.from('ابتثجحخدذرزسشصضطظعغفقكلمنهوي');
const EN = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
const keyOf = (ch) => norm(ch) || ch;

function Gallows({ stage }) {
  const parts = [<circle key="h" cx="150" cy="62" r="16" />, <line key="b" x1="150" y1="78" x2="150" y2="125" />, <line key="la" x1="150" y1="90" x2="128" y2="112" />, <line key="ra" x1="150" y1="90" x2="172" y2="112" />, <line key="ll" x1="150" y1="125" x2="130" y2="155" />, <line key="rl" x1="150" y1="125" x2="170" y2="155" />];
  return (
    <svg viewBox="0 0 220 180" className="gallows" role="img" aria-label="hangman">
      <g stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"><line x1="30" y1="170" x2="150" y2="170" /><line x1="60" y1="170" x2="60" y2="20" /><line x1="60" y1="20" x2="150" y2="20" /><line x1="150" y1="20" x2="150" y2="46" />{parts.slice(0, stage)}</g>
    </svg>
  );
}

function HangmanGame({ content, s, report, finish, snd, t }) {
  const items = useMemo(() => (s.shuffle ? shuffle(content.items) : content.items), []); // eslint-disable-line
  const max = Math.min(10, Math.max(3, content.maxMistakes || 6));
  const [i, setI] = useState(0);
  const [guessed, setGuessed] = useState(() => new Set());
  const [miss, setMiss] = useState(0);
  const [ok, setOk] = useState(0);
  const it = items[i];
  const chars = clean(it.word);
  const letters = chars.filter((ch) => /\p{L}/u.test(ch));
  const abc = hasArabic(it.word) ? AR : EN;
  const won = letters.every((ch) => guessed.has(keyOf(ch)));
  const lost = miss >= max;
  const over = won || lost;
  const last = i + 1 >= items.length;

  const guess = (ch) => {
    if (over || guessed.has(ch)) return;
    const g = new Set(guessed).add(ch);
    setGuessed(g);
    if (letters.some((x) => keyOf(x) === ch)) {
      snd.ok();
      if (letters.every((x) => g.has(keyOf(x)))) { const n = ok + 1; setOk(n); report(n, i + 1); }
    } else {
      snd.bad();
      const m = miss + 1; setMiss(m);
      if (m >= max) report(ok, i + 1);
    }
  };
  useKeys((e) => { const k = keyOf(e.key); if (e.key.length === 1 && abc.includes(abc.find((x) => keyOf(x) === k) || '')) guess(k); }, [guessed, miss, i]);
  const next = () => { if (last) return finish(); setI(i + 1); setGuessed(new Set()); setMiss(0); };

  return (
    <div className="hang">
      <ProgressBar value={i + (over ? 1 : 0)} max={items.length} />
      <div className="hang-top"><Gallows stage={Math.ceil((miss / max) * 6)} /><div><p className="muted">{t('المحاولات المتبقية', 'Tries left')}: {max - miss}</p>{it.hint && <p className="hint-box">💡 {it.hint}</p>}</div></div>
      <div className="word" dir={hasArabic(it.word) ? 'rtl' : 'ltr'}>
        {Array.from(String(it.word).replace(/\s+/g, ' ')).filter((ch) => !/[\u064B-\u065F\u0670]/.test(ch)).map((ch, k) => (
          ch === ' ' ? <span key={k} className="sp" /> : <span key={k} className={'slot' + (lost && !guessed.has(keyOf(ch)) ? ' miss' : '')}>{!/\p{L}/u.test(ch) || guessed.has(keyOf(ch)) || lost ? ch : ''}</span>
        ))}
      </div>
      <div className="keys" dir={hasArabic(it.word) ? 'rtl' : 'ltr'}>{abc.map((ch) => <button key={ch} className={'key' + (guessed.has(keyOf(ch)) ? (letters.some((x) => keyOf(x) === keyOf(ch)) ? ' hit' : ' no') : '')} disabled={over || guessed.has(keyOf(ch))} onClick={() => guess(keyOf(ch))}>{ch}</button>)}</div>
      {over && <FeedbackBar ok={won} text={lost ? `${t('الكلمة', 'The word')}: ${it.word}` : ''} onNext={next} last={last} />}
    </div>
  );
}

/* ---------- سلسلة الكلمات ---------- */
const firstL = (w) => Array.from(norm(w).replace(/\s/g, ''))[0];
const lastL = (w) => { const a = Array.from(norm(w).replace(/\s/g, '')); return a[a.length - 1]; };

function WordChainGame({ content, report, finish, snd, t }) {
  const words = content.words;
  const [chain, setChain] = useState([words[0]]);
  const [bad, setBad] = useState(null);
  const rest = words.filter((w) => !chain.includes(w));
  const need = lastL(chain[chain.length - 1]);
  const stuck = rest.length > 0 && !rest.some((w) => firstL(w) === need);
  const pool = useMemo(() => shuffle(words.slice(1)), []); // eslint-disable-line

  useEffect(() => {
    if (rest.length === 0 || stuck) { const h = setTimeout(finish, 1400); return () => clearTimeout(h); }
  }, [rest.length, stuck]); // eslint-disable-line
  const pick = (w) => {
    if (chain.includes(w)) return;
    if (firstL(w) === need) { snd.ok(); const c = [...chain, w]; setChain(c); report(c.length, c.length); }
    else { snd.bad(); setBad(w); setTimeout(() => setBad(null), 400); }
  };
  return (
    <div className="mcq">
      <div className="q-card"><p className="muted">{t('الكلمة التالية تبدأ بالحرف', 'Next word starts with')}</p><h2 className="q-text big-letter">{need}</h2></div>
      <div className="chain">{chain.map((w, k) => <span key={k} className="link">{w}</span>)}</div>
      <div className="tiles">{pool.filter((w) => !chain.includes(w)).map((w) => <button key={w} className={'tile' + (bad === w ? ' wrongtile' : '')} onClick={() => pick(w)}>{w}</button>)}</div>
      {rest.length === 0 && <p className="ok-text center-text">🎉 {t('أكملت السلسلة!', 'Chain complete!')}</p>}
      {stuck && <p className="bad-text center-text">{t('لا توجد كلمة تكمل السلسلة. انتهت اللعبة.', 'No word continues the chain. Game over.')}</p>}
    </div>
  );
}

/* ---------- متاهة المفاهيم ---------- */
function genMaze(n) {
  const cell = () => ({ t: true, r: true, b: true, l: true, v: false });
  const g = Array.from({ length: n }, () => Array.from({ length: n }, cell));
  const st = [[0, 0]]; g[0][0].v = true;
  while (st.length) {
    const [r, c] = st[st.length - 1];
    const nb = [[r - 1, c, 't', 'b'], [r, c + 1, 'r', 'l'], [r + 1, c, 'b', 't'], [r, c - 1, 'l', 'r']].filter(([y, x]) => y >= 0 && x >= 0 && y < n && x < n && !g[y][x].v);
    if (!nb.length) { st.pop(); continue; }
    const [y, x, a, b] = nb[rnd(nb.length)];
    g[r][c][a] = false; g[y][x][b] = false; g[y][x].v = true; st.push([y, x]);
  }
  // مسار الحل بـ BFS
  const prev = {}, q = [[0, 0]]; prev['0,0'] = null;
  while (q.length) {
    const [r, c] = q.shift();
    for (const [y, x, w] of [[r - 1, c, 't'], [r, c + 1, 'r'], [r + 1, c, 'b'], [r, c - 1, 'l']]) {
      if (y < 0 || x < 0 || y >= n || x >= n || g[r][c][w] || `${y},${x}` in prev) continue;
      prev[`${y},${x}`] = [r, c]; q.push([y, x]);
    }
  }
  const path = [];
  for (let k = [n - 1, n - 1]; k; k = prev[`${k[0]},${k[1]}`]) path.unshift(k);
  return { g, path };
}

function MazeGame({ content, s, report, finish, snd, t }) {
  const n = Math.min(12, Math.max(5, content.size || 7));
  const qs = useMemo(() => prepQuestions(content, s), []); // eslint-disable-line
  const { g, path } = useMemo(() => genMaze(n), [n]);
  const gates = useMemo(() => {
    const out = {};
    const usable = path.slice(1, -1);
    const used = new Set();
    qs.forEach((q, k) => {
      let idx = Math.min(usable.length - 1, Math.floor(((k + 1) * usable.length) / (qs.length + 1)));
      while (used.has(idx) && idx < usable.length - 1) idx++;
      while (used.has(idx) && idx > 0) idx--;
      if (!used.has(idx)) { used.add(idx); out[usable[idx].join(',')] = k; }
    });
    return out;
  }, [path, qs]);
  const [pos, setPos] = useState([0, 0]);
  const [open, setOpen] = useState({});
  const [gate, setGate] = useState(null);
  const [wrongSet, setWrongSet] = useState({});
  const [dirty, setDirty] = useState({});
  const [ok, setOk] = useState(0);
  const gateCount = Object.keys(gates).length;

  const move = (dir) => {
    if (gate !== null) return;
    const [r, c] = pos;
    const d = { up: [-1, 0, 't'], right: [0, 1, 'r'], down: [1, 0, 'b'], left: [0, -1, 'l'] }[dir];
    if (g[r][c][d[2]]) return;
    const np = [r + d[0], c + d[1]];
    setPos(np);
    const key = np.join(',');
    if (key in gates && !open[key]) setGate(gates[key]);
    if (np[0] === n - 1 && np[1] === n - 1) setTimeout(finish, 600);
  };
  useKeys((e) => {
    const m = { ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' }[e.key];
    if (m) { e.preventDefault(); move(m); }
  }, [pos, gate, open]);
  const answer = (k) => {
    const q = qs[gate];
    if (q.opts[k].ok) {
      snd.ok();
      const key = pos.join(',');
      setOpen({ ...open, [key]: true });
      const good = dirty[gate] ? ok : ok + 1;
      setOk(good); report(good, Object.keys(open).length + 1);
      setGate(null);
    } else { snd.bad(); setWrongSet({ ...wrongSet, [gate + ':' + k]: true }); setDirty({ ...dirty, [gate]: true }); }
  };
  const q = gate !== null ? qs[gate] : null;
  return (
    <div className="mcq">
      <p className="muted center-text">{t('البوابات المفتوحة', 'Gates opened')}: {Object.keys(open).length}/{gateCount} · {t('اصل إلى 🏁', 'Reach 🏁')}</p>
      <div className="maze" dir="ltr" style={{ '--n': n }}>
        {g.flatMap((row, r) => row.map((cell, c) => {
          const key = `${r},${c}`;
          return <div key={key} className={'mz' + (cell.t ? ' t' : '') + (cell.r ? ' r' : '') + (cell.b ? ' b' : '') + (cell.l ? ' l' : '')}>
            {pos[0] === r && pos[1] === c ? <span className="me">🧑‍🚀</span> : r === n - 1 && c === n - 1 ? '🏁' : key in gates ? (open[key] ? '🔓' : '🔒') : ''}
          </div>;
        }))}
      </div>
      <div className="dpad" dir="ltr">
        <button onClick={() => move('up')} aria-label="up">▲</button><div><button onClick={() => move('left')} aria-label="left">◀</button><button onClick={() => move('down')} aria-label="down">▼</button><button onClick={() => move('right')} aria-label="right">▶</button></div>
      </div>
      {q && (
        <div className="gate-box"><h3>🔒 {t('أجب لتفتح البوابة', 'Answer to open the gate')}</h3><p className="q-text">{q.question}</p>
          <div className="opts">{q.opts.map((o, k) => <button key={k} className={`opt c${k % 6} ${wrongSet[gate + ':' + k] ? 'wrong' : ''}`} disabled={!!wrongSet[gate + ':' + k]} onClick={() => answer(k)}><b>{'ABCDEF'[k]}</b><span>{o.text}</span></button>)}</div></div>
      )}
    </div>
  );
}

/* ---------- اكتشف الفروق ---------- */
function SpotDiffGame({ content, report, finish, snd, t }) {
  const diffs = content.diffs;
  const [found, setFound] = useState({});
  const [mist, setMist] = useState(0);
  const [flash, setFlash] = useState(null);
  const click = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const c = { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, w: r.width, h: r.height };
    const k = diffs.findIndex((d, idx) => !found[idx] && Math.hypot(((d.x - c.x) / 100) * c.w, ((d.y - c.y) / 100) * c.h) <= 0.07 * c.w);
    if (k >= 0) {
      snd.ok();
      const nf = { ...found, [k]: true }; setFound(nf); report(Object.keys(nf).length, Object.keys(nf).length + mist);
      if (Object.keys(nf).length === diffs.length) setTimeout(finish, 900);
    } else { snd.bad(); setMist(mist + 1); setFlash({ x: c.x, y: c.y }); setTimeout(() => setFlash(null), 400); }
  };
  const panel = (src) => (
    <div className="map diff" onClick={click}>
      <img src={src} alt="" draggable="false" />
      {diffs.map((d, k) => found[k] && <span key={k} className="ring" style={{ left: d.x + '%', top: d.y + '%' }} />)}
      {flash && <span className="pin guess" style={{ left: flash.x + '%', top: flash.y + '%' }}>❌</span>}
    </div>
  );
  return (
    <div className="mcq">
      <p className="center-text"><b>{t('الفروق', 'Differences')}: {Object.keys(found).length}/{diffs.length}</b> · {t('الأخطاء', 'Mistakes')}: {mist}</p>
      <div className="diff-pair">{panel(content.imageA)}{panel(content.imageB)}</div>
    </div>
  );
}

/* ---------- سودوكو ---------- */
function genSudoku(size) {
  const br = 2, bc = size === 6 ? 3 : 2;
  const grid = Array.from({ length: size }, () => Array(size).fill(-1));
  const okAt = (r, c, v) => {
    for (let k = 0; k < size; k++) if (grid[r][k] === v || grid[k][c] === v) return false;
    const r0 = r - (r % br), c0 = c - (c % bc);
    for (let y = r0; y < r0 + br; y++) for (let x = c0; x < c0 + bc; x++) if (grid[y][x] === v) return false;
    return true;
  };
  const fill = (idx) => {
    if (idx === size * size) return true;
    const r = Math.floor(idx / size), c = idx % size;
    for (const v of shuffle(Array.from({ length: size }, (_, k) => k))) if (okAt(r, c, v)) { grid[r][c] = v; if (fill(idx + 1)) return true; grid[r][c] = -1; }
    return false;
  };
  fill(0);
  return { sol: grid, br, bc };
}

function SudokuGame({ content, report, finish, snd, t }) {
  const size = content.size === 6 ? 6 : 4;
  const sym = content.symbols;
  const { sol, br, bc } = useMemo(() => genSudoku(size), [size]);
  const blanks = useMemo(() => new Set(shuffle(Array.from({ length: size * size }, (_, k) => k)).slice(0, content.blanks)), []); // eslint-disable-line
  const [cur, setCur] = useState(() => sol.map((row, r) => row.map((v, c) => (blanks.has(r * size + c) ? -1 : v))));
  const [sel, setSel] = useState(null);
  const [checked, setChecked] = useState(false);
  const conflict = (r, c) => {
    const v = cur[r][c];
    if (v < 0) return false;
    for (let k = 0; k < size; k++) if ((k !== c && cur[r][k] === v) || (k !== r && cur[k][c] === v)) return true;
    const r0 = r - (r % br), c0 = c - (c % bc);
    for (let y = r0; y < r0 + br; y++) for (let x = c0; x < c0 + bc; x++) if ((y !== r || x !== c) && cur[y][x] === v) return true;
    return false;
  };
  const set = (v) => { if (!sel) return; const [r, c] = sel; const n = cur.map((row) => [...row]); n[r][c] = v; setCur(n); setChecked(false); };
  const correct = () => [...blanks].filter((k) => cur[Math.floor(k / size)][k % size] === sol[Math.floor(k / size)][k % size]).length;
  const check = () => { setChecked(true); const n = correct(); report(n, blanks.size); n === blanks.size ? snd.ok() : snd.bad(); if (n === blanks.size) setTimeout(finish, 900); };
  return (
    <div className="sudoku">
      <div className="sd-grid" dir="ltr" style={{ '--n': size }}>
        {cur.flatMap((row, r) => row.map((v, c) => {
          const given = !blanks.has(r * size + c);
          const wrong = checked && !given && v >= 0 && v !== sol[r][c];
          return <button key={r + ',' + c} className={'sd-cell' + (given ? ' given' : '') + (sel && sel[0] === r && sel[1] === c ? ' sel' : '') + (conflict(r, c) ? ' conf' : '') + (wrong ? ' wrong' : '') + (c % bc === bc - 1 && c < size - 1 ? ' vb' : '') + (r % br === br - 1 && r < size - 1 ? ' hb' : '')} onClick={() => !given && setSel([r, c])}>{v >= 0 ? sym[v] : ''}</button>;
        }))}
      </div>
      <div className="tiles">{sym.slice(0, size).map((s, k) => <button key={k} className="tile" onClick={() => set(k)}>{s}</button>)}<button className="tile" onClick={() => set(-1)} aria-label="erase">⌫</button></div>
      <div className="row center"><button className="btn primary" onClick={check}>{t('تحقق', 'Check')}</button>{checked && <button className="btn" onClick={finish}>{t('إنهاء', 'Finish')}</button>}</div>
      {checked && <p className="center-text bad-text">{correct()}/{blanks.size} {t('صحيحة — عدّل وأعد التحقق', 'correct — adjust and check again')}</p>}
    </div>
  );
}

/* ---------- جيجسو ---------- */
function JigsawGame({ content, report, finish, snd, t }) {
  const { rows, cols, image } = content;
  const total = rows * cols;
  const [order, setOrder] = useState(() => { let o = shuffle(Array.from({ length: total }, (_, k) => k)); for (let a = 0; a < 6 && o.every((x, k) => x === k); a++) o = shuffle(o); return o; });
  const [sel, setSel] = useState(null);
  const [ratio, setRatio] = useState(4 / 3);
  const [peek, setPeek] = useState(false);
  useEffect(() => { const im = new Image(); im.onload = () => im.naturalWidth && setRatio(im.naturalWidth / im.naturalHeight); im.src = image; }, [image]);
  const placed = order.filter((x, k) => x === k).length;
  const swap = (k) => {
    if (sel === null) return setSel(k);
    if (sel === k) return setSel(null);
    const o = [...order]; [o[sel], o[k]] = [o[k], o[sel]]; setOrder(o); setSel(null);
    const n = o.filter((x, j) => x === j).length;
    n > placed ? snd.ok() : snd.bad();
    report(n, total);
    if (n === total) setTimeout(finish, 900);
  };
  return (
    <div className="jig">
      <p className="center-text muted">{t('في مكانها', 'In place')}: {placed}/{total}</p>
      <div className="jig-board" dir="ltr" style={{ '--cols': cols, aspectRatio: String(ratio) }}>
        {order.map((piece, k) => {
          const pr = Math.floor(piece / cols), pc = piece % cols;
          return <button key={k} className={'jig-piece' + (sel === k ? ' sel' : '') + (piece === k ? ' ok' : '')} onClick={() => swap(k)} aria-label={`piece ${k + 1}`}
            style={{ backgroundImage: `url("${image}")`, backgroundSize: `${cols * 100}% ${rows * 100}%`, backgroundPosition: `${cols > 1 ? (pc / (cols - 1)) * 100 : 0}% ${rows > 1 ? (pr / (rows - 1)) * 100 : 0}%` }} />;
        })}
      </div>
      <div className="row center"><button className="btn" onClick={() => setPeek(!peek)}>👁 {t('الصورة المرجعية', 'Reference')}</button><button className="btn ghost" onClick={finish}>{t('إنهاء', 'Finish')}</button></div>
      {peek && <img className="jig-ref" src={image} alt="" />}
    </div>
  );
}

export const extra2 = { crossword: CrosswordGame, hangman: HangmanGame, wordchain: WordChainGame, maze: MazeGame, spotdiff: SpotDiffGame, sudoku: SudokuGame, jigsaw: JigsawGame };
