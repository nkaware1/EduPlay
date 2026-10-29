import { useState } from 'react';
import { api } from '../api.js';
import { useT } from '../i18n.jsx';
import { useToast } from '../ui.jsx';

export const Field = ({ label, hint, children, className = '' }) => (
  <label className={'field ' + className}>
    {label && <span>{label}</span>}
    {children}
    {hint && <small className="muted">{hint}</small>}
  </label>
);

// قائمة عناصر قابلة للإضافة والحذف وإعادة الترتيب
export function ListEditor({ items, setItems, newItem, render, addLabel, min = 1, title }) {
  const t = useT();
  const upd = (i, patch) => setItems(items.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const a = [...items]; [a[i], a[j]] = [a[j], a[i]]; setItems(a);
  };
  return (
    <div className="list-editor">
      {items.map((it, i) => (
        <div className="item-card" key={i}>
          <div className="item-head">
            <b>{title || t('عنصر', 'Item')} {i + 1}</b>
            <span className="row">
              <button className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="up">▲</button>
              <button className="icon-btn" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="down">▼</button>
              <button className="icon-btn danger" onClick={() => setItems(items.filter((_, k) => k !== i))} disabled={items.length <= min} aria-label="delete">🗑</button>
            </span>
          </div>
          {render(it, (patch) => upd(i, patch), i)}
        </div>
      ))}
      <button className="btn add" onClick={() => setItems([...items, newItem()])}>＋ {addLabel || t('إضافة', 'Add')}</button>
    </div>
  );
}

// سطر لكل عنصر (نص متعدد الأسطر ↔ مصفوفة نصوص)
export function LinesField({ value, onChange, rows = 5, placeholder }) {
  const [text, setText] = useState((value || []).join('\n'));
  return (
    <textarea rows={rows} value={text} placeholder={placeholder}
      onChange={(e) => { setText(e.target.value); onChange(e.target.value.split('\n').map((l) => l.trim()).filter(Boolean)); }} />
  );
}

export function MediaField({ value, onChange, kind = 'image', placeholder }) {
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const accept = { image: 'image/png,image/jpeg,image/webp,image/gif', audio: 'audio/mpeg,audio/wav,audio/ogg', video: 'video/mp4,video/webm' }[kind];
  const up = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const fd = new FormData(); fd.append('file', f);
      onChange((await api.post('/upload', fd)).url);
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); e.target.value = ''; }
  };
  return (
    <div className="media-field">
      <div className="row">
        <input dir="ltr" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || 'https://…'} />
        <label className={'btn small' + (busy ? ' disabled' : '')}>{busy ? '…' : t('رفع ملف', 'Upload')}<input type="file" hidden accept={accept} onChange={up} /></label>
      </div>
      {value && kind === 'image' && <img className="thumb" src={value} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} onLoad={(e) => (e.currentTarget.style.display = '')} />}
    </div>
  );
}
