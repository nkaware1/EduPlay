// المحتوى الابتدائي عند اختيار قالب (أمثلة بسيطة يعدّلها المعلم)
const mcq = (question, options, answer) => ({ question, options, answer, feedback: '', image: '' });

export const DEFAULTS = {
  quiz: () => ({ questions: [mcq('ما عاصمة مصر؟', ['القاهرة', 'الإسكندرية', 'الجيزة', 'أسوان'], 0), mcq('كم عدد أيام الأسبوع؟', ['5', '6', '7', '8'], 2)] }),
  asterquiz: () => ({ questions: [mcq('3 × 4 = ؟', ['10', '12', '14', '16'], 1), mcq('5 × 5 = ؟', ['20', '25', '30', '35'], 1)] }),
  froggy: () => ({ questions: [mcq('أي حيوان يعيش في الماء؟', ['الأسد', 'السمكة', 'الجمل', 'الحصان'], 1), mcq('أي حيوان يطير؟', ['العصفور', 'الأرنب', 'الفيل', 'السلحفاة'], 0)] }),
  videoquiz: () => ({ videoUrl: '', questions: [mcq('ما الفكرة الرئيسية في الفيديو؟', ['الخيار الأول', 'الخيار الثاني', 'الخيار الثالث', 'الخيار الرابع'], 0)] }),
  truefalse: () => ({ statements: [{ text: 'الشمس نجم.', answer: true, feedback: '' }, { text: 'القمر يصدر الضوء من نفسه.', answer: false, feedback: 'القمر يعكس ضوء الشمس.' }] }),
  riddle: () => ({ items: [{ question: 'شيء له أسنان ولا يعضّ، فما هو؟', answer: 'المشط', alternatives: 'مشط', hint: 'نستخدمه للشعر.' }] }),
  matching: () => ({ pairs: [{ left: 'كبير', right: 'صغير' }, { left: 'طويل', right: 'قصير' }, { left: 'حار', right: 'بارد' }] }),
  memory: () => ({ pairs: [{ a: '🍎', b: 'تفاحة' }, { a: '🐱', b: 'قطة' }, { a: '🚗', b: 'سيارة' }] }),
  groupsort: () => ({ groups: [{ name: 'حيوانات', items: ['أسد', 'قطة'] }, { name: 'نباتات', items: ['وردة', 'نخلة'] }] }),
  lineup: () => ({ prompt: 'رتّب الأيام', items: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء'] }),
  unscramble: () => ({ mode: 'letters', items: [{ answer: 'مدرسة', hint: 'مكان التعلم' }, { answer: 'كتاب', hint: 'نقرأ فيه' }] }),
  fillblanks: () => ({ items: [{ text: 'عاصمة مصر هي [[القاهرة]].' }], distractors: ['الرياض', 'عمّان'] }),
  wordsearch: () => ({ size: 10, words: ['شمس', 'قمر', 'نجم', 'كوكب'] }),
  dictation: () => ({ items: [{ text: 'الشمس مشرقة اليوم', lang: 'ar', audioUrl: '' }] }),
  flashcards: () => ({ cards: [{ front: 'Apple', back: 'تفاحة' }, { front: 'Book', back: 'كتاب' }] }),
  slideshow: () => ({ slides: [{ title: 'عنوان الشريحة', text: 'اكتب هنا شرح الدرس.', image: '' }] }),
  dialogue: () => ({ partner: 'سارة', you: 'أنت', steps: [{ line: 'مرحبًا! كيف حالك؟', choices: [{ text: 'أنا بخير، شكرًا', correct: true }, { text: 'وداعًا', correct: false }], response: 'الحمد لله.' }] }),
  wheel: () => ({ items: ['أحمد', 'سارة', 'ليلى', 'عمر', 'نور'] }),
};

export const DEFAULT_SETTINGS = { timeLimit: 0, maxAttempts: 0, shuffle: true, showFeedback: true, sound: true, requireName: false, mode: 'practice', color: '' };

/* ---------- القوالب الإضافية ---------- */
const svg = (inner, w = 400, h = 300) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`)}`;
export const emojiImg = (e) => svg(`<rect width="400" height="300" fill="#EEF1FF"/><text x="200" y="215" font-size="170" text-anchor="middle">${e}</text>`);
const scene = (v) => svg(`<rect width="400" height="300" fill="#BFE6FF"/><rect y="220" width="400" height="80" fill="#7ED58A"/>
<circle cx="330" cy="60" r="30" fill="${v ? '#FF8A3D' : '#FFD23F'}"/>
<rect x="140" y="130" width="120" height="90" fill="#E8A87C"/><polygon points="130,130 200,80 270,130" fill="#C0392B"/><rect x="190" y="170" width="30" height="50" fill="#6B4226"/>
${v ? '' : '<rect x="150" y="150" width="30" height="30" fill="#9AD0FF"/>'}
<rect x="40" y="160" width="16" height="60" fill="#6B4226"/>${v ? '' : '<circle cx="48" cy="140" r="36" fill="#2E8B57"/>'}`);
const mapImg = svg(`<rect width="400" height="300" fill="#8FD3F4"/><ellipse cx="200" cy="160" rx="170" ry="110" fill="#F3E3A5"/>
<ellipse cx="110" cy="150" rx="55" ry="45" fill="#3FA06B"/><polygon points="230,120 290,60 340,130" fill="#8D8D96"/><ellipse cx="240" cy="210" rx="45" ry="25" fill="#5BB4F0"/>`);
const mc = (question, options, answer) => ({ question, options, answer, feedback: '', image: '' });

Object.assign(DEFAULTS, {
  racing: () => ({ bots: 2, questions: [mc('ما عاصمة مصر؟', ['القاهرة', 'الإسكندرية', 'الجيزة', 'أسوان'], 0), mc('كم عدد أيام الأسبوع؟', ['5', '6', '7', '8'], 2), mc('2 + 2 = ؟', ['3', '4', '5', '6'], 1)] }),
  millionaire: () => ({ questions: [mc('ما لون السماء في يوم صافٍ؟', ['أخضر', 'أزرق', 'أحمر', 'أصفر'], 1), mc('كم عدد أيام الأسبوع؟', ['5', '6', '7', '8'], 2), mc('ما أكبر كواكب المجموعة الشمسية؟', ['الأرض', 'المريخ', 'المشتري', 'عطارد'], 2), mc('كم يساوي 12 × 12؟', ['124', '144', '154', '164'], 1)] }),
  speedtest: () => ({ seconds: 60, questions: [mc('5 + 7 = ؟', ['11', '12', '13', '14'], 1), mc('9 − 4 = ؟', ['3', '4', '5', '6'], 2), mc('3 × 6 = ؟', ['16', '18', '20', '24'], 1), mc('20 ÷ 5 = ؟', ['3', '4', '5', '6'], 1)] }),
  triviashow: () => ({ teams: ['الفريق الأحمر', 'الفريق الأزرق'], questions: [mc('ما عاصمة السعودية؟', ['جدة', 'الرياض', 'مكة', 'الدمام'], 1), mc('أي كوكب هو الأقرب للشمس؟', ['الزهرة', 'عطارد', 'المريخ', 'الأرض'], 1)] }),
  hiddenimage: () => ({ image: emojiImg('🐘'), grid: 4, questions: [mc('ما أكبر حيوان بري؟', ['الفيل', 'الأسد', 'الزرافة', 'الحصان'], 0), mc('أي حيوان يعطينا الحليب؟', ['الدجاجة', 'البقرة', 'السمكة', 'النسر'], 1), mc('كم عدد أيام الأسبوع؟', ['5', '6', '7', '8'], 2)] }),
  vocab: () => ({ items: [{ image: emojiImg('🍎'), word: 'تفاحة' }, { image: emojiImg('🚗'), word: 'سيارة' }, { image: emojiImg('🐱'), word: 'قطة' }, { image: emojiImg('🌳'), word: 'شجرة' }] }),
  oddone: () => ({ items: [{ group: ['تفاحة', 'موزة', 'برتقالة'], odd: 'كرسي', reason: 'الكرسي ليس من الفواكه.' }, { group: ['أسد', 'نمر', 'ذئب'], odd: 'وردة', reason: 'الوردة نبات وليست حيوانًا.' }] }),
  pattern: () => ({ items: [{ sequence: '2, 4, 6, 8', answer: '10', distractors: '9, 12, 14' }, { sequence: '1, 3, 5, 7', answer: '9', distractors: '8, 10, 11' }] }),
  truthslie: () => ({ items: [{ who: 'أحمد', truths: ['أحب كرة القدم', 'لدي أخت واحدة'], lie: 'سافرت إلى القمر' }] }),
  escape: () => ({ intro: 'أُغلق الباب خلفك! حل الألغاز لتفتح الأقفال وتهرب.', items: [{ scene: 'على الطاولة صندوق مقفل برمز من 3 أرقام.', question: 'ما ناتج 12 × 3 − 6 ؟', answer: '30', alternatives: '', hint: '12 × 3 = 36' }, { scene: 'على الجدار لوحة بها كلمة ناقصة.', question: 'عاصمة مصر هي ...؟', answer: 'القاهرة', alternatives: 'قاهرة', hint: 'تقع على نهر النيل.' }] }),
  mapquiz: () => ({ image: mapImg, points: [{ x: 28, y: 50, name: 'الغابة' }, { x: 70, y: 38, name: 'الجبل' }, { x: 60, y: 70, name: 'البحيرة' }] }),
  hotspots: () => ({ image: mapImg, points: [{ x: 28, y: 50, title: 'الغابة', info: 'غابة كثيفة تعيش فيها حيوانات كثيرة.' }, { x: 70, y: 38, title: 'الجبل', info: 'أعلى نقطة في الجزيرة.' }, { x: 60, y: 70, title: 'البحيرة', info: 'مصدر المياه العذبة للجزيرة.' }] }),
  crossword: () => ({ entries: [{ answer: 'قمر', clue: 'يدور حول الأرض' }, { answer: 'شمس', clue: 'نجم يعطينا الضوء والدفء' }, { answer: 'نجم', clue: 'يلمع في السماء ليلًا' }, { answer: 'كوكب', clue: 'الأرض والمريخ من ...' }] }),
  hangman: () => ({ maxMistakes: 6, items: [{ word: 'مدرسة', hint: 'مكان التعلم' }, { word: 'كتاب', hint: 'نقرأ فيه' }] }),
  wordchain: () => ({ words: ['قلم', 'ميزان', 'نجمة', 'هلال', 'لبن'] }),
  maze: () => ({ size: 7, questions: [mc('2 + 3 = ؟', ['4', '5', '6', '7'], 1), mc('أي هذه فاكهة؟', ['كرسي', 'تفاحة', 'حجر', 'كتاب'], 1)] }),
  spotdiff: () => ({ imageA: scene(0), imageB: scene(1), diffs: [{ x: 82, y: 20 }, { x: 41, y: 55 }, { x: 12, y: 47 }] }),
  sudoku: () => ({ size: 4, blanks: 6, symbols: ['1', '2', '3', '4'] }),
  jigsaw: () => ({ image: scene(0), rows: 3, cols: 3 }),
  roleplay: () => ({ role: 'أنت موظف استقبال في فندق', scenario: 'يصل ضيف غاضب لأن غرفته غير جاهزة.', start: 'n1', nodes: [
    { id: 'n1', text: 'الضيف: "لماذا غرفتي غير جاهزة؟!"', end: false, outcome: 'neutral', choices: [{ text: 'أعتذر وأعرض عليه مشروبًا في الصالة', next: 'n2' }, { text: 'أخبره أن ذلك ليس خطأي', next: 'n3' }] },
    { id: 'n2', text: 'هدأ الضيف وشكرك على اهتمامك. بعد عشر دقائق صارت الغرفة جاهزة.', end: true, outcome: 'good', choices: [] },
    { id: 'n3', text: 'ازداد غضب الضيف وطلب مقابلة المدير.', end: true, outcome: 'bad', choices: [] }] }),
  decisiontree: () => ({ scenario: 'وجدت محفظة في الشارع.', start: 'n1', nodes: [
    { id: 'n1', text: 'وجدت محفظة فيها مال وبطاقة تعريف. ماذا تفعل؟', end: false, outcome: 'neutral', choices: [{ text: 'أسلّمها للشرطة', next: 'n2' }, { text: 'آخذ المال وأرميها', next: 'n3' }] },
    { id: 'n2', text: 'تواصلت الشرطة مع صاحبها وشكرك. تصرف أمين!', end: true, outcome: 'good', choices: [] },
    { id: 'n3', text: 'شعرت بالذنب لأنك أخذت ما ليس لك.', end: true, outcome: 'bad', choices: [] }] }),
  brainstorm: () => ({ prompt: 'كيف نجعل مدرستنا أنظف؟', columns: ['أفكار', 'مميزات', 'تحديات'] }),
  poll: () => ({ questions: [{ question: 'ما أفضل وقت للدراسة؟', options: ['الصباح', 'بعد الظهر', 'المساء'] }, { question: 'هل تفضل الواجبات الورقية أم الرقمية؟', options: ['ورقية', 'رقمية'] }] }),
  wyr: () => ({ items: [{ a: 'أن تطير كالطيور', b: 'أن تسبح كالأسماك' }, { a: 'أن تقرأ الأفكار', b: 'أن تصبح غير مرئي' }] }),
  charades: () => ({ seconds: 60, items: ['أسد', 'طبيب', 'يسبح', 'مطر', 'طائرة'] }),
  scavenger: () => ({ seconds: 30, items: ['شيء أزرق', 'قلم', 'شيء يُقرأ', 'شيء مستدير'] }),
  fivesec: () => ({ seconds: 5, items: ['سمِّ 3 فواكه حمراء', 'سمِّ 3 دول عربية', 'سمِّ 3 حيوانات تطير', 'سمِّ 3 أدوات مدرسية'] }),
  tower: () => ({ seconds: 600, items: ['ابنوا أعلى برج ممكن باستخدام 20 قطعة ورق وشريط لاصق فقط.'] }),
  innovation: () => ({ seconds: 120, items: ['كيف نحمي كتبنا من المطر دون استخدام حقيبة؟', 'اخترع طريقة لإيقاظ الجميع في الوقت دون منبّه.'] }),
  storyword: () => ({ starter: 'في يوم من الأيام', players: ['اللاعب 1', 'اللاعب 2', 'اللاعب 3'] }),
  rps: () => ({ rounds: 5 }),
  bingo: () => ({ traits: ['يحب القهوة', 'سافر إلى بلد آخر', 'يتحدث لغتين', 'يحب الرياضة', 'لديه أخ توأم', 'يعزف على آلة', 'يحب الطبخ', 'ولد في الشتاء', 'يقرأ كل يوم'] }),
});
