// One-shot Neon setup: verifies the connection strings, pushes the schema and
// seeds the admin account + investment plans. Run after pasting your Neon
// credentials into server/.env:
//
//   npm run db:neon
//
import 'dotenv/config';
import { execSync } from 'child_process';
import net from 'net';
import prisma from '../src/lib/prisma.js';

function hostOf(url) {
  try { return new URL(url).hostname; } catch { return null; }
}

/** Wait until a host accepts TCP on 5432 (Neon computes sleep; direct endpoints
 *  refuse connections until the pooled link wakes them — allow up to ~45s). */
function waitUntilReachable(host, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = (left) => {
      const s = net.connect({ host, port: 5432, timeout: 5000 });
      const done = (ok, err) => { s.destroy(); ok ? resolve() : (Date.now() > deadline ? reject(err || new Error('timeout')) : setTimeout(() => attempt(left), 3000)); };
      s.on('connect', () => done(true));
      s.on('timeout', () => done(false));
      s.on('error', (e) => done(false, e));
    };
    attempt(0);
  });
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !v.trim()) {
    console.error(`\n✗ ${name} is missing from server/.env.`);
    console.error('  Neon Console → your project → Connect → copy the pooled string into DATABASE_URL');
    console.error('  and the direct (unpooled) string into DIRECT_URL. Both end with ?sslmode=require.\n');
    process.exit(1);
  }
  return v.trim();
}

function looksLikeNeon(url, name) {
  if (!/neon\.tech/.test(url)) {
    console.error(`\n✗ ${name} doesn't point at Neon (expected …neon.tech…).`);
    console.error('  In Neon Console use Connect → Prisma tab, which gives you both strings.\n');
    process.exit(1);
  }
}

async function main() {
  const databaseUrl = requireEnv('DATABASE_URL');
  const directUrl = requireEnv('DIRECT_URL');

  if (/neon\.tech/.test(databaseUrl)) {
    looksLikeNeon(databaseUrl, 'DATABASE_URL');
    looksLikeNeon(directUrl, 'DIRECT_URL');
    if (!/-pooler/.test(databaseUrl)) {
      console.warn('⚠ DATABASE_URL does not use the -pooler host. For the free tier it is strongly');
      console.warn('  recommended (the pooler is what allows many connections). Copy the "pooled"');
      console.warn('  string from Neon Console → Connect → Prisma.');
    }
    if (/-pooler/.test(directUrl)) {
      console.error('\n✗ DIRECT_URL must be the *direct* (unpooled) string — migrations cannot run');
      console.error('  through PgBouncer. Copy both strings from Neon Console → Connect → Prisma.\n');
      process.exit(1);
    }
    console.log('✓ Neon connection strings look right (pooled runtime + direct migrations)');
  } else {
    console.log('✓ Non-Neon DATABASE_URL detected — DIRECT_URL must match it for local Postgres');
    if (directUrl !== databaseUrl) {
      console.error('\n✗ For local Postgres, set DIRECT_URL to the same value as DATABASE_URL.\n');
      process.exit(1);
    }
  }

  // 1) Reachability check (via the pooled URL — this also wakes the compute)
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✓ Connected to the database');
  } catch (e) {
    console.error('\n✗ Could not connect. Double-check the strings (and that the Neon project is not suspended).');
    console.error(`  ${e.message.split('\n')[0]}\n`);
    process.exit(1);
  }

  // 2) Give the direct host a moment — Neon computes take a few seconds to
  //    wake, and prisma db push runs against DIRECT_URL.
  if (/neon\.tech/.test(directUrl)) {
    const directHost = hostOf(directUrl);
    process.stdout.write(`→ Waiting for the direct endpoint (${directHost}) to accept connections… `);
    try {
      await waitUntilReachable(directHost);
      console.log('ready');
    } catch (e) {
      console.log('\n✗ The direct endpoint never accepted a connection. Keep this window open,');
      console.error('  confirm the project is awake in Neon Console, and re-run npm run db:neon.\n');
      process.exit(1);
    }
  }

  // 3) Push the schema (retry once in case the compute was still waking)
  const push = () => execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
  console.log('→ Pushing schema…');
  try {
    push();
  } catch {
    console.log('  push failed once — giving the compute another moment, then retrying…');
    await new Promise((r) => setTimeout(r, 8000));
    push();
  }

  // 4) Seed (idempotent: only creates what's missing)
  console.log('→ Seeding admin + investment plans…');
  execSync('node src/lib/seed.js', { stdio: 'inherit' });

  const users = await prisma.user.count();
  const plans = await prisma.investmentPlan.count();
  console.log(`\n✓ Neon is ready — ${users} user(s), ${plans} plan(s). Start the server with: npm run dev\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
