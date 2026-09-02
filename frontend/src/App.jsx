import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import AuthorDashboard from './pages/AuthorDashboard.jsx';
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
import FinalAssessment from './pages/FinalAssessment.jsx';
import Certificate from './pages/Certificate.jsx';
import UserSubmit from './pages/UserSubmit.jsx';
import SearchResultsPage from './pages/SearchResultsPage.jsx';
import OrcidCallback from './pages/OrcidCallback';
import SelectWorkspace from './pages/SelectWorkspace.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import TrainingGate from './auth/TrainingGate.jsx';
import ReviewerActiveGate from './auth/ReviewerActiveGate.jsx';
import ReviewerPending from './pages/ReviewerPending.jsx';
import EditorReviews from './pages/EditorReviews.jsx';
import SimilarityReport from './pages/SimilarityReport.jsx';
import ManuscriptDetail from './pages/ManuscriptDetail.jsx';
import AuthorPaper from './pages/AuthorPaper.jsx';
import ReviewerAssignments from './pages/ReviewerAssignments.jsx';
import AssignmentGate from './auth/AssignmentGate.jsx';
import AdminAudit from './pages/AdminAudit.jsx';
import EditorInvite from './pages/EditorInvite.jsx';

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
      <Route path="/editor-invite/:token" element={<EditorInvite />} />

      {/* Any authenticated user. /reviewer/pending must sit OUTSIDE the
          reviewer block below, or ReviewerActiveGate would redirect into it
          forever. */}
      <Route element={<ProtectedRoute />}>
        <Route path="/select-workspace" element={<SelectWorkspace />} />
        <Route path="/reviewer/pending" element={<ReviewerPending />} />
      </Route>

      {/* Author */}
      <Route element={<ProtectedRoute allow={['author']} />}>
        <Route path="/author" element={<Navigate to="/author/dashboard" replace />} />
        <Route path="/author/dashboard" element={<AuthorDashboard />} />
        {/* My Papers is the author's own submissions; topic discovery is a separate,
            read-only browse surface and must not sit on /author/papers. */}
        <Route path="/author/papers" element={<MyPapers />} />
        <Route path="/author/papers/:id" element={<AuthorPaper />} />
        <Route path="/author/discover" element={<UserPapers />} />

        {/* Submission requires a passed final assessment. Never gate the
            training routes themselves — that would deadlock the gate. */}
        <Route element={<TrainingGate />}>
          <Route path="/author/submit" element={<UserSubmit />} />
          <Route path="/author/papers/:id/revision" element={<Revision />} />
        </Route>

        <Route path="/author/training" element={<TrainingModule />} />
        <Route path="/author/progress" element={<StudentProgress />} />
        <Route path="/author/assessment" element={<FinalAssessment />} />
        <Route path="/author/certificate" element={<Certificate />} />
        <Route path="/author/resources" element={<StudentResources />} />
        <Route path="/author/notifications" element={<Notifications role="author" />} />
        <Route path="/author/profile" element={<Profile role="author" />} />
        <Route path="/author/settings" element={<Settings role="author" />} />
      </Route>

      {/* Legacy student URLs → redirect to author equivalents */}
      <Route path="/student/training" element={<Navigate to="/author/training" replace />} />
      <Route path="/student/progress" element={<Navigate to="/author/progress" replace />} />
      <Route path="/student/assessment" element={<Navigate to="/author/assessment" replace />} />
      <Route path="/student/certificate" element={<Navigate to="/author/certificate" replace />} />
      <Route path="/student/submit" element={<Navigate to="/author/submit" replace />} />
      <Route path="/student/resources" element={<Navigate to="/author/resources" replace />} />
      <Route path="/student/papers" element={<Navigate to="/author/papers" replace />} />
      <Route path="/student/*" element={<Navigate to="/author/training" replace />} />

      {/* Reviewer */}
      <Route element={<ProtectedRoute allow={['reviewer']} />}>
        {/* Reviewing is approval-gated — an admin must accept the application. */}
        <Route element={<ReviewerActiveGate />}>
          <Route path="/reviewer" element={<Navigate to="/reviewer/dashboard" replace />} />
          <Route path="/reviewer/dashboard" element={<ReviewerDashboard />} />

          {/* One page, three entry points: the whole list, the undecided
              invitations, and the accepted work. */}
          <Route path="/reviewer/assignments" element={<ReviewerAssignments />} />
          <Route path="/reviewer/invitations" element={<ReviewerAssignments initialFilter="invited" />} />
          <Route path="/reviewer/assigned" element={<ReviewerAssignments initialFilter="active" />} />

          {/* The manuscript opens only for an assignment this reviewer accepted.
              AssignmentGate is a courtesy — the server must check too. */}
          <Route element={<AssignmentGate />}>
            <Route path="/reviewer/review/:id" element={<ReviewForm />} />
          </Route>
          {/* Legacy bare /reviewer/review had a hardcoded manuscript. */}
          <Route path="/reviewer/review" element={<Navigate to="/reviewer/assignments" replace />} />

          <Route path="/reviewer/completed" element={<ReviewerCompleted />} />
          <Route path="/reviewer/notifications" element={<Notifications role="reviewer" />} />
          <Route path="/reviewer/profile" element={<Profile role="reviewer" />} />
        </Route>
      </Route>

      {/* Editor */}
      <Route element={<ProtectedRoute allow={['editor']} />}>
        <Route path="/editor" element={<Navigate to="/editor/dashboard" replace />} />
        <Route path="/editor/dashboard" element={<EditorDashboard />} />
        <Route path="/editor/submissions" element={<EditorSubmissions />} />
        <Route path="/editor/pending" element={<EditorSubmissions initialFilter="pending" />} />
        {/* Screening is the submissions table pre-filtered to the flagged band. */}
        <Route path="/editor/screening" element={<EditorSubmissions initialFilter="flagged" />} />
        <Route path="/editor/submissions/:id" element={<ManuscriptDetail />} />
        <Route path="/editor/submissions/:id/reviews" element={<EditorReviews />} />
        <Route path="/editor/submissions/:id/similarity" element={<SimilarityReport />} />
        <Route path="/editor/notifications" element={<Notifications role="editor" />} />
        <Route path="/editor/settings" element={<Settings role="editor" />} />
      </Route>

      {/* Admin */}
      <Route element={<ProtectedRoute allow={['admin']} />}>
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/audit" element={<AdminAudit />} />
        <Route path="/admin/submissions" element={<EditorSubmissions role="admin" />} />
        {/* Admin oversight is read-only — decisions stay with the editor. */}
        <Route path="/admin/submissions/:id" element={<ManuscriptDetail role="admin" />} />
        <Route path="/admin/submissions/:id/reviews" element={<EditorReviews role="admin" />} />
        <Route path="/admin/submissions/:id/similarity" element={<SimilarityReport role="admin" />} />
        <Route path="/admin/settings" element={<Settings role="admin" />} />
      </Route>

      <Route path="/orcid/callback" element={<OrcidCallback />} />

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}