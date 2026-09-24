import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, ArrowDownToLine, ArrowUpFromLine, Target, Check,
} from 'lucide-react';
import api from '../lib/api';
import Modal from '../components/Modal';
import { toast, refreshDashboard } from '../lib/toast';
import { money, fmtDate } from './format';
import './pages.css';

const ICONS = ['🎯', '✈️', '🏠', '🚗', '💍', '🎓', '🏝️', '💻', '🐶', '💼', '📈', '🎁'];
const COLORS = ['#588F2B', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#65a30d'];

const emptyForm = { name: '', targetAmount: '', deadline: '', icon: '🎯', color: '#588F2B' };

function deadlineInfo(goal) {
  if (!goal.deadline) return { text: 'No deadline', overdue: false };
  const dl = new Date(goal.deadline);
  const days = Math.ceil((dl - Date.now()) / 86400000);
  const done = Number(goal.currentAmount) >= Number(goal.targetAmount);
  if (days < 0 && !done) return { text: `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`, overdue: true };
  if (days === 0) return { text: 'Due today', overdue: false };
  if (days < 0) return { text: `Completed ${fmtDate(goal.deadline)}`, overdue: false };
  return { text: `Due ${fmtDate(goal.deadline)} · ${days} day${days === 1 ? '' : 's'} left`, overdue: false };
}

export default function GoalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [goals, setGoals] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modals
  const [goalModal, setGoalModal] = useState(null); // { mode: 'create'|'edit', goal }
  const [fundsModal, setFundsModal] = useState(null); // { mode: 'add'|'withdraw', goal }
  const [deleteModal, setDeleteModal] = useState(null); // goal

  const [form, setForm] = useState(emptyForm);
  const [fundsAmount, setFundsAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    try {
      const [g, p] = await Promise.all([api.getGoals(), api.getPayments()]);
      setGoals(g.goals || []);
      setBalance(p.balance || 0);
    } catch (e) {
      console.error('Goals load error:', e);
      toast(e.message || 'We could not load your goals. Please refresh and try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    if (searchParams.get('new') === '1') openCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setFormError('');
    setGoalModal({ mode: 'create' });
  };

  const openEdit = (goal) => {
    setForm({
      name: goal.name,
      targetAmount: String(goal.targetAmount),
      deadline: goal.deadline ? new Date(goal.deadline).toISOString().slice(0, 10) : '',
      icon: goal.icon || '🎯',
      color: goal.color || '#588F2B',
    });
    setFormError('');
    setGoalModal({ mode: 'edit', goal });
  };

  const closeGoalModal = () => {
    setGoalModal(null);
    if (searchParams.get('new') === '1') setSearchParams({}, { replace: true });
  };

  const saveGoal = async (e) => {
    e.preventDefault();
    setFormError('');
    const target = Number(form.targetAmount);
    if (!form.name.trim()) return setFormError('Give your goal a name.');
    if (!Number.isFinite(target) || target < 1) return setFormError('Target must be at least $1.');

    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        targetAmount: target,
        deadline: form.deadline || null,
        icon: form.icon,
        color: form.color,
      };
      if (goalModal.mode === 'create') {
        const res = await api.createGoal(payload);
        toast(`Goal "${res.goal.name}" created`, 'success');
      } else {
        const res = await api.updateGoal(goalModal.goal.id, payload);
        toast(`Goal "${res.goal.name}" updated`, 'success');
      }
      setGoalModal(null);
      if (searchParams.get('new') === '1') setSearchParams({}, { replace: true });
      refreshDashboard();
      await load();
    } catch (err) {
      setFormError(err.message || 'We could not save that goal. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const openFunds = (mode, goal) => {
    setFundsAmount('');
    setFormError('');
    setFundsModal({ mode, goal });
  };

  const submitFunds = async (e) => {
    e.preventDefault();
    setFormError('');
    const amt = Number(fundsAmount);
    if (!Number.isFinite(amt) || amt <= 0) return setFormError('Enter an amount greater than $0.');

    setBusy(true);
    try {
      const { mode, goal } = fundsModal;
      const res = mode === 'add'
        ? await api.addToGoal(goal.id, amt)
        : await api.withdrawFromGoal(goal.id, amt);
      toast(res.message, 'success');
      setFundsModal(null);
      refreshDashboard();
      await load();
    } catch (err) {
      setFormError(err.message || 'Transfer failed');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      const res = await api.deleteGoal(deleteModal.id);
      toast(res.message, 'success');
      setDeleteModal(null);
      refreshDashboard();
      await load();
    } catch (err) {
      toast(err.message || 'We could not delete that goal. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const totalSaved = goals.reduce((s, g) => s + Number(g.currentAmount), 0);
  const totalTarget = goals.reduce((s, g) => s + Number(g.targetAmount), 0);
  const avgProgress = goals.length
    ? Math.round(goals.reduce((s, g) => s + Math.min(100, (Number(g.currentAmount) / Number(g.targetAmount)) * 100), 0) / goals.length)
    : 0;
  const completed = goals.filter((g) => Number(g.currentAmount) >= Number(g.targetAmount)).length;

  return (
    <>
      <div className="mon-header">
        <div>
          <h1>Goals</h1>
          <p>Set targets, stash money automatically and watch the progress bar fill.</p>
        </div>
        <div className="pg-actions">
          <button className="pg-btn pg-btn-primary pg-btn-sm" onClick={openCreate}>
            <Plus size={15} /> New goal
          </button>
        </div>
      </div>

      <div className="pg-stats">
        <div className="pg-stat">
          <label>Total saved</label>
          <div className="value positive">${money(totalSaved)}</div>
          <div className="hint">Across {goals.length} goal{goals.length === 1 ? '' : 's'}</div>
        </div>
        <div className="pg-stat">
          <label>Total target</label>
          <div className="value">${money(totalTarget)}</div>
          <div className="hint">${money(Math.max(0, totalTarget - totalSaved))} to go</div>
        </div>
        <div className="pg-stat">
          <label>Average progress</label>
          <div className="value">{avgProgress}%</div>
          <div className="hint">Of every goal combined</div>
        </div>
        <div className="pg-stat">
          <label>Completed</label>
          <div className="value">{completed} / {goals.length}</div>
          <div className="hint">Goals fully funded</div>
        </div>
      </div>

      {loading ? (
        <div className="pg-goals-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="pg-goal-card">
              <div className="skeleton" style={{ height: 44, borderRadius: 12 }} />
              <div className="skeleton" style={{ height: 20, borderRadius: 6 }} />
              <div className="skeleton" style={{ height: 8, borderRadius: 6 }} />
            </div>
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="pg-card">
          <div className="pg-empty">
            <Target size={44} />
            <h4>No goals yet</h4>
            <p>Create your first savings goal — a vacation, a car, an emergency fund — and start moving money into it.</p>
            <button className="pg-btn pg-btn-primary" onClick={openCreate}>
              <Plus size={15} /> Create your first goal
            </button>
          </div>
        </div>
      ) : (
        <div className="pg-goals-grid">
          {goals.map((g) => {
            const current = Number(g.currentAmount);
            const target = Number(g.targetAmount);
            const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
            const dl = deadlineInfo(g);
            const remaining = Math.max(0, target - current);
            return (
              <div key={g.id} className="pg-goal-card">
                <div className="pg-goal-top">
                  <div className="pg-goal-icon" style={{ background: `${g.color}26`, border: `1px solid ${g.color}55` }}>
                    {g.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="pg-goal-name">{g.name}</div>
                    <div className={`pg-goal-deadline ${dl.overdue ? 'overdue' : ''}`}>{dl.text}</div>
                  </div>
                  <button className="pg-icon-btn" title="Edit goal" onClick={() => openEdit(g)}>
                    <Pencil size={14} />
                  </button>
                </div>

                <div className="pg-goal-amounts">
                  <span className="pg-goal-current">${money(current)}</span>
                  <span className="pg-goal-target">of ${money(target)}</span>
                </div>

                <div className="pg-progress">
                  <div style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${g.color}, ${g.color}aa)` }} />
                </div>

                <div className="pg-goal-meta">
                  <span>{pct}% funded</span>
                  <span>{remaining > 0 ? `$${money(remaining)} to go` : 'Goal reached 🎉'}</span>
                </div>

                <div className="pg-goal-actions">
                  <button className="pg-btn pg-btn-primary pg-btn-sm" onClick={() => openFunds('add', g)}>
                    <ArrowDownToLine size={14} /> Add
                  </button>
                  <button
                    className="pg-btn pg-btn-ghost pg-btn-sm"
                    onClick={() => openFunds('withdraw', g)}
                    disabled={current <= 0}
                  >
                    <ArrowUpFromLine size={14} /> Withdraw
                  </button>
                  <button className="pg-icon-btn danger" title="Delete goal" onClick={() => setDeleteModal(g)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / edit goal */}
      <Modal
        open={!!goalModal}
        onClose={closeGoalModal}
        title={goalModal?.mode === 'edit' ? 'Edit goal' : 'Create a new goal'}
        subtitle={goalModal?.mode === 'edit' ? 'Update your target, deadline or look.' : 'Name it, set a target and a deadline.'}
      >
        <form onSubmit={saveGoal}>
          {formError && <div className="pg-form-msg error">{formError}</div>}

          <div className="pg-field">
            <label>Goal name</label>
            <input
              className="pg-input"
              placeholder="e.g. Trip to Japan"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={60}
              required
            />
          </div>

          <div className="pg-field">
            <label>Target amount</label>
            <div className="pg-amount-wrap">
              <input
                type="number"
                min="1"
                step="0.01"
                className="pg-input"
                placeholder="10000"
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="pg-field">
            <label>Deadline (optional)</label>
            <input
              type="date"
              className="pg-input"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            />
          </div>

          <div className="pg-field">
            <label>Icon</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  className={`pg-icon-btn ${form.icon === ic ? 'active' : ''}`}
                  style={{ fontSize: 17, width: 40, height: 40 }}
                  onClick={() => setForm({ ...form, icon: ic })}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div className="pg-field">
            <label>Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`pg-icon-btn ${form.color === c ? 'active' : ''}`}
                  style={{ background: c, width: 32, height: 32, borderRadius: 8, borderColor: form.color === c ? 'var(--m-accent)' : 'transparent' }}
                  onClick={() => setForm({ ...form, color: c })}
                  aria-label={`Color ${c}`}
                >
                  {form.color === c && <Check size={14} color="#fff" />}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button type="button" className="pg-btn pg-btn-ghost" style={{ flex: 1 }} onClick={closeGoalModal}>
              Cancel
            </button>
            <button type="submit" className="pg-btn pg-btn-primary" style={{ flex: 2 }} disabled={busy}>
              {busy ? 'Saving…' : goalModal?.mode === 'edit' ? 'Save changes' : 'Create goal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add / withdraw funds */}
      <Modal
        open={!!fundsModal}
        onClose={() => setFundsModal(null)}
        title={fundsModal?.mode === 'add' ? `Add money to "${fundsModal?.goal?.name}"` : `Withdraw from "${fundsModal?.goal?.name}"`}
        subtitle={
          fundsModal?.mode === 'add'
            ? `Moves money from your available balance into this goal.`
            : `Moves money from this goal back to your available balance.`
        }
      >
        <form onSubmit={submitFunds}>
          {formError && <div className="pg-form-msg error">{formError}</div>}

          <div className="pg-field">
            <label>Amount</label>
            <div className="pg-amount-wrap">
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="pg-input"
                placeholder="0.00"
                value={fundsAmount}
                onChange={(e) => setFundsAmount(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="pg-chips">
            {[25, 50, 100, 250].map((c) => (
              <button key={c} type="button" className="pg-chip" onClick={() => setFundsAmount(String(c))}>
                ${c}
              </button>
            ))}
          </div>

          <div className="pg-balance-line">
            {fundsModal?.mode === 'add' ? (
              <>
                <span>Available balance</span>
                <strong>${money(balance)}</strong>
              </>
            ) : (
              <>
                <span>Saved in this goal</span>
                <strong>${money(fundsModal?.goal?.currentAmount)}</strong>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" className="pg-btn pg-btn-ghost" style={{ flex: 1 }} onClick={() => setFundsModal(null)}>
              Cancel
            </button>
            <button type="submit" className="pg-btn pg-btn-primary" style={{ flex: 2 }} disabled={busy}>
              {busy ? 'Moving…' : fundsModal?.mode === 'add' ? 'Add money' : 'Withdraw'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Delete this goal?"
        subtitle={`"${deleteModal?.name}" will be removed permanently.`}
        width={420}
      >
        {Number(deleteModal?.currentAmount) > 0 && (
          <div className="pg-form-msg success">
            The ${money(deleteModal.currentAmount)} you have saved here will be returned to your available balance.
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="pg-btn pg-btn-ghost" style={{ flex: 1 }} onClick={() => setDeleteModal(null)}>
            Keep goal
          </button>
          <button className="pg-btn pg-btn-danger" style={{ flex: 1 }} onClick={confirmDelete} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete goal'}
          </button>
        </div>
      </Modal>

    </>
  );
}
