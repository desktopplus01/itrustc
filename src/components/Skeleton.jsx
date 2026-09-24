import './Skeleton.css';

export function Skeleton({ className = '', style = {} }) {
  return <div className={`skeleton ${className}`} style={style} />;
}

export function SkeletonText({ lines = 1, width, height = 12, gap = 8, className = '' }) {
  return (
    <div className={`skeleton-text ${className}`} style={{ gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          style={{
            width: i === lines - 1 && lines > 1 ? '60%' : (width || '100%'),
            height,
            borderRadius: 6,
          }}
        />
      ))}
    </div>
  );
}

export function SkeletonCircle({ size = 40, className = '' }) {
  return <Skeleton className={className} style={{ width: size, height: size, borderRadius: '50%' }} />;
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`skeleton-card ${className}`}>
      <Skeleton style={{ height: 16, width: '40%', borderRadius: 6 }} />
      <Skeleton style={{ height: 32, width: '60%', borderRadius: 6, marginTop: 12 }} />
      <Skeleton style={{ height: 12, width: '30%', borderRadius: 6, marginTop: 8 }} />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="skeleton-dashboard">
      {/* Header */}
      <div className="skeleton-dashboard-header">
        <div>
          <Skeleton style={{ height: 28, width: 260, borderRadius: 8 }} />
          <Skeleton style={{ height: 14, width: 340, borderRadius: 6, marginTop: 8 }} />
        </div>
        <Skeleton style={{ height: 40, width: 220, borderRadius: 12 }} />
      </div>

      {/* Top Row: Smart Wallet + Balance Cards */}
      <div className="mon-top-row">
        {/* Smart Wallet */}
        <div className="skeleton-card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <Skeleton style={{ height: 16, width: 100, borderRadius: 6 }} />
              <Skeleton style={{ height: 12, width: 140, borderRadius: 6, marginTop: 6 }} />
            </div>
            <Skeleton style={{ height: 32, width: 80, borderRadius: 10 }} />
          </div>
          <Skeleton style={{ height: 36, width: 160, borderRadius: 8 }} />
          <Skeleton style={{ height: 12, width: 80, borderRadius: 6, marginTop: 8 }} />
          <div style={{ display: 'flex', gap: 16, marginTop: 20 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Skeleton style={{ width: 32, height: 32, borderRadius: 8 }} />
                <Skeleton style={{ height: 12, width: 60, borderRadius: 6 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Balance Cards */}
        <div className="mon-balances-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton-card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Skeleton style={{ width: 34, height: 34, borderRadius: 10 }} />
                  <Skeleton style={{ height: 13, width: 80, borderRadius: 6 }} />
                </div>
                <Skeleton style={{ width: 24, height: 24, borderRadius: 6 }} />
              </div>
              <Skeleton style={{ height: 24, width: '55%', borderRadius: 6 }} />
              <Skeleton style={{ height: 12, width: 50, borderRadius: 6, marginTop: 8 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Crypto Chart */}
      <div className="skeleton-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <Skeleton style={{ height: 16, width: 130, borderRadius: 6 }} />
            <Skeleton style={{ height: 28, width: 160, borderRadius: 6, marginTop: 8 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} style={{ height: 34, width: 80, borderRadius: 10 }} />
            ))}
          </div>
        </div>
        <Skeleton style={{ height: 260, width: '100%', borderRadius: 8 }} />
      </div>
    </div>
  );
}

export function AdminStatsSkeleton() {
  return (
    <div>
      <Skeleton style={{ height: 28, width: 200, borderRadius: 8, marginBottom: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 28 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="skeleton-card" style={{ padding: 18 }}>
            <Skeleton style={{ height: 12, width: '60%', borderRadius: 6 }} />
            <Skeleton style={{ height: 28, width: '45%', borderRadius: 6, marginTop: 10 }} />
          </div>
        ))}
      </div>
      <Skeleton style={{ height: 18, width: 160, borderRadius: 6, marginBottom: 16 }} />
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <SkeletonCircle size={36} />
          <div style={{ flex: 1 }}>
            <Skeleton style={{ height: 13, width: 120, borderRadius: 6 }} />
            <Skeleton style={{ height: 11, width: 180, borderRadius: 6, marginTop: 4 }} />
          </div>
          <Skeleton style={{ height: 12, width: 60, borderRadius: 6 }} />
          <Skeleton style={{ height: 26, width: 70, borderRadius: 6 }} />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 6 }) {
  return (
    <div className="skeleton-table">
      <div className="skeleton-table-header">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} style={{ height: 12, width: `${60 + Math.random() * 40}%`, borderRadius: 4 }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="skeleton-table-row">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={colIdx}
              style={{
                height: 14,
                width: colIdx === 0 ? '70%' : colIdx === columns - 1 ? 80 : `${50 + Math.random() * 30}%`,
                borderRadius: 4,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function NotificationSkeleton({ count = 4 }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-notif">
          <SkeletonCircle size={34} />
          <div style={{ flex: 1 }}>
            <Skeleton style={{ height: 13, width: '55%', borderRadius: 6 }} />
            <Skeleton style={{ height: 11, width: '80%', borderRadius: 6, marginTop: 6 }} />
            <Skeleton style={{ height: 10, width: 50, borderRadius: 6, marginTop: 6 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MarketSkeleton() {
  return (
    <div className="market-page">
      {/* Top */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Skeleton style={{ height: 40, width: 180, borderRadius: 12, marginBottom: 16 }} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <Skeleton style={{ height: 40, width: 220, borderRadius: 8 }} />
            <Skeleton style={{ height: 28, width: 120, borderRadius: 8 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} style={{ height: 32, width: 50, borderRadius: 10 }} />
            ))}
          </div>
        </div>
        <Skeleton style={{ height: 40, width: 300, borderRadius: 12 }} />
      </div>

      {/* Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        {/* Chart */}
        <div>
          <div className="skeleton-card" style={{ padding: 16 }}>
            <Skeleton style={{ height: 340, width: '100%', borderRadius: 8 }} />
          </div>
          <div className="skeleton-card" style={{ padding: 16, marginTop: 16 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 0.8fr 1fr', gap: 16, padding: '14px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                <Skeleton style={{ height: 14, width: '60%', borderRadius: 4 }} />
                <Skeleton style={{ height: 14, width: '50%', borderRadius: 4 }} />
                <Skeleton style={{ height: 14, width: '55%', borderRadius: 4 }} />
                <Skeleton style={{ height: 22, width: 60, borderRadius: 6 }} />
                <Skeleton style={{ height: 14, width: '45%', borderRadius: 4 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Trade Panel */}
        <div className="skeleton-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
            <Skeleton style={{ height: 40, width: '45%', borderRadius: 10 }} />
            <Skeleton style={{ height: 40, width: '45%', borderRadius: 10 }} />
          </div>
          <Skeleton style={{ height: 120, width: '100%', borderRadius: 14, marginBottom: 20 }} />
          <Skeleton style={{ height: 120, width: '100%', borderRadius: 14, marginBottom: 16 }} />
          <Skeleton style={{ height: 48, width: '100%', borderRadius: 12, marginBottom: 10 }} />
          <Skeleton style={{ height: 44, width: '100%', borderRadius: 12, marginBottom: 16 }} />
          <Skeleton style={{ height: 100, width: '100%', borderRadius: 14 }} />
        </div>
      </div>
    </div>
  );
}
