// بيانات القوالب: الاسم والوصف واللون وطريقة احتساب عدد العناصر
const list = (k) => (c) => (Array.isArray(c?.[k]) ? c[k].length : 0);

export const CATEGORIES = [
  { id: 'quiz', ar: 'اختبارات', en: 'Quizzes' },
  { id: 'match', ar: 'مطابقة وترتيب', en: 'Match & Sort' },
  { id: 'words', ar: 'كلمات وحروف', en: 'Words & Letters' },
  { id: 'learn', ar: 'تعلّم وعرض', en: 'Learn & Present' },
  { id: 'tools', ar: 'أدوات الصف', en: 'Classroom Tools' },
];

export const TEMPLATES = [
  { id: 'quiz', cat: 'quiz', icon: '✅', color: '#6C4CF1', graded: true, count: list('questions'),
    ar: 'اختيار من متعدد', en: 'Multiple Choice',
    descAr: 'أسئلة بخيارات متعددة مع تغذية راجعة فورية.', descEn: 'Questions with several options and instant feedback.',
    howAr: 'اختر الإجابة الصحيحة لكل سؤال.', howEn: 'Pick the right answer for each question.' },
  { id: 'asterquiz', cat: 'quiz', icon: '🚀', color: '#2D3CCB', graded: true, count: list('questions'),
    ar: 'اختبار النجوم', en: 'AsterQuiz',
    descAr: 'دمّر الكويكبات بالإجابة الصحيحة، ولديك ثلاث محاولات.', descEn: 'Blast asteroids with the right answer — you have 3 lives.',
    howAr: 'الإجابة الصحيحة تُدمّر الكويكب، والخاطئة تُفقدك قلبًا.', howEn: 'Right answers blast the asteroid; wrong ones cost a life.' },
  { id: 'froggy', cat: 'quiz', icon: '🐸', color: '#19A974', graded: true, count: list('questions'),
    ar: 'قفزات الضفدع', en: 'Froggy Jumps',
    descAr: 'يقفز الضفدع إلى الورقة التالية عند كل إجابة صحيحة.', descEn: 'The frog hops to the next lily pad on every correct answer.',
    howAr: 'أجب بشكل صحيح لتساعد الضفدع على عبور البركة.', howEn: 'Answer correctly to help the frog cross the pond.' },
  { id: 'videoquiz', cat: 'quiz', icon: '🎬', color: '#E8590C', graded: true, count: list('questions'),
    ar: 'اختبار بالفيديو', en: 'Video Quiz',
    descAr: 'شاهد مقطعًا ثم أجب عن أسئلة مرتبطة به.', descEn: 'Watch a clip, then answer questions about it.',
    howAr: 'شاهد الفيديو ثم أجب عن الأسئلة.', howEn: 'Watch the video, then answer the questions.' },
  { id: 'truefalse', cat: 'quiz', icon: '☯️', color: '#E5484D', graded: true, count: list('statements'),
    ar: 'نعم أم لا (صح أو خطأ)', en: 'True or False',
    descAr: 'عبارات يحكم الطالب على صحتها.', descEn: 'Statements the student judges as true or false.',
    howAr: 'اقرأ العبارة ثم اختر صح أو خطأ.', howEn: 'Read the statement, then choose true or false.' },
  { id: 'riddle', cat: 'quiz', icon: '❓', color: '#7C3AED', graded: true, count: list('items'),
    ar: 'الألغاز', en: 'Riddles',
    descAr: 'ألغاز يكتب الطالب إجابتها مع تلميح اختياري.', descEn: 'Riddles answered by typing, with an optional hint.',
    howAr: 'اكتب إجابة اللغز. لديك ثلاث محاولات وتلميح.', howEn: 'Type the answer. You get 3 tries and a hint.' },

  { id: 'matching', cat: 'match', icon: '🔗', color: '#2DA8FF', graded: true, count: list('pairs'),
    ar: 'المطابقة', en: 'Matching',
    descAr: 'اربط كل عنصر بما يقابله.', descEn: 'Connect each item with its match.',
    howAr: 'اضغط عنصرًا من اليمين ثم ما يطابقه من اليسار.', howEn: 'Tap an item, then tap its match.' },
  { id: 'memory', cat: 'match', icon: '🃏', color: '#F59F00', graded: true, count: list('pairs'),
    ar: 'لعبة الذاكرة', en: 'Memory',
    descAr: 'بطاقات مقلوبة يبحث الطالب فيها عن الأزواج المتطابقة.', descEn: 'Flip cards to find the matching pairs.',
    howAr: 'اقلب بطاقتين في كل مرة للعثور على الأزواج.', howEn: 'Flip two cards at a time to find pairs.' },
  { id: 'groupsort', cat: 'match', icon: '🗂️', color: '#0CA678', graded: true, count: (c) => (c?.groups || []).reduce((n, g) => n + (g.items?.length || 0), 0),
    ar: 'التصنيف', en: 'Group Sort',
    descAr: 'صنّف العناصر في المجموعة الصحيحة.', descEn: 'Sort items into the right group.',
    howAr: 'اختر عنصرًا ثم اضغط المجموعة التي ينتمي إليها.', howEn: 'Pick an item, then tap the group it belongs to.' },
  { id: 'lineup', cat: 'match', icon: '📶', color: '#F76707', graded: true, count: list('items'),
    ar: 'ترتيب العناصر', en: 'Line Up',
    descAr: 'اسحب العناصر أو حرّكها بالأسهم إلى الترتيب الصحيح.', descEn: 'Drag or use arrows to put items in the right order.',
    howAr: 'رتّب العناصر ثم اضغط «تحقق».', howEn: 'Put the items in order, then press Check.' },

  { id: 'unscramble', cat: 'words', icon: '🔤', color: '#D6336C', graded: true, count: list('items'),
    ar: 'إعادة ترتيب الحروف والكلمات', en: 'Unscramble',
    descAr: 'كوّن كلمة من حروف مبعثرة أو جملة من كلمات غير مرتبة.', descEn: 'Rebuild a word from letters or a sentence from words.',
    howAr: 'اضغط القطع بالترتيب الصحيح لتكوين الإجابة.', howEn: 'Tap the tiles in the right order.' },
  { id: 'fillblanks', cat: 'words', icon: '✍️', color: '#4263EB', graded: true,
    count: (c) => (c?.items || []).reduce((n, x) => n + ((x.text || '').match(/\[\[.+?\]\]/g) || []).length, 0),
    ar: 'املأ الفراغات', en: 'Fill in the Blanks',
    descAr: 'أكمل النص الناقص بكلمات من بنك الكلمات.', descEn: 'Complete the text using a word bank.',
    howAr: 'اضغط كلمة من البنك لتوضع في الفراغ.', howEn: 'Tap a word in the bank to place it in a blank.' },
  { id: 'wordsearch', cat: 'words', icon: '🔍', color: '#12B886', graded: true, count: list('words'),
    ar: 'البحث عن الكلمات', en: 'Word Search',
    descAr: 'شبكة حروف يبحث الطالب فيها عن كلمات مخفية.', descEn: 'Find hidden words in a grid of letters.',
    howAr: 'اضغط أول حرف في الكلمة ثم آخر حرف فيها.', howEn: 'Tap the first letter of a word, then its last letter.' },
  { id: 'dictation', cat: 'words', icon: '🎧', color: '#1098AD', graded: true, count: list('items'),
    ar: 'الإملاء', en: 'Dictation',
    descAr: 'استمع إلى الجملة واكتب ما تسمعه.', descEn: 'Listen and type what you hear.',
    howAr: 'اضغط زر الاستماع ثم اكتب الجملة.', howEn: 'Press listen, then type the sentence.' },

  { id: 'flashcards', cat: 'learn', icon: '📇', color: '#7048E8', graded: false, count: list('cards'),
    ar: 'البطاقات التعليمية', en: 'Flashcards',
    descAr: 'بطاقات بوجهين للمراجعة والحفظ.', descEn: 'Two-sided cards for review and memorizing.',
    howAr: 'اضغط البطاقة لقلبها ثم حدد هل عرفتها.', howEn: 'Tap the card to flip it, then say if you knew it.' },
  { id: 'slideshow', cat: 'learn', icon: '🖼️', color: '#F08C00', graded: false, count: list('slides'),
    ar: 'عرض الشرائح', en: 'Slideshow',
    descAr: 'درس منظم بالنصوص والصور.', descEn: 'A structured lesson with text and images.',
    howAr: 'تنقّل بين الشرائح بالأزرار أو الأسهم.', howEn: 'Move between slides with the buttons or arrow keys.' },
  { id: 'dialogue', cat: 'learn', icon: '💬', color: '#0B7285', graded: true, count: list('steps'),
    ar: 'الحوار والمحادثة', en: 'Dialogue',
    descAr: 'حوار بين شخصيتين يختار فيه الطالب الرد المناسب.', descEn: 'A conversation where the student chooses the right reply.',
    howAr: 'اقرأ كلام المحاور ثم اختر الرد المناسب.', howEn: 'Read the line, then choose the best reply.' },

  { id: 'wheel', cat: 'tools', icon: '🎡', color: '#E64980', graded: false, count: list('items'),
    ar: 'العجلة العشوائية', en: 'Random Wheel',
    descAr: 'أدِر العجلة لاختيار عنصر أو طالب عشوائيًا.', descEn: 'Spin to pick a random item or student.',
    howAr: 'اضغط «أدر العجلة».', howEn: 'Press Spin.' },
];

export const TEMPLATE_MAP = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));
export const tName = (id, lang) => (TEMPLATE_MAP[id] ? (lang === 'en' ? TEMPLATE_MAP[id].en : TEMPLATE_MAP[id].ar) : id);

/* ---------- قوالب إضافية ---------- */
const L = (k) => (c) => (Array.isArray(c?.[k]) ? c[k].length : 0);
const more = [
  // اختبارات
  { id: 'racing', cat: 'quiz', icon: '🏎️', color: '#E5484D', graded: true, count: L('questions'), ar: 'سباق السيارات', en: 'Car Race', descAr: 'تتقدم سيارتك عند كل إجابة صحيحة وتسابق منافسين.', descEn: 'Your car advances with every correct answer.', howAr: 'أجب بسرعة وبشكل صحيح لتسبق المنافسين.', howEn: 'Answer correctly and quickly to beat the other cars.' },
  { id: 'millionaire', cat: 'quiz', icon: '💰', color: '#3B2E9E', graded: true, count: L('questions'), ar: 'من سيربح المليون', en: 'Millionaire', descAr: 'أسئلة متدرجة بسلّم جوائز ووسائل مساعدة. الخطأ ينهي اللعبة.', descEn: 'Climb the prize ladder with lifelines. A wrong answer ends the game.', howAr: 'اصعد السلّم. لديك 50:50 وتصويت الجمهور واتصال بصديق.', howEn: 'Climb the ladder. You have 50:50, audience and phone-a-friend.' },
  { id: 'speedtest', cat: 'quiz', icon: '⚡', color: '#F59F00', graded: true, count: L('questions'), ar: 'الاختبار السريع', en: 'Speed Test', descAr: 'أجب عن أكبر عدد من الأسئلة خلال وقت محدد.', descEn: 'Answer as many questions as you can before time runs out.', howAr: 'اختر بسرعة، فالسؤال التالي يظهر فورًا.', howEn: 'Pick fast — the next question appears instantly.' },
  { id: 'triviashow', cat: 'quiz', icon: '👑', color: '#7048E8', graded: false, count: L('questions'), ar: 'ملوك المعرفة (فرق)', en: 'Trivia Show (teams)', descAr: 'مسابقة بين فرق على جهاز واحد: الأسرع والأدق يربح نقاطًا أكثر.', descEn: 'Teams compete on one screen — faster and right wins more.', howAr: 'اضغط زر فريقك أولًا لتجيب. النقاط تعتمد على السرعة والدقة.', howEn: 'Hit your team button first to answer. Faster = more points.' },
  { id: 'hiddenimage', cat: 'quiz', icon: '🖼️', color: '#12B886', graded: true, count: L('questions'), ar: 'الصورة المخبأة', en: 'Hidden Picture', descAr: 'صورة تحت مربعات تنكشف مع كل إجابة صحيحة.', descEn: 'A picture under tiles is revealed with each correct answer.', howAr: 'أجب بشكل صحيح لتكشف الصورة.', howEn: 'Answer correctly to reveal the picture.' },
  // كلمات
  { id: 'crossword', cat: 'words', icon: '🧩', color: '#1C7ED6', graded: true, count: L('entries'), ar: 'الكلمات المتقاطعة', en: 'Crossword', descAr: 'تُولَّد الشبكة تلقائيًا من كلماتك وتلميحاتك.', descEn: 'The grid is generated automatically from your words and clues.', howAr: 'اقرأ التلميح واكتب الكلمة ثم Enter.', howEn: 'Read the clue, type the word and press Enter.' },
  { id: 'hangman', cat: 'words', icon: '🪢', color: '#868E96', graded: true, count: L('items'), ar: 'لعبة المشنوق', en: 'Hangman', descAr: 'خمّن حروف الكلمة قبل نفاد المحاولات.', descEn: 'Guess the letters before you run out of tries.', howAr: 'اضغط الحروف لتخمين الكلمة.', howEn: 'Tap letters to guess the word.' },
  { id: 'wordchain', cat: 'words', icon: '⛓️', color: '#0CA678', graded: true, count: L('words'), ar: 'سلسلة الكلمات', en: 'Word Chain', descAr: 'كل كلمة تبدأ بالحرف الأخير من الكلمة السابقة.', descEn: 'Each word starts with the last letter of the previous one.', howAr: 'اختر الكلمة التالية التي تبدأ بآخر حرف.', howEn: 'Pick the next word that starts with the last letter.' },
  { id: 'vocab', cat: 'words', icon: '🖼️', color: '#E64980', graded: true, count: L('items'), ar: 'قاموس الصور', en: 'Visual Vocabulary', descAr: 'اربط الصورة بالكلمة المناسبة.', descEn: 'Match each picture with its word.', howAr: 'اختر الكلمة التي تصف الصورة.', howEn: 'Choose the word that names the picture.' },
  { id: 'oddone', cat: 'words', icon: '🔎', color: '#F76707', graded: true, count: L('items'), ar: 'استخراج الغريب', en: 'Odd One Out', descAr: 'اختر الكلمة التي لا تنتمي للمجموعة.', descEn: 'Pick the word that does not belong.', howAr: 'اختر الكلمة الغريبة.', howEn: 'Pick the odd one out.' },
  // تفكير وذاكرة
  { id: 'maze', cat: 'logic', icon: '🌀', color: '#5F3DC4', graded: true, count: L('questions'), ar: 'متاهة المفاهيم', en: 'Concept Maze', descAr: 'اعبر المتاهة وأجب عن سؤال عند كل بوابة.', descEn: 'Cross the maze and answer a question at each gate.', howAr: 'تحرّك بالأسهم أو الأزرار. عند البوابة أجب لتفتحها.', howEn: 'Use arrows or buttons. Answer at each gate to open it.' },
  { id: 'spotdiff', cat: 'logic', icon: '👀', color: '#E8590C', graded: true, count: L('diffs'), ar: 'اكتشف الفروق', en: 'Spot the Difference', descAr: 'قارن صورتين واعثر على الاختلافات.', descEn: 'Compare two pictures and find the differences.', howAr: 'اضغط موضع الاختلاف في أي من الصورتين.', howEn: 'Tap where the pictures differ.' },
  { id: 'sudoku', cat: 'logic', icon: '🔢', color: '#2F9E44', graded: true, count: (c) => c?.blanks || 0, ar: 'سودوكو تعليمية', en: 'Learning Sudoku', descAr: 'سودوكو 4×4 أو 6×6 بأرقام أو رموز من اختيارك.', descEn: '4×4 or 6×6 sudoku with numbers or your own symbols.', howAr: 'لا يتكرر رمز في الصف أو العمود أو المربع.', howEn: 'No repeats in any row, column or box.' },
  { id: 'jigsaw', cat: 'logic', icon: '🧩', color: '#D6336C', graded: true, count: (c) => (c?.rows || 0) * (c?.cols || 0), ar: 'تركيب الصورة (جيجسو)', en: 'Jigsaw Puzzle', descAr: 'قطع مبعثرة يعيد الطالب ترتيبها لتكوين الصورة.', descEn: 'Scrambled pieces to put back into the picture.', howAr: 'اضغط قطعتين لتبديل مكانيهما.', howEn: 'Tap two pieces to swap them.' },
  { id: 'pattern', cat: 'logic', icon: '🔁', color: '#1098AD', graded: true, count: L('items'), ar: 'النمط الناقص', en: 'Missing Pattern', descAr: 'توقّع الرقم أو الرمز التالي في النمط.', descEn: 'Predict the next item in the pattern.', howAr: 'اختر العنصر الذي يكمل النمط.', howEn: 'Choose what completes the pattern.' },
  // محاكاة
  { id: 'roleplay', cat: 'sim', icon: '🎭', color: '#AE3EC9', graded: false, count: L('nodes'), ar: 'لعب الأدوار', en: 'Role-Playing', descAr: 'تقمّص شخصية واتخذ قرارات لحل موقف.', descEn: 'Play a role and make decisions to solve a scenario.', howAr: 'اقرأ الموقف واختر ما ستفعله.', howEn: 'Read the situation and choose what to do.' },
  { id: 'decisiontree', cat: 'sim', icon: '🌳', color: '#2B8A3E', graded: false, count: L('nodes'), ar: 'شجرة القرارات', en: 'Decision Tree', descAr: 'خياراتك تحدد النهاية التي تصل إليها.', descEn: 'Your choices decide the ending you reach.', howAr: 'اختر في كل خطوة وشاهد النتيجة.', howEn: 'Choose at each step and see where it leads.' },
  { id: 'escape', cat: 'sim', icon: '🚪', color: '#364FC7', graded: true, count: L('items'), ar: 'غرفة الهروب الرقمية', en: 'Digital Escape Room', descAr: 'حل ألغازًا متتابعة لفتح الأقفال والهروب.', descEn: 'Solve a chain of puzzles to unlock the room.', howAr: 'حل كل لغز لتفتح القفل التالي.', howEn: 'Solve each puzzle to open the next lock.' },
  { id: 'brainstorm', cat: 'sim', icon: '💡', color: '#FAB005', graded: false, count: L('columns'), ar: 'لوحة العصف الذهني', en: 'Brainstorm Board', descAr: 'لوحة ملاحظات لاصقة بأعمدة وتصويت (على الجهاز نفسه).', descEn: 'Sticky-note board with columns and votes (on this device).', howAr: 'اكتب فكرة واضغط Enter. صوّت بـ 👍.', howEn: 'Type an idea and press Enter. Vote with 👍.' },
  { id: 'poll', cat: 'sim', icon: '📊', color: '#1971C2', graded: false, count: L('questions'), ar: 'التصويت والمفاضلة', en: 'Polls & Voting', descAr: 'تصويت فوري تظهر نتائجه للجميع.', descEn: 'Live voting with shared results.', howAr: 'صوّت وشاهد النتائج تتحدث.', howEn: 'Vote and watch the results update.' },
  { id: 'hotspots', cat: 'sim', icon: '📍', color: '#C92A2A', graded: false, count: L('points'), ar: 'الخريطة التفاعلية', en: 'Interactive Map', descAr: 'نقاط ساخنة على صورة أو خريطة تكشف معلومات.', descEn: 'Hotspots on an image or map that reveal information.', howAr: 'اضغط النقاط لتقرأ المعلومات.', howEn: 'Tap the hotspots to read more.' },
  { id: 'mapquiz', cat: 'sim', icon: '🗺️', color: '#0B7285', graded: true, count: L('points'), ar: 'اختبار الخرائط', en: 'Map Quiz', descAr: 'حدّد مواقع مطلوبة على خريطتك.', descEn: 'Locate places on your own map.', howAr: 'اضغط على الموقع المطلوب في الخريطة.', howEn: 'Tap the requested place on the map.' },
  // تكسير الجمود
  { id: 'charades', cat: 'ice', icon: '🤫', color: '#E64980', graded: false, count: L('items'), ar: 'شرح بدون كلام', en: 'Charades', descAr: 'بطاقات كلمات تُمثَّل أو تُرسم والفريق يخمّن، مع مؤقت.', descEn: 'Word cards to act out or draw, with a timer.', howAr: 'اضغط ابدأ ومثّل الكلمة. ✔ عند النجاح.', howEn: 'Press start and act it out. ✔ when guessed.' },
  { id: 'scavenger', cat: 'ice', icon: '🏃', color: '#F76707', graded: false, count: L('items'), ar: 'البحث عن شيء في الغرفة', en: 'Scavenger Hunt', descAr: 'أحضر غرضًا محددًا قبل انتهاء المؤقت.', descEn: 'Bring a specific item before the timer ends.', howAr: 'اقرأ المطلوب وابدأ المؤقت.', howEn: 'Read the item and start the timer.' },
  { id: 'fivesec', cat: 'ice', icon: '5️⃣', color: '#E03131', graded: false, count: L('items'), ar: 'تحدي الخمس ثوانٍ', en: '5-Second Challenge', descAr: 'سمِّ ثلاثة أشياء من فئة قبل انتهاء 5 ثوانٍ.', descEn: 'Name three things in a category within 5 seconds.', howAr: 'اضغط ابدأ وأجب بسرعة.', howEn: 'Press start and answer fast.' },
  { id: 'tower', cat: 'ice', icon: '🗼', color: '#845EF7', graded: false, count: L('items'), ar: 'بناء البرج', en: 'Tower Building', descAr: 'تحدي بناء جماعي بأدوات بسيطة مع مؤقت.', descEn: 'A team building challenge with a timer.', howAr: 'اقرأ التحدي وابدأ المؤقت.', howEn: 'Read the challenge and start the timer.' },
  { id: 'innovation', cat: 'ice', icon: '🚀', color: '#0CA678', graded: false, count: L('items'), ar: 'تحدي الابتكار السريع', en: 'Rapid Innovation', descAr: 'مشكلة غير مألوفة وحل ابتكاري خلال دقيقتين.', descEn: 'An unusual problem and two minutes to invent a solution.', howAr: 'اقرأ المشكلة وابدأ المؤقت.', howEn: 'Read the problem and start the timer.' },
  { id: 'wyr', cat: 'ice', icon: '🤔', color: '#FF922B', graded: false, count: L('items'), ar: 'سؤال أم خيار؟', en: 'Would You Rather', descAr: 'مفاضلة بين خيارين مع تصويت مشترك.', descEn: 'Choose between two options with shared voting.', howAr: 'اختر أحد الخيارين وشاهد رأي الآخرين.', howEn: 'Pick one and see what others chose.' },
  { id: 'truthslie', cat: 'ice', icon: '🕵️', color: '#9C36B5', graded: true, count: L('items'), ar: 'ثلاث حقائق وكذبة', en: 'Two Truths & a Lie', descAr: 'اكتشف العبارة الكاذبة بين العبارات.', descEn: 'Spot the false statement.', howAr: 'اختر العبارة الكاذبة.', howEn: 'Pick the false statement.' },
  { id: 'rps', cat: 'ice', icon: '✊', color: '#4C6EF5', graded: false, count: (c) => c?.rounds || 0, ar: 'حجر ورقة مقص', en: 'Rock Paper Scissors', descAr: 'العب ضد الحاسوب، أو شغّل وضع الصف لتصفية الحضور.', descEn: 'Play the computer, or run class mode to eliminate players.', howAr: 'اختر حركتك. في وضع الصف يبقى من يفوز على حركة الحاسوب.', howEn: 'Choose your move. In class mode, only winners stay.' },
  { id: 'storyword', cat: 'ice', icon: '📖', color: '#0B7285', graded: false, count: L('players'), ar: 'قصة في كلمة', en: 'One-Word Story', descAr: 'كل لاعب يضيف كلمة واحدة في دوره لبناء قصة.', descEn: 'Each player adds one word per turn to build a story.', howAr: 'اكتب كلمة واحدة فقط ثم مرّر الدور.', howEn: 'Type one word, then pass the turn.' },
  { id: 'bingo', cat: 'ice', icon: '🎯', color: '#2F9E44', graded: false, count: L('traits'), ar: 'شبكة المعارف', en: 'People Bingo', descAr: 'ابحث عن شخص يطابق كل صفة واكتب اسمه.', descEn: 'Find someone matching each trait and write their name.', howAr: 'اكتب اسم من يطابق الصفة في خانتها. أكمل صفًا للفوز.', howEn: 'Write a name for each trait. Complete a line to win.' },
];
for (const m of more) { TEMPLATES.push(m); TEMPLATE_MAP[m.id] = m; }
CATEGORIES.splice(2, 0, { id: 'logic', ar: 'تفكير وذاكرة', en: 'Logic & Memory' });
CATEGORIES.push({ id: 'sim', ar: 'محاكاة وتفاعل', en: 'Simulation' }, { id: 'ice', ar: 'تكسير الجمود', en: 'Icebreakers' });
