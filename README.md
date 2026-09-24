# iTrustCapital — Investment Platform

A full-stack investment platform: users fund their wallet with crypto, invest in
admin-managed plans, and every money movement is reviewed by the admin.

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Express.js + Prisma ORM
- **Database**: PostgreSQL
- **Email**: Resend (OTPs, approvals, bonus unlocks)

## Setup Instructions

### Prerequisites

- Node.js 18+
- PostgreSQL
- Resend API key (for emails)

### 1. Database Setup

**Using Neon (free tier recommended):**

1. Create a project at [neon.tech](https://neon.tech)
2. In Neon Console → your project → **Connect** → tab **Prisma**, copy both strings
3. Paste into `server/.env`:

```
DATABASE_URL="postgresql://USER:PASSWORD@ep-XXXX-pooler.REGION.aws.neon.tech/DBNAME?sslmode=require"   # pooled — runtime
DIRECT_URL="postgresql://USER:PASSWORD@ep-XXXX.REGION.aws.neon.tech/DBNAME?sslmode=require"            # direct — migrations
```

4. Run the one-shot setup (pushes schema + seeds admin & plans):

```bash
cd server
npm run db:neon
```

**Or local PostgreSQL:** set `DATABASE_URL` and `DIRECT_URL` to the same `postgresql://…localhost…` value in `server/.env`, then `npx prisma db push && npm run db:seed`.

### 2. Backend Setup

```bash
cd server
npm install
npx prisma generate
npx prisma db push
npm run db:seed  # Creates admin user + 4 investment plans
npm run dev      # Starts server on port 3001
```

### 3. Frontend Setup

```bash
# From root directory
npm install
npm run dev      # Starts frontend on port 5173
```

### 4. Environment Variables

**server/.env:**
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/itrustc"
JWT_SECRET="your-secret-key"
RESEND_API_KEY="re_your_key"
EMAIL_FROM="iTrustCapital <noreply@example.com>"
FRONTEND_URL="http://localhost:5173"
```

## Default Admin Account

- **Email**: admin@itrustc.com
- **Password**: Admin123!@#

## Core rules of the platform

1. **Everything is investment-first.** The Investments page lists admin-managed
   plans; picking one moves money from the wallet into motion until maturity.
2. **The $100 welcome bonus is locked.** It lives outside the wallet and can't
   be invested, sent or withdrawn until the user has funded **$1,000** of their
   own money. The UI always shows progress; the unlock is automatic and emailed.
3. **Every money movement needs admin approval — deposits, withdrawals,
   wallet sends, card funding, card→wallet, card sends.** Funds are held at
   request time and settled (or refunded) on review. Every user-facing dialog
   states: *approval takes up to 3 working days*.
4. **Users fund by sending crypto** to addresses configured by the admin, and
   paste the transaction hash for verification.
5. **Cards** are funded only via those crypto deposits, and can only be used to
   top up the main wallet or send money to another user on the app (by email).

## User Flow

1. **Signup** → email OTP (Resend) → account created as `PENDING`
2. **Admin reviews** → approves or rejects (email sent)
3. **On approval** → $100 bonus credited (locked) + email
4. **Fund wallet** → crypto to a verified address + TXID → admin approves → balance credited, $1,000 counter moves
5. **Invest** → pick a plan → money in motion → mature → claim principal + returns
6. **Send / withdraw / card moves** → held → admin approves (or refunds) → email

## Admin portal

- **Dashboard** — real-time stats: users, balances, invested capital, claimable
  payouts, locked bonuses, and the oldest pending requests.
- **All users / Pending signups** — search, filter, approve (grants the locked
  $100 bonus) or reject.
- **Money requests** — approve/decline deposits, withdrawals and sends with an
  optional note; balances settle or refund instantly.
- **Card transactions** — the dedicated approve/reject page for card funding,
  card→wallet and card sends.
- **Investment plans** — create/edit/hide plans (amount range, duration, fixed
  return %).
- **Deposit addresses** — manage the verified crypto addresses users send to.

The portal is fully responsive (drawer sidebar, stacked cards on mobile) and
shares the dashboard's dark/light theme.

## API endpoints

### Auth
- `POST /api/auth/request-otp` — email OTP via Resend (signup/reset)
- `POST /api/auth/verify-otp` / `verify-login` — verify codes
- `POST /api/auth/signup` / `login` / `reset-password`

### User (requires auth + approved)
- `GET /api/users/me` — profile + wallet/bonus money state
- `GET /api/users/dashboard`, `/portfolio`, `/transactions`, `/goals`

### Payments (admin-approval based)
- `GET /api/payments` — balances, bonus lock progress, recent activity
- `GET /api/payments/addresses` — verified crypto deposit addresses
- `POST /api/payments/deposit` — `{ amount, addressId, txHash }` → PENDING
- `POST /api/payments/withdraw` / `/transfer` — funds held → PENDING
- `GET /api/payments/requests` — the user's approval queue
- `POST /api/payments/cards/:id/fund|to-wallet|send` → PENDING

### Investments
- `GET /api/investments/plans` — active plans + money state
- `GET /api/investments` — my investments + summary
- `POST /api/investments` — `{ planId, amount }` sets it in motion
- `POST /api/investments/:id/claim` — claim a matured investment

### Admin (requires admin role)
- `GET /api/admin/stats` — platform stats incl. approval queues
- `GET /api/admin/users|pending`, `POST /api/admin/approve|reject/:id`
- `GET /api/admin/requests` / `card-transactions`
- `POST /api/admin/requests/:id/approve|reject` — `{ note? }`
- `GET/POST/PUT/DELETE /api/admin/plans[/:id]`
- `GET/POST/PUT/DELETE /api/admin/addresses[/:id]`

## Smoke tests

```bash
# Backend end-to-end (server must be running on :3001)
cd server && bash scripts/e2e-flows.sh
```

Covers: deposit → approve, withdrawal → reject (refund), email send → approve,
card funding → card → wallet/send, investment create/maturity guard, bonus state.
