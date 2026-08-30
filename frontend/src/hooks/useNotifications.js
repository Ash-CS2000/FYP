// src/hooks/useNotifications.js
//
// Shared notification state. Called once in AppShell and prop-drilled to
// Sidebar/Topbar rather than a React Context — no Context exists anywhere else
// in this frontend, so a shared hook stays consistent with that.

import { useCallback, useEffect, useState } from 'react';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../api/notifications';

export function useNotifications() {
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

  return {
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    loading,
    refetch,
    markRead,
    markAllRead,
  };
}
