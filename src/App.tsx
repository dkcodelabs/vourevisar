
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "@/pages/Dashboard";
import Subjects from "@/pages/Subjects";
// StudyPlan removido - substituído por StudyCycle
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import Statistics from "@/pages/Statistics";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import { AuthCallback } from "@/components/AuthCallback";
import Topics from "@/pages/Topics";
import Revisoes from "@/pages/Revisoes";
import Questoes from "@/pages/Questoes";
import QuestionsStatistics from "@/pages/QuestionsStatistics";
import StudyCycle from "@/pages/StudyCycle";

import { ProfileOnboardingGate } from "@/components/ProfileOnboardingGate";
import { useBrowserCompatibility } from "@/hooks/useBrowserCompatibility";
import { FontDiagnostic } from "@/components/FontDiagnostic";

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
                <Sonner />
                <ProfileOnboardingGate />
                {process.env.NODE_ENV === 'development' && <FontDiagnostic />}
                <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/*" element={<ProtectedRoute />}>
                  <Route path="" element={<AppLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="materias" element={<Subjects />} />
                    {/* Plano de estudos removido - substituído por ciclo-estudos */}
                    <Route path="estatisticas" element={<Statistics />} />
                    <Route path="materias/:subjectId/topicos" element={<Topics />} />
                    <Route path="topicos" element={<Topics />} />
                    <Route path="revisoes" element={<Revisoes />} />
                    <Route path="questoes" element={<Questoes />} />
                    <Route path="questoes/estatisticas" element={<QuestionsStatistics />} />
                    <Route path="ciclo-estudos" element={<StudyCycle />} />
                    <Route path="perfil" element={<Profile />} />
                    <Route path="configuracoes" element={<Settings />} />
                  </Route>
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
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
