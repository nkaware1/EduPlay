import { Component, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useT } from './i18n.jsx';

const ToastCtx = createContext(() => {});
const ConfirmCtx = createContext(async () => false);
export const useToast = () => useContext(ToastCtx);
export const useConfirm = () => useContext(ConfirmCtx);

export function UiProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const id = useRef(0);

  const toast = useCallback((msg, kind = 'ok') => {
    const k = ++id.current;
    setToasts((l) => [...l, { k, msg, kind }]);
    setTimeout(() => setToasts((l) => l.filter((x) => x.k !== k)), 3800);
  }, []);
  const confirm = useCallback((opts) => new Promise((resolve) => setDialog({ ...(typeof opts === 'string' ? { text: opts } : opts), resolve })), []);
  const close = (v) => { dialog.resolve(v); setDialog(null); };
  const t = useT();

  return (
    <ToastCtx.Provider value={toast}>
      <ConfirmCtx.Provider value={confirm}>
        {children}
        <div className="toasts" role="status" aria-live="polite">
          {toasts.map((x) => <div key={x.k} className={'toast ' + x.kind}>{x.kind === 'error' ? '⚠️' : '✅'} {x.msg}</div>)}
        </div>
        {dialog && (
          <Modal onClose={() => close(false)} title={dialog.title || t('تأكيد', 'Confirm')} small>
            <p>{dialog.text}</p>
            <div className="row end">
              <button className="btn" onClick={() => close(false)}>{t('إلغاء', 'Cancel')}</button>
              <button className={'btn ' + (dialog.danger === false ? 'primary' : 'danger')} onClick={() => close(true)}>{dialog.ok || t('تأكيد', 'Confirm')}</button>
            </div>
          </Modal>
        )}
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}

export function Modal({ title, onClose, children, small, wide }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (small ? ' small' : '') + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="close">✕</button></div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export const Spinner = ({ label }) => <div className="spinner-wrap"><div className="spinner" /><span>{label}</span></div>;
export const Empty = ({ icon = '🫥', title, text, children }) => (
  <div className="empty"><div className="empty-icon">{icon}</div><h3>{title}</h3>{text && <p>{text}</p>}{children}</div>
);
export const ErrorBox = ({ error, retry }) => {
  const t = useT();
  return <div className="error-box">⚠️ {error}{retry && <button className="btn small" onClick={retry}>{t('إعادة المحاولة', 'Retry')}</button>}</div>;
};

export function useFetch(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const run = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    let live = true;
    fn().then((data) => live && setState({ data, loading: false, error: null }))
      .catch((e) => live && setState({ data: null, loading: false, error: e.message }));
    return () => { live = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => run(), [run]);
  return { ...state, reload: run, setData: (d) => setState((s) => ({ ...s, data: typeof d === 'function' ? d(s.data) : d })) };
}

export function useDebounced(value, ms = 500) {
  const [v, setV] = useState(value);
  useEffect(() => { const h = setTimeout(() => setV(value), ms); return () => clearTimeout(h); }, [value, ms]);
  return v;
}

export class ErrorBoundary extends Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (this.state.err) return <div className="error-box">⚠️ {this.props.message || 'تعذّر عرض هذا المحتوى. تحقق من اكتمال بيانات النشاط.'}</div>;
    return this.props.children;
  }
}
