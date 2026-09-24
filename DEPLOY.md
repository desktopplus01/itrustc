# Deploying to Vercel (free tier)

This app deploys as **two Vercel projects** — that's the free-tier-friendly shape:

| Project | What | Root directory |
|---|---|---|
| **itrustc-api** | Express API as serverless functions + a cron for investment accrual | `server/` |
| **itrustc-web** | The React frontend as a static site | repo root |

Both connect to the same Neon database and the same Resend account. Vercel's
free "Hobby" plan covers both projects.

> One-time prep: push this repo to GitHub (already done: `desktopplus01/itrustc`).

---

## Part 1 — The API project

1. Go to [vercel.com](https://vercel.com) → **Add New… → Project** → import `desktopplus01/itrustc`.
2. On the configure screen set:
   - **Project Name**: `itrustc-api`
   - **Root Directory**: click **Edit** → select `server`
   - **Framework Preset**: **Other** (it's plain Node — Vercel auto-detects `api/index.js`)
   - **Build Command**: leave empty · **Output Directory**: leave empty
   - **Install Command**: leave default (`npm install` — a `postinstall` runs `prisma generate`)
3. Open **Environment Variables** and add (Production + Preview):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | your **Neon pooled** string (`…-pooler…neon.tech…`) |
   | `DIRECT_URL` | your **Neon direct** string (no `-pooler`) |
   | `JWT_SECRET` | a long random string — **use a different one than local** |
   | `RESEND_API_KEY` | `re_…` |
   | `EMAIL_FROM` | `iTrustCapital <noreply@yourdomain.com>` (must be a domain verified at resend.com) |
   | `FRONTEND_URL` | `https://itrustc-web.vercel.app` (fill in after Part 2) |
   | `CRON_SECRET` | any long random string (protects the accrual cron) |
   | `NODE_ENV` | `production` |

4. Click **Deploy**. First deploy takes ~1–2 minutes.
5. When it finishes, note the URL — something like `https://itrustc-api.vercel.app`.
   Verify it: open `https://itrustc-api.vercel.app/api/health` in a browser →
   you should see `{"status":"ok",…}`.

> The frontend calls `${BASE_URL}api/...` — same-origin paths like `/itrustc/api`
> only work locally. On Vercel the web project will call the API project
> directly via `VITE_API_URL` (Part 2).

---

## Part 2 — The Web project

1. Vercel → **Add New… → Project** → import the **same repo** again.
2. Configure:
   - **Project Name**: `itrustc-web`
   - **Root Directory**: leave as repo root
   - **Framework Preset**: **Vite** (auto-detected)
   - **Build Command**: `npm run build` (default) · **Output**: `dist` (default)
3. **Environment Variables** (Production + Preview):

   | Name | Value |
   |---|---|
   | `VITE_API_URL` | `https://itrustc-api.vercel.app/api` (your Part 1 URL + `/api`) |

   No `VERCEL` variable needed — Vercel sets it automatically and the Vite
   config uses it to serve the site from the domain root.
4. **Deploy**. You'll get `https://itrustc-web.vercel.app`.

---

## Part 3 — Connect the two (2 minutes)

1. Vercel → **itrustc-api** → **Settings → Environment Variables** → edit
   `FRONTEND_URL` → set it to `https://itrustc-web.vercel.app` → save.
2. Redeploy the API (**Deployments → ⋯ → Redeploy**) so the CORS change takes
   effect — the API only accepts browser calls from that origin.

---

## Part 4 — Verify

1. Open `https://itrustc-web.vercel.app` — the landing page loads.
2. **Sign up** with a real email → OTP arrives by email (or check the API
   project's **Logs** in Vercel if you still use the Resend sandbox sender).
3. Log in as `admin@itrustc.com` → approve the signup.
4. Log in as the new user → fund → invest → the Invest page shows live accrual.

**Seeing errors?** Vercel → project → **Logs** tab shows every request and
console line for both projects — that's the first place to look.

---

## Part 5 — Cron (investment ROI accrual)

`server/vercel.json` registers a cron hitting `/api/cron/accrual` every 6 hours.
On the free tier:

- Crims run on the schedule but **may be delayed a few minutes** — fine here,
  because every API read also recomputes accrual on the fly (exact to the second).
- Set the same `CRON_SECRET` value you gave the API as an env var — the route
  rejects calls without it. (Vercel injects `Authorization: Bearer $CRON_SECRET`
  automatically for its own cron jobs.)

---

## Free-tier limits to know

| Thing | Free tier | Impact |
|---|---|---|
| Vercel functions | 10s timeout (Hobby) | All routes here finish in ms — fine |
| Neon compute | Auto-suspends after ~5 min idle | First request after idle takes ~1s |
| Resend sandbox | Sends only to your own address | Verify a domain to email real users |
| Vercel deploys | 100/day, both projects combined | Plenty |

## Updating after deploy

Just `git push` — both projects redeploy automatically. Database schema
changes: run `npm run db:push` locally with your **Neon** `DIRECT_URL` in
`server/.env` (or `npm run db:neon`, which also re-seeds).
