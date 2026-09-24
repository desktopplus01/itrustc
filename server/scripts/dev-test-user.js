// Dev utility: creates approved test users and prints a JWT for API smoke tests.
// Usage: node scripts/dev-test-user.js [email] [balance]
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertUser(email, balance) {
  const password = 'Test1234!';
  const passwordHash = await bcrypt.hash(password, 12);
  const [firstName, rest] = email.split('@')[0].split(/[._-]/);
  const name = rest ? [firstName, rest] : [firstName, 'Tester'];

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: name[0].charAt(0).toUpperCase() + name[0].slice(1),
        lastName: (name[1] || 'User').charAt(0).toUpperCase() + (name[1] || 'user').slice(1),
        role: 'USER',
        status: 'APPROVED',
        twoFactorEnabled: false,
      },
    });
  }

  let account = await prisma.account.findFirst({ where: { userId: user.id } });
  if (!account) {
    account = await prisma.account.create({
      data: { userId: user.id, label: 'Crypto IRA', balance },
    });
    await prisma.transaction.create({
      data: { accountId: account.id, type: 'BONUS', amount: balance, asset: 'USD', status: 'COMPLETED' },
    });
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  const bal = await prisma.account.findFirst({ where: { userId: user.id } });
  console.log(JSON.stringify({ email, id: user.id, token, balance: Number(bal.balance) }));
}

const email = process.argv[2] || 'alice.smoke@itrustc.test';
const balance = Number(process.argv[3] || 5000);

await upsertUser(email, balance);
await prisma.$disconnect();
