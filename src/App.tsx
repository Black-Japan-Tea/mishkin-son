import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Bootstrap } from "./components/Bootstrap";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import { AppLayout } from "./components/layout/AppLayout";
import { useAuth } from "./stores/auth";
import { useFamily } from "./stores/family";
import { useChildren } from "./stores/children";
import { ConfigRequiredPage } from "./pages/ConfigRequiredPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { FamilyPage } from "./pages/FamilyPage";
import { ChildSelectPage } from "./pages/ChildSelectPage";
import { HomePage } from "./pages/HomePage";
import { HistoryPage } from "./pages/HistoryPage";
import { StatsPage } from "./pages/StatsPage";
import { TipsPage } from "./pages/TipsPage";
import { ChildProfilePage } from "./pages/ChildProfilePage";
import { SettingsPage } from "./pages/SettingsPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 30_000 } },
});

function Splash(): React.JSX.Element {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

/** Вход выполнен; семейный гейт — отдельным маршрутом (нужно дать создать/вступить). */
function AuthGate(): React.JSX.Element {
  const phase = useAuth((s) => s.phase);
  if (phase === "loading") return <Splash />;
  if (phase === "unconfigured") return <Navigate to="/config" replace />;
  if (phase === "signedOut") return <Navigate to="/login" replace />;
  return <Outlet />;
}

function FamilyGate(): React.JSX.Element {
  const { family, loaded } = useFamily();
  if (!loaded) return <Splash />;
  if (family === null) return <Navigate to="/family" replace />;
  return <Outlet />;
}

function ChildGate(): React.JSX.Element {
  const { children, activeId, loaded } = useChildren();
  if (!loaded) return <Splash />;
  if (children.length === 0 || activeId === null) return <Navigate to="/children" replace />;
  return <Outlet />;
}

function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <Bootstrap />
          <Routes>
            <Route path="/config" element={<ConfigRequiredPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<AuthGate />}>
              <Route path="/family" element={<FamilyPage />} />
              <Route element={<FamilyGate />}>
                <Route path="/children" element={<ChildSelectPage />} />
                <Route element={<ChildGate />}>
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/history" element={<HistoryPage />} />
                    <Route path="/stats" element={<StatsPage />} />
                    <Route path="/tips" element={<TipsPage />} />
                    <Route path="/child" element={<ChildProfilePage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Route>
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
