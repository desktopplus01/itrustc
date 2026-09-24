import prisma from './prisma.js';
import { round2 } from './helpers.js';
import {
  notifyInvestmentMatured,
  notifyInvestmentAccrualMilestone,
} from '../services/notifications.js';

/**
 * ROI accrual engine.
 *
 * Every active investment earns its plan's fixed return pro-rated over its term.
 * `runAccrual()` materializes that growth: it persists each investment's earned
 * profit into the `accrued` column so users can watch returns accumulate in
 * real time (any API read also refreshes the same math, so values are live even
 * between job ticks). Full payout still only happens on claim at maturity.
 */
export async function runAccrual() {
  // Flip past-maturity investments first so they never accrue beyond their full return.
  const due = await prisma.investment.findMany({
    where: { status: 'ACTIVE', maturesAt: { lte: new Date() } },
    select: {
      id: true,
      userId: true,
      amount: true,
      expectedReturn: true,
      accrued: true,
      plan: { select: { name: true } },
    },
  });

  if (due.length > 0) {
    for (const inv of due) {
      await prisma.investment.update({
        where: { id: inv.id },
        data: { status: 'MATURED', accrued: Number(inv.expectedReturn) },
      });
      notifyInvestmentMatured(
        inv.userId,
        inv.plan?.name || 'your',
        round2(Number(inv.amount) + Number(inv.expectedReturn))
      ).catch(() => {});
    }
  }

  // Materialize pro-rated profit on every active investment.
  const active = await prisma.investment.findMany({
    where: { status: 'ACTIVE' },
    include: { plan: true },
  });

  const now = Date.now();
  const updateIds = [];
  for (const inv of active) {
    const principal = Number(inv.amount);
    const totalProfit = Number(inv.expectedReturn);
    const start = new Date(inv.startsAt).getTime();
    const maturity = new Date(inv.maturesAt).getTime();
    if (maturity <= start) continue; // degenerate term — payout equals principal; skip

    const totalMs = maturity - start;
    const elapsed = Math.min(Math.max(now - start, 0), totalMs);
    const target = round2((totalProfit * elapsed) / totalMs);

    if (target !== Number(inv.accrued)) {
      await prisma.investment.update({
        where: { id: inv.id },
        data: {
          accrued: target,
          lastAccrualAt: new Date(),
        },
      });
      updateIds.push(inv.id);
    }

    // Notify once per quarter of the term completed (25/50/75%).
    const pctEarned = (elapsed / totalMs) * 100;
    const milestone = Math.min(75, Math.floor(pctEarned / 25) * 25);
    if (milestone >= 25 && milestone > Number(inv.milestone || 0)) {
      await prisma.investment.update({
        where: { id: inv.id },
        data: { milestone },
      });
      notifyInvestmentAccrualMilestone(
        inv.userId,
        inv.id,
        inv.plan?.name || 'plan',
        target,
        milestone
      ).catch(() => {});
    }
  }

  return { maturedCount: due.length, accruedCount: updateIds.length };
}

/** Kick off a background accrual loop (fires every 30s while the server runs). */
export function startAccrualLoop(intervalMs = 30_000) {
  const tick = async () => {
    try {
      const res = await runAccrual();
      if (res.maturedCount > 0) {
        console.log(`[accrual] ${res.maturedCount} investment(s) matured`);
      }
    } catch (err) {
      console.error('[accrual] tick failed:', err.message);
    }
  };
  setTimeout(tick, 5_000); // first pass shortly after boot
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  return timer;
}
