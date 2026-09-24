import prisma from './prisma.js';

/** Round to 2 decimals safely (avoids float artifacts like 0.30000000000000004). */
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Shown on every money-moving flow — see requirement: approvals take 3 working days. */
export const APPROVAL_NOTICE =
  'All deposits, funding, withdrawals and sends are reviewed by our team. Approval takes up to 3 working days.';

/** Amount of the user's own money that must be funded before the $100 bonus unlocks. */
export const BONUS_UNLOCK_THRESHOLD = 1000;
export const WELCOME_BONUS = 100;

/**
 * Parse and validate a monetary amount coming from the client.
 * Returns a Number or null when invalid.
 */
export function parseAmount(value, { min = 0.01, max = 10_000_000 } = {}) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  const rounded = round2(amount);
  if (rounded < min || rounded > max) return null;
  return rounded;
}

/**
 * Every approved user should have at least one account; older rows may have
 * been approved through paths that skipped account creation. This creates the
 * default account on first use so deposits/trades never fail.
 */
export async function ensureAccount(userId) {
  const existing = await prisma.account.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  if (existing) return existing;
  return prisma.account.create({
    data: { userId, label: 'Crypto IRA', balance: 0 },
  });
}

/** Stable pastel-ish color derived from a string (used for recipient avatars). */
export function colorFromString(str = '') {
  const palette = ['#FF6B35', '#7B61FF', '#00D4AA', '#FF4D4D', '#FFC72C', '#4A90D9', '#EC4899', '#14B8A6'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

/**
 * Snapshot of everything that affects what a user can spend:
 *  - available: money in the main wallet (the $100 bonus lives outside it
 *    until it is unlocked, so it can never be invested or sent early)
 *  - bonus: the locked welcome bonus
 *  - total: available + bonus (what the UI displays as "total balance")
 */
export async function getMoneyState(userId) {
  const [user, account] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { bonusBalance: true, fundedAmount: true, bonusUnlocked: true },
    }),
    ensureAccount(userId),
  ]);

  const available = Number(account.balance);
  const bonus = Number(user.bonusBalance || 0);
  const funded = Number(user.fundedAmount || 0);

  return {
    accountId: account.id,
    available,
    bonus,
    bonusUnlocked: user.bonusUnlocked,
    fundedAmount: funded,
    bonusProgress: Math.min(1, funded / BONUS_UNLOCK_THRESHOLD),
    total: round2(available + bonus),
  };
}

/**
 * Once the user has funded BONUS_UNLOCK_THRESHOLD of their own money the
 * welcome bonus stops being locked: it is moved into the wallet and flagged
 * as unlocked. Safe to call after every approved deposit.
 * Returns true when the unlock happened during this call.
 */
export async function unlockBonusIfEligible(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, bonusBalance: true, fundedAmount: true, bonusUnlocked: true },
  });
  if (!user || user.bonusUnlocked || Number(user.bonusBalance) <= 0) return false;
  if (Number(user.fundedAmount) < BONUS_UNLOCK_THRESHOLD) return false;

  const bonus = Number(user.bonusBalance);
  const account = await ensureAccount(userId);

  await prisma.$transaction([
    prisma.account.update({ where: { id: account.id }, data: { balance: { increment: bonus } } }),
    prisma.user.update({
      where: { id: userId },
      data: { bonusUnlocked: true, bonusBalance: 0 },
    }),
    prisma.transaction.create({
      data: { accountId: account.id, type: 'BONUS', amount: bonus, asset: 'USD — welcome bonus unlocked', status: 'COMPLETED' },
    }),
  ]);

  return true;
}

/** Initials from an email like "jane.doe@example.com" → "JD". */
export function initialsFromEmail(email = '') {
  const local = email.split('@')[0] || '?';
  const parts = local.split(/[._\-+]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}
