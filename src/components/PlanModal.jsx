import { useState } from 'react';
import Modal from './Modal';
import api from '../lib/api';
import { toast, refreshDashboard } from '../lib/toast';
import { Check } from 'lucide-react';

const PLANS = [
  { name: 'Starter', price: '$0', per: 'forever', features: ['Instant deposits & transfers', '1 virtual card', 'Goals & budgets'] },
  { name: 'Pro', price: '$9', per: '/month', features: ['Everything in Starter', '5 virtual cards', 'Higher card limits', 'Priority support'] },
  { name: 'Enterprise', price: '$29', per: '/month', features: ['Everything in Pro', 'Unlimited cards', 'Team accounts', 'Dedicated manager'] },
];

export default function PlanModal({ open, onClose, currentPlan = 'Starter', onChanged }) {
  const [busy, setBusy] = useState(false);

  const choose = async (plan) => {
    if (plan === currentPlan) return;
    setBusy(true);
    try {
      const res = await api.setPlan(plan);
      toast(res.message, 'success');
      refreshDashboard();
      onChanged?.(plan);
      onClose();
    } catch (e) {
      toast(e.message || 'We could not update your plan. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Choose your plan"
      subtitle="Switch anytime — changes apply immediately."
      width={560}
    >
      <div className="pg-plans">
        {PLANS.map((p) => (
          <div key={p.name} className={`pg-plan ${p.name === currentPlan ? 'current' : ''}`} onClick={() => choose(p.name)}>
            <div className="name">{p.name}</div>
            {p.name === currentPlan && <div className="badge-current">Current plan</div>}
            <div className="price">{p.price}<span>{p.per}</span></div>
            <div className="tag" style={{ textAlign: 'left', marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {p.features.map((f) => (
                <span key={f} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 11.5, color: 'var(--m-text-45)', lineHeight: 1.4 }}>
                  <Check size={12} style={{ flexShrink: 0, marginTop: 2, color: 'var(--m-accent-text)' }} /> {f}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        className="pg-btn pg-btn-primary pg-btn-block"
        style={{ marginTop: 16 }}
        disabled={busy}
        onClick={() => choose(currentPlan === 'Enterprise' ? 'Pro' : currentPlan === 'Pro' ? 'Enterprise' : 'Pro')}
      >
        {busy ? 'Updating…' : currentPlan === 'Enterprise' ? 'Downgrade to Pro' : `Upgrade to ${currentPlan === 'Pro' ? 'Enterprise' : 'Pro'}`}
      </button>
    </Modal>
  );
}
