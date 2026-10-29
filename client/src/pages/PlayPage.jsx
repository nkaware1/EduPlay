import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import GameShell from '../games/GameShell.jsx';
import { Logo } from '../Layout.jsx';
import { ErrorBox, Spinner, useFetch } from '../ui.jsx';

export default function PlayPage() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const { user } = useAuth();
  const { t } = useI18n();
  const { data, loading, error } = useFetch(() => api.get('/activities/' + id), [id]);
  const preview = sp.get('preview') === '1' && data?.canEdit;
  document.documentElement.dataset.theme = localStorage.getItem('lamaa_theme') || 'light';

  return (
    <div className="play-page">
      <header className="play-top">
        <Logo />
        <div className="row">
          {data && <Link className="btn small" to={`/activity/${id}`}>{t('تفاصيل النشاط', 'Details')}</Link>}
          <Link className="btn small ghost" to={user ? '/' : '/explore'}>{t('خروج', 'Exit')}</Link>
        </div>
      </header>
      {loading && <Spinner label={t('جارٍ التحميل…', 'Loading…')} />}
      {error && <div className="center-box"><ErrorBox error={error} /></div>}
      {data && <GameShell key={data.id + (data.updatedAt || '')} activity={data} preview={preview} />}
    </div>
  );
}
