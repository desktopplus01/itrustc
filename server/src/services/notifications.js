import prisma from '../lib/prisma.js';
import { BONUS_UNLOCK_THRESHOLD } from '../lib/helpers.js';

export async function createNotification(userId, { title, message, type = 'SYSTEM', link = null }) {
  try {
    return await prisma.notification.create({
      data: { userId, title, message, type, link },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

export async function notifyUserApproved(userId) {
  return createNotification(userId, {
    title: 'Account Approved',
    message: 'Your account has been approved! A $100 welcome bonus is yours — it unlocks once you fund $1,000 of your own money.',
    type: 'ACCOUNT',
    link: '/dashboard',
  });
}

export async function notifyUserRejected(userId) {
  return createNotification(userId, {
    title: 'Account Rejected',
    message: 'Your account application has been rejected. Please contact support for more information.',
    type: 'ACCOUNT',
  });
}

export async function notifyBonus(userId, amount) {
  return createNotification(userId, {
    title: 'Bonus Received',
    message: `You received a $${amount} welcome bonus. It stays locked — and can't be invested or sent — until you fund $1,000 of your own money.`,
    type: 'TRANSACTION',
    link: '/dashboard/invest',
  });
}

export async function notifyDeposit(userId, amount, asset = 'USD') {
  return createNotification(userId, {
    title: 'Deposit Confirmed',
    message: `Your deposit of $${Number(amount).toLocaleString()} ${asset} has been confirmed.`,
    type: 'TRANSACTION',
    link: '/dashboard/account',
  });
}

export async function notifyWithdrawal(userId, amount, asset = 'USD') {
  return createNotification(userId, {
    title: 'Withdrawal Processed',
    message: `Your withdrawal of $${Number(amount).toLocaleString()} ${asset} has been processed.`,
    type: 'TRANSACTION',
    link: '/dashboard/account',
  });
}

export async function notifyNewSignup(user) {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true },
  });

  const notifications = admins.map(admin =>
    createNotification(admin.id, {
      title: 'New User Registration',
      message: `${user.firstName} ${user.lastName} (${user.email}) has registered and is awaiting approval.`,
      type: 'SYSTEM',
      link: '/admin',
    })
  );

  return Promise.all(notifications);
}

export async function notifySecurity(userId, title, message) {
  return createNotification(userId, { title, message, type: 'SECURITY' });
}

export async function notifyTransferSent(userId, amount, recipientEmail) {
  return createNotification(userId, {
    title: 'Transfer Sent',
    message: `You sent $${Number(amount).toLocaleString()} to ${recipientEmail}.`,
    type: 'TRANSACTION',
    link: '/dashboard/account',
  });
}

export async function notifyTransferReceived(userId, amount, senderEmail) {
  return createNotification(userId, {
    title: 'Money Received',
    message: `You received $${Number(amount).toLocaleString()} from ${senderEmail}.`,
    type: 'TRANSACTION',
    link: '/dashboard/account',
  });
}

export async function notifyPaymentRequest(userId, requesterEmail, amount, note) {
  return createNotification(userId, {
    title: 'Payment Request',
    message: `${requesterEmail} requested $${Number(amount).toLocaleString()} from you${note ? ` — "${note}"` : ''}.`,
    type: 'TRANSACTION',
    link: `/dashboard/manage?tab=send&to=${encodeURIComponent(requesterEmail)}&amount=${amount}`,
  });
}

export async function notifyGoal(userId, title, message) {
  return createNotification(userId, {
    title,
    message,
    type: 'TRANSACTION',
    link: '/dashboard/goals',
  });
}

export async function notifyPlanChange(userId, plan) {
  return createNotification(userId, {
    title: 'Plan Updated',
    message: `Your account is now on the ${plan} plan.`,
    type: 'ACCOUNT',
    link: '/dashboard/settings',
  });
}

export async function notifyCard(userId, title, message) {
  return createNotification(userId, { title, message, type: 'SECURITY', link: '/dashboard/card' });
}

const REQUEST_LABELS = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  TRANSFER: 'send',
  CARD_FUND: 'card funding',
  CARD_TO_WALLET: 'card-to-wallet transfer',
  CARD_SEND: 'card send',
};

const money = (n) => `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export async function notifyRequestSubmitted(userId, type, amount) {
  return createNotification(userId, {
    title: 'Request submitted',
    message: `Your ${REQUEST_LABELS[type] || 'payment'} of ${money(amount)} is now pending review. Approval takes up to 3 working days.`,
    type: 'TRANSACTION',
    link: '/dashboard/account',
  });
}

export async function notifyRequestApproved(userId, type, amount) {
  return createNotification(userId, {
    title: 'Request approved',
    message: `Your ${REQUEST_LABELS[type] || 'payment'} of ${money(amount)} has been approved and completed.`,
    type: 'TRANSACTION',
    link: '/dashboard/account',
  });
}

export async function notifyRequestRejected(userId, type, amount, note) {
  return createNotification(userId, {
    title: 'Request declined',
    message: `Your ${REQUEST_LABELS[type] || 'payment'} of ${money(amount)} was declined${note ? ` — ${note}` : '. Any held funds were returned to you.'}`,
    type: 'TRANSACTION',
    link: '/dashboard/account',
  });
}

export async function notifyBonusUnlocked(userId, amount) {
  return createNotification(userId, {
    title: 'Welcome bonus unlocked',
    message: `You've funded ${money(BONUS_UNLOCK_THRESHOLD)} of your own money — your ${money(amount)} welcome bonus is now unlocked and ready to invest, send or withdraw.`,
    type: 'ACCOUNT',
    link: '/dashboard/invest',
  });
}

export async function notifyInvestmentCreated(userId, planName, amount) {
  return createNotification(userId, {
    title: 'Investment started',
    message: `${money(amount)} is now invested in the ${planName} plan. It's set in motion — watch it grow until maturity.`,
    type: 'TRANSACTION',
    link: '/dashboard/invest',
  });
}

export async function notifyInvestmentMatured(userId, planName, payout) {
  return createNotification(userId, {
    title: 'Investment matured',
    message: `Your ${planName} investment has matured. ${money(payout)} is ready to claim into your wallet.`,
    type: 'TRANSACTION',
    link: '/dashboard/invest',
  });
}

export async function notifyInvestmentClaimed(userId, amount) {
  return createNotification(userId, {
    title: 'Investment claimed',
    message: `${money(amount)} (principal + returns) has been added to your wallet.`,
    type: 'TRANSACTION',
    link: '/dashboard/invest',
  });
}

export async function notifyInvestmentAccrualMilestone(userId, investmentId, planName, earnedSoFar, percentComplete) {
  return createNotification(userId, {
    title: `${planName} investment ${percentComplete}% complete`,
    message: `Your ${planName} investment has earned ${money(earnedSoFar)} so far and is ${percentComplete}% through its term. Returns keep growing until maturity.`,
    type: 'TRANSACTION',
    link: '/dashboard/invest',
  });
}

/** Broadcast a new pending money request to every admin. */
export async function notifyAdminsNewRequest(user, type, amount) {
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
  return Promise.all(
    admins.map((admin) =>
      createNotification(admin.id, {
        title: 'New request to review',
        message: `${user.firstName} ${user.lastName} (${user.email}) submitted a ${REQUEST_LABELS[type] || 'payment'} of ${money(amount)}.`,
        type: 'SYSTEM',
        link: '/admin/approvals',
      })
    )
  );
}
