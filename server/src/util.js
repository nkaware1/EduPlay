export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const clean = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const isEmail = (v) => typeof v === 'string' && v.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const now = () => new Date().toISOString();
export const clampInt = (v, min, max, d = 0) => {
  v = Number(v);
  return Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : d;
};
