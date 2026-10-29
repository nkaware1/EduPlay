import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { useI18n } from './i18n.jsx';

export const Logo = () => (
  <Link to="/" className="logo" aria-label="لمعة">
    <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true"><rect x="2" y="2" width="36" height="36" rx="11" fill="var(--primary)" /><path d="M20 7l3.2 8.1L31 18l-7.8 2.9L20 29l-3.2-8.1L9 18l7.8-2.9z" fill="#FFC233" stroke="#1B1B3A" strokeWidth="1.6" strokeLinejoin="round" /></svg>
    <span>لمعة</span>
  </Link>
);

export default function Layout() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('lamaa_theme') || (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('lamaa_theme', theme); }, [theme]);
  useEffect(() => setOpen(false), [loc.pathname]);

  const links = [
    ['/', '🏠', t('الرئيسية', 'Home'), true],
    ['/templates', '🧩', t('القوالب', 'Templates'), true],
    ['/my', '📚', t('أنشطتي', 'My activities'), user && user.role !== 'student'],
    ['/explore', '🌍', t('استكشاف الأنشطة', 'Explore'), true],
    ['/classes', '👥', user?.role === 'student' ? t('صفوفي', 'My classes') : t('الصفوف والمجموعات', 'Classes'), !!user],
    ['/profile', '⚙️', t('الملف الشخصي', 'Profile'), !!user],
    ['/admin', '🛡️', t('لوحة المدير', 'Admin'), user?.role === 'admin'],
  ].filter((l) => l[3]);

  return (
    <div className="app">
      <aside className={'side' + (open ? ' open' : '')}>
        <Logo />
        <nav>
          {links.map(([to, icon, label]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}><span>{icon}</span>{label}</NavLink>)}
        </nav>
        {user && user.role !== 'student' && <Link to="/templates" className="btn primary side-cta">＋ {t('إنشاء نشاط جديد', 'New activity')}</Link>}
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className="main">
        <header className="top">
          <button className="icon-btn menu" onClick={() => setOpen(!open)} aria-label="menu">☰</button>
          <form className="search" onSubmit={(e) => { e.preventDefault(); nav(`/explore?q=${encodeURIComponent(q)}`); }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('ابحث عن أنشطة وقوالب…', 'Search activities and templates…')} aria-label="search" />
            <button aria-label="search">🔎</button>
          </form>
          <div className="top-actions">
            <Link className="btn small live-join" to="/join">🎮 {t('انضم برمز', 'Join with PIN')}</Link>
            <button className="icon-btn" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} title="Language">{lang === 'ar' ? 'EN' : 'ع'}</button>
            <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="theme" title={t('الوضع الداكن/الفاتح', 'Dark / light')}>{theme === 'dark' ? '☀️' : '🌙'}</button>
            {user ? (
              <>
                <Link to="/profile" className="me"><span className="avatar">{user.name.slice(0, 1)}</span><span className="me-name">{user.name}</span></Link>
                <button className="btn small" onClick={() => { logout(); nav('/'); }}>{t('خروج', 'Log out')}</button>
              </>
            ) : <Link className="btn primary small" to="/login">{t('دخول / تسجيل', 'Log in / Sign up')}</Link>}
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
