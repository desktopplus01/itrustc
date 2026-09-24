import { Router } from 'express';
import { authenticate, requireApproved } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, requireApproved);

const BINANCE_BASE = 'https://api.binance.com/api/v3';

// Available trading pairs
const PAIRS = {
  BTCUSDT: { base: 'BTC', quote: 'USD', name: 'Bitcoin', icon: '₿', color: '#F7931A' },
  ETHUSDT: { base: 'ETH', quote: 'USD', name: 'Ethereum', icon: 'Ξ', color: '#627EEA' },
  SOLUSDT: { base: 'SOL', quote: 'USD', name: 'Solana', icon: '◎', color: '#9945FF' },
  BNBUSDT: { base: 'BNB', quote: 'USD', name: 'BNB', icon: '◆', color: '#F3BA2F' },
  XRPUSDT: { base: 'XRP', quote: 'USD', name: 'XRP', icon: '✕', color: '#23292F' },
  ADAUSDT: { base: 'ADA', quote: 'USD', name: 'Cardano', icon: '♦', color: '#0033AD' },
  DOGEUSDT: { base: 'DOGE', quote: 'USD', name: 'Dogecoin', icon: 'Ð', color: '#C2A633' },
  AVAXUSDT: { base: 'AVAX', quote: 'USD', name: 'Avalanche', icon: '▲', color: '#E84142' },
};

// GET /api/market/pairs — list available pairs
router.get('/pairs', (req, res) => {
  const pairs = Object.entries(PAIRS).map(([symbol, info]) => ({
    symbol,
    ...info,
  }));
  res.json({ pairs });
});

// GET /api/market/price/:symbol — current price + 24h stats
router.get('/price/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    if (!PAIRS[symbol]) {
      return res.status(400).json({ error: 'Unsupported trading pair' });
    }

    const [tickerRes, priceRes] = await Promise.all([
      fetch(`${BINANCE_BASE}/ticker/24hr?symbol=${symbol}`),
      fetch(`${BINANCE_BASE}/ticker/price?symbol=${symbol}`),
    ]);

    const ticker = await tickerRes.json();
    const price = await priceRes.json();

    res.json({
      symbol,
      ...PAIRS[symbol],
      price: parseFloat(price.price),
      change24h: parseFloat(ticker.priceChangePercent),
      high24h: parseFloat(ticker.highPrice),
      low24h: parseFloat(ticker.lowPrice),
      volume24h: parseFloat(ticker.quoteVolume),
      openPrice: parseFloat(ticker.openPrice),
      lastPrice: parseFloat(ticker.lastPrice),
    });
  } catch (error) {
    console.error('Market price error:', error);
    res.status(500).json({ error: 'Failed to fetch price data' });
  }
});

// GET /api/market/klines/:symbol — historical klines for chart
// interval: 1m, 5m, 15m, 1h, 4h, 1d
router.get('/klines/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const { interval = '1h', limit = '200' } = req.query;

    if (!PAIRS[symbol]) {
      return res.status(400).json({ error: 'Unsupported trading pair' });
    }

    const url = `${BINANCE_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url);
    const klines = await response.json();

    const formatted = klines.map(k => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));

    res.json({ symbol, interval, klines: formatted });
  } catch (error) {
    console.error('Market klines error:', error);
    res.status(500).json({ error: 'Failed to fetch klines data' });
  }
});

// GET /api/market/depth/:symbol — order book depth
router.get('/depth/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const { limit = '20' } = req.query;

    if (!PAIRS[symbol]) {
      return res.status(400).json({ error: 'Unsupported trading pair' });
    }

    const response = await fetch(`${BINANCE_BASE}/depth?symbol=${symbol}&limit=${limit}`);
    const depth = await response.json();

    res.json({
      symbol,
      bids: depth.bids.map(([price, qty]) => ({ price: parseFloat(price), quantity: parseFloat(qty) })),
      asks: depth.asks.map(([price, qty]) => ({ price: parseFloat(price), quantity: parseFloat(qty) })),
    });
  } catch (error) {
    console.error('Market depth error:', error);
    res.status(500).json({ error: 'Failed to fetch order book' });
  }
});

// GET /api/market/exchanges — live spot quotes from real exchanges
router.get('/exchanges', async (req, res) => {
  try {
    const { symbol = 'ETHUSDT' } = req.query;
    const base = symbol.replace(/USDT$/, '');
    const timeout = { signal: AbortSignal.timeout(5000) };

    const fetchJson = async (url) => {
      try {
        const r = await fetch(url, timeout);
        if (!r.ok) return null;
        return await r.json();
      } catch {
        return null;
      }
    };

    const [binance, coinbase, kraken, bybit] = await Promise.all([
      fetchJson(`${BINANCE_BASE}/ticker/24hr?symbol=${symbol}`).then((d) => ({
        price: d ? parseFloat(d.lastPrice) : null,
        volume: d ? parseFloat(d.quoteVolume) : null,
      })),
      fetchJson(`https://api.coinbase.com/v2/prices/${base}-USD/spot`).then((d) => ({
        price: d?.data ? parseFloat(d.data.amount) : null,
        volume: null,
      })),
      fetchJson(`https://api.kraken.com/0/public/Ticker?pair=${base}USD`).then((d) => {
        const key = d?.result && Object.keys(d.result)[0];
        const t = key ? d.result[key] : null;
        return { price: t ? parseFloat(t.c[0]) : null, volume: t ? parseFloat(t.v[1]) * parseFloat(t.c[0]) : null };
      }),
      fetchJson(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`).then((d) => {
        const t = d?.result?.list?.[0];
        return { price: t ? parseFloat(t.lastPrice) : null, volume: t ? parseFloat(t.turnover24h) : null };
      }),
    ]);

    const sources = [
      { name: 'Binance', color: '#F0B90B', ...binance },
      { name: 'Coinbase', color: '#0052FF', ...coinbase },
      { name: 'Kraken', color: '#5741D9', ...kraken },
      { name: 'Bybit', color: '#F7A600', ...bybit },
    ].filter((e) => Number.isFinite(e.price) && e.price > 0);

    if (sources.length === 0) {
      return res.status(502).json({ error: 'Live exchange prices are temporarily unavailable. Please try again in a moment.' });
    }

    const ref = sources[0].price;
    const exchanges = sources.map((e) => ({
      name: e.name,
      price: e.price,
      // Signed % difference vs the first live quote in the list.
      diff: `${e.price >= ref ? '+' : ''}${(((e.price - ref) / ref) * 100).toFixed(3)}%`,
      amount: Number.isFinite(e.volume) && e.volume > 0
        ? `${(e.volume / e.price).toFixed(4)} ${base}`
        : '—',
      volume: Number.isFinite(e.volume) ? e.volume : null,
      color: e.color,
    }));

    res.json({ symbol, exchanges });
  } catch (error) {
    console.error('Market exchanges error:', error);
    res.status(500).json({ error: 'We could not fetch live exchange prices. Please try again.' });
  }
});

// GET /api/market/overview — market overview for multiple coins
router.get('/overview', async (req, res) => {
  try {
    const symbols = Object.keys(PAIRS);
    const tickers = await Promise.all(
      symbols.map(s => fetch(`${BINANCE_BASE}/ticker/24hr?symbol=${s}`).then(r => r.json()))
    );

    const overview = tickers.map((t, i) => ({
      symbol: symbols[i],
      ...PAIRS[symbols[i]],
      price: parseFloat(t.lastPrice),
      change24h: parseFloat(t.priceChangePercent),
      volume24h: parseFloat(t.quoteVolume),
      high24h: parseFloat(t.highPrice),
      low24h: parseFloat(t.lowPrice),
    }));

    res.json({ coins: overview });
  } catch (error) {
    console.error('Market overview error:', error);
    res.status(500).json({ error: 'Failed to fetch market overview' });
  }
});

export default router;
