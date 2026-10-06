import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { PublicLayout } from "@/layouts/PublicLayout";
import { UserLayout } from "@/layouts/UserLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { LandingPage } from "@/pages/LandingPage";
import { QuestionnairePage } from "@/pages/QuestionnairePage";
import { ReviewPage } from "@/pages/ReviewPage";
import { AuthPage } from "@/pages/AuthPage";
import { ChatPage } from "@/pages/ChatPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { AdminLoginPage } from "@/pages/admin/AdminLoginPage";
import { DashboardPage } from "@/pages/admin/DashboardPage";
import { ResponsesPage } from "@/pages/admin/ResponsesPage";
import { MessagesPage } from "@/pages/admin/MessagesPage";
import { QuestionsPage } from "@/pages/admin/QuestionsPage";
import { AnalyticsPage } from "@/pages/admin/AnalyticsPage";
import { SettingsPage } from "@/pages/admin/SettingsPage";
import { useAuthStore } from "@/stores/authStore";
import { useThemeStore } from "@/stores/themeStore";
import { isSupabaseConfigured } from "@/lib/supabase";

function SetupNotice() {
  if (isSupabaseConfigured) return null;
  return (
    <div className="bg-gold/20 px-4 py-2 text-center text-xs text-ink">
      Connect Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) and run supabase/schema.sql to activate live data. 💗
    </div>
  );
}

export default function App() {
  const initAuth = useAuthStore((s) => s.init);
  const initTheme = useThemeStore((s) => s.init);

  useEffect(() => {
    initTheme();
    const unsubscribe = initAuth();
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SetupNotice />
        <Toaster
          position="top-center"
          toastOptions={{
            style: { background: "var(--app-surface)", color: "var(--app-text)", border: "1px solid var(--app-border)" },
          }}
        />
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/questionnaire" element={<QuestionnairePage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/auth" element={<AuthPage />} />
          </Route>

          <Route element={<UserLayout />}>
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<DashboardPage />} />
            <Route path="/admin/responses" element={<ResponsesPage />} />
            <Route path="/admin/messages" element={<MessagesPage />} />
            <Route path="/admin/questions" element={<QuestionsPage />} />
            <Route path="/admin/analytics" element={<AnalyticsPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
