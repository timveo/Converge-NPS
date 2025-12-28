import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';

// User Pages
import AuthPage from '@/pages/AuthPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import DashboardPage from '@/pages/DashboardPage';
import ProfilePage from '@/pages/ProfilePage';
import ProfileEditPage from '@/pages/ProfileEditPage';
import PrivacySettingsPage from '@/pages/PrivacySettingsPage';
import ConnectionsPage from '@/pages/ConnectionsPage';
import SchedulePage from '@/pages/SchedulePage';
import MySchedulePage from '@/pages/MySchedulePage';
import MessagesPage from '@/pages/MessagesPage';
import ChatPage from '@/pages/ChatPage';
import ScannerPage from '@/pages/ScannerPage';
import OpportunitiesPage from '@/pages/OpportunitiesPage';
import SubmitOpportunityPage from '@/pages/SubmitOpportunityPage';
import IndustryPage from '@/pages/IndustryPage';
import ProjectsPage from '@/pages/ProjectsPage';
import PartnersPage from '@/pages/PartnersPage';
import SettingsPage from '@/pages/SettingsPage';

// Admin Pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import SessionManagement from '@/pages/admin/SessionManagement';
import SessionForm from '@/pages/admin/SessionForm';
import UserManagement from '@/pages/admin/UserManagement';
import Analytics from '@/pages/admin/Analytics';
import EventAnalytics from '@/pages/admin/EventAnalytics';
import SmartsheetPage from '@/pages/admin/SmartsheetPage';
import AuditLogsPage from '@/pages/admin/AuditLogsPage';
import ProjectInterestsPage from '@/pages/admin/ProjectInterestsPage';
import SessionRsvpsPage from '@/pages/admin/SessionRsvpsPage';

// Staff Pages
import StaffCheckinPage from '@/pages/staff/StaffCheckinPage';

function App() {
  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected user routes with bottom nav */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/edit" element={<ProfileEditPage />} />
          <Route path="/privacy-settings" element={<PrivacySettingsPage />} />
          <Route path="/scanner" element={<ScannerPage />} />
          <Route path="/connections" element={<ConnectionsPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/my-schedule" element={<MySchedulePage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/messages/:conversationId" element={<ChatPage />} />
          <Route path="/opportunities" element={<OpportunitiesPage />} />
          <Route path="/opportunities/submit" element={<SubmitOpportunityPage />} />
          <Route path="/industry" element={<IndustryPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/partners" element={<PartnersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Admin routes (require admin/staff role) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/sessions"
          element={
            <ProtectedRoute requireAdmin>
              <SessionManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/sessions/new"
          element={
            <ProtectedRoute requireAdmin>
              <SessionForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/sessions/:id/edit"
          element={
            <ProtectedRoute requireAdmin>
              <SessionForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requireAdmin>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute requireAdmin>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/event-analytics"
          element={
            <ProtectedRoute requireAdmin>
              <EventAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/smartsheet"
          element={
            <ProtectedRoute requireAdmin>
              <SmartsheetPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute requireAdmin>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/projects/:id/interests"
          element={
            <ProtectedRoute requireAdmin>
              <ProjectInterestsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/sessions/:id/rsvps"
          element={
            <ProtectedRoute requireAdmin>
              <SessionRsvpsPage />
            </ProtectedRoute>
          }
        />

        {/* Staff routes (require staff/admin role) */}
        <Route
          path="/staff/checkin"
          element={
            <ProtectedRoute requireStaff>
              <StaffCheckinPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-center" />
    </>
  );
}

export default App;
