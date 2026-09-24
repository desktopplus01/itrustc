// Dev utility: reset smoke-test users' passwords back to Test1234! (no 2FA).
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma.js';

const hash = await bcrypt.hash('Test1234!', 12);
for (const email of ['alice.smoke@itrustc.test', 'bob.smoke@itrustc.test']) {
  try {
    await prisma.user.update({
      where: { email },
      data: { passwordHash: hash, twoFactorEnabled: false },
    });
    console.log('reset', email);
  } catch {
    console.log('skip (missing)', email);
  }
}
await prisma.$disconnect();
