import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { useI18n } from './i18n.jsx';
import { Spinner } from './ui.jsx';
import { TEMPLATE_MAP } from './templates/meta.js';
import { fmtDate } from './lib/text.js';

export function RequireAuth({ roles, children }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  const { t } = useI18n();
  if (!ready) return <Spinner label={t('جارٍ التحميل…', 'Loading…')} />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export function TemplateThumb({ id, size = 'md' }) {
  const m = TEMPLATE_MAP[id];
  return <div className={'thumb-art ' + size} style={{ '--c': m?.color || '#6C4CF1' }}><span>{m?.icon || '🎲'}</span></div>;
}

const DIFF = { easy: ['سهل', 'Easy'], medium: ['متوسط', 'Medium'], hard: ['صعب', 'Hard'] };

// بطاقة نشاط: actions = [{label, onClick, danger, to}]
export function ActivityCard({ a, actions = [], fav, onFav, showStatus }) {
  const { t, lang } = useI18n();
  const m = TEMPLATE_MAP[a.type];
  return (
    <article className="act-card" style={{ '--c': a.color || m?.color || '#6C4CF1' }}>
      <Link to={`/activity/${a.id}`} className="act-top" aria-label={a.title}>
        <span className="act-icon">{m?.icon}</span>
        {showStatus && <span className={'badge ' + (a.published ? (a.isPublic ? 'pub' : 'link') : 'draft')}>{a.published ? (a.isPublic ? t('عام', 'Public') : t('برابط', 'Link only')) : t('مسودة', 'Draft')}</span>}
      </Link>
      <div className="act-body">
        <h3 title={a.title}><Link to={`/activity/${a.id}`}>{a.title}</Link></h3>
        <p className="act-meta">{lang === 'en' ? m?.en : m?.ar}{a.subject ? ` · ${a.subject}` : ''}{a.grade ? ` · ${a.grade}` : ''}</p>
        <p className="act-meta dim">
          {a.items} {t('عنصر', 'items')} · ▶ {a.plays} · {t(...(DIFF[a.difficulty] || DIFF.medium))}
          {a.folder ? ` · 📁 ${a.folder}` : ''}
        </p>
        {a.ownerName && <p className="act-meta dim">{a.ownerName} · {fmtDate(a.updatedAt, lang)}</p>}
      </div>
      <div className="act-actions">
        <Link className="btn small primary" to={`/play/${a.id}`}>▶ {t('تشغيل', 'Play')}</Link>
        {onFav && <button className={'icon-btn fav' + (fav ? ' on' : '')} onClick={() => onFav(a)} aria-label="favorite" title={t('المفضلة', 'Favorite')}>{fav ? '★' : '☆'}</button>}
        {actions.map((x, i) => x.to ? <Link key={i} className="btn small" to={x.to}>{x.label}</Link> : <button key={i} className={'btn small' + (x.danger ? ' danger-soft' : '')} onClick={() => x.onClick(a)}>{x.label}</button>)}
      </div>
    </article>
  );
}

export const PageHead = ({ title, sub, children }) => (
  <div className="page-head"><div><h1>{title}</h1>{sub && <p className="muted">{sub}</p>}</div><div className="row">{children}</div></div>
);

export const Stat = ({ icon, value, label }) => (
  <div className="stat"><span className="stat-icon">{icon}</span><div><b>{value}</b><small>{label}</small></div></div>
);
