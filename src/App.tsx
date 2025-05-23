
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import { useEffect } from "react";
import Topics from "@/pages/Topics";

// Create the query client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevent refetching when window focus changes
      staleTime: 30000, // Data is fresh for 30 seconds
    },
  },
});

const App = () => {
  // This useEffect prevents the page from refreshing when the tab regains focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Do nothing - this prevents any default behavior that might cause page reloads
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Routes>
                {/* Rotas públicas */}
                <Route path="/login" element={<Login />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                
                {/* Rotas protegidas */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/materias" element={<Subjects />} />
                    <Route path="/plano-estudos" element={<StudyPlan />} />
                    <Route path="/estatisticas" element={<Statistics />} />
                    <Route path="/topicos" element={<Topics />} />
                    <Route path="/perfil" element={<Profile />} />
                    <Route path="/configuracoes" element={<Settings />} />
                  </Route>
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
