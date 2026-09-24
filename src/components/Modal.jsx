import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Reusable overlay modal. Closes on Escape and backdrop click.
 * Usage: <Modal open={open} onClose={fn} title="Deposit">…children…</Modal>
 */
export default function Modal({ open, onClose, title, subtitle, children, width = 460 }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="pg-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="pg-modal" style={{ width }} role="dialog" aria-modal="true" aria-label={title}>
        <div className="pg-modal-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="pg-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="pg-modal-body">{children}</div>
      </div>
    </div>
  );
}
