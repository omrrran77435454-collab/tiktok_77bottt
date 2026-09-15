import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { SessionProvider } from '@/lib/session';
import { AppShell } from './AppShell';
import {
  RedirectIfAuthenticated,
  RedirectWhenDone,
  RequireAdmin,
  RequireAuth,
  RequireTools,
} from './guards';
import { LandingPage } from '@/pages/Landing';
import { TelegramGatePage } from '@/pages/TelegramGate';
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
              path="/connect"
              element={
                <RequireAuth>
                  <RedirectWhenDone path="/connect">
                    <TelegramGatePage />
                  </RedirectWhenDone>
                </RequireAuth>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <RequireTools>
                    <DashboardPage />
                  </RequireTools>
                </RequireAuth>
              }
            />
            <Route
              path="/welcome"
              element={
                <RequireAuth>
                  <RequireTools>
                    <RedirectWhenDone path="/welcome">
                      <OnboardingPage />
                    </RedirectWhenDone>
                  </RequireTools>
                </RequireAuth>
              }
            />
            <Route
              path="/schedule"
              element={
                <RequireAuth>
                  <RequireTools>
                    <WeeklySchedulePage />
                  </RequireTools>
                </RequireAuth>
              }
            />
            <Route
              path="/documents"
              element={
                <RequireAuth>
                  <RequireTools>
                    <DocumentsPage />
                  </RequireTools>
                </RequireAuth>
              }
            />
            <Route
              path="/tools"
              element={
                <RequireAuth>
                  <RequireTools>
                    <ToolsPage />
                  </RequireTools>
                </RequireAuth>
              }
            />
            <Route
              path="/tools/:slug"
              element={
                <RequireAuth>
                  <RequireTools>
                    <ToolPage />
                  </RequireTools>
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
