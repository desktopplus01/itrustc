import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Download, FileText, ChevronLeft, ChevronRight, Receipt, X } from 'lucide-react';
import api from '../lib/api';
import Modal from '../components/Modal';
import { toast } from '../lib/toast';
import { money, fmtDateTime, isIncoming, TYPE_META, STATUS_BADGE, txTitle } from './format';
import './pages.css';

const PAGE_SIZE = 10;
const TYPES = ['DEPOSIT', 'WITHDRAWAL', 'BUY', 'SELL', 'BONUS', 'INVEST', 'RETURN', 'CARD_FUND'];
const STATUSES = ['COMPLETED', 'PENDING', 'FAILED'];

export default function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [type, setType] = useState(searchParams.get('type') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [page, setPage] = useState(1);

  const [txs, setTxs] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ in: 0, out: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [detail, setDetail] = useState(null);
  const inputRef = useRef(null);

  const filters = { type, status, search };

  const load = useCallback(async (p) => {
    setLoading(true);
    try {
      const params = { page: String(p), limit: String(PAGE_SIZE) };
      if (type) params.type = type;
      if (status) params.status = status;
      if (search) params.search = search;
      const res = await api.getTransactions(params);
      setTxs(res.transactions || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error('Transactions load error:', e);
      toast(e.message || 'We could not load your transactions. Please refresh and try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [type, status, search]);

  // Stats over the whole filtered set (capped at the latest 200)
  const loadStats = useCallback(async () => {
    try {
      const params = { page: '1', limit: '200' };
      if (type) params.type = type;
      if (status) params.status = status;
      if (search) params.search = search;
      const res = await api.getTransactions(params);
      setStats(res.summary || { in: 0, out: 0 });
    } catch { /* non-fatal */ }
  }, [type, status, search]);

  useEffect(() => {
    load(page);
    loadStats();
    const next = {};
    if (type) next.type = type;
    if (status) next.status = status;
    if (search) next.search = search;
    if (page > 1) next.page = String(page);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, status, search, page]);

  const applySearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const clearFilters = () => {
    setType('');
    setStatus('');
    setSearch('');
    setSearchInput('');
    setPage(1);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = [];
      let p = 1;
      // Collect everything (server caps limit at 200 per request)
      for (; p <= 25; p++) {
        const params = { page: String(p), limit: '200' };
        if (type) params.type = type;
        if (status) params.status = status;
        if (search) params.search = search;
        const res = await api.getTransactions(params);
        all.push(...(res.transactions || []));
        if (all.length >= (res.total || 0) || (res.transactions || []).length === 0) break;
      }

      const header = ['Date', 'Type', 'Description', 'Asset', 'Quantity', 'Price', 'Amount', 'Status', 'Account', 'ID'];
      const rows = all.map((t) => [
        new Date(t.createdAt).toISOString(),
        t.type,
        `"${(txTitle(t) || '').replace(/"/g, '""')}"`,
        t.asset || '',
        t.qty != null ? Number(t.qty) : '',
        t.price != null ? Number(t.price) : '',
        isIncoming(t.type) ? Number(t.amount) : -Number(t.amount),
        t.status,
        t.account?.label || '',
        t.id,
      ]);
      const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast(`Exported ${all.length} transaction${all.length === 1 ? '' : 's'} to CSV`, 'success');
    } catch (e) {
      toast(e.message || 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = !!(type || status || search);

  return (
    <>
      <div className="mon-header">
        <div>
          <h1>Transactions</h1>
          <p>Every deposit, withdrawal and trade — searchable and exportable.</p>
        </div>
        <div className="pg-actions">
          <button className="pg-btn pg-btn-ghost pg-btn-sm" onClick={exportCsv} disabled={exporting || total === 0}>
            <Download size={14} /> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      <div className="pg-stats">
        <div className="pg-stat">
          <label>Transactions found</label>
          <div className="value">{total}</div>
          <div className="hint">{hasFilters ? 'Matching your filters' : 'All time'}</div>
        </div>
        <div className="pg-stat">
          <label>Money in</label>
          <div className="value positive">+${money(stats.in)}</div>
          <div className="hint">Deposits, bonuses & sales</div>
        </div>
        <div className="pg-stat">
          <label>Money out</label>
          <div className="value negative">-${money(stats.out)}</div>
          <div className="hint">Withdrawals & purchases</div>
        </div>
        <div className="pg-stat">
          <label>Net</label>
          <div className={`value ${stats.in - stats.out >= 0 ? 'positive' : 'negative'}`}>
            {stats.in - stats.out >= 0 ? '+' : '-'}${money(Math.abs(stats.in - stats.out))}
          </div>
          <div className="hint">Based on latest {Math.min(total, 200)} records</div>
        </div>
      </div>

      <div className="pg-card">
        <div className="pg-filters" style={{ marginBottom: 6 }}>
          <form onSubmit={applySearch} style={{ display: 'contents' }}>
            <input
              ref={inputRef}
              type="text"
              className="pg-input"
              placeholder="Search description, asset or ID…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit" className="pg-btn pg-btn-ghost pg-btn-sm">
              <Search size={14} /> Search
            </button>
          </form>

          <select className="pg-select" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            <option value="">All types</option>
            {TYPES.map((t) => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
          </select>

          <select className="pg-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
          </select>

          {hasFilters && (
            <button className="pg-clear-btn" onClick={clearFilters}>
              <X size={12} style={{ verticalAlign: -2 }} /> Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '10px 0' }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton" style={{ height: 46, borderRadius: 10, marginBottom: 10 }} />
            ))}
          </div>
        ) : txs.length === 0 ? (
          <div className="pg-empty">
            <Receipt size={44} />
            <h4>No transactions found</h4>
            <p>{hasFilters ? 'Try adjusting or clearing your filters.' : 'Your money movements will appear here once you start.'}</p>
            {hasFilters ? (
              <button className="pg-btn pg-btn-ghost" onClick={clearFilters}>Clear filters</button>
            ) : (
              <button className="pg-btn pg-btn-primary" onClick={() => navigate('/dashboard/manage')}>Make a deposit</button>
            )}
          </div>
        ) : (
          <table className="pg-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Account</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t) => {
                const meta = TYPE_META[t.type] || { label: t.type, badge: 'gray' };
                return (
                  <tr key={t.id} className="clickable" onClick={() => setDetail(t)}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(t.createdAt)}</td>
                    <td>
                      <div className="pg-cell-main">{txTitle(t)}</div>
                      <div className="pg-cell-sub">
                        <span className={`pg-badge ${meta.badge}`}>{meta.label}</span>
                        {t.qty != null && <> · {Number(t.qty)} {t.asset}</>}
                      </div>
                    </td>
                    <td>{t.account?.label || 'Crypto IRA'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`pg-amount ${isIncoming(t.type) ? 'pos' : 'neg'}`}>
                        {isIncoming(t.type) ? '+' : '-'}${money(t.amount)}
                      </span>
                    </td>
                    <td>
                      <span className={`pg-badge ${STATUS_BADGE[t.status] || 'gray'}`}>{t.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {total > PAGE_SIZE && (
          <div className="pg-pagination">
            <span className="pages">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                className="pg-icon-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{ opacity: page <= 1 ? 0.4 : 1 }}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="pages">Page {page} of {totalPages}</span>
              <button
                className="pg-icon-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{ opacity: page >= totalPages ? 0.4 : 1 }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Transaction details"
        subtitle={detail ? fmtDateTime(detail.createdAt) : ''}
      >
        {detail && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div className={`pg-amount ${isIncoming(detail.type) ? 'pos' : 'neg'}`} style={{ fontSize: 30 }}>
                {isIncoming(detail.type) ? '+' : '-'}${money(detail.amount)}
              </div>
              <span className={`pg-badge ${STATUS_BADGE[detail.status] || 'gray'}`} style={{ marginTop: 8 }}>
                {detail.status}
              </span>
            </div>
            <div className="pg-kv"><span className="k">Type</span><span className="v">{TYPE_META[detail.type]?.label || detail.type}</span></div>
            <div className="pg-kv"><span className="k">Description</span><span className="v">{txTitle(detail)}</span></div>
            {detail.asset && <div className="pg-kv"><span className="k">Asset</span><span className="v">{detail.asset}</span></div>}
            {detail.qty != null && <div className="pg-kv"><span className="k">Quantity</span><span className="v">{Number(detail.qty)}</span></div>}
            {detail.price != null && <div className="pg-kv"><span className="k">Price</span><span className="v">${money(detail.price)}</span></div>}
            <div className="pg-kv"><span className="k">Account</span><span className="v">{detail.account?.label || 'Crypto IRA'}</span></div>
            <div className="pg-kv"><span className="k">Date</span><span className="v">{fmtDateTime(detail.createdAt)}</span></div>
            <div className="pg-kv"><span className="k">Reference</span><span className="v">{detail.id}</span></div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                className="pg-btn pg-btn-ghost"
                style={{ flex: 1 }}
                onClick={() => {
                  navigator.clipboard?.writeText(detail.id);
                  toast('Reference ID copied', 'success');
                }}
              >
                Copy reference
              </button>
              <button className="pg-btn pg-btn-primary" style={{ flex: 1 }} onClick={() => setDetail(null)}>
                Done
              </button>
            </div>
            <div className="pg-note" style={{ marginTop: 12 }}>
              <FileText size={12} style={{ verticalAlign: -2 }} /> Need help with this transaction? Contact support with the reference ID above.
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
