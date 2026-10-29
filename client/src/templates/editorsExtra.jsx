import { useRef } from 'react';
import { useT } from '../i18n.jsx';
import { Field, LinesField, ListEditor, MediaField } from './editorKit.jsx';
import { McqEditor } from './editors.jsx';

const set = (c, sc, k) => (v) => sc({ ...c, [k]: v });
const Num = ({ label, value, onChange, min, max }) => (
  <Field label={label}><input type="number" min={min} max={max} value={value ?? ''} onChange={(e) => onChange(Number(e.target.value) || min)} /></Field>
);

/* محرر نقاط على صورة: اضغط على الصورة لإضافة نقطة */
function PointsEditor({ image, points, setPoints, fields }) {
  const t = useT();
  const ref = useRef(null);
  const add = (e) => {
    const r = ref.current.getBoundingClientRect();
    setPoints([...points, { x: Math.round(((e.clientX - r.left) / r.width) * 1000) / 10, y: Math.round(((e.clientY - r.top) / r.height) * 1000) / 10, ...Object.fromEntries(fields.map((f) => [f.key, ''])) }]);
  };
  if (!image) return <p className="muted">{t('أضف الصورة أولًا ثم اضغط عليها لتحديد النقاط.', 'Add the image first, then click on it to add points.')}</p>;
  return (
    <div>
      <p className="muted small-text">{t('اضغط على الصورة لإضافة نقطة جديدة.', 'Click on the image to add a point.')}</p>
      <div className="map edit" ref={ref} onClick={add}>
        <img src={image} alt="" draggable="false" />
        {points.map((p, k) => <span key={k} className="pin num" style={{ left: p.x + '%', top: p.y + '%' }}>{k + 1}</span>)}
      </div>
      {points.map((p, k) => (
        <div className="item-card" key={k}>
          <div className="item-head"><b>{t('نقطة', 'Point')} {k + 1} <small className="muted">({p.x}%, {p.y}%)</small></b><button className="icon-btn danger" onClick={() => setPoints(points.filter((_, j) => j !== k))} aria-label="delete">🗑</button></div>
          {fields.map((f) => <Field key={f.key} label={f.label}>{f.area ? <textarea rows={2} value={p[f.key]} onChange={(e) => setPoints(points.map((x, j) => (j === k ? { ...x, [f.key]: e.target.value } : x)))} /> : <input value={p[f.key]} onChange={(e) => setPoints(points.map((x, j) => (j === k ? { ...x, [f.key]: e.target.value } : x)))} />}</Field>)}
        </div>
      ))}
    </div>
  );
}

const ImageField = ({ c, sc, k = 'image', label }) => {
  const t = useT();
  return <Field label={label || t('الصورة (رابط أو رفع)', 'Image (URL or upload)')}><MediaField value={c[k]} onChange={set(c, sc, k)} /></Field>;
};

/* ---------- محررات القوالب ---------- */
const RacingEditor = (p) => { const t = useT(); return <><Num label={t('عدد المنافسين (1–3)', 'Opponents (1–3)')} min={1} max={3} value={p.content.bots} onChange={set(p.content, p.setContent, 'bots')} /><McqEditor {...p} /></>; };
const SpeedEditor = (p) => { const t = useT(); return <><Num label={t('مدة الاختبار (ثانية)', 'Duration (seconds)')} min={10} max={600} value={p.content.seconds} onChange={set(p.content, p.setContent, 'seconds')} /><McqEditor {...p} /></>; };
const TriviaEditor = (p) => { const t = useT(); return <><Field label={t('الفرق (فريق في كل سطر، حتى 4)', 'Teams (one per line, up to 4)')}><LinesField value={p.content.teams} onChange={set(p.content, p.setContent, 'teams')} rows={3} /></Field><McqEditor {...p} /></>; };
const HiddenEditor = (p) => { const t = useT(); return <><ImageField c={p.content} sc={p.setContent} label={t('الصورة المخبأة', 'Hidden picture')} /><Field label={t('حجم الشبكة', 'Grid size')}><select value={p.content.grid || 4} onChange={(e) => p.setContent({ ...p.content, grid: Number(e.target.value) })}>{[3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}×{n}</option>)}</select></Field><McqEditor {...p} /></>; };
const MazeEditor = (p) => { const t = useT(); return <><Num label={t('حجم المتاهة (5–12)', 'Maze size (5–12)')} min={5} max={12} value={p.content.size} onChange={set(p.content, p.setContent, 'size')} /><p className="muted small-text">{t('كل سؤال يصبح بوابة على طريق الخروج.', 'Each question becomes a gate on the way out.')}</p><McqEditor {...p} /></>; };

function VocabEditor({ content, setContent }) {
  const t = useT();
  return <ListEditor title={t('صورة', 'Picture')} min={2} items={content.items} setItems={set(content, setContent, 'items')} addLabel={t('إضافة صورة', 'Add picture')} newItem={() => ({ image: '', word: '' })}
    render={(x, up) => <><Field label={t('الصورة', 'Image')}><MediaField value={x.image} onChange={(v) => up({ image: v })} /></Field><Field label={t('الكلمة', 'Word')}><input value={x.word} onChange={(e) => up({ word: e.target.value })} /></Field></>} />;
}
function OddEditor({ content, setContent }) {
  const t = useT();
  return <ListEditor title={t('مجموعة', 'Set')} items={content.items} setItems={set(content, setContent, 'items')} addLabel={t('إضافة مجموعة', 'Add set')} newItem={() => ({ group: [], odd: '', reason: '' })}
    render={(x, up) => <><Field label={t('كلمات مترابطة (كلمة في كل سطر)', 'Related words (one per line)')}><LinesField value={x.group} onChange={(v) => up({ group: v })} rows={3} /></Field><div className="row"><Field label={t('الكلمة الغريبة', 'Odd one')} className="grow"><input value={x.odd} onChange={(e) => up({ odd: e.target.value })} /></Field><Field label={t('السبب (اختياري)', 'Reason')} className="grow"><input value={x.reason || ''} onChange={(e) => up({ reason: e.target.value })} /></Field></div></>} />;
}
function PatternEditor({ content, setContent }) {
  const t = useT();
  return <ListEditor title={t('نمط', 'Pattern')} items={content.items} setItems={set(content, setContent, 'items')} addLabel={t('إضافة نمط', 'Add pattern')} newItem={() => ({ sequence: '', answer: '', distractors: '' })}
    render={(x, up) => <><Field label={t('التسلسل (افصل بفاصلة)', 'Sequence (comma-separated)')}><input value={x.sequence} onChange={(e) => up({ sequence: e.target.value })} placeholder="2, 4, 6, 8" /></Field><div className="row"><Field label={t('العنصر التالي (الإجابة)', 'Next item (answer)')} className="grow"><input value={x.answer} onChange={(e) => up({ answer: e.target.value })} /></Field><Field label={t('خيارات خاطئة (افصل بفاصلة)', 'Wrong options (comma)')} className="grow"><input value={x.distractors || ''} onChange={(e) => up({ distractors: e.target.value })} /></Field></div></>} />;
}
function TruthEditor({ content, setContent }) {
  const t = useT();
  return <ListEditor title={t('جولة', 'Round')} items={content.items} setItems={set(content, setContent, 'items')} addLabel={t('إضافة جولة', 'Add round')} newItem={() => ({ who: '', truths: [], lie: '' })}
    render={(x, up) => <><Field label={t('صاحب الجولة (اختياري)', 'Who (optional)')}><input value={x.who || ''} onChange={(e) => up({ who: e.target.value })} /></Field><Field label={t('الحقائق الصحيحة (حقيقة في كل سطر)', 'True statements (one per line)')}><LinesField value={x.truths} onChange={(v) => up({ truths: v })} rows={3} /></Field><Field label={t('الكذبة', 'The lie')}><input value={x.lie} onChange={(e) => up({ lie: e.target.value })} /></Field></>} />;
}
function EscapeEditor({ content, setContent }) {
  const t = useT();
  return <><Field label={t('قصة البداية (اختياري)', 'Opening story (optional)')}><textarea rows={2} value={content.intro || ''} onChange={(e) => setContent({ ...content, intro: e.target.value })} /></Field>
    <ListEditor title={t('قفل', 'Lock')} items={content.items} setItems={set(content, setContent, 'items')} addLabel={t('إضافة لغز', 'Add puzzle')} newItem={() => ({ scene: '', question: '', answer: '', alternatives: '', hint: '' })}
      render={(x, up) => <><Field label={t('وصف المشهد', 'Scene')}><input value={x.scene || ''} onChange={(e) => up({ scene: e.target.value })} /></Field><Field label={t('اللغز / السؤال', 'Puzzle')}><textarea rows={2} value={x.question} onChange={(e) => up({ question: e.target.value })} /></Field><div className="row"><Field label={t('الإجابة (الرمز)', 'Answer / code')} className="grow"><input value={x.answer} onChange={(e) => up({ answer: e.target.value })} /></Field><Field label={t('إجابات بديلة (فاصلة)', 'Alternatives')} className="grow"><input value={x.alternatives || ''} onChange={(e) => up({ alternatives: e.target.value })} /></Field></div><Field label={t('تلميح', 'Hint')}><input value={x.hint || ''} onChange={(e) => up({ hint: e.target.value })} /></Field></>} /></>;
}
const MapQuizEditor = ({ content, setContent }) => { const t = useT(); return <><ImageField c={content} sc={setContent} label={t('صورة الخريطة', 'Map image')} /><PointsEditor image={content.image} points={content.points} setPoints={set(content, setContent, 'points')} fields={[{ key: 'name', label: t('اسم الموقع', 'Place name') }]} /></>; };
const HotspotsEditor = ({ content, setContent }) => { const t = useT(); return <><ImageField c={content} sc={setContent} /><PointsEditor image={content.image} points={content.points} setPoints={set(content, setContent, 'points')} fields={[{ key: 'title', label: t('العنوان', 'Title') }, { key: 'info', label: t('المعلومات', 'Info'), area: true }]} /></>; };
const SpotDiffEditor = ({ content, setContent }) => { const t = useT(); return <><ImageField c={content} sc={setContent} k="imageA" label={t('الصورة الأولى (الأصل)', 'Image A (original)')} /><ImageField c={content} sc={setContent} k="imageB" label={t('الصورة الثانية (المعدّلة)', 'Image B (modified)')} /><p className="muted small-text">{t('علّم مواضع الاختلاف على الصورة الأولى.', 'Mark the differences on image A.')}</p><PointsEditor image={content.imageA} points={content.diffs} setPoints={set(content, setContent, 'diffs')} fields={[]} /></>; };

function CrosswordEditor({ content, setContent }) {
  const t = useT();
  return <><p className="muted small-text">{t('تُولَّد الشبكة تلقائيًا وقد تختلف في كل مرة. كلما تشاركت الكلمات حروفًا زاد التقاطع.', 'The grid is generated automatically. Words sharing letters cross more.')}</p>
    <ListEditor title={t('كلمة', 'Word')} min={2} items={content.entries} setItems={set(content, setContent, 'entries')} addLabel={t('إضافة كلمة', 'Add word')} newItem={() => ({ answer: '', clue: '' })}
      render={(x, up) => <div className="row"><Field label={t('الكلمة', 'Word')} className="grow"><input value={x.answer} onChange={(e) => up({ answer: e.target.value })} /></Field><Field label={t('التلميح', 'Clue')} className="grow"><input value={x.clue} onChange={(e) => up({ clue: e.target.value })} /></Field></div>} /></>;
}
function HangmanEditor({ content, setContent }) {
  const t = useT();
  return <><Num label={t('عدد المحاولات الخاطئة المسموحة', 'Allowed mistakes')} min={3} max={10} value={content.maxMistakes} onChange={set(content, setContent, 'maxMistakes')} />
    <ListEditor title={t('كلمة', 'Word')} items={content.items} setItems={set(content, setContent, 'items')} addLabel={t('إضافة كلمة', 'Add word')} newItem={() => ({ word: '', hint: '' })}
      render={(x, up) => <div className="row"><Field label={t('الكلمة', 'Word')} className="grow"><input value={x.word} onChange={(e) => up({ word: e.target.value })} /></Field><Field label={t('تلميح', 'Hint')} className="grow"><input value={x.hint || ''} onChange={(e) => up({ hint: e.target.value })} /></Field></div>} /></>;
}
const WordChainEditor = ({ content, setContent }) => { const t = useT(); return <Field label={t('الكلمات (كلمة في كل سطر — الأولى هي البداية)', 'Words (one per line — the first is the start)')} hint={t('اجعل كل كلمة تبدأ بالحرف الأخير من سابقتها لتكون السلسلة ممكنة.', 'Make each word start with the last letter of the previous one.')}><LinesField value={content.words} onChange={set(content, setContent, 'words')} rows={8} /></Field>; };
const SudokuEditor = ({ content, setContent }) => {
  const t = useT();
  return <><div className="row"><Field label={t('الحجم', 'Size')} className="grow"><select value={content.size} onChange={(e) => setContent({ ...content, size: Number(e.target.value), blanks: Math.min(content.blanks, Number(e.target.value) ** 2 - 4), symbols: Array.from({ length: Number(e.target.value) }, (_, k) => String(k + 1)) })}><option value={4}>4×4</option><option value={6}>6×6</option></select></Field><Num label={t('الخانات الفارغة', 'Blanks')} min={1} max={content.size * content.size - 4} value={content.blanks} onChange={set(content, setContent, 'blanks')} /></div>
    <Field label={t(`الرموز (${content.size} سطور — أرقام أو حروف أو إيموجي)`, `Symbols (${content.size} lines — digits, letters or emoji)`)}><LinesField value={content.symbols} onChange={set(content, setContent, 'symbols')} rows={content.size} /></Field></>;
};
const JigsawEditor = ({ content, setContent }) => { const t = useT(); return <><ImageField c={content} sc={setContent} /><div className="row"><Num label={t('الصفوف', 'Rows')} min={2} max={6} value={content.rows} onChange={set(content, setContent, 'rows')} /><Num label={t('الأعمدة', 'Columns')} min={2} max={6} value={content.cols} onChange={set(content, setContent, 'cols')} /></div></>; };

/* شجرة القرارات / لعب الأدوار */
function GraphEditor({ content, setContent, role }) {
  const t = useT();
  const ids = content.nodes.map((n) => n.id);
  const nextId = () => 'n' + (Math.max(0, ...ids.map((i) => Number(String(i).replace(/\D/g, '')) || 0)) + 1);
  return (
    <>
      {role && <Field label={t('دور الطالب', "Student's role")}><input value={content.role || ''} onChange={(e) => setContent({ ...content, role: e.target.value })} /></Field>}
      <Field label={t('وصف الموقف', 'Scenario')}><textarea rows={2} value={content.scenario || ''} onChange={(e) => setContent({ ...content, scenario: e.target.value })} /></Field>
      <Field label={t('عقدة البداية', 'Start node')}><select value={content.start} onChange={(e) => setContent({ ...content, start: e.target.value })}>{ids.map((i) => <option key={i}>{i}</option>)}</select></Field>
      <ListEditor title={t('عقدة', 'Node')} min={2} items={content.nodes} setItems={set(content, setContent, 'nodes')} addLabel={t('إضافة عقدة', 'Add node')} newItem={() => ({ id: nextId(), text: '', end: false, outcome: 'neutral', choices: [] })}
        render={(n, up) => (
          <>
            <p className="muted small-text">ID: <code>{n.id}</code></p>
            <Field label={t('النص', 'Text')}><textarea rows={2} value={n.text} onChange={(e) => up({ text: e.target.value })} /></Field>
            <label className="check"><input type="checkbox" checked={!!n.end} onChange={(e) => up({ end: e.target.checked })} /> {t('هذه نهاية', 'This is an ending')}</label>
            {n.end ? <Field label={t('نوع النهاية', 'Outcome')}><select value={n.outcome} onChange={(e) => up({ outcome: e.target.value })}><option value="good">{t('جيدة 🎉', 'Good 🎉')}</option><option value="neutral">{t('محايدة 🙂', 'Neutral 🙂')}</option><option value="bad">{t('سيئة ⚠️', 'Bad ⚠️')}</option></select></Field> : (
              <div className="opts-edit"><span className="lbl">{t('الخيارات والوجهة', 'Choices & destination')}</span>
                {n.choices.map((c, k) => (
                  <div className="opt-row" key={k}>
                    <input value={c.text} placeholder={t('نص الخيار', 'Choice text')} onChange={(e) => up({ choices: n.choices.map((x, j) => (j === k ? { ...x, text: e.target.value } : x)) })} />
                    <select style={{ width: 90 }} value={c.next} onChange={(e) => up({ choices: n.choices.map((x, j) => (j === k ? { ...x, next: e.target.value } : x)) })} aria-label="next"><option value="">→</option>{ids.filter((i) => i !== n.id).map((i) => <option key={i}>{i}</option>)}</select>
                    <button className="icon-btn danger" onClick={() => up({ choices: n.choices.filter((_, j) => j !== k) })} aria-label="remove">✕</button>
                  </div>))}
                <button className="btn small" onClick={() => up({ choices: [...n.choices, { text: '', next: '' }] })}>＋ {t('خيار', 'Choice')}</button>
              </div>)}
          </>)} />
    </>
  );
}
const RoleEditor = (p) => <GraphEditor {...p} role />;

const BrainstormEditor = ({ content, setContent }) => { const t = useT(); return <><Field label={t('سؤال العصف الذهني', 'Prompt')}><input value={content.prompt} onChange={(e) => setContent({ ...content, prompt: e.target.value })} /></Field><Field label={t('الأعمدة (عمود في كل سطر)', 'Columns (one per line)')}><LinesField value={content.columns} onChange={set(content, setContent, 'columns')} rows={4} /></Field></>; };
function PollEditor({ content, setContent }) {
  const t = useT();
  return <><p className="muted small-text">{t('الأصوات تُحفظ على الخادم وتظهر للجميع بعد نشر النشاط.', 'Votes are stored on the server and shared after publishing.')}</p>
    <ListEditor title={t('سؤال', 'Question')} items={content.questions} setItems={set(content, setContent, 'questions')} addLabel={t('إضافة سؤال', 'Add question')} newItem={() => ({ question: '', options: [] })}
      render={(x, up) => <><Field label={t('السؤال', 'Question')}><input value={x.question} onChange={(e) => up({ question: e.target.value })} /></Field><Field label={t('الخيارات (خيار في كل سطر)', 'Options (one per line)')}><LinesField value={x.options} onChange={(v) => up({ options: v })} rows={3} /></Field></>} /></>;
}
const WyrEditor = ({ content, setContent }) => { const t = useT(); return <ListEditor title={t('سؤال', 'Question')} items={content.items} setItems={set(content, setContent, 'items')} addLabel={t('إضافة سؤال', 'Add question')} newItem={() => ({ a: '', b: '' })} render={(x, up) => <div className="row"><Field label={t('الخيار الأول', 'Option A')} className="grow"><input value={x.a} onChange={(e) => up({ a: e.target.value })} /></Field><span className="arrow">⚖️</span><Field label={t('الخيار الثاني', 'Option B')} className="grow"><input value={x.b} onChange={(e) => up({ b: e.target.value })} /></Field></div>} />; };
const DeckEditor = ({ content, setContent }) => { const t = useT(); return <><Num label={t('مدة المؤقت لكل بطاقة (ثانية)', 'Timer per card (seconds)')} min={3} max={3600} value={content.seconds} onChange={set(content, setContent, 'seconds')} /><Field label={t('البطاقات (بطاقة في كل سطر)', 'Cards (one per line)')}><LinesField value={content.items} onChange={set(content, setContent, 'items')} rows={8} /></Field></>; };
const StoryEditor = ({ content, setContent }) => { const t = useT(); return <><Field label={t('بداية القصة (اختياري)', 'Story starter (optional)')}><input value={content.starter || ''} onChange={(e) => setContent({ ...content, starter: e.target.value })} /></Field><Field label={t('اللاعبون (اسم في كل سطر)', 'Players (one per line)')}><LinesField value={content.players} onChange={set(content, setContent, 'players')} rows={5} /></Field></>; };
const RpsEditor = ({ content, setContent }) => { const t = useT(); return <Num label={t('عدد الجولات (ضد الحاسوب)', 'Rounds (vs computer)')} min={1} max={20} value={content.rounds} onChange={set(content, setContent, 'rounds')} />; };
const BingoEditor = ({ content, setContent }) => { const t = useT(); return <Field label={t('الصفات (صفة في كل سطر — 4 أو 9 أو 16 للشبكة الكاملة)', 'Traits (one per line — 4, 9 or 16 fill the grid)')}><LinesField value={content.traits} onChange={set(content, setContent, 'traits')} rows={10} /></Field>; };

export const editorsExtra = {
  racing: RacingEditor, millionaire: McqEditor, speedtest: SpeedEditor, triviashow: TriviaEditor, hiddenimage: HiddenEditor, maze: MazeEditor,
  vocab: VocabEditor, oddone: OddEditor, pattern: PatternEditor, truthslie: TruthEditor, escape: EscapeEditor,
  mapquiz: MapQuizEditor, hotspots: HotspotsEditor, spotdiff: SpotDiffEditor, crossword: CrosswordEditor, hangman: HangmanEditor,
  wordchain: WordChainEditor, sudoku: SudokuEditor, jigsaw: JigsawEditor, roleplay: RoleEditor, decisiontree: GraphEditor,
  brainstorm: BrainstormEditor, poll: PollEditor, wyr: WyrEditor, charades: DeckEditor, scavenger: DeckEditor, fivesec: DeckEditor,
  tower: DeckEditor, innovation: DeckEditor, storyword: StoryEditor, rps: RpsEditor, bingo: BingoEditor,
};
