import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { ActivityCard, PageHead } from '../components.jsx';
import { Empty, ErrorBox, Spinner, useDebounced, useFetch, useToast } from '../ui.jsx';
import { TEMPLATES } from '../templates/meta.js';

export default function ExplorePage() {
  const [sp, setSp] = useSearchParams();
  const { user, toggleFavorite } = useAuth();
  const { t, lang } = useI18n();
  const toast = useToast();
  const [q, setQ] = useState(sp.get('q') || '');
  const [type, setType] = useState('');
  const [subject, setSubject] = useState('');
  const [sort, setSort] = useState('recent');
  const dq = useDebounced(q, 350);
  const dsub = useDebounced(subject, 350);
  useEffect(() => { setQ(sp.get('q') || ''); }, [sp]);

  const { data, loading, error, reload } = useFetch(() => api.get(`/activities/public?q=${encodeURIComponent(dq)}&type=${type}&subject=${encodeURIComponent(dsub)}&sort=${sort}`), [dq, type, dsub, sort]);
  const favs = new Set(user?.favorites || []);
  const onFav = async (a) => { try { await toggleFavorite(a.id); } catch (e) { toast(e.message, 'error'); } };
  const canCopy = user && user.role !== 'student';
  const copy = async (a) => {
    try { const c = await api.post(`/activities/${a.id}/duplicate`); toast(t('تم نسخ النشاط إلى حسابك', 'Copied to your account')); window.location.assign('/editor/' + c.id); } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div>
      <PageHead title={t('استكشاف الأنشطة', 'Explore activities')} sub={t('أنشطة عامة شاركها معلمون. شغّلها أو انسخها وعدّلها.', 'Public activities shared by teachers. Play them or copy and edit.')} />
      <div className="filters">
        <input value={q} onChange={(e) => { setQ(e.target.value); setSp(e.target.value ? { q: e.target.value } : {}); }} placeholder={t('بحث بالعنوان أو الموضوع…', 'Search by title or topic…')} aria-label="search" />
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="template"><option value="">{t('كل القوالب', 'All templates')}</option>{TEMPLATES.map((m) => <option key={m.id} value={m.id}>{lang === 'en' ? m.en : m.ar}</option>)}</select>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('المادة', 'Subject')} aria-label="subject" />
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="sort"><option value="recent">{t('الأحدث', 'Newest')}</option><option value="popular">{t('الأكثر لعبًا', 'Most played')}</option></select>
      </div>
      {loading && <Spinner />}
      {error && <ErrorBox error={error} retry={reload} />}
      {data && !data.length && <Empty icon="🔎" title={t('لا توجد نتائج', 'No results')} text={t('جرّب كلمات بحث أخرى أو أزل التصفية.', 'Try other keywords or clear the filters.')} />}
      {data && <div className="grid">{data.map((a) => <ActivityCard key={a.id} a={a} fav={favs.has(a.id)} onFav={user ? onFav : undefined} actions={canCopy ? [{ label: t('نسخ', 'Copy'), onClick: copy }] : []} />)}</div>}
    </div>
  );
}
