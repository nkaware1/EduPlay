// تحويل محتوى النشاط بين القوالب المتوافقة.
// الفكرة: نستخلص من المحتوى الحالي «واجهات» عامة (أسئلة، أزواج، سؤال/جواب، كلمات، استطلاعات، رسم حواري)
// ثم نبني منها محتوى القالب الهدف إن كانت المعطيات كافية.
import { DEFAULTS } from '../templates/defaults.js';
import { TEMPLATES, TEMPLATE_MAP } from '../templates/meta.js';
import { hasArabic, isImageUrl, shuffle } from './text.js';

const MCQ = ['quiz', 'asterquiz', 'froggy', 'videoquiz', 'racing', 'millionaire', 'speedtest', 'triviashow', 'hiddenimage', 'maze'];
const DECKS = ['charades', 'scavenger', 'fivesec', 'tower', 'innovation'];
const s = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());
const nz = (a) => a.filter((x) => x);
const blanksOf = (t) => [...String(t || '').matchAll(/\[\[(.+?)\]\]/g)].map((m) => m[1].trim());

// أسئلة اختيار من متعدد من أزواج سؤال→جواب (المشتتات من إجابات الأسئلة الأخرى)
function mcqFromQa(qa) {
  const answers = [...new Set(qa.map((x) => x.a))];
  return nz(qa.map((x) => {
    const others = shuffle(answers.filter((a) => a !== x.a)).slice(0, 3);
    if (!others.length) return null;
    const options = shuffle([x.a, ...others]);
    return { question: x.q, options, answer: options.indexOf(x.a), feedback: x.h || '', image: '' };
  }));
}

export function facets(type, c) {
  const f = {};
  const qaToPairs = (qa) => qa.map((x) => ({ l: x.q, r: x.a }));
  if (MCQ.includes(type)) {
    const qs = (c.questions || []).filter((q) => s(q.question) && (q.options || []).filter(s).length >= 2 && q.options[q.answer]);
    f.questions = qs;
    f.qa = qs.map((q) => ({ q: s(q.question), a: s(q.options[q.answer]), h: s(q.feedback) }));
    f.polls = qs.map((q) => ({ question: s(q.question), options: nz(q.options.map(s)) }));
  } else if (type === 'truefalse') {
    const st = (c.statements || []).filter((x) => s(x.text));
    f.questions = st.map((x) => ({ question: s(x.text), options: ['صح', 'خطأ'], answer: x.answer ? 0 : 1, feedback: s(x.feedback), image: '' }));
    f.polls = st.map((x) => ({ question: s(x.text), options: ['صح', 'خطأ'] }));
  } else if (['matching', 'memory', 'flashcards'].includes(type)) {
    const raw = type === 'matching' ? (c.pairs || []).map((p) => [p.left, p.right]) : type === 'memory' ? (c.pairs || []).map((p) => [p.a, p.b]) : (c.cards || []).map((p) => [p.front, p.back]);
    f.pairs = raw.map(([l, r]) => ({ l: s(l), r: s(r) })).filter((p) => p.l && p.r);
    f.words = f.pairs.map((p) => p.r);
    if (!f.pairs.some((p) => isImageUrl(p.l) || isImageUrl(p.r))) f.qa = f.pairs.map((p) => ({ q: p.l, a: p.r, h: '' }));
  } else if (type === 'vocab') {
    f.pairs = (c.items || []).filter((x) => s(x.image) && s(x.word)).map((x) => ({ l: s(x.image), r: s(x.word) }));
    f.words = f.pairs.map((p) => p.r);
  } else if (['riddle', 'crossword', 'hangman', 'escape', 'unscramble'].includes(type)) {
    const list = c.entries || c.items || [];
    const map = {
      riddle: (x) => ({ q: s(x.question), a: s(x.answer), h: s(x.hint) }), escape: (x) => ({ q: s(x.question), a: s(x.answer), h: s(x.hint) }),
      crossword: (x) => ({ q: s(x.clue), a: s(x.answer), h: '' }), hangman: (x) => ({ q: s(x.hint), a: s(x.word), h: s(x.hint) }),
      unscramble: (x) => ({ q: s(x.hint), a: s(x.answer), h: s(x.hint) }),
    }[type];
    f.qa = list.map(map).filter((x) => x.a);
    f.words = f.qa.map((x) => x.a);
  } else if (type === 'fillblanks') {
    f.qa = nz((c.items || []).map((it) => {
      const b = blanksOf(it.text);
      if (!b.length) return null;
      return { q: s(it.text).replace(/\[\[(.+?)\]\]/g, '____'), a: b[0], h: '' };
    }));
    f.words = (c.items || []).flatMap((it) => blanksOf(it.text));
  } else if (type === 'groupsort') {
    const pairs = (c.groups || []).flatMap((g) => (g.items || []).map((i) => ({ l: s(i), r: s(g.name) }))).filter((p) => p.l && p.r);
    f.pairs = pairs;
    f.words = pairs.map((p) => p.l);
    const names = nz((c.groups || []).map((g) => s(g.name))).slice(0, 6);
    if (names.length >= 2) f.questions = pairs.filter((p) => names.includes(p.r)).map((p) => ({ question: `إلى أي مجموعة ينتمي: ${p.l}؟`, options: names, answer: names.indexOf(p.r), feedback: '', image: '' }));
  } else if (type === 'oddone') {
    f.questions = (c.items || []).filter((x) => (x.group || []).length >= 2 && s(x.odd)).map((x) => { const o = shuffle([...x.group.map(s), s(x.odd)]); return { question: 'اختر الكلمة التي لا تنتمي للمجموعة', options: o, answer: o.indexOf(s(x.odd)), feedback: s(x.reason), image: '' }; });
  } else if (type === 'pattern') {
    f.questions = (c.items || []).filter((x) => s(x.sequence) && s(x.answer)).map((x) => { const o = shuffle([...new Set([s(x.answer), ...String(x.distractors || '').split(/[,،]/).map(s).filter(Boolean)])]); return { question: `${s(x.sequence)} ، ؟`, options: o, answer: o.indexOf(s(x.answer)), feedback: '', image: '' }; }).filter((q) => q.options.length >= 2);
  } else if (type === 'truthslie') {
    f.questions = (c.items || []).filter((x) => s(x.lie) && (x.truths || []).length >= 1).map((x) => { const o = shuffle([...x.truths.map(s), s(x.lie)]); return { question: 'أي عبارة منها كذبة؟', options: o, answer: o.indexOf(s(x.lie)), feedback: '', image: '' }; });
  } else if (type === 'dialogue') {
    f.questions = (c.steps || []).filter((x) => s(x.line) && (x.choices || []).some((o) => o.correct) && x.choices.length >= 2).map((x) => ({ question: s(x.line), options: x.choices.map((o) => s(o.text)), answer: x.choices.findIndex((o) => o.correct), feedback: s(x.response), image: '' }));
  } else if (['poll', 'wyr'].includes(type)) {
    f.polls = type === 'poll' ? (c.questions || []).map((q) => ({ question: s(q.question), options: nz((q.options || []).map(s)) })).filter((q) => q.question && q.options.length >= 2)
      : (c.items || []).filter((x) => s(x.a) && s(x.b)).map((x) => ({ question: 'أيهما تفضّل؟', options: [s(x.a), s(x.b)] }));
  } else if (type === 'wordsearch' || type === 'wordchain') f.words = nz((c.words || []).map(s));
  else if (type === 'bingo') f.words = nz((c.traits || []).map(s));
  else if (type === 'lineup' || type === 'wheel' || DECKS.includes(type)) f.words = nz((c.items || []).map(s));
  else if (type === 'dictation') f.words = nz((c.items || []).map((x) => s(x.text)));
  else if (type === 'slideshow') f.qa = (c.slides || []).filter((x) => s(x.title) && s(x.text)).map((x) => ({ q: s(x.title), a: s(x.text), h: '' }));
  else if (['roleplay', 'decisiontree'].includes(type) && (c.nodes || []).length) f.graph = c;

  // اشتقاق الواجهات الناقصة
  if (f.qa && !f.pairs) f.pairs = f.qa.filter((x) => x.q).map((x) => ({ l: x.q, r: x.a }));
  if (f.pairs && !f.qa && type !== 'groupsort' && !f.pairs.some((p) => isImageUrl(p.l))) f.qa = f.pairs.map((p) => ({ q: p.l, a: p.r, h: '' }));
  if (f.qa && !f.words) f.words = f.qa.map((x) => x.a);
  if (!f.questions && f.qa && f.qa.length) { const q = mcqFromQa(f.qa); if (q.length) f.questions = q; }
  if (!f.polls && f.questions) f.polls = f.questions.map((q) => ({ question: q.question, options: q.options }));
  return f;
}

const ok = (a, n = 1) => Array.isArray(a) && a.length >= n;

// يبني محتوى القالب الهدف من الواجهات؛ يعيد null عند عدم كفاية المعطيات
function build(to, f, cur) {
  const base = DEFAULTS[to] ? DEFAULTS[to]() : null;
  if (!base) return null;
  if (MCQ.includes(to)) return ok(f.questions) ? { ...base, questions: f.questions.map((q) => ({ ...q })) } : null;
  switch (to) {
    case 'truefalse': {
      if (!ok(f.pairs, 2)) return null;
      const rs = [...new Set(f.pairs.map((p) => p.r))];
      const st = f.pairs.flatMap((p) => {
        const out = [{ text: `${p.l}: ${p.r}`, answer: true, feedback: '' }];
        const other = shuffle(rs.filter((r) => r !== p.r))[0];
        if (other) out.push({ text: `${p.l}: ${other}`, answer: false, feedback: `${p.l}: ${p.r}` });
        return out;
      });
      return { statements: shuffle(st) };
    }
    case 'matching': return ok(f.pairs, 2) ? { pairs: f.pairs.map((p) => ({ left: p.l, right: p.r })) } : null;
    case 'memory': return ok(f.pairs, 2) ? { pairs: f.pairs.slice(0, 12).map((p) => ({ a: p.l, b: p.r })) } : null;
    case 'flashcards': return ok(f.pairs) ? { cards: f.pairs.map((p) => ({ front: p.l, back: p.r })) } : null;
    case 'slideshow': return ok(f.pairs) ? { slides: f.pairs.map((p) => ({ title: isImageUrl(p.l) ? '' : p.l, text: isImageUrl(p.r) ? '' : p.r, image: isImageUrl(p.l) ? p.l : '' })) } : null;
    case 'riddle': return ok(f.qa) && f.qa.every((x) => x.q) ? { items: f.qa.map((x) => ({ question: x.q, answer: x.a, alternatives: '', hint: x.h })) } : null;
    case 'escape': return ok(f.qa) && f.qa.every((x) => x.q) ? { intro: '', items: f.qa.map((x) => ({ scene: '', question: x.q, answer: x.a, alternatives: '', hint: x.h })) } : null;
    case 'crossword': { const e = (f.qa || []).filter((x) => x.q && x.a.replace(/\s/g, '').length >= 2); return ok(e, 2) ? { entries: e.map((x) => ({ answer: x.a, clue: x.q })) } : null; }
    case 'hangman': {
      const items = f.qa ? f.qa.filter((x) => x.a.replace(/\s/g, '').length >= 2).map((x) => ({ word: x.a, hint: x.q || x.h })) : (f.words || []).filter((w) => w.replace(/\s/g, '').length >= 2).map((w) => ({ word: w, hint: '' }));
      return ok(items) ? { maxMistakes: 6, items } : null;
    }
    case 'unscramble': {
      const items = f.qa ? f.qa.filter((x) => x.a.replace(/\s/g, '').length >= 2).map((x) => ({ answer: x.a, hint: x.q || x.h })) : (f.words || []).filter((w) => w.replace(/\s/g, '').length >= 2).map((w) => ({ answer: w, hint: '' }));
      return ok(items) ? { mode: 'letters', items } : null;
    }
    case 'fillblanks': {
      const qa = (f.qa || []).filter((x) => x.q && x.a);
      if (!ok(qa, 2)) return null;
      return { items: qa.map((x) => ({ text: `${x.q.replace(/\?|؟/g, '').trim()}: [[${x.a}]]` })), distractors: [] };
    }
    case 'groupsort': {
      if (!ok(f.pairs, 2)) return null;
      const g = {};
      f.pairs.forEach((p) => (g[p.r] ||= []).push(p.l));
      const groups = Object.entries(g).map(([name, items]) => ({ name, items }));
      return groups.length >= 2 && groups.length <= 6 && groups.some((x) => x.items.length >= 2) ? { groups } : null;
    }
    case 'wordsearch': { const w = (f.words || []).map((x) => x.replace(/\s+/g, '')).filter((x) => x.length >= 2 && x.length <= 14); return ok(w) ? { size: 10, words: w.slice(0, 14) } : null; }
    case 'wheel': return ok(f.words, 2) ? { items: f.words } : null;
    case 'lineup': return ok(f.words, 2) ? { prompt: '', items: f.words.slice(0, 12) } : null;
    case 'wordchain': return ok(f.words, 3) ? { words: f.words } : null;
    case 'bingo': return ok(f.words, 4) ? { traits: f.words.slice(0, 16) } : null;
    case 'dictation': return ok(f.words) ? { items: f.words.map((w) => ({ text: w, lang: hasArabic(w) ? 'ar' : 'en', audioUrl: '' })) } : null;
    case 'poll': return ok(f.polls) ? { questions: f.polls.map((p) => ({ question: p.question, options: p.options.slice(0, 6) })) } : null;
    case 'wyr': { const p = (f.polls || []).filter((x) => x.options.length >= 2); return ok(p) ? { items: p.map((x) => ({ a: x.options[0], b: x.options[1] })) } : null; }
    case 'roleplay': return f.graph ? { ...f.graph, role: f.graph.role || '' } : null;
    case 'decisiontree': { if (!f.graph) return null; const { role, ...rest } = f.graph; return rest; }
    default:
      if (DECKS.includes(to)) return ok(f.words) ? { ...base, items: f.words } : null;
      return null;
  }
}

// القوالب المتاحة كهدف للتحويل مع المحتوى الناتج
export function conversionTargets(from, content) {
  const f = facets(from, content);
  return TEMPLATES.filter((m) => m.id !== from).map((m) => {
    let out = null;
    try { out = build(m.id, f, content); } catch { out = null; }
    return out ? { id: m.id, content: out, count: TEMPLATE_MAP[m.id].count(out) } : null;
  }).filter((x) => x && x.count > 0);
}
