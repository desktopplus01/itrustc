import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, requireApproved } from '../middleware/auth.js';
import {
  round2,
  parseAmount,
  ensureAccount,
  getMoneyState,
  APPROVAL_NOTICE,
  colorFromString,
  initialsFromEmail,
} from '../lib/helpers.js';
import {
  notifyDeposit,
  notifyWithdrawal,
  notifyTransferSent,
  notifyTransferReceived,
  notifyPaymentRequest,
  notifyCard,
  notifyRequestSubmitted,
  notifyAdminsNewRequest,
} from '../services/notifications.js';

const router = Router();

router.use(authenticate, requireApproved);

const DEPOSIT_METHODS = ['bank', 'card', 'crypto'];
const WITHDRAWAL_METHODS = ['bank', 'crypto'];

/** Everything the admin needs to review a request, plus friendly copy. */
function requestPayload(r) {
  return {
    id: r.id,
    type: r.type,
    amount: Number(r.amount),
    status: r.status,
    method: r.method,
    recipientEmail: r.recipientEmail,
    note: r.note,
    address: r.address,
    network: r.network,
    txHash: r.txHash,
    reviewNote: r.reviewNote,
    createdAt: r.createdAt,
    reviewedAt: r.reviewedAt,
    cardLast4: r.card?.last4 || null,
    cardLabel: r.card?.label || null,
  };
}

function maskCard(card) {
  return {
    id: card.id,
    label: card.label,
    brand: card.brand,
    last4: card.last4,
    expiry: card.expiry,
    frozen: card.frozen,
    balance: Number(card.balance),
    spendLimit: Number(card.spendLimit),
    createdAt: card.createdAt,
    masked: `**** **** **** ${card.last4}`,
  };
}

/** Validate an active deposit address and return its snapshot. */
async function resolveAddress(addressId) {
  if (!addressId) return { error: 'Choose one of our verified crypto addresses to send to.' };
  const addr = await prisma.depositAddress.findUnique({ where: { id: String(addressId) } });
  if (!addr || !addr.active) {
    return { error: 'That deposit address is no longer active. Please pick one of the current addresses.' };
  }
  return { addr };
}

function checkTxHash(txHash) {
  const hash = String(txHash || '').trim();
  if (hash.length < 8) {
    return { error: 'Paste the transaction hash (TXID) from your wallet so our team can verify the transfer.' };
  }
  return { hash: hash.slice(0, 120) };
}

async function submitRequest(userId, data) {
  const request = await prisma.request.create({ data: { userId, ...data } });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true },
  });
  notifyRequestSubmitted(userId, data.type, Number(data.amount)).catch(() => {});
  notifyAdminsNewRequest(user, data.type, Number(data.amount)).catch(() => {});
  return request;
}

// GET /api/payments — balance, bonus state, monthly totals, recent payments
router.get('/', async (req, res) => {
  try {
    const moneyState = await getMoneyState(req.user.id);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [recent, monthTxs, cards, pendingCount] = await Promise.all([
      prisma.transaction.findMany({
        where: { accountId: moneyState.accountId },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      prisma.transaction.findMany({
        where: { accountId: moneyState.accountId, createdAt: { gte: monthStart } },
      }),
      prisma.card.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.request.count({ where: { userId: req.user.id, status: 'PENDING' } }),
    ]);

    const isIn = (t) => t.type === 'DEPOSIT' || t.type === 'BONUS' || t.type === 'SELL' || t.type === 'RETURN';
    const isOut = (t) => t.type === 'WITHDRAWAL' || t.type === 'BUY' || t.type === 'INVEST' || t.type === 'CARD_FUND';

    const moneyIn = monthTxs.filter(isIn).reduce((s, t) => s + Number(t.amount), 0);
    const moneyOut = monthTxs.filter(isOut).reduce((s, t) => s + Number(t.amount), 0);

    res.json({
      balance: moneyState.available,
      totalBalance: moneyState.total,
      bonus: moneyState.bonus,
      bonusUnlocked: moneyState.bonusUnlocked,
      fundedAmount: moneyState.fundedAmount,
      bonusProgress: moneyState.bonusProgress,
      accountId: moneyState.accountId,
      pendingRequests: pendingCount,
      approvalNotice: APPROVAL_NOTICE,
      month: { in: round2(moneyIn), out: round2(moneyOut) },
      recent: recent.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        asset: t.asset,
        status: t.status,
        qty: t.qty != null ? Number(t.qty) : null,
        price: t.price != null ? Number(t.price) : null,
        createdAt: t.createdAt,
      })),
      methods: DEPOSIT_METHODS,
      cards: cards.map(maskCard),
    });
  } catch (error) {
    console.error('Payments summary error:', error);
    res.status(500).json({ error: 'We could not load your payments. Please refresh the page and try again.' });
  }
});

// GET /api/payments/addresses — admin-configured crypto deposit addresses
router.get('/addresses', async (req, res) => {
  try {
    const addresses = await prisma.depositAddress.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ addresses });
  } catch (error) {
    console.error('Addresses error:', error);
    res.status(500).json({ error: 'We could not load the deposit addresses. Please refresh and try again.' });
  }
});

// GET /api/payments/requests — this user's approval queue history
router.get('/requests', async (req, res) => {
  try {
    const { status, limit = '50' } = req.query;
    const where = { userId: req.user.id };
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) where.status = status;

    const requests = await prisma.request.findMany({
      where,
      take: Math.min(parseInt(limit) || 50, 200),
      orderBy: { createdAt: 'desc' },
      include: { card: { select: { last4: true, label: true } } },
    });

    res.json({
      requests: requests.map(requestPayload),
      approvalNotice: APPROVAL_NOTICE,
      pendingCount: requests.filter((r) => r.status === 'PENDING').length,
    });
  } catch (error) {
    console.error('Requests error:', error);
    res.status(500).json({ error: 'We could not load your requests. Please refresh the page and try again.' });
  }
});

// POST /api/payments/deposit { amount, addressId, txHash }
// Creates a PENDING deposit request — the admin credits the wallet on approval.
router.post('/deposit', async (req, res) => {
  try {
    const amount = parseAmount(req.body.amount);
    if (!amount) return res.status(400).json({ error: 'Enter an amount between $0.01 and $10,000,000.' });

    const method = DEPOSIT_METHODS.includes(req.body.method) ? req.body.method : 'crypto';
    const { error: addrError, addr } = await resolveAddress(req.body.addressId);
    if (addrError) return res.status(400).json({ error: addrError });

    const { error: hashError, hash } = checkTxHash(req.body.txHash);
    if (hashError) return res.status(400).json({ error: hashError });

    const account = await ensureAccount(req.user.id);

    const request = await prisma.$transaction(async (tx) => {
      const created = await tx.request.create({
        data: {
          userId: req.user.id,
          type: 'DEPOSIT',
          amount,
          method,
          address: addr.address,
          network: `${addr.currency} · ${addr.network}`,
          txHash: hash,
        },
      });
      await tx.transaction.create({
        data: {
          accountId: account.id,
          type: 'DEPOSIT',
          amount,
          asset: `USD · pending ${addr.currency} deposit`,
          status: 'PENDING',
        },
      });
      return created;
    });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    notifyRequestSubmitted(req.user.id, 'DEPOSIT', amount).catch(() => {});
    notifyAdminsNewRequest(user, 'DEPOSIT', amount).catch(() => {});
    notifyDeposit(req.user.id, amount).catch(() => {});

    const moneyState = await getMoneyState(req.user.id);
    res.status(201).json({
      message: `Deposit of $${amount.toLocaleString()} submitted. Our team will review it within 3 working days.`,
      notice: APPROVAL_NOTICE,
      balance: moneyState.available,
      request: requestPayload(request),
    });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ error: 'We could not submit your deposit. Please try again in a moment.' });
  }
});

// POST /api/payments/withdraw { amount, method }
// Funds are held immediately and returned automatically if the admin declines.
router.post('/withdraw', async (req, res) => {
  try {
    const amount = parseAmount(req.body.amount);
    if (!amount) return res.status(400).json({ error: 'Enter an amount between $0.01 and $10,000,000.' });

    const method = WITHDRAWAL_METHODS.includes(req.body.method) ? req.body.method : 'bank';
    const account = await ensureAccount(req.user.id);
    const balance = Number(account.balance);
    if (amount > balance) {
      return res.status(400).json({
        error: `You only have $${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} available. Enter a smaller amount.`,
      });
    }

    const request = await prisma.$transaction(async (tx) => {
      const created = await tx.request.create({
        data: { userId: req.user.id, type: 'WITHDRAWAL', amount, method },
      });
      await tx.account.update({ where: { id: account.id }, data: { balance: { decrement: amount } } });
      await tx.transaction.create({
        data: { accountId: account.id, type: 'WITHDRAWAL', amount, asset: 'USD', status: 'PENDING' },
      });
      return created;
    });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    notifyRequestSubmitted(req.user.id, 'WITHDRAWAL', amount).catch(() => {});
    notifyAdminsNewRequest(user, 'WITHDRAWAL', amount).catch(() => {});
    notifyWithdrawal(req.user.id, amount).catch(() => {});

    const moneyState = await getMoneyState(req.user.id);
    res.status(201).json({
      message: `Withdrawal of $${amount.toLocaleString()} submitted. Approval takes up to 3 working days.`,
      notice: APPROVAL_NOTICE,
      balance: moneyState.available,
      request: requestPayload(request),
    });
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({ error: 'We could not submit your withdrawal. Please try again in a moment.' });
  }
});

// POST /api/payments/transfer { recipientEmail, amount, note }
// Wallet → wallet send by email. Held until the admin approves.
router.post('/transfer', async (req, res) => {
  try {
    const { recipientEmail, note } = req.body;
    const amount = parseAmount(req.body.amount);
    if (!amount) return res.status(400).json({ error: 'Enter an amount between $0.01 and $10,000,000.' });
    if (!recipientEmail || typeof recipientEmail !== 'string') {
      return res.status(400).json({ error: "Enter the recipient's email address." });
    }

    const email = recipientEmail.trim().toLowerCase();
    if (email === req.user.email.toLowerCase()) {
      return res.status(400).json({ error: 'You cannot send money to yourself.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'That does not look like a valid email address. Please check it and try again.' });
    }

    const recipient = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, status: true, firstName: true, lastName: true },
    });
    if (!recipient) {
      return res.status(404).json({ error: `We could not find an account for ${email}. Double-check the email address.` });
    }
    if (recipient.status !== 'APPROVED') {
      return res.status(400).json({ error: `${email} cannot receive transfers yet — their account is still being set up.` });
    }

    const senderAccount = await ensureAccount(req.user.id);
    const recipientAccount = await ensureAccount(recipient.id);

    const balance = Number(senderAccount.balance);
    if (amount > balance) {
      return res.status(400).json({
        error: `You only have $${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} available. Enter a smaller amount.`,
      });
    }

    const request = await prisma.$transaction(async (tx) => {
      const created = await tx.request.create({
        data: {
          userId: req.user.id,
          type: 'TRANSFER',
          amount,
          recipientId: recipient.id,
          recipientEmail: email,
          note: note ? String(note).slice(0, 200) : null,
        },
      });
      await tx.account.update({ where: { id: senderAccount.id }, data: { balance: { decrement: amount } } });
      await tx.transaction.create({
        data: {
          accountId: senderAccount.id,
          type: 'WITHDRAWAL',
          amount,
          asset: `Transfer to ${email}`,
          status: 'PENDING',
        },
      });
      return created;
    });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    notifyRequestSubmitted(req.user.id, 'TRANSFER', amount).catch(() => {});
    notifyAdminsNewRequest(user, 'TRANSFER', amount).catch(() => {});
    notifyTransferSent(req.user.id, amount, email).catch(() => {});

    const moneyState = await getMoneyState(req.user.id);
    res.status(201).json({
      message: `Send of $${amount.toLocaleString()} to ${email} submitted. Approval takes up to 3 working days.`,
      notice: APPROVAL_NOTICE,
      balance: moneyState.available,
      request: requestPayload(request),
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: 'We could not submit your send request. Please try again in a moment.' });
  }
});

// POST /api/payments/request { toEmail, amount, note }
// Sends a payment request as a notification with a one-click pay link.
router.post('/request', async (req, res) => {
  try {
    const { toEmail, note } = req.body;
    const amount = parseAmount(req.body.amount);
    if (!amount) return res.status(400).json({ error: 'Enter an amount between $0.01 and $10,000,000.' });
    if (!toEmail || typeof toEmail !== 'string') return res.status(400).json({ error: "Enter who should pay you." });

    const email = toEmail.trim().toLowerCase();
    if (email === req.user.email.toLowerCase()) {
      return res.status(400).json({ error: 'You cannot request money from yourself.' });
    }

    const recipient = await prisma.user.findUnique({
      where: { email },
      select: { id: true, status: true },
    });
    if (!recipient) return res.status(404).json({ error: `We could not find an account for ${email}.` });
    if (recipient.status !== 'APPROVED') return res.status(400).json({ error: `${email} cannot receive requests yet.` });

    await Promise.all([
      notifyPaymentRequest(recipient.id, req.user.email, amount, note),
      notifyPaymentRequest(req.user.id, email, amount, `request sent to ${email}`),
    ]);

    res.status(201).json({ message: `Request for $${amount.toLocaleString()} sent to ${email}.` });
  } catch (error) {
    console.error('Request error:', error);
    res.status(500).json({ error: 'We could not send that money request. Please try again.' });
  }
});

// GET /api/payments/holdings — USD balance + per-asset crypto holdings
router.get('/holdings', async (req, res) => {
  try {
    const account = await ensureAccount(req.user.id);
    const txs = await prisma.transaction.findMany({
      where: { accountId: account.id, type: { in: ['BUY', 'SELL'] } },
    });

    const map = {};
    for (const t of txs) {
      const asset = t.asset || 'UNKNOWN';
      const qty = Number(t.qty || 0);
      if (!map[asset]) map[asset] = { asset, qty: 0, cost: 0 };
      if (t.type === 'BUY') {
        map[asset].qty += qty;
        map[asset].cost += Number(t.amount);
      } else {
        const sellQty = Math.min(qty, map[asset].qty);
        const avg = map[asset].qty > 0 ? map[asset].cost / map[asset].qty : 0;
        map[asset].qty -= sellQty;
        map[asset].cost = Math.max(0, map[asset].cost - sellQty * avg);
      }
    }

    res.json({
      usd: Number(account.balance),
      holdings: Object.values(map)
        .filter((h) => h.qty > 1e-10)
        .map((h) => ({ asset: h.asset, qty: round2(h.qty * 1e8) / 1e8, avgCost: h.qty > 0 ? h.cost / h.qty : 0 })),
    });
  } catch (error) {
    console.error('Holdings error:', error);
    res.status(500).json({ error: 'We could not load your holdings. Please refresh and try again.' });
  }
});

// POST /api/payments/trade { side, asset, amount?, qty?, price }
router.post('/trade', async (req, res) => {
  try {
    const { side, asset } = req.body;
    const price = Number(req.body.price);

    if (side !== 'BUY' && side !== 'SELL') return res.status(400).json({ error: 'Side must be BUY or SELL.' });
    if (!asset || typeof asset !== 'string') return res.status(400).json({ error: 'Asset is required.' });
    if (!Number.isFinite(price) || price <= 0) return res.status(400).json({ error: 'That price does not look valid.' });

    const account = await ensureAccount(req.user.id);

    if (side === 'BUY') {
      const amount = parseAmount(req.body.amount);
      if (!amount) return res.status(400).json({ error: 'Enter an amount between $0.01 and $10,000,000.' });

      const balance = Number(account.balance);
      if (amount > balance) {
        return res.status(400).json({
          error: `You only have $${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} available. Enter a smaller amount.`,
        });
      }

      const qty = round2((amount / price) * 1e8) / 1e8;
      const [tx] = await prisma.$transaction([
        prisma.transaction.create({
          data: { accountId: account.id, type: 'BUY', amount, asset, qty, price, status: 'COMPLETED' },
        }),
        prisma.account.update({ where: { id: account.id }, data: { balance: { decrement: amount } } }),
      ]);

      const updated = await prisma.account.findUnique({ where: { id: account.id } });
      return res.status(201).json({
        message: `Bought ${qty} ${asset} for $${amount.toLocaleString()}.`,
        balance: Number(updated.balance),
        fill: { qty, price, amount },
        transaction: { id: tx.id },
      });
    }

    // SELL
    const qty = Number(req.body.qty);
    if (!Number.isFinite(qty) || qty <= 0) return res.status(400).json({ error: 'Enter a valid quantity.' });

    const txs = await prisma.transaction.findMany({
      where: { accountId: account.id, type: { in: ['BUY', 'SELL'] }, asset },
    });
    const held = txs.reduce((sum, t) => sum + (t.type === 'BUY' ? Number(t.qty || 0) : -Number(t.qty || 0)), 0);

    if (qty > held + 1e-10) {
      return res.status(400).json({ error: `You only hold ${held.toFixed(8)} ${asset}. Enter a smaller quantity.` });
    }

    const amount = round2(qty * price);
    const [tx] = await prisma.$transaction([
      prisma.transaction.create({
        data: { accountId: account.id, type: 'SELL', amount, asset, qty: round2(qty * 1e8) / 1e8, price, status: 'COMPLETED' },
      }),
      prisma.account.update({ where: { id: account.id }, data: { balance: { increment: amount } } }),
    ]);

    const updated = await prisma.account.findUnique({ where: { id: account.id } });
    return res.status(201).json({
      message: `Sold ${qty} ${asset} for $${amount.toLocaleString()}.`,
      balance: Number(updated.balance),
      fill: { qty, price, amount },
      transaction: { id: tx.id },
    });
  } catch (error) {
    console.error('Trade error:', error);
    res.status(500).json({ error: 'We could not execute that trade. Please try again.' });
  }
});

// ── Virtual cards ──────────────────────────────────────────────
// Cards are funded ONLY by depositing crypto to the admin's verified
// addresses (approved by the admin), and can only be used to top up the main
// wallet or send money to another user on the app.

function generateCard() {
  let number = '4';
  for (let i = 0; i < 15; i++) number += Math.floor(Math.random() * 10);
  const now = new Date();
  const expiry = `${String(now.getMonth() + 1).padStart(2, '0')}/${String((now.getFullYear() + 4) % 100).padStart(2, '0')}`;
  const cvv = String(Math.floor(100 + Math.random() * 900));
  return { number, last4: number.slice(-4), expiry, cvv };
}

async function findOwnedCard(cardId, userId) {
  return prisma.card.findFirst({ where: { id: cardId, userId } });
}

/** Shared guards for card money movements. */
async function cardGuard(card, amount) {
  if (!card) return { error: 'That card no longer exists.' };
  if (card.frozen) return { error: 'This card is frozen. Unfreeze it before moving money.' };
  if (amount > Number(card.balance)) {
    return {
      error: `This card only holds $${Number(card.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}. Fund it first or enter a smaller amount.`,
    };
  }
  if (amount > Number(card.spendLimit)) {
    return {
      error: `That is above this card's $${Number(card.spendLimit).toLocaleString(undefined, { minimumFractionDigits: 2 })} limit. Raise the limit in card controls first.`,
    };
  }
  return {};
}

// GET /api/payments/cards
router.get('/cards', async (req, res) => {
  try {
    const cards = await prisma.card.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ cards: cards.map(maskCard), approvalNotice: APPROVAL_NOTICE });
  } catch (error) {
    console.error('List cards error:', error);
    res.status(500).json({ error: 'We could not load your cards. Please refresh and try again.' });
  }
});

// POST /api/payments/cards { label, spendLimit }
router.post('/cards', async (req, res) => {
  try {
    const label = (req.body.label || 'Virtual Card').toString().trim().slice(0, 40) || 'Virtual Card';
    const spendLimit = parseAmount(req.body.spendLimit ?? 5000, { min: 1, max: 1_000_000 });
    if (!spendLimit) return res.status(400).json({ error: 'The limit must be between $1 and $1,000,000.' });

    const existing = await prisma.card.count({ where: { userId: req.user.id } });
    if (existing >= 5) return res.status(400).json({ error: 'You can hold up to 5 cards. Delete one to create another.' });

    const generated = generateCard();
    const card = await prisma.card.create({
      data: { userId: req.user.id, label, ...generated, spendLimit },
    });

    notifyCard(req.user.id, 'Card Created', `Your new virtual card ending in ${card.last4} is ready. Fund it by sending crypto to one of our verified addresses.`).catch(() => {});

    res.status(201).json({
      card: maskCard(card),
      details: { number: card.number, cvv: card.cvv, expiry: card.expiry },
      message: 'Card created — save these details, they are only shown once.',
    });
  } catch (error) {
    console.error('Create card error:', error);
    res.status(500).json({ error: 'We could not create your card. Please try again.' });
  }
});

// POST /api/payments/cards/:id/fund { amount, addressId, txHash }
// The ONLY way to put money on a card: deposit crypto to a verified address.
router.post('/cards/:id/fund', async (req, res) => {
  try {
    const card = await findOwnedCard(req.params.id, req.user.id);
    if (!card) return res.status(404).json({ error: 'That card no longer exists.' });

    const amount = parseAmount(req.body.amount, { min: 1, max: 1_000_000 });
    if (!amount) return res.status(400).json({ error: 'Enter an amount between $1 and $1,000,000.' });
    if (card.frozen) return res.status(400).json({ error: 'This card is frozen. Unfreeze it before funding it.' });

    const { error: addrError, addr } = await resolveAddress(req.body.addressId);
    if (addrError) return res.status(400).json({ error: addrError });

    const { error: hashError, hash } = checkTxHash(req.body.txHash);
    if (hashError) return res.status(400).json({ error: hashError });

    const account = await ensureAccount(req.user.id);

    const request = await prisma.$transaction(async (tx) => {
      const created = await tx.request.create({
        data: {
          userId: req.user.id,
          type: 'CARD_FUND',
          amount,
          cardId: card.id,
          address: addr.address,
          network: `${addr.currency} · ${addr.network}`,
          txHash: hash,
          method: 'crypto',
        },
      });
      // Hold the wallet balance while the admin verifies the crypto transfer.
      await tx.account.update({ where: { id: account.id }, data: { balance: { decrement: amount } } });
      await tx.transaction.create({
        data: {
          accountId: account.id,
          type: 'CARD_FUND',
          amount,
          asset: `Card ••••${card.last4} · pending funding`,
          status: 'PENDING',
        },
      });
      return created;
    });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    notifyRequestSubmitted(req.user.id, 'CARD_FUND', amount).catch(() => {});
    notifyAdminsNewRequest(user, 'CARD_FUND', amount).catch(() => {});

    res.status(201).json({
      message: `Card funding of $${amount.toLocaleString()} submitted. Approval takes up to 3 working days.`,
      notice: APPROVAL_NOTICE,
      request: requestPayload(request),
    });
  } catch (error) {
    console.error('Card fund error:', error);
    res.status(500).json({ error: 'We could not submit the card funding request. Please try again.' });
  }
});

// POST /api/payments/cards/:id/to-wallet { amount } — card → main wallet
router.post('/cards/:id/to-wallet', async (req, res) => {
  try {
    const card = await findOwnedCard(req.params.id, req.user.id);
    const amount = parseAmount(req.body.amount, { min: 1, max: 1_000_000 });
    if (!amount) return res.status(400).json({ error: 'Enter an amount between $1 and $1,000,000.' });

    const guard = await cardGuard(card, amount);
    if (guard.error) return res.status(400).json({ error: guard.error });

    // Hold the card balance while the admin reviews.
    const request = await prisma.$transaction(async (tx) => {
      const created = await tx.request.create({
        data: {
          userId: req.user.id,
          type: 'CARD_TO_WALLET',
          amount,
          cardId: card.id,
          method: 'card',
        },
      });
      await tx.card.update({ where: { id: card.id }, data: { balance: { decrement: amount } } });
      return created;
    });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    notifyRequestSubmitted(req.user.id, 'CARD_TO_WALLET', amount).catch(() => {});
    notifyAdminsNewRequest(user, 'CARD_TO_WALLET', amount).catch(() => {});

    const updatedCard = await prisma.card.findUnique({ where: { id: card.id } });
    res.status(201).json({
      message: `Move of $${amount.toLocaleString()} from card ••••${card.last4} to your wallet submitted. Approval takes up to 3 working days.`,
      notice: APPROVAL_NOTICE,
      card: maskCard(updatedCard),
      request: requestPayload(request),
    });
  } catch (error) {
    console.error('Card to wallet error:', error);
    res.status(500).json({ error: 'We could not submit that transfer. Please try again.' });
  }
});

// POST /api/payments/cards/:id/send { recipientEmail, amount, note }
router.post('/cards/:id/send', async (req, res) => {
  try {
    const card = await findOwnedCard(req.params.id, req.user.id);
    const amount = parseAmount(req.body.amount, { min: 1, max: 1_000_000 });
    if (!amount) return res.status(400).json({ error: 'Enter an amount between $1 and $1,000,000.' });

    const guard = await cardGuard(card, amount);
    if (guard.error) return res.status(400).json({ error: guard.error });

    const recipientEmail = String(req.body.recipientEmail || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return res.status(400).json({ error: "Enter the recipient's email address." });
    }
    if (recipientEmail === req.user.email.toLowerCase()) {
      return res.status(400).json({ error: 'You cannot send money to yourself.' });
    }

    const recipient = await prisma.user.findUnique({
      where: { email: recipientEmail },
      select: { id: true, email: true, status: true, firstName: true, lastName: true },
    });
    if (!recipient) {
      return res.status(404).json({ error: `We could not find an account for ${recipientEmail}. Double-check the email address.` });
    }
    if (recipient.status !== 'APPROVED') {
      return res.status(400).json({ error: `${recipientEmail} cannot receive transfers yet — their account is still being set up.` });
    }

    const note = req.body.note ? String(req.body.note).slice(0, 200) : null;

    const request = await prisma.$transaction(async (tx) => {
      const created = await tx.request.create({
        data: {
          userId: req.user.id,
          type: 'CARD_SEND',
          amount,
          cardId: card.id,
          recipientId: recipient.id,
          recipientEmail,
          note,
          method: 'card',
        },
      });
      await tx.card.update({ where: { id: card.id }, data: { balance: { decrement: amount } } });
      return created;
    });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    notifyRequestSubmitted(req.user.id, 'CARD_SEND', amount).catch(() => {});
    notifyAdminsNewRequest(user, 'CARD_SEND', amount).catch(() => {});

    const updatedCard = await prisma.card.findUnique({ where: { id: card.id } });
    res.status(201).json({
      message: `Send of $${amount.toLocaleString()} to ${recipientEmail} from card ••••${card.last4} submitted. Approval takes up to 3 working days.`,
      notice: APPROVAL_NOTICE,
      card: maskCard(updatedCard),
      request: requestPayload(request),
    });
  } catch (error) {
    console.error('Card send error:', error);
    res.status(500).json({ error: 'We could not submit that send request. Please try again.' });
  }
});

// POST /api/payments/cards/:id/reveal — returns full number + CVV
router.post('/cards/:id/reveal', async (req, res) => {
  try {
    const card = await findOwnedCard(req.params.id, req.user.id);
    if (!card) return res.status(404).json({ error: 'That card no longer exists.' });
    res.json({ details: { number: card.number, cvv: card.cvv, expiry: card.expiry } });
  } catch (error) {
    console.error('Reveal card error:', error);
    res.status(500).json({ error: 'We could not reveal the card details. Please try again.' });
  }
});

// PATCH /api/payments/cards/:id { label?, frozen?, spendLimit? }
router.patch('/cards/:id', async (req, res) => {
  try {
    const card = await findOwnedCard(req.params.id, req.user.id);
    if (!card) return res.status(404).json({ error: 'That card no longer exists.' });

    const data = {};
    if (typeof req.body.label === 'string' && req.body.label.trim()) {
      data.label = req.body.label.trim().slice(0, 40);
    }
    if (typeof req.body.frozen === 'boolean') data.frozen = req.body.frozen;
    if (req.body.spendLimit !== undefined) {
      const limit = parseAmount(req.body.spendLimit, { min: 1, max: 1_000_000 });
      if (!limit) return res.status(400).json({ error: 'The limit must be between $1 and $1,000,000.' });
      data.spendLimit = limit;
    }

    const updated = await prisma.card.update({ where: { id: card.id }, data });

    if (typeof req.body.frozen === 'boolean' && req.body.frozen !== card.frozen) {
      notifyCard(
        req.user.id,
        req.body.frozen ? 'Card Frozen' : 'Card Unfrozen',
        `Your card ending in ${updated.last4} has been ${req.body.frozen ? 'frozen' : 'unfrozen'}.`
      ).catch(() => {});
    }

    res.json({
      card: maskCard(updated),
      message: req.body.frozen === true ? 'Card frozen — payments are blocked.' : 'Card updated.',
    });
  } catch (error) {
    console.error('Update card error:', error);
    res.status(500).json({ error: 'We could not update the card. Please try again.' });
  }
});

// DELETE /api/payments/cards/:id
router.delete('/cards/:id', async (req, res) => {
  try {
    const card = await findOwnedCard(req.params.id, req.user.id);
    if (!card) return res.status(404).json({ error: 'That card no longer exists.' });

    if (Number(card.balance) > 0) {
      return res.status(400).json({
        error: `This card still holds $${Number(card.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}. Move it to your wallet before deleting the card.`,
      });
    }

    const pending = await prisma.request.count({ where: { cardId: card.id, status: 'PENDING' } });
    if (pending > 0) {
      return res.status(400).json({ error: 'This card has a request waiting for approval. Once it is reviewed you can delete the card.' });
    }

    await prisma.card.delete({ where: { id: card.id } });
    res.json({ message: `Card ending in ${card.last4} deleted.` });
  } catch (error) {
    console.error('Delete card error:', error);
    res.status(500).json({ error: 'We could not delete the card. Please try again.' });
  }
});

export { colorFromString, initialsFromEmail };
export default router;
