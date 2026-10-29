import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { ActivityCard, PageHead, TemplateThumb } from '../components.jsx';
import { Empty, ErrorBox, Modal, Spinner, useConfirm, useFetch, useToast } from '../ui.jsx';
import { TEMPLATES, TEMPLATE_MAP } from '../templates/meta.js';
import { fmtDate } from '../lib/text.js';

export default function MyActivitiesPage() {
  const { user, toggleFavorite } = useAuth();
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload, setData } = useFetch(() => api.get('/activities/mine'), []);
  const [view, setView] = useState('grid');
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [subject, setSubject] = useState('');
  const [folder, setFolder] = useState('');
  const [onlyFav, setOnlyFav] = useState(false);
  const [sort, setSort] = useState('updated');
  const [moving, setMoving] = useState(null);
  const [folderName, setFolderName] = useState('');
  const favs = new Set(user.favorites || []);

  const folders = useMemo(() => [...new Set((data || []).map((a) => a.folder).filter(Boolean))], [data]);
  const subjects = useMemo(() => [...new Set((data || []).map((a) => a.subject).filter(Boolean))], [data]);
  const list = (data || []).filter((a) =>
    (!q || [a.title, a.subject, a.topic].join(' ').toLowerCase().includes(q.toLowerCase())) && (!type || a.type === type) && (!subject || a.subject === subject) &&
    (!folder || (folder === '__none' ? !a.folder : a.folder === folder)) && (!onlyFav || favs.has(a.id)))
    .sort((a, b) => (sort === 'created' ? b.createdAt.localeCompare(a.createdAt) : sort === 'title' ? a.title.localeCompare(b.title) : b.updatedAt.localeCompare(a.updatedAt)));

  const act = {
    dup: async (a) => { try { const c = await api.post(`/activities/${a.id}/duplicate`); toast(t('تم إنشاء نسخة', 'Copy created')); setData((d) => [c, ...d]); reload(); } catch (e) { toast(e.message, 'error'); } },
    del: async (a) => {
      if (!(await confirm({ text: t(`حذف «${a.title}» نهائيًا مع نتائجه؟`, `Delete “${a.title}” and its results permanently?`), ok: t('حذف', 'Delete') }))) return;
      try { await api.del('/activities/' + a.id); setData((d) => d.filter((x) => x.id !== a.id)); toast(t('تم الحذف', 'Deleted')); } catch (e) { toast(e.message, 'error'); }
    },
    fav: async (a) => { try { await toggleFavorite(a.id); } catch (e) { toast(e.message, 'error'); } },
    move: async () => {
      try { await api.put('/activities/' + moving.id, { folder: folderName }); setMoving(null); reload(); toast(t('تم النقل', 'Moved')); } catch (e) { toast(e.message, 'error'); }
    },
  };
  const share = (a) => nav('/activity/' + a.id);

  const actions = [
    { label: t('تعديل', 'Edit'), to: null, onClick: (a) => nav('/editor/' + a.id) },
    { label: t('مشاركة', 'Share'), onClick: share },
    { label: t('نسخ', 'Duplicate'), onClick: act.dup },
    { label: t('نقل', 'Move'), onClick: (a) => { setMoving(a); setFolderName(a.folder || ''); } },
    { label: t('حذف', 'Delete'), danger: true, onClick: act.del },
  ];

  return (
    <div>
      <PageHead title={t('أنشطتي', 'My activities')} sub={data ? `${data.length} ${t('نشاط', 'activities')}` : ''}>
        <Link className="btn primary" to="/templates">＋ {t('نشاط جديد', 'New activity')}</Link>
      </PageHead>
      <div className="filters">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('بحث بالاسم…', 'Search by name…')} aria-label="search" />
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="template"><option value="">{t('كل القوالب', 'All templates')}</option>{TEMPLATES.map((m) => <option key={m.id} value={m.id}>{lang === 'en' ? m.en : m.ar}</option>)}</select>
        <select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="subject"><option value="">{t('كل المواد', 'All subjects')}</option>{subjects.map((s) => <option key={s}>{s}</option>)}</select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="sort"><option value="updated">{t('آخر تعديل', 'Last modified')}</option><option value="created">{t('تاريخ الإنشاء', 'Created')}</option><option value="title">{t('الاسم', 'Name')}</option></select>
        <label className="check"><input type="checkbox" checked={onlyFav} onChange={(e) => setOnlyFav(e.target.checked)} /> ⭐ {t('المفضلة', 'Favorites')}</label>
        <div className="seg"><button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')} aria-label="grid">▦</button><button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} aria-label="list">☰</button></div>
      </div>
      <div className="chips-row">
        <button className={'chip-btn' + (!folder ? ' on' : '')} onClick={() => setFolder('')}>{t('الكل', 'All')}</button>
        {folders.map((f) => <button key={f} className={'chip-btn' + (folder === f ? ' on' : '')} onClick={() => setFolder(f)}>📁 {f}</button>)}
        {folders.length > 0 && <button className={'chip-btn' + (folder === '__none' ? ' on' : '')} onClick={() => setFolder('__none')}>{t('بدون مجلد', 'No folder')}</button>}
      </div>

      {loading && <Spinner />}
      {error && <ErrorBox error={error} retry={reload} />}
      {data && !list.length && <Empty icon="📭" title={data.length ? t('لا توجد نتائج مطابقة', 'No matches') : t('لم تنشئ أي نشاط بعد', 'No activities yet')}>{!data.length && <Link className="btn primary" to="/templates">{t('اختر قالبًا', 'Choose a template')}</Link>}</Empty>}
      {view === 'grid' ? <div className="grid">{list.map((a) => <ActivityCard key={a.id} a={a} showStatus fav={favs.has(a.id)} onFav={act.fav} actions={actions} />)}</div> : (
        <div className="table-wrap"><table><thead><tr><th /><th>{t('العنوان', 'Title')}</th><th>{t('القالب', 'Template')}</th><th>{t('الحالة', 'Status')}</th><th>▶</th><th>{t('آخر تعديل', 'Updated')}</th><th /></tr></thead>
          <tbody>{list.map((a) => (
            <tr key={a.id}>
              <td><TemplateThumb id={a.type} size="sm" /></td>
              <td><Link to={'/activity/' + a.id}>{a.title}</Link>{a.folder && <small className="muted"> 📁 {a.folder}</small>}</td>
              <td>{lang === 'en' ? TEMPLATE_MAP[a.type]?.en : TEMPLATE_MAP[a.type]?.ar}</td>
              <td>{a.published ? (a.isPublic ? t('عام', 'Public') : t('برابط', 'Link')) : t('مسودة', 'Draft')}</td>
              <td>{a.plays}</td><td>{fmtDate(a.updatedAt, lang)}</td>
              <td className="row">{actions.map((x, i) => <button key={i} className={'btn small' + (x.danger ? ' danger-soft' : '')} onClick={() => x.onClick(a)}>{x.label}</button>)}</td>
            </tr>))}</tbody></table></div>
      )}

      {moving && (
        <Modal title={t('نقل إلى مجلد', 'Move to folder')} onClose={() => setMoving(null)} small>
          <input list="folders" value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder={t('اسم المجلد (اتركه فارغًا لإزالة المجلد)', 'Folder name (empty = no folder)')} maxLength={60} autoFocus />
          <datalist id="folders">{folders.map((f) => <option key={f} value={f} />)}</datalist>
          <div className="row end"><button className="btn" onClick={() => setMoving(null)}>{t('إلغاء', 'Cancel')}</button><button className="btn primary" onClick={act.move}>{t('نقل', 'Move')}</button></div>
        </Modal>
      )}
    </div>
  );
}
