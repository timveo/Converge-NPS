import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { OfflineIndicator } from '@/components/layout/OfflineIndicator';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';

// User Pages
import AuthPage from '@/pages/AuthPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import DashboardPage from '@/pages/DashboardPage';
import ProfilePage from '@/pages/ProfilePage';
import ProfileEditPage from '@/pages/ProfileEditPage';
import PrivacySettingsPage from '@/pages/PrivacySettingsPage';
import ConnectionsPage from '@/pages/ConnectionsPage';
import SchedulePage from '@/pages/SchedulePage';
import MySchedulePage from '@/pages/MySchedulePage';
import MessagesPage from '@/pages/MessagesPage';
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
import SmartsheetPage from '@/pages/admin/SmartsheetPage';
import AuditLogsPage from '@/pages/admin/AuditLogsPage';

// Staff Pages
import StaffCheckinPage from '@/pages/staff/StaffCheckinPage';

function App() {
  return (
    <>
      <OfflineIndicator />
      <Routes>
        {/* Public routes */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Protected user routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/edit"
          element={
            <ProtectedRoute>
              <ProfileEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/privacy-settings"
          element={
            <ProtectedRoute>
              <PrivacySettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scanner"
          element={
            <ProtectedRoute>
              <ScannerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/connections"
          element={
            <ProtectedRoute>
              <ConnectionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/schedule"
          element={
            <ProtectedRoute>
              <SchedulePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-schedule"
          element={
            <ProtectedRoute>
              <MySchedulePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/opportunities"
          element={
            <ProtectedRoute>
              <OpportunitiesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/opportunities/submit"
          element={
            <ProtectedRoute>
              <SubmitOpportunityPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/industry"
          element={
            <ProtectedRoute>
              <IndustryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <ProjectsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/partners"
          element={
            <ProtectedRoute>
              <PartnersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Admin routes (require admin/staff role) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/sessions"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <SessionManagement />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/sessions/new"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <SessionForm />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/sessions/:id/edit"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <SessionForm />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <UserManagement />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <Analytics />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/smartsheet"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <SmartsheetPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout>
                <AuditLogsPage />
              </AdminLayout>
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
