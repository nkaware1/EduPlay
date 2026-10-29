import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { PageHead } from '../components.jsx';
import { Empty, Spinner, useFetch, useToast } from '../ui.jsx';
import { Field } from '../templates/editorKit.jsx';
import { fmtDate } from '../lib/text.js';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { t, lang } = useI18n();
  const toast = useToast();
  const [f, setF] = useState({ name: user.name, school: user.school || '', currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState(false);
  const results = useFetch(() => (user.role === 'student' ? api.get('/results/mine') : Promise.resolve([])), [user.id]);
  const roleLabel = { teacher: t('معلم', 'Teacher'), student: t('طالب', 'Student'), admin: t('مدير المنصة', 'Admin') }[user.role];

  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const body = { name: f.name, school: f.school };
      if (f.newPassword) { body.currentPassword = f.currentPassword; body.newPassword = f.newPassword; }
      const r = await api.put('/auth/me', body);
      setUser(r.user); setF({ ...f, currentPassword: '', newPassword: '' });
      toast(t('تم حفظ التغييرات', 'Saved'));
    } catch (x) { toast(x.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHead title={t('الملف الشخصي والإعدادات', 'Profile & settings')} sub={`${user.email} · ${roleLabel}`} />
      <form className="panel form-narrow" onSubmit={save}>
        <Field label={t('الاسم', 'Name')}><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required maxLength={80} /></Field>
        {user.role !== 'student' && <Field label={t('المدرسة / الجهة', 'School / organization')}><input value={f.school} onChange={(e) => setF({ ...f, school: e.target.value })} maxLength={120} /></Field>}
        <hr />
        <Field label={t('كلمة المرور الحالية', 'Current password')}><input type="password" dir="ltr" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} autoComplete="current-password" /></Field>
        <Field label={t('كلمة مرور جديدة (اتركها فارغة دون تغيير)', 'New password (leave empty to keep)')}><input type="password" dir="ltr" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} minLength={6} autoComplete="new-password" /></Field>
        <button className="btn primary" disabled={busy}>{t('حفظ التغييرات', 'Save changes')}</button>
      </form>

      {user.role === 'student' && (
        <section>
          <div className="sec-head"><h2>{t('نتائجي', 'My results')}</h2></div>
          {results.loading ? <Spinner /> : !results.data?.length ? <Empty icon="🎯" title={t('لا توجد نتائج بعد', 'No results yet')}><Link className="btn primary" to="/explore">{t('ابدأ بنشاط', 'Play an activity')}</Link></Empty> : (
            <div className="table-wrap"><table><thead><tr><th>{t('النشاط', 'Activity')}</th><th>{t('الدرجة', 'Score')}</th><th>%</th><th>{t('التاريخ', 'Date')}</th></tr></thead>
              <tbody>{results.data.map((r) => <tr key={r.id}><td><Link to={`/activity/${r.activityId}`}>{r.activityTitle}</Link></td><td>{r.score}/{r.total}</td><td>{r.percent}%</td><td>{fmtDate(r.createdAt, lang)}</td></tr>)}</tbody></table></div>
          )}
        </section>
      )}
    </div>
  );
}
