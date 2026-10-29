// مواصفات الاستيراد لكل قالب: أعمدة الجدول وكيفية تحويل الصفوف إلى عناصر المحتوى
const c = (r, i) => String(r[i] ?? '').trim();
const LET = { a: 0, b: 1, c: 2, d: 3, 'أ': 0, 'ا': 0, 'ب': 1, 'ج': 2, 'د': 3 };

function parseTf(v) {
  const x = v.trim().toLowerCase();
  if (/^(صح|صحيح|نعم|true|t|yes|y|1|✓|✔)$/.test(x)) return true;
  if (/^(خطأ|خطا|خاطئ|لا|false|f|no|n|0|✗|✘)$/.test(x)) return false;
  return null;
}

const rowsOf = (rows, fn) => {
  const items = [], warnings = [];
  rows.forEach((r, i) => {
    const res = fn(r);
    if (typeof res === 'string') warnings.push(`الصف ${i + 1}: ${res}`);
    else if (res) items.push(res);
  });
  return { items, warnings };
};

const mcq = {
  key: 'questions',
  columns: ['السؤال', 'الخيار 1', 'الخيار 2', 'الخيار 3', 'الخيار 4', 'الإجابة الصحيحة (رقم 1-4 أو الحرف أو نص الخيار)', 'شرح (اختياري)'],
  example: [['ما عاصمة مصر؟', 'القاهرة', 'الإسكندرية', 'الجيزة', 'أسوان', '1', 'تقع على نهر النيل'], ['كم عدد أيام الأسبوع؟', '5', '6', '7', '8', '3', '']],
  parse: (rows) => rowsOf(rows, (r) => {
    const q = c(r, 0);
    if (!q) return null;
    const opts = [1, 2, 3, 4].map((k) => ({ t: c(r, k), k: k - 1 })).filter((o) => o.t);
    if (opts.length < 2) return 'يلزم خياران على الأقل';
    const a = c(r, 5);
    let idx = -1;
    if (/^[1-4]$/.test(a)) idx = Number(a) - 1;
    else if (a.toLowerCase() in LET) idx = LET[a.toLowerCase()];
    else idx = opts.find((o) => o.t === a)?.k ?? -1;
    const pos = opts.findIndex((o) => o.k === idx);
    if (pos < 0) return 'تعذّر تحديد الإجابة الصحيحة';
    return { question: q, options: opts.map((o) => o.t), answer: pos, feedback: c(r, 6), image: '' };
  }),
};

const pairsSpec = (key, a, b, ex) => ({
  key, columns: ex.cols, example: ex.rows,
  parse: (rows) => rowsOf(rows, (r) => (!c(r, 0) && !c(r, 1) ? null : !c(r, 0) || !c(r, 1) ? 'يلزم عمودان معًا' : { [a]: c(r, 0), [b]: c(r, 1) })),
});

const linesSpec = (key, col, ex, fn = (v) => v, bad = 'قيمة غير صالحة') => ({
  key, columns: [col], example: ex.map((x) => [x]),
  parse: (rows) => {
    const items = [], warnings = [];
    rows.forEach((r, i) => {
      const v = c(r, 0);
      if (!v) return;
      const res = fn(v);
      res === null ? warnings.push(`الصف ${i + 1}: ${bad}`) : items.push(res);
    });
    return { items, warnings };
  },
});

const DECK = (label) => linesSpec('items', label, ['...', '...']);

export const IMPORT = {
  truefalse: {
    key: 'statements', columns: ['العبارة', 'الحكم (صح/خطأ)', 'شرح (اختياري)'], example: [['الشمس نجم', 'صح', ''], ['القمر يصدر الضوء', 'خطأ', 'يعكس ضوء الشمس']],
    parse: (rows) => rowsOf(rows, (r) => { if (!c(r, 0)) return null; const a = parseTf(c(r, 1)); return a === null ? 'الحكم يجب أن يكون صح أو خطأ' : { text: c(r, 0), answer: a, feedback: c(r, 2) }; }),
  },
  matching: pairsSpec('pairs', 'left', 'right', { cols: ['العنصر', 'ما يقابله'], rows: [['كبير', 'صغير'], ['حار', 'بارد']] }),
  memory: pairsSpec('pairs', 'a', 'b', { cols: ['البطاقة الأولى', 'البطاقة الثانية'], rows: [['🍎', 'تفاحة'], ['🚗', 'سيارة']] }),
  flashcards: pairsSpec('cards', 'front', 'back', { cols: ['الوجه الأمامي', 'الوجه الخلفي'], rows: [['Apple', 'تفاحة'], ['Book', 'كتاب']] }),
  vocab: pairsSpec('items', 'image', 'word', { cols: ['رابط الصورة', 'الكلمة'], rows: [['https://example.com/apple.png', 'تفاحة'], ['https://example.com/car.png', 'سيارة']] }),
  wyr: pairsSpec('items', 'a', 'b', { cols: ['الخيار الأول', 'الخيار الثاني'], rows: [['أن تطير', 'أن تسبح']] }),
  riddle: {
    key: 'items', columns: ['اللغز', 'الإجابة', 'تلميح (اختياري)', 'إجابات بديلة (اختياري)'], example: [['شيء له أسنان ولا يعض', 'المشط', 'للشعر', 'مشط']],
    parse: (rows) => rowsOf(rows, (r) => (!c(r, 0) ? null : !c(r, 1) ? 'الإجابة مطلوبة' : { question: c(r, 0), answer: c(r, 1), hint: c(r, 2), alternatives: c(r, 3) })),
  },
  escape: {
    key: 'items', columns: ['اللغز', 'الإجابة', 'تلميح (اختياري)', 'وصف المشهد (اختياري)'], example: [['12 × 3 − 6 = ؟', '30', '12 × 3 = 36', 'صندوق مقفل على الطاولة']],
    parse: (rows) => rowsOf(rows, (r) => (!c(r, 0) ? null : !c(r, 1) ? 'الإجابة مطلوبة' : { scene: c(r, 3), question: c(r, 0), answer: c(r, 1), alternatives: '', hint: c(r, 2) })),
  },
  crossword: {
    key: 'entries', columns: ['الكلمة', 'التلميح'], example: [['قمر', 'يدور حول الأرض'], ['شمس', 'نجم يعطينا الضوء']],
    parse: (rows) => rowsOf(rows, (r) => (!c(r, 0) ? null : !c(r, 1) ? 'التلميح مطلوب' : c(r, 0).replace(/\s/g, '').length < 2 ? 'الكلمة قصيرة' : { answer: c(r, 0), clue: c(r, 1) })),
  },
  hangman: {
    key: 'items', columns: ['الكلمة', 'تلميح (اختياري)'], example: [['مدرسة', 'مكان التعلم']],
    parse: (rows) => rowsOf(rows, (r) => (!c(r, 0) ? null : c(r, 0).replace(/\s/g, '').length < 2 ? 'الكلمة قصيرة' : { word: c(r, 0), hint: c(r, 1) })),
  },
  unscramble: {
    key: 'items', columns: ['الكلمة أو الجملة الصحيحة', 'تلميح (اختياري)'], example: [['مدرسة', 'مكان التعلم']],
    parse: (rows) => rowsOf(rows, (r) => (!c(r, 0) ? null : { answer: c(r, 0), hint: c(r, 1) })),
  },
  groupsort: {
    key: 'groups', columns: ['اسم المجموعة', 'العنصر'], example: [['حيوانات', 'أسد'], ['حيوانات', 'قطة'], ['نباتات', 'وردة'], ['نباتات', 'نخلة']],
    parse: (rows) => {
      const { items, warnings } = rowsOf(rows, (r) => (!c(r, 0) && !c(r, 1) ? null : !c(r, 0) || !c(r, 1) ? 'يلزم اسم المجموعة والعنصر' : { g: c(r, 0), i: c(r, 1) }));
      const m = new Map();
      items.forEach((x) => m.set(x.g, [...(m.get(x.g) || []), x.i]));
      return { items: [...m].map(([name, its]) => ({ name, items: its })), warnings };
    },
  },
  fillblanks: linesSpec('items', 'النص (ضع الكلمة المخفية بين [[ ]])', ['عاصمة مصر هي [[القاهرة]]'], (v) => (/\[\[.+?\]\]/.test(v) ? { text: v } : null), 'ضع الكلمة المخفية بين [[ ]]'),
  wordsearch: linesSpec('words', 'الكلمة', ['شمس', 'قمر'], (v) => v.replace(/\s+/g, '')),
  wheel: linesSpec('items', 'العنصر', ['أحمد', 'سارة']),
  lineup: linesSpec('items', 'العنصر (بالترتيب الصحيح)', ['السبت', 'الأحد']),
  wordchain: linesSpec('words', 'الكلمة (الأولى هي البداية)', ['قلم', 'ميزان', 'نجمة', 'هلال']),
  bingo: linesSpec('traits', 'الصفة', ['يحب القهوة', 'سافر إلى بلد آخر', 'يتحدث لغتين', 'يحب الرياضة']),
  charades: DECK('البطاقة'), scavenger: DECK('المطلوب'), fivesec: DECK('التحدي'), tower: DECK('التحدي'), innovation: DECK('المشكلة'),
  dictation: {
    key: 'items', columns: ['النص', 'اللغة (ar أو en)'], example: [['الشمس مشرقة اليوم', 'ar'], ['I love reading', 'en']],
    parse: (rows) => rowsOf(rows, (r) => (c(r, 0) ? { text: c(r, 0), lang: /^en/i.test(c(r, 1)) ? 'en' : 'ar', audioUrl: '' } : null)),
  },
  slideshow: {
    key: 'slides', columns: ['عنوان الشريحة', 'النص', 'رابط صورة (اختياري)'], example: [['التبخّر', 'تسخّن الشمس المياه فتتحول إلى بخار', '']],
    parse: (rows) => rowsOf(rows, (r) => (c(r, 0) || c(r, 1) ? { title: c(r, 0), text: c(r, 1), image: c(r, 2) } : null)),
  },
  poll: {
    key: 'questions', columns: ['السؤال', 'الخيار 1', 'الخيار 2', 'الخيار 3', 'الخيار 4', 'الخيار 5'], example: [['ما أفضل وقت للدراسة؟', 'الصباح', 'المساء', '', '', '']],
    parse: (rows) => rowsOf(rows, (r) => { if (!c(r, 0)) return null; const o = [1, 2, 3, 4, 5].map((k) => c(r, k)).filter(Boolean); return o.length < 2 ? 'يلزم خياران على الأقل' : { question: c(r, 0), options: o }; }),
  },
  pattern: {
    key: 'items', columns: ['التسلسل', 'العنصر التالي', 'خيارات خاطئة (افصل بفاصلة)'], example: [['2, 4, 6, 8', '10', '9, 12, 14']],
    parse: (rows) => rowsOf(rows, (r) => (!c(r, 0) ? null : !c(r, 1) ? 'العنصر التالي مطلوب' : { sequence: c(r, 0), answer: c(r, 1), distractors: c(r, 2) })),
  },
  oddone: {
    key: 'items', columns: ['الكلمات المترابطة (افصل بفاصلة)', 'الكلمة الغريبة', 'السبب (اختياري)'], example: [['تفاحة، موزة، برتقالة', 'كرسي', 'ليس فاكهة']],
    parse: (rows) => rowsOf(rows, (r) => {
      if (!c(r, 0)) return null;
      const g = c(r, 0).split(/[,،;؛]/).map((x) => x.trim()).filter(Boolean);
      return g.length < 2 || !c(r, 1) ? 'يلزم كلمتان مترابطتان وكلمة غريبة' : { group: g, odd: c(r, 1), reason: c(r, 2) };
    }),
  },
  truthslie: {
    key: 'items', columns: ['الاسم (اختياري)', 'حقيقة 1', 'حقيقة 2', 'حقيقة 3 (اختياري)', 'الكذبة'], example: [['أحمد', 'أحب كرة القدم', 'لدي أخت واحدة', '', 'سافرت إلى القمر']],
    parse: (rows) => rowsOf(rows, (r) => {
      const truths = [1, 2, 3].map((k) => c(r, k)).filter(Boolean);
      if (!truths.length && !c(r, 4)) return null;
      return truths.length < 2 || !c(r, 4) ? 'يلزم حقيقتان وكذبة' : { who: c(r, 0), truths, lie: c(r, 4) };
    }),
  },
};
for (const t of ['quiz', 'asterquiz', 'froggy', 'videoquiz', 'racing', 'millionaire', 'speedtest', 'triviashow', 'hiddenimage', 'maze']) IMPORT[t] = mcq;

// دمج العناصر المستوردة في المحتوى (إضافة أو استبدال)
export function applyImport(type, content, items, mode) {
  const spec = IMPORT[type];
  const cur = Array.isArray(content[spec.key]) ? content[spec.key] : [];
  return { ...content, [spec.key]: mode === 'replace' ? items : [...cur, ...items] };
}

const HEADER_HINT = /(سؤال|السؤال|الكلمة|الإجابة|العبارة|الصفة|العنصر|الوجه|التلميح|اللغز|النص|المجموعة|الخيار|المطلوب|التحدي|المشكلة|البطاقة|question|answer|word|clue|option|item|front|back|text|group|trait|حقيقة|الكذبة|الاسم|الحكم|المطلوب)/i;
export const looksLikeHeader = (row) => !!row && row.some((x) => HEADER_HINT.test(String(x)));
