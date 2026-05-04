import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import AuthorDashboard from './pages/AuthorDashboard.jsx';
import SubmitPaper from './pages/SubmitPaper.jsx';
import MyPapers from './pages/MyPapers.jsx';
import Revision from './pages/Revision.jsx';
import ReviewerDashboard from './pages/ReviewerDashboard.jsx';
import ReviewForm from './pages/ReviewForm.jsx';
import ReviewerCompleted from './pages/ReviewerCompleted.jsx';
import EditorDashboard from './pages/EditorDashboard.jsx';
import EditorSubmissions from './pages/EditorSubmissions.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import Notifications from './pages/Notifications.jsx';
import Profile from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<AuthPage initialTab="signin" />} />
      <Route path="/register" element={<AuthPage initialTab="signup" />} />

      {/* Author */}
      <Route path="/author" element={<Navigate to="/author/dashboard" replace />} />
      <Route path="/author/dashboard" element={<AuthorDashboard />} />
      <Route path="/author/papers" element={<MyPapers />} />
      <Route path="/author/submit" element={<SubmitPaper />} />
      <Route path="/author/revision" element={<Revision />} />
      <Route path="/author/notifications" element={<Notifications role="author" />} />
      <Route path="/author/profile" element={<Profile role="author" />} />
      <Route path="/author/settings" element={<Settings role="author" />} />

      {/* Reviewer */}
      <Route path="/reviewer" element={<Navigate to="/reviewer/dashboard" replace />} />
      <Route path="/reviewer/dashboard" element={<ReviewerDashboard />} />
      <Route path="/reviewer/assigned" element={<ReviewerDashboard />} />
      <Route path="/reviewer/review" element={<ReviewForm />} />
      <Route path="/reviewer/completed" element={<ReviewerCompleted />} />
      <Route path="/reviewer/notifications" element={<Notifications role="reviewer" />} />
      <Route path="/reviewer/profile" element={<Profile role="reviewer" />} />

      {/* Editor */}
      <Route path="/editor" element={<Navigate to="/editor/dashboard" replace />} />
      <Route path="/editor/dashboard" element={<EditorDashboard />} />
      <Route path="/editor/submissions" element={<EditorSubmissions />} />
      <Route path="/editor/pending" element={<EditorDashboard />} />
      <Route path="/editor/notifications" element={<Notifications role="editor" />} />
      <Route path="/editor/settings" element={<Settings role="editor" />} />

      {/* Admin */}
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/users" element={<AdminUsers />} />
      <Route path="/admin/submissions" element={<EditorSubmissions />} />
      <Route path="/admin/settings" element={<Settings role="admin" />} />

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
