
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "@/pages/Dashboard";
import Subjects from "@/pages/Subjects";
import StudyPlan from "@/pages/StudyPlan";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import Statistics from "@/pages/Statistics";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import { AuthCallback } from "@/components/AuthCallback";
import Topics from "@/pages/Topics";
import Revisoes from "@/pages/Revisoes";
import RevisaoGeral from "@/pages/RevisaoGeral";
import Questoes from "@/pages/Questoes";
import { Toaster as ReactHotToastToaster } from 'react-hot-toast';
import { ProfileOnboardingGate } from "@/components/ProfileOnboardingGate";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppProvider>
              <Toaster />
              <Sonner />
              <ReactHotToastToaster />
              <ProfileOnboardingGate />
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/*" element={<ProtectedRoute />}>
                  <Route path="" element={<AppLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="materias" element={<Subjects />} />
                    <Route path="plano-estudos" element={<StudyPlan />} />
                    <Route path="estatisticas" element={<Statistics />} />
                    <Route path="materias/:subjectId/topicos" element={<Topics />} />
                    <Route path="topicos" element={<Topics />} />
                    <Route path="revisoes" element={<Revisoes />} />
                    <Route path="revisao-geral" element={<RevisaoGeral />} />
                    <Route path="questoes" element={<Questoes />} />
                    <Route path="perfil" element={<Profile />} />
                    <Route path="configuracoes" element={<Settings />} />
                  </Route>
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
