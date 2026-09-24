// Dev utility: end-to-end API smoke test for payments, goals, transactions,
// cards, trading and settings endpoints.
// Usage: node scripts/dev-smoke.js
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE = process.env.SMOKE_BASE || 'http://localhost:3001/api';

let passed = 0;
let failed = 0;

function check(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`  PASS ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name} ${detail}`);
  }
}

async function upsert(email, balance) {
  const passwordHash = await bcrypt.hash('Test1234!', 12);
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const [f, l] = email.split('@')[0].split(/[._-]/);
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: (f || 'Test').charAt(0).toUpperCase() + (f || 'test').slice(1),
        lastName: (l || 'User').charAt(0).toUpperCase() + (l || 'user').slice(1),
        status: 'APPROVED',
        twoFactorEnabled: false,
      },
    });
  }
  let account = await prisma.account.findFirst({ where: { userId: user.id } });
  if (!account) {
    account = await prisma.account.create({ data: { userId: user.id, label: 'Crypto IRA', balance } });
    await prisma.transaction.create({
      data: { accountId: account.id, type: 'BONUS', amount: balance, asset: 'USD', status: 'COMPLETED' },
    });
  }
  const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
  return { user, token };
}

async function call(token, method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  return { status: res.status, data };
}

const alice = await upsert('alice.smoke@itrustc.test', 5000);
const bob = await upsert('bob.smoke@itrustc.test', 1000);

console.log('\n— Settings —');
{
  const r = await call(alice.token, 'PUT', '/users/me', { firstName: 'Alice', lastName: 'Smoke', phone: '+15551234567' });
  check('profile update', r.status === 200 && r.data.user?.firstName === 'Alice', JSON.stringify(r.data));

  const me = await call(alice.token, 'GET', '/auth/me');
  check('auth/me returns phone/plan/2fa', me.status === 200 && me.data.user?.phone === '+15551234567' && typeof me.data.user?.twoFactorEnabled === 'boolean' && me.data.user?.plan === 'Starter', JSON.stringify(me.data));

  const bad = await call(alice.token, 'POST', '/users/change-password', { currentPassword: 'Wrong123!', newPassword: 'NewPass123!' });
  check('wrong current password rejected', bad.status === 400, `status=${bad.status}`);

  const good = await call(alice.token, 'POST', '/users/change-password', { currentPassword: 'Test1234!', newPassword: 'NewPass123!' });
  check('password change', good.status === 200, JSON.stringify(good.data));

  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alice.smoke@itrustc.test', password: 'NewPass123!' }),
  }).then((r) => r.json());
  check('login with new password', !!login.token, JSON.stringify(login));

  const tfa = await call(alice.token, 'POST', '/users/2fa', { enabled: true });
  check('enable 2FA', tfa.status === 200 && tfa.data.twoFactorEnabled === true, JSON.stringify(tfa.data));
  await call(alice.token, 'POST', '/users/2fa', { enabled: false });

  const plan = await call(alice.token, 'PUT', '/users/plan', { plan: 'Pro' });
  check('plan upgrade', plan.status === 200 && plan.data.plan === 'Pro', JSON.stringify(plan.data));
  const badPlan = await call(alice.token, 'PUT', '/users/plan', { plan: 'Gold' });
  check('invalid plan rejected', badPlan.status === 400, `status=${badPlan.status}`);
}

console.log('\n— Payments —');
let aliceBalance;
{
  const s = await call(alice.token, 'GET', '/payments');
  check('payments summary', s.status === 200 && typeof s.data.balance === 'number', JSON.stringify(s.data).slice(0, 120));
  aliceBalance = s.data.balance;

  const d = await call(alice.token, 'POST', '/payments/deposit', { amount: 250, method: 'bank' });
  check('deposit', d.status === 201 && d.data.balance === aliceBalance + 250, JSON.stringify(d.data));

  const badAmt = await call(alice.token, 'POST', '/payments/deposit', { amount: -5 });
  check('negative deposit rejected', badAmt.status === 400, `status=${badAmt.status}`);

  const w = await call(alice.token, 'POST', '/payments/withdraw', { amount: 100 });
  check('withdraw', w.status === 201 && w.data.balance === aliceBalance + 150, JSON.stringify(w.data));

  const tooMuch = await call(alice.token, 'POST', '/payments/withdraw', { amount: 99999999 });
  check('overdraft rejected', tooMuch.status === 400, `status=${tooMuch.status}`);

  const t = await call(alice.token, 'POST', '/payments/transfer', { recipientEmail: 'bob.smoke@itrustc.test', amount: 200, note: 'lunch' });
  check('transfer', t.status === 201 && t.data.balance === aliceBalance - 50, JSON.stringify(t.data));

  const bobS = await call(bob.token, 'GET', '/payments');
  check('recipient credited', bobS.data.balance === 1200, `balance=${bobS.data.balance}`);

  const selfT = await call(alice.token, 'POST', '/payments/transfer', { recipientEmail: 'alice.smoke@itrustc.test', amount: 10 });
  check('self transfer rejected', selfT.status === 400, `status=${selfT.status}`);

  const ghost = await call(alice.token, 'POST', '/payments/transfer', { recipientEmail: 'nobody@x.test', amount: 10 });
  check('unknown recipient rejected', ghost.status === 404, `status=${ghost.status}`);

  const req = await call(alice.token, 'POST', '/payments/request', { toEmail: 'bob.smoke@itrustc.test', amount: 75, note: 'rent' });
  check('payment request', req.status === 201, JSON.stringify(req.data));

  const notifs = await call(bob.token, 'GET', '/notifications?limit=10');
  check('recipient got request notification', (notifs.data.notifications || []).some((n) => n.title === 'Payment Request'), JSON.stringify(notifs.data).slice(0, 200));
}

console.log('\n— Trading & holdings —');
{
  const buy = await call(alice.token, 'POST', '/payments/trade', { side: 'BUY', asset: 'BTC', amount: 1000, price: 50000 });
  check('buy BTC', buy.status === 201 && buy.data.fill?.qty === 0.02, JSON.stringify(buy.data));

  const h = await call(alice.token, 'GET', '/payments/holdings');
  check('holdings shows BTC', h.status === 200 && h.data.holdings.some((x) => x.asset === 'BTC' && x.qty === 0.02), JSON.stringify(h.data));

  const sell = await call(alice.token, 'POST', '/payments/trade', { side: 'SELL', asset: 'BTC', qty: 0.01, price: 55000 });
  check('sell BTC', sell.status === 201 && sell.data.fill?.amount === 550, JSON.stringify(sell.data));

  const overSell = await call(alice.token, 'POST', '/payments/trade', { side: 'SELL', asset: 'BTC', qty: 99, price: 55000 });
  check('oversell rejected', overSell.status === 400, `status=${overSell.status}`);

  const buyNoFunds = await call(bob.token, 'POST', '/payments/trade', { side: 'BUY', asset: 'ETH', amount: 999999, price: 3000 });
  check('buy beyond balance rejected', buyNoFunds.status === 400, `status=${buyNoFunds.status}`);
}

console.log('\n— Goals —');
let goalId;
{
  const bad = await call(alice.token, 'POST', '/users/goals', { name: '', targetAmount: 0 });
  check('invalid goal rejected', bad.status === 400, `status=${bad.status}`);

  const g = await call(alice.token, 'POST', '/users/goals', { name: 'Vacation', targetAmount: 10000, deadline: '2027-06-01', icon: '✈️', color: '#3b82f6' });
  check('create goal', g.status === 201, JSON.stringify(g.data));
  goalId = g.data?.goal?.id;

  const dep = await call(alice.token, 'POST', `/users/goals/${goalId}/deposit`, { amount: 1500 });
  check('goal deposit', dep.status === 201 && dep.data.goal?.currentAmount === 1500, JSON.stringify(dep.data));

  const list = await call(alice.token, 'GET', '/users/goals');
  check('list goals', list.status === 200 && list.data.goals.length >= 1, JSON.stringify(list.data).slice(0, 150));

  const upd = await call(alice.token, 'PUT', `/users/goals/${goalId}`, { name: 'Vacation 2027', targetAmount: 12000 });
  check('update goal', upd.status === 200 && upd.data.goal?.name === 'Vacation 2027' && upd.data.goal?.targetAmount === 12000, JSON.stringify(upd.data));

  const wd = await call(alice.token, 'POST', `/users/goals/${goalId}/withdraw`, { amount: 500 });
  check('goal withdraw', wd.status === 200 && wd.data.goal?.currentAmount === 1000, JSON.stringify(wd.data));

  const over = await call(alice.token, 'POST', `/users/goals/${goalId}/withdraw`, { amount: 99999 });
  check('goal overdraft rejected', over.status === 400, `status=${over.status}`);

  // goal owned by someone else
  const foreign = await call(bob.token, 'POST', `/users/goals/${goalId}/deposit`, { amount: 10 });
  check("foreign goal rejected", foreign.status === 404, `status=${foreign.status}`);
}

console.log('\n— Transactions —');
{
  const all = await call(alice.token, 'GET', '/users/transactions?page=1&limit=5');
  check('list transactions', all.status === 200 && all.data.total > 0 && all.data.transactions.length <= 5, JSON.stringify(all.data).slice(0, 150));

  const dep = await call(alice.token, 'GET', '/users/transactions?type=DEPOSIT&limit=50');
  check('type filter', dep.status === 200 && dep.data.transactions.every((t) => t.type === 'DEPOSIT'), `n=${dep.data.transactions?.length}`);

  const buys = await call(alice.token, 'GET', '/users/transactions?type=BUY');
  check('BUY filter with qty/price', buys.status === 200 && buys.data.transactions.every((t) => t.type === 'BUY' && t.qty != null && t.price != null), JSON.stringify(buys.data).slice(0, 200));

  const search = await call(alice.token, 'GET', '/users/transactions?search=Transfer');
  check('search filter', search.status === 200 && search.data.transactions.every((t) => (t.asset || '').toLowerCase().includes('transfer')), `n=${search.data.transactions?.length}`);
}

console.log('\n— Cards —');
let cardId;
{
  const cr = await call(alice.token, 'POST', '/payments/cards', { label: 'Online Shopping', spendLimit: 2500 });
  check('create card', cr.status === 201 && cr.data.details?.number?.length === 16, JSON.stringify(cr.data).slice(0, 200));
  cardId = cr.data?.card?.id;

  const list = await call(alice.token, 'GET', '/payments/cards');
  check('cards masked in list', list.status === 200 && list.data.cards[0].masked.startsWith('****'), JSON.stringify(list.data).slice(0, 150));

  const rev = await call(alice.token, 'POST', `/payments/cards/${cardId}/reveal`);
  check('reveal card', rev.status === 200 && rev.data.details?.number?.length === 16 && rev.data.details?.cvv?.length === 3, JSON.stringify(rev.data));

  const patch = await call(alice.token, 'PATCH', `/payments/cards/${cardId}`, { frozen: true, spendLimit: 100 });
  check('freeze + limit', patch.status === 200 && patch.data.card?.frozen === true && patch.data.card?.spendLimit === 100, JSON.stringify(patch.data));

  const foreign = await call(bob.token, 'PATCH', `/payments/cards/${cardId}`, { frozen: false });
  check('foreign card rejected', foreign.status === 404, `status=${foreign.status}`);

  const del = await call(alice.token, 'DELETE', `/payments/cards/${cardId}`);
  check('delete card', del.status === 200, JSON.stringify(del.data));
}

console.log('\n— Goal cleanup —');
{
  const del = await call(alice.token, 'DELETE', `/users/goals/${goalId}`);
  check('delete goal refunds savings', del.status === 200 && del.data.refunded === 1000, JSON.stringify(del.data));
}

console.log(`\n${passed} passed, ${failed} failed`);
await prisma.$disconnect();
process.exit(failed > 0 ? 1 : 0);
