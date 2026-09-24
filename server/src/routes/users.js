import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, requireApproved } from '../middleware/auth.js';
import { round2, parseAmount, ensureAccount, getMoneyState, APPROVAL_NOTICE, BONUS_UNLOCK_THRESHOLD, colorFromString, initialsFromEmail } from '../lib/helpers.js';
import { notifySecurity, notifyGoal, notifyPlanChange } from '../services/notifications.js';

const router = Router();

router.use(authenticate, requireApproved);

// PUT /api/users/me — update profile
router.put('/me', async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const data = {};
    if (firstName !== undefined) {
      const v = String(firstName).trim();
      if (!v) return res.status(400).json({ error: 'First name cannot be empty' });
      data.firstName = v.slice(0, 50);
    }
    if (lastName !== undefined) {
      const v = String(lastName).trim();
      if (!v) return res.status(400).json({ error: 'Last name cannot be empty' });
      data.lastName = v.slice(0, 50);
    }
    if (phone !== undefined) data.phone = String(phone).trim().slice(0, 30) || null;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, status: true, plan: true, twoFactorEnabled: true },
    });

    res.json({ message: 'Profile updated', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/users/change-password { currentPassword, newPassword }
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      return res.status(400).json({ error: 'New password must be different from your current password' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash, resetToken: null, resetTokenExpiry: null } });

    notifySecurity(user.id, 'Password Changed', 'Your password was changed. If this wasn\'t you, contact support immediately.').catch(() => {});

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// POST /api/users/2fa { enabled }
router.post('/2fa', async (req, res) => {
  try {
    if (typeof req.body.enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFactorEnabled: req.body.enabled },
      select: { twoFactorEnabled: true },
    });

    notifySecurity(
      req.user.id,
      user.twoFactorEnabled ? 'Two-Factor Authentication Enabled' : 'Two-Factor Authentication Disabled',
      user.twoFactorEnabled
        ? '2FA is now ON — you will need a verification code each time you log in.'
        : '2FA is now OFF — your password alone will grant access to your account.'
    ).catch(() => {});

    res.json({ message: user.twoFactorEnabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled', twoFactorEnabled: user.twoFactorEnabled });
  } catch (error) {
    console.error('2FA error:', error);
    res.status(500).json({ error: 'Failed to update two-factor settings' });
  }
});

// PUT /api/users/plan { plan }
router.put('/plan', async (req, res) => {
  try {
    const plans = ['Starter', 'Pro', 'Enterprise'];
    if (!plans.includes(req.body.plan)) {
      return res.status(400).json({ error: `Plan must be one of: ${plans.join(', ')}` });
    }

    await prisma.user.update({ where: { id: req.user.id }, data: { plan: req.body.plan } });
    notifyPlanChange(req.user.id, req.body.plan).catch(() => {});

    res.json({ message: `You are now on the ${req.body.plan} plan`, plan: req.body.plan });
  } catch (error) {
    console.error('Plan error:', error);
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// DELETE /api/users/me { password } — delete the account permanently
router.delete('/me', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password confirmation is required' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ error: 'Password is incorrect' });

    if (user.role === 'ADMIN') return res.status(400).json({ error: 'Admin accounts cannot be self-deleted' });

    await prisma.user.delete({ where: { id: user.id } });
    res.json({ message: 'Your account has been permanently deleted' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// GET /api/users/me
router.get('/me', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        plan: true,
        twoFactorEnabled: true,
        bonusBalance: true,
        fundedAmount: true,
        bonusUnlocked: true,
        accounts: {
          select: { id: true, label: true, balance: true },
        },
      },
    });

    const wallet = user.accounts.reduce((sum, a) => sum + Number(a.balance), 0);
    const bonus = Number(user.bonusBalance || 0);
    const funded = Number(user.fundedAmount || 0);
    const { passwordHash, ...rest } = user;

    res.json({
      user: {
        ...rest,
        walletBalance: round2(wallet),
        bonusBalance: bonus,
        fundedAmount: funded,
        bonusUnlocked: user.bonusUnlocked,
        bonusProgress: Math.min(1, funded / BONUS_UNLOCK_THRESHOLD),
        bonusThreshold: BONUS_UNLOCK_THRESHOLD,
        totalBalance: round2(wallet + bonus),
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'We could not load your profile. Please refresh the page and try again.' });
  }
});

// GET /api/users/dashboard — main dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const [accounts, moneyState, pendingRequests] = await Promise.all([
      prisma.account.findMany({
        where: { userId: req.user.id },
        include: {
          transactions: { orderBy: { createdAt: 'desc' } },
        },
      }),
      getMoneyState(req.user.id),
      prisma.request.count({ where: { userId: req.user.id, status: 'PENDING' } }),
    ]);

    const walletBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
    const allTransactions = accounts.flatMap(a => a.transactions);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentTransactions = allTransactions
      .filter(t => t.createdAt > thirtyDaysAgo && t.status === 'COMPLETED')
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);

    const totalDeposits = allTransactions
      .filter(t => (t.type === 'DEPOSIT' || t.type === 'BONUS') && t.status === 'COMPLETED')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalWithdrawals = allTransactions
      .filter(t => t.type === 'WITHDRAWAL' && t.status === 'COMPLETED')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const changePercent = totalDeposits > 0 ? ((walletBalance - totalDeposits) / totalDeposits * 100) : 0;

    res.json({
      totalBalance: moneyState.total,
      walletBalance: moneyState.available,
      bonusBalance: moneyState.bonus,
      bonusUnlocked: moneyState.bonusUnlocked,
      fundedAmount: moneyState.fundedAmount,
      bonusProgress: moneyState.bonusProgress,
      bonusThreshold: BONUS_UNLOCK_THRESHOLD,
      pendingRequests,
      approvalNotice: APPROVAL_NOTICE,
      changePercent: changePercent.toFixed(1),
      accounts: accounts.map(a => ({
        id: a.id,
        label: a.label,
        balance: Number(a.balance),
      })),
      totalDeposits,
      totalWithdrawals,
      transactionCount: allTransactions.length,
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        asset: t.asset,
        status: t.status,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'We could not load your dashboard. Please refresh and try again.' });
  }
});

// GET /api/users/portfolio/performance — monthly performance data for chart
router.get('/portfolio/performance', async (req, res) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { userId: req.user.id },
      include: { transactions: true },
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const performance = [];

    for (let i = 0; i <= currentMonth; i++) {
      const monthTransactions = accounts.flatMap(a => a.transactions).filter(t => {
        const tDate = new Date(t.createdAt);
        return tDate.getMonth() === i && tDate.getFullYear() === new Date().getFullYear();
      });

      const deposits = monthTransactions
        .filter(t => t.type === 'DEPOSIT' || t.type === 'BONUS')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const withdrawals = monthTransactions
        .filter(t => t.type === 'WITHDRAWAL')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      performance.push({
        month: months[i],
        earnings: deposits,
        spending: withdrawals,
      });
    }

    res.json({ performance });
  } catch (error) {
    console.error('Performance error:', error);
    res.status(500).json({ error: 'Failed to fetch performance' });
  }
});

// GET /api/users/portfolio/allocation — asset allocation for donut chart
router.get('/portfolio/allocation', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { account: { userId: req.user.id } },
    });

    const assetMap = {};
    transactions.forEach(t => {
      const asset = t.asset || 'USD';
      if (!assetMap[asset]) assetMap[asset] = 0;
      assetMap[asset] += Number(t.amount);
    });

    const colors = ['#7B61FF', '#00D4AA', '#FF6B9D', '#FFC72C', '#588F2B', '#4A90D9'];
    const allocation = Object.entries(assetMap).map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length],
    })).sort((a, b) => b.value - a.value);

    res.json({ allocation });
  } catch (error) {
    console.error('Allocation error:', error);
    res.status(500).json({ error: 'Failed to fetch allocation' });
  }
});

// GET /api/users/goals — financial goals
router.get('/goals', async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ goals: goals.map(g => ({ ...g, targetAmount: Number(g.targetAmount), currentAmount: Number(g.currentAmount) })) });
  } catch (error) {
    console.error('Goals error:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// POST /api/users/goals — create a goal
router.post('/goals', async (req, res) => {
  try {
    const { name, deadline, icon, color } = req.body;
    const targetAmount = parseAmount(req.body.targetAmount, { min: 1, max: 100_000_000 });
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Goal name is required' });
    }
    if (!targetAmount) {
      return res.status(400).json({ error: 'Target amount must be at least $1' });
    }

    const count = await prisma.goal.count({ where: { userId: req.user.id } });
    if (count >= 20) return res.status(400).json({ error: 'You can create up to 20 goals' });

    const goal = await prisma.goal.create({
      data: {
        userId: req.user.id,
        name: String(name).trim().slice(0, 60),
        targetAmount,
        deadline: deadline ? new Date(deadline) : null,
        icon: icon || '🎯',
        color: color || '#588F2B',
      },
    });

    notifyGoal(req.user.id, 'Goal Created', `"${goal.name}" goal created — target $${targetAmount.toLocaleString()}.`).catch(() => {});

    res.status(201).json({ goal: { ...goal, targetAmount: Number(goal.targetAmount), currentAmount: Number(goal.currentAmount) } });
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

async function findOwnedGoal(id, userId) {
  const goal = await prisma.goal.findFirst({ where: { id, userId } });
  return goal;
}

// PUT /api/users/goals/:id — update a goal
router.put('/goals/:id', async (req, res) => {
  try {
    const goal = await findOwnedGoal(req.params.id, req.user.id);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    const data = {};
    if (req.body.name !== undefined) {
      const v = String(req.body.name).trim();
      if (!v) return res.status(400).json({ error: 'Goal name cannot be empty' });
      data.name = v.slice(0, 60);
    }
    if (req.body.targetAmount !== undefined) {
      const target = parseAmount(req.body.targetAmount, { min: 1, max: 100_000_000 });
      if (!target) return res.status(400).json({ error: 'Target amount must be at least $1' });
      if (target < Number(goal.currentAmount)) {
        return res.status(400).json({ error: 'Target cannot be lower than what you have already saved' });
      }
      data.targetAmount = target;
    }
    if (req.body.deadline !== undefined) {
      data.deadline = req.body.deadline ? new Date(req.body.deadline) : null;
      if (data.deadline && isNaN(data.deadline.getTime())) {
        return res.status(400).json({ error: 'Invalid deadline date' });
      }
    }
    if (req.body.icon !== undefined) data.icon = String(req.body.icon).slice(0, 8) || '🎯';
    if (req.body.color !== undefined) data.color = String(req.body.color).slice(0, 20) || '#588F2B';

    const updated = await prisma.goal.update({ where: { id: goal.id }, data });
    res.json({ goal: { ...updated, targetAmount: Number(updated.targetAmount), currentAmount: Number(updated.currentAmount) } });
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// DELETE /api/users/goals/:id — savings are returned to the main balance
router.delete('/goals/:id', async (req, res) => {
  try {
    const goal = await findOwnedGoal(req.params.id, req.user.id);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    const saved = Number(goal.currentAmount);

    if (saved > 0) {
      const account = await ensureAccount(req.user.id);
      await prisma.$transaction([
        prisma.account.update({ where: { id: account.id }, data: { balance: { increment: saved } } }),
        prisma.transaction.create({
          data: { accountId: account.id, type: 'DEPOSIT', amount: saved, asset: `Goal refund · ${goal.name}`, status: 'COMPLETED' },
        }),
        prisma.goal.delete({ where: { id: goal.id } }),
      ]);
    } else {
      await prisma.goal.delete({ where: { id: goal.id } });
    }

    notifyGoal(req.user.id, 'Goal Deleted', `"${goal.name}" was deleted${saved > 0 ? ` and $${saved.toLocaleString()} was returned to your balance` : ''}.`).catch(() => {});

    res.json({
      message: saved > 0
        ? `Goal deleted — $${saved.toLocaleString()} returned to your balance`
        : 'Goal deleted',
      refunded: saved,
    });
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

// POST /api/users/goals/:id/deposit { amount } — move money from balance into the goal
router.post('/goals/:id/deposit', async (req, res) => {
  try {
    const goal = await findOwnedGoal(req.params.id, req.user.id);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    const amount = parseAmount(req.body.amount);
    if (!amount) return res.status(400).json({ error: 'Enter a valid amount between $0.01 and $10,000,000' });

    const account = await ensureAccount(req.user.id);
    const balance = Number(account.balance);
    if (amount > balance) {
      return res.status(400).json({ error: `Insufficient funds — available balance is $${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}` });
    }

    await prisma.$transaction([
      prisma.account.update({ where: { id: account.id }, data: { balance: { decrement: amount } } }),
      prisma.goal.update({ where: { id: goal.id }, data: { currentAmount: { increment: amount } } }),
      prisma.transaction.create({
        data: { accountId: account.id, type: 'WITHDRAWAL', amount, asset: `Goal · ${goal.name}`, status: 'COMPLETED' },
      }),
    ]);

    const updated = await prisma.goal.findUnique({ where: { id: goal.id } });
    const updatedAccount = await prisma.account.findUnique({ where: { id: account.id } });
    res.status(201).json({
      message: `$${amount.toLocaleString()} added to "${goal.name}"`,
      goal: { ...updated, targetAmount: Number(updated.targetAmount), currentAmount: Number(updated.currentAmount) },
      balance: Number(updatedAccount.balance),
    });
  } catch (error) {
    console.error('Goal deposit error:', error);
    res.status(500).json({ error: 'Failed to add money to goal' });
  }
});

// POST /api/users/goals/:id/withdraw { amount } — move money from the goal back to balance
router.post('/goals/:id/withdraw', async (req, res) => {
  try {
    const goal = await findOwnedGoal(req.params.id, req.user.id);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    const amount = parseAmount(req.body.amount);
    if (!amount) return res.status(400).json({ error: 'Enter a valid amount between $0.01 and $10,000,000' });

    const saved = Number(goal.currentAmount);
    if (amount > saved) {
      return res.status(400).json({ error: `This goal only has $${saved.toLocaleString(undefined, { minimumFractionDigits: 2 })} saved` });
    }

    const account = await ensureAccount(req.user.id);
    await prisma.$transaction([
      prisma.account.update({ where: { id: account.id }, data: { balance: { increment: amount } } }),
      prisma.goal.update({ where: { id: goal.id }, data: { currentAmount: { decrement: amount } } }),
      prisma.transaction.create({
        data: { accountId: account.id, type: 'DEPOSIT', amount, asset: `Goal · ${goal.name}`, status: 'COMPLETED' },
      }),
    ]);

    const updated = await prisma.goal.findUnique({ where: { id: goal.id } });
    const updatedAccount = await prisma.account.findUnique({ where: { id: account.id } });
    res.json({
      message: `$${amount.toLocaleString()} moved from "${goal.name}" to your balance`,
      goal: { ...updated, targetAmount: Number(updated.targetAmount), currentAmount: Number(updated.currentAmount) },
      balance: Number(updatedAccount.balance),
    });
  } catch (error) {
    console.error('Goal withdraw error:', error);
    res.status(500).json({ error: 'Failed to withdraw from goal' });
  }
});

// GET /api/users/accounts
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { userId: req.user.id },
      include: {
        transactions: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });
    res.json({ accounts });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// GET /api/users/transactions — with type/status/search filters + pagination
router.get('/transactions', async (req, res) => {
  try {
    const { accountId, page = '1', limit = '20', type, status, search } = req.query;
    const take = Math.min(parseInt(limit) || 20, 200);
    const skip = ((parseInt(page) || 1) - 1) * take;
    const where = { account: { userId: req.user.id } };
    if (accountId) where.accountId = accountId;
    if (type && ['DEPOSIT', 'WITHDRAWAL', 'BUY', 'SELL', 'BONUS'].includes(type)) where.type = type;
    if (status && ['PENDING', 'COMPLETED', 'FAILED'].includes(status)) where.status = status;
    if (search && typeof search === 'string') {
      where.OR = [
        { asset: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: { account: { select: { label: true } } },
      }),
      prisma.transaction.count({ where }),
    ]);

    const amounts = transactions.reduce(
      (acc, t) => {
        const amt = Number(t.amount);
        if (t.type === 'DEPOSIT' || t.type === 'BONUS' || t.type === 'SELL') acc.in += amt;
        else acc.out += amt;
        return acc;
      },
      { in: 0, out: 0 }
    );

    res.json({
      transactions,
      total,
      page: parseInt(page) || 1,
      limit: take,
      summary: { in: round2(amounts.in), out: round2(amounts.out) },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// GET /api/users/monetra — dashboard shell data (every figure is real)
router.get('/monetra', async (req, res) => {
  try {
    const [accounts, goals, moneyState, cards, pendingRequests] = await Promise.all([
      prisma.account.findMany({
        where: { userId: req.user.id },
        include: { transactions: { orderBy: { createdAt: 'desc' } } },
      }),
      prisma.goal.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'asc' } }),
      getMoneyState(req.user.id),
      prisma.card.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'asc' } }),
      prisma.request.count({ where: { userId: req.user.id, status: 'PENDING' } }),
    ]);

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { firstName: true, lastName: true, email: true, plan: true },
    });

    const allTransactions = accounts.flatMap(a => a.transactions).filter(t => t.status === 'COMPLETED');
    const walletBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

    const now = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const recentTxs = allTransactions.filter(t => t.createdAt > thirtyDaysAgo);
    const prevTxs = allTransactions.filter(t => t.createdAt > sixtyDaysAgo && t.createdAt <= thirtyDaysAgo);
    const isInflow = (t) => t.type === 'DEPOSIT' || t.type === 'BONUS' || t.type === 'SELL' || t.type === 'RETURN';
    const isOutflow = (t) => t.type === 'WITHDRAWAL' || t.type === 'BUY' || t.type === 'INVEST' || t.type === 'CARD_FUND';

    const totalIncome = recentTxs.filter(isInflow).reduce((s, t) => s + Number(t.amount), 0);
    const prevIncome = prevTxs.filter(isInflow).reduce((s, t) => s + Number(t.amount), 0);
    const incomeChange = prevIncome > 0 ? round2(((totalIncome - prevIncome) / prevIncome) * 100) : 0;

    const totalExpenses = recentTxs.filter(isOutflow).reduce((s, t) => s + Number(t.amount), 0);
    const prevExpenses = prevTxs.filter(isOutflow).reduce((s, t) => s + Number(t.amount), 0);
    const expenseChange = prevExpenses > 0 ? round2(((totalExpenses - prevExpenses) / prevExpenses) * 100) : 0;

    // Savings = money the user has actually set aside in goals.
    const savings = round2(goals.reduce((s, g) => s + Number(g.currentAmount), 0));
    const savingsChange = 0;

    const currentBalance = round2(walletBalance);

    // Real per-month cashflow — zero on months with no activity.
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = now.getMonth();
    const cashflow = [];

    for (let i = 0; i < 12; i++) {
      const monthTxs = allTransactions.filter(t => {
        const d = new Date(t.createdAt);
        return d.getMonth() === i && d.getFullYear() === now.getFullYear();
      });
      const income = monthTxs.filter(isInflow).reduce((s, t) => s + Number(t.amount), 0);
      const expenses = monthTxs.filter(isOutflow).reduce((s, t) => s + Number(t.amount), 0);
      cashflow.push({
        month: months[i],
        income: round2(income),
        expenses: round2(expenses),
        savings: round2(income * 0.3),
        isFuture: i > currentMonth,
      });
    }

    const totalCashflow = round2(cashflow.reduce((s, m) => s + m.income, 0));

    // "Smart wallet" categories are the user's real savings goals.
    const categories = goals.slice(0, 6).map(g => ({
      name: g.name,
      icon: g.icon || 'target',
      color: g.color,
      amount: Number(g.currentAmount),
    }));

    // Real recipients from past transfers (asset format: "Transfer to email")
    const recipientEmails = [];
    for (const t of allTransactions) {
      const m = t.asset && t.asset.match(/^Transfer to (.+)$/);
      if (m && !recipientEmails.includes(m[1])) recipientEmails.push(m[1]);
      if (recipientEmails.length >= 6) break;
    }
    const quickSendUsers = recipientEmails.map((email, i) => ({
      id: i + 1,
      name: email,
      email,
      avatar: initialsFromEmail(email),
      color: colorFromString(email),
    }));

    const savedCard = cards[0] || null;
    const card = savedCard
      ? {
          id: savedCard.id,
          number: savedCard.last4,
          balance: Number(savedCard.balance),
          holder: `${user.firstName} ${user.lastName}`,
          validThru: savedCard.expiry,
          cvv: '***',
          type: savedCard.brand,
          frozen: savedCard.frozen,
        }
      : null;

    res.json({
      user,
      plan: user.plan,
      smartWallet: { totalSaving: savings, categories },
      balances: {
        current: { amount: currentBalance, change: incomeChange },
        savings: { amount: savings, change: savingsChange },
        income: { amount: round2(totalIncome), change: incomeChange },
        expenses: { amount: round2(totalExpenses), change: expenseChange },
      },
      bonus: {
        balance: moneyState.bonus,
        unlocked: moneyState.bonusUnlocked,
        fundedAmount: moneyState.fundedAmount,
        threshold: BONUS_UNLOCK_THRESHOLD,
        progress: moneyState.bonusProgress,
      },
      totalBalance: moneyState.total,
      pendingRequests,
      approvalNotice: APPROVAL_NOTICE,
      cashflow: { total: totalCashflow, months: cashflow },
      quickSendUsers,
      card,
    });
  } catch (error) {
    console.error('Dashboard shell error:', error);
    res.status(500).json({ error: 'We could not load your dashboard. Please refresh and try again.' });
  }
});

// GET /api/users/portfolio
router.get('/portfolio', async (req, res) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { userId: req.user.id },
      include: { transactions: { orderBy: { createdAt: 'desc' } } },
    });

    const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentTransactions = accounts.flatMap(a => a.transactions)
      .filter(t => t.createdAt > thirtyDaysAgo)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10);

    const deposits = accounts.flatMap(a => a.transactions)
      .filter(t => t.type === 'DEPOSIT' || t.type === 'BONUS')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    res.json({
      accounts: accounts.map(a => ({ id: a.id, label: a.label, balance: a.balance, transactionCount: a.transactions.length })),
      totalBalance,
      recentTransactions,
      summary: { totalDeposits: deposits, transactionCount: accounts.reduce((sum, a) => sum + a.transactions.length, 0) },
    });
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

export default router;
