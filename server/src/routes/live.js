import { Router } from 'express';
import rateLimit from 'express-rate-limit';

export default function liveRoutes(live) {
  const r = Router();
  const limiter = rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'محاولات كثيرة، حاول بعد قليل' } });
  r.get('/modes', (_req, res) => res.json(live.modes));
  // معاينة الرمز قبل الانضمام (عنوان اللعبة والفرق)
  r.get('/peek/:pin', limiter, (req, res) => {
    const out = live.peek(req.params.pin, req.ip);
    res.status(out.ok ? 200 : 404).json(out);
  });
  return r;
}
