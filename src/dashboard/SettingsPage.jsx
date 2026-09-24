import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Lock, Moon, Sun, Sparkles, AlertTriangle, Trash2, CreditCard,
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import Modal from '../components/Modal';
import PlanModal from '../components/PlanModal';
import { toast } from '../lib/toast';
import './pages.css';

export default function SettingsPage() {
  const { user, logout, checkAuth } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  // Profile
  const [profile, setProfile] = useState({ firstName: '', lastName: '', phone: '' });
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  // Password
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  // 2FA
  const [tfa, setTfa] = useState(false);
  const [tfaBusy, setTfaBusy] = useState(false);

  // Plan + danger zone
  const [planOpen, setPlanOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePw, setDeletePw] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
      });
      setTfa(!!user.twoFactorEnabled);
    }
  }, [user]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileBusy(true);
    try {
      const res = await api.updateProfile(profile);
      toast(res.message, 'success');
      setProfileMsg({ type: 'success', text: res.message });
      await checkAuth(); // refresh the context so header/greeting update too
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || 'We could not save your profile. Please try again.' });
    } finally {
      setProfileBusy(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (pw.next.length < 8) return setPwMsg({ type: 'error', text: 'New password must be at least 8 characters.' });
    if (pw.next !== pw.confirm) return setPwMsg({ type: 'error', text: 'New passwords do not match.' });
    if (pw.next === pw.current) return setPwMsg({ type: 'error', text: 'New password must differ from your current one.' });

    setPwBusy(true);
    try {
      const res = await api.changePassword(pw.current, pw.next);
      toast(res.message, 'success');
      setPwMsg({ type: 'success', text: res.message });
      setPw({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPwMsg({ type: 'error', text: err.message || 'We could not change your password. Please try again.' });
    } finally {
      setPwBusy(false);
    }
  };

  const toggleTfa = async () => {
    setTfaBusy(true);
    const next = !tfa;
    try {
      const res = await api.setTwoFactor(next);
      setTfa(res.twoFactorEnabled);
      toast(res.message, 'success');
      await checkAuth();
    } catch (err) {
      toast(err.message || 'We could not update your two-factor settings. Please try again.', 'error');
    } finally {
      setTfaBusy(false);
    }
  };

  const confirmDelete = async (e) => {
    e.preventDefault();
    setDeleteError('');
    setDeleteBusy(true);
    try {
      const res = await api.deleteAccount(deletePw);
      toast(res.message, 'success');
      logout();
      navigate('/', { replace: true });
    } catch (err) {
      setDeleteError(err.message || 'We could not delete your account. Please try again.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || '?';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <>
      <div className="mon-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your profile, security and appearance.</p>
        </div>
      </div>

      <div className="pg-settings-sections">
        {/* Profile */}
        <div className="pg-card">
          <div className="pg-card-head">
            <div>
              <div className="pg-card-title"><User size={15} style={{ verticalAlign: -2 }} /> Profile</div>
              <div className="pg-card-sub">How you appear across the app</div>
            </div>
          </div>

          <div className="pg-profile-head">
            <div className="pg-avatar-lg">{initials}</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--m-text)' }}>
                {user?.firstName} {user?.lastName}
              </div>
              <div style={{ fontSize: 13, color: 'var(--m-text-45)' }}>{user?.email}</div>
              <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                <span className={`pg-badge ${user?.status === 'APPROVED' ? 'green' : 'amber'}`}>{user?.status}</span>
                <span className="pg-badge purple">{user?.plan || 'Starter'} plan</span>
                {isAdmin && <span className="pg-badge blue">Admin</span>}
              </div>
            </div>
          </div>

          <form onSubmit={saveProfile}>
            {profileMsg && <div className={`pg-form-msg ${profileMsg.type}`}>{profileMsg.text}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="pg-field">
                <label>First name</label>
                <input
                  className="pg-input"
                  value={profile.firstName}
                  onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="pg-field">
                <label>Last name</label>
                <input
                  className="pg-input"
                  value={profile.lastName}
                  onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="pg-field">
                <label>Email (read-only)</label>
                <input className="pg-input" value={user?.email || ''} readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              </div>
              <div className="pg-field">
                <label>Phone</label>
                <input
                  className="pg-input"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" className="pg-btn pg-btn-primary" disabled={profileBusy}>
              {profileBusy ? 'Saving…' : 'Save profile'}
            </button>
          </form>
        </div>

        {/* Security */}
        <div className="pg-card">
          <div className="pg-card-head">
            <div>
              <div className="pg-card-title"><Lock size={15} style={{ verticalAlign: -2 }} /> Security</div>
              <div className="pg-card-sub">Password and two-factor authentication</div>
            </div>
          </div>

          <div className="pg-setting-row">
            <div>
              <div className="label">Two-factor authentication (2FA)</div>
              <div className="desc">
                {tfa
                  ? 'ON — you will need a 6-digit code from your email each time you log in.'
                  : 'OFF — your password alone grants access to your account.'}
              </div>
            </div>
            <button
              className={`pg-switch ${tfa ? 'on' : ''}`}
              onClick={toggleTfa}
              disabled={tfaBusy}
              aria-label="Toggle two-factor authentication"
            />
          </div>

          <form onSubmit={changePassword} style={{ marginTop: 14 }}>
            {pwMsg && <div className={`pg-form-msg ${pwMsg.type}`}>{pwMsg.text}</div>}

            <div className="pg-field">
              <label>Current password</label>
              <input
                type="password"
                className="pg-input"
                value={pw.current}
                onChange={(e) => setPw({ ...pw, current: e.target.value })}
                required
                autoComplete="current-password"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="pg-field">
                <label>New password</label>
                <input
                  type="password"
                  className="pg-input"
                  value={pw.next}
                  onChange={(e) => setPw({ ...pw, next: e.target.value })}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="pg-field">
                <label>Confirm new password</label>
                <input
                  type="password"
                  className="pg-input"
                  value={pw.confirm}
                  onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button type="submit" className="pg-btn pg-btn-ghost" disabled={pwBusy}>
              {pwBusy ? 'Updating…' : 'Change password'}
            </button>
          </form>
        </div>

        {/* Plan */}
        <div className="pg-card">
          <div className="pg-card-head">
            <div>
              <div className="pg-card-title"><Sparkles size={15} style={{ verticalAlign: -2 }} /> Plan</div>
              <div className="pg-card-sub">Your current subscription</div>
            </div>
          </div>
          <div className="pg-setting-row">
            <div>
              <div className="label">{user?.plan || 'Starter'} plan</div>
              <div className="desc">Upgrade or switch plans at any time — changes apply immediately.</div>
            </div>
            <button className="pg-btn pg-btn-primary pg-btn-sm" onClick={() => setPlanOpen(true)}>
              <CreditCard size={14} /> Change plan
            </button>
          </div>
        </div>

        {/* Appearance */}
        <div className="pg-card">
          <div className="pg-card-head">
            <div>
              <div className="pg-card-title"><Moon size={15} style={{ verticalAlign: -2 }} /> Appearance</div>
              <div className="pg-card-sub">Choose how the dashboard looks</div>
            </div>
          </div>
          <div className="pg-setting-row">
            <div>
              <div className="label">Theme</div>
              <div className="desc">Dark mode is easier on the eyes at night; light mode matches the marketing site.</div>
            </div>
            <div className="pg-seg">
              <button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>
                <Moon size={14} /> Dark
              </button>
              <button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>
                <Sun size={14} /> Light
              </button>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="pg-card pg-danger">
          <div className="pg-card-head">
            <div>
              <div className="pg-card-title"><AlertTriangle size={15} style={{ verticalAlign: -2 }} /> Danger zone</div>
              <div className="pg-card-sub">Irreversible actions</div>
            </div>
          </div>
          <div className="pg-setting-row">
            <div>
              <div className="label">Delete account</div>
              <div className="desc">
                Permanently removes your profile, balances, goals, cards and history. This cannot be undone.
              </div>
            </div>
            {!isAdmin && (
              <button className="pg-btn pg-btn-danger" onClick={() => { setDeletePw(''); setDeleteError(''); setDeleteOpen(true); }}>
                <Trash2 size={14} /> Delete account
              </button>
            )}
          </div>
        </div>
      </div>

      <PlanModal open={planOpen} onClose={() => setPlanOpen(false)} currentPlan={user?.plan || 'Starter'} onChanged={checkAuth} />

      {/* Delete account modal */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete your account?"
        subtitle="This permanently erases everything. There is no undo."
        width={440}
      >
        <form onSubmit={confirmDelete}>
          <div className="pg-form-msg error">
            You will lose your balance of funds, goals, cards and every transaction record.
          </div>
          {deleteError && <div className="pg-form-msg error">{deleteError}</div>}
          <div className="pg-field">
            <label>Confirm with your password</label>
            <input
              type="password"
              className="pg-input"
              value={deletePw}
              onChange={(e) => setDeletePw(e.target.value)}
              required
              autoFocus
              placeholder="Your password"
            />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="pg-btn pg-btn-ghost" style={{ flex: 1 }} onClick={() => setDeleteOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="pg-btn pg-btn-danger" style={{ flex: 1 }} disabled={deleteBusy}>
              {deleteBusy ? 'Deleting…' : 'Delete forever'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
