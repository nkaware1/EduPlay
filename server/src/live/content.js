// أي القوالب تدعم اللعب المباشر، وكيف يُستخرج محتواها (على الخادم، فالإجابات الصحيحة لا تغادر الخادم أثناء السؤال)
import { validateContent } from '../validate.js';

const MCQ = ['quiz', 'asterquiz', 'froggy', 'racing', 'millionaire', 'speedtest', 'triviashow', 'hiddenimage', 'maze'];

// الوضع الأول هو الافتراضي
export const LIVE_MODES = {
  racing: ['race', 'quiz'],
  triviashow: ['quiz'],
  poll: ['poll'],
  wyr: ['poll'],
  brainstorm: ['board'],
};
for (const t of [...MCQ, 'truefalse', 'oddone', 'pattern', 'truthslie']) LIVE_MODES[t] ??= ['quiz', 'race'];

const shuffle = (a) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
};
const splitList = (s) => String(s || '').split(/[,،]/).map((x) => x.trim()).filter(Boolean);
const q = (text, options, answer, image = '') => ({ text: String(text), options: options.map(String), answer, image: String(image || '') });

export function liveContent(a) {
  const c = a.content;
  const err = validateContent(a.type, c, true);
  if (err) return { error: `أكمل النشاط أولًا: ${err}` };
  const modes = LIVE_MODES[a.type];
  if (!modes) return { error: 'هذا القالب لا يدعم اللعب المباشر' };
  let questions = [];
  if (MCQ.includes(a.type)) questions = c.questions.map((x) => q(x.question, x.options, x.answer, x.image));
  else if (a.type === 'truefalse') questions = c.statements.map((x) => q(x.text, ['صح', 'خطأ'], x.answer ? 0 : 1));
  else if (a.type === 'oddone') questions = c.items.map((x) => { const o = shuffle([...x.group, x.odd]); return q('اختر الكلمة التي لا تنتمي للمجموعة', o, o.indexOf(x.odd)); });
  else if (a.type === 'pattern') questions = c.items.map((x) => { const o = shuffle([...new Set([String(x.answer), ...splitList(x.distractors)])]); return q(`${x.sequence} ، ؟`, o, o.indexOf(String(x.answer))); });
  else if (a.type === 'truthslie') questions = c.items.map((x) => { const o = shuffle([...x.truths, x.lie]); return q(`${x.who ? x.who + ': ' : ''}أي عبارة منها كذبة؟`, o, o.indexOf(x.lie)); });
  questions = questions.slice(0, 100);

  if (a.type === 'poll') return { modes, polls: c.questions.slice(0, 50).map((x) => ({ text: x.question, options: x.options.slice(0, 6) })) };
  if (a.type === 'wyr') return { modes, polls: c.items.slice(0, 50).map((x) => ({ text: 'أيهما تفضّل؟', options: [x.a, x.b] })) };
  if (a.type === 'brainstorm') return { modes, board: { prompt: c.prompt, columns: c.columns.slice(0, 6) } };
  const teams = a.type === 'triviashow' ? c.teams.slice(0, 4) : [];
  return { modes, questions, teams };
}
