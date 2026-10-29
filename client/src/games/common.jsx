import { useEffect } from 'react';
import { isImageUrl, parseVideo } from '../lib/text.js';
import { useT } from '../i18n.jsx';

export const ProgressBar = ({ value, max }) => (
  <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
    <div style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
    <span>{value}/{max}</span>
  </div>
);

export function FeedbackBar({ ok, text, onNext, last, nextLabel }) {
  const t = useT();
  return (
    <div className={'feedback ' + (ok ? 'good' : 'bad')} role="status">
      <div className="fb-msg">
        <b>{ok ? t('أحسنت! إجابة صحيحة 🎉', 'Correct! 🎉') : t('إجابة غير صحيحة', 'Not quite')}</b>
        {text ? <span>{text}</span> : null}
      </div>
      <button className="btn primary" onClick={onNext} autoFocus>{nextLabel || (last ? t('إنهاء', 'Finish') : t('التالي', 'Next'))}</button>
    </div>
  );
}

// يعرض صورة إن كان النص رابط صورة، وإلا النص نفسه
export const Cell = ({ text }) => (isImageUrl(text) ? <img className="cell-img" src={text} alt="" /> : <span>{text}</span>);

export function VideoEmbed({ url }) {
  const t = useT();
  const v = parseVideo(url);
  if (v.kind === 'youtube')
    return <div className="video"><iframe src={`https://www.youtube-nocookie.com/embed/${v.id}`} title="video" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen /></div>;
  if (v.kind === 'file') return <div className="video"><video src={v.src} controls /></div>;
  return <div className="video empty-video">{t('أضف رابط فيديو يوتيوب أو ملف MP4 صالحًا', 'Add a valid YouTube link or MP4 file')}</div>;
}

export function useKeys(handler, deps) {
  useEffect(() => {
    const h = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      handler(e);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export const speak = (text, lang) => {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === 'en' ? 'en-US' : 'ar-SA';
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
  return true;
};
