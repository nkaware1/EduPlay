import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';
import GameShell from '../games/GameShell.jsx';
import { Logo } from '../Layout.jsx';
import { Field } from '../templates/editorKit.jsx';
import { DEFAULTS, DEFAULT_SETTINGS, TEMPLATE_MAP, editors } from '../templates/index.js';
import ContentTools from '../templates/ContentTools.jsx';
import { ErrorBox, Modal, Spinner, useDebounced, useToast } from '../ui.jsx';

const COLORS = ['', '#6C4CF1', '#2DA8FF', '#19A974', '#F59F00', '#F76707', '#E5484D', '#E64980', '#1B1B3A'];

const blank = (type) => ({
  type, title: '', description: '', subject: '', topic: '', grade: '', difficulty: 'medium', folder: '',
  content: DEFAULTS[type](), settings: { ...DEFAULT_SETTINGS }, published: false, isPublic: false,
});

export default function EditorPage() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const { t, lang } = useI18n();
  const [act, setAct] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState('');
  const [tab, setTab] = useState('content');
  const [full, setFull] = useState(false);
  const idRef = useRef(id === 'new' ? null : id);
  const ver = useRef(0);

  useEffect(() => {
    if (id === 'new') {
      const type = sp.get('type');
      if (!TEMPLATE_MAP[type]) return nav('/templates', { replace: true });
      setAct(blank(type));
    } else if (!(idRef.current === id && act)) {
      api.get('/activities/' + id).then((a) => { idRef.current = a.id; setAct(a); }).catch((e) => setLoadErr(e.message));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const edit = (fn) => { ver.current++; setAct((a) => fn(a)); setDirty(true); };
  const upd = (patch) => edit((a) => ({ ...a, ...patch }));
  const updS = (patch) => edit((a) => ({ ...a, settings: { ...a.settings, ...patch } }));
  const setContent = (content) => edit((a) => ({ ...a, content }));
  const changeType = (type, content) => edit((a) => ({ ...a, type, content }));

  const save = async (extra = {}) => {
    const v = ver.current;
    setSaving('saving');
    try {
      const body = { ...act, ...extra };
      let saved;
      if (!idRef.current) {
        saved = await api.post('/activities', body);
        idRef.current = saved.id;
        nav('/editor/' + saved.id, { replace: true });
      } else saved = await api.put('/activities/' + idRef.current, body);
      if (ver.current === v) setDirty(false);
      setAct((a) => ({ ...a, id: saved.id, updatedAt: saved.updatedAt, ...(extra.published !== undefined ? { published: saved.published, isPublic: saved.isPublic } : {}) }));
      setSaving('saved');
      return saved;
    } catch (e) {
      setSaving('error');
      toast(e.message, 'error');
      return null;
    }
  };

  useEffect(() => {
    if (!dirty || !act) return;
    const h = setTimeout(() => save(), 1500);
    return () => clearTimeout(h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act, dirty]);

  useEffect(() => {
    const h = (e) => { if (dirty) e.preventDefault(); };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const publish = async () => {
    const s = await save({ published: true, isPublic: act.isPublic });
    if (s) { toast(t('تم النشر', 'Published')); nav('/activity/' + s.id); }
  };

  const previewSrc = useDebounced(act, 600);
  const previewKey = useMemo(() => (previewSrc ? JSON.stringify([previewSrc.content, previewSrc.settings, previewSrc.title, previewSrc.description]) : ''), [previewSrc]);

  if (loadErr) return <div className="center-box"><ErrorBox error={loadErr} /><Link className="btn" to="/my">{t('أنشطتي', 'My activities')}</Link></div>;
  if (!act) return <Spinner />;
  const meta = TEMPLATE_MAP[act.type];
  const Editor = editors[act.type];
  const status = { saving: t('جارٍ الحفظ…', 'Saving…'), saved: t('✓ تم الحفظ', '✓ Saved'), error: t('⚠ تعذّر الحفظ', '⚠ Save failed') }[saving] || (dirty ? t('تغييرات غير محفوظة', 'Unsaved changes') : '');

  return (
    <div className="editor">
      <header className="ed-top">
        <Logo />
        <span className="chip" style={{ '--c': meta.color }}>{meta.icon} {lang === 'en' ? meta.en : meta.ar}</span>
        <span className={'save-status ' + saving}>{status}</span>
        <div className="row ed-actions">
          <button className="btn" onClick={() => save()} disabled={saving === 'saving'}>💾 {t('حفظ النشاط', 'Save')}</button>
          <button className="btn" onClick={() => setFull(true)}>▶ {t('تشغيل المعاينة', 'Preview')}</button>
          <button className="btn primary" onClick={publish} disabled={saving === 'saving'}>🚀 {t('نشر ومشاركة', 'Publish & share')}</button>
          <Link className="btn ghost" to={idRef.current ? '/activity/' + idRef.current : '/my'} onClick={(e) => { if (dirty && !window.confirm(t('لديك تغييرات غير محفوظة. هل تريد المغادرة؟', 'Unsaved changes. Leave?'))) e.preventDefault(); }}>✕</Link>
        </div>
      </header>

      <div className="ed-tabs">
        {[['settings', t('الإعدادات', 'Settings')], ['content', t('المحتوى', 'Content')], ['preview', t('معاينة', 'Preview')]].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      <div className="ed-grid">
        <aside className={'ed-pane settings' + (tab === 'settings' ? ' show' : '')}>
          <h3>{t('إعدادات النشاط', 'Activity settings')}</h3>
          <Field label={t('عنوان النشاط', 'Title')}><input value={act.title} onChange={(e) => upd({ title: e.target.value })} maxLength={120} placeholder={t('مثال: عواصم الدول العربية', 'e.g. Capital cities')} /></Field>
          <Field label={t('وصف النشاط', 'Description')}><textarea rows={2} value={act.description} onChange={(e) => upd({ description: e.target.value })} maxLength={500} /></Field>
          <div className="row">
            <Field label={t('المادة', 'Subject')} className="grow"><input value={act.subject} onChange={(e) => upd({ subject: e.target.value })} /></Field>
            <Field label={t('الموضوع', 'Topic')} className="grow"><input value={act.topic} onChange={(e) => upd({ topic: e.target.value })} /></Field>
          </div>
          <div className="row">
            <Field label={t('المرحلة', 'Grade')} className="grow"><input value={act.grade} onChange={(e) => upd({ grade: e.target.value })} /></Field>
            <Field label={t('الصعوبة', 'Difficulty')} className="grow"><select value={act.difficulty} onChange={(e) => upd({ difficulty: e.target.value })}><option value="easy">{t('سهل', 'Easy')}</option><option value="medium">{t('متوسط', 'Medium')}</option><option value="hard">{t('صعب', 'Hard')}</option></select></Field>
          </div>
          <Field label={t('المجلد', 'Folder')}><input value={act.folder || ''} onChange={(e) => upd({ folder: e.target.value })} maxLength={60} /></Field>
          <hr />
          <div className="row">
            <Field label={t('الوقت (ثانية، 0 = بلا حد)', 'Time limit (sec, 0 = none)')} className="grow"><input type="number" min={0} max={7200} value={act.settings.timeLimit} onChange={(e) => updS({ timeLimit: Number(e.target.value) || 0 })} /></Field>
            <Field label={t('المحاولات (0 = بلا حد)', 'Attempts (0 = unlimited)')} className="grow"><input type="number" min={0} max={100} value={act.settings.maxAttempts} onChange={(e) => updS({ maxAttempts: Number(e.target.value) || 0 })} /></Field>
          </div>
          <Field label={t('طريقة الاستخدام', 'Mode')}>
            <select value={act.settings.mode} onChange={(e) => updS({ mode: e.target.value })}><option value="practice">{t('تدريب ذاتي', 'Self practice')}</option><option value="homework">{t('واجب منزلي (يطلب الاسم)', 'Homework (asks for name)')}</option></select>
          </Field>
          <label className="check"><input type="checkbox" checked={act.settings.shuffle} onChange={(e) => updS({ shuffle: e.target.checked })} /> {t('ترتيب عشوائي', 'Random order')}</label>
          <label className="check"><input type="checkbox" checked={act.settings.showFeedback} onChange={(e) => updS({ showFeedback: e.target.checked })} /> {t('إظهار التغذية الراجعة', 'Show feedback')}</label>
          <label className="check"><input type="checkbox" checked={act.settings.sound} onChange={(e) => updS({ sound: e.target.checked })} /> {t('المؤثرات الصوتية', 'Sound effects')}</label>
          <label className="check"><input type="checkbox" checked={act.settings.requireName} onChange={(e) => updS({ requireName: e.target.checked })} /> {t('طلب اسم الطالب قبل البدء', 'Ask for student name')}</label>
          <div className="field"><span>{t('لون النشاط', 'Accent color')}</span>
            <div className="swatches">{COLORS.map((c) => <button key={c || 'auto'} className={'swatch' + (act.settings.color === c ? ' on' : '')} style={{ background: c || 'conic-gradient(#6C4CF1,#2DA8FF,#19A974,#F59F00,#E5484D,#6C4CF1)' }} onClick={() => updS({ color: c })} aria-label={c || 'auto'} />)}</div>
          </div>
          <hr />
          <label className="check"><input type="checkbox" checked={act.isPublic} onChange={(e) => upd({ isPublic: e.target.checked })} /> {t('إظهاره في «استكشاف الأنشطة» عند النشر', 'List in Explore when published')}</label>
          {act.published && <p className="chip ok-chip">🌐 {t('هذا النشاط منشور', 'This activity is published')}</p>}
        </aside>

        <section className={'ed-pane content' + (tab === 'content' ? ' show' : '')}>
          <h3>{t('محتوى النشاط', 'Content')}</h3>
          <p className="muted small-text">{lang === 'en' ? meta.descEn : meta.descAr}</p>
          <ContentTools act={act} setContent={setContent} changeType={changeType} />
          <Editor content={act.content} setContent={setContent} />
        </section>

        <aside className={'ed-pane preview' + (tab === 'preview' ? ' show' : '')}>
          <h3>{t('معاينة مباشرة', 'Live preview')}</h3>
          <div className="preview-frame"><GameShell key={previewKey} activity={{ ...act, id: idRef.current || 'draft' }} preview /></div>
        </aside>
      </div>

      {full && <Modal wide title={t('معاينة النشاط', 'Activity preview')} onClose={() => setFull(false)}><GameShell activity={{ ...act, id: idRef.current || 'draft' }} preview /></Modal>}
    </div>
  );
}
