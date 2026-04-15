

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
import { StudentHubProvider } from "@/contexts/StudentHubContext";
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
import Editais from "@/pages/Editais";
import Planos from "@/pages/Planos";
import RevealCardDemo from "@/components/ui/RevealCardDemo";

import Questoes from "./pages/Questoes";
import QuestionsStatistics from "./pages/QuestionsStatistics";
import UserManagement from "@/pages/admin/UserManagement";
import ImportQuestions from "@/pages/admin/content/ImportQuestions";
import SubscriptionManagement from "@/pages/admin/SubscriptionManagement";
import SystemErrors from "@/pages/admin/system/SystemErrors";
import RolesManagement from "@/pages/admin/security/RolesManagement";
import AuditLogs from "@/pages/admin/AuditLogs";
import AdminFeedback from "@/pages/admin/AdminFeedback";
import ToastSpamTest from "@/pages/admin/debug/ToastSpamTest";
import TrendAnalysis from "@/pages/statistics/TrendAnalysis";
import TendenciaGUT from "@/pages/admin/TendenciaGUT";
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
                          <Route path="dashboard" element={<Dashboard />} />
                          <Route path="meus-editais" element={<Editais />} />
                          <Route path="materias" element={<Subjects />} />
                          <Route path="estatisticas" element={<Statistics />} />
                          <Route path="materias/:subjectId/topicos" element={<Topics />} />
                          <Route path="topicos" element={<Topics />} />
                          <Route path="revisoes" element={<Revisoes />} />
                          <Route path="ciclo-estudos" element={<StudyCycle />} />
                          <Route path="questoes" element={<Questoes />} />
                          <Route path="questoes/estatisticas" element={<QuestionsStatistics />} />

                          {/* Admin Routes - Protected */}
                          <Route element={<AdminRoute />}>
                            <Route path="admin/users" element={<UserManagement />} />
                            <Route path="admin/content/import" element={<ImportQuestions />} />
                            <Route path="admin/tendencia" element={<TendenciaGUT />} />
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
                          <Route path="estatisticas/tendencia" element={<TrendAnalysis />} />

                          <Route path="test-roles" element={<SimpleRoleTest />} />
                          <Route path="planos" element={<Planos />} />
                          <Route path="perfil" element={<Profile />} />
                          <Route path="configuracoes" element={<Settings />} />
                          <Route path="reveal-cards" element={<RevealCardDemo />} />

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
