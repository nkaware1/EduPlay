import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { TemplateThumb } from '../components.jsx';
import { ErrorBox, Spinner, useConfirm, useFetch, useToast } from '../ui.jsx';
import { TEMPLATE_MAP } from '../templates/meta.js';
import { fmtDate } from '../lib/text.js';

export default function ActivityPage() {
  const { id } = useParams();
  const { user, toggleFavorite } = useAuth();
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { data: a, loading, error, setData } = useFetch(() => api.get('/activities/' + id), [id]);
  const modes = useFetch(() => api.get('/live/modes'), []);
  const [qr, setQr] = useState('');
  const link = `${window.location.origin}/play/${id}`;
  const m = a && TEMPLATE_MAP[a.type];

  useEffect(() => { if (a?.published) QRCode.toDataURL(link, { margin: 1, width: 240 }).then(setQr).catch(() => {}); }, [a?.published, link]);

  const setFlags = async (patch) => {
    try { const r = await api.put('/activities/' + id, patch); setData((d) => ({ ...d, published: r.published, isPublic: r.isPublic })); toast(t('تم التحديث', 'Updated')); } catch (e) { toast(e.message, 'error'); }
  };
  const copyLink = async () => { try { await navigator.clipboard.writeText(link); toast(t('تم نسخ الرابط', 'Link copied')); } catch { toast(link); } };
  const dup = async () => { try { const c = await api.post(`/activities/${id}/duplicate`); toast(t('تم النسخ', 'Copied')); nav('/editor/' + c.id); } catch (e) { toast(e.message, 'error'); } };
  const [exporting, setExporting] = useState('');
  const doExport = async (format) => {
    setExporting(format);
    try {
      const res = await api.raw(`/export/${id}?format=${format}`);
      const cd = res.headers.get('Content-Disposition') || '';
      const name = (cd.match(/filename="([^"]+)"/) || [])[1] || `activity-${format}`;
      const url = URL.createObjectURL(await res.blob());
      const el = document.createElement('a'); el.href = url; el.download = name; el.click(); URL.revokeObjectURL(url);
      toast(t('تم تنزيل الملف', 'Downloaded'));
    } catch (e) { toast(e.message, 'error'); } finally { setExporting(''); }
  };
  const del = async () => {
    if (!(await confirm({ text: t('حذف هذا النشاط نهائيًا مع نتائجه؟', 'Delete this activity and its results?'), ok: t('حذف', 'Delete') }))) return;
    try { await api.del('/activities/' + id); toast(t('تم الحذف', 'Deleted')); nav('/my'); } catch (e) { toast(e.message, 'error'); }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;
  const teacher = user && user.role !== 'student';
  const fav = user?.favorites?.includes(a.id);

  return (
    <div className="detail">
      <div className="detail-main panel">
        <div className="detail-head">
          <TemplateThumb id={a.type} size="lg" />
          <div>
            <h1>{a.title}</h1>
            <p className="muted">{lang === 'en' ? m?.en : m?.ar}{a.subject ? ` · ${a.subject}` : ''}{a.grade ? ` · ${a.grade}` : ''}{a.topic ? ` · ${a.topic}` : ''}</p>
            <p className="muted">{t('بواسطة', 'By')} {a.ownerName} · {fmtDate(a.updatedAt, lang)} · ▶ {a.plays}</p>
          </div>
        </div>
        {a.description && <p>{a.description}</p>}
        <div className="row">
          <Link className="btn primary big" to={`/play/${a.id}`}>▶ {t('تشغيل', 'Play')}</Link>
          {a.canEdit && <Link className="btn big" to={`/editor/${a.id}`}>✏️ {t('تعديل', 'Edit')}</Link>}
          {a.canEdit && <Link className="btn big" to={`/activity/${a.id}/results`}>📊 {t('النتائج', 'Results')}</Link>}
          {teacher && a.published && modes.data?.[a.type] && (a.canEdit || a.isPublic) && <Link className="btn big live-btn" to={`/live/host/${a.id}`}>🔴 {t('لعب مباشر مع الطلاب', 'Host a live game')}</Link>}
          {user && <button className="btn big" onClick={async () => { try { await toggleFavorite(a.id); } catch (e) { toast(e.message, 'error'); } }}>{fav ? '★' : '☆'} {t('المفضلة', 'Favorite')}</button>}
          {teacher && (a.canEdit || a.isPublic) && <button className="btn big" onClick={dup}>{t('نسخ', 'Copy')}</button>}
          {a.canEdit && <button className="btn big danger-soft" onClick={del}>{t('حذف', 'Delete')}</button>}
        </div>
      </div>

      <aside className="panel share">
        {(a.canEdit || (a.published && a.isPublic)) && (
          <div className="export-box">
            <h3>{t('تصدير النشاط', 'Export')}</h3>
            <button className="btn" disabled={!!exporting} onClick={() => doExport('html')}>🌐 {t('صفحة ويب مستقلة (HTML)', 'Standalone web page (HTML)')}</button>
            <button className="btn" disabled={!!exporting} onClick={() => doExport('desktop')}>🖥️ {t('حزمة تطبيق سطح المكتب (EXE)', 'Desktop app pack (EXE)')}</button>
            <button className="btn" disabled={!!exporting} onClick={() => doExport('android')}>📱 {t('حزمة تطبيق أندرويد (APK)', 'Android app pack (APK)')}</button>
            <small className="muted">{t('ملف HTML جاهز للفتح مباشرة. الحزمتان مشروعان يُبنى منهما EXE أو APK: على جهازك، أو تلقائيًا بوضع الملف في مجلد exports/ في مستودع GitHub (التعليمات داخل الحزمة).', 'The HTML opens as-is. The packs build into an EXE or APK on your machine, or automatically by dropping the zip into exports/ in a GitHub repo (see README inside).')}</small>
          </div>
        )}
        <h3>{t('المشاركة', 'Sharing')}</h3>
        {a.published ? (
          <>
            {qr && <img className="qr" src={qr} alt="QR" />}
            <div className="copy-row"><input readOnly dir="ltr" value={link} onFocus={(e) => e.target.select()} /><button className="btn small" onClick={copyLink}>{t('نسخ', 'Copy')}</button></div>
            {a.settings?.mode === 'homework' && <p className="chip warm">📚 {t('وضع الواجب المنزلي', 'Homework mode')}</p>}
          </>
        ) : <p className="muted">{t('هذا النشاط مسودة. انشره ليحصل على رابط ورمز QR.', 'This is a draft. Publish it to get a link and QR code.')}</p>}
        {a.canEdit && (
          <div className="stack">
            <label className="check"><input type="checkbox" checked={a.published} onChange={(e) => setFlags({ published: e.target.checked })} /> {t('منشور (متاح لمن لديه الرابط)', 'Published (anyone with the link)')}</label>
            <label className="check"><input type="checkbox" checked={a.isPublic} disabled={!a.published} onChange={(e) => setFlags({ isPublic: e.target.checked })} /> {t('إظهاره في «استكشاف الأنشطة»', 'List in Explore')}</label>
          </div>
        )}
      </aside>
    </div>
  );
}
