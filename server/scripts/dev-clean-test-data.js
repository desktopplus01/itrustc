// One-off dev cleanup: removes test/smoke rows so the admin portal only
// shows real data. Safe to re-run — it only deletes the specific rows below.
import 'dotenv/config';
import prisma from '../src/lib/prisma.js';

const TEST_EMAILS = [
  'alice.smoke@itrustc.test',
  'bob.smoke@itrustc.test',
  'test@example.com',
  'testotp@example.com',
];

async function main() {
  for (const email of TEST_EMAILS) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`skip ${email} (already gone)`);
      continue;
    }
    await prisma.user.delete({ where: { id: user.id } }); // cascades to accounts, cards, requests, investments, notifications, goals
    console.log(`deleted user ${email} (and all related rows)`);
  }

  // Smoke deposit addresses created by the e2e script
  const addrs = await prisma.depositAddress.findMany({
    where: { OR: [{ label: { contains: 'Smoke', mode: 'insensitive' } }, { address: { contains: 'smoke', mode: 'insensitive' } }] },
  });
  for (const a of addrs) {
    await prisma.depositAddress.delete({ where: { id: a.id } });
    console.log(`deleted address ${a.currency}/${a.network} ${a.address}`);
  }

  const usersLeft = await prisma.user.count();
  const addrLeft = await prisma.depositAddress.count();
  console.log(`\nDone. Remaining users: ${usersLeft}, addresses: ${addrLeft}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
