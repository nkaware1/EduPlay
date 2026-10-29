const KEY = 'lamaa_token';
export const getToken = () => localStorage.getItem(KEY);
export const setToken = (t) => (t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY));

async function request(method, url, body, raw) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch('/api' + url, { method, headers, body: payload });
  } catch {
    throw new Error('تعذّر الاتصال بالخادم. تأكد أنه يعمل ثم أعد المحاولة.');
  }
  if (raw && res.ok) return res;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // رد بلا نص JSON (مثلًا 500 فارغ من وكيل Vite) يعني غالبًا أن الخادم متوقف أو لم يبدأ
    const down = !data.error && [500, 502, 503, 504].includes(res.status);
    const e = new Error(data.error || (down ? 'تعذّر الوصول إلى الخادم. تأكد أنه يعمل، وأنك نفّذت npm run install:all بعد تحديث الملفات، ثم أعد المحاولة.' : 'حدث خطأ غير متوقع'));
    e.status = res.status;
    throw e;
  }
  return data;
}

export const api = {
  get: (u) => request('GET', u),
  post: (u, b) => request('POST', u, b ?? {}),
  put: (u, b) => request('PUT', u, b ?? {}),
  del: (u) => request('DELETE', u),
  raw: (u) => request('GET', u, undefined, true),
};
