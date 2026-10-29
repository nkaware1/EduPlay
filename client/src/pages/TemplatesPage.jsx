import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { PageHead } from '../components.jsx';
import { useToast } from '../ui.jsx';
import { CATEGORIES, TEMPLATES } from '../templates/meta.js';

export default function TemplatesPage() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const toast = useToast();
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const list = TEMPLATES.filter((m) => (cat === 'all' || m.cat === cat) && (!q || [m.ar, m.en, m.descAr, m.descEn].join(' ').toLowerCase().includes(q.toLowerCase())));

  const use = (m) => {
    if (!user) return nav(`/login?next=${encodeURIComponent('/editor/new?type=' + m.id)}`);
    if (user.role === 'student') return toast(t('حسابات الطلاب لا تنشئ أنشطة. سجّل كمعلم لإنشاء الأنشطة.', 'Student accounts cannot create activities.'), 'error');
    nav(`/editor/new?type=${m.id}`);
  };

  return (
    <div>
      <PageHead title={t('مكتبة القوالب', 'Template library')} sub={t('اختر القالب المناسب لدرسك. لكل قالب آلية لعب مختلفة.', 'Pick a template. Each one plays differently.')} />
      <div className="filters">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('ابحث في القوالب…', 'Search templates…')} aria-label="search templates" />
        <div className="chips-row">
          {[{ id: 'all', ar: 'الكل', en: 'All' }, ...CATEGORIES].map((c) => <button key={c.id} className={'chip-btn' + (cat === c.id ? ' on' : '')} onClick={() => setCat(c.id)}>{lang === 'en' ? c.en : c.ar}</button>)}
        </div>
      </div>
      <div className="grid tpl-grid">
        {list.map((m) => (
          <article key={m.id} className="tpl-card" style={{ '--c': m.color }}>
            <div className="tpl-art"><span>{m.icon}</span></div>
            <div className="tpl-body">
              <h3>{lang === 'en' ? m.en : m.ar}</h3>
              <p>{lang === 'en' ? m.descEn : m.descAr}</p>
              {!m.graded && <small className="muted">{t('نشاط غير مُقيَّم (بدون درجات)', 'Ungraded activity')}</small>}
            </div>
            <button className="btn primary" onClick={() => use(m)}>{t('استخدم القالب', 'Use template')}</button>
          </article>
        ))}
      </div>
      {!list.length && <p className="muted center-text">{t('لا توجد قوالب مطابقة.', 'No matching templates.')}</p>}
    </div>
  );
}
