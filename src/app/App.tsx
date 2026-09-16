import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { SessionProvider } from '@/lib/session';
import { AppShell } from './AppShell';
import {
  RedirectIfAuthenticated,
  RedirectWhenDone,
  RequireAdmin,
  RequireAuth,
} from './guards';
import { LandingPage } from '@/pages/Landing';
import { DashboardPage } from '@/pages/Dashboard';
import { OnboardingPage } from '@/pages/Onboarding';
import { WeeklySchedulePage } from '@/pages/WeeklySchedule';
import { DocumentsPage } from '@/pages/Documents';
import { ToolsPage } from '@/pages/ToolsPage';
import { ToolPage } from '@/pages/ToolPage';
import { AccountPage } from '@/pages/Account';
import { HelpPage } from '@/pages/Help';
import { AdminPage } from '@/pages/Admin';
import { UnauthorizedPage } from '@/pages/Unauthorized';
import { NotFoundPage } from '@/pages/NotFound';
import { PrivacyPage } from '@/pages/Privacy';
import { TermsPage } from '@/pages/Terms';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SessionProvider>
          <AppShell>
          <Routes>
            <Route
              path="/"
              element={
                <RedirectIfAuthenticated>
                  <LandingPage />
                </RedirectIfAuthenticated>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <DashboardPage />
                </RequireAuth>
              }
            />
            <Route
              path="/welcome"
              element={
                <RequireAuth>
                  <RedirectWhenDone path="/welcome">
                    <OnboardingPage />
                  </RedirectWhenDone>
                </RequireAuth>
              }
            />
            <Route
              path="/schedule"
              element={
                <RequireAuth>
                  <WeeklySchedulePage />
                </RequireAuth>
              }
            />
            <Route
              path="/documents"
              element={
                <RequireAuth>
                  <DocumentsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/tools"
              element={
                <RequireAuth>
                  <ToolsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/tools/:slug"
              element={
                <RequireAuth>
                  <ToolPage />
                </RequireAuth>
              }
            />
            <Route
              path="/account"
              element={
                <RequireAuth>
                  <AccountPage />
                </RequireAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <RequireAdmin>
                    <AdminPage />
                  </RequireAdmin>
                </RequireAuth>
              }
            />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </AppShell>
        </SessionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
