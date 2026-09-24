import { Clock, ShieldCheck } from 'lucide-react';
import Modal from './Modal';

export const APPROVAL_NOTICE =
  'All deposits, funding, withdrawals and sends are reviewed by our team. Approval takes up to 3 working days.';
export const APPROVAL_SHORT = 'Approval takes up to 3 working days.';

/**
 * Confirmation dialog shown before any money movement (deposit, fund,
 * withdraw, send). Spells out that the admin reviews it within 3 working days
 * so the expectation is set before the request is submitted.
 *
 * Usage:
 * <ApprovalDialog
 *   open={open}
 *   onClose={fn}
 *   onConfirm={fn}          // async — called when the user confirms
 *   title="Send money"
 *   summary={[['Amount', '$100.00'], ['To', 'jane@example.com']]}
 *   busy={false}
 * />
 */
export default function ApprovalDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm request',
  summary = [],
  confirmLabel = 'Submit for approval',
  busy = false,
  children,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} subtitle="Please review the details below.">
      <div className="pg-approval-banner">
        <Clock size={18} />
        <div>
          <strong>Admin approval required</strong>
          <p>{APPROVAL_NOTICE}</p>
        </div>
      </div>

      {summary.length > 0 && (
        <div className="pg-summary">
          {summary.map(([label, value]) => (
            <div className="pg-kv" key={label}>
              <span className="k">{label}</span>
              <span className="v">{value}</span>
            </div>
          ))}
        </div>
      )}

      {children}

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button
          type="button"
          className="pg-btn pg-btn-ghost"
          style={{ flex: 1 }}
          onClick={onClose}
          disabled={busy}
        >
          Cancel
        </button>
        <button
          type="button"
          className="pg-btn pg-btn-primary"
          style={{ flex: 2 }}
          onClick={onConfirm}
          disabled={busy}
        >
          <ShieldCheck size={15} />
          {busy ? 'Submitting…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
