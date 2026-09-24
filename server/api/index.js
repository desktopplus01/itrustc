/**
 * Vercel serverless entry — wraps the existing Express app without touching it.
 * Vercel's runtime imports this, hands each HTTP request to `app`, and cold
 * starts recycle the process; nothing else changes.
 */
import app from '../src/index.js';

export default app;
