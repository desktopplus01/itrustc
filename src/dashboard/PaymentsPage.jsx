import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowDownLeft, ArrowUpRight, Send, HandCoins, Plus, ArrowRight,
  CreditCard, Coins, Landmark, Wallet, ArrowLeftRight, Gift, ChevronRight,
  Copy, Clock, Lock,
} from 'lucide-react';
import api from '../lib/api';
import { toast, refreshDashboard } from '../lib/toast';
import { money, fmtDateTime, isIncoming, STATUS_BADGE, txTitle, REQUEST_META } from './format';
import ApprovalDialog, { APPROVAL_NOTICE, APPROVAL_SHORT } from '../components/ApprovalDialog';
import './pages.css';

const TABS = [
  { id: 'deposit', label: 'Deposit', icon: <ArrowDownLeft size={15} /> },
  { id: 'withdraw', label: 'Withdraw', icon: <ArrowUpRight size={15} /> },
  { id: 'send', label: 'Send', icon: <Send size={15} /> },
  { id: 'request', label: 'Request', icon: <HandCoins size={15} /> },
];

const WITHDRAW_METHODS = [
  { id: 'bank', label: 'Bank transfer', sub: 'To your linked bank account', icon: <Landmark size={16} /> },
  { id: 'crypto', label: 'Crypto wallet', sub: 'To an external crypto wallet', icon: <Coins size={16} /> },
];

const CHIPS = [100, 500, 1000, 5000];

function TypeIcon({ type }) {
  const cls = isIncoming(type) ? 'in' : 'out';
  const icon = {
    DEPOSIT: <ArrowDownLeft size={16} />,
    BONUS: <Gift size={16} />,
    WITHDRAWAL: <ArrowUpRight size={16} />,
    BUY: <ArrowLeftRight size={16} />,
    SELL: <ArrowLeftRight size={16} />,
    INVEST: <Coins size={16} />,
    RETURN: <Gift size={16} />,
    CARD_FUND: <CreditCard size={16} />,
  }[type] || <Coins size={16} />;
  return <div className={`pg-list-icon ${cls}`}>{icon}</div>;
}

export default function PaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const paramTab = searchParams.get('tab') || 'deposit';
  const paramTo = searchParams.get('to') || '';
  const paramAmount = searchParams.get('amount') || '';

  const [data, setData] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(paramTab);
  const [amount, setAmount] = useState(paramAmount);
  const [method, setMethod] = useState('bank');
  const [recipient, setRecipient] = useState(paramTo);
  const [note, setNote] = useState('');
  const [addressId, setAddressId] = useState('');
  const [txHash, setTxHash] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    setTab(paramTab);
    if (paramTo) setRecipient(paramTo);
    if (paramAmount) setAmount(paramAmount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramTab, paramTo, paramAmount]);

  const load = useCallback(async () => {
    try {
      const [result, addrRes, reqRes] = await Promise.all([
        api.getPayments(),
        api.getDepositAddresses(),
        api.getMyRequests({ status: 'PENDING' }),
      ]);
      setData(result);
      setAddresses(addrRes.addresses || []);
      setPending(reqRes.requests || []);
      setAddressId((prev) => prev || (addrRes.addresses || [])[0]?.id || '');
    } catch (e) {
      console.error('Payments load error:', e);
      toast(e.message || 'We could not load your payments. Please refresh and try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const next = {};
    if (tab !== 'deposit') next.tab = tab;
    if (recipient) next.to = recipient;
    if (amount) next.amount = amount;
    setSearchParams(next, { replace: true });
    setMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const switchTab = (id) => {
    setTab(id);
    setAmount('');
    setNote('');
    setTxHash('');
    setMsg(null);
  };

  const validate = () => {
    const amt = Number(amount);
    if (!amount || !Number.isFinite(amt) || amt <= 0) {
      setMsg({ type: 'error', text: 'Enter an amount greater than $0 to continue.' });
      return false;
    }
    if ((tab === 'send' || tab === 'request') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.trim())) {
      setMsg({ type: 'error', text: 'Enter a valid email address for the recipient, for example jane@example.com.' });
      return false;
    }
    if (tab === 'deposit') {
      if (!addressId) {
        setMsg({ type: 'error', text: 'Choose one of our verified crypto addresses to send your deposit to.' });
        return false;
      }
      if (txHash.trim().length < 8) {
        setMsg({ type: 'error', text: 'Paste the transaction hash (TXID) from your wallet so our team can verify the transfer.' });
        return false;
      }
    }
    if (tab === 'send' && amt > (data?.balance ?? 0)) {
      setMsg({ type: 'error', text: `You only have $${money(data?.balance ?? 0)} available. Enter a smaller amount.` });
      return false;
    }
    return true;
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (!validate()) return;

    if (tab === 'request') {
      // Money requests are notifications — no funds move, so no approval dialog.
      await send();
      return;
    }
    setDialogOpen(true);
  };

  const send = async () => {
    const amt = Number(amount);
    setBusy(true);
    setMsg(null);
    try {
      let result;
      if (tab === 'deposit') result = await api.deposit(amt, addressId, txHash.trim());
      else if (tab === 'withdraw') result = await api.withdraw(amt, method);
      else if (tab === 'send') result = await api.transfer(recipient.trim(), amt, note.trim() || undefined);
      else result = await api.requestPayment(recipient.trim(), amt, note.trim() || undefined);

      setDialogOpen(false);
      toast(result.message, 'success');
      setMsg({ type: 'success', text: result.message });
      setAmount('');
      setNote('');
      setTxHash('');
      if (tab === 'send') setRecipient('');
      refreshDashboard();
      await load();
    } catch (err) {
      setDialogOpen(false);
      setMsg({ type: 'error', text: err.message || 'Something went wrong. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  const copy = (text, what) => {
    navigator.clipboard?.writeText(text);
    toast(`${what} copied to your clipboard`, 'success');
  };

  const balance = data?.balance ?? 0;
  const bonus = data?.bonus ?? 0;
  const bonusLocked = !data?.bonusUnlocked && bonus > 0;
  const methodName = WITHDRAW_METHODS.find((m) => m.id === method)?.label || 'Bank transfer';
  const selectedAddress = addresses.find((a) => a.id === addressId);

  const submitLabel = {
    deposit: 'Deposit funds',
    withdraw: 'Withdraw funds',
    send: 'Send money',
    request: 'Send request',
  }[tab];

  const dialogTitle = {
    deposit: 'Confirm your deposit',
    withdraw: 'Confirm your withdrawal',
    send: 'Confirm you want to send money',
  }[tab] || 'Confirm';

  const summary = [
    ['Amount', `$${money(amount)}`],
    ...(tab === 'deposit'
      ? [['To', `${selectedAddress?.currency || ''} · ${selectedAddress?.network || ''}`], ['Address', selectedAddress?.address || '—']]
      : []),
    ...(tab === 'withdraw' ? [['Via', methodName]] : []),
    ...(tab === 'send' ? [['Recipient', recipient.trim()], ['From', 'Your main wallet']] : []),
  ];

  return (
    <>
      <div className="mon-header">
        <div>
          <h1>Payments</h1>
          <p>Fund your wallet, withdraw, send and request money.</p>
        </div>
        <div className="pg-actions">
          <button className="pg-btn pg-btn-ghost pg-btn-sm" onClick={() => navigate('/dashboard/account')}>
            All transactions <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Approval + bonus notices */}
      <div className="pg-notice-stack">
        <div className="pg-notice info">
          <Clock size={15} />
          <span>{APPROVAL_NOTICE}</span>
        </div>
        {bonusLocked && (
          <div className="pg-notice warn">
            <Lock size={15} />
            <span>
              Your <strong>${money(bonus)} welcome bonus</strong> is locked. Once you've funded{' '}
              <strong>$1,000</strong> of your own money (you're at <strong>${money(data?.fundedAmount)}</strong>), it
              unlocks for investing, sending and withdrawals.{' '}
              <Link to="/dashboard/invest" style={{ color: 'inherit', textDecoration: 'underline' }}>See progress</Link>
            </span>
          </div>
        )}
        {pending.length > 0 && (
          <div className="pg-notice warn">
            <Clock size={15} />
            <span>
              You have <strong>{pending.length} pending request{pending.length === 1 ? '' : 's'}</strong> waiting for
              admin review. {APPROVAL_SHORT}
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="pg-stats">
        <div className="pg-stat">
          <label>Available balance</label>
          <div className="value">${money(balance)}</div>
          <div className="hint">Ready to invest, send or withdraw</div>
        </div>
        <div className="pg-stat">
          <label>Locked bonus</label>
          <div className="value">{bonusLocked ? `$${money(bonus)}` : bonus > 0 ? 'Unlocked' : '$0.00'}</div>
          <div className="hint">{bonusLocked ? `$${money(data?.fundedAmount ?? 0)} of $1,000 funded` : 'No bonus waiting'}</div>
        </div>
        <div className="pg-stat">
          <label>Money in (this month)</label>
          <div className="value positive">+${money(data?.month?.in)}</div>
          <div className="hint">Completed deposits, bonuses & returns</div>
        </div>
        <div className="pg-stat">
          <label>Money out (this month)</label>
          <div className="value negative">-${money(data?.month?.out)}</div>
          <div className="hint">Withdrawals, investments & card funding</div>
        </div>
      </div>

      <div className="pg-grid-2">
        {/* Action card */}
        <div className="pg-card">
          <div className="pg-card-head">
            <div>
              <div className="pg-card-title">Move money</div>
              <div className="pg-card-sub">Every request is reviewed by our team before funds move.</div>
            </div>
          </div>

          <div className="pg-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`pg-tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => switchTab(t.id)}
                type="button"
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {msg && <div className={`pg-form-msg ${msg.type}`}>{msg.text}</div>}

          <form onSubmit={submit}>
            {(tab === 'send' || tab === 'request') && (
              <div className="pg-field">
                <label>{tab === 'send' ? 'Recipient email' : 'Who should pay you?'}</label>
                <input
                  type="email"
                  className="pg-input"
                  placeholder="jane@example.com"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="pg-field">
              <label>Amount</label>
              <div className="pg-amount-wrap">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="pg-input"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="pg-chips">
              {CHIPS.map((c) => (
                <button key={c} type="button" className="pg-chip" onClick={() => setAmount(String(c))}>
                  ${c.toLocaleString()}
                </button>
              ))}
            </div>

            {tab === 'deposit' && (
              <>
                <div className="pg-field">
                  <label>Send crypto to one of our verified addresses</label>
                  {addresses.length === 0 ? (
                    <div className="pg-form-msg info">
                      Deposit addresses haven't been published yet. Please check back shortly — our team adds them
                      regularly.
                    </div>
                  ) : (
                    <select
                      className="pg-select"
                      value={addressId}
                      onChange={(e) => setAddressId(e.target.value)}
                    >
                      {addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.currency} · {a.network}{a.label ? ` — ${a.label}` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedAddress && (
                  <div className="pg-address-box">
                    <div className="pg-address-label">
                      Your {selectedAddress.currency} deposit address ({selectedAddress.network})
                    </div>
                    <div className="pg-address-value">
                      <code>{selectedAddress.address}</code>
                      <button type="button" onClick={() => copy(selectedAddress.address, 'Address')}>
                        <Copy size={13} /> Copy
                      </button>
                    </div>
                  </div>
                )}

                <div className="pg-field">
                  <label>Transaction hash (TXID)</label>
                  <input
                    className="pg-input"
                    placeholder="Paste the hash from the wallet you sent from"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    maxLength={120}
                  />
                  <div className="pg-field-hint">
                    Found in your crypto wallet after sending. Our team matches it against the address above.
                  </div>
                </div>

                <div className="pg-balance-line">
                  <span>Balance after approval</span>
                  <strong>${money(balance + (Number(amount) || 0))}</strong>
                </div>
              </>
            )}

            {tab === 'withdraw' && (
              <>
                <div className="pg-field">
                  <label>Withdraw to</label>
                  <select className="pg-select" value={method} onChange={(e) => setMethod(e.target.value)}>
                    {WITHDRAW_METHODS.map((m) => (
                      <option key={m.id} value={m.id}>{m.label} — {m.sub}</option>
                    ))}
                  </select>
                </div>
                <div className="pg-balance-line">
                  <span>Available balance</span>
                  <strong>${money(balance)}</strong>
                </div>
                <div className="pg-note" style={{ marginTop: 10 }}>
                  Funds are reserved as soon as you submit and returned automatically if the request is declined.
                </div>
              </>
            )}

            {(tab === 'send' || tab === 'request') && (
              <div className="pg-field">
                <label>Note {tab === 'send' ? '(optional)' : ''}</label>
                <textarea
                  className="pg-textarea"
                  placeholder={tab === 'send' ? 'What is this for?' : 'What is this for? (shown to them)'}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                />
              </div>
            )}

            {tab === 'send' && (
              <div className="pg-balance-line">
                <span>Available balance</span>
                <strong>${money(balance)}</strong>
              </div>
            )}

            <button type="submit" className="pg-btn pg-btn-primary pg-btn-block" disabled={busy}>
              {busy ? 'Processing…' : submitLabel}
            </button>

            {tab !== 'request' && (
              <div className="pg-note" style={{ marginTop: 12 }}>
                <Clock size={12} style={{ verticalAlign: -2 }} /> {APPROVAL_SHORT}
              </div>
            )}

            {tab === 'request' && (
              <div className="pg-note" style={{ marginTop: 12 }}>
                They receive a notification with a one-click pay link — the money moves (and is reviewed by our team)
                the moment they accept.
              </div>
            )}
          </form>
        </div>

        {/* Payment methods + addresses */}
        <div className="pg-card">
          <div className="pg-card-head">
            <div>
              <div className="pg-card-title">Funding methods</div>
              <div className="pg-card-sub">Verified crypto addresses set by our admin</div>
            </div>
            <Link to="/dashboard/card" className="pg-btn pg-btn-ghost pg-btn-sm">
              <Plus size={14} /> Cards
            </Link>
          </div>

          <div className="pg-list">
            {addresses.length === 0 && !loading && (
              <div className="pg-list-item">
                <div className="pg-list-icon"><Coins size={16} /></div>
                <div className="pg-list-body">
                  <div className="pg-list-title">No addresses published yet</div>
                  <div className="pg-list-sub">Verified deposit addresses will appear here as soon as they're live.</div>
                </div>
              </div>
            )}
            {addresses.map((a) => (
              <div key={a.id} className="pg-list-item">
                <div className="pg-list-icon"><Coins size={16} /></div>
                <div className="pg-list-body">
                  <div className="pg-list-title">{a.currency} · {a.network}</div>
                  <div className="pg-list-sub" style={{ wordBreak: 'break-all' }}>{a.address}</div>
                </div>
                <button className="pg-btn pg-btn-ghost pg-btn-sm" onClick={() => copy(a.address, 'Address')}>
                  <Copy size={13} /> Copy
                </button>
              </div>
            ))}
            {WITHDRAW_METHODS.map((m) => (
              <div key={m.id} className="pg-list-item">
                <div className="pg-list-icon">{m.icon}</div>
                <div className="pg-list-body">
                  <div className="pg-list-title">{m.label}</div>
                  <div className="pg-list-sub">{m.sub}</div>
                </div>
                <span className="pg-badge green">Withdraw</span>
              </div>
            ))}
            {(data?.cards || []).map((c) => (
              <div key={c.id} className="pg-list-item" onClick={() => navigate('/dashboard/card')} style={{ cursor: 'pointer' }}>
                <div className="pg-list-icon"><CreditCard size={16} /></div>
                <div className="pg-list-body">
                  <div className="pg-list-title">{c.label}</div>
                  <div className="pg-list-sub">{c.masked} · ${money(c.balance)} on card</div>
                </div>
                <span className={`pg-badge ${c.frozen ? 'gray' : 'green'}`}>{c.frozen ? 'Frozen' : 'Active'}</span>
              </div>
            ))}
          </div>

          <div className="pg-note" style={{ marginTop: 14 }}>
            <strong>Need funds?</strong> Send crypto to one of the verified addresses above, paste the transaction
            hash, and your wallet is credited as soon as our team approves — usually within 3 working days.
          </div>
        </div>
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <div className="pg-card">
          <div className="pg-card-head">
            <div>
              <div className="pg-card-title">Waiting for approval</div>
              <div className="pg-card-sub">{pending.length} request{pending.length === 1 ? '' : 's'} in review</div>
            </div>
          </div>
          <div className="pg-list">
            {pending.map((r) => (
              <div key={r.id} className="pg-list-item">
                <TypeIcon type={r.type === 'TRANSFER' ? 'WITHDRAWAL' : r.type === 'CARD_TO_WALLET' ? 'DEPOSIT' : r.type === 'CARD_SEND' ? 'WITHDRAWAL' : r.type} />
                <div className="pg-list-body">
                  <div className="pg-list-title">
                    {REQUEST_META[r.type]?.label || r.type}
                    {r.recipientEmail ? ` · ${r.recipientEmail}` : ''}
                    {r.cardLast4 ? ` · card ••••${r.cardLast4}` : ''}
                  </div>
                  <div className="pg-list-sub">Submitted {fmtDateTime(r.createdAt)}</div>
                </div>
                <div className="pg-list-right">
                  <div className="pg-amount pos">+${money(r.amount)}</div>
                  <span className="pg-badge amber" style={{ marginTop: 4 }}>PENDING</span>
                </div>
              </div>
            ))}
          </div>
          <div className="pg-note" style={{ marginTop: 12 }}>
            <Clock size={12} style={{ verticalAlign: -2 }} /> {APPROVAL_SHORT} — we'll email you the moment it's
            reviewed.
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="pg-card">
        <div className="pg-card-head">
          <div>
            <div className="pg-card-title">Recent activity</div>
            <div className="pg-card-sub">Your latest {data?.recent?.length || 0} payments</div>
          </div>
          <Link to="/dashboard/account" className="pg-btn pg-btn-ghost pg-btn-sm">
            View all <ChevronRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="pg-list">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="pg-list-item">
                <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 10 }} />
                <div className="pg-list-body">
                  <div className="skeleton" style={{ width: '40%', height: 12, borderRadius: 6, marginBottom: 6 }} />
                  <div className="skeleton" style={{ width: '25%', height: 10, borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
        ) : (data?.recent || []).length === 0 ? (
          <div className="pg-empty">
            <Wallet size={44} />
            <h4>No payments yet</h4>
            <p>Make your first deposit and it will show up here once it's approved.</p>
          </div>
        ) : (
          <div className="pg-list">
            {data.recent.map((t) => (
              <div key={t.id} className="pg-list-item" onClick={() => navigate(`/dashboard/account?search=${encodeURIComponent(t.id.slice(0, 8))}`)} style={{ cursor: 'pointer' }}>
                <TypeIcon type={t.type} />
                <div className="pg-list-body">
                  <div className="pg-list-title">{txTitle(t)}</div>
                  <div className="pg-list-sub">{fmtDateTime(t.createdAt)}</div>
                </div>
                <div className="pg-list-right">
                  <div className={`pg-amount ${isIncoming(t.type) ? 'pos' : 'neg'}`}>
                    {isIncoming(t.type) ? '+' : '-'}${money(t.amount)}
                  </div>
                  <span className={`pg-badge ${STATUS_BADGE[t.status] || 'gray'}`} style={{ marginTop: 4 }}>
                    {t.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3-working-days approval confirmation */}
      <ApprovalDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={send}
        title={dialogTitle}
        summary={summary}
        busy={busy}
      />
    </>
  );
}
