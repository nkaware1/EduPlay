import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { getToken } from '../api.js';

export const createSocket = () => io({ auth: { token: getToken() }, transports: ['websocket', 'polling'], reconnectionDelayMax: 3000 });

// إرسال مع انتظار الرد ومهلة
export const emit = (s, ev, payload) =>
  new Promise((resolve) => {
    if (!s) return resolve({ ok: false, error: 'لا يوجد اتصال' });
    s.timeout(8000).emit(ev, payload ?? {}, (err, res) => resolve(err ? { ok: false, error: 'انقطع الاتصال بالخادم' } : res || { ok: false }));
  });

// ساعة متزامنة مع الخادم: now() ≈ وقت الخادم الآن
export function useServerClock(view) {
  const off = useRef(0);
  const seen = useRef(null);
  const [, tick] = useState(0);
  // نحسب الفرق مرة واحدة عند وصول لقطة جديدة (وليس عند كل إعادة رسم، وإلا يتجمد الوقت)
  if (view && seen.current !== view) { seen.current = view; off.current = view.now - Date.now(); }
  useEffect(() => { const h = setInterval(() => tick((x) => x + 1), 200); return () => clearInterval(h); }, []);
  return () => Date.now() + off.current;
}

export function useLiveSocket() {
  const ref = useRef(null);
  const [connected, setConnected] = useState(false);
  useEffect(() => () => { ref.current?.close(); ref.current = null; }, []);
  const connect = useCallback(() => {
    if (ref.current) return ref.current;
    const s = createSocket();
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    ref.current = s;
    return s;
  }, []);
  return { connect, connected, sock: ref };
}

export const SHAPES = ['▲', '◆', '●', '■'];
export const joinUrl = (pin) => `${window.location.origin}/join/${pin}`;
