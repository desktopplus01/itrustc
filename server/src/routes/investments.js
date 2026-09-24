import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, requireApproved } from '../middleware/auth.js';
import { round2, parseAmount, ensureAccount, getMoneyState, BONUS_UNLOCK_THRESHOLD } from '../lib/helpers.js';
import { runAccrual } from '../lib/accrual.js';
import {
  notifyInvestmentCreated,
  notifyInvestmentMatured,
  notifyInvestmentClaimed,
} from '../services/notifications.js';

const router = Router();

router.use(authenticate, requireApproved);

/**
 * Earnings so far: the persisted accrual the background job materialized.
 * runAccrual() runs on a loop and also fires before these reads, so the value
 * is always live to the second when the user looks at it.
 */
function getAccrued(investment) {
  return round2(Number(investment.accrued));
}

function serializeInvestment(inv, plan) {
  const principal = Number(inv.amount);
  const expectedReturn = Number(inv.expectedReturn);
  const startsAt = new Date(inv.startsAt);
  const maturesAt = new Date(inv.maturesAt);
  const total = round2(principal + expectedReturn);
  const now = Date.now();
  const progress =
    maturesAt <= startsAt ? 1 : Math.min(1, Math.max(0, (now - startsAt.getTime()) / (maturesAt.getTime() - startsAt.getTime())));
  const daysLeft = Math.max(0, Math.ceil((maturesAt.getTime() - now) / 86_400_000));

  const isClaimed = inv.status === 'CLAIMED';
  const projectedReturn = expectedReturn;

  return {
    id: inv.id,
    status: inv.status,
    amount: principal,
    expectedReturn,
    totalPayout: total,
    accrued: isClaimed ? projectedReturn : getAccrued(inv),
    projectedReturn,
    startsAt: inv.startsAt,
    maturesAt: inv.maturesAt,
    claimedAt: inv.claimedAt,
    createdAt: inv.createdAt,
    daysLeft,
    progress: Math.round(progress * 100),
    canClaim: inv.status === 'MATURED',
    plan: plan
      ? {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          durationDays: plan.durationDays,
          returnPercent: Number(plan.returnPercent),
          minAmount: Number(plan.minAmount),
          maxAmount: plan.maxAmount != null ? Number(plan.maxAmount) : null,
        }
      : null,
  };
}

function serializePlan(plan, activeInvestment = null) {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    minAmount: Number(plan.minAmount),
    maxAmount: plan.maxAmount != null ? Number(plan.maxAmount) : null,
    durationDays: plan.durationDays,
    returnPercent: Number(plan.returnPercent),
    active: plan.active,
    createdAt: plan.createdAt,
    yourInvestment: activeInvestment,
  };
}

/**
 * Runs before reads/claims: materializes live ROI on active investments and
 * flips past-maturity ones to MATURED (no-op when nothing changed).
 */
const syncMaturity = runAccrual;

// GET /api/investments/plans — plans the user can invest in
router.get('/plans', async (req, res) => {
  try {
    const [plans, mine] = await Promise.all([
      prisma.investmentPlan.findMany({ where: { active: true }, orderBy: { returnPercent: 'desc' } }),
      prisma.investment.findMany({
        where: { userId: req.user.id, status: { in: ['ACTIVE', 'MATURED'] } },
        include: { plan: true },
      }),
    ]);

    const moneyState = await getMoneyState(req.user.id);

    res.json({
      plans: plans.map((p) => serializePlan(p)),
      myActivePlanIds: [...new Set(mine.filter((i) => i.status === 'ACTIVE').map((i) => i.planId))],
      money: {
        available: moneyState.available,
        bonus: moneyState.bonus,
        bonusUnlocked: moneyState.bonusUnlocked,
        fundedAmount: moneyState.fundedAmount,
        bonusProgress: moneyState.bonusProgress,
        bonusThreshold: BONUS_UNLOCK_THRESHOLD,
        total: moneyState.total,
      },
    });
  } catch (error) {
    console.error('Plans error:', error);
    res.status(500).json({ error: 'We could not load the investment plans. Please refresh and try again.' });
  }
});

// GET /api/investments — my investments + summary
router.get('/', async (req, res) => {
  try {
    await syncMaturity(req.user.id);

    const investments = await prisma.investment.findMany({
      where: { userId: req.user.id },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    const moneyState = await getMoneyState(req.user.id);

    const active = investments.filter((i) => i.status === 'ACTIVE');
    const matured = investments.filter((i) => i.status === 'MATURED');
    const claimed = investments.filter((i) => i.status === 'CLAIMED');

    const investedTotal = investments
      .filter((i) => i.status !== 'CANCELLED')
      .reduce((s, i) => s + Number(i.amount), 0);
    const returnsTotal = claimed.reduce((s, i) => s + Number(i.expectedReturn), 0);
    const pendingReturns = [...active, ...matured].reduce((s, i) => s + Number(i.expectedReturn), 0);
    const earnedSoFar = [...active, ...matured].reduce((s, i) => s + Number(i.accrued ?? 0), 0);
    const claimable = matured.reduce((s, i) => s + Number(i.amount) + Number(i.expectedReturn), 0);

    res.json({
      investments: investments.map((i) => serializeInvestment(i, i.plan)),
      summary: {
        investedTotal: round2(investedTotal),
        returnsClaimed: round2(returnsTotal),
        returnsPending: round2(pendingReturns),
        earnedSoFar: round2(earnedSoFar),
        claimable: round2(claimable),
        activeCount: active.length,
        maturedCount: matured.length,
      },
      money: {
        available: moneyState.available,
        bonus: moneyState.bonus,
        bonusUnlocked: moneyState.bonusUnlocked,
        fundedAmount: moneyState.fundedAmount,
        bonusProgress: moneyState.bonusProgress,
        bonusThreshold: BONUS_UNLOCK_THRESHOLD,
        total: moneyState.total,
      },
    });
  } catch (error) {
    console.error('Investments error:', error);
    res.status(500).json({ error: 'We could not load your investments. Please refresh and try again.' });
  }
});

// POST /api/investments { planId, amount } — put money into a plan
router.post('/', async (req, res) => {
  try {
    const { planId } = req.body;
    const amount = parseAmount(req.body.amount, { min: 1 });
    if (!planId) return res.status(400).json({ error: 'Choose an investment plan first.' });
    if (!amount) return res.status(400).json({ error: 'Enter an amount of at least $1.' });

    const plan = await prisma.investmentPlan.findUnique({ where: { id: String(planId) } });
    if (!plan || !plan.active) {
      return res.status(400).json({ error: 'That plan is no longer available. Pick another plan and try again.' });
    }

    const min = Number(plan.minAmount);
    const max = plan.maxAmount != null ? Number(plan.maxAmount) : null;
    if (amount < min) {
      return res.status(400).json({ error: `The ${plan.name} plan starts at $${min.toLocaleString()}. Enter a larger amount.` });
    }
    if (max != null && amount > max) {
      return res.status(400).json({ error: `The ${plan.name} plan accepts up to $${max.toLocaleString()} per investment. Enter a smaller amount.` });
    }

    const moneyState = await getMoneyState(req.user.id);

    // The welcome bonus is locked until the user has funded their own money.
    // It lives outside the wallet, so it can never cover an investment — but
    // spell the rule out whenever a user tries to invest more than they hold.
    if (!moneyState.bonusUnlocked && moneyState.bonus > 0) {
      const remaining = round2(BONUS_UNLOCK_THRESHOLD - moneyState.fundedAmount);
      return res.status(403).json({
        error: `Your $${moneyState.bonus.toFixed(2)} welcome bonus can't be invested yet. It unlocks once you've funded $${BONUS_UNLOCK_THRESHOLD.toLocaleString()} of your own money — you're at $${moneyState.fundedAmount.toFixed(2)}, so $${remaining.toFixed(2)} to go. Fund your wallet first and your bonus will unlock automatically.`,
        bonusLocked: true,
      });
    }

    if (amount > moneyState.available) {
      let hint = `You only have $${moneyState.available.toLocaleString(undefined, { minimumFractionDigits: 2 })} available to invest. Enter a smaller amount or fund your wallet first.`;
      if (!moneyState.bonusUnlocked && moneyState.bonus > 0 && amount <= moneyState.available + moneyState.bonus) {
        hint += ` Your $${moneyState.bonus} welcome bonus is locked until you fund $${BONUS_UNLOCK_THRESHOLD.toLocaleString()} of your own money — you're at $${moneyState.fundedAmount.toLocaleString()}.`;
      }
      return res.status(400).json({ error: hint });
    }

    const account = await ensureAccount(req.user.id);
    const returnProfit = round2((amount * Number(plan.returnPercent)) / 100);
    const maturesAt = new Date(Date.now() + plan.durationDays * 86_400_000);

    const investment = await prisma.$transaction(async (tx) => {
      const created = await tx.investment.create({
        data: {
          userId: req.user.id,
          planId: plan.id,
          amount,
          expectedReturn: returnProfit,
          maturesAt,
        },
      });
      await tx.account.update({ where: { id: account.id }, data: { balance: { decrement: amount } } });
      await tx.transaction.create({
        data: {
          accountId: account.id,
          type: 'INVEST',
          amount,
          asset: `Investment · ${plan.name}`,
          status: 'COMPLETED',
        },
      });
      return created;
    });

    notifyInvestmentCreated(req.user.id, plan.name, amount).catch(() => {});

    const updatedState = await getMoneyState(req.user.id);
    res.status(201).json({
      message: `${amount.toLocaleString()} is now invested in the ${plan.name} plan — set in motion until ${maturesAt.toLocaleDateString()}.`,
      investment: serializeInvestment(investment, plan),
      balance: updatedState.available,
    });
  } catch (error) {
    console.error('Invest error:', error);
    res.status(500).json({ error: 'We could not start that investment. Please try again.' });
  }
});

// POST /api/investments/:id/claim — pull principal + returns into the wallet
router.post('/:id/claim', async (req, res) => {
  try {
    await syncMaturity(req.user.id);

    const investment = await prisma.investment.findUnique({
      where: { id: req.params.id },
      include: { plan: true },
    });
    if (!investment || investment.userId !== req.user.id) {
      return res.status(404).json({ error: 'We could not find that investment.' });
    }
    if (investment.status === 'CLAIMED') {
      return res.status(400).json({ error: 'This investment has already been claimed.' });
    }
    if (investment.status !== 'MATURED') {
      const daysLeft = Math.max(1, Math.ceil((new Date(investment.maturesAt).getTime() - Date.now()) / 86_400_000));
      return res.status(400).json({
        error: `This investment still has ${daysLeft} day${daysLeft === 1 ? '' : 's'} left. You can claim it on ${new Date(investment.maturesAt).toLocaleDateString()}.`,
      });
    }

    const payout = round2(Number(investment.amount) + Number(investment.expectedReturn));
    const account = await ensureAccount(req.user.id);

    await prisma.$transaction([
      prisma.investment.update({
        where: { id: investment.id },
        data: { status: 'CLAIMED', claimedAt: new Date() },
      }),
      prisma.account.update({ where: { id: account.id }, data: { balance: { increment: payout } } }),
      prisma.transaction.create({
        data: {
          accountId: account.id,
          type: 'RETURN',
          amount: payout,
          asset: `Investment return · ${investment.plan?.name || 'plan'}`,
          status: 'COMPLETED',
        },
      }),
    ]);

    notifyInvestmentClaimed(req.user.id, payout).catch(() => {});

    const state = await getMoneyState(req.user.id);
    res.json({
      message: `$${payout.toLocaleString(undefined, { minimumFractionDigits: 2 })} (principal + returns) added to your wallet.`,
      balance: state.available,
    });
  } catch (error) {
    console.error('Claim error:', error);
    res.status(500).json({ error: 'We could not claim that investment. Please try again.' });
  }
});

export default router;
