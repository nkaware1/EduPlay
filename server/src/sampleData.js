// أنشطة نموذجية تُنشأ عند أول تشغيل (وضع التطوير أو SEED_DEMO=true)
const q = (question, options, answer, feedback = '') => ({ question, options, answer, feedback, image: '' });

export const sampleActivities = [
  { type: 'quiz', title: 'عواصم الدول العربية', subject: 'الاجتماعيات', grade: 'الصف الخامس', difficulty: 'easy', description: 'اختبر معلوماتك عن عواصم الدول العربية.',
    content: { questions: [
      q('ما عاصمة مصر؟', ['القاهرة', 'الإسكندرية', 'الجيزة', 'أسوان'], 0, 'القاهرة تقع على نهر النيل.'),
      q('ما عاصمة الأردن؟', ['إربد', 'عمّان', 'الزرقاء', 'العقبة'], 1),
      q('ما عاصمة المغرب؟', ['الدار البيضاء', 'فاس', 'الرباط', 'مراكش'], 2, 'الرباط هي العاصمة، والدار البيضاء أكبر المدن.'),
      q('ما عاصمة السعودية؟', ['جدة', 'الرياض', 'مكة المكرمة', 'الدمام'], 1),
      q('ما عاصمة الإمارات؟', ['دبي', 'الشارقة', 'أبوظبي', 'العين'], 2),
    ] } },
  { type: 'asterquiz', title: 'مغامرة جدول الضرب', subject: 'الرياضيات', grade: 'الصف الثالث', difficulty: 'medium', description: 'دمّر الكويكبات بالإجابة الصحيحة. لديك ثلاث محاولات!',
    content: { questions: [
      q('3 × 4 = ؟', ['10', '12', '14', '16'], 1), q('5 × 5 = ؟', ['20', '25', '30', '35'], 1), q('7 × 6 = ؟', ['42', '36', '48', '40'], 0),
      q('8 × 3 = ؟', ['21', '28', '24', '32'], 2), q('9 × 9 = ؟', ['72', '81', '90', '99'], 1), q('12 ÷ 4 = ؟', ['2', '3', '4', '6'], 1),
    ] } },
  { type: 'froggy', title: 'قفزات الضفدع: الحيوانات', subject: 'العلوم', grade: 'الصف الأول', difficulty: 'easy', description: 'ساعد الضفدع على عبور البركة.',
    content: { questions: [
      q('أي حيوان يعيش في الماء؟', ['الأسد', 'السمكة', 'الجمل', 'الحصان'], 1), q('أي حيوان يطير؟', ['العصفور', 'الأرنب', 'الفيل', 'السلحفاة'], 0),
      q('أي حيوان يعطينا الحليب؟', ['الدجاجة', 'البقرة', 'السمكة', 'الحمامة'], 1), q('أي حيوان يعيش في الصحراء؟', ['الدب القطبي', 'البطريق', 'الجمل', 'الدلفين'], 2),
    ] } },
  { type: 'videoquiz', title: 'اختبار الفيديو: الأرنب الكبير', subject: 'لغة', grade: 'الصف الرابع', difficulty: 'easy', description: 'شاهد المقطع ثم أجب عن الأسئلة.',
    content: { videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', questions: [
      q('ما الحيوان الرئيسي في الفيلم؟', ['أرنب', 'قطة', 'دب', 'ثعلب'], 0), q('أين تدور الأحداث؟', ['في الغابة', 'في المدينة', 'في البحر', 'في الصحراء'], 0),
    ] } },
  { type: 'truefalse', title: 'صح أم خطأ: معلومات علمية', subject: 'العلوم', grade: 'الصف السادس', difficulty: 'medium', description: 'حدد صحة كل عبارة.',
    content: { statements: [
      { text: 'الشمس نجم.', answer: true, feedback: 'الشمس نجم متوسط الحجم.' },
      { text: 'القمر يصدر الضوء من نفسه.', answer: false, feedback: 'القمر يعكس ضوء الشمس.' },
      { text: 'يغلي الماء عند 100 درجة مئوية (عند مستوى سطح البحر).', answer: true, feedback: '' },
      { text: 'عدد كواكب المجموعة الشمسية تسعة.', answer: false, feedback: 'ثمانية كواكب.' },
    ] } },
  { type: 'riddle', title: 'ألغاز ممتعة', subject: 'تسلية', grade: 'جميع المراحل', difficulty: 'medium', description: 'هل تستطيع حل الألغاز؟',
    content: { items: [
      { question: 'شيء له أسنان ولا يعضّ، فما هو؟', answer: 'المشط', alternatives: 'مشط', hint: 'تستخدمه لتسريح الشعر.' },
      { question: 'كلما أخذت منه كبر، فما هو؟', answer: 'الحفرة', alternatives: 'حفرة', hint: 'تجدها في الأرض.' },
    ] } },
  { type: 'matching', title: 'أضداد الكلمات', subject: 'اللغة العربية', grade: 'الصف الثاني', difficulty: 'easy', description: 'صِل كل كلمة بضدها.',
    content: { pairs: [{ left: 'كبير', right: 'صغير' }, { left: 'طويل', right: 'قصير' }, { left: 'حار', right: 'بارد' }, { left: 'سريع', right: 'بطيء' }, { left: 'نهار', right: 'ليل' }] } },
  { type: 'memory', title: 'ذاكرة الصور والكلمات', subject: 'اللغة العربية', grade: 'الصف الأول', difficulty: 'easy', description: 'اعثر على كل صورة وكلمتها.',
    content: { pairs: [{ a: '🍎', b: 'تفاحة' }, { a: '🐱', b: 'قطة' }, { a: '🚗', b: 'سيارة' }, { a: '🌳', b: 'شجرة' }, { a: '⚽', b: 'كرة' }] } },
  { type: 'groupsort', title: 'حيوان أم نبات؟', subject: 'العلوم', grade: 'الصف الثاني', difficulty: 'easy', description: 'صنّف العناصر في المجموعة الصحيحة.',
    content: { groups: [{ name: 'حيوانات', items: ['أسد', 'قطة', 'نسر', 'سمكة'] }, { name: 'نباتات', items: ['وردة', 'نخلة', 'صبّار', 'زيتون'] }] } },
  { type: 'lineup', title: 'مراحل حياة الفراشة', subject: 'العلوم', grade: 'الصف الثالث', difficulty: 'easy', description: 'رتّب المراحل من البداية إلى النهاية.',
    content: { prompt: 'رتّب مراحل حياة الفراشة', items: ['البيضة', 'اليرقة', 'الشرنقة', 'الفراشة'] } },
  { type: 'unscramble', title: 'رتّب الحروف: في المدرسة', subject: 'اللغة العربية', grade: 'الصف الأول', difficulty: 'easy', description: 'كوّن الكلمة من الحروف المبعثرة.',
    content: { mode: 'letters', items: [{ answer: 'مدرسة', hint: 'مكان التعلم' }, { answer: 'كتاب', hint: 'نقرأ فيه' }, { answer: 'معلم', hint: 'يشرح الدرس' }] } },
  { type: 'fillblanks', title: 'أكمل الفراغات', subject: 'الاجتماعيات', grade: 'الصف الرابع', difficulty: 'easy', description: 'اختر الكلمة المناسبة لكل فراغ.',
    content: { items: [{ text: 'عاصمة مصر هي [[القاهرة]] وتقع على نهر [[النيل]].' }, { text: 'يتكوّن الأسبوع من [[سبعة]] أيام.' }], distractors: ['الرياض', 'البحر', 'ثمانية'] } },
  { type: 'wordsearch', title: 'البحث عن كلمات الفضاء', subject: 'العلوم', grade: 'الصف الخامس', difficulty: 'medium', description: 'ابحث عن الكلمات المخفية.',
    content: { size: 10, words: ['شمس', 'قمر', 'نجم', 'كوكب', 'مجرة'] } },
  { type: 'dictation', title: 'إملاء: جمل قصيرة', subject: 'اللغات', grade: 'الصف الثالث', difficulty: 'medium', description: 'استمع واكتب ما تسمعه.',
    content: { items: [{ text: 'الشمس مشرقة اليوم', lang: 'ar', audioUrl: '' }, { text: 'I love reading books', lang: 'en', audioUrl: '' }] } },
  { type: 'flashcards', title: 'بطاقات المفردات الإنجليزية', subject: 'اللغة الإنجليزية', grade: 'الصف الرابع', difficulty: 'easy', description: 'راجع المفردات بالبطاقات.',
    content: { cards: [{ front: 'Apple', back: 'تفاحة' }, { front: 'Book', back: 'كتاب' }, { front: 'School', back: 'مدرسة' }, { front: 'Teacher', back: 'معلم' }] } },
  { type: 'slideshow', title: 'درس: دورة الماء', subject: 'العلوم', grade: 'الصف الخامس', difficulty: 'easy', description: 'عرض مبسّط لدورة الماء في الطبيعة.',
    content: { slides: [
      { title: 'التبخّر', text: 'تسخّن الشمس مياه البحار فتتحوّل إلى بخار يصعد إلى الجو.', image: '' },
      { title: 'التكاثف', text: 'يبرد البخار في الأعلى فيتكثف مكوّنًا السحب.', image: '' },
      { title: 'الهطول', text: 'تثقل السحب فينزل الماء على شكل مطر أو ثلج.', image: '' },
    ] } },
  { type: 'dialogue', title: 'حوار: التعارف', subject: 'اللغة العربية', grade: 'الصف الثالث', difficulty: 'easy', description: 'اختر الرد المناسب في كل موقف.',
    content: { partner: 'سارة', you: 'أنت', steps: [
      { line: 'مرحبًا! كيف حالك؟', choices: [{ text: 'أنا بخير، شكرًا. وأنت؟', correct: true }, { text: 'وداعًا', correct: false }], response: 'الحمد لله، أنا بخير أيضًا.' },
      { line: 'هل تحب القراءة؟', choices: [{ text: 'السيارة حمراء', correct: false }, { text: 'نعم، أحب القصص كثيرًا', correct: true }], response: 'رائع! سأعيرك كتابًا.' },
    ] } },
  { type: 'wheel', title: 'عجلة اختيار الطالب', subject: 'أدوات الصف', grade: 'جميع المراحل', difficulty: 'easy', description: 'أدِر العجلة لاختيار طالب عشوائيًا.',
    content: { items: ['أحمد', 'سارة', 'ليلى', 'عمر', 'نور', 'يوسف'] } },
];

export const sampleStudents = ['ليلى', 'أحمد', 'سارة', 'عمر', 'نور', 'يوسف', 'مريم', 'خالد'];
