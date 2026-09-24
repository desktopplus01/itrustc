import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Eye, Copy, Snowflake, Sun, Trash2, Pencil, CreditCard,
  SlidersHorizontal, Check, Wallet, ArrowUpRight, Send, Coins, Clock, Lock,
} from 'lucide-react';
import api from '../lib/api';
import Modal from '../components/Modal';
import ApprovalDialog, { APPROVAL_NOTICE, APPROVAL_SHORT } from '../components/ApprovalDialog';
import { toast, refreshDashboard } from '../lib/toast';
import { money, fmtDateTime, REQUEST_META } from './format';
import './pages.css';

export default function CardsPage() {
  const [cards, setCards] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [balance, setBalance] = useState(0);
  const [bonusLocked, setBonusLocked] = useState(false);
  const [pending, setPending] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [revealData, setRevealData] = useState(null);
  const [limitOpen, setLimitOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Money-movement modals
  const [fundOpen, setFundOpen] = useState(false);
  const [toWalletOpen, setToWalletOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState(null); // 'fund' | 'toWallet' | 'send'

  const [label, setLabel] = useState('');
  const [limit, setLimit] = useState('');
  const [amount, setAmount] = useState('');
  const [addressId, setAddressId] = useState('');
  const [txHash, setTxHash] = useState('');
  const [recipient, setRecipient] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [c, p, a, r] = await Promise.all([
        api.getCards(),
        api.getPayments(),
        api.getDepositAddresses(),
        api.getMyRequests({ status: 'PENDING' }),
      ]);
      setCards(c.cards || []);
      setBalance(p.balance || 0);
      setBonusLocked(!p.bonusUnlocked && (p.bonus || 0) > 0);
      setAddresses(a.addresses || []);
      setPending((r.requests || []).filter((req) => req.type.startsWith('CARD')));
      setAddressId((prev) => prev || (a.addresses || [])[0]?.id || '');
      setSelectedId((prev) => prev || c.cards?.[0]?.id || null);
    } catch (e) {
      console.error('Cards load error:', e);
      toast(e.message || 'We could not load your cards. Please refresh and try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const card = cards.find((c) => c.id === selectedId) || cards[0] || null;
  const selectedAddress = addresses.find((a) => a.id === addressId);

  const copy = (text, what) => {
    navigator.clipboard?.writeText(text);
    toast(`${what} copied to your clipboard`, 'success');
  };

  const openCreate = () => {
    setLabel('');
    setLimit('5000');
    setError('');
    setCreateOpen(true);
  };

  const closeMoneyModals = () => {
    setFundOpen(false);
    setToWalletOpen(false);
    setSendOpen(false);
  };

  const closeAll = () => {
    closeMoneyModals();
    setDialogMode(null);
    setAmount('');
    setTxHash('');
    setRecipient('');
    setNote('');
    setError('');
  };

  const validateMoney = (mode) => {
    const amt = Number(amount);
    if (!amount || !Number.isFinite(amt) || amt <= 0) {
      setError('Enter an amount greater than $0 to continue.');
      return false;
    }
    if (mode === 'fund') {
      if (!addressId) {
        setError('Choose one of our verified crypto addresses to send to.');
        return false;
      }
      if (txHash.trim().length < 8) {
        setError('Paste the transaction hash (TXID) from your wallet so our team can verify the transfer.');
        return false;
      }
      if (amt > balance) {
        setError(`Your wallet only holds $${money(balance)}. The funds are reserved while your request is reviewed.`);
        return false;
      }
    }
    if ((mode === 'toWallet' || mode === 'send') && card) {
      if (card.frozen) {
        setError('This card is frozen. Unfreeze it before moving money.');
        return false;
      }
      if (amt > card.balance) {
        setError(`This card only holds $${money(card.balance)}. Fund it first or enter a smaller amount.`);
        return false;
      }
    }
    if (mode === 'send' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.trim())) {
      setError("Enter the recipient's email address, for example jane@example.com.");
      return false;
    }
    if (mode === 'send' && recipient.trim().toLowerCase() === '') {
      setError('Enter the recipient email.');
      return false;
    }
    return true;
  };

  const startMoney = (mode) => {
    setError('');
    if (!card && mode !== 'fund') return;
    if (mode === 'fund' && !card) return;
    if (!validateMoney(mode)) return;
    closeMoneyModals();
    setDialogMode(mode);
  };

  const submitMoney = async () => {
    if (!card) return;
    const mode = dialogMode;
    const amt = Number(amount);
    setBusy(true);
    try {
      let result;
      if (mode === 'fund') result = await api.fundCard(card.id, amt, addressId, txHash.trim());
      else if (mode === 'toWallet') result = await api.cardToWallet(card.id, amt);
      else result = await api.cardSend(card.id, recipient.trim(), amt, note.trim() || undefined);

      if (result.card) {
        setCards((prev) => prev.map((c) => (c.id === card.id ? result.card : c)));
      }
      closeAll();
      toast(result.message, 'success');
      refreshDashboard();
      await load();
    } catch (err) {
      setDialogMode(null);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const createCard = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.createCard(label.trim() || 'Virtual Card', Number(limit));
      setCards((prev) => [res.card, ...prev]);
      setSelectedId(res.card.id);
      setCreateOpen(false);
      setRevealData({ ...res.details, label: res.card.label, once: true });
      toast(res.message, 'success');
      refreshDashboard();
    } catch (err) {
      setError(err.message || 'We could not create your card. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const reveal = async () => {
    if (!card) return;
    try {
      const res = await api.revealCard(card.id);
      setRevealData({ ...res.details, label: card.label });
    } catch (err) {
      toast(err.message || 'We could not reveal the card details. Please try again.', 'error');
    }
  };

  const toggleFreeze = async () => {
    if (!card) return;
    try {
      const res = await api.updateCard(card.id, { frozen: !card.frozen });
      setCards((prev) => prev.map((c) => (c.id === card.id ? res.card : c)));
      toast(res.message || (res.card.frozen ? 'Card frozen — payments are blocked.' : 'Card unfrozen.'), 'success');
    } catch (err) {
      toast(err.message || 'We could not update the card. Please try again.', 'error');
    }
  };

  const saveLimit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.updateCard(card.id, { spendLimit: Number(limit) });
      setCards((prev) => prev.map((c) => (c.id === card.id ? res.card : c)));
      toast(`Limit set to $${money(res.card.spendLimit)}`, 'success');
      setLimitOpen(false);
    } catch (err) {
      setError(err.message || 'We could not update the limit. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const saveRename = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.updateCard(card.id, { label });
      setCards((prev) => prev.map((c) => (c.id === card.id ? res.card : c)));
      toast('Card renamed.', 'success');
      setRenameOpen(false);
    } catch (err) {
      setError(err.message || 'We could not rename the card. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const deleteCard = async () => {
    setBusy(true);
    try {
      const res = await api.deleteCard(card.id);
      setCards((prev) => prev.filter((c) => c.id !== card.id));
      setSelectedId(null);
      setDeleteOpen(false);
      toast(res.message, 'success');
      refreshDashboard();
    } catch (err) {
      toast(err.message || 'We could not delete the card. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const dialogTitles = {
    fund: 'Fund this card',
    toWallet: 'Move to your wallet',
    send: 'Send from this card',
  };

  const dialogSummary =
    dialogMode === 'fund'
      ? [
          ['Amount', `$${money(amount)}`],
          ['From', `${selectedAddress?.currency || ''} · ${selectedAddress?.network || ''}`],
          ['Wallet balance after approval', `$${money(balance - (Number(amount) || 0))}`],
        ]
      : dialogMode === 'toWallet'
        ? [
            ['Amount', `$${money(amount)}`],
            ['From', `Card ••••${card?.last4 || ''}`],
            ['To', 'Your main wallet'],
          ]
        : [
            ['Amount', `$${money(amount)}`],
            ['From', `Card ••••${card?.last4 || ''}`],
            ['Recipient', recipient.trim()],
          ];

  return (
    <>
      <div className="mon-header">
        <div>
          <h1>Cards</h1>
          <p>Fund cards with crypto, move money to your wallet or send to another user.</p>
        </div>
        <div className="pg-actions">
          <div className="pg-stat" style={{ padding: '10px 16px' }}>
            <label>Wallet balance</label>
            <div className="value" style={{ fontSize: 18 }}>${money(balance)}</div>
          </div>
          <button className="pg-btn pg-btn-primary pg-btn-sm" onClick={openCreate}>
            <Plus size={15} /> New card
          </button>
        </div>
      </div>

      <div className="pg-notice-stack">
        <div className="pg-notice info">
          <Clock size={15} />
          <span>{APPROVAL_NOTICE}</span>
        </div>
        <div className="pg-notice info">
          <Wallet size={15} />
          <span>
            Cards are funded <strong>only</strong> by sending crypto to our verified addresses, and can only be used
            to top up your main wallet or send money to another user on the app.
          </span>
        </div>
        {bonusLocked && (
          <div className="pg-notice warn">
            <Lock size={15} />
            <span>
              Your welcome bonus is locked until you've funded <strong>$1,000</strong> of your own money — locked
              bonus can't be moved onto a card.
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="pg-grid-2">
          <div className="skeleton" style={{ height: 260, borderRadius: 20 }} />
          <div className="skeleton" style={{ height: 200, borderRadius: 20 }} />
        </div>
      ) : cards.length === 0 ? (
        <div className="pg-card">
          <div className="pg-empty">
            <CreditCard size={44} />
            <h4>No cards yet</h4>
            <p>Create a virtual card, fund it with crypto to one of our verified addresses, then move the money to your wallet or send it to another user.</p>
            <button className="pg-btn pg-btn-primary" onClick={openCreate}>
              <Plus size={15} /> Create your first card
            </button>
          </div>
        </div>
      ) : (
        <div className="pg-grid-2">
          {/* Selected card + actions */}
          <div>
            <div className={`pg-visual-card ${card?.frozen ? 'frozen' : ''}`}>
              <div className="vc-top">
                <span className="vc-label">
                  {card?.label}
                  {card?.frozen && <span className="pg-badge gray" style={{ marginLeft: 8 }}>FROZEN</span>}
                </span>
                <span className="vc-brand">{card?.brand}</span>
              </div>
              <div className="vc-number">**** **** **** {card?.last4}</div>
              <div className="vc-bottom">
                <div className="vc-info">
                  <label>Card balance</label>
                  <span>${money(card?.balance)}</span>
                </div>
                <div className="vc-info">
                  <label>Valid Thru</label>
                  <span>{card?.expiry}</span>
                </div>
                <div className="vc-info">
                  <label>Transfer limit</label>
                  <span>${money(card?.spendLimit)}</span>
                </div>
              </div>
            </div>

            {/* Card money movements */}
            <div className="pg-card" style={{ marginTop: 16 }}>
              <div className="pg-card-head">
                <div>
                  <div className="pg-card-title">Move money</div>
                  <div className="pg-card-sub">Every movement needs admin approval first</div>
                </div>
              </div>

              <div className="pg-list">
                <div className="pg-list-item">
                  <div className="pg-list-icon"><Coins size={16} /></div>
                  <div className="pg-list-body">
                    <div className="pg-list-title">Fund card with crypto</div>
                    <div className="pg-list-sub">Send to a verified address, paste the TXID</div>
                  </div>
                  <button
                    className="pg-btn pg-btn-primary pg-btn-sm"
                    onClick={() => { setAmount(''); setTxHash(''); setFundOpen(true); }}
                    disabled={card?.frozen || addresses.length === 0}
                  >
                    Fund
                  </button>
                </div>

                <div className="pg-list-item">
                  <div className="pg-list-icon in"><Wallet size={16} /></div>
                  <div className="pg-list-body">
                    <div className="pg-list-title">Move to wallet</div>
                    <div className="pg-list-sub">Card balance → your main wallet (${money(card?.balance)} available)</div>
                  </div>
                  <button
                    className="pg-btn pg-btn-ghost pg-btn-sm"
                    onClick={() => { setAmount(''); setToWalletOpen(true); }}
                    disabled={card?.frozen || Number(card?.balance) <= 0}
                  >
                    Move
                  </button>
                </div>

                <div className="pg-list-item">
                  <div className="pg-list-icon"><Send size={16} /></div>
                  <div className="pg-list-body">
                    <div className="pg-list-title">Send to another user</div>
                    <div className="pg-list-sub">Pay any user on the app by their email address</div>
                  </div>
                  <button
                    className="pg-btn pg-btn-ghost pg-btn-sm"
                    onClick={() => { setAmount(''); setRecipient(''); setNote(''); setSendOpen(true); }}
                    disabled={card?.frozen || Number(card?.balance) <= 0}
                  >
                    Send
                  </button>
                </div>
              </div>

              <div className="pg-note" style={{ marginTop: 12 }}>
                <Clock size={12} style={{ verticalAlign: -2 }} /> {APPROVAL_SHORT}
              </div>
            </div>

            <div className="pg-card" style={{ marginTop: 16 }}>
              <div className="pg-card-head">
                <div>
                  <div className="pg-card-title">Card controls</div>
                  <div className="pg-card-sub">Everything here applies immediately</div>
                </div>
              </div>

              <div className="pg-list">
                <div className="pg-list-item">
                  <div className={`pg-list-icon ${card?.frozen ? '' : 'in'}`}>
                    {card?.frozen ? <Snowflake size={16} /> : <Sun size={16} />}
                  </div>
                  <div className="pg-list-body">
                    <div className="pg-list-title">{card?.frozen ? 'Card frozen' : 'Card active'}</div>
                    <div className="pg-list-sub">
                      {card?.frozen ? 'Money movements are blocked until you unfreeze' : 'Ready to use'}
                    </div>
                  </div>
                  <button className={`pg-btn pg-btn-sm ${card?.frozen ? 'pg-btn-primary' : 'pg-btn-ghost'}`} onClick={toggleFreeze}>
                    {card?.frozen ? 'Unfreeze' : 'Freeze'}
                  </button>
                </div>

                <div className="pg-list-item">
                  <div className="pg-list-icon"><SlidersHorizontal size={16} /></div>
                  <div className="pg-list-body">
                    <div className="pg-list-title">Transfer limit</div>
                    <div className="pg-list-sub">Currently ${money(card?.spendLimit)} per movement</div>
                  </div>
                  <button
                    className="pg-btn pg-btn-ghost pg-btn-sm"
                    onClick={() => { setLimit(String(card?.spendLimit)); setError(''); setLimitOpen(true); }}
                  >
                    Change
                  </button>
                </div>

                <div className="pg-list-item">
                  <div className="pg-list-icon"><Pencil size={16} /></div>
                  <div className="pg-list-body">
                    <div className="pg-list-title">Card name</div>
                    <div className="pg-list-sub">{card?.label}</div>
                  </div>
                  <button
                    className="pg-btn pg-btn-ghost pg-btn-sm"
                    onClick={() => { setLabel(card?.label || ''); setError(''); setRenameOpen(true); }}
                  >
                    Rename
                  </button>
                </div>

                <div className="pg-list-item">
                  <div className="pg-list-icon"><Eye size={16} /></div>
                  <div className="pg-list-body">
                    <div className="pg-list-title">Card details</div>
                    <div className="pg-list-sub">Full number, expiry and CVV</div>
                  </div>
                  <button className="pg-btn pg-btn-ghost pg-btn-sm" onClick={reveal}>
                    Reveal
                  </button>
                </div>

                <div className="pg-list-item">
                  <div className="pg-list-icon out"><Trash2 size={16} /></div>
                  <div className="pg-list-body">
                    <div className="pg-list-title">Delete card</div>
                    <div className="pg-list-sub">
                      {Number(card?.balance) > 0
                        ? `Move the $${money(card?.balance)} on this card first`
                        : 'Permanently remove this card'}
                    </div>
                  </div>
                  <button className="pg-btn pg-btn-danger pg-btn-sm" onClick={() => setDeleteOpen(true)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card list + requests */}
          <div>
            <div className="pg-card">
              <div className="pg-card-head">
                <div>
                  <div className="pg-card-title">Your cards</div>
                  <div className="pg-card-sub">{cards.length} of 5 cards used</div>
                </div>
                <button className="pg-btn pg-btn-ghost pg-btn-sm" onClick={openCreate} disabled={cards.length >= 5}>
                  <Plus size={14} /> Add
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cards.map((c) => (
                  <div
                    key={c.id}
                    className={`pg-card-list-item ${c.id === card?.id ? 'active' : ''}`}
                    onClick={() => setSelectedId(c.id)}
                  >
                    <div className="pg-card-chip" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="pg-list-title">{c.label}</div>
                      <div className="pg-list-sub">**** {c.last4} · exp {c.expiry}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`pg-badge ${c.frozen ? 'gray' : 'green'}`}>{c.frozen ? 'Frozen' : 'Active'}</span>
                      <div className="pg-list-sub" style={{ marginTop: 4 }}>${money(c.balance)} on card</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pg-note" style={{ marginTop: 14 }}>
                <Wallet size={12} style={{ verticalAlign: -2 }} /> Your wallet holds{' '}
                <strong>${money(balance)}</strong>. Cards only hold money you've funded with crypto.
              </div>
            </div>

            {/* Pending card requests */}
            <div className="pg-card" style={{ marginTop: 16 }}>
              <div className="pg-card-head">
                <div>
                  <div className="pg-card-title">Card requests in review</div>
                  <div className="pg-card-sub">{pending.length} waiting for approval</div>
                </div>
              </div>
              {pending.length === 0 ? (
                <div className="pg-empty" style={{ padding: '24px 16px' }}>
                  <Clock size={32} />
                  <h4>Nothing waiting</h4>
                  <p>Card funding and transfers appear here while our team reviews them.</p>
                </div>
              ) : (
                <div className="pg-list">
                  {pending.map((r) => (
                    <div key={r.id} className="pg-list-item">
                      <div className="pg-list-icon"><Clock size={16} /></div>
                      <div className="pg-list-body">
                        <div className="pg-list-title">
                          {REQUEST_META[r.type]?.label || r.type}
                          {r.recipientEmail ? ` · ${r.recipientEmail}` : ''}
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create a virtual card" subtitle="Fund it with crypto straight after.">
        <form onSubmit={createCard}>
          {error && <div className="pg-form-msg error">{error}</div>}
          <div className="pg-field">
            <label>Card name</label>
            <input
              className="pg-input"
              placeholder="e.g. Subscriptions"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={40}
            />
          </div>
          <div className="pg-field">
            <label>Transfer limit per movement</label>
            <div className="pg-amount-wrap">
              <input
                type="number"
                min="1"
                max="1000000"
                step="1"
                className="pg-input"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                required
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="pg-btn pg-btn-ghost" style={{ flex: 1 }} onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="pg-btn pg-btn-primary" style={{ flex: 2 }} disabled={busy}>
              {busy ? 'Creating…' : 'Create card'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Fund modal — crypto to verified address */}
      <Modal
        open={fundOpen}
        onClose={() => setFundOpen(false)}
        title="Fund card with crypto"
        subtitle="Send to a verified address, then paste the transaction hash."
      >
        <form onSubmit={(e) => { e.preventDefault(); startMoney('fund'); }}>
          {error && <div className="pg-form-msg error">{error}</div>}

          {addresses.length === 0 ? (
            <div className="pg-form-msg info">
              Deposit addresses haven't been published yet. Please check back shortly.
            </div>
          ) : (
            <>
              <div className="pg-field">
                <label>Send crypto to</label>
                <select className="pg-select" value={addressId} onChange={(e) => setAddressId(e.target.value)}>
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.currency} · {a.network}{a.label ? ` — ${a.label}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedAddress && (
                <div className="pg-address-box">
                  <div className="pg-address-label">
                    {selectedAddress.currency} address ({selectedAddress.network})
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
                <label>Amount to load (USD equivalent)</label>
                <div className="pg-amount-wrap">
                  <input
                    type="number"
                    min="1"
                    max="1000000"
                    step="0.01"
                    className="pg-input"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="pg-field">
                <label>Transaction hash (TXID)</label>
                <input
                  className="pg-input"
                  placeholder="Paste the hash from the wallet you sent from"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  maxLength={120}
                />
              </div>

              <div className="pg-balance-line">
                <span>Wallet balance</span>
                <strong>${money(balance)}</strong>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button type="button" className="pg-btn pg-btn-ghost" style={{ flex: 1 }} onClick={() => setFundOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="pg-btn pg-btn-primary" style={{ flex: 2 }}>
                  Continue
                </button>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* To wallet modal */}
      <Modal
        open={toWalletOpen}
        onClose={() => setToWalletOpen(false)}
        title="Move to your wallet"
        subtitle={`Card ••••${card?.last4 || ''} holds $${money(card?.balance)}`}
      >
        <form onSubmit={(e) => { e.preventDefault(); startMoney('toWallet'); }}>
          {error && <div className="pg-form-msg error">{error}</div>}
          <div className="pg-field">
            <label>Amount</label>
            <div className="pg-amount-wrap">
              <input
                type="number"
                min="1"
                step="0.01"
                className="pg-input"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="pg-chips">
            {[50, 100, 250].map((v) => (
              <button key={v} type="button" className="pg-chip" onClick={() => setAmount(String(Math.min(v, Number(card?.balance) || v)))}>
                ${v.toLocaleString()}
              </button>
            ))}
            <button
              type="button"
              className="pg-chip"
              onClick={() => setAmount(String(Number(card?.balance) || 0))}
            >
              All
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button type="button" className="pg-btn pg-btn-ghost" style={{ flex: 1 }} onClick={() => setToWalletOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="pg-btn pg-btn-primary" style={{ flex: 2 }}>
              Continue
            </button>
          </div>
        </form>
      </Modal>

      {/* Send from card modal */}
      <Modal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title="Send to another user"
        subtitle={`From card ••••${card?.last4 || ''} · $${money(card?.balance)} available`}
      >
        <form onSubmit={(e) => { e.preventDefault(); startMoney('send'); }}>
          {error && <div className="pg-form-msg error">{error}</div>}
          <div className="pg-field">
            <label>Recipient email</label>
            <input
              type="email"
              className="pg-input"
              placeholder="jane@example.com"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              autoFocus
            />
          </div>
          <div className="pg-field">
            <label>Amount</label>
            <div className="pg-amount-wrap">
              <input
                type="number"
                min="1"
                step="0.01"
                className="pg-input"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="pg-field">
            <label>Note (optional)</label>
            <textarea
              className="pg-textarea"
              placeholder="What is this for?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" className="pg-btn pg-btn-ghost" style={{ flex: 1 }} onClick={() => setSendOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="pg-btn pg-btn-primary" style={{ flex: 2 }}>
              Continue
            </button>
          </div>
        </form>
      </Modal>

      {/* Approval confirmation */}
      <ApprovalDialog
        open={!!dialogMode}
        onClose={() => setDialogMode(null)}
        onConfirm={submitMoney}
        title={dialogTitles[dialogMode] || 'Confirm'}
        summary={dialogSummary}
        busy={busy}
      />

      {/* Reveal modal */}
      <Modal
        open={!!revealData}
        onClose={() => setRevealData(null)}
        title="Card details"
        subtitle={revealData?.once ? 'Copy these now — they are only shown once.' : 'Keep these secret — never share your CVV.'}
      >
        {revealData && (
          <>
            <div className="pg-field">
              <label>Card number</label>
              <div className="pg-copy-line">
                {revealData.number.replace(/(.{4})/g, '$1 ').trim()}
                <button onClick={() => copy(revealData.number, 'Card number')}>Copy</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div className="pg-field">
                <label>Expiry</label>
                <div className="pg-copy-line">{revealData.expiry}</div>
              </div>
              <div className="pg-field">
                <label>CVV</label>
                <div className="pg-copy-line">
                  {revealData.cvv}
                  <button onClick={() => copy(revealData.cvv, 'CVV')}>Copy</button>
                </div>
              </div>
              <div className="pg-field">
                <label>Brand</label>
                <div className="pg-copy-line">{card?.brand || 'VISA'}</div>
              </div>
            </div>
            <button className="pg-btn pg-btn-primary pg-btn-block" onClick={() => setRevealData(null)}>
              <Check size={15} /> Done
            </button>
          </>
        )}
      </Modal>

      {/* Limit modal */}
      <Modal open={limitOpen} onClose={() => setLimitOpen(false)} title="Transfer limit" subtitle="The most this card can move per request.">
        <form onSubmit={saveLimit}>
          {error && <div className="pg-form-msg error">{error}</div>}
          <div className="pg-field">
            <label>Limit</label>
            <div className="pg-amount-wrap">
              <input
                type="number"
                min="1"
                max="1000000"
                className="pg-input"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>
          <div className="pg-chips">
            {[500, 1000, 2500, 5000].map((v) => (
              <button key={v} type="button" className="pg-chip" onClick={() => setLimit(String(v))}>${v.toLocaleString()}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="pg-btn pg-btn-ghost" style={{ flex: 1 }} onClick={() => setLimitOpen(false)}>Cancel</button>
            <button type="submit" className="pg-btn pg-btn-primary" style={{ flex: 2 }} disabled={busy}>
              {busy ? 'Saving…' : 'Save limit'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Rename modal */}
      <Modal open={renameOpen} onClose={() => setRenameOpen(false)} title="Rename card" subtitle="Give this card a name you will recognize.">
        <form onSubmit={saveRename}>
          {error && <div className="pg-form-msg error">{error}</div>}
          <div className="pg-field">
            <label>Card name</label>
            <input
              className="pg-input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={40}
              required
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="pg-btn pg-btn-ghost" style={{ flex: 1 }} onClick={() => setRenameOpen(false)}>Cancel</button>
            <button type="submit" className="pg-btn pg-btn-primary" style={{ flex: 2 }} disabled={busy}>
              {busy ? 'Saving…' : 'Save name'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete modal */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete this card?" subtitle={`Card ending ${card?.last4} will stop working immediately.`} width={420}>
        <div className="pg-form-msg error">
          {Number(card?.balance) > 0
            ? `Move the $${money(card?.balance)} on this card to your wallet first — deleting isn't possible while it holds funds.`
            : 'This cannot be undone. Any pending requests on this card must be reviewed first.'}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="pg-btn pg-btn-ghost" style={{ flex: 1 }} onClick={() => setDeleteOpen(false)}>Keep card</button>
          <button className="pg-btn pg-btn-danger" style={{ flex: 1 }} onClick={deleteCard} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete card'}
          </button>
        </div>
      </Modal>
    </>
  );
}
