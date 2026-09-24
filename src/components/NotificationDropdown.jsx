import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Trash2, X, Inbox, CreditCard, Shield, Megaphone } from 'lucide-react';
import api from '../lib/api';
import { NotificationSkeleton } from './Skeleton';

const typeIcons = {
  SYSTEM: <Inbox size={16} />,
  ACCOUNT: <CreditCard size={16} />,
  TRANSACTION: <CreditCard size={16} />,
  SECURITY: <Shield size={16} />,
  PROMOTION: <Megaphone size={16} />,
};

const typeColors = {
  SYSTEM: '#6b7280',
  ACCOUNT: '#a3e635',
  TRANSACTION: '#3b82f6',
  SECURITY: '#f59e0b',
  PROMOTION: '#8b5cf6',
};

function timeAgo(date) {
  const now = new Date();
  const d = new Date(date);
  const seconds = Math.floor((now - d) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationDropdown() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  const fetchNotifications = useCallback(async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      const result = await api.getNotifications({ page: String(pageNum), limit: '10' });
      if (append) {
        setNotifications(prev => [...prev, ...result.notifications]);
      } else {
        setNotifications(result.notifications);
      }
      setUnreadCount(result.unreadCount);
      setHasMore(result.notifications.length === 10);
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const result = await api.getUnreadCount();
      setUnreadCount(result.unreadCount);
    } catch (e) {
      console.error('Failed to fetch unread count:', e);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications, fetchUnreadCount]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          bellRef.current && !bellRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchNotifications();
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Failed to mark as read:', e);
    }
  };

  const handleItemClick = (n) => {
    markAsRead(n.id);
    if (n.link) {
      setIsOpen(false);
      navigate(n.link);
    }
  };

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Failed to mark all as read:', e);
    }
  };

  const deleteNotification = async (id, e) => {
    e.stopPropagation();
    try {
      await api.deleteNotification(id);
      const wasUnread = notifications.find(n => n.id === id && !n.read);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Failed to delete notification:', e);
    }
  };

  const clearAll = async () => {
    try {
      await api.clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
    } catch (e) {
      console.error('Failed to clear notifications:', e);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage, true);
  };

  return (
    <div className="notif-wrapper">
      <button
        ref={bellRef}
        className="mon-icon-btn notif-bell"
        onClick={toggleOpen}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div ref={dropdownRef} className="notif-dropdown">
          <div className="notif-header">
            <div className="notif-header-left">
              <h3>Notifications</h3>
              {unreadCount > 0 && <span className="notif-header-count">{unreadCount} new</span>}
            </div>
            <div className="notif-header-actions">
              {unreadCount > 0 && (
                <button className="notif-action-btn" onClick={markAllRead} title="Mark all read">
                  <CheckCheck size={16} />
                </button>
              )}
              {notifications.length > 0 && (
                <button className="notif-action-btn notif-action-danger" onClick={clearAll} title="Clear all">
                  <Trash2 size={16} />
                </button>
              )}
              <button className="notif-action-btn" onClick={() => setIsOpen(false)}>
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="notif-list">
            {notifications.length === 0 && !loading && (
              <div className="notif-empty">
                <Bell size={32} strokeWidth={1} />
                <p>No notifications yet</p>
              </div>
            )}

            {notifications.map(n => (
              <div
                key={n.id}
                className={`notif-item ${!n.read ? 'unread' : ''}`}
                style={n.link ? { cursor: 'pointer' } : undefined}
                onClick={() => handleItemClick(n)}
              >
                <div className="notif-item-icon" style={{ color: typeColors[n.type] }}>
                  {typeIcons[n.type]}
                </div>
                <div className="notif-item-content">
                  <div className="notif-item-title">{n.title}</div>
                  <div className="notif-item-message">{n.message}</div>
                  <div className="notif-item-time">{timeAgo(n.createdAt)}</div>
                </div>
                <button
                  className="notif-item-delete"
                  onClick={(e) => deleteNotification(n.id, e)}
                  title="Delete"
                >
                  <X size={14} />
                </button>
              </div>
            ))}

            {loading && notifications.length === 0 && (
              <NotificationSkeleton count={4} />
            )}

            {loading && notifications.length > 0 && (
              <div className="notif-loading">Loading more...</div>
            )}

            {hasMore && notifications.length > 0 && !loading && (
              <button className="notif-load-more" onClick={loadMore}>
                Load more
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
