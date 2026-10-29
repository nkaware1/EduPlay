// تطبيع النص العربي للمقارنة: إزالة التشكيل والتطويل وتوحيد الألف والياء والتاء المربوطة
export const norm = (s = '') =>
  String(s)
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

export const shuffle = (a) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

// خلط لا يُنتج الترتيب الأصلي نفسه (عند وجود عنصرين مختلفين على الأقل)
export const shuffleDiff = (a, same = (x, i) => x === a[i]) => {
  let r = shuffle(a);
  for (let k = 0; k < 8 && a.length > 1 && r.every((x, i) => same(x, i)); k++) r = shuffle(a);
  return r;
};

export const isImageUrl = (s = '') => /^(https?:\/\/|\/uploads\/).+\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(s) || /^data:image\//.test(s);
export const hasArabic = (s = '') => /[\u0600-\u06FF]/.test(s);

export function parseVideo(url = '') {
  const u = url.trim();
  const yt = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/);
  if (yt) return { kind: 'youtube', id: yt[1] };
  if (/\.(mp4|webm)(\?.*)?$/i.test(u) && /^(https?:\/\/|\/uploads\/)/.test(u)) return { kind: 'file', src: u };
  return { kind: 'none' };
}

export const fmtTime = (sec = 0) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
export const fmtDate = (iso, lang = 'ar') =>
  iso ? new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
