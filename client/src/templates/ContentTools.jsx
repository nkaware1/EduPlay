import { useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';
import { conversionTargets } from '../lib/convert.js';
import { IMPORT, applyImport, looksLikeHeader } from '../lib/importers.js';
import { parseDelimited, readTable, toCsv } from '../lib/tableFile.js';
import { Modal, useConfirm, useFetch, useToast } from '../ui.jsx';
import { TEMPLATE_MAP } from './meta.js';
import { Field } from './editorKit.jsx';

const labelOf = (x) => {
  if (typeof x === 'string') return x;
  const v = x?.question ?? x?.text ?? x?.word ?? x?.answer ?? x?.front ?? x?.left ?? x?.a ?? x?.title ?? x?.line ?? x?.name ?? x?.sequence ?? x?.group ?? x?.who ?? x?.id;
  return Array.isArray(v) ? v.join('، ') : String(v ?? '…');
};

/* ---------- التوليد بالذكاء الاصطناعي ---------- */
function AiModal({ act, setContent, onClose, status }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [f, setF] = useState({ topic: act.title || '', sourceText: '', count: 8, grade: act.grade || '', difficulty: act.difficulty || 'medium', language: lang === 'en' ? 'en' : 'ar' });
  const [showSrc, setShowSrc] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState(null);
  const supported = status?.enabled && status.types.includes(act.type);
  const meta = TEMPLATE_MAP[act.type];

  const run = async () => {
    setBusy(true); setErr(''); setRes(null);
    try { setRes(await api.post('/ai/generate', { type: act.type, ...f })); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const items = res ? res.content[res.listKey || 'nodes'] || [] : [];
  const apply = (mode) => {
    const k = res.listKey;
    setContent(mode === 'append' && k ? { ...act.content, ...res.content, [k]: [...(act.content[k] || []), ...res.content[k]] } : { ...act.content, ...res.content });
    toast(t('تمت إضافة المحتوى المولَّد. راجعه قبل النشر.', 'Generated content added. Review it before publishing.'));
    onClose();
  };

  return (
    <Modal title={`✨ ${t('توليد بالذكاء الاصطناعي', 'Generate with AI')} — ${lang === 'en' ? meta.en : meta.ar}`} onClose={onClose} wide>
      {!status?.enabled ? (
        <div className="error-box">⚠️ {t('الميزة غير مفعّلة على هذا الخادم. أضف ANTHROPIC_API_KEY في ملف server/.env ثم أعد تشغيل الخادم.', 'Not enabled on this server. Set ANTHROPIC_API_KEY in server/.env and restart.')}</div>
      ) : !supported ? (
        <div className="error-box">{t('هذا القالب يحتاج وسائط (صور أو خرائط) ولا يدعم التوليد التلقائي.', 'This template needs media (images or maps) and cannot be generated automatically.')}</div>
      ) : !res ? (
        <>
          <Field label={t('موضوع النشاط', 'Topic')}><textarea rows={2} value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} maxLength={400} placeholder={t('مثال: دورة حياة الفراشة، أو جدول الضرب للصف الثالث', 'e.g. The water cycle for grade 4')} autoFocus /></Field>
          <button type="button" className="link-btn" onClick={() => setShowSrc(!showSrc)}>{showSrc ? '▾' : '▸'} {t('أو الصق نص درس ليُبنى عليه النشاط', 'Or paste lesson text to base it on')}</button>
          {showSrc && <textarea rows={6} value={f.sourceText} onChange={(e) => setF({ ...f, sourceText: e.target.value })} maxLength={8000} placeholder={t('الصق هنا فقرة أو درسًا (حتى 8000 حرف)…', 'Paste a passage or lesson (up to 8000 characters)…')} />}
          <div className="row">
            <Field label={t('عدد العناصر', 'Items')} className="grow"><input type="number" min={1} max={30} value={f.count} onChange={(e) => setF({ ...f, count: Number(e.target.value) || 8 })} /></Field>
            <Field label={t('المرحلة', 'Level')} className="grow"><input value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })} placeholder={t('الصف الخامس', 'Grade 5')} /></Field>
            <Field label={t('الصعوبة', 'Difficulty')} className="grow"><select value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })}><option value="easy">{t('سهل', 'Easy')}</option><option value="medium">{t('متوسط', 'Medium')}</option><option value="hard">{t('صعب', 'Hard')}</option></select></Field>
            <Field label={t('اللغة', 'Language')} className="grow"><select value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })}><option value="ar">العربية</option><option value="en">English</option></select></Field>
          </div>
          {err && <div className="error-box">⚠️ {err}</div>}
          <p className="muted small-text">{t('يُرسل الموضوع والنص إلى خدمة Claude لتوليد المحتوى. لا ترسل بيانات طلاب أو معلومات شخصية. راجع المحتوى دائمًا قبل النشر.', 'The topic and text are sent to the Claude API. Do not include student data. Always review before publishing.')}</p>
          <div className="row end"><button className="btn" onClick={onClose}>{t('إلغاء', 'Cancel')}</button><button className="btn primary" disabled={busy || (!f.topic.trim() && !f.sourceText.trim())} onClick={run}>{busy ? t('جارٍ التوليد…', 'Generating…') : '✨ ' + t('ولّد', 'Generate')}</button></div>
        </>
      ) : (
        <>
          <p><b>{items.length}</b> {t('عنصر مولَّد. هذه معاينة:', 'items generated. Preview:')}</p>
          <ol className="preview-list">{items.slice(0, 8).map((x, i) => <li key={i}>{labelOf(x)}</li>)}{items.length > 8 && <li className="muted">…</li>}</ol>
          <div className="row end">
            <button className="btn" onClick={() => setRes(null)}>↻ {t('إعادة التوليد', 'Regenerate')}</button>
            {res.listKey && <button className="btn" onClick={() => apply('append')}>＋ {t('إضافة إلى الحالي', 'Add to existing')}</button>}
            <button className="btn primary" onClick={() => apply('replace')}>{t('استبدال المحتوى الحالي', 'Replace current content')}</button>
          </div>
        </>
      )}
    </Modal>
  );
}

/* ---------- الاستيراد من Excel / CSV / نص ملصوق ---------- */
function ImportModal({ act, setContent, onClose }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const spec = IMPORT[act.type];
  const meta = TEMPLATE_MAP[act.type];
  const [rows, setRows] = useState([]);
  const [text, setText] = useState('');
  const [header, setHeader] = useState(true);
  const [mode, setMode] = useState('append');
  const [err, setErr] = useState('');
  const [fileName, setFileName] = useState('');
  const fileRef = useRef(null);

  const load = (r) => { setRows(r); setHeader(looksLikeHeader(r[0])); };
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(''); setFileName(file.name); setText('');
    try { load(await readTable(file)); } catch (x) { setErr(x.message); setRows([]); }
    e.target.value = '';
  };
  const onPaste = (v) => { setText(v); setFileName(''); setErr(''); load(v.trim() ? parseDelimited(v) : []); };
  const parsed = useMemo(() => (rows.length ? spec.parse(header ? rows.slice(1) : rows) : { items: [], warnings: [] }), [rows, header, spec]);
  const download = () => {
    const blob = new Blob([toCsv([spec.columns, ...spec.example])], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `template-${act.type}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  const apply = () => { setContent(applyImport(act.type, act.content, parsed.items, mode)); toast(`${parsed.items.length} ${t('عنصر تم استيراده', 'items imported')}`); onClose(); };

  return (
    <Modal title={`📥 ${t('استيراد من Excel / CSV', 'Import from Excel / CSV')} — ${lang === 'en' ? meta.en : meta.ar}`} onClose={onClose} wide>
      <p className="muted">{t('الأعمدة المطلوبة بالترتيب:', 'Required columns, in order:')}</p>
      <div className="cols-hint">{spec.columns.map((c, i) => <span key={i} className="chip">{i + 1}. {c}</span>)}</div>
      <div className="row">
        <label className="btn">{t('اختر ملف (xlsx / csv)', 'Choose file (xlsx / csv)')}<input ref={fileRef} type="file" hidden accept=".xlsx,.csv,.tsv,.txt" onChange={onFile} /></label>
        <button className="btn ghost" onClick={download}>⬇ {t('تنزيل ملف نموذجي', 'Download sample file')}</button>
        {fileName && <span className="muted">📄 {fileName}</span>}
      </div>
      <Field label={t('أو الصق الجدول هنا (انسخه من Excel مباشرة)', 'Or paste the table here (copy straight from Excel)')}>
        <textarea rows={5} value={text} onChange={(e) => onPaste(e.target.value)} dir="auto" placeholder={spec.example.map((r) => r.join('\t')).join('\n')} />
      </Field>
      {err && <div className="error-box">⚠️ {err}</div>}
      {rows.length > 0 && (
        <>
          <div className="row">
            <label className="check"><input type="checkbox" checked={header} onChange={(e) => setHeader(e.target.checked)} /> {t('الصف الأول عناوين (تجاهله)', 'First row is a header (skip it)')}</label>
            <label className="check"><input type="radio" name="imode" checked={mode === 'append'} onChange={() => setMode('append')} /> {t('إضافة للمحتوى الحالي', 'Add to existing')}</label>
            <label className="check"><input type="radio" name="imode" checked={mode === 'replace'} onChange={() => setMode('replace')} /> {t('استبدال المحتوى الحالي', 'Replace existing')}</label>
          </div>
          <div className="table-wrap import-preview"><table><thead><tr>{(rows[0] || []).map((_, i) => <th key={i}>{spec.columns[i] || `#${i + 1}`}</th>)}</tr></thead>
            <tbody>{(header ? rows.slice(1) : rows).slice(0, 5).map((r, i) => <tr key={i}>{r.map((x, j) => <td key={j}>{x}</td>)}</tr>)}</tbody></table></div>
          <p className={parsed.items.length ? 'ok-text' : 'bad-text'}>{parsed.items.length} {t('عنصر صالح للاستيراد', 'valid items')}{parsed.warnings.length ? ` · ${parsed.warnings.length} ${t('صف متجاهَل', 'skipped')}` : ''}</p>
          {parsed.warnings.length > 0 && <ul className="warn-list">{parsed.warnings.slice(0, 5).map((w, i) => <li key={i}>{w}</li>)}{parsed.warnings.length > 5 && <li>…</li>}</ul>}
        </>
      )}
      <div className="row end"><button className="btn" onClick={onClose}>{t('إلغاء', 'Cancel')}</button><button className="btn primary" disabled={!parsed.items.length} onClick={apply}>{t('استيراد', 'Import')} {parsed.items.length || ''}</button></div>
    </Modal>
  );
}

/* ---------- التبديل بين القوالب ---------- */
function ConvertModal({ act, changeType, onClose }) {
  const { t, lang } = useI18n();
  const confirm = useConfirm();
  const targets = useMemo(() => conversionTargets(act.type, act.content), [act.type, act.content]);
  const go = async (tg) => {
    const msg = t('سيُحوَّل المحتوى إلى القالب الجديد وقد تُفقد الحقول الخاصة بالقالب الحالي (مثل الصور أو الإعدادات الخاصة). يمكنك الرجوع بالتراجع عن طريق عدم الحفظ وإعادة تحميل الصفحة.', 'The content will be converted and template-specific fields may be lost.');
    if (act.published && !(await confirm({ text: t('هذا النشاط منشور. تغيير القالب سيغيّر ما يراه الطلاب فورًا. متابعة؟', 'This activity is published. Changing the template changes what students see immediately. Continue?'), ok: t('تحويل', 'Convert'), danger: false }))) return;
    if (!act.published && !(await confirm({ text: msg, ok: t('تحويل', 'Convert'), danger: false }))) return;
    changeType(tg.id, tg.content);
    onClose();
  };
  return (
    <Modal title={`🔁 ${t('تحويل إلى قالب آخر', 'Switch template')}`} onClose={onClose} wide>
      <p className="muted">{t('اختر القالب الجديد. نحافظ على محتواك قدر الإمكان ونعيد بناءه بالشكل المناسب.', 'Pick the new template. Your content is reused wherever possible.')}</p>
      {!targets.length ? <p className="bad-text">{t('لا توجد قوالب متوافقة مع محتوى هذا النشاط حاليًا.', 'No compatible templates for this content yet.')}</p> : (
        <div className="grid conv-grid">
          {targets.map((tg) => { const m = TEMPLATE_MAP[tg.id]; return (
            <button key={tg.id} className="conv-card" style={{ '--c': m.color }} onClick={() => go(tg)}>
              <span className="conv-icon">{m.icon}</span><b>{lang === 'en' ? m.en : m.ar}</b><small>{tg.count} {t('عنصر', 'items')}</small>
            </button>); })}
        </div>
      )}
    </Modal>
  );
}

export default function ContentTools({ act, setContent, changeType }) {
  const { t } = useI18n();
  const [modal, setModal] = useState(null);
  const ai = useFetch(() => api.get('/ai/status'), []);
  const canImport = !!IMPORT[act.type];
  const hasTargets = useMemo(() => conversionTargets(act.type, act.content).length > 0, [act.type, act.content]);
  return (
    <>
      <div className="tools-bar">
        <button className="btn small" onClick={() => setModal('ai')}>✨ {t('توليد بالذكاء الاصطناعي', 'Generate with AI')}</button>
        {canImport && <button className="btn small" onClick={() => setModal('import')}>📥 {t('استيراد من Excel / CSV', 'Import Excel / CSV')}</button>}
        <button className="btn small" onClick={() => setModal('convert')} disabled={!hasTargets} title={hasTargets ? '' : t('لا توجد قوالب متوافقة', 'No compatible templates')}>🔁 {t('تحويل إلى قالب آخر', 'Switch template')}</button>
      </div>
      {modal === 'ai' && <AiModal act={act} setContent={setContent} status={ai.data} onClose={() => setModal(null)} />}
      {modal === 'import' && <ImportModal act={act} setContent={setContent} onClose={() => setModal(null)} />}
      {modal === 'convert' && <ConvertModal act={act} changeType={changeType} onClose={() => setModal(null)} />}
    </>
  );
}
