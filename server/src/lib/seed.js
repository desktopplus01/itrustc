import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@itrustc.com';
  const adminPassword = 'Admin123!@#';

  // Seed the default investment plans once — admins can edit or add more
  // from the admin portal.
  const planCount = await prisma.investmentPlan.count();
  if (planCount === 0) {
    await prisma.investmentPlan.createMany({
      data: [
        {
          name: 'Starter',
          description: 'A short, low-commitment way to put your money to work while you learn the ropes.',
          minAmount: 100,
          maxAmount: 9999,
          durationDays: 30,
          returnPercent: 5,
        },
        {
          name: 'Growth',
          description: 'Our most popular plan — a balanced term with a stronger fixed return.',
          minAmount: 1000,
          maxAmount: 49999,
          durationDays: 90,
          returnPercent: 12,
        },
        {
          name: 'Premium',
          description: 'For serious investors: a six-month term that maximises your fixed return.',
          minAmount: 5000,
          maxAmount: null,
          durationDays: 180,
          returnPercent: 22,
        },
        {
          name: 'Elite',
          description: 'Our flagship annual plan for long-term investors who want the highest fixed yield.',
          minAmount: 25000,
          maxAmount: null,
          durationDays: 365,
          returnPercent: 40,
        },
      ],
    });
    console.log('Seeded 4 investment plans');
  }

  // Check if admin exists
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log('Admin user already exists');
    return;
  }

  // Create admin user
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      status: 'APPROVED',
    },
  });

  // Create admin account with initial balance
  await prisma.account.create({
    data: {
      userId: admin.id,
      label: 'Crypto IRA',
      balance: 0,
    },
  });

  console.log('Admin user created successfully:');
  console.log('  Email:', adminEmail);
  console.log('  Password:', adminPassword);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
