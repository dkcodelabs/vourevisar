

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TimerProvider } from "@/contexts/TimerContext";
import { AppLayout } from "@/components/AppLayout";
import { StudentHubProvider } from "@/contexts/StudentHubContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RequireActiveSubscription } from "@/components/RequireActiveSubscription";
import { AdminRoute } from "@/components/AdminRoute";
import LandingPage from "@/pages/LandingPage";
import Dashboard from "@/pages/Dashboard";
import Subjects from "@/pages/Subjects";
import Account from "@/pages/Account";
import Statistics from "@/pages/Statistics";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import ConfirmEmail from "@/pages/ConfirmEmail";
import Revisoes from "@/pages/Revisoes";
import Editais from "@/pages/Editais";
import Cadernos from "@/pages/Cadernos";
import Planos from "@/pages/Planos";
import RevealCardDemo from "@/components/ui/RevealCardDemo";
import UserManagement from "@/pages/admin/UserManagement";
import SubscriptionManagement from "@/pages/admin/SubscriptionManagement";
import SystemErrors from "@/pages/admin/system/SystemErrors";
import RolesManagement from "@/pages/admin/security/RolesManagement";
import AuditLogs from "@/pages/admin/AuditLogs";
import AdminFeedback from "@/pages/admin/AdminFeedback";
import ToastSpamTest from "@/pages/admin/debug/ToastSpamTest";
import TrendAnalysis from "@/pages/statistics/TrendAnalysis";
import ImportanciaProvaAdmin from "@/pages/admin/TendenciaGUT";
import AdminEditais from "@/pages/admin/AdminEditais";
import PlanCouponManager from "@/pages/admin/PlanCouponManager";
import AISettings from "@/pages/admin/AISettings";

import { AuthCallback } from "@/components/AuthCallback";
import { SimpleRoleTest } from "@/components/SimpleRoleTest";

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
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>

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
                    <Routes>
                      <Route path="/" element={<LandingPage />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/confirm-email" element={<ConfirmEmail />} />
                      <Route path="/auth/callback" element={<AuthCallback />} />
                      <Route path="/*" element={<ProtectedRoute />}>
                        <Route path="" element={<StudentHubProvider><AppLayout /></StudentHubProvider>}>
                          <Route path="dashboard" element={<RequireActiveSubscription><Dashboard /></RequireActiveSubscription>} />
                          <Route path="meus-editais" element={<RequireActiveSubscription><Editais /></RequireActiveSubscription>} />
                          <Route path="estatisticas" element={<RequireActiveSubscription><Statistics /></RequireActiveSubscription>} />
                          <Route path="materias" element={<Navigate to="/ciclo-estudos" replace />} />
                          <Route path="materias/:subjectId" element={<Navigate to="/ciclo-estudos" replace />} />
                          <Route path="materias/:subjectId/topicos" element={<Navigate to="/ciclo-estudos" replace />} />
                          <Route path="topicos" element={<Navigate to="/ciclo-estudos" replace />} />
                          <Route path="subjects" element={<Navigate to="/ciclo-estudos" replace />} />
                          <Route path="revisoes" element={<RequireActiveSubscription><Revisoes /></RequireActiveSubscription>} />
                          <Route path="ciclo-estudos" element={<RequireActiveSubscription><Subjects /></RequireActiveSubscription>} />
                          <Route path="cadernos" element={<RequireActiveSubscription><Cadernos /></RequireActiveSubscription>} />

                          {/* Admin Routes - Protected */}
                          <Route element={<AdminRoute />}>
                            <Route path="admin/users" element={<UserManagement />} />
                            <Route path="admin/importancia-prova" element={<ImportanciaProvaAdmin />} />
                            <Route path="admin/subscription" element={<SubscriptionManagement />} />
                            <Route path="admin/security/roles" element={<RolesManagement />} />
                            <Route path="admin/audit" element={<AuditLogs />} />
                            <Route path="admin/system/errors" element={<SystemErrors />} />
                            <Route path="admin/feedback" element={<AdminFeedback />} />
                            <Route path="admin/editais" element={<AdminEditais />} />
                            <Route path="admin/debug/toasts" element={<ToastSpamTest />} />
                            <Route path="admin/pricing" element={<PlanCouponManager />} />
                            <Route path="admin/ai-settings" element={<AISettings />} />
                        </Route>

                          {/* Statistics Routes */}
                          <Route path="estatisticas/tendencia" element={<RequireActiveSubscription><TrendAnalysis /></RequireActiveSubscription>} />

                          <Route path="test-roles" element={<SimpleRoleTest />} />
                          <Route path="planos" element={<Planos />} />
                          <Route path="conta" element={<Account />} />
                          <Route path="perfil" element={<Navigate to="/conta?tab=perfil" replace />} />
                          <Route path="configuracoes" element={<Navigate to="/conta?tab=configuracoes" replace />} />
                          <Route path="reveal-cards" element={<RequireActiveSubscription><RevealCardDemo /></RequireActiveSubscription>} />

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
    </div >
  );
};

export default App;
