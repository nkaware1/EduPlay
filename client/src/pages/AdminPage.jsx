import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { PageHead, Stat } from '../components.jsx';
import { ErrorBox, Spinner, useConfirm, useFetch, useToast } from '../ui.jsx';
import { TEMPLATE_MAP } from '../templates/meta.js';
import { fmtDate } from '../lib/text.js';

export default function AdminPage() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState('users');
  const stats = useFetch(() => api.get('/admin/stats'), []);
  const users = useFetch(() => api.get('/admin/users'), []);
  const acts = useFetch(() => api.get('/admin/activities'), []);

  const setRole = async (u, role) => {
    try { const r = await api.put('/admin/users/' + u.id, { role }); users.setData((d) => d.map((x) => (x.id === u.id ? r : x))); toast(t('تم تحديث الدور', 'Role updated')); } catch (e) { toast(e.message, 'error'); }
  };
  const delUser = async (u) => {
    if (!(await confirm({ text: t(`حذف المستخدم «${u.name}» مع أنشطته وصفوفه؟`, `Delete “${u.name}” with all their activities and classes?`), ok: t('حذف', 'Delete') }))) return;
    try { await api.del('/admin/users/' + u.id); users.setData((d) => d.filter((x) => x.id !== u.id)); stats.reload(); acts.reload(); } catch (e) { toast(e.message, 'error'); }
  };
  const delAct = async (a) => {
    if (!(await confirm({ text: t(`حذف النشاط «${a.title}»؟`, `Delete “${a.title}”?`), ok: t('حذف', 'Delete') }))) return;
    try { await api.del('/activities/' + a.id); acts.setData((d) => d.filter((x) => x.id !== a.id)); stats.reload(); } catch (e) { toast(e.message, 'error'); }
  };
  const s = stats.data;

  return (
    <div>
      <PageHead title={t('لوحة تحكم المدير', 'Admin dashboard')} sub={s ? `${t('قاعدة البيانات', 'Database')}: ${s.driver}` : ''} />
      {s && <div className="stats-row"><Stat icon="👥" value={s.users} label={t('المستخدمون', 'Users')} /><Stat icon="📚" value={s.activities} label={t('الأنشطة', 'Activities')} /><Stat icon="🌐" value={s.published} label={t('المنشورة', 'Published')} /><Stat icon="▶️" value={s.results} label={t('المحاولات', 'Attempts')} /><Stat icon="🏫" value={s.classes} label={t('الصفوف', 'Classes')} /></div>}
      <div className="tabs"><button className={tab === 'users' ? 'on' : ''} onClick={() => setTab('users')}>{t('المستخدمون', 'Users')}</button><button className={tab === 'acts' ? 'on' : ''} onClick={() => setTab('acts')}>{t('الأنشطة', 'Activities')}</button></div>
      {tab === 'users' && (users.loading ? <Spinner /> : users.error ? <ErrorBox error={users.error} /> : (
        <div className="table-wrap"><table><thead><tr><th>{t('الاسم', 'Name')}</th><th>{t('البريد', 'Email')}</th><th>{t('الدور', 'Role')}</th><th>{t('التسجيل', 'Joined')}</th><th /></tr></thead>
          <tbody>{users.data.map((u) => (
            <tr key={u.id}><td>{u.name}</td><td dir="ltr">{u.email}</td>
              <td><select value={u.role} disabled={u.id === user.id} onChange={(e) => setRole(u, e.target.value)} aria-label="role"><option value="teacher">{t('معلم', 'Teacher')}</option><option value="student">{t('طالب', 'Student')}</option><option value="admin">{t('مدير', 'Admin')}</option></select></td>
              <td>{fmtDate(u.createdAt, lang)}</td><td>{u.id !== user.id && <button className="btn small danger-soft" onClick={() => delUser(u)}>{t('حذف', 'Delete')}</button>}</td></tr>))}</tbody></table></div>
      ))}
      {tab === 'acts' && (acts.loading ? <Spinner /> : acts.error ? <ErrorBox error={acts.error} /> : (
        <div className="table-wrap"><table><thead><tr><th>{t('العنوان', 'Title')}</th><th>{t('القالب', 'Template')}</th><th>{t('المعلم', 'Owner')}</th><th>{t('الحالة', 'Status')}</th><th>▶</th><th /></tr></thead>
          <tbody>{acts.data.map((a) => (
            <tr key={a.id}><td><Link to={'/activity/' + a.id}>{a.title}</Link></td><td>{lang === 'en' ? TEMPLATE_MAP[a.type]?.en : TEMPLATE_MAP[a.type]?.ar}</td><td>{a.ownerName}</td>
              <td>{a.published ? (a.isPublic ? t('عام', 'Public') : t('برابط', 'Link')) : t('مسودة', 'Draft')}</td><td>{a.plays}</td>
              <td><button className="btn small danger-soft" onClick={() => delAct(a)}>{t('حذف', 'Delete')}</button></td></tr>))}</tbody></table></div>
      ))}
    </div>
  );
}
