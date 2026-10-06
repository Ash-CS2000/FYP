// src/hooks/useReviewerAssignments.jsx
//
// The reviewer's assignments, one fetch per reviewer section. Mounted as a
// pathless layout route around the reviewer pages (see App.jsx), like
// NotificationsProvider. The sidebar badges, AssignmentGate, the dashboard,
// the assignment list and the completed list all read this one list, so a
// response recorded on one page shows everywhere at once — including the
// badge counts, which used to come from mock data.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { listAssignments } from '../api/invitations.js';

const ReviewerAssignmentsContext = createContext(null);

export function ReviewerAssignmentsProvider() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = useCallback(() => {
    return listAssignments()
      .then((rows) => { setAssignments(rows); setError(''); return rows; })
      .catch((err) => { setError(err.message || 'Could not load your assignments.'); return []; })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  // One fetch serves the whole section, so a failed one (network, throttling)
  // would otherwise stick until a full reload. Retry on the next navigation.
  const { pathname } = useLocation();
  useEffect(() => {
    if (error) refetch();
  }, [pathname]);

  // Merge one row's changes in place (a panel's server response plus any
  // local-only fields) rather than refetching the whole list.
  const patch = useCallback((id, changes) => {
    setAssignments(list => list.map(a => (a.id === id ? { ...a, ...changes } : a)));
  }, []);

  const value = useMemo(() => ({
    assignments,
    loading,
    error,
    refetch,
    patch,
    counts: {
      invited: assignments.filter(a => a.status === 'invited').length,
      accepted: assignments.filter(a => a.status === 'accepted').length,
    },
  }), [assignments, loading, error, refetch, patch]);

  return (
    <ReviewerAssignmentsContext.Provider value={value}>
      <Outlet />
    </ReviewerAssignmentsContext.Provider>
  );
}

/**
 * The signed-in reviewer's assignments.
 *
 *   const { assignments, loading, error, refetch, patch, counts } = useReviewerAssignments();
 *
 * Returns null outside ReviewerAssignmentsProvider, so shared components
 * (AppShell, Sidebar) can call it for every role and just skip the reviewer
 * extras when it is absent.
 */
export function useReviewerAssignments() {
  return useContext(ReviewerAssignmentsContext);
}
