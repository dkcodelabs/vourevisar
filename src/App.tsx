
import { lazy, Suspense } from "react";
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
import { AuthCallback } from "@/components/AuthCallback";
import { PremiumToastViewport } from "@/components/PremiumToastViewport";
import { shouldExposeDebugRoutes } from "@/utils/deploymentGuards";

import { useBrowserCompatibility } from "@/hooks/useBrowserCompatibility";

const exposeDebugRoutes = shouldExposeDebugRoutes(import.meta.env);

const LandingPage = lazy(() => import("@/pages/LandingPage"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Subjects = lazy(() => import("@/pages/Subjects"));
const Account = lazy(() => import("@/pages/Account"));
const Statistics = lazy(() => import("@/pages/Statistics"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Login = lazy(() => import("@/pages/Login"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const ConfirmEmail = lazy(() => import("@/pages/ConfirmEmail"));
const Revisoes = lazy(() => import("@/pages/Revisoes"));
const Editais = lazy(() => import("@/pages/Editais"));
const Cadernos = lazy(() => import("@/pages/Cadernos"));
const Planos = lazy(() => import("@/pages/Planos"));
const StripeCheckout = lazy(() => import("@/pages/StripeCheckout"));
const StripeCheckoutReturn = lazy(() => import("@/pages/StripeCheckoutReturn"));
const AccountSubscription = lazy(() => import("@/pages/AccountSubscription"));
const TermsOfUse = lazy(() => import("@/pages/TermsOfUse"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const CancellationRefundPolicy = lazy(() => import("@/pages/CancellationRefundPolicy"));
const Contact = lazy(() => import("@/pages/Contact"));
const UserManagement = lazy(() => import("@/pages/admin/UserManagement"));
const SubscriptionManagement = lazy(() => import("@/pages/admin/SubscriptionManagement"));
const SystemErrors = lazy(() => import("@/pages/admin/system/SystemErrors"));
const RolesManagement = lazy(() => import("@/pages/admin/security/RolesManagement"));
const AuditLogs = lazy(() => import("@/pages/admin/AuditLogs"));
const AdminFeedback = lazy(() => import("@/pages/admin/AdminFeedback"));
const TrendAnalysis = lazy(() => import("@/pages/statistics/TrendAnalysis"));
const ImportanciaProvaAdmin = lazy(() => import("@/pages/admin/TendenciaGUT"));
const AdminEditais = lazy(() => import("@/pages/admin/AdminEditais"));
const AffiliateReferralManagement = lazy(() => import("@/pages/admin/AffiliateReferralManagement"));
const AISettings = lazy(() => import("@/pages/admin/AISettings"));
const SimpleRoleTest = import.meta.env.DEV
  ? lazy(() => import("@/components/SimpleRoleTest").then(module => ({ default: module.SimpleRoleTest })))
  : null;
const ToastSpamTest = import.meta.env.DEV
  ? lazy(() => import("@/pages/admin/debug/ToastSpamTest"))
  : null;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

const PageFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background text-sm font-semibold text-content-muted">
    Carregando...
  </div>
);

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
                    <PremiumToastViewport />
                    <Suspense fallback={<PageFallback />}>
                      <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/confirm-email" element={<ConfirmEmail />} />
                        <Route path="/auth/callback" element={<AuthCallback />} />
                        <Route path="/termos" element={<TermsOfUse />} />
                        <Route path="/privacidade" element={<PrivacyPolicy />} />
                        <Route path="/cancelamento-e-reembolso" element={<CancellationRefundPolicy />} />
                        <Route path="/contato" element={<Contact />} />
                        <Route path="/*" element={<ProtectedRoute />}>
                          <Route path="checkout" element={<StripeCheckout />} />
                          <Route path="checkout/retorno" element={<StripeCheckoutReturn />} />
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
                              {exposeDebugRoutes && ToastSpamTest && (
                                <Route path="admin/debug/toasts" element={<ToastSpamTest />} />
                              )}
                              <Route path="admin/referrals" element={<AffiliateReferralManagement />} />
                              <Route path="admin/pricing" element={<Navigate to="/admin/referrals" replace />} />
                              <Route path="admin/ai-settings" element={<AISettings />} />
                            </Route>

                            {/* Statistics Routes */}
                            <Route path="estatisticas/tendencia" element={<RequireActiveSubscription><TrendAnalysis /></RequireActiveSubscription>} />

                            {exposeDebugRoutes && SimpleRoleTest && <Route path="test-roles" element={<SimpleRoleTest />} />}
                            <Route path="planos" element={<Planos />} />
                            <Route path="conta" element={<Account />} />
                            <Route path="conta/assinatura" element={<AccountSubscription />} />
                            <Route path="perfil" element={<Navigate to="/conta?tab=perfil" replace />} />
                            <Route path="configuracoes" element={<Navigate to="/conta?tab=configuracoes" replace />} />
                          </Route>
                        </Route>
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
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
