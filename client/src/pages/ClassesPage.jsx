import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { PageHead } from '../components.jsx';
import { Empty, ErrorBox, Modal, Spinner, useConfirm, useFetch, useToast } from '../ui.jsx';
import { Field } from '../templates/editorKit.jsx';

function StudentView() {
  const { t } = useI18n();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => api.get('/classes'), []);
  const [code, setCode] = useState('');
  const join = async (e) => {
    e.preventDefault();
    try { await api.post('/classes/join', { code }); setCode(''); toast(t('تم الانضمام للصف', 'Joined class')); reload(); } catch (x) { toast(x.message, 'error'); }
  };
  return (
    <div>
      <PageHead title={t('صفوفي', 'My classes')} sub={t('انضم إلى صف برمز يعطيه لك معلمك.', 'Join a class with the code from your teacher.')} />
      <form className="panel row join" onSubmit={join}>
        <input dir="ltr" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={12} placeholder="ABC123" aria-label="class code" />
        <button className="btn primary" disabled={!code.trim()}>{t('انضمام', 'Join')}</button>
      </form>
      {loading && <Spinner />}{error && <ErrorBox error={error} retry={reload} />}
      {data && !data.length && <Empty icon="🏫" title={t('لم تنضم لأي صف بعد', 'No classes yet')} />}
      {data?.map((c) => (
        <section key={c.id} className="panel">
          <h2>{c.name} <small className="muted">{c.grade}</small></h2>
          <p className="muted">{t('المعلم', 'Teacher')}: {c.ownerName}</p>
          <h3>{t('الأنشطة المطلوبة', 'Assigned activities')}</h3>
          {c.activities.length ? <ul className="plain-list">{c.activities.map((a) => <li key={a.id}><span>{a.title}</span><Link className="btn small primary" to={`/play/${a.id}`}>▶ {t('ابدأ', 'Start')}</Link></li>)}</ul> : <p className="muted">{t('لا توجد أنشطة مسندة.', 'Nothing assigned yet.')}</p>}
        </section>
      ))}
    </div>
  );
}

function ClassPanel({ c, mine, onChange, onDelete }) {
  const { t } = useI18n();
  const toast = useToast();
  const [tab, setTab] = useState('students');
  const [names, setNames] = useState('');
  const report = useFetch(() => (tab === 'report' ? api.get(`/classes/${c.id}/report`) : Promise.resolve(null)), [tab, c.id, c.students.length, c.activityIds.join()]);

  const save = async (patch) => { try { onChange(await api.put('/classes/' + c.id, patch)); } catch (e) { toast(e.message, 'error'); } };
  const addNames = () => {
    const add = names.split('\n').map((n) => n.trim()).filter(Boolean).map((name) => ({ name }));
    if (!add.length) return;
    save({ students: [...c.students, ...add] }); setNames('');
  };
  const toggleAct = (id) => save({ activityIds: c.activityIds.includes(id) ? c.activityIds.filter((x) => x !== id) : [...c.activityIds, id] });

  return (
    <section className="panel">
      <div className="class-head">
        <div><h2>{c.name} <small className="muted">{c.grade}</small></h2>
          <p>{t('رمز الانضمام للطلاب', 'Student join code')}: <code className="code">{c.code}</code></p></div>
        <button className="btn danger-soft" onClick={() => onDelete(c)}>{t('حذف الصف', 'Delete class')}</button>
      </div>
      <div className="tabs">
        {[['students', t(`الطلاب (${c.students.length})`, `Students (${c.students.length})`)], ['acts', t(`الأنشطة (${c.activityIds.length})`, `Activities (${c.activityIds.length})`)], ['report', t('درجات الصف', 'Gradebook')]].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {tab === 'students' && (
        <div>
          <ul className="plain-list">{c.students.map((s) => <li key={s.id}><span>{s.name} {s.userId && <small className="muted">({t('حساب', 'account')})</small>}</span><button className="icon-btn danger" onClick={() => save({ students: c.students.filter((x) => x.id !== s.id) })} aria-label="remove">✕</button></li>)}</ul>
          <textarea rows={3} value={names} onChange={(e) => setNames(e.target.value)} placeholder={t('أضف أسماء الطلاب (اسم في كل سطر)', 'Add student names (one per line)')} />
          <button className="btn" onClick={addNames} disabled={!names.trim()}>＋ {t('إضافة', 'Add')}</button>
        </div>
      )}
      {tab === 'acts' && (
        <ul className="plain-list">
          {mine.length ? mine.filter((a) => a.published).map((a) => <li key={a.id}><label className="check"><input type="checkbox" checked={c.activityIds.includes(a.id)} onChange={() => toggleAct(a.id)} /> {a.title}</label></li>) : <li className="muted">{t('لا توجد أنشطة منشورة. انشر نشاطًا أولًا.', 'No published activities yet.')}</li>}
          {mine.length > 0 && !mine.some((a) => a.published) && <li className="muted">{t('انشر نشاطًا ليظهر هنا.', 'Publish an activity to list it here.')}</li>}
        </ul>
      )}
      {tab === 'report' && (report.loading ? <Spinner /> : report.data && (!report.data.students.length || !report.data.activities.length ? <p className="muted">{t('أضف طلابًا وأنشطة لعرض الدرجات.', 'Add students and activities to see grades.')}</p> : (
        <div className="table-wrap"><table>
          <thead><tr><th>{t('الطالب', 'Student')}</th>{report.data.activities.map((a) => <th key={a.id}>{a.title}</th>)}</tr></thead>
          <tbody>{report.data.students.map((s) => <tr key={s.id}><td>{s.name}</td>{report.data.activities.map((a) => { const v = report.data.matrix[s.id]?.[a.id]; return <td key={a.id}>{v === null || v === undefined ? <span className="muted">—</span> : <b className={v >= 50 ? 'ok-text' : 'bad-text'}>{v}%</b>}</td>; })}</tr>)}</tbody>
        </table><p className="muted small-text">{t('أفضل نسبة لكل طالب. يُطابق الطلاب بالحساب أو بالاسم المكتوب.', 'Best score per student, matched by account or typed name.')}</p></div>
      )))}
    </section>
  );
}

export default function ClassesPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload, setData } = useFetch(() => (user.role === 'student' ? Promise.resolve([]) : api.get('/classes')), [user.id]);
  const mine = useFetch(() => (user.role === 'student' ? Promise.resolve([]) : api.get('/activities/mine')), [user.id]);
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ name: '', grade: '' });

  if (user.role === 'student') return <StudentView />;

  const create = async (e) => {
    e.preventDefault();
    try { const c = await api.post('/classes', f); setData((d) => [c, ...d]); setCreating(false); setF({ name: '', grade: '' }); toast(t('تم إنشاء الصف', 'Class created')); } catch (x) { toast(x.message, 'error'); }
  };
  const del = async (c) => {
    if (!(await confirm({ text: t(`حذف الصف «${c.name}»؟`, `Delete class “${c.name}”?`), ok: t('حذف', 'Delete') }))) return;
    try { await api.del('/classes/' + c.id); setData((d) => d.filter((x) => x.id !== c.id)); } catch (x) { toast(x.message, 'error'); }
  };

  return (
    <div>
      <PageHead title={t('الصفوف والمجموعات', 'Classes & groups')} sub={t('أنشئ صفًّا، أضف طلابك، وأسند إليهم الأنشطة.', 'Create a class, add students and assign activities.')}>
        <button className="btn primary" onClick={() => setCreating(true)}>＋ {t('صف جديد', 'New class')}</button>
      </PageHead>
      {loading && <Spinner />}{error && <ErrorBox error={error} retry={reload} />}
      {data && !data.length && <Empty icon="🏫" title={t('لا توجد صفوف بعد', 'No classes yet')}><button className="btn primary" onClick={() => setCreating(true)}>{t('إنشاء صف', 'Create class')}</button></Empty>}
      {data?.map((c) => <ClassPanel key={c.id} c={c} mine={mine.data || []} onChange={(nc) => setData((d) => d.map((x) => (x.id === nc.id ? nc : x)))} onDelete={del} />)}
      {creating && (
        <Modal title={t('صف جديد', 'New class')} onClose={() => setCreating(false)} small>
          <form onSubmit={create}>
            <Field label={t('اسم الصف أو المجموعة', 'Class / group name')}><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required maxLength={80} autoFocus /></Field>
            <Field label={t('المرحلة (اختياري)', 'Grade (optional)')}><input value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })} maxLength={60} /></Field>
            <div className="row end"><button type="button" className="btn" onClick={() => setCreating(false)}>{t('إلغاء', 'Cancel')}</button><button className="btn primary">{t('إنشاء', 'Create')}</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
