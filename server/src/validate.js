// التحقق من محتوى كل قالب (يُطبَّق بصرامة عند النشر فقط، أما المسودات فتُحفظ كما هي).
const s = (v) => typeof v === 'string' && v.trim().length > 0;
const arr = (v, min = 1) => Array.isArray(v) && v.length >= min;

const each = (list, min, msg, fn) => {
  if (!arr(list, min)) return msg;
  for (let i = 0; i < list.length; i++) {
    const e = fn(list[i] || {}, i);
    if (e) return `العنصر ${i + 1}: ${e}`;
  }
  return null;
};

const mcq = (list) =>
  each(list, 1, 'أضف سؤالًا واحدًا على الأقل', (q) => {
    if (!s(q.question)) return 'نص السؤال فارغ';
    if (!arr(q.options, 2) || q.options.length > 6 || !q.options.every(s)) return 'يلزم 2–6 خيارات غير فارغة';
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) return 'حدد الإجابة الصحيحة';
    return null;
  });

const V = {
  quiz: (c) => mcq(c.questions),
  asterquiz: (c) => mcq(c.questions),
  froggy: (c) => mcq(c.questions),
  videoquiz: (c) => (s(c.videoUrl) ? mcq(c.questions) : 'أضف رابط الفيديو'),
  truefalse: (c) =>
    each(c.statements, 1, 'أضف عبارة واحدة على الأقل', (x) =>
      !s(x.text) ? 'العبارة فارغة' : typeof x.answer !== 'boolean' ? 'حدد صح أو خطأ' : null,
    ),
  riddle: (c) =>
    each(c.items, 1, 'أضف لغزًا واحدًا على الأقل', (x) =>
      !s(x.question) ? 'نص اللغز فارغ' : !s(x.answer) ? 'الإجابة فارغة' : null,
    ),
  matching: (c) =>
    each(c.pairs, 2, 'أضف زوجين على الأقل', (x) => (!s(x.left) || !s(x.right) ? 'الطرفان مطلوبان' : null)),
  memory: (c) =>
    each(c.pairs, 2, 'أضف زوجين على الأقل', (x) => (!s(x.a) || !s(x.b) ? 'البطاقتان مطلوبتان' : null)),
  groupsort: (c) =>
    each(c.groups, 2, 'أضف مجموعتين على الأقل', (g) =>
      !s(g.name) ? 'اسم المجموعة فارغ' : !arr(g.items) || !g.items.every(s) ? 'أضف عناصر للمجموعة' : null,
    ),
  lineup: (c) => (arr(c.items, 2) && c.items.every(s) ? null : 'أضف عنصرين على الأقل'),
  unscramble: (c) =>
    each(c.items, 1, 'أضف عنصرًا واحدًا على الأقل', (x) => {
      if (!s(x.answer)) return 'الإجابة فارغة';
      const n = c.mode === 'words' ? x.answer.trim().split(/\s+/).length : x.answer.replace(/\s/g, '').length;
      return n < 2 ? 'يلزم حرفان/كلمتان على الأقل' : null;
    }),
  fillblanks: (c) =>
    each(c.items, 1, 'أضف نصًا واحدًا على الأقل', (x) =>
      /\[\[.+?\]\]/.test(x.text || '') ? null : 'ضع الكلمة المخفية بين [[ ]]',
    ),
  wordsearch: (c) =>
    !arr(c.words) || !c.words.every(s) ? 'أضف كلمة واحدة على الأقل' : null,
  dictation: (c) => each(c.items, 1, 'أضف جملة واحدة على الأقل', (x) => (s(x.text) ? null : 'النص فارغ')),
  flashcards: (c) =>
    each(c.cards, 1, 'أضف بطاقة واحدة على الأقل', (x) => (!s(x.front) || !s(x.back) ? 'وجها البطاقة مطلوبان' : null)),
  slideshow: (c) =>
    each(c.slides, 1, 'أضف شريحة واحدة على الأقل', (x) => (s(x.title) || s(x.text) || s(x.image) ? null : 'الشريحة فارغة')),
  dialogue: (c) =>
    each(c.steps, 1, 'أضف خطوة حوار واحدة على الأقل', (x) => {
      if (!s(x.line)) return 'نص المحاور فارغ';
      if (!arr(x.choices, 2) || !x.choices.every((o) => s(o.text))) return 'يلزم خياران للرد على الأقل';
      return x.choices.some((o) => o.correct) ? null : 'حدد الرد الصحيح';
    }),
  wheel: (c) => (arr(c.items, 2) && c.items.every(s) ? null : 'أضف عنصرين على الأقل'),
};


const graph = (c) => {
  if (!arr(c.nodes, 2)) return 'أضف عقدتين على الأقل';
  const ids = new Set(c.nodes.map((n) => n.id));
  if (!ids.has(c.start)) return 'حدد عقدة البداية';
  if (!c.nodes.some((n) => n.end)) return 'أضف نهاية واحدة على الأقل';
  for (const n of c.nodes) {
    if (!s(n.text)) return `العقدة ${n.id}: النص فارغ`;
    if (!n.end) {
      if (!arr(n.choices, 1)) return `العقدة ${n.id}: أضف خيارًا واحدًا على الأقل`;
      if (!n.choices.every((ch) => s(ch.text) && ids.has(ch.next))) return `العقدة ${n.id}: خيار بلا نص أو بلا وجهة`;
    }
  }
  return null;
};
const points = (c, nameKey, min = 1) =>
  s(c.image) ? each(c.points, min, 'أضف نقطة واحدة على الخريطة', (x) => (!s(x[nameKey]) ? 'اسم النقطة فارغ' : null)) : 'أضف صورة';
const deck = (c) => (arr(c.items, 1) && c.items.every(s) ? null : 'أضف عنصرًا واحدًا على الأقل');

Object.assign(V, {
  racing: (c) => mcq(c.questions),
  millionaire: (c) => mcq(c.questions),
  speedtest: (c) => mcq(c.questions),
  triviashow: (c) => (arr(c.teams, 2) && c.teams.every(s) ? mcq(c.questions) : 'أضف فريقين على الأقل'),
  hiddenimage: (c) => (s(c.image) ? mcq(c.questions) : 'أضف الصورة المخفية'),
  vocab: (c) => each(c.items, 2, 'أضف صورتين على الأقل', (x) => (!s(x.image) || !s(x.word) ? 'الصورة والكلمة مطلوبتان' : null)),
  oddone: (c) =>
    each(c.items, 1, 'أضف مجموعة واحدة على الأقل', (x) =>
      !arr(x.group, 2) || !x.group.every(s) ? 'أضف كلمتين مترابطتين على الأقل' : !s(x.odd) ? 'أضف الكلمة الغريبة' : null,
    ),
  pattern: (c) => each(c.items, 1, 'أضف نمطًا واحدًا على الأقل', (x) => (!s(x.sequence) || !s(x.answer) ? 'التسلسل والإجابة مطلوبان' : null)),
  truthslie: (c) =>
    each(c.items, 1, 'أضف جولة واحدة على الأقل', (x) =>
      !arr(x.truths, 2) || !x.truths.every(s) ? 'أضف حقيقتين على الأقل' : !s(x.lie) ? 'أضف الكذبة' : null,
    ),
  escape: (c) => each(c.items, 1, 'أضف لغزًا واحدًا على الأقل', (x) => (!s(x.question) || !s(x.answer) ? 'اللغز والإجابة مطلوبان' : null)),
  mapquiz: (c) => points(c, 'name'),
  hotspots: (c) => points(c, 'title'),
  crossword: (c) =>
    each(c.entries, 2, 'أضف كلمتين على الأقل', (x) =>
      !s(x.answer) || !s(x.clue) ? 'الكلمة والتلميح مطلوبان' : x.answer.replace(/\s/g, '').length < 2 ? 'الكلمة قصيرة جدًا' : null,
    ),
  hangman: (c) => each(c.items, 1, 'أضف كلمة واحدة على الأقل', (x) => (!s(x.word) || x.word.replace(/\s/g, '').length < 2 ? 'الكلمة مطلوبة (حرفان على الأقل)' : null)),
  wordchain: (c) => (arr(c.words, 3) && c.words.every(s) ? null : 'أضف 3 كلمات على الأقل'),
  maze: (c) => mcq(c.questions),
  spotdiff: (c) => (!s(c.imageA) || !s(c.imageB) ? 'أضف الصورتين' : arr(c.diffs) ? null : 'حدد فرقًا واحدًا على الأقل'),
  sudoku: (c) => {
    if (![4, 6].includes(c.size)) return 'حجم الشبكة 4 أو 6';
    if (!Number.isInteger(c.blanks) || c.blanks < 1 || c.blanks > c.size * c.size - 4) return 'عدد الخانات الفارغة غير صالح';
    return arr(c.symbols, c.size) && c.symbols.slice(0, c.size).every(s) ? null : `أضف ${c.size} رموز على الأقل`;
  },
  jigsaw: (c) => (!s(c.image) ? 'أضف الصورة' : [c.rows, c.cols].every((n) => Number.isInteger(n) && n >= 2 && n <= 6) ? null : 'الصفوف والأعمدة بين 2 و6'),
  roleplay: graph,
  decisiontree: graph,
  brainstorm: (c) => (s(c.prompt) && arr(c.columns, 1) && c.columns.every(s) ? null : 'أضف سؤال العصف وعمودًا واحدًا على الأقل'),
  poll: (c) =>
    each(c.questions, 1, 'أضف سؤال تصويت واحدًا على الأقل', (x) =>
      !s(x.question) ? 'السؤال فارغ' : !arr(x.options, 2) || !x.options.every(s) ? 'أضف خيارين على الأقل' : null,
    ),
  wyr: (c) => each(c.items, 1, 'أضف سؤالًا واحدًا على الأقل', (x) => (!s(x.a) || !s(x.b) ? 'الخياران مطلوبان' : null)),
  charades: deck, scavenger: deck, fivesec: deck, tower: deck, innovation: deck,
  storyword: (c) => (arr(c.players, 1) && c.players.every(s) ? null : 'أضف لاعبًا واحدًا على الأقل'),
  rps: (c) => (Number.isInteger(c.rounds) && c.rounds >= 1 && c.rounds <= 20 ? null : 'عدد الجولات بين 1 و20'),
  bingo: (c) => (arr(c.traits, 4) && c.traits.every(s) ? null : 'أضف 4 صفات على الأقل'),
});

export const TYPES = Object.keys(V);
const UNGRADED = ['flashcards','slideshow','wheel','triviashow','hotspots','roleplay','decisiontree','brainstorm','poll','wyr','charades','scavenger','fivesec','tower','innovation','storyword','rps','bingo'];
export const GRADED = new Set(TYPES.filter((t) => !UNGRADED.includes(t)));

export function validateContent(type, content, strict) {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return 'محتوى غير صالح';
  return strict ? V[type](content) : null;
}

const LIST_KEY = {
  quiz: 'questions', asterquiz: 'questions', froggy: 'questions', videoquiz: 'questions',
  truefalse: 'statements', riddle: 'items', matching: 'pairs', memory: 'pairs', groupsort: 'groups',
  lineup: 'items', unscramble: 'items', fillblanks: 'items', wordsearch: 'words', dictation: 'items',
  flashcards: 'cards', slideshow: 'slides', dialogue: 'steps', wheel: 'items',
  racing: 'questions', millionaire: 'questions', speedtest: 'questions', triviashow: 'questions', hiddenimage: 'questions', maze: 'questions',
  vocab: 'items', oddone: 'items', pattern: 'items', truthslie: 'items', escape: 'items', mapquiz: 'points', hotspots: 'points',
  crossword: 'entries', hangman: 'items', wordchain: 'words', spotdiff: 'diffs', roleplay: 'nodes', decisiontree: 'nodes',
  brainstorm: 'columns', poll: 'questions', wyr: 'items', charades: 'items', scavenger: 'items', fivesec: 'items', tower: 'items',
  innovation: 'items', storyword: 'players', bingo: 'traits',
};

export function countItems(type, content) {
  const list = content?.[LIST_KEY[type]];
  if (!Array.isArray(list)) return 0;
  if (type === 'sudoku') return content?.blanks || 0;
  if (type === 'jigsaw') return (content?.rows || 0) * (content?.cols || 0);
  if (type === 'rps') return content?.rounds || 0;
  if (type === 'groupsort') return list.reduce((n, g) => n + (g.items?.length || 0), 0);
  return list.length;
}
