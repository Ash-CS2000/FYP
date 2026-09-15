// src/hooks/useNotifications.jsx
//
// Shared notification state, one fetch per authenticated section. Mount
// NotificationsProvider as a pathless layout route inside each role's
// ProtectedRoute block (see App.jsx) — everything under it (AppShell, the
// dashboard, the Notifications page) reads the same fetched list via
// useNotifications() instead of each firing its own GET /api/notifications/.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../api/notifications';

const NotificationsContext = createContext(null);

export function NotificationsProvider() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    setLoading(true);
    return listNotifications().then(setNotifications).finally(() => setLoading(false));
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const markRead = useCallback(async (id) => {
    setNotifications(list => list.map(n => (n.id === id ? { ...n, read: true } : n)));
    try {
      await markNotificationRead(id);
    } catch {
      refetch();
    }
  }, [refetch]);

  const markAllRead = useCallback(async () => {
    setNotifications(list => list.map(n => ({ ...n, read: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      refetch();
    }
  }, [refetch]);

  const value = useMemo(() => ({
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    loading,
    refetch,
    markRead,
    markAllRead,
  }), [notifications, loading, refetch, markRead, markAllRead]);

  return (
    <NotificationsContext.Provider value={value}>
      <Outlet />
    </NotificationsContext.Provider>
  );
}

/**
 * The signed-in user's notifications and the ways to change them.
 *
 *   const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();
 *
 * Falls back to an empty, non-fetching stub when used outside
 * NotificationsProvider, so a component rendered off that tree still
 * renders instead of crashing.
 */
export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (ctx) return ctx;
  return {
    notifications: [],
    unreadCount: 0,
    loading: false,
    refetch: () => Promise.resolve([]),
    markRead: () => {},
    markAllRead: () => {},
  };
}
