/** Shared display helpers for transactions/money across dashboard pages. */

export const money = (n, opts = {}) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...opts,
  });

export const moneySigned = (n) => `${Number(n) >= 0 ? '+' : '-'}$${money(Math.abs(n))}`;

export function fmtDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtDateTime(d) {
  const date = new Date(d);
  return `${fmtDate(d)} · ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
}

export function timeAgo(d) {
  const seconds = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(d);
}

/** Incoming transaction types increase the balance. */
export const isIncoming = (type) =>
  type === 'DEPOSIT' || type === 'BONUS' || type === 'SELL' || type === 'RETURN';

export const TYPE_META = {
  DEPOSIT: { label: 'Deposit', badge: 'green' },
  WITHDRAWAL: { label: 'Withdrawal', badge: 'red' },
  BUY: { label: 'Buy', badge: 'blue' },
  SELL: { label: 'Sell', badge: 'amber' },
  BONUS: { label: 'Bonus', badge: 'purple' },
  INVEST: { label: 'Investment', badge: 'purple' },
  RETURN: { label: 'Investment return', badge: 'green' },
  CARD_FUND: { label: 'Card funding', badge: 'blue' },
};

/** Human labels for admin-approval request types. */
export const REQUEST_META = {
  DEPOSIT: { label: 'Deposit', badge: 'green' },
  WITHDRAWAL: { label: 'Withdrawal', badge: 'red' },
  TRANSFER: { label: 'Send money', badge: 'blue' },
  CARD_FUND: { label: 'Card funding', badge: 'purple' },
  CARD_TO_WALLET: { label: 'Card → wallet', badge: 'green' },
  CARD_SEND: { label: 'Card send', badge: 'blue' },
};

export function txTitle(t) {
  if (t.asset && t.asset.startsWith('Transfer ')) return t.asset;
  if (t.asset && t.asset.startsWith('Send to ')) return t.asset;
  if (t.asset && t.asset.startsWith('Received from')) return t.asset;
  if (t.asset && t.asset.startsWith('Goal refund')) return t.asset;
  if (t.asset && t.asset.startsWith('Goal ·')) return t.asset;
  if (t.asset && t.asset.startsWith('Investment')) return t.asset;
  if (t.type === 'BUY') return `Bought ${t.asset || 'crypto'}`;
  if (t.type === 'SELL') return `Sold ${t.asset || 'crypto'}`;
  if (t.type === 'DEPOSIT') return t.asset && t.asset.startsWith('Card') ? t.asset : 'Deposit';
  if (t.type === 'WITHDRAWAL') return 'Withdrawal';
  if (t.type === 'BONUS') return 'Welcome bonus';
  if (t.type === 'INVEST') return t.asset || 'Investment';
  if (t.type === 'RETURN') return t.asset || 'Investment return';
  if (t.type === 'CARD_FUND') return t.asset || 'Card funding';
  return t.asset || 'Transaction';
}

export const STATUS_BADGE = {
  COMPLETED: 'green',
  PENDING: 'amber',
  FAILED: 'red',
};
