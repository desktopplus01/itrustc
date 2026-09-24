import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import api from "../lib/api";
import { toast } from "../lib/toast";
import Toaster from "../components/Toaster";
import Modal from "../components/Modal";
import NotificationDropdown from "../components/NotificationDropdown";
import { AdminStatsSkeleton, TableSkeleton } from "../components/Skeleton";
import { money, fmtDate, fmtDateTime } from "../dashboard/format";
import { REQUEST_META } from "../dashboard/format";
import "../dashboard/pages.css";
import "./admin.css";

/* ── Icons ─────────────────────────────────────────────────────── */
const svg = (paths, extra = {}) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...extra}>
    {paths}
  </svg>
);

const Icons = {
  grid: svg(<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></>),
  users: svg(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>),
  clock: svg(<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>),
  banknote: svg(<><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></>),
  card: svg(<><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></>),
  layers: svg(<><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>),
  globe: svg(<><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>),
  logout: svg(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>),
  menu: svg(<><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>),
  search: svg(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>),
  check: svg(<polyline points="20 6 9 17 4 12"/>),
  x: svg(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>),
  plus: svg(<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>),
  copy: svg(<><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>),
  edit: svg(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>),
  trash: svg(<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>),
  trending: svg(<><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>),
  inbox: svg(<><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></>),
  alert: svg(<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>),
  wallet: svg(<><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 10H18a2 2 0 0 0 0 4h4"/></>),
};

/* ── Shared shell state ────────────────────────────────────────── */
const NAV = [
  {
    section: "Overview",
    items: [
      { path: "/admin", label: "Dashboard", icon: "grid", exact: true },
      { path: "/admin/users", label: "All users", icon: "users" },
      { path: "/admin/pending", label: "Pending signups", icon: "clock", badge: "pendingUsers" },
    ],
  },
  {
    section: "Approval queue",
    items: [
      { path: "/admin/approvals", label: "Money requests", icon: "banknote", badge: "pendingRequests" },
      { path: "/admin/cards", label: "Card transactions", icon: "card", badge: "pendingCards" },
    ],
  },
  {
    section: "Configuration",
    items: [
      { path: "/admin/plans", label: "Investment plans", icon: "layers" },
      { path: "/admin/addresses", label: "Deposit addresses", icon: "globe" },
    ],
  },
];

const PAGE_META = {
  "/admin": { title: "Dashboard", sub: "Everything happening on the platform, right now" },
  "/admin/users": { title: "All users", sub: "Search, review and manage every account" },
  "/admin/pending": { title: "Pending signups", sub: "Approve new registrations — a $100 welcome bonus is credited on approval" },
  "/admin/approvals": { title: "Money requests", sub: "Deposits, withdrawals and sends waiting for your review" },
  "/admin/cards": { title: "Card transactions", sub: "Card funding, card-to-wallet and card sends waiting for review" },
  "/admin/plans": { title: "Investment plans", sub: "Create and tune the plans investors can put money into" },
  "/admin/addresses": { title: "Deposit addresses", sub: "The verified crypto addresses users fund their account and cards with" },
};

const STATUS_LABEL = { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected" };

function statusBadge(status) {
  const cls = { PENDING: "amber", APPROVED: "green", REJECTED: "red" }[status] || "gray";
  return <span className={`pg-badge ${cls}`}>{STATUS_LABEL[status] || status}</span>;
}

const typeLabel = (type) => REQUEST_META[type]?.label || type;

/* ── Confirm dialog ────────────────────────────────────────────── */
function ConfirmDialog({ open, title, subtitle, tone = "approve", confirmLabel, busy, onCancel, onConfirm, children }) {
  return (
    <Modal open={open} onClose={onCancel} title={title} subtitle={subtitle}>
      {children}
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button className="pg-btn pg-btn-ghost" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button
          className={`pg-btn ${tone === "reject" ? "pg-btn-danger" : "pg-btn-primary"}`}
          style={{ flex: 2 }}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/* ── Sidebar ───────────────────────────────────────────────────── */
function AdminSidebar({ open, onClose, badges, onNavigate }) {
  const location = useLocation();
  const { logout, user } = useAuth();

  return (
    <>
      <div className={`ad-overlay ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`ad-sidebar ${open ? "open" : ""}`}>
        <Link to="/" className="ad-brand" onClick={onNavigate}>
          <span className="ad-brand-mark">i</span>
          <span className="ad-brand-name">
            iTrustCapital
            <em>Admin console</em>
          </span>
        </Link>

        <nav className="ad-nav">
          {NAV.map((group) => (
            <div key={group.section} className="ad-nav-group">
              <div className="ad-nav-label">{group.section}</div>
              {group.items.map((item) => {
                const active = item.exact
                  ? location.pathname === item.path
                  : location.pathname.startsWith(item.path);
                const count = item.badge ? badges[item.badge] : 0;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`ad-nav-link ${active ? "active" : ""}`}
                    onClick={onNavigate}
                  >
                    <span className="ad-nav-icon">{Icons[item.icon]}</span>
                    <span>{item.label}</span>
                    {count > 0 && <span className="ad-nav-badge">{count}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="ad-sidebar-foot">
          <div className="ad-admin-chip">
            <div className="ad-admin-avatar">{user?.firstName?.[0]}{user?.lastName?.[0]}</div>
            <div className="ad-admin-meta">
              <strong>{user?.firstName} {user?.lastName}</strong>
              <span>{user?.email}</span>
            </div>
          </div>
          <button className="ad-nav-link" onClick={logout}>
            <span className="ad-nav-icon">{Icons.logout}</span>
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

/* ── Dashboard home ────────────────────────────────────────────── */
function AdminHome({ refreshKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.getAdminStats();
        if (!alive) return;
        setData(res);
      } catch (e) {
        toast(e.message || "We could not load the dashboard. Please refresh and try again.", "error");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  if (loading) return <AdminStatsSkeleton />;

  const s = data?.stats || {};

  const cards = [
    { label: "Total users", value: s.totalUsers || 0, tone: "", icon: "users", to: "/admin/users" },
    { label: "Pending signups", value: s.pendingUsers || 0, tone: "warn", icon: "clock", to: "/admin/pending" },
    { label: "Money requests waiting", value: s.pendingRequests || 0, tone: "warn", icon: "banknote", to: "/admin/approvals" },
    { label: "Card txs waiting", value: s.pendingCardTxs || 0, tone: "warn", icon: "card", to: "/admin/cards" },
    { label: "Total wallet balance", value: `$${money(s.totalBalance)}`, tone: "", icon: "wallet", to: "/admin/users" },
    { label: "Currently invested", value: `$${money(s.totalInvested)}`, tone: "accent", icon: "trending", to: "/admin/plans" },
    { label: "Active investments", value: s.activeInvestments || 0, tone: "accent", icon: "layers", to: "/admin/plans" },
    {
      label: "Claimable (principal + returns)",
      value: `$${money((Number(s.claimablePrincipal) || 0) + (Number(s.claimableReturns) || 0))}`,
      tone: "accent",
      icon: "inbox",
      to: "/admin/users",
    },
    { label: "Locked bonuses", value: `$${money(s.lockedBonus)}`, tone: "warn", icon: "alert", to: "/admin/users" },
    { label: "Approved accounts", value: s.approvedUsers || 0, tone: "", icon: "check", to: "/admin/users" },
    { label: "Rejected accounts", value: s.rejectedUsers || 0, tone: "muted", icon: "x", to: "/admin/users" },
    { label: "Unlock threshold", value: `$${money(s.bonusThreshold)}`, tone: "muted", icon: "alert", to: null },
  ];

  return (
    <div>
      <div className="ad-stat-grid">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`ad-stat ${c.to ? "clickable" : ""}`}
            onClick={() => c.to && navigate(c.to)}
          >
            <div className="ad-stat-top">
              <span className="ad-stat-label">{c.label}</span>
              <span className={`ad-stat-icon ${c.tone}`}>{Icons[c.icon]}</span>
            </div>
            <div className={`ad-stat-value ${c.tone}`}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="ad-panels">
        {/* Requests awaiting review */}
        <div className="pg-card">
          <div className="pg-card-head">
            <div>
              <div className="pg-card-title">Requests awaiting review</div>
              <div className="pg-card-sub">
                {data?.stats?.pendingRequests > 0
                  ? `${data.stats.pendingRequests} waiting — showing the oldest ${data.recentRequests?.length || 0}. Approving settles instantly.`
                  : "The queue is empty — nice work"}
              </div>
            </div>
            <Link to="/admin/approvals" className="pg-btn pg-btn-ghost pg-btn-sm">Open queue</Link>
          </div>

          {!data?.recentRequests?.length ? (
            <div className="pg-empty">
              <span style={{ display: 'inline-flex', opacity: 0.3 }}>{Icons.inbox}</span>
              <h4>Nothing waiting</h4>
              <p>New deposits, withdrawals, sends and card requests land here for review.</p>
            </div>
          ) : (
            <div className="pg-list">
              {data.recentRequests.map((r) => (
                <div key={r.id} className="pg-list-item">
                  <div className="pg-list-icon" style={{ color: 'var(--m-accent)' }}>{Icons.banknote}</div>
                  <div className="pg-list-body">
                    <div className="pg-list-title">
                      {typeLabel(r.type)} · {r.user?.firstName} {r.user?.lastName}
                    </div>
                    <div className="pg-list-sub">
                      {r.user?.email}
                      {r.recipientEmail ? ` → ${r.recipientEmail}` : ""}
                      {r.cardLast4 ? ` · card ••••${r.cardLast4}` : ""}
                      {" · "}{fmtDateTime(r.createdAt)}
                    </div>
                  </div>
                  <div className="pg-list-right">
                    <div className="pg-amount pos">${money(r.amount)}</div>
                    <button
                      className="pg-btn pg-btn-ghost pg-btn-sm"
                      style={{ marginTop: 6 }}
                      onClick={() => navigate(r.cardLast4 || r.type.startsWith("CARD") ? "/admin/cards" : "/admin/approvals")}
                    >
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent signups */}
        <div className="pg-card">
          <div className="pg-card-head">
            <div>
              <div className="pg-card-title">Recent signups</div>
              <div className="pg-card-sub">The latest accounts to join the platform</div>
            </div>
            <Link to="/admin/pending" className="pg-btn pg-btn-ghost pg-btn-sm">Review</Link>
          </div>

          {data?.recentUsers?.length ? (
            <div className="pg-list">
              {data.recentUsers.map((u) => (
                <div key={u.id} className="pg-list-item">
                  <div className="ad-avatar">{u.firstName?.[0]}{u.lastName?.[0]}</div>
                  <div className="pg-list-body">
                    <div className="pg-list-title">{u.firstName} {u.lastName}</div>
                    <div className="pg-list-sub">{u.email} · joined {fmtDate(u.createdAt)}</div>
                  </div>
                  <span className={`pg-badge ${u.status === "APPROVED" ? "green" : u.status === "PENDING" ? "amber" : "red"}`}>
                    {u.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="pg-empty">
              <h4>No signups yet</h4>
              <p>Registered users will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Users table (all + pending) ───────────────────────────────── */
function UsersPage({ pendingOnly = false, onChanged }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(pendingOnly ? "PENDING" : "");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [confirm, setConfirm] = useState(null); // { user, action: 'approve'|'reject' }
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (pendingOnly) {
        const data = await api.getPendingUsers();
        setUsers(data.users || []);
        setTotal(data.users?.length || 0);
        onChanged?.(data.users?.length || 0);
      } else {
        const data = await api.getAdminUsers({
          status: statusFilter || undefined,
          search: search || undefined,
          page: String(page),
          limit: "20",
        });
        setUsers(data.users || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      toast(e.message || "We could not load users. Please refresh and try again.", "error");
    } finally {
      setLoading(false);
    }
  }, [pendingOnly, statusFilter, search, page]);

  useEffect(() => { load(); }, [load]);

  const runAction = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      let res;
      if (confirm.action === "approve") res = await api.approveUser(confirm.user.id);
      else if (confirm.action === "reject") res = await api.rejectUser(confirm.user.id);
      else if (confirm.action === "suspend") res = await api.suspendUser(confirm.user.id);
      else if (confirm.action === "unsuspend") res = await api.unsuspendUser(confirm.user.id);
      else if (confirm.action === "delete") res = await api.deleteUser(confirm.user.id);
      toast(res?.message || "Done.", "success");
      setConfirm(null);
      onChanged?.();
      await load();
    } catch (e) {
      toast(e.message || "That didn't work. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div>
      {!pendingOnly && (
        <div className="ad-toolbar">
          <form
            className="ad-search"
            onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }}
          >
            {Icons.search}
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>
          <select
            className="ad-select"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : users.length === 0 ? (
        <div className="pg-card">
          <div className="pg-empty">
            <h4>{pendingOnly ? "All caught up" : "No users found"}</h4>
            <p>
              {pendingOnly
                ? "New registrations will appear here for review."
                : "Try adjusting your search or filter."}
            </p>
          </div>
        </div>
      ) : (
        <div className="pg-card ad-table-card">
          <div className="ad-table">
            <div className="ad-table-head">
              <span>Name</span>
              <span>Email</span>
              <span>Phone</span>
              <span>Status</span>
              <span>Balance</span>
              <span>Joined</span>
              <span style={{ textAlign: "right" }}>Actions</span>
            </div>
            {users.map((u) => (
              <div key={u.id} className="ad-table-row">
                <div className="ad-cell-user">
                  <div className="ad-avatar">{u.firstName?.[0]}{u.lastName?.[0]}</div>
                  <span>{u.firstName} {u.lastName}</span>
                </div>
                <div className="ad-cell-sub" data-label="Email">{u.email}</div>
                <div className="ad-cell-sub" data-label="Phone">{u.phone || "—"}</div>
                <div data-label="Status">
                  <span className={`pg-badge ${u.status === "APPROVED" ? "green" : u.status === "PENDING" ? "amber" : u.status === "SUSPENDED" ? "purple" : "red"}`}>
                    {u.status}
                  </span>
                </div>
                <div className="ad-cell-strong" data-label="Balance">${money(u.totalBalance)}</div>
                <div className="ad-cell-sub" data-label="Joined">{fmtDate(u.createdAt)}</div>
                <div className="ad-actions">
                  {u.status === "PENDING" ? (
                    <>
                      <button className="pg-btn pg-btn-primary pg-btn-sm" onClick={() => setConfirm({ user: u, action: "approve" })}>
                        Approve
                      </button>
                      <button className="pg-btn pg-btn-danger pg-btn-sm" onClick={() => setConfirm({ user: u, action: "reject" })}>
                        Reject
                      </button>
                    </>
                  ) : u.role === "ADMIN" ? (
                    <span className="ad-cell-sub">—</span>
                  ) : u.status === "SUSPENDED" ? (
                    <>
                      <button className="pg-btn pg-btn-primary pg-btn-sm" onClick={() => setConfirm({ user: u, action: "unsuspend" })}>
                        Restore
                      </button>
                      <button className="pg-btn pg-btn-danger pg-btn-sm" onClick={() => setConfirm({ user: u, action: "delete" })}>
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="pg-btn pg-btn-ghost pg-btn-sm" onClick={() => setConfirm({ user: u, action: "suspend" })}>
                        Suspend
                      </button>
                      <button className="pg-btn pg-btn-danger pg-btn-sm" onClick={() => setConfirm({ user: u, action: "delete" })}>
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!pendingOnly && totalPages > 1 && (
            <div className="pg-pagination">
              <span className="pages">Showing {users.length} of {total}</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="pg-btn pg-btn-ghost pg-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Previous
                </button>
                <span className="pages">Page {page} of {totalPages}</span>
                <button className="pg-btn pg-btn-ghost pg-btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={
          {
            approve: "Approve this account?",
            reject: "Reject this account?",
            suspend: "Suspend this account?",
            unsuspend: "Restore this account?",
            delete: "Permanently delete this account?",
          }[confirm?.action] || "Are you sure?"
        }
        subtitle={
          confirm
            ? `${confirm.user.firstName} ${confirm.user.lastName} · ${confirm.user.email}`
            : ""
        }
        tone={["approve", "unsuspend"].includes(confirm?.action) ? "approve" : "reject"}
        confirmLabel={
          {
            approve: "Approve account",
            reject: "Reject account",
            suspend: "Suspend account",
            unsuspend: "Restore account",
            delete: "Delete forever",
          }[confirm?.action] || "Confirm"
        }
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={runAction}
      >
        {confirm?.action === "approve" ? (
          <div className="pg-form-msg info">
            They'll be able to log in immediately and receive a <strong>$100 welcome bonus</strong>, which stays
            locked until they've funded <strong>$1,000</strong> of their own money.
          </div>
        ) : confirm?.action === "reject" ? (
          <div className="pg-form-msg error">
            They'll receive an email explaining the decision and won't be able to log in.
          </div>
        ) : confirm?.action === "suspend" ? (
          <div className="pg-form-msg info">
            They'll be signed out and blocked from logging in, but <strong>all their data, balances and history are
            kept</strong>. You can restore them any time.
          </div>
        ) : confirm?.action === "unsuspend" ? (
          <div className="pg-form-msg info">
            They'll be able to sign in again immediately, with everything exactly as they left it.
          </div>
        ) : confirm?.action === "delete" ? (
          <div className="pg-form-msg error">
            This <strong>permanently deletes</strong> the account and all its data — wallet, cards, transactions,
            investments and history. <strong>This cannot be undone.</strong>
          </div>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}

/* ── Approval queue (money + card) ─────────────────────────────── */
function RequestsQueue({ cardMode = false, onChanged }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [review, setReview] = useState(null); // { request, action }
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        status: status === "ALL" ? undefined : status,
        search: search || undefined,
        page: String(page),
        limit: "20",
      };
      const data = cardMode ? await api.getAdminCardTransactions(params) : await api.getAdminRequests(params);
      setItems(data.requests || []);
      setTotal(data.total || 0);
      setPendingCount(data.pendingCount || 0);
      if (cardMode) onChanged?.(undefined, data.pendingCount || 0);
      else onChanged?.(undefined, undefined, data.pendingCount || 0);
    } catch (e) {
      toast(e.message || "We could not load the approval queue. Please refresh and try again.", "error");
    } finally {
      setLoading(false);
    }
  }, [cardMode, status, search, page]);

  useEffect(() => { load(); }, [load]);

  const runReview = async () => {
    if (!review) return;
    setBusy(true);
    try {
      const res =
        review.action === "approve"
          ? await api.approveRequest(review.request.id, note.trim() || undefined)
          : await api.rejectRequest(review.request.id, note.trim() || undefined);
      toast(res.message, "success");
      if (res.bonusUnlocked) {
        toast("The user's $100 welcome bonus just unlocked.", "success");
      }
      setReview(null);
      setNote("");
      onChanged?.();
      await load();
    } catch (e) {
      toast(e.message || "That didn't work. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  const detailText = (r) => {
    const bits = [];
    if (r.recipientEmail) bits.push(`→ ${r.recipientEmail}`);
    if (r.address) bits.push(`${r.network || ""} ${r.address}`.trim());
    if (r.txHash) bits.push(`tx ${r.txHash.slice(0, 18)}${r.txHash.length > 18 ? "…" : ""}`);
    if (r.card?.last4) bits.push(`card ••••${r.card.last4}`);
    if (r.note) bits.push(`“${r.note}”`);
    if (r.reviewNote) bits.push(`note: ${r.reviewNote}`);
    return bits.length ? bits.join(" · ") : "—";
  };

  return (
    <div>
      <div className="ad-toolbar">
        <div className="ad-tabs">
          {["PENDING", "APPROVED", "REJECTED", "ALL"].map((s) => (
            <button
              key={s}
              className={`ad-tab ${status === s ? "active" : ""}`}
              onClick={() => { setStatus(s); setPage(1); }}
            >
              {s === "ALL" ? "All" : STATUS_LABEL[s]}
              {s === "PENDING" && pendingCount > 0 ? <span className="ad-tab-count">{pendingCount}</span> : null}
            </button>
          ))}
        </div>
        <form className="ad-search" onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }}>
          {Icons.search}
          <input
            type="text"
            placeholder="Search by email, recipient or tx hash…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>
      </div>

      {loading ? (
        <TableSkeleton rows={6} columns={7} />
      ) : items.length === 0 ? (
        <div className="pg-card">
          <div className="pg-empty">
            <h4>{status === "PENDING" ? "Queue is clear" : "No requests found"}</h4>
            <p>
              {status === "PENDING"
                ? "Every deposit, withdrawal and send lands here for review — approval takes up to 3 working days from the user's perspective."
                : "Try a different filter."}
            </p>
          </div>
        </div>
      ) : (
        <div className="pg-card ad-table-card">
          <div className="ad-table ad-table-requests">
            <div className="ad-table-head">
              <span>User</span>
              <span>Type</span>
              <span>Amount</span>
              <span>Details</span>
              <span>Submitted</span>
              <span>Status</span>
              <span style={{ textAlign: "right" }}>Actions</span>
            </div>
            {items.map((r) => (
              <div key={r.id} className="ad-table-row">
                <div className="ad-cell-user">
                  <div className="ad-avatar">{r.user?.firstName?.[0]}{r.user?.lastName?.[0]}</div>
                  <span className="ad-cell-stack">
                    <strong>{r.user?.firstName} {r.user?.lastName}</strong>
                    <em>{r.user?.email}</em>
                  </span>
                </div>
                <div data-label="Type">
                  <span className={`pg-badge ${REQUEST_META[r.type]?.badge || "blue"}`}>{typeLabel(r.type)}</span>
                </div>
                <div className="ad-cell-strong" data-label="Amount">${money(r.amount)}</div>
                <div className="ad-cell-sub ad-cell-detail" data-label="Details">{detailText(r)}</div>
                <div className="ad-cell-sub" data-label="Submitted">{fmtDateTime(r.createdAt)}</div>
                <div data-label="Status">{statusBadge(r.status)}</div>
                <div className="ad-actions">
                  {r.status === "PENDING" ? (
                    <>
                      <button
                        className="pg-btn pg-btn-primary pg-btn-sm"
                        onClick={() => { setNote(""); setReview({ request: r, action: "approve" }); }}
                      >
                        Approve
                      </button>
                      <button
                        className="pg-btn pg-btn-danger pg-btn-sm"
                        onClick={() => { setNote(""); setReview({ request: r, action: "reject" }); }}
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <span className="ad-cell-sub">{r.reviewedAt ? fmtDate(r.reviewedAt) : "—"}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pg-pagination">
              <span className="pages">Showing {items.length} of {total}</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="pg-btn pg-btn-ghost pg-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Previous
                </button>
                <span className="pages">Page {page} of {totalPages}</span>
                <button className="pg-btn pg-btn-ghost pg-btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!review}
        title={review?.action === "approve" ? "Approve this request?" : "Decline this request?"}
        subtitle={
          review
            ? `${typeLabel(review.request.type)} · $${money(review.request.amount)} · ${review.request.user?.email}`
            : ""
        }
        tone={review?.action === "approve" ? "approve" : "reject"}
        confirmLabel={review?.action === "approve" ? "Approve & settle" : "Decline & refund"}
        busy={busy}
        onCancel={() => setReview(null)}
        onConfirm={runReview}
      >
        <div className={review?.action === "approve" ? "pg-form-msg info" : "pg-form-msg error"}>
          {review?.action === "approve"
            ? "Balances settle immediately and the user is notified by email."
            : "Any funds held while this was pending are returned to the user automatically."}
        </div>
        <div className="pg-field" style={{ marginTop: 12 }}>
          <label>Note to the user (optional)</label>
          <textarea
            className="pg-textarea"
            rows={2}
            placeholder={review?.action === "approve" ? "e.g. verified on chain" : "e.g. transaction hash not found"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}

/* ── Investment plans ──────────────────────────────────────────── */
const EMPTY_PLAN = { name: "", description: "", minAmount: "100", maxAmount: "", durationDays: "30", returnPercent: "10", active: true };

function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // plan object or EMPTY_PLAN for new
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(EMPTY_PLAN);
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getAdminPlans();
      setPlans(data.plans || []);
    } catch (e) {
      toast(e.message || "We could not load the plans. Please refresh and try again.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(EMPTY_PLAN); setError(""); setEditing("new"); };
  const openEdit = (p) => {
    setForm({
      name: p.name,
      description: p.description || "",
      minAmount: String(p.minAmount),
      maxAmount: p.maxAmount != null ? String(p.maxAmount) : "",
      durationDays: String(p.durationDays),
      returnPercent: String(p.returnPercent),
      active: p.active,
    });
    setError("");
    setEditing(p);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      minAmount: Number(form.minAmount),
      maxAmount: form.maxAmount === "" ? null : Number(form.maxAmount),
      durationDays: parseInt(form.durationDays, 10),
      returnPercent: Number(form.returnPercent),
      active: form.active,
    };
    if (!payload.name) return setError("Give the plan a name.");
    if (!(payload.minAmount >= 1)) return setError("Minimum investment must be at least $1.");
    if (payload.maxAmount != null && payload.maxAmount < payload.minAmount)
      return setError("Maximum can't be lower than the minimum.");
    if (!(payload.durationDays >= 1)) return setError("Duration must be at least 1 day.");
    if (!(payload.returnPercent > 0)) return setError("Return must be greater than 0%.");

    setBusy(true);
    try {
      const res =
        editing === "new"
          ? await api.createAdminPlan(payload)
          : await api.updateAdminPlan(editing.id, payload);
      toast(res.message, "success");
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message || "We could not save the plan. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await api.deleteAdminPlan(toDelete.id);
      toast(res.message, "success");
      setToDelete(null);
      await load();
    } catch (e) {
      toast(e.message || "We could not delete the plan. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  };

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  return (
    <div>
      <div className="ad-toolbar">
        <div className="ad-toolbar-info">
          {plans.length} plan{plans.length === 1 ? "" : "s"} · investors pick these on their Investments page
        </div>
        <button className="pg-btn pg-btn-primary pg-btn-sm" onClick={openNew}>
          {Icons.plus} New plan
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={4} columns={6} />
      ) : plans.length === 0 ? (
        <div className="pg-card">
          <div className="pg-empty">
            <h4>No plans yet</h4>
            <p>Create the first investment plan so users can start putting money in motion.</p>
            <button className="pg-btn pg-btn-primary" onClick={openNew}>{Icons.plus} Create a plan</button>
          </div>
        </div>
      ) : (
        <div className="ad-plan-grid">
          {plans.map((p) => (
            <div key={p.id} className={`ad-plan ${!p.active ? "inactive" : ""}`}>
              <div className="ad-plan-top">
                <span className={`pg-badge ${p.active ? 'green' : 'gray'}`}>{p.active ? "LIVE" : "HIDDEN"}</span>
                <div className="ad-plan-actions">
                  <button className="pg-btn pg-btn-ghost pg-btn-sm" onClick={() => openEdit(p)} title="Edit">
                    {Icons.edit}
                  </button>
                  <button className="pg-btn pg-btn-danger pg-btn-sm" onClick={() => setToDelete(p)} title="Delete">
                    {Icons.trash}
                  </button>
                </div>
              </div>
              <div className="ad-plan-name">{p.name}</div>
              <div className="ad-plan-return">{p.returnPercent}% <span>over {p.durationDays} days</span></div>
              <p className="ad-plan-desc">{p.description || "No description yet."}</p>
              <div className="ad-plan-meta">
                <span>${money(p.minAmount)} min{p.maxAmount != null ? ` · $${money(p.maxAmount)} max` : " · no cap"}</span>
                <span>{p.investorCount} investor{p.investorCount === 1 ? "" : "s"}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New investment plan" : `Edit ${editing?.name || "plan"}`}
        subtitle="These numbers drive exactly what users see and earn."
        width={520}
      >
        <form onSubmit={submit}>
          {error && <div className="pg-form-msg error">{error}</div>}
          <div className="pg-field">
            <label>Plan name</label>
            <input className="pg-input" value={form.name} onChange={set("name")} maxLength={60} autoFocus />
          </div>
          <div className="pg-field">
            <label>Description</label>
            <textarea className="pg-textarea" rows={2} value={form.description} onChange={set("description")} maxLength={400} />
          </div>
          <div className="ad-form-row">
            <div className="pg-field">
              <label>Min investment ($)</label>
              <input type="number" min="1" className="pg-input" value={form.minAmount} onChange={set("minAmount")} />
            </div>
            <div className="pg-field">
              <label>Max investment ($, empty = no cap)</label>
              <input type="number" min="1" className="pg-input" value={form.maxAmount} onChange={set("maxAmount")} placeholder="No cap" />
            </div>
          </div>
          <div className="ad-form-row">
            <div className="pg-field">
              <label>Duration (days)</label>
              <input type="number" min="1" max="3650" className="pg-input" value={form.durationDays} onChange={set("durationDays")} />
            </div>
            <div className="pg-field">
              <label>Fixed return (%)</label>
              <input type="number" min="0.01" max="1000" step="0.01" className="pg-input" value={form.returnPercent} onChange={set("returnPercent")} />
            </div>
          </div>
          <label className="ad-check">
            <input type="checkbox" checked={form.active} onChange={set("active")} />
            Visible to investors
          </label>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button type="button" className="pg-btn pg-btn-ghost" style={{ flex: 1 }} onClick={() => setEditing(null)} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="pg-btn pg-btn-primary" style={{ flex: 2 }} disabled={busy}>
              {busy ? "Saving…" : editing === "new" ? "Create plan" : "Save changes"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title={toDelete?.investorCount > 0 ? "Hide this plan?" : "Delete this plan?"}
        subtitle={toDelete ? `${toDelete.name} · ${toDelete.investorCount} investor(s)` : ""}
        tone="reject"
        confirmLabel={toDelete?.investorCount > 0 ? "Hide plan" : "Delete plan"}
        busy={busy}
        onCancel={() => setToDelete(null)}
        onConfirm={remove}
      >
        <div className="pg-form-msg error">
          {toDelete?.investorCount > 0
            ? "People have money in this plan, so it will be hidden from new investments while existing ones keep running to maturity."
            : "This plan has no investments — it will be removed permanently."}
        </div>
      </ConfirmDialog>
    </div>
  );
}

/* ── Deposit addresses ─────────────────────────────────────────── */
const EMPTY_ADDRESS = { currency: "", network: "", address: "", label: "", active: true };

function AddressesPage() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_ADDRESS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getAdminAddresses();
      setAddresses(data.addresses || []);
    } catch (e) {
      toast(e.message || "We could not load addresses. Please refresh and try again.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(EMPTY_ADDRESS); setError(""); setEditing("new"); };
  const openEdit = (a) => {
    setForm({ currency: a.currency, network: a.network, address: a.address, label: a.label || "", active: a.active });
    setError("");
    setEditing(a);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const payload = {
      currency: form.currency.trim().toUpperCase(),
      network: form.network.trim(),
      address: form.address.trim(),
      label: form.label.trim() || null,
      active: form.active,
    };
    if (!payload.currency) return setError("Enter the currency, e.g. BTC or USDT.");
    if (!payload.network) return setError("Enter the network, e.g. TRC-20 or Bitcoin.");
    if (payload.address.length < 10) return setError("Paste the full wallet address (at least 10 characters).");

    setBusy(true);
    try {
      const res =
        editing === "new"
          ? await api.createAdminAddress(payload)
          : await api.updateAdminAddress(editing.id, payload);
      toast(res.message, "success");
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message || "We could not save the address. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await api.deleteAdminAddress(toDelete.id);
      toast(res.message, "success");
      setToDelete(null);
      await load();
    } catch (e) {
      toast(e.message || "We could not remove the address. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  };

  const copy = (text) => {
    navigator.clipboard?.writeText(text);
    toast("Address copied to clipboard", "success");
  };

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  return (
    <div>
      <div className="ad-toolbar">
        <div className="ad-toolbar-info">
          Users send crypto to these addresses to fund their wallet and cards — every top-up is matched by TXID and
          approved by you.
        </div>
        <button className="pg-btn pg-btn-primary pg-btn-sm" onClick={openNew}>
          {Icons.plus} Add address
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={3} columns={5} />
      ) : addresses.length === 0 ? (
        <div className="pg-card">
          <div className="pg-empty">
            <h4>No deposit addresses yet</h4>
            <p>Add at least one verified crypto address so users can fund their account.</p>
            <button className="pg-btn pg-btn-primary" onClick={openNew}>{Icons.plus} Add an address</button>
          </div>
        </div>
      ) : (
        <div className="pg-card ad-table-card">
          <div className="ad-table ad-table-addresses">
            <div className="ad-table-head">
              <span>Currency</span>
              <span>Network</span>
              <span>Address</span>
              <span>Label</span>
              <span>Status</span>
              <span style={{ textAlign: "right" }}>Actions</span>
            </div>
            {addresses.map((a) => (
              <div key={a.id} className="ad-table-row">
                <div className="ad-cell-strong" data-label="Currency">{a.currency}</div>
                <div className="ad-cell-sub" data-label="Network">{a.network}</div>
                <div className="ad-cell-sub ad-cell-detail" data-label="Address">
                  {a.address}
                  <button className="ad-copy" onClick={() => copy(a.address)} title="Copy address">{Icons.copy}</button>
                </div>
                <div className="ad-cell-sub" data-label="Label">{a.label || "—"}</div>
                <div data-label="Status">
                  <span className={`pg-badge ${a.active ? "green" : "gray"}`}>{a.active ? "ACTIVE" : "DISABLED"}</span>
                </div>
                <div className="ad-actions">
                  <button className="pg-btn pg-btn-ghost pg-btn-sm" onClick={() => openEdit(a)}>{Icons.edit} Edit</button>
                  <button className="pg-btn pg-btn-danger pg-btn-sm" onClick={() => setToDelete(a)}>{Icons.trash} Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add a deposit address" : "Edit address"}
        subtitle="Users will see this in the deposit flow on Payments and Cards."
        width={520}
      >
        <form onSubmit={submit}>
          {error && <div className="pg-form-msg error">{error}</div>}
          <div className="ad-form-row">
            <div className="pg-field">
              <label>Currency</label>
              <input className="pg-input" value={form.currency} onChange={set("currency")} placeholder="USDT" maxLength={20} autoFocus />
            </div>
            <div className="pg-field">
              <label>Network</label>
              <input className="pg-input" value={form.network} onChange={set("network")} placeholder="TRC-20" maxLength={40} />
            </div>
          </div>
          <div className="pg-field">
            <label>Wallet address</label>
            <textarea className="pg-textarea" rows={2} value={form.address} onChange={set("address")} placeholder="Paste the full address" maxLength={200} />
          </div>
          <div className="pg-field">
            <label>Label (optional)</label>
            <input className="pg-input" value={form.label} onChange={set("label")} placeholder="Main treasury" maxLength={60} />
          </div>
          <label className="ad-check">
            <input type="checkbox" checked={form.active} onChange={set("active")} />
            Active — show this to users
          </label>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button type="button" className="pg-btn pg-btn-ghost" style={{ flex: 1 }} onClick={() => setEditing(null)} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="pg-btn pg-btn-primary" style={{ flex: 2 }} disabled={busy}>
              {busy ? "Saving…" : editing === "new" ? "Add address" : "Save changes"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Remove this address?"
        subtitle={toDelete ? `${toDelete.currency} · ${toDelete.network}` : ""}
        tone="reject"
        confirmLabel="Remove address"
        busy={busy}
        onCancel={() => setToDelete(null)}
        onConfirm={remove}
      >
        <div className="pg-form-msg error">
          Users will no longer be able to send deposits to this address. Pending requests that already reference it
          are unaffected.
        </div>
      </ConfirmDialog>
    </div>
  );
}

/* ── Shell ─────────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [badges, setBadges] = useState({ pendingUsers: 0, pendingRequests: 0, pendingCards: 0 });
  const [refreshKey, setRefreshKey] = useState(0);

  const meta = PAGE_META[location.pathname] || { title: "Admin", sub: "" };

  const loadBadges = useCallback(async () => {
    try {
      const data = await api.getAdminStats();
      setBadges({
        pendingUsers: data.stats?.pendingUsers || 0,
        pendingRequests: data.stats?.pendingRequests || 0,
        pendingCards: data.stats?.pendingCardTxs || 0,
      });
    } catch {
      /* badges are best-effort */
    }
  }, []);

  useEffect(() => { loadBadges(); }, [loadBadges, location.pathname]);

  const onChanged = useCallback(
    (pendingUsers, pendingCards, pendingRequests) => {
      setBadges((b) => ({
        pendingUsers: pendingUsers ?? b.pendingUsers,
        pendingRequests: pendingRequests ?? b.pendingRequests,
        pendingCards: pendingCards ?? b.pendingCards,
      }));
      setRefreshKey((k) => k + 1);
      loadBadges();
    },
    [loadBadges]
  );

  return (
    <div className="admin-dashboard">
      <Toaster />
      <button className="ad-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
        {Icons.menu}
      </button>

      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} badges={badges} onNavigate={() => setSidebarOpen(false)} />

      <div className="ad-main">
        <header className="ad-topbar">
          <div className="ad-topbar-title">
            <h1>{meta.title}</h1>
            <p>{meta.sub}</p>
          </div>
          <div className="ad-topbar-right">
            <div className="ad-today">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
            <NotificationDropdown />
          </div>
        </header>

        <div className="ad-content">
          <Routes>
            <Route path="/" element={<AdminHome refreshKey={refreshKey} />} />
            <Route path="/users" element={<UsersPage onChanged={onChanged} />} />
            <Route path="/pending" element={<UsersPage pendingOnly onChanged={onChanged} />} />
            <Route path="/approvals" element={<RequestsQueue onChanged={onChanged} />} />
            <Route path="/cards" element={<RequestsQueue cardMode onChanged={onChanged} />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/addresses" element={<AddressesPage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
