import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { ActivityCard, Stat } from '../components.jsx';
import { Empty, Spinner, useFetch, useToast } from '../ui.jsx';
import { TEMPLATES } from '../templates/meta.js';

export default function HomePage() {
  const { user, toggleFavorite } = useAuth();
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const toast = useToast();
  const [q, setQ] = useState('');
  const teacher = user && user.role !== 'student';
  const stats = useFetch(() => (user ? api.get('/stats/me') : api.get('/stats/public')), [user?.id]);
  const mine = useFetch(() => (teacher ? api.get('/activities/mine') : Promise.resolve([])), [user?.id]);
  const fav = useFetch(() => (user ? api.get('/activities/favorites') : Promise.resolve([])), [user?.id, user?.favorites?.length]);
  const pub = useFetch(() => api.get('/activities/public?sort=popular'), []);

  const onFav = async (a) => { try { await toggleFavorite(a.id); } catch (e) { toast(e.message, 'error'); } };
  const favs = new Set(user?.favorites || []);
  const s = stats.data;
  const popular = ['quiz', 'matching', 'memory', 'wheel', 'wordsearch', 'asterquiz', 'froggy', 'unscramble'].map((id) => TEMPLATES.find((x) => x.id === id));

  return (
    <div>
      <section className="hero">
        <div className="hero-text">
          <h1>{t('حوّل درسك إلى لعبة في دقائق', 'Turn your lesson into a game in minutes')}</h1>
          <p>{t('اختر قالبًا، اكتب أسئلتك، وشارك الرابط مع طلابك. تتبّع نتائجهم لحظة بلحظة.', 'Pick a template, add your content and share the link. Track results as they come in.')}</p>
          <form className="hero-search" onSubmit={(e) => { e.preventDefault(); nav(`/explore?q=${encodeURIComponent(q)}`); }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('ابحث عن نشاط جاهز…', 'Search ready-made activities…')} aria-label="search" />
            <button className="btn">{t('بحث', 'Search')}</button>
          </form>
          <div className="row">
            <Link className="btn primary big" to="/templates">＋ {t('إنشاء نشاط جديد', 'Create activity')}</Link>
            {teacher && <Link className="btn big" to="/my">{t('أنشطتي', 'My activities')}</Link>}
            <Link className="btn big" to="/explore">{t('استكشاف الأنشطة', 'Explore')}</Link>
            {user && <Link className="btn big" to="/classes">{t('المجموعات والصفوف', 'Classes')}</Link>}
          </div>
        </div>
        <div className="stickers" aria-hidden="true">
          {popular.slice(0, 6).map((m, i) => <span key={m.id} className={'sticker s' + i} style={{ '--c': m.color }}>{m.icon}</span>)}
        </div>
      </section>

      <section className="stats-row">
        {stats.loading ? <Spinner /> : !s ? null : user ? (
          user.role === 'student'
            ? <><Stat icon="🎯" value={s.attempts} label={t('محاولاتي', 'My attempts')} /><Stat icon="📈" value={`${s.avgPercent}%`} label={t('متوسط نتائجي', 'My average')} /></>
            : <><Stat icon="📚" value={s.activities} label={t('الأنشطة', 'Activities')} /><Stat icon="▶️" value={s.attempts} label={t('المشاركات', 'Attempts')} /><Stat icon="🧒" value={s.students} label={t('الطلاب', 'Students')} /><Stat icon="📈" value={`${s.avgPercent}%`} label={t('متوسط النتائج', 'Average score')} /></>
        ) : <><Stat icon="📚" value={s.activities} label={t('نشاط عام', 'Public activities')} /><Stat icon="▶️" value={s.plays} label={t('مشاركة', 'Plays')} /><Stat icon="🧩" value={TEMPLATES.length} label={t('قالب', 'Templates')} /></>}
      </section>

      <section>
        <div className="sec-head"><h2>{t('القوالب الأكثر استخدامًا', 'Popular templates')}</h2><Link to="/templates">{t('كل القوالب', 'All templates')}</Link></div>
        <div className="tile-row">
          {popular.map((m) => (
            <Link key={m.id} to={teacher ? `/editor/new?type=${m.id}` : '/templates'} className="tpl-mini" style={{ '--c': m.color }}>
              <span>{m.icon}</span><b>{lang === 'en' ? m.en : m.ar}</b>
            </Link>
          ))}
        </div>
      </section>

      {teacher && (
        <section>
          <div className="sec-head"><h2>{t('أنشأتها مؤخرًا', 'Recently created')}</h2><Link to="/my">{t('عرض الكل', 'View all')}</Link></div>
          {mine.loading ? <Spinner /> : mine.data?.length ? <div className="grid">{mine.data.slice(0, 4).map((a) => <ActivityCard key={a.id} a={a} showStatus fav={favs.has(a.id)} onFav={onFav} />)}</div>
            : <Empty icon="✨" title={t('لا توجد أنشطة بعد', 'No activities yet')} text={t('ابدأ بأول نشاط من مكتبة القوالب.', 'Start with your first activity from the template library.')}><Link className="btn primary" to="/templates">{t('إنشاء نشاط', 'Create')}</Link></Empty>}
        </section>
      )}

      {user && fav.data?.length > 0 && (
        <section>
          <div className="sec-head"><h2>⭐ {t('المفضلة', 'Favorites')}</h2></div>
          <div className="grid">{fav.data.slice(0, 4).map((a) => <ActivityCard key={a.id} a={a} fav onFav={onFav} />)}</div>
        </section>
      )}

      <section>
        <div className="sec-head"><h2>{t('أنشطة مقترحة', 'Suggested activities')}</h2><Link to="/explore">{t('المزيد', 'More')}</Link></div>
        {pub.loading ? <Spinner /> : <div className="grid">{(pub.data || []).filter((a) => a.ownerId !== user?.id).slice(0, 4).map((a) => <ActivityCard key={a.id} a={a} fav={favs.has(a.id)} onFav={user ? onFav : undefined} />)}</div>}
      </section>
    </div>
  );
}
