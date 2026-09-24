import { Router } from 'express';
import { runAccrual } from '../lib/accrual.js';

const router = Router();

/**
 * Cron endpoint — Vercel calls it on a schedule (see server/vercel.json) and
 * also sends a signed header we verify, so nobody else can trigger it.
 * Locally, the accrual loop in index.js does this job every 30s instead.
 */
router.post('/cron/accrual', async (req, res) => {
  const auth = req.get('authorization') || '';
  const secret = process.env.CRON_SECRET;

  // Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
  if (secret && auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await runAccrual();
    res.json({ ok: true, ...result, at: new Date().toISOString() });
  } catch (error) {
    console.error('Cron accrual error:', error);
    res.status(500).json({ ok: false, error: 'Accrual run failed' });
  }
});

export default router;
