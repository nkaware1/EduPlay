import jwt from 'jsonwebtoken';
import { config } from './config.js';

export const signToken = (u) => jwt.sign({ id: u.id }, config.jwtSecret, { expiresIn: '14d' });

export const publicUser = (u) =>
  u && {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    school: u.school || '',
    favorites: u.favorites || [],
    createdAt: u.createdAt,
  };

export function authMiddleware(db) {
  const load = async (req) => {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return null;
    try {
      const p = jwt.verify(token, config.jwtSecret);
      return await db.findOne('users', { id: p.id });
    } catch {
      return null;
    }
  };
  return {
    optional: async (req, _res, next) => {
      req.user = await load(req);
      next();
    },
    required: async (req, res, next) => {
      const u = await load(req);
      if (!u) return res.status(401).json({ error: 'يجب تسجيل الدخول أولًا' });
      req.user = u;
      next();
    },
    role:
      (...roles) =>
      (req, res, next) =>
        roles.includes(req.user?.role) ? next() : res.status(403).json({ error: 'ليست لديك صلاحية لهذا الإجراء' }),
  };
}
