import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) return setReady(true);
    api.get('/auth/me').then((r) => setUser(r.user)).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);

  const login = useCallback(async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    setToken(r.token); setUser(r.user); return r.user;
  }, []);
  const register = useCallback(async (data) => {
    const r = await api.post('/auth/register', data);
    setToken(r.token); setUser(r.user); return r.user;
  }, []);
  const logout = useCallback(() => { setToken(null); setUser(null); }, []);
  const toggleFavorite = useCallback(async (id) => {
    const r = await api.post(`/activities/${id}/favorite`);
    setUser((u) => ({ ...u, favorites: r.favorites }));
    return r.favorite;
  }, []);

  return <Ctx.Provider value={{ user, ready, login, register, logout, setUser, toggleFavorite }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
