import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { parseAmount, APPROVAL_NOTICE, WELCOME_BONUS, BONUS_UNLOCK_THRESHOLD } from '../lib/helpers.js';
import { approveRequest, rejectRequest } from '../lib/approvals.js';
import { sendApprovalEmail, sendRejectionEmail } from '../services/email.js';
import { notifyUserApproved, notifyUserRejected, notifyBonus, notifyNewSignup, createNotification } from '../services/notifications.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const pendingUsers = await prisma.user.count({ where: { status: 'PENDING' } });
    const approvedUsers = await prisma.user.count({ where: { status: 'APPROVED' } });
    const rejectedUsers = await prisma.user.count({ where: { status: 'REJECTED' } });

    const [totalBalance, pendingRequests, pendingCardTxs, activeInvestments, investedAgg, claimableAgg, lockedBonusAgg] =
      await Promise.all([
        prisma.account.aggregate({ _sum: { balance: true } }),
        prisma.request.count({ where: { status: 'PENDING', type: { in: ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER'] } } }),
        prisma.request.count({ where: { status: 'PENDING', type: { in: ['CARD_FUND', 'CARD_TO_WALLET', 'CARD_SEND'] } } }),
        prisma.investment.count({ where: { status: 'ACTIVE' } }),
        prisma.investment.aggregate({ _sum: { amount: true }, where: { status: { in: ['ACTIVE', 'MATURED'] } } }),
        prisma.investment.aggregate({
          _sum: { amount: true },
          where: { status: 'MATURED' },
        }),
        prisma.user.aggregate({ _sum: { bonusBalance: true } }),
      ]);

    const [maturedReturns, recentUsers, recentRequests] = await Promise.all([
      prisma.investment.aggregate({
        _sum: { expectedReturn: true },
        where: { status: 'MATURED' },
      }),
      prisma.user.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.request.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: 6,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          card: { select: { last4: true, label: true } },
        },
      }),
    ]);

    res.json({
      stats: {
        totalUsers,
        pendingUsers,
        approvedUsers,
        rejectedUsers,
        totalBalance: totalBalance._sum.balance || 0,
        pendingRequests,
        pendingCardTxs,
        activeInvestments,
        totalInvested: investedAgg._sum.amount || 0,
        claimablePrincipal: claimableAgg._sum.amount || 0,
        claimableReturns: maturedReturns._sum.expectedReturn || 0,
        lockedBonus: lockedBonusAgg._sum.bonusBalance || 0,
        bonusThreshold: BONUS_UNLOCK_THRESHOLD,
      },
      recentUsers,
      recentRequests: recentRequests.map((r) => ({
        id: r.id,
        type: r.type,
        amount: Number(r.amount),
        status: r.status,
        createdAt: r.createdAt,
        recipientEmail: r.recipientEmail,
        cardLast4: r.card?.last4 || null,
        user: r.user,
      })),
      approvalNotice: APPROVAL_NOTICE,
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'We could not load the dashboard stats. Please refresh and try again.' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { status, search, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        reviewedAt: true,
        accounts: { select: { balance: true } },
      },
    });

    const total = await prisma.user.count({ where });

    res.json({
      users: users.map(u => ({
        ...u,
        totalBalance: u.accounts.reduce((sum, a) => sum + Number(a.balance), 0),
      })),
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/pending', async (req, res) => {
  try {
    const pendingUsers = await prisma.user.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
      },
    });

    res.json({ users: pendingUsers });
  } catch (error) {
    console.error('Pending users error:', error);
    res.status(500).json({ error: 'Failed to fetch pending users' });
  }
});

router.post('/approve/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.status !== 'PENDING') {
      return res.status(400).json({ error: 'User is not pending approval' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        bonusBalance: WELCOME_BONUS,
        fundedAmount: 0,
        bonusUnlocked: false,
      },
    });

    // The wallet starts at $0 — the $100 bonus is held separately and stays
    // locked until the user funds $1,000 of their own money.
    const account = await prisma.account.create({
      data: {
        userId: id,
        label: 'Main Wallet',
        balance: 0,
      },
    });

    await prisma.transaction.create({
      data: {
        accountId: account.id,
        type: 'BONUS',
        amount: WELCOME_BONUS,
        asset: `USD — locked welcome bonus (unlocks at $${BONUS_UNLOCK_THRESHOLD.toLocaleString()} funded)`,
        status: 'COMPLETED',
      },
    });

    await sendApprovalEmail(user);
    await notifyUserApproved(id);
    await notifyBonus(id, WELCOME_BONUS);

    res.json({
      message: 'User approved successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        status: updatedUser.status,
      },
    });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

router.post('/reject/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.status !== 'PENDING') {
      return res.status(400).json({ error: 'User is not pending approval' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
      },
    });

    await sendRejectionEmail(user);
    await notifyUserRejected(id);

    res.json({
      message: 'User rejected',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        status: updatedUser.status,
      },
    });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({ error: 'Failed to reject user' });
  }
});

// POST /api/admin/users/:id/suspend — block access while keeping all data
router.post('/users/:id/suspend', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'ADMIN') return res.status(400).json({ error: 'Admin accounts cannot be suspended.' });
    if (user.status === 'SUSPENDED') return res.status(400).json({ error: 'This account is already suspended.' });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { status: 'SUSPENDED', reviewedBy: req.user.id, reviewedAt: new Date() },
    });

    await createNotification(user.id, {
      title: 'Account suspended',
      message: 'Your account has been suspended by an administrator. Please contact support if you believe this is a mistake.',
      type: 'ACCOUNT',
    });

    res.json({ message: `${user.firstName} ${user.lastName} has been suspended. They can no longer log in.`, user: { id: updated.id, status: updated.status } });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
});

// POST /api/admin/users/:id/unsuspend — restore a suspended account
router.post('/users/:id/unsuspend', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.status !== 'SUSPENDED') return res.status(400).json({ error: 'This account is not suspended.' });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { status: 'APPROVED', reviewedBy: req.user.id, reviewedAt: new Date() },
    });

    await createNotification(user.id, {
      title: 'Account restored',
      message: 'Your account suspension has been lifted — welcome back! You can sign in as usual.',
      type: 'ACCOUNT',
    });

    res.json({ message: `${user.firstName} ${user.lastName}'s account has been restored.`, user: { id: updated.id, status: updated.status } });
  } catch (error) {
    console.error('Unsuspend user error:', error);
    res.status(500).json({ error: 'Failed to restore user' });
  }
});

// DELETE /api/admin/users/:id — permanently remove the account and all its data
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'ADMIN') return res.status(400).json({ error: 'Admin accounts cannot be deleted.' });

    await prisma.user.delete({ where: { id: user.id } }); // cascades to accounts, cards, requests, investments, notifications, goals
    res.json({ message: `${user.firstName} ${user.lastName} (${user.email}) and all associated data have been permanently deleted.` });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ── Money request approvals (deposits, withdrawals, sends) ──────────

const REQUEST_TYPES = ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'CARD_FUND', 'CARD_TO_WALLET', 'CARD_SEND'];
const MONEY_TYPES = ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER'];
const CARD_TYPES = ['CARD_FUND', 'CARD_TO_WALLET', 'CARD_SEND'];

async function listRequests(query, typeFilter) {
  const { status, search, page = '1', limit = '20' } = query;
  const take = Math.min(parseInt(limit) || 20, 100);
  const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;
  const cleanSearch = search && !['undefined', 'null'].includes(search) ? search : null;

  const where = {};
  if (typeFilter) where.type = typeFilter;
  else where.type = { in: MONEY_TYPES };
  if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) where.status = status;
  if (cleanSearch) {
    where.OR = [
      { user: { email: { contains: cleanSearch, mode: 'insensitive' } } },
      { user: { firstName: { contains: cleanSearch, mode: 'insensitive' } } },
      { user: { lastName: { contains: cleanSearch, mode: 'insensitive' } } },
      { recipientEmail: { contains: cleanSearch, mode: 'insensitive' } },
      { txHash: { contains: cleanSearch, mode: 'insensitive' } },
    ];
  }

  const [requests, total, pendingCount] = await Promise.all([
    prisma.request.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, status: true },
        },
        card: { select: { id: true, label: true, last4: true, balance: true } },
      },
    }),
    prisma.request.count({ where }),
    prisma.request.count({ where: { status: 'PENDING', ...(typeFilter ? { type: typeFilter } : { type: { in: MONEY_TYPES } }) } }),
  ]);

  return {
    requests: requests.map((r) => ({
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
      reviewedAt: r.reviewedAt,
      createdAt: r.createdAt,
      cardId: r.cardId,
      card: r.card,
      user: r.user,
    })),
    total,
    page: Math.max(parseInt(page) || 1, 1),
    limit: take,
    pendingCount,
    approvalNotice: APPROVAL_NOTICE,
  };
}

// GET /api/admin/requests — wallet money movements awaiting review
router.get('/requests', async (req, res) => {
  try {
    res.json(await listRequests(req.query));
  } catch (error) {
    console.error('List requests error:', error);
    res.status(500).json({ error: 'We could not load the approval queue. Please refresh and try again.' });
  }
});

// GET /api/admin/card-transactions — card funding / card movement approvals
router.get('/card-transactions', async (req, res) => {
  try {
    res.json(await listRequests(req.query, { in: CARD_TYPES }));
  } catch (error) {
    console.error('List card transactions error:', error);
    res.status(500).json({ error: 'We could not load card transactions. Please refresh and try again.' });
  }
});

async function review(req, res, approve) {
  const { note } = req.body || {};
  const cleanNote = note ? String(note).trim().slice(0, 300) : null;
  const result = approve
    ? await approveRequest(req.params.id, req.user.id, cleanNote)
    : await rejectRequest(req.params.id, req.user.id, cleanNote);

  if (!result.ok) return res.status(result.status).json({ error: result.error });

  res.json({
    message: approve
      ? 'Request approved — the user has been notified by email.'
      : 'Request declined — any held funds were returned and the user has been notified.',
    request: { id: result.request.id, status: result.request.status },
    bonusUnlocked: result.bonusUnlocked || false,
  });
}

// POST /api/admin/requests/:id/approve
router.post('/requests/:id/approve', async (req, res) => {
  try {
    await review(req, res, true);
  } catch (error) {
    console.error('Approve error:', error);
    res.status(500).json({ error: 'We could not approve this request. Please try again.' });
  }
});

// POST /api/admin/requests/:id/reject { note? }
router.post('/requests/:id/reject', async (req, res) => {
  try {
    await review(req, res, false);
  } catch (error) {
    console.error('Reject error:', error);
    res.status(500).json({ error: 'We could not decline this request. Please try again.' });
  }
});

// ── Investment plans ────────────────────────────────────────────────

function validatePlanBody(body, { partial = false } = {}) {
  const data = {};
  const errors = [];

  if (!partial || body.name !== undefined) {
    const name = String(body.name || '').trim().slice(0, 60);
    if (!name) errors.push('Give the plan a name.');
    else data.name = name;
  }
  if (!partial || body.description !== undefined) {
    data.description = body.description ? String(body.description).trim().slice(0, 400) : null;
  }
  if (!partial || body.minAmount !== undefined) {
    const min = parseAmount(body.minAmount, { min: 1, max: 100_000_000 });
    if (!min) errors.push('Minimum investment must be at least $1.');
    else data.minAmount = min;
  }
  if (!partial || body.maxAmount !== undefined) {
    if (body.maxAmount === null || body.maxAmount === '') data.maxAmount = null;
    else {
      const max = parseAmount(body.maxAmount, { min: 1, max: 100_000_000 });
      if (!max) errors.push('Maximum investment must be at least $1, or leave it empty for no cap.');
      else data.maxAmount = max;
    }
  }
  if (!partial || body.durationDays !== undefined) {
    const days = parseInt(body.durationDays, 10);
    if (!Number.isFinite(days) || days < 1 || days > 3650) errors.push('Duration must be between 1 and 3650 days.');
    else data.durationDays = days;
  }
  if (!partial || body.returnPercent !== undefined) {
    const pct = Number(body.returnPercent);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 1000) errors.push('Return must be a percentage greater than 0 (max 1000).');
    else data.returnPercent = Math.round(pct * 100) / 100;
  }
  if (body.active !== undefined) data.active = Boolean(body.active);

  if (data.minAmount != null && data.maxAmount != null && data.maxAmount < data.minAmount) {
    errors.push('Maximum investment cannot be lower than the minimum.');
  }

  return { data, errors };
}

// GET /api/admin/plans — every plan (including inactive)
router.get('/plans', async (req, res) => {
  try {
    const plans = await prisma.investmentPlan.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { investments: true } } },
    });
    res.json({
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        minAmount: Number(p.minAmount),
        maxAmount: p.maxAmount != null ? Number(p.maxAmount) : null,
        durationDays: p.durationDays,
        returnPercent: Number(p.returnPercent),
        active: p.active,
        investorCount: p._count.investments,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error('List plans error:', error);
    res.status(500).json({ error: 'We could not load the investment plans. Please refresh and try again.' });
  }
});

// POST /api/admin/plans
router.post('/plans', async (req, res) => {
  try {
    const { data, errors } = validatePlanBody(req.body);
    if (errors.length) return res.status(400).json({ error: errors[0] });

    const plan = await prisma.investmentPlan.create({ data });
    res.status(201).json({ message: `Plan "${plan.name}" created.`, plan: { ...plan, minAmount: Number(plan.minAmount), returnPercent: Number(plan.returnPercent) } });
  } catch (error) {
    console.error('Create plan error:', error);
    res.status(500).json({ error: 'We could not create the plan. Please try again.' });
  }
});

// PUT /api/admin/plans/:id
router.put('/plans/:id', async (req, res) => {
  try {
    const existing = await prisma.investmentPlan.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'That plan no longer exists.' });

    const { data, errors } = validatePlanBody(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors[0] });

    const merged = { ...data };
    if (merged.minAmount != null && (merged.maxAmount ?? (existing.maxAmount != null ? Number(existing.maxAmount) : null)) != null) {
      const max = merged.maxAmount ?? Number(existing.maxAmount);
      const min = merged.minAmount ?? Number(existing.minAmount);
      if (max < min) return res.status(400).json({ error: 'Maximum investment cannot be lower than the minimum.' });
    }

    const plan = await prisma.investmentPlan.update({ where: { id: existing.id }, data: merged });
    res.json({ message: `Plan "${plan.name}" updated.`, plan: { ...plan, minAmount: Number(plan.minAmount), returnPercent: Number(plan.returnPercent) } });
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({ error: 'We could not update the plan. Please try again.' });
  }
});

// DELETE /api/admin/plans/:id — deactivates if investors still hold it
router.delete('/plans/:id', async (req, res) => {
  try {
    const plan = await prisma.investmentPlan.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { investments: true } } },
    });
    if (!plan) return res.status(404).json({ error: 'That plan no longer exists.' });

    if (plan._count.investments > 0) {
      await prisma.investmentPlan.update({ where: { id: plan.id }, data: { active: false } });
      return res.json({ message: `Plan "${plan.name}" is now hidden from investors. Existing investments keep running.` });
    }

    await prisma.investmentPlan.delete({ where: { id: plan.id } });
    res.json({ message: `Plan "${plan.name}" deleted.` });
  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({ error: 'We could not delete the plan. Please try again.' });
  }
});

// ── Crypto deposit addresses ────────────────────────────────────────

function validateAddressBody(body, { partial = false } = {}) {
  const data = {};
  const errors = [];

  if (!partial || body.currency !== undefined) {
    const currency = String(body.currency || '').trim().toUpperCase().slice(0, 20);
    if (!currency) errors.push('Enter the currency, e.g. BTC or USDT.');
    else data.currency = currency;
  }
  if (!partial || body.network !== undefined) {
    const network = String(body.network || '').trim().slice(0, 40);
    if (!network) errors.push('Enter the network, e.g. TRC-20 or Bitcoin.');
    else data.network = network;
  }
  if (!partial || body.address !== undefined) {
    const address = String(body.address || '').trim().slice(0, 200);
    if (address.length < 10) errors.push('Paste the full wallet address (at least 10 characters).');
    else data.address = address;
  }
  if (body.label !== undefined) data.label = body.label ? String(body.label).trim().slice(0, 60) : null;
  if (body.active !== undefined) data.active = Boolean(body.active);

  return { data, errors };
}

// GET /api/admin/addresses
router.get('/addresses', async (req, res) => {
  try {
    const addresses = await prisma.depositAddress.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ addresses });
  } catch (error) {
    console.error('List addresses error:', error);
    res.status(500).json({ error: 'We could not load deposit addresses. Please refresh and try again.' });
  }
});

// POST /api/admin/addresses
router.post('/addresses', async (req, res) => {
  try {
    const { data, errors } = validateAddressBody(req.body);
    if (errors.length) return res.status(400).json({ error: errors[0] });

    const address = await prisma.depositAddress.create({ data });
    res.status(201).json({ message: `${address.currency} address added — users can now fund with it.`, address });
  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json({ error: 'We could not add the address. Please try again.' });
  }
});

// PUT /api/admin/addresses/:id
router.put('/addresses/:id', async (req, res) => {
  try {
    const existing = await prisma.depositAddress.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'That address no longer exists.' });

    const { data, errors } = validateAddressBody(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors[0] });

    const address = await prisma.depositAddress.update({ where: { id: existing.id }, data });
    res.json({ message: 'Address updated.', address });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ error: 'We could not update the address. Please try again.' });
  }
});

// DELETE /api/admin/addresses/:id
router.delete('/addresses/:id', async (req, res) => {
  try {
    const existing = await prisma.depositAddress.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'That address no longer exists.' });

    await prisma.depositAddress.delete({ where: { id: existing.id } });
    res.json({ message: `${existing.currency} address removed.` });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ error: 'We could not remove the address. Please try again.' });
  }
});

export default router;
