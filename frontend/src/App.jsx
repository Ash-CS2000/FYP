import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import AuthorDashboard from './pages/AuthorDashboard.jsx';
import SubmitPaper from './pages/SubmitPaper.jsx';
import MyPapers from './pages/MyPapers.jsx';
import Revision from './pages/Revision.jsx';
import TrainingModule from './pages/TrainingModule.jsx';
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
import StudentProgress from './pages/StudentProgress.jsx';
import StudentResources from './pages/StudentResources.jsx';
import ResourcesPage from './pages/ResourcesPage.jsx';
import UserPapers from './pages/UserPapers.jsx';
<<<<<<< Updated upstream
import FinalAssessment from './pages/FinalAssessment.jsx';
import Certificate from './pages/Certificate.jsx';
import UserSubmit from './pages/UserSubmit.jsx';
=======
import SearchResultsPage from './pages/SearchResultsPage.jsx';
>>>>>>> Stashed changes

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomePage />} />
      <Route path="/search" element={<SearchResultsPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/resources" element={<ResourcesPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Author */}
      <Route path="/author" element={<Navigate to="/author/dashboard" replace />} />
      <Route path="/author/dashboard" element={<AuthorDashboard />} />
      <Route path="/author/papers" element={<MyPapers />} />
      <Route path="/author/submit" element={<SubmitPaper />} />
      <Route path="/author/revision" element={<Revision />} />
      <Route path="/author/notifications" element={<Notifications role="author" />} />
      <Route path="/author/profile" element={<Profile role="author" />} />
      <Route path="/author/settings" element={<Settings role="author" />} />

      {/* Student system */}
      <Route path="/student" element={<Navigate to="/student/papers" replace />} />
      <Route path="/student/dashboard" element={<Navigate to="/student/papers" replace />} />

      <Route path="/student/papers" element={<UserPapers />} />
      <Route path="/student/training" element={<TrainingModule />} />
      <Route path="/student/assessment" element={<FinalAssessment />} />
      <Route path="/student/certificate" element={<Certificate />} />
      <Route path="/student/submit" element={<UserSubmit />} />
      <Route path="/student/progress" element={<StudentProgress />} />
      <Route path="/student/resources" element={<StudentResources />} />
      <Route path="/student/notifications" element={<Notifications role="student" />} />
      <Route path="/student/profile" element={<Profile role="student" />} />
      <Route path="/student/settings" element={<Settings role="student" />} />

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
      <Route path="/admin/submissions" element={<EditorSubmissions role="admin" />} />
      <Route path="/admin/settings" element={<Settings role="admin" />} />

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}