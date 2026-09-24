import { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { ChevronDown, RefreshCw, Wallet, ArrowUpDown, TrendingUp, TrendingDown, Activity, Copy, Check } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { toast, refreshDashboard } from '../lib/toast';
import { chartTheme } from '../lib/chartTheme';
import Modal from '../components/Modal';
import { MarketSkeleton } from '../components/Skeleton';
import './market.css';

const TIMEFRAMES = [
  { label: '1h', interval: '1h', limit: '100' },
  { label: '24h', interval: '4h', limit: '100' },
  { label: '1w', interval: '1d', limit: '7' },
  { label: '1m', interval: '1d', limit: '30' },
];

const DIFF_COLORS = {
  Limited: { bg: 'rgba(163,230,53,0.12)', color: '#a3e635' },
  Trending: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  Rising: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
};

export default function Market() {
  const { user } = useAuth();
  const [pairs, setPairs] = useState([]);
  const [selectedPair, setSelectedPair] = useState('ETHUSDT');
  const [pairInfo, setPairInfo] = useState(null);
  const [klines, setKlines] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [activeTimeframe, setActiveTimeframe] = useState('24h');
  const [chartType, setChartType] = useState('line');
  const [tradeMode, setTradeMode] = useState('buy');
  const [tradeAmount, setTradeAmount] = useState('');
  const [tradeBusy, setTradeBusy] = useState(false);
  const [tradeError, setTradeError] = useState('');
  const [showPairDropdown, setShowPairDropdown] = useState(false);

  // Real balances
  const [usdBalance, setUsdBalance] = useState(0);
  const [holdings, setHoldings] = useState([]);

  // Wallet demo
  const [walletOpen, setWalletOpen] = useState(false);
  const [walletConnected, setWalletConnected] = useState(
    () => localStorage.getItem('monetraWallet') === 'connected'
  );

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const wsRef = useRef(null);

  // Load pairs list
  useEffect(() => {
    loadPairs();
    loadBalances();
  }, []);

  // Load pair data when selected pair changes
  useEffect(() => {
    loadPairData();
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [selectedPair]);

  // Reload chart when timeframe changes
  useEffect(() => {
    loadKlines();
  }, [selectedPair, activeTimeframe]);

  const loadPairs = async () => {
    try {
      const result = await api.getMarketPairs();
      setPairs(result.pairs || []);
    } catch (e) {
      console.error('Failed to load pairs:', e);
    }
  };

  const loadBalances = async () => {
    try {
      const h = await api.getHoldings();
      setUsdBalance(h.usd || 0);
      setHoldings(h.holdings || []);
    } catch (e) {
      console.error('Failed to load balances:', e);
    }
  };

  const loadPairData = async () => {
    setLoading(true);
    try {
      const [priceData, exchangesData] = await Promise.all([
        api.getMarketPrice(selectedPair),
        api.getMarketExchanges(selectedPair),
      ]);
      setPairInfo(priceData);
      setExchanges(exchangesData.exchanges || []);
    } catch (e) {
      console.error('Failed to load pair data:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadKlines = async () => {
    setChartLoading(true);
    try {
      const tf = TIMEFRAMES.find(t => t.label === activeTimeframe) || TIMEFRAMES[1];
      const result = await api.getMarketKlines(selectedPair, tf.interval, tf.limit);
      setKlines(result.klines || []);
      renderChart(result.klines || []);
    } catch (e) {
      console.error('Failed to load klines:', e);
    } finally {
      setChartLoading(false);
    }
  };

  const connectWebSocket = () => {
    if (wsRef.current) wsRef.current.close();
    const symbol = selectedPair.toLowerCase();
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@trade`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const price = parseFloat(data.p);
      setPairInfo(prev => prev ? { ...prev, price, lastPrice: price } : prev);
    };
    ws.onerror = () => {};
    wsRef.current = ws;
  };

  const renderChart = useCallback((data) => {
    if (!chartContainerRef.current || !data || data.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }

    const th = chartTheme();

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 340,
      layout: {
        background: { color: 'transparent' },
        textColor: th.text,
        fontFamily: 'Inter, sans-serif',
      },
      grid: {
        vertLines: { color: th.grid },
        horzLines: { color: th.grid },
      },
      rightPriceScale: {
        borderColor: th.border,
      },
      timeScale: {
        borderColor: th.border,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: th.crosshair, width: 1, style: 2, labelBackgroundColor: '#a3e635' },
        horzLine: { color: th.crosshair, width: 1, style: 2, labelBackgroundColor: '#a3e635' },
      },
    });

    const isPositive = data[data.length - 1]?.close >= data[0]?.close;
    const lineColor = isPositive ? '#a3e635' : '#ef4444';

    if (chartType === 'candlestick') {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: '#a3e635',
        downColor: '#ef4444',
        borderUpColor: '#a3e635',
        borderDownColor: '#ef4444',
        wickUpColor: '#a3e635',
        wickDownColor: '#ef4444',
      });

      const candleData = data.map(d => ({
        time: Math.floor(d.time / 1000),
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));

      series.setData(candleData);
      seriesRef.current = series;
    } else {
      const series = chart.addSeries(LineSeries, {
        color: lineColor,
        lineWidth: 2,
        crosshairMarkerBackgroundColor: lineColor,
        crosshairMarkerBorderColor: '#111827',
        crosshairMarkerRadius: 5,
        priceLineVisible: false,
        lastValueVisible: true,
      });

      const lineData = data.map(d => ({
        time: Math.floor(d.time / 1000),
        value: d.close,
      }));

      series.setData(lineData);
      seriesRef.current = series;
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        chart.applyOptions({ width: entries[0].contentRect.width });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [chartType]);

  // Re-render chart when type changes
  useEffect(() => {
    if (klines.length > 0) renderChart(klines);
  }, [chartType]);

  const formatPrice = (p) => {
    if (!p) return '0.00';
    return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatVolume = (v) => {
    if (!v) return '$0';
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    return `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const selectedPairInfo = pairs.find(p => p.symbol === selectedPair);
  const baseAsset = selectedPairInfo?.base || 'ETH';
  const heldQty = holdings.find(h => h.asset === baseAsset)?.qty || 0;
  const tradeAmountNum = parseFloat(tradeAmount) || 0;
  const estimatedReceive = tradeMode === 'buy'
    ? (tradeAmountNum / (pairInfo?.price || 1)).toFixed(6)
    : (tradeAmountNum * (pairInfo?.price || 1)).toFixed(2);

  // Deterministic demo wallet address derived from the account id
  const walletAddress = (() => {
    const src = user?.id || 'monetra';
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let i = 0; i < src.length; i++) {
      h1 = (h1 ^ src.charCodeAt(i)) >>> 0;
      h1 = (h1 * 16777619) >>> 0;
      h2 = (h2 + src.charCodeAt(i) * (i + 7)) >>> 0;
    }
    const hex = (n) => (n >>> 0).toString(16).padStart(8, '0');
    const h3 = (h1 * 2654435761 + h2) >>> 0;
    const h4 = ((h2 << 3) ^ h1 ^ src.length) >>> 0;
    const h5 = (h1 + h2 * 2246822519) >>> 0;
    return `0x${hex(h1)}${hex(h2)}${hex(h3)}${hex(h4)}${hex(h5)}`;
  })();

  const submitTrade = async () => {
    setTradeError('');
    if (!tradeAmountNum || tradeAmountNum <= 0) {
      setTradeError('Enter an amount first.');
      return;
    }
    if (!pairInfo?.price) {
      setTradeError('Price is not available right now — try again in a second.');
      return;
    }
    setTradeBusy(true);
    try {
      const order = tradeMode === 'buy'
        ? { side: 'BUY', asset: baseAsset, amount: tradeAmountNum, price: pairInfo.price }
        : { side: 'SELL', asset: baseAsset, qty: tradeAmountNum, price: pairInfo.price };
      const res = await api.trade(order);
      toast(res.message, 'success');
      setTradeAmount('');
      refreshDashboard();
      await loadBalances();
    } catch (e) {
      setTradeError(e.message || 'Trade failed');
    } finally {
      setTradeBusy(false);
    }
  };

  const toggleWallet = () => {
    if (walletConnected) {
      localStorage.removeItem('monetraWallet');
      setWalletConnected(false);
      toast('Wallet disconnected', 'info');
    } else {
      localStorage.setItem('monetraWallet', 'connected');
      setWalletConnected(true);
      setWalletOpen(false);
      toast('Demo wallet connected', 'success');
    }
  };

  if (loading && !pairInfo) {
    return <MarketSkeleton />;
  }

  return (
    <div className="market-page">
      {/* Top Section: Coin Selector + Price */}
      <div className="market-top">
        <div className="market-left-section">
          {/* Coin Selector */}
          <div className="market-coin-selector">
            <div
              className="market-coin-btn"
              onClick={() => setShowPairDropdown(!showPairDropdown)}
            >
              <div className="market-coin-icon" style={{ background: selectedPairInfo?.color || '#627EEA' }}>
                {selectedPairInfo?.icon || '₿'}
              </div>
              <span className="market-coin-pair">
                {selectedPairInfo?.base || 'ETH'}/{selectedPairInfo?.quote || 'USD'}
              </span>
              <ChevronDown size={16} />
            </div>

            {showPairDropdown && (
              <div className="market-pair-dropdown">
                {pairs.map(p => (
                  <div
                    key={p.symbol}
                    className={`market-pair-option ${p.symbol === selectedPair ? 'active' : ''}`}
                    onClick={() => { setSelectedPair(p.symbol); setShowPairDropdown(false); }}
                  >
                    <div className="market-coin-icon" style={{ background: p.color, width: 28, height: 28, fontSize: 12 }}>
                      {p.icon}
                    </div>
                    <div>
                      <div className="market-pair-name">{p.base}/{p.quote}</div>
                      <div className="market-pair-fullname">{p.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Price Display */}
          <div className="market-price-section">
            <div className="market-current-price">
              ${formatPrice(pairInfo?.price)}
            </div>
            {pairInfo?.change24h !== undefined && (
              <div className={`market-price-change ${pairInfo.change24h >= 0 ? 'positive' : 'negative'}`}>
                {pairInfo.change24h >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {pairInfo.change24h >= 0 ? '+' : ''}{pairInfo.change24h.toFixed(2)}% today
              </div>
            )}
          </div>

          {/* Timeframe + Chart Type */}
          <div className="market-chart-controls">
            <div className="market-timeframes">
              {TIMEFRAMES.map(tf => (
                <button
                  key={tf.label}
                  className={`market-tf-btn ${activeTimeframe === tf.label ? 'active' : ''}`}
                  onClick={() => setActiveTimeframe(tf.label)}
                >
                  {tf.label}
                </button>
              ))}
            </div>
            <div className="market-chart-types">
              <button
                className={`market-type-btn ${chartType === 'line' ? 'active' : ''}`}
                onClick={() => setChartType('line')}
              >
                <Activity size={16} />
              </button>
              <button
                className={`market-type-btn ${chartType === 'candlestick' ? 'active' : ''}`}
                onClick={() => setChartType('candlestick')}
              >
                <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                  <rect x="3" y="2" width="2" height="12" rx="0.5" />
                  <rect x="7" y="4" width="2" height="8" rx="0.5" />
                  <rect x="11" y="1" width="2" height="14" rx="0.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Chart + Trade Panel */}
      <div className="market-body">
        {/* Left: Chart + Exchanges */}
        <div className="market-chart-area">
          {/* Chart */}
          <div className="market-chart-wrapper">
            {chartLoading ? (
              <div className="market-chart-loading">
                <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 8 }} />
              </div>
            ) : (
              <div ref={chartContainerRef} style={{ width: '100%', height: 340 }} />
            )}
          </div>

          {/* Exchange Comparison Table */}
          <div className="market-exchanges">
            <div className="market-exchange-header">
              <span>Exchange</span>
              <span>{selectedPairInfo?.base || 'ETH'}/{selectedPairInfo?.quote || 'USD'}</span>
              <span>Amount</span>
              <span>Diff</span>
              <span>Volume</span>
            </div>
            {exchanges.map((ex, i) => (
              <div key={i} className="market-exchange-row">
                <div className="market-exchange-name">
                  <div className="market-exchange-dot" style={{ background: ex.color }} />
                  {ex.name}
                </div>
                <div className="market-exchange-price">{formatPrice(ex.price)}</div>
                <div className="market-exchange-amount">{ex.amount} {selectedPairInfo?.base || 'ETH'}</div>
                <div className="market-exchange-diff">
                  <span className="market-diff-badge" style={{
                    background: DIFF_COLORS[ex.diff]?.bg || 'rgba(255,255,255,0.06)',
                    color: DIFF_COLORS[ex.diff]?.color || 'rgba(255,255,255,0.5)',
                  }}>
                    {ex.diff}
                  </span>
                </div>
                <div className="market-exchange-volume">{formatVolume(ex.volume)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Trade Panel */}
        <div className="market-trade-panel">
          {/* Buy/Sell Tabs */}
          <div className="market-trade-tabs">
            <button
              className={`market-trade-tab ${tradeMode === 'buy' ? 'active buy' : ''}`}
              onClick={() => setTradeMode('buy')}
            >
              BUY
            </button>
            <button
              className={`market-trade-tab ${tradeMode === 'sell' ? 'active sell' : ''}`}
              onClick={() => setTradeMode('sell')}
            >
              SELL
            </button>
            <div className="market-trade-actions">
              <button
                className="market-trade-icon-btn"
                title="Refresh market data"
                onClick={() => { loadKlines(); loadPairData(); }}
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* You Buy / You Spend */}
          <div className="market-trade-inputs">
            <div className="market-trade-input-card">
              <div className="market-trade-input-header">
                <div className="market-trade-coin">
                  <div className="market-trade-coin-icon" style={{ background: selectedPairInfo?.color || '#627EEA' }}>
                    {selectedPairInfo?.icon || 'Ξ'}
                  </div>
                  <span>{selectedPairInfo?.base || 'ETH'}</span>
                </div>
                <span className="market-trade-label">You {tradeMode === 'buy' ? 'Buy' : 'Sell'}</span>
              </div>
              <input
                type="number"
                className="market-trade-input"
                placeholder="0.00"
                value={tradeMode === 'buy' ? estimatedReceive : tradeAmount}
                onChange={(e) => {
                  if (tradeMode === 'sell') setTradeAmount(e.target.value);
                }}
                readOnly={tradeMode === 'buy'}
              />
              <div className="market-trade-balance">
                Balance <span>{heldQty.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 })} {baseAsset}</span>
              </div>
            </div>

            <div
              className="market-trade-swap"
              role="button"
              tabIndex={0}
              title={tradeMode === 'buy' ? 'Switch to sell' : 'Switch to buy'}
              onClick={() => { setTradeMode((m) => (m === 'buy' ? 'sell' : 'buy')); setTradeAmount(''); setTradeError(''); }}
              style={{ cursor: 'pointer' }}
            >
              <div className="market-trade-swap-btn">
                <ArrowUpDown size={16} />
              </div>
            </div>

            <div className="market-trade-input-card">
              <div className="market-trade-input-header">
                <div className="market-trade-coin">
                  <div className="market-trade-coin-icon" style={{ background: '#a3e635' }}>$</div>
                  <span>USD</span>
                </div>
                <span className="market-trade-label">You {tradeMode === 'buy' ? 'Spend' : 'Receive'}</span>
              </div>
              <input
                type="number"
                className="market-trade-input"
                placeholder="0.00"
                value={tradeMode === 'buy' ? tradeAmount : estimatedReceive}
                onChange={(e) => {
                  if (tradeMode === 'buy') setTradeAmount(e.target.value);
                }}
                readOnly={tradeMode === 'sell'}
              />
              <div className="market-trade-balance">
                Balance <span>${usdBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Buy/Sell Button */}
          <button
            className={`market-trade-submit ${tradeMode}`}
            onClick={submitTrade}
            disabled={tradeBusy}
            style={tradeBusy ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
          >
            {tradeBusy ? 'Processing…' : tradeMode === 'buy' ? `Buy ${baseAsset}` : `Sell ${baseAsset}`}
          </button>

          {tradeError && (
            <div className="pg-form-msg error" style={{ marginTop: 10, marginBottom: 0 }}>
              {tradeError}
            </div>
          )}

          {/* Connect Wallet */}
          <button className="market-connect-wallet" onClick={() => setWalletOpen(true)}>
            <Wallet size={16} />
            {walletConnected ? 'Wallet connected' : 'Connect Wallet'}
          </button>

          {/* Available Balance Card */}
          <div className="market-balance-card">
            <div className="market-balance-label">Available Balance</div>
            <div className="market-balance-amount">
              {heldQty.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 })} {baseAsset}
              {pairInfo?.change24h !== undefined && (
                <span className={`market-balance-change ${pairInfo.change24h >= 0 ? 'positive' : 'negative'}`}>
                  {pairInfo.change24h >= 0 ? '+' : ''}{pairInfo.change24h.toFixed(2)}%
                </span>
              )}
            </div>
            <div className="market-balance-details">
              <div>
                <label>Estimate fee</label>
                <span>4.28 USD</span>
              </div>
              <div>
                <label>You will receive</label>
                <span>{tradeAmountNum > 0 ? formatPrice(parseFloat(estimatedReceive)) : '0.00'} USD</span>
              </div>
              <div>
                <label>Spread</label>
                <span>0%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet modal */}
      <Modal
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
        title={walletConnected ? 'Wallet connected' : 'Connect a wallet'}
        subtitle="Demo wallet connection — stored locally in your browser, no extensions required."
      >
        <div className="pg-field">
          <label>Your deposit address</label>
          <div className="pg-copy-line">
            <span style={{ fontSize: 12 }}>{walletAddress}</span>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(walletAddress);
                toast('Address copied', 'success');
              }}
            >
              <Copy size={12} style={{ verticalAlign: -2 }} /> Copy
            </button>
          </div>
        </div>
        <div className="pg-note">
          Send supported crypto to this address to fund the demo balance shown on the trade panel. Nothing leaves
          your machine — this is a simulated wallet.
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button className="pg-btn pg-btn-ghost" style={{ flex: 1 }} onClick={() => setWalletOpen(false)}>
            Close
          </button>
          <button className="pg-btn pg-btn-primary" style={{ flex: 1 }} onClick={toggleWallet}>
            {walletConnected ? 'Disconnect' : <><Check size={15} /> Connect wallet</>}
          </button>
        </div>
      </Modal>
    </div>
  );
}
