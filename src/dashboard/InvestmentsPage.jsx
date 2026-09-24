import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Clock, Lock, Sparkles, ArrowRight, CheckCircle2, Wallet, Gift, Percent,
} from 'lucide-react';
import api from '../lib/api';
import Modal from '../components/Modal';
import { toast, refreshDashboard } from '../lib/toast';
import { money, fmtDate } from './format';
import './pages.css';

function BonusBanner({ bonus }) {
  if (!bonus || (!bonus.balance && bonus.unlocked)) return null;

  if (bonus.unlocked) {
    return (
      <div className="pg-notice success">
        <CheckCircle2 size={15} />
        <span>
          Your welcome bonus is <strong>unlocked</strong> — it sits in your wallet and can be invested, sent or
          withdrawn like any other money.
        </span>
      </div>
    );
  }

  if (bonus.balance <= 0) return null;

  const pct = Math.round((bonus.progress || 0) * 100);
  const remaining = Math.max(0, (bonus.threshold || 1000) - (bonus.fundedAmount || 0));

  return (
    <div className="pg-bonus-card">
      <div className="pg-bonus-head">
        <div className="pg-bonus-icon"><Lock size={18} /></div>
        <div>
          <div className="pg-bonus-title">${money(bonus.balance)} welcome bonus — locked</div>
          <div className="pg-bonus-sub">
            Your bonus can't be used for investments (or sent, or withdrawn) until you've funded{' '}
            <strong>${money(bonus.threshold || 1000)}</strong> of your own money. You're at{' '}
            <strong>${money(bonus.fundedAmount)}</strong> — <strong>${money(remaining)}</strong> to go.
          </div>
        </div>
      </div>
      <div className="pg-progress">
        <div className="pg-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="pg-bonus-foot">
        {pct}% funded · unlock automatically after your first $1,000 in approved deposits
      </div>
    </div>
  );
}

function InvestModal({ plan, moneyState, onClose, onInvested }) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [bonusBlocked, setBonusBlocked] = useState(false);

  useEffect(() => {
    if (plan) {
      setAmount(String(plan.minAmount || ''));
      setError('');
    }
  }, [plan]);

  if (!plan) return null;

  const amt = Number(amount) || 0;
  const profit = (amt * plan.returnPercent) / 100;
  const payout = amt + profit;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!amt || amt < plan.minAmount) {
      setError(`The ${plan.name} plan starts at $${money(plan.minAmount)}.`);
      return;
    }
    if (plan.maxAmount != null && amt > plan.maxAmount) {
      setError(`The ${plan.name} plan accepts up to $${money(plan.maxAmount)} per investment.`);
      return;
    }
    if (amt > moneyState.available) {
      setError(`You only have $${money(moneyState.available)} available to invest.`);
      return;
    }
    setBusy(true);
    try {
      const res = await api.invest(plan.id, amt);
      toast(res.message, 'success');
      refreshDashboard();
      onInvested(res);
    } catch (err) {
      if (err.bonusLocked) {
        setBonusBlocked(true);
      }
      setError(err.message || 'We could not start that investment. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!plan}
      onClose={onClose}
      title={`Invest in ${plan.name}`}
      subtitle={`${plan.returnPercent}% fixed return over ${plan.durationDays} days`}
    >
      <form onSubmit={submit}>
        {error && <div className={`pg-form-msg ${bonusBlocked ? 'info' : 'error'}`}>{error}</div>}
        {bonusBlocked && (
          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              className="pg-btn pg-btn-primary pg-btn-block"
              onClick={() => window.dispatchEvent(new CustomEvent('monetra:refresh')) || onClose()}
            >
              <Wallet size={14} /> Fund your wallet to unlock the bonus
            </button>
          </div>
        )}

        <div className="pg-field">
          <label>Amount to invest</label>
          <div className="pg-amount-wrap">
            <input
              type="number"
              min={plan.minAmount}
              step="0.01"
              className="pg-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="pg-chips">
          {plan.maxAmount != null && plan.maxAmount <= 10000 ? (
            <button type="button" className="pg-chip" onClick={() => setAmount(String(plan.maxAmount))}>
              Max ${money(plan.maxAmount)}
            </button>
          ) : null}
          <button type="button" className="pg-chip" onClick={() => setAmount(String(Math.floor(moneyState.available)))}>
            All available (${money(moneyState.available)})
          </button>
        </div>

        <div className="pg-summary">
          <div className="pg-kv"><span className="k">You invest</span><span className="v">${money(amt)}</span></div>
          <div className="pg-kv"><span className="k">Fixed return ({plan.returnPercent}%)</span><span className="v positive">+${money(profit)}</span></div>
          <div className="pg-kv"><span className="k">You receive at maturity</span><span className="v"><strong>${money(payout)}</strong></span></div>
          <div className="pg-kv"><span className="k">Matures on</span><span className="v">{fmtDate(Date.now() + plan.durationDays * 86400000)}</span></div>
          <div className="pg-kv"><span className="k">Available balance</span><span className="v">${money(moneyState.available)}</span></div>
        </div>

        <div className="pg-note" style={{ margin: '12px 0' }}>
          <Sparkles size={12} style={{ verticalAlign: -2 }} /> Your money leaves your wallet the moment the
          investment starts. Returns accrue <strong>every second</strong> — watch them climb live on the
          Invest page — and the full payout lands in your wallet on the maturity date. Locked bonus funds
          can't be invested until unlocked.
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="pg-btn pg-btn-ghost" style={{ flex: 1 }} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="pg-btn pg-btn-primary" style={{ flex: 2 }} disabled={busy}>
            {busy ? 'Starting…' : 'Set it in motion'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function InvestmentsPage() {
  const [plans, setPlans] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [funds, setFunds] = useState({ available: 0, bonus: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [claiming, setClaiming] = useState(null);
  const [tick, setTick] = useState(0);

  // Smooth live ticking between server refreshes: re-renders every 30s and
  // interpolates each active investment's earned-so-far between accrual points.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    try {
      const [plansRes, invRes] = await Promise.all([api.getInvestmentPlans(), api.getInvestments()]);
      setPlans(plansRes.plans || []);
      setFunds(plansRes.money || {});
      setInvestments(invRes.investments || []);
      setSummary(invRes.summary || null);
      if (invRes.money) setFunds(invRes.money);
    } catch (e) {
      console.error('Investments load error:', e);
      toast(e.message || 'We could not load your investments. Please refresh and try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const claim = async (inv) => {
    setClaiming(inv.id);
    try {
      const res = await api.claimInvestment(inv.id);
      toast(res.message, 'success');
      refreshDashboard();
      await load();
    } catch (e) {
      toast(e.message || 'We could not claim that investment. Please try again.', 'error');
    } finally {
      setClaiming(null);
    }
  };

  /** Live earned-so-far: interpolates server accrual to the current second. */
  const liveAccrued = (inv) => {
    if (inv.status !== 'ACTIVE') return inv.status === 'CLAIMED' ? inv.expectedReturn : inv.accrued;
    const start = new Date(inv.startsAt).getTime();
    const end = new Date(inv.maturesAt).getTime();
    const now = Date.now();
    if (end <= start) return inv.projectedReturn;
    const elapsed = Math.min(Math.max(now - start, 0), end - start);
    return (inv.projectedReturn * elapsed) / (end - start);
  };

  const bonusInfo = {
    balance: funds.bonus,
    unlocked: funds.bonusUnlocked,
    fundedAmount: funds.fundedAmount,
    threshold: funds.bonusThreshold,
    progress: funds.bonusProgress,
  };

  return (
    <>
      <div className="mon-header">
        <div>
          <h1>Investments</h1>
          <p>Choose a plan, put your money in motion, and earn a fixed return.</p>
        </div>
        <div className="pg-actions">
          <button className="pg-btn pg-btn-ghost pg-btn-sm" onClick={() => navigate('/dashboard/manage?tab=deposit')}>
            <Wallet size={14} /> Fund wallet
          </button>
        </div>
      </div>

      <BonusBanner bonus={bonusInfo} />

      {/* Summary */}
      <div className="pg-stats">
        <div className="pg-stat">
          <label>Available to invest</label>
          <div className="value">${money(funds.available)}</div>
          <div className="hint">Main wallet balance</div>
        </div>
        <div className="pg-stat">
          <label>Total invested</label>
          <div className="value">${money(summary?.investedTotal)}</div>
          <div className="hint">{summary?.activeCount || 0} active investment{(summary?.activeCount || 0) === 1 ? '' : 's'}</div>
        </div>
        <div className="pg-stat">
          <label>Returns pending</label>
          <div className="value positive">+${money(summary?.returnsPending)}</div>
          <div className="hint">
            ${money(summary?.earnedSoFar)} earned so far · grows in real time
          </div>
        </div>
        <div className="pg-stat">
          <label>Ready to claim</label>
          <div className="value positive">${money(summary?.claimable)}</div>
          <div className="hint">
            {summary?.claimable > 0 ? (
              <button className="pg-clear-btn" style={{ padding: 0, color: 'inherit' }} onClick={() => document.getElementById('my-investments')?.scrollIntoView({ behavior: 'smooth' })}>
                Claim now ↓
              </button>
            ) : 'Nothing matured yet'}
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="pg-card">
        <div className="pg-card-head">
          <div>
            <div className="pg-card-title">Investment plans</div>
            <div className="pg-card-sub">Pick a plan — returns accrue every second from the moment you confirm</div>
          </div>
        </div>

        {loading ? (
          <div className="pg-plan-grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton" style={{ height: 240, borderRadius: 16 }} />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <div className="pg-empty">
            <TrendingUp size={44} />
            <h4>No plans available yet</h4>
            <p>Our team is preparing investment plans. Check back soon.</p>
          </div>
        ) : (
          <div className="pg-plan-grid">
            {plans.map((p, idx) => (
              <div key={p.id} className={`pg-plan ${idx === 0 ? 'featured' : ''}`}>
                {idx === 0 && <div className="pg-plan-ribbon">Most value</div>}
                <div className="pg-plan-name">{p.name}</div>
                <div className="pg-plan-return">
                  <span className="num">{p.returnPercent}%</span>
                  <span className="lbl"><Percent size={12} /> fixed return</span>
                </div>
                <div className="pg-plan-term">
                  <Clock size={13} /> {p.durationDays} days
                </div>
                <p className="pg-plan-desc">{p.description}</p>
                <div className="pg-plan-range">
                  <span>
                    ${money(p.minAmount)}
                    {p.maxAmount != null ? ` – $${money(p.maxAmount)}` : '+'}
                  </span>
                  <span>min investment</span>
                </div>
                <button className="pg-btn pg-btn-primary pg-btn-block" onClick={() => setSelectedPlan(p)}>
                  Invest now <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My investments */}
      <div className="pg-card" id="my-investments">
        <div className="pg-card-head">
          <div>
            <div className="pg-card-title">My investments</div>
            <div className="pg-card-sub">
              {investments.length === 0
                ? 'Your active investments will appear here'
                : `${investments.length} investment${investments.length === 1 ? '' : 's'} · ${summary?.maturedCount || 0} ready to claim`}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '10px 0' }}>
            {[0, 1].map((i) => (
              <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12, marginBottom: 10 }} />
            ))}
          </div>
        ) : investments.length === 0 ? (
          <div className="pg-empty">
            <Sparkles size={44} />
            <h4>No investments yet</h4>
            <p>Choose a plan above to put your money to work — you'll track every dollar here.</p>
          </div>
        ) : (
          <div className="pg-list">
            {investments.map((inv) => (
              <div key={inv.id} className="pg-investment">
                <div className="pg-investment-top">
                  <div>
                    <div className="pg-list-title">
                      {inv.plan?.name || 'Plan'} plan
                      <span
                        className={`pg-badge ${
                          inv.status === 'CLAIMED' ? 'green' : inv.status === 'MATURED' ? 'purple' : 'amber'
                        }`}
                        style={{ marginLeft: 8 }}
                      >
                        {inv.status === 'CLAIMED' ? 'CLAIMED' : inv.status === 'MATURED' ? 'READY' : 'ACTIVE'}
                      </span>
                    </div>
                    <div className="pg-list-sub">
                      ${money(inv.amount)} → ${money(inv.totalPayout)} · matures {fmtDate(inv.maturesAt)}
                      {inv.status === 'ACTIVE' && ` · ${inv.daysLeft} day${inv.daysLeft === 1 ? '' : 's'} left`}
                    </div>
                  </div>
                <div style={{ textAlign: 'right' }}>
                  {inv.status === 'ACTIVE' ? (
                    <div className="pg-amount pos" title="Grows every second until maturity">
                      +${money(liveAccrued(inv))}
                    </div>
                  ) : (
                    <div className="pg-amount pos">+${money(inv.status === 'CLAIMED' ? inv.expectedReturn : inv.accrued)}</div>
                  )}
                  <div className="pg-list-sub">
                    {inv.status === 'ACTIVE' ? 'earned so far · live' : 'earned'}
                    {inv.status === 'ACTIVE' && ` of $${money(inv.projectedReturn)} projected`}
                  </div>
                </div>
                </div>

                <div className="pg-progress">
                  <div
                    className={`pg-progress-fill ${inv.status !== 'ACTIVE' ? 'complete' : ''}`}
                    style={{ width: `${inv.progress}%` }}
                  />
                </div>

                <div className="pg-investment-foot">
                  <span className="pg-list-sub">
                    Started {fmtDate(inv.startsAt)}
                    {inv.claimedAt ? ` · claimed ${fmtDate(inv.claimedAt)}` : ''}
                  </span>
                  {inv.canClaim && (
                    <button
                      className="pg-btn pg-btn-primary pg-btn-sm"
                      onClick={() => claim(inv)}
                      disabled={claiming === inv.id}
                    >
                      <Gift size={14} />
                      {claiming === inv.id ? 'Claiming…' : `Claim $${money(inv.totalPayout)}`}
                    </button>
                  )}
                  {inv.status === 'ACTIVE' && (
                    <span className="pg-badge amber">earning {inv.plan?.returnPercent}% · live</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <InvestModal
        plan={selectedPlan}
        moneyState={funds}
        onClose={() => setSelectedPlan(null)}
        onInvested={() => {
          setSelectedPlan(null);
          load();
        }}
      />
    </>
  );
}
