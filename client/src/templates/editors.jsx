import { useT } from '../i18n.jsx';
import { Field, LinesField, ListEditor, MediaField } from './editorKit.jsx';

const set = (content, setContent, key) => (v) => setContent({ ...content, [key]: v });

/* ---------- أسئلة الاختيار من متعدد (مشتركة بين 4 قوالب) ---------- */
export function McqEditor({ content, setContent }) {
  const t = useT();
  const L = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
  return (
    <ListEditor title={t('سؤال', 'Question')} items={content.questions} setItems={set(content, setContent, 'questions')} addLabel={t('إضافة سؤال', 'Add question')}
      newItem={() => ({ question: '', options: ['', '', '', ''], answer: 0, feedback: '', image: '' })}
      render={(q, up, qi) => (
        <>
          <Field label={t('نص السؤال', 'Question')}><textarea rows={2} value={q.question} onChange={(e) => up({ question: e.target.value })} /></Field>
          <Field label={t('صورة (اختياري)', 'Image (optional)')}><MediaField value={q.image} onChange={(v) => up({ image: v })} /></Field>
          <div className="opts-edit">
            <span className="lbl">{t('الخيارات — حدد الإجابة الصحيحة', 'Options — mark the correct one')}</span>
            {q.options.map((o, k) => (
              <div className="opt-row" key={k}>
                <input type="radio" name={'ans-' + qi} checked={q.answer === k} onChange={() => up({ answer: k })} aria-label="correct" />
                <input value={o} placeholder={`${t('الخيار', 'Option')} ${L[k]}`} onChange={(e) => up({ options: q.options.map((x, j) => (j === k ? e.target.value : x)) })} />
                <button className="icon-btn danger" disabled={q.options.length <= 2} onClick={() => up({ options: q.options.filter((_, j) => j !== k), answer: q.answer === k ? 0 : q.answer > k ? q.answer - 1 : q.answer })} aria-label="remove">✕</button>
              </div>
            ))}
            {q.options.length < 6 && <button className="btn small" onClick={() => up({ options: [...q.options, ''] })}>＋ {t('خيار', 'Option')}</button>}
          </div>
          <Field label={t('شرح / تغذية راجعة (اختياري)', 'Feedback (optional)')}><input value={q.feedback || ''} onChange={(e) => up({ feedback: e.target.value })} /></Field>
        </>
      )} />
  );
}

function VideoQuizEditor(p) {
  const t = useT();
  return (
    <>
      <Field label={t('رابط الفيديو (يوتيوب أو ملف MP4)', 'Video link (YouTube or MP4)')}><MediaField kind="video" value={p.content.videoUrl} onChange={(v) => p.setContent({ ...p.content, videoUrl: v })} /></Field>
      <McqEditor {...p} />
    </>
  );
}

function TrueFalseEditor({ content, setContent }) {
  const t = useT();
  return (
    <ListEditor title={t('عبارة', 'Statement')} items={content.statements} setItems={set(content, setContent, 'statements')} addLabel={t('إضافة عبارة', 'Add statement')}
      newItem={() => ({ text: '', answer: true, feedback: '' })}
      render={(x, up) => (
        <>
          <Field label={t('العبارة', 'Statement')}><textarea rows={2} value={x.text} onChange={(e) => up({ text: e.target.value })} /></Field>
          <div className="row">
            <Field label={t('الحكم', 'Answer')}>
              <select value={x.answer ? '1' : '0'} onChange={(e) => up({ answer: e.target.value === '1' })}><option value="1">{t('صح', 'True')}</option><option value="0">{t('خطأ', 'False')}</option></select>
            </Field>
            <Field label={t('تغذية راجعة', 'Feedback')} className="grow"><input value={x.feedback || ''} onChange={(e) => up({ feedback: e.target.value })} /></Field>
          </div>
        </>
      )} />
  );
}

function RiddleEditor({ content, setContent }) {
  const t = useT();
  return (
    <ListEditor title={t('لغز', 'Riddle')} items={content.items} setItems={set(content, setContent, 'items')} addLabel={t('إضافة لغز', 'Add riddle')}
      newItem={() => ({ question: '', answer: '', alternatives: '', hint: '' })}
      render={(x, up) => (
        <>
          <Field label={t('اللغز', 'Riddle')}><textarea rows={2} value={x.question} onChange={(e) => up({ question: e.target.value })} /></Field>
          <div className="row">
            <Field label={t('الإجابة', 'Answer')} className="grow"><input value={x.answer} onChange={(e) => up({ answer: e.target.value })} /></Field>
            <Field label={t('إجابات بديلة (افصل بفاصلة)', 'Alternatives (comma-separated)')} className="grow"><input value={x.alternatives || ''} onChange={(e) => up({ alternatives: e.target.value })} /></Field>
          </div>
          <Field label={t('تلميح (اختياري)', 'Hint (optional)')}><input value={x.hint || ''} onChange={(e) => up({ hint: e.target.value })} /></Field>
        </>
      )} />
  );
}

function PairsEditor({ content, setContent, a, b, aLabel, bLabel }) {
  const t = useT();
  return (
    <ListEditor title={t('زوج', 'Pair')} items={content.pairs} setItems={set(content, setContent, 'pairs')} addLabel={t('إضافة زوج', 'Add pair')} min={2}
      newItem={() => ({ [a]: '', [b]: '' })}
      render={(x, up) => (
        <div className="row">
          <Field label={aLabel} className="grow"><input value={x[a]} onChange={(e) => up({ [a]: e.target.value })} /></Field>
          <span className="arrow">⇄</span>
          <Field label={bLabel} className="grow"><input value={x[b]} onChange={(e) => up({ [b]: e.target.value })} /></Field>
        </div>
      )} />
  );
}

function MatchingEditor(p) {
  const t = useT();
  return <><p className="muted">{t('يمكن كتابة رابط صورة بدل النص في أي خانة.', 'You can paste an image URL instead of text in any cell.')}</p><PairsEditor {...p} a="left" b="right" aLabel={t('العنصر', 'Item')} bLabel={t('ما يقابله', 'Its match')} /></>;
}
function MemoryEditor(p) {
  const t = useT();
  return <><p className="muted">{t('يمكن استخدام رموز تعبيرية (🍎) أو روابط صور أو كلمات.', 'Use emoji (🍎), image URLs or words.')}</p><PairsEditor {...p} a="a" b="b" aLabel={t('البطاقة الأولى', 'Card A')} bLabel={t('البطاقة الثانية', 'Card B')} /></>;
}

function GroupSortEditor({ content, setContent }) {
  const t = useT();
  return (
    <ListEditor title={t('مجموعة', 'Group')} items={content.groups} setItems={set(content, setContent, 'groups')} addLabel={t('إضافة مجموعة', 'Add group')} min={2}
      newItem={() => ({ name: '', items: [] })}
      render={(g, up) => (
        <>
          <Field label={t('اسم المجموعة', 'Group name')}><input value={g.name} onChange={(e) => up({ name: e.target.value })} /></Field>
          <Field label={t('عناصر المجموعة (عنصر في كل سطر)', 'Items (one per line)')}><LinesField value={g.items} onChange={(v) => up({ items: v })} rows={4} /></Field>
        </>
      )} />
  );
}

function LineUpEditor({ content, setContent }) {
  const t = useT();
  return (
    <>
      <Field label={t('تعليمات الترتيب (اختياري)', 'Prompt (optional)')}><input value={content.prompt || ''} onChange={(e) => setContent({ ...content, prompt: e.target.value })} /></Field>
      <Field label={t('العناصر بالترتيب الصحيح (عنصر في كل سطر)', 'Items in the CORRECT order (one per line)')} hint={t('سيُخلط الترتيب تلقائيًا للطالب.', 'The order is shuffled for students.')}>
        <LinesField value={content.items} onChange={set(content, setContent, 'items')} rows={7} />
      </Field>
    </>
  );
}

function UnscrambleEditor({ content, setContent }) {
  const t = useT();
  return (
    <>
      <Field label={t('نوع النشاط', 'Mode')}>
        <select value={content.mode || 'letters'} onChange={(e) => setContent({ ...content, mode: e.target.value })}>
          <option value="letters">{t('ترتيب حروف كلمة', 'Unscramble letters')}</option>
          <option value="words">{t('ترتيب كلمات جملة', 'Unscramble words in a sentence')}</option>
        </select>
      </Field>
      <ListEditor items={content.items} setItems={set(content, setContent, 'items')} addLabel={t('إضافة عنصر', 'Add item')}
        newItem={() => ({ answer: '', hint: '' })}
        render={(x, up) => (
          <div className="row">
            <Field label={content.mode === 'words' ? t('الجملة الصحيحة', 'Correct sentence') : t('الكلمة الصحيحة', 'Correct word')} className="grow"><input value={x.answer} onChange={(e) => up({ answer: e.target.value })} /></Field>
            <Field label={t('تلميح', 'Hint')} className="grow"><input value={x.hint || ''} onChange={(e) => up({ hint: e.target.value })} /></Field>
          </div>
        )} />
    </>
  );
}

function FillBlanksEditor({ content, setContent }) {
  const t = useT();
  return (
    <>
      <p className="muted">{t('ضع الكلمة المخفية بين قوسين مزدوجين: عاصمة مصر هي [[القاهرة]].', 'Wrap hidden words in double brackets: The capital is [[Cairo]].')}</p>
      <ListEditor title={t('نص', 'Text')} items={content.items} setItems={set(content, setContent, 'items')} addLabel={t('إضافة نص', 'Add text')}
        newItem={() => ({ text: '' })}
        render={(x, up) => <textarea rows={3} value={x.text} onChange={(e) => up({ text: e.target.value })} />} />
      <Field label={t('كلمات مشتتة إضافية (كلمة في كل سطر)', 'Extra distractor words (one per line)')}><LinesField value={content.distractors || []} onChange={set(content, setContent, 'distractors')} rows={3} /></Field>
    </>
  );
}

function WordSearchEditor({ content, setContent }) {
  const t = useT();
  const longest = Math.max(0, ...content.words.map((w) => w.replace(/\s/g, '').length));
  return (
    <>
      <Field label={t('حجم الشبكة', 'Grid size')} hint={longest > content.size ? t(`أطول كلمة (${longest}) أكبر من الشبكة، سيتم توسيعها تلقائيًا.`, `Longest word (${longest}) is bigger than the grid; it will be enlarged.`) : undefined}>
        <input type="number" min={6} max={20} value={content.size} onChange={(e) => setContent({ ...content, size: Number(e.target.value) || 10 })} />
      </Field>
      <Field label={t('الكلمات (كلمة في كل سطر)', 'Words (one per line)')}><LinesField value={content.words} onChange={set(content, setContent, 'words')} rows={8} /></Field>
    </>
  );
}

function DictationEditor({ content, setContent }) {
  const t = useT();
  return (
    <ListEditor title={t('جملة', 'Sentence')} items={content.items} setItems={set(content, setContent, 'items')} addLabel={t('إضافة جملة', 'Add sentence')}
      newItem={() => ({ text: '', lang: 'ar', audioUrl: '' })}
      render={(x, up) => (
        <>
          <div className="row">
            <Field label={t('النص الذي سيُملى', 'Text to dictate')} className="grow"><input value={x.text} onChange={(e) => up({ text: e.target.value })} /></Field>
            <Field label={t('اللغة', 'Language')}><select value={x.lang} onChange={(e) => up({ lang: e.target.value })}><option value="ar">العربية</option><option value="en">English</option></select></Field>
          </div>
          <Field label={t('ملف صوتي (اختياري — وإلا يُستخدم نطق المتصفح)', 'Audio file (optional — otherwise browser speech is used)')}><MediaField kind="audio" value={x.audioUrl} onChange={(v) => up({ audioUrl: v })} /></Field>
        </>
      )} />
  );
}

function FlashcardsEditor({ content, setContent }) {
  const t = useT();
  return (
    <ListEditor title={t('بطاقة', 'Card')} items={content.cards} setItems={set(content, setContent, 'cards')} addLabel={t('إضافة بطاقة', 'Add card')}
      newItem={() => ({ front: '', back: '' })}
      render={(x, up) => (
        <div className="row">
          <Field label={t('الوجه الأمامي', 'Front')} className="grow"><textarea rows={2} value={x.front} onChange={(e) => up({ front: e.target.value })} /></Field>
          <Field label={t('الوجه الخلفي', 'Back')} className="grow"><textarea rows={2} value={x.back} onChange={(e) => up({ back: e.target.value })} /></Field>
        </div>
      )} />
  );
}

function SlideshowEditor({ content, setContent }) {
  const t = useT();
  return (
    <ListEditor title={t('شريحة', 'Slide')} items={content.slides} setItems={set(content, setContent, 'slides')} addLabel={t('إضافة شريحة', 'Add slide')}
      newItem={() => ({ title: '', text: '', image: '' })}
      render={(x, up) => (
        <>
          <Field label={t('العنوان', 'Title')}><input value={x.title} onChange={(e) => up({ title: e.target.value })} /></Field>
          <Field label={t('النص', 'Text')}><textarea rows={3} value={x.text} onChange={(e) => up({ text: e.target.value })} /></Field>
          <Field label={t('صورة (اختياري)', 'Image (optional)')}><MediaField value={x.image} onChange={(v) => up({ image: v })} /></Field>
        </>
      )} />
  );
}

function DialogueEditor({ content, setContent }) {
  const t = useT();
  return (
    <>
      <div className="row">
        <Field label={t('اسم المحاور', 'Partner name')} className="grow"><input value={content.partner || ''} onChange={(e) => setContent({ ...content, partner: e.target.value })} /></Field>
        <Field label={t('اسم الطالب في الحوار', 'Student name in dialogue')} className="grow"><input value={content.you || ''} onChange={(e) => setContent({ ...content, you: e.target.value })} /></Field>
      </div>
      <ListEditor title={t('خطوة', 'Step')} items={content.steps} setItems={set(content, setContent, 'steps')} addLabel={t('إضافة خطوة', 'Add step')}
        newItem={() => ({ line: '', choices: [{ text: '', correct: true }, { text: '', correct: false }], response: '' })}
        render={(st, up, si) => (
          <>
            <Field label={t('كلام المحاور', "Partner's line")}><input value={st.line} onChange={(e) => up({ line: e.target.value })} /></Field>
            <div className="opts-edit">
              <span className="lbl">{t('ردود الطالب — حدد الرد الصحيح', 'Replies — mark the correct one')}</span>
              {st.choices.map((c, k) => (
                <div className="opt-row" key={k}>
                  <input type="radio" name={'dlg-' + si} checked={!!c.correct} onChange={() => up({ choices: st.choices.map((x, j) => ({ ...x, correct: j === k })) })} aria-label="correct" />
                  <input value={c.text} placeholder={t('الرد', 'Reply')} onChange={(e) => up({ choices: st.choices.map((x, j) => (j === k ? { ...x, text: e.target.value } : x)) })} />
                  <button className="icon-btn danger" disabled={st.choices.length <= 2} onClick={() => up({ choices: st.choices.filter((_, j) => j !== k) })} aria-label="remove">✕</button>
                </div>
              ))}
              {st.choices.length < 4 && <button className="btn small" onClick={() => up({ choices: [...st.choices, { text: '', correct: false }] })}>＋ {t('رد', 'Reply')}</button>}
            </div>
            <Field label={t('رد المحاور بعد الإجابة (اختياري)', 'Partner response after answering (optional)')}><input value={st.response || ''} onChange={(e) => up({ response: e.target.value })} /></Field>
          </>
        )} />
    </>
  );
}

function WheelEditor({ content, setContent }) {
  const t = useT();
  return <Field label={t('عناصر العجلة (عنصر في كل سطر)', 'Wheel items (one per line)')}><LinesField value={content.items} onChange={set(content, setContent, 'items')} rows={10} /></Field>;
}

export const editors = {
  quiz: McqEditor, asterquiz: McqEditor, froggy: McqEditor, videoquiz: VideoQuizEditor, truefalse: TrueFalseEditor, riddle: RiddleEditor,
  matching: MatchingEditor, memory: MemoryEditor, groupsort: GroupSortEditor, lineup: LineUpEditor,
  unscramble: UnscrambleEditor, fillblanks: FillBlanksEditor, wordsearch: WordSearchEditor, dictation: DictationEditor,
  flashcards: FlashcardsEditor, slideshow: SlideshowEditor, dialogue: DialogueEditor, wheel: WheelEditor,
};
