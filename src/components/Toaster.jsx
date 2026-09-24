import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const icons = {
  success: <CheckCircle2 size={16} />,
  error: <AlertCircle size={16} />,
  info: <Info size={16} />,
};

/** Renders global toasts fired by lib/toast.js. Mount once inside Dashboard. */
export default function Toaster() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const onToast = (e) => {
      const item = e.detail;
      setItems((prev) => [...prev, item]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== item.id));
      }, 4000);
    };
    window.addEventListener('app-toast', onToast);
    return () => window.removeEventListener('app-toast', onToast);
  }, []);

  const dismiss = (id) => setItems((prev) => prev.filter((t) => t.id !== id));

  if (items.length === 0) return null;

  return (
    <div className="pg-toaster">
      {items.map((t) => (
        <div key={t.id} className={`pg-toast pg-toast-${t.type}`}>
          <span className="pg-toast-icon">{icons[t.type] || icons.info}</span>
          <span className="pg-toast-msg">{t.message}</span>
          <button className="pg-toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
