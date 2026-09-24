import { useState, useEffect, useRef } from "react";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import api from "../lib/api";
import { createChart, AreaSeries } from "lightweight-charts";
import Modal from "../components/Modal";
import NotificationDropdown from "../components/NotificationDropdown";
import { DashboardSkeleton } from "../components/Skeleton";
import Toaster from "../components/Toaster";
import { toast } from "../lib/toast";
import { chartTheme } from "../lib/chartTheme";
import Market from "./Market";
import SettingsPage from "./SettingsPage";
import PaymentsPage from "./PaymentsPage";
import InvestmentsPage from "./InvestmentsPage";
import GoalsPage from "./GoalsPage";
import TransactionsPage from "./TransactionsPage";
import CardsPage from "./CardsPage";
import "./dashboard.css";
import "./pages.css";

const SidebarIcons = {
  grid: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>,
  chart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>,
  trending: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  wallet: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 10H18a2 2 0 0 0 0 4h4"/></svg>,
  card: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></svg>,
  target: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  list: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  logout: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  help: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  star: <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  down: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
  up: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
  dots: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>,
  travel: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z"/></svg>,
  property: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  education: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 6 3 6 3s3 0 6-3v-5"/></svg>,
};

const NAV_ITEMS = [
  { icon: 'grid', path: '/dashboard', label: 'Home' },
  { icon: 'trending', path: '/dashboard/invest', label: 'Invest' },
  { icon: 'chart', path: '/dashboard/activity', label: 'Market' },
  { icon: 'wallet', path: '/dashboard/manage', label: 'Payments' },
  { icon: 'card', path: '/dashboard/card', label: 'Cards' },
  { icon: 'target', path: '/dashboard/goals', label: 'Goals' },
  { icon: 'list', path: '/dashboard/account', label: 'Activity' },
  { icon: 'settings', path: '/dashboard/settings', label: 'Settings' },
];

function BarChart({ data, activeTab }) {
  if (!data || data.length === 0) {
    return <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>No data yet</div>;
  }

  const maxVal = Math.max(...data.map(d => d[activeTab] || 0), 1) * 1.1;
  const w = 700;
  const h = 260;
  const padLeft = 45;
  const padRight = 15;
  const padTop = 30;
  const padBottom = 35;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;

  const barWidth = (chartW / data.length) * 0.5;
  const barGap = (chartW / data.length) * 0.5;

  const yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1];
  const yLabels = ['0k', '5k', '10k', '15k', '20k', '35k'];

  const currentMonth = new Date().getMonth();

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mon-chart-svg">
      <defs>
        <linearGradient id="greenBarGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a3e635" stopOpacity="1"/>
          <stop offset="100%" stopColor="#4d7c0f" stopOpacity="0.8"/>
        </linearGradient>
        <linearGradient id="grayBarGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.12)" stopOpacity="1"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0.04)" stopOpacity="1"/>
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Grid lines */}
      {yTicks.map((pct, i) => (
        <g key={i}>
          <line
            x1={padLeft}
            y1={padTop + chartH * (1 - pct)}
            x2={w - padRight}
            y2={padTop + chartH * (1 - pct)}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
            strokeDasharray={pct === 0 ? "0" : "4,4"}
          />
          <text
            x={padLeft - 10}
            y={padTop + chartH * (1 - pct) + 4}
            textAnchor="end"
            fill="rgba(255,255,255,0.3)"
            fontSize="11"
            fontFamily="Inter, sans-serif"
          >
            {yLabels[i]}
          </text>
        </g>
      ))}

      {/* Bars */}
      {data.map((d, i) => {
        const x = padLeft + (i / data.length) * chartW + barGap / 2;
        const val = d[activeTab] || 0;
        const barH = Math.max((val / maxVal) * chartH, 4);
        const y = padTop + chartH - barH;
        const isActive = i === currentMonth;

        return (
          <g key={i}>
            {/* Bar shadow for active */}
            {isActive && (
              <rect
                x={x - 2}
                y={y + 2}
                width={barWidth + 4}
                height={barH}
                rx={6}
                fill="rgba(163,230,53,0.2)"
                filter="url(#glow)"
              />
            )}

            {/* Main bar */}
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={6}
              fill={isActive ? 'url(#greenBarGrad)' : 'url(#grayBarGrad)'}
            />

            {/* Top highlight for active bar */}
            {isActive && (
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={3}
                rx={1.5}
                fill="rgba(163,230,53,0.6)"
              />
            )}

            {/* Tooltip for active bar */}
            {isActive && (
              <g>
                <rect
                  x={x + barWidth / 2 - 42}
                  y={y - 40}
                  width={84}
                  height={28}
                  rx={8}
                  fill="#a3e635"
                />
                <polygon
                  points={`${x + barWidth / 2 - 6},${y - 12} ${x + barWidth / 2 + 6},${y - 12} ${x + barWidth / 2},${y - 4}`}
                  fill="#a3e635"
                />
                <text
                  x={x + barWidth / 2}
                  y={y - 22}
                  textAnchor="middle"
                  fill="#000"
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="Inter, sans-serif"
                >
                  ${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </text>
              </g>
            )}

            {/* Month label */}
            <text
              x={x + barWidth / 2}
              y={h - 10}
              textAnchor="middle"
              fill={isActive ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)'}
              fontSize="11"
              fontFamily="Inter, sans-serif"
              fontWeight={isActive ? '500' : '400'}
            >
              {d.month}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function CryptoChart({ data, selectedCoin }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }

    const th = chartTheme();
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 300,
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
        timeVisible: false,
      },
      crosshair: {
        vertLine: { color: th.crosshair, width: 1, style: 2 },
        horzLine: { color: th.crosshair, width: 1, style: 2 },
      },
    });

    const lastClose = data[data.length - 1]?.close;
    const prevClose = data[data.length - 2]?.close;
    const isPositive = lastClose >= prevClose;

    const series = chart.addSeries(AreaSeries, {
      topColor: isPositive ? 'rgba(163,230,53,0.28)' : 'rgba(239,68,68,0.28)',
      bottomColor: isPositive ? 'rgba(163,230,53,0.02)' : 'rgba(239,68,68,0.02)',
      lineColor: isPositive ? '#a3e635' : '#ef4444',
      lineWidth: 2,
      crosshairMarkerBackgroundColor: isPositive ? '#a3e635' : '#ef4444',
      crosshairMarkerBorderColor: th.panel,
      crosshairMarkerRadius: 5,
    });

    const chartData = data.map((d, i) => {
      const now = new Date();
      const date = new Date(now.getTime() - (data.length - 1 - i) * 86400000);
      return {
        time: date.toISOString().split('T')[0],
        value: d.close,
      };
    });

    series.setData(chartData);
    chart.timeScale().fitContent();

    chartRef.current = chart;
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width } = entries[0].contentRect;
        chart.applyOptions({ width });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [data, selectedCoin]);

  if (!data || data.length === 0) {
    return (
      <div style={{ width: '100%', height: 300, borderRadius: 8, overflow: 'hidden' }}>
        <div className="skeleton" style={{ width: '100%', height: '100%' }} />
      </div>
    );
  }

  return <div ref={chartContainerRef} style={{ width: '100%', height: 300 }} />;
}

function DashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cryptoData, setCryptoData] = useState([]);
  const [selectedCoin, setSelectedCoin] = useState('BTCUSDT');
  const [livePrice, setLivePrice] = useState(null);
  const [priceChange, setPriceChange] = useState(0);
  const [searchQ, setSearchQ] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    fetchCryptoData();
    let ws;
    const timer = setTimeout(() => {
      ws = connectWebSocket();
    }, 100);
    return () => {
      clearTimeout(timer);
      if (ws) ws.close();
    };
  }, [selectedCoin]);

  const loadData = async () => {
    try {
      const result = await api.getMonetraDashboard();
      setData(result);
    } catch (e) {
      console.error('Monetra dashboard error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCryptoData = async () => {
    try {
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${selectedCoin}&interval=1d&limit=30`
      );
      const klines = await response.json();
      const formatted = klines.map((k) => ({
        date: new Date(k[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
        change: ((parseFloat(k[4]) - parseFloat(k[1])) / parseFloat(k[1])) * 100,
      }));
      setCryptoData(formatted);
      if (formatted.length > 1) {
        const current = formatted[formatted.length - 1].close;
        const previous = formatted[formatted.length - 2].close;
        setLivePrice(current);
        setPriceChange(((current - previous) / previous) * 100);
      }
    } catch (e) {
      console.error('Fetch crypto error:', e);
    }
  };

  const connectWebSocket = () => {
    const symbol = selectedCoin.toLowerCase();
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@trade`);
    ws.onmessage = (event) => {
      const d = JSON.parse(event.data);
      setLivePrice(parseFloat(d.p));
    };
    ws.onerror = (error) => {
      console.log('WebSocket error:', error);
    };
    return ws;
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = data?.user?.firstName || user?.firstName || 'User';

  const coins = [
    { symbol: 'BTCUSDT', name: 'Bitcoin', icon: '₿' },
    { symbol: 'ETHUSDT', name: 'Ethereum', icon: 'Ξ' },
    { symbol: 'SOLUSDT', name: 'Solana', icon: '◎' },
    { symbol: 'BNBUSDT', name: 'BNB', icon: '◆' },
  ];

  return (
    <>
      {/* Header */}
      <div className="mon-header">
        <div>
          <h1>{greeting()}, {firstName}</h1>
          <p>Stay on top of your tasks, monitor progress, and track status.</p>
        </div>
        <form
          className="mon-search"
          onSubmit={(e) => {
            e.preventDefault();
            const q = searchQ.trim();
            navigate(q ? `/dashboard/account?search=${encodeURIComponent(q)}` : '/dashboard/account');
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            placeholder="Search transactions…"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
        </form>
      </div>

      {/* Bonus lock + pending approval notices */}
      {(data?.bonus && !data.bonus.unlocked && data.bonus.balance > 0) || data?.pendingRequests > 0 ? (
        <div className="pg-notice-stack" style={{ marginBottom: 16 }}>
          {data?.bonus && !data.bonus.unlocked && data.bonus.balance > 0 && (
            <div className="pg-notice warn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>
                Your <strong>${Number(data.bonus.balance).toLocaleString()} welcome bonus</strong> is locked until
                you've funded <strong>$1,000</strong> of your own money (you're at{' '}
                <strong>${Number(data.bonus.fundedAmount || 0).toLocaleString()}</strong>). Fund your wallet to
                unlock it.{' '}
                <button
                  className="pg-clear-btn"
                  style={{ padding: 0, color: 'inherit', textDecoration: 'underline' }}
                  onClick={() => navigate('/dashboard/invest')}
                >
                  See progress
                </button>
              </span>
            </div>
          )}
          {data?.pendingRequests > 0 && (
            <div className="pg-notice info">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>
                <strong>{data.pendingRequests}</strong> of your requests are waiting for admin review — approval
                takes up to <strong>3 working days</strong>.
              </span>
            </div>
          )}
        </div>
      ) : null}

      {/* Smart Wallet + Balance Cards Row */}
      <div className="mon-top-row">
        {/* Smart Wallet */}
        <div className="mon-smart-wallet">
          <div className="mon-smart-wallet-header">
            <div>
              <div className="mon-smart-wallet-title">Smart Wallet</div>
              <div className="mon-smart-wallet-sub">Effortless saving goals.</div>
            </div>              <button className="mon-add-new" onClick={() => navigate('/dashboard/goals?new=1')}>Add New +</button>
          </div>
          <div className="mon-wallet-amount">
            {(data?.smartWallet?.totalSaving || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            <span className="currency">USD</span>
          </div>
          <div className="mon-wallet-label">Total Saving</div>
          <div className="mon-categories">
            {(data?.smartWallet?.categories || []).length === 0 ? (
              <div className="mon-category-empty">
                No savings goals yet — create one and it will show up here.
              </div>
            ) : (
              data.smartWallet.categories.map((cat, i) => (
                <div key={i} className="mon-category" onClick={() => navigate('/dashboard/goals')} role="button" tabIndex={0}>
                  <div className="mon-category-icon">
                    {SidebarIcons[cat.icon] || SidebarIcons.target}
                  </div>
                  <span>{cat.name}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Balance Cards */}
        <div className="mon-balances-grid">
          <div className="mon-balance-card">
            <div className="mon-balance-card-header">
              <div className="mon-balance-card-title">
                <div className="mon-balance-card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 10H18a2 2 0 0 0 0 4h4"/></svg>
                </div>
                Current Balance
              </div>
              <button
                className="mon-balance-card-more"
                title="View payments"
                onClick={() => navigate('/dashboard/manage')}
              >...</button>
            </div>
            <div className="mon-balance-card-amount">${(data?.balances?.current?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className={`mon-balance-card-change ${(data?.balances?.current?.change || 0) >= 0 ? 'positive' : 'negative'}`}>
              {(data?.balances?.current?.change || 0) >= 0 ? '+' : ''}{data?.balances?.current?.change || 0}% ↗
            </div>
          </div>
          <div className="mon-balance-card">
            <div className="mon-balance-card-header">
              <div className="mon-balance-card-title">
                <div className="mon-balance-card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
                </div>
                Savings
              </div>
              <button
                className="mon-balance-card-more"
                title="View savings goals"
                onClick={() => navigate('/dashboard/goals')}
              >...</button>
            </div>
            <div className="mon-balance-card-amount">${(data?.balances?.savings?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className={`mon-balance-card-change ${(data?.balances?.savings?.change || 0) >= 0 ? 'positive' : 'negative'}`}>
              {(data?.balances?.savings?.change || 0) >= 0 ? '+' : ''}{data?.balances?.savings?.change || 0}% ↗
            </div>
          </div>
          <div className="mon-balance-card">
            <div className="mon-balance-card-header">
              <div className="mon-balance-card-title">
                <div className="mon-balance-card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                Income
              </div>
              <button
                className="mon-balance-card-more"
                title="View incoming transactions"
                onClick={() => navigate('/dashboard/account?type=DEPOSIT')}
              >...</button>
            </div>
            <div className="mon-balance-card-amount">${(data?.balances?.income?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className={`mon-balance-card-change ${(data?.balances?.income?.change || 0) >= 0 ? 'positive' : 'negative'}`}>
              {(data?.balances?.income?.change || 0) >= 0 ? '+' : ''}{data?.balances?.income?.change || 0}% ↗
            </div>
          </div>
          <div className="mon-balance-card">
            <div className="mon-balance-card-header">
              <div className="mon-balance-card-title">
                <div className="mon-balance-card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                </div>
                Expenses
              </div>
              <button
                className="mon-balance-card-more"
                title="View outgoing transactions"
                onClick={() => navigate('/dashboard/account?type=WITHDRAWAL')}
              >...</button>
            </div>
            <div className="mon-balance-card-amount">${(data?.balances?.expenses?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className={`mon-balance-card-change ${(data?.balances?.expenses?.change || 0) >= 0 ? 'positive' : 'negative'}`}>
              {(data?.balances?.expenses?.change || 0) >= 0 ? '+' : ''}{data?.balances?.expenses?.change || 0}% ↘
            </div>
          </div>
        </div>
      </div>

      {/* Live Crypto Chart */}
      <div className="mon-cashflow">
        <div className="mon-cashflow-header">
          <div>
            <div className="mon-cashflow-title">Live Crypto Prices</div>
            <div className="mon-cashflow-amount">
              {livePrice ? `$${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="skeleton" style={{ display: 'inline-block', width: 100, height: 28, borderRadius: 6, verticalAlign: 'middle' }} />}
              {priceChange !== 0 && (
                <span className={`mon-price-change ${priceChange >= 0 ? 'positive' : 'negative'}`}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                </span>
              )}
            </div>
          </div>
          <div className="mon-coin-selector">
            {coins.map(coin => (
              <button
                key={coin.symbol}
                className={`mon-coin-btn ${selectedCoin === coin.symbol ? 'active' : ''}`}
                onClick={() => setSelectedCoin(coin.symbol)}
              >
                <span className="mon-coin-icon">{coin.icon}</span>
                {coin.name}
              </button>
            ))}
          </div>
        </div>
        <div className="mon-chart-container">
          <CryptoChart data={cryptoData} selectedCoin={selectedCoin}/>
        </div>
      </div>
    </>
  );
}

function RightPanel({ data }) {
  const navigate = useNavigate();
  const hasRecipients = (data?.quickSendUsers || []).length > 0;

  return (
    <>
      {/* Quick Send */}
      <div className="mon-quick-send">
        <div className="mon-quick-send-title">Quick send</div>
        <div className="mon-quick-send-sub">
          {hasRecipients ? 'Send again to people you have paid before' : 'People you send money to will appear here'}
        </div>
        <div className="mon-quick-send-list">
          {data?.quickSendUsers?.map((u) => (
            <div
              key={u.id}
              className="mon-quick-send-avatar"
              style={{ background: u.color }}
              title={`Send to ${u.name}`}
              onClick={() => navigate(`/dashboard/manage?tab=send&to=${encodeURIComponent(u.email || u.name)}`)}
            >
              {u.avatar}
            </div>
          ))}
          <button
            className="mon-quick-send-more"
            title="Send money"
            onClick={() => navigate('/dashboard/manage?tab=send')}
          >→</button>
        </div>
      </div>

      {/* Credit Card */}
      {data?.card ? (
        <div
          className="mon-credit-card"
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/dashboard/card')}
          title="Manage cards"
        >
          <div className="mon-credit-card-top">
            <div className="mon-credit-card-chip">
              <svg viewBox="0 0 24 16" width="24" height="16">
                <rect x="0" y="0" width="24" height="16" rx="3" fill="rgba(255,215,0,0.2)"/>
                <line x1="0" y1="5" x2="24" y2="5" stroke="rgba(255,215,0,0.15)" strokeWidth="1"/>
                <line x1="0" y1="11" x2="24" y2="11" stroke="rgba(255,215,0,0.15)" strokeWidth="1"/>
              </svg>
            </div>
            <div className="mon-credit-card-type">{data?.card?.type || 'VISA'}</div>
          </div>
          <div className="mon-credit-card-number">**** **** {data.card.number}</div>
          <div className="mon-credit-card-bottom">
            <div className="mon-credit-card-info">
              <label>Card Holder</label>
              <span>{data.card.holder}</span>
            </div>
            <div className="mon-credit-card-info">
              <label>Valid Thru</label>
              <span>{data.card.validThru}</span>
            </div>
            <div className="mon-credit-card-info">
              <label>On card</label>
              <span>${Number(data.card.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mon-credit-card mon-credit-card-empty" role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard/card')} title="Create a card">
          <div className="mon-credit-card-top">
            <div className="mon-credit-card-chip">
              <svg viewBox="0 0 24 16" width="24" height="16">
                <rect x="0" y="0" width="24" height="16" rx="3" fill="rgba(255,255,255,0.08)"/>
              </svg>
            </div>
            <div className="mon-credit-card-type">CARD</div>
          </div>
          <div className="mon-credit-card-number">No card yet</div>
          <div className="mon-credit-card-bottom">
            <div className="mon-credit-card-info">
              <label>Get started</label>
              <span>Create a virtual card</span>
            </div>
            <div className="mon-credit-card-info">
              <label>Fund it</label>
              <span>With crypto</span>
            </div>
            <div className="mon-credit-card-info">
              <label>Use it for</label>
              <span>Wallet · Sends</span>
            </div>
          </div>
        </div>
      )}

      {/* Deposit / Transfer */}
      <div className="mon-actions-row">
        <button className="mon-btn-deposit" onClick={() => navigate('/dashboard/manage?tab=deposit')}>Deposit</button>
        <button className="mon-btn-transfer" onClick={() => navigate('/dashboard/manage?tab=send')}>Transfer</button>
      </div>

      {/* Quick Action */}
      <div className="mon-quick-action">
        <div className="mon-quick-action-title">Quick Action</div>
        <div className="mon-quick-action-grid">
          <button
            className="mon-quick-action-btn"
            title="Money you received"
            onClick={() => navigate('/dashboard/account?type=DEPOSIT')}
          >
            {SidebarIcons.down}
            <span>Received</span>
          </button>
          <button
            className="mon-quick-action-btn"
            title="Request money from someone"
            onClick={() => navigate('/dashboard/manage?tab=request')}
          >
            {SidebarIcons.up}
            <span>Request</span>
          </button>
          <button
            className="mon-quick-action-btn"
            title="All payment tools"
            onClick={() => navigate('/dashboard/manage')}
          >
            {SidebarIcons.dots}
            <span>More</span>
          </button>
        </div>
      </div>
    </>
  );
}

function HelpModal({ open, onClose }) {
  const navigate = useNavigate();
  const faqs = [
    {
      q: 'How do deposits and withdrawals work?',
      a: 'Head to Payments and send crypto to one of our verified addresses, then paste the transaction hash. Our team reviews every deposit, withdrawal and send — approval takes up to 3 working days.',
      to: '/dashboard/manage',
      label: 'Open Payments',
    },
    {
      q: 'How do investments work?',
      a: 'Pick a plan on the Investments page, choose an amount and confirm. Your money is set in motion immediately and returns with its fixed profit on the maturity date.',
      to: '/dashboard/invest',
      label: 'Open Investments',
    },
    {
      q: 'Why is my $100 bonus locked?',
      a: 'The welcome bonus unlocks once you\'ve funded $1,000 of your own money. Until then it stays separate from your balance and can\'t be invested or sent.',
      to: '/dashboard/invest',
      label: 'See bonus progress',
    },
    {
      q: 'How do savings goals work?',
      a: 'Create a goal with a target and deadline, then move money from your balance into it any time. You can always pull it back out.',
      to: '/dashboard/goals',
      label: 'Open Goals',
    },
    {
      q: 'Is my account secure?',
      a: 'You can change your password and toggle two-factor authentication (2FA) from the Settings page.',
      to: '/dashboard/settings',
      label: 'Open Settings',
    },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Help & support" subtitle="Quick answers to common questions." width={520}>
      <div className="pg-list">
        {faqs.map((f) => (
          <div key={f.q} className="pg-list-item" style={{ alignItems: 'flex-start' }}>
            <div className="pg-list-icon">{SidebarIcons.help}</div>
            <div className="pg-list-body">
              <div className="pg-list-title">{f.q}</div>
              <div className="pg-list-sub" style={{ lineHeight: 1.55, marginTop: 4 }}>{f.a}</div>
              <button
                className="pg-clear-btn"
                style={{ paddingLeft: 0 }}
                onClick={() => { onClose(); navigate(f.to); }}
              >
                {f.label} →
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="pg-note" style={{ marginTop: 14 }}>
        Still stuck? Email <strong>support@itrustc.com</strong> — our team replies within one business day.
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button
          className="pg-btn pg-btn-ghost"
          style={{ flex: 1 }}
          onClick={() => {
            navigator.clipboard?.writeText('support@itrustc.com');
            toast('Support email copied', 'success');
          }}
        >
          Copy email
        </button>
        <a className="pg-btn pg-btn-primary" style={{ flex: 1 }} href="mailto:support@itrustc.com?subject=iTrustCapital%20support">
          Email support
        </a>
      </div>
    </Modal>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [monetraData, setMonetraData] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const tabs = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/dashboard/invest', label: 'Invest' },
    { path: '/dashboard/activity', label: 'Market' },
    { path: '/dashboard/manage', label: 'Payments' },
    { path: '/dashboard/card', label: 'Cards' },
    { path: '/dashboard/account', label: 'Transaction' },
  ];

  useEffect(() => {
    loadMonetraData();
  }, []);

  // Any page can ask the shell to reload balances (after payments, trades…)
  useEffect(() => {
    const handler = () => loadMonetraData();
    window.addEventListener('monetra:refresh', handler);
    return () => window.removeEventListener('monetra:refresh', handler);
  }, []);

  // Close the avatar menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const loadMonetraData = async () => {
    try {
      const result = await api.getMonetraDashboard();
      setMonetraData(result);
    } catch (e) {
      console.error('Load monetra error:', e);
    }
  };

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'U';

  return (
    <div className="monetra-dashboard">
      <Toaster />
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* Sidebar */}
      <aside className="mon-sidebar">
        <nav className="mon-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <Link key={item.path} to={item.path}
              title={item.label}
              className={`mon-sidebar-btn ${location.pathname === item.path ? 'active' : ''}`}>
              {SidebarIcons[item.icon]}
            </Link>
          ))}
        </nav>
        <div className="mon-sidebar-bottom">
          <button className="mon-sidebar-btn" title="Help & support" onClick={() => setHelpOpen(true)}>
            {SidebarIcons.help}
          </button>
          <button className="mon-sidebar-btn" title="Log out" onClick={logout}>
            {SidebarIcons.logout}
          </button>
        </div>
      </aside>

      {/* Mobile bottom navigation (sidebar is hidden on small screens) */}
      <nav className="mon-mobile-nav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={location.pathname === item.path ? 'active' : ''}
          >
            {SidebarIcons[item.icon]}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Main Area */}
      <div className="mon-main">
        {/* Top Bar */}
        <header className="mon-topbar">
          <div className="mon-logo">
            <svg className="mon-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2C6.5 2 2 6.5 2 12"/>
              <path d="M12 2c5.5 0 10 4.5 10 10"/>
              <circle cx="12" cy="12" r="4"/>
            </svg>
            iTrustCapital
          </div>
          <nav className="mon-tabs">
            {tabs.map((t) => (
              <Link key={t.path} to={t.path}
                className={`mon-tab ${location.pathname === t.path ? 'active' : ''}`}
                style={{ textDecoration: 'none' }}>
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="mon-topbar-right">
            <NotificationDropdown />
            <div className="mon-menu-wrap" ref={menuRef}>
              <div
                className="mon-avatar"
                title="Account menu"
                onClick={() => setMenuOpen((o) => !o)}
              >
                {initials}
              </div>
              {menuOpen && (
                <div className="mon-menu">
                  <div className="mon-menu-head">
                    <div className="mon-menu-name">{user?.firstName} {user?.lastName}</div>
                    <div className="mon-menu-email">{user?.email}</div>
                  </div>
                  <Link
                    className="mon-menu-item"
                    to="/dashboard/settings"
                    onClick={() => setMenuOpen(false)}
                  >
                    {SidebarIcons.settings} Settings
                  </Link>
                  <button
                    className="mon-menu-item"
                    onClick={() => { setMenuOpen(false); setHelpOpen(true); }}
                  >
                    {SidebarIcons.help} Help & support
                  </button>
                  <button
                    className="mon-menu-item danger"
                    onClick={logout}
                  >
                    {SidebarIcons.logout} Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="mon-content">
          <div className="mon-left">
            <Routes>
              <Route path="/" element={<DashboardHome />} />
              <Route path="/invest" element={<InvestmentsPage />} />
              <Route path="/activity" element={<Market />} />
              <Route path="/manage" element={<PaymentsPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/card" element={<CardsPage />} />
              <Route path="/account" element={<TransactionsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
          <div className="mon-right">
            <RightPanel data={monetraData} />
          </div>
        </div>
      </div>
    </div>
  );
}
