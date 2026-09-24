import prisma from './prisma.js';
import { round2, ensureAccount, unlockBonusIfEligible } from './helpers.js';
import {
  notifyRequestApproved,
  notifyRequestRejected,
  notifyTransferReceived,
  notifyBonusUnlocked,
  notifyCard,
} from '../services/notifications.js';
import { sendRequestUpdateEmail, sendBonusUnlockEmail } from '../services/email.js';

/**
 * Approval engine for every money movement that needs the admin's sign-off.
 *
 * Request-time behaviour (see routes/payments.js):
 *  - DEPOSIT / CARD_FUND   → wallet debited at request time (funds held) for
 *    CARD_FUND; DEPOSIT only records a pending inflow transaction. Balances
 *    are settled exactly once, here.
 *  - WITHDRAWAL / TRANSFER → sender wallet debited at request time (hold).
 *  - CARD_TO_WALLET / CARD_SEND → card balance debited at request time (hold).
 *
 * Approving settles the held funds; rejecting refunds them. Every path is a
 * single Prisma transaction so money can never be created or lost.
 */

const money = (n) =>
  `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function relabel(asset) {
  if (!asset) return asset;
  return asset
    .replace(/^Transfer to /, 'Send to ')
    .replace(/^Transfer from /, 'Received from ')
    .replace(/^Card send to /, 'Card send · ');
}

async function finishRequest(request, status, adminId, reviewNote) {
  return prisma.request.update({
    where: { id: request.id },
    data: {
      status,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      reviewNote: reviewNote || null,
    },
  });
}

export async function approveRequest(requestId, adminId, reviewNote = null) {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      card: { select: { id: true, last4: true, label: true, balance: true, frozen: true } },
    },
  });

  if (!request) return { ok: false, status: 404, error: 'That request no longer exists.' };
  if (request.status !== 'PENDING') {
    return { ok: false, status: 400, error: 'This request has already been reviewed.' };
  }

  const amount = Number(request.amount);
  const type = request.type;
  let bonusUnlockedNow = false;

  try {
    if (type === 'DEPOSIT') {
      // Funds were never held — credit the wallet now.
      const account = await ensureAccount(request.userId);
      await prisma.$transaction([
        prisma.account.update({ where: { id: account.id }, data: { balance: { increment: amount } } }),
        prisma.transaction.updateMany({
          where: { accountId: account.id, type: 'DEPOSIT', status: 'PENDING', amount },
          data: { status: 'COMPLETED' },
        }),
        prisma.user.update({
          where: { id: request.userId },
          data: { fundedAmount: { increment: amount } },
        }),
      ]);
      bonusUnlockedNow = await unlockBonusIfEligible(request.userId);
    } else if (type === 'WITHDRAWAL') {
      // Wallet was debited at request time — money simply leaves now.
      const account = await ensureAccount(request.userId);
      await prisma.$transaction([
        prisma.transaction.updateMany({
          where: { accountId: account.id, type: 'WITHDRAWAL', status: 'PENDING', amount },
          data: { status: 'COMPLETED' },
        }),
      ]);
    } else if (type === 'TRANSFER') {
      const senderAccount = await ensureAccount(request.userId);
      const recipientAccount = await ensureAccount(request.recipientId);
      await prisma.$transaction([
        prisma.transaction.updateMany({
          where: { accountId: senderAccount.id, type: 'WITHDRAWAL', status: 'PENDING', amount },
          data: { status: 'COMPLETED', asset: relabel(request.note ? `Transfer to ${request.recipientEmail}` : `Transfer to ${request.recipientEmail}`) },
        }),
        prisma.account.update({ where: { id: recipientAccount.id }, data: { balance: { increment: amount } } }),
        prisma.transaction.create({
          data: {
            accountId: recipientAccount.id,
            type: 'DEPOSIT',
            amount,
            asset: `Transfer from ${(request.user?.email || 'another user')}`,
            status: 'COMPLETED',
          },
        }),
      ]);
      notifyTransferReceived(request.recipientId, amount, request.user?.email || 'another user').catch(() => {});
    } else if (type === 'CARD_FUND') {
      if (!request.card) {
        return { ok: false, status: 400, error: 'The card linked to this request no longer exists.' };
      }
      const account = await ensureAccount(request.userId);
      await prisma.$transaction([
        prisma.card.update({ where: { id: request.card.id }, data: { balance: { increment: amount } } }),
        prisma.transaction.updateMany({
          where: { accountId: account.id, type: 'CARD_FUND', status: 'PENDING', amount },
          data: { status: 'COMPLETED' },
        }),
      ]);
      notifyCard(
        request.userId,
        'Card Funded',
        `${money(amount)} was added to your card ending in ${request.card.last4}.`
      ).catch(() => {});
    } else if (type === 'CARD_TO_WALLET') {
      if (!request.card) {
        return { ok: false, status: 400, error: 'The card linked to this request no longer exists.' };
      }
      const account = await ensureAccount(request.userId);
      await prisma.$transaction([
        prisma.account.update({ where: { id: account.id }, data: { balance: { increment: amount } } }),
        prisma.transaction.create({
          data: {
            accountId: account.id,
            type: 'DEPOSIT',
            amount,
            asset: `Card ${request.card.last4} → wallet`,
            status: 'COMPLETED',
          },
        }),
        prisma.user.update({
          where: { id: request.userId },
          data: { fundedAmount: { increment: amount } },
        }),
      ]);
      bonusUnlockedNow = await unlockBonusIfEligible(request.userId);
    } else if (type === 'CARD_SEND') {
      if (!request.card) {
        return { ok: false, status: 400, error: 'The card linked to this request no longer exists.' };
      }
      const recipientAccount = await ensureAccount(request.recipientId);
      await prisma.$transaction([
        prisma.account.update({ where: { id: recipientAccount.id }, data: { balance: { increment: amount } } }),
        prisma.transaction.create({
          data: {
            accountId: recipientAccount.id,
            type: 'DEPOSIT',
            amount,
            asset: `Transfer from ${request.user?.email || 'another user'} (card)`,
            status: 'COMPLETED',
          },
        }),
      ]);
      notifyTransferReceived(
        request.recipientId,
        amount,
        `${request.user?.email || 'another user'} (card)`
      ).catch(() => {});
    }

    const updated = await finishRequest(request, 'APPROVED', adminId, reviewNote);

    notifyRequestApproved(request.userId, type, amount).catch(() => {});
    sendRequestUpdateEmail(request.user, { type, amount, approved: true, note: reviewNote }).catch(() => {});
    if (bonusUnlockedNow) {
      notifyBonusUnlocked(request.userId, 100).catch(() => {});
      sendBonusUnlockEmail(request.user, 100).catch(() => {});
    }

    return { ok: true, request: updated, bonusUnlocked: bonusUnlockedNow };
  } catch (error) {
    console.error('Approve request error:', error);
    return { ok: false, status: 500, error: 'Something went wrong while approving this request. Please try again.' };
  }
}

export async function rejectRequest(requestId, adminId, reviewNote = null) {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      card: { select: { id: true, last4: true, label: true, balance: true } },
    },
  });

  if (!request) return { ok: false, status: 404, error: 'That request no longer exists.' };
  if (request.status !== 'PENDING') {
    return { ok: false, status: 400, error: 'This request has already been reviewed.' };
  }

  const amount = Number(request.amount);
  const type = request.type;

  try {
    if (type === 'DEPOSIT') {
      // Nothing was credited — just mark the pending inflow as failed.
      const account = await ensureAccount(request.userId);
      await prisma.transaction.updateMany({
        where: { accountId: account.id, type: 'DEPOSIT', status: 'PENDING', amount },
        data: { status: 'FAILED' },
      });
    } else if (type === 'WITHDRAWAL') {
      const account = await ensureAccount(request.userId);
      await prisma.$transaction([
        prisma.account.update({ where: { id: account.id }, data: { balance: { increment: amount } } }),
        prisma.transaction.updateMany({
          where: { accountId: account.id, type: 'WITHDRAWAL', status: 'PENDING', amount },
          data: { status: 'FAILED' },
        }),
        prisma.transaction.create({
          data: {
            accountId: account.id,
            type: 'DEPOSIT',
            amount,
            asset: 'Withdrawal returned — request declined',
            status: 'COMPLETED',
          },
        }),
      ]);
    } else if (type === 'TRANSFER') {
      const senderAccount = await ensureAccount(request.userId);
      await prisma.$transaction([
        prisma.account.update({ where: { id: senderAccount.id }, data: { balance: { increment: amount } } }),
        prisma.transaction.updateMany({
          where: { accountId: senderAccount.id, type: 'WITHDRAWAL', status: 'PENDING', amount },
          data: { status: 'FAILED' },
        }),
        prisma.transaction.create({
          data: {
            accountId: senderAccount.id,
            type: 'DEPOSIT',
            amount,
            asset: 'Transfer returned — request declined',
            status: 'COMPLETED',
          },
        }),
      ]);
    } else if (type === 'CARD_FUND') {
      const account = await ensureAccount(request.userId);
      await prisma.$transaction([
        prisma.account.update({ where: { id: account.id }, data: { balance: { increment: amount } } }),
        prisma.transaction.updateMany({
          where: { accountId: account.id, type: 'CARD_FUND', status: 'PENDING', amount },
          data: { status: 'FAILED' },
        }),
        prisma.transaction.create({
          data: {
            accountId: account.id,
            type: 'DEPOSIT',
            amount,
            asset: 'Card funding returned — request declined',
            status: 'COMPLETED',
          },
        }),
      ]);
    } else if (type === 'CARD_TO_WALLET' || type === 'CARD_SEND') {
      if (!request.card) {
        return { ok: false, status: 400, error: 'The card linked to this request no longer exists.' };
      }
      // Card balance was held at request time — give it back.
      await prisma.card.update({
        where: { id: request.card.id },
        data: { balance: { increment: amount } },
      });
    }

    const updated = await finishRequest(request, 'REJECTED', adminId, reviewNote);

    notifyRequestRejected(request.userId, type, amount, reviewNote).catch(() => {});
    sendRequestUpdateEmail(request.user, { type, amount, approved: false, note: reviewNote }).catch(() => {});

    return { ok: true, request: updated };
  } catch (error) {
    console.error('Reject request error:', error);
    return { ok: false, status: 500, error: 'Something went wrong while declining this request. Please try again.' };
  }
}

export { round2 };
