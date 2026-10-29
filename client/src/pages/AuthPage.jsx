import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { Field } from '../templates/editorKit.jsx';

export default function AuthPage() {
  const { login, register } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'teacher' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      mode === 'login' ? await login(f.email, f.password) : await register(f);
      const next = sp.get('next');
      nav(next && next.startsWith('/') ? next : '/', { replace: true });
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const demo = (email, password) => setF({ ...f, email, password });

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="tabs">
          <button className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>{t('تسجيل الدخول', 'Log in')}</button>
          <button className={mode === 'register' ? 'on' : ''} onClick={() => setMode('register')}>{t('حساب جديد', 'Sign up')}</button>
        </div>
        <form onSubmit={submit}>
          {mode === 'register' && <Field label={t('الاسم', 'Name')}><input value={f.name} onChange={set('name')} required maxLength={80} autoComplete="name" /></Field>}
          <Field label={t('البريد الإلكتروني', 'Email')}><input type="email" dir="ltr" value={f.email} onChange={set('email')} required autoComplete="email" /></Field>
          <Field label={t('كلمة المرور', 'Password')} hint={mode === 'register' ? t('6 أحرف على الأقل', 'At least 6 characters') : undefined}><input type="password" dir="ltr" value={f.password} onChange={set('password')} required minLength={mode === 'register' ? 6 : 1} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></Field>
          {mode === 'register' && (
            <div className="role-pick">
              {[['teacher', '👩‍🏫', t('معلم / مدرب', 'Teacher')], ['student', '🧒', t('طالب', 'Student')]].map(([v, ic, l]) => (
                <button type="button" key={v} className={f.role === v ? 'on' : ''} onClick={() => setF({ ...f, role: v })}><span>{ic}</span>{l}</button>
              ))}
            </div>
          )}
          {err && <div className="error-box">⚠️ {err}</div>}
          <button className="btn primary big" disabled={busy}>{busy ? '…' : mode === 'login' ? t('دخول', 'Log in') : t('إنشاء الحساب', 'Create account')}</button>
        </form>
        {mode === 'login' && (
          <div className="demo-box">
            <small>{t('حسابات تجريبية (وضع التطوير):', 'Demo accounts (dev mode):')}</small>
            <div className="row">
              <button className="chip-btn" onClick={() => demo('teacher@demo.com', 'teacher123')}>{t('معلم', 'Teacher')}</button>
              <button className="chip-btn" onClick={() => demo('student@demo.com', 'student123')}>{t('طالب', 'Student')}</button>
              <button className="chip-btn" onClick={() => demo('admin@demo.com', 'admin123')}>{t('مدير', 'Admin')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
