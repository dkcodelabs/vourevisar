

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TimerProvider } from "@/contexts/TimerContext";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import LandingPage from "@/pages/LandingPage";
import Dashboard from "@/pages/Dashboard";
import Subjects from "@/pages/Subjects";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import Statistics from "@/pages/Statistics";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import ConfirmEmail from "@/pages/ConfirmEmail";
import Topics from "@/pages/Topics";
import Revisoes from "@/pages/Revisoes";
import StudyCycle from "@/pages/StudyCycle";
import Gerenciamento from "@/pages/Gerenciamento";
import UserManagement from "@/pages/admin/UserManagement";
import ImportQuestions from "@/pages/admin/content/ImportQuestions";
import SubscriptionManagement from "@/pages/admin/SubscriptionManagement";
import SystemManagement from "@/pages/admin/SystemManagement";
import SecurityAudit from "@/pages/admin/SecurityAudit";
import RolesManagement from "@/pages/admin/security/RolesManagement";
import TrendAnalysis from "@/pages/statistics/TrendAnalysis";

import { AuthCallback } from "@/components/AuthCallback";
import { SimpleRoleTest } from "@/components/SimpleRoleTest";

import { ProfileOnboardingGate } from "@/components/ProfileOnboardingGate";
import { useBrowserCompatibility } from "@/hooks/useBrowserCompatibility";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

const App = () => {
  // Apply browser compatibility fixes
  useBrowserCompatibility();

  return (
    <div className="font-sans">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ThemeProvider>
            <BrowserRouter>
              <AuthProvider>
                <AppProvider>
                  <TimerProvider>
                    <ToastContainer
                      position="bottom-right"
                      autoClose={4000}
                      hideProgressBar={false}
                      newestOnTop={false}
                      closeOnClick
                      rtl={false}
                      pauseOnFocusLoss
                      draggable
                      pauseOnHover
                      theme="colored"
                      stacked={false}
                      toastClassName="!rounded-xl !shadow-lg !font-medium"
                    />
                    <ProfileOnboardingGate />
                    <Routes>
                      <Route path="/" element={<LandingPage />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/confirm-email" element={<ConfirmEmail />} />
                      <Route path="/auth/callback" element={<AuthCallback />} />
                      <Route path="/*" element={<ProtectedRoute />}>
                        <Route path="" element={<AppLayout />}>
                          <Route path="dashboard" element={<Dashboard />} />
                          <Route path="materias" element={<Subjects />} />
                          <Route path="estatisticas" element={<Statistics />} />
                          <Route path="materias/:subjectId/topicos" element={<Topics />} />
                          <Route path="topicos" element={<Topics />} />
                          <Route path="revisoes" element={<Revisoes />} />
                          <Route path="ciclo-estudos" element={<StudyCycle />} />
                          <Route path="ciclo-estudos" element={<StudyCycle />} />
                          {/* <Route path="gerenciamento" element={<Gerenciamento />} /> - REMOVED: Monolith dismantled */}

                          {/* Admin Routes - Protected */}
                          <Route element={<AdminRoute />}>
                            <Route path="gerenciamento" element={<Gerenciamento />} />
                            <Route path="admin/users" element={<UserManagement />} />
                            <Route path="admin/content/import" element={<ImportQuestions />} />
                            <Route path="admin/subscription" element={<SubscriptionManagement />} />
                            <Route path="admin/system" element={<SystemManagement />} />
                            <Route path="admin/security" element={<SecurityAudit />} />
                            <Route path="admin/security/roles" element={<RolesManagement />} />
                          </Route>

                          {/* Statistics Routes */}
                          <Route path="estatisticas/tendencia" element={<TrendAnalysis />} />

                          <Route path="test-roles" element={<SimpleRoleTest />} />
                          <Route path="perfil" element={<Profile />} />
                          <Route path="configuracoes" element={<Settings />} />

                        </Route>
                      </Route>
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </TimerProvider>
                </AppProvider>
              </AuthProvider>
            </BrowserRouter>
          </ThemeProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </div>
  );
};

export default App;
