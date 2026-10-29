import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';
import { PageHead, Stat } from '../components.jsx';
import { Empty, ErrorBox, Spinner, useFetch, useToast } from '../ui.jsx';
import { fmtDate, fmtTime } from '../lib/text.js';

export default function ResultsPage() {
  const { id } = useParams();
  const { t, lang } = useI18n();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => api.get(`/activities/${id}/results`), [id]);

  const stats = useMemo(() => {
    const r = data?.results || [];
    if (!r.length) return null;
    const best = {};
    r.forEach((x) => { const k = x.userId || x.studentName.toLowerCase(); best[k] = Math.max(best[k] ?? 0, x.percent); });
    return {
      attempts: r.length, students: Object.keys(best).length,
      avg: Math.round(r.reduce((n, x) => n + x.percent, 0) / r.length),
      top: Math.max(...r.map((x) => x.percent)),
      time: Math.round(r.reduce((n, x) => n + x.durationSec, 0) / r.length),
      pass: Math.round((r.filter((x) => x.percent >= 50).length / r.length) * 100),
    };
  }, [data]);

  const exportCsv = async () => {
    try {
      const res = await api.raw(`/activities/${id}/results.csv`);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a'); a.href = url; a.download = 'results.csv'; a.click(); URL.revokeObjectURL(url);
    } catch (e) { toast(e.message, 'error'); }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} retry={reload} />;
  return (
    <div>
      <PageHead title={`${t('نتائج', 'Results')}: ${data.activity.title}`} sub={t('هذه الصفحة تظهر لصاحب النشاط فقط.', 'Only the activity owner can see this page.')}>
        <Link className="btn" to={`/activity/${id}`}>{t('عودة', 'Back')}</Link>
        <button className="btn primary" onClick={exportCsv} disabled={!data.results.length}>⬇ {t('تصدير CSV', 'Export CSV')}</button>
      </PageHead>
      {!stats ? <Empty icon="📊" title={t('لا توجد نتائج بعد', 'No results yet')} text={t('شارك رابط النشاط مع طلابك لتظهر نتائجهم هنا.', 'Share the link with students to see their results here.')} /> : (
        <>
          <div className="stats-row">
            <Stat icon="▶️" value={stats.attempts} label={t('المحاولات', 'Attempts')} />
            <Stat icon="🧒" value={stats.students} label={t('الطلاب', 'Students')} />
            <Stat icon="📈" value={`${stats.avg}%`} label={t('المتوسط', 'Average')} />
            <Stat icon="🏆" value={`${stats.top}%`} label={t('أعلى نسبة', 'Top score')} />
            <Stat icon="✅" value={`${stats.pass}%`} label={t('نسبة النجاح (≥50%)', 'Pass rate (≥50%)')} />
            <Stat icon="⏱" value={fmtTime(stats.time)} label={t('متوسط الزمن', 'Avg. time')} />
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>{t('الاسم', 'Name')}</th><th>{t('الدرجة', 'Score')}</th><th>{t('النسبة', 'Percent')}</th><th>{t('الزمن', 'Time')}</th><th>{t('التاريخ', 'Date')}</th></tr></thead>
              <tbody>{data.results.map((r) => (
                <tr key={r.id}><td>{r.studentName}{r.userId && <small className="muted"> ✓</small>}</td><td>{r.score}/{r.total}</td>
                  <td><div className="bar"><div style={{ width: r.percent + '%' }} className={r.percent >= 50 ? 'ok' : 'bad'} /><span>{r.percent}%</span></div></td>
                  <td>{fmtTime(r.durationSec)}</td><td>{fmtDate(r.createdAt, lang)}</td></tr>))}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
