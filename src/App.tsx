
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import { ThemeProvider } from "@/hooks/useTheme";
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
import Revisoes from "@/pages/Revisoes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

const App = () => {
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Prevent default behavior that might cause page reloads
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <BrowserRouter>
            <AuthProvider>
              <AppProvider>
                <Toaster />
                <Sonner 
                  position="top-right"
                  toastOptions={{
                    classNames: {
                      toast: 'glass-card border-0 shadow-elevation-3',
                      title: 'font-semibold',
                      description: 'text-muted-foreground',
                      success: 'border-l-4 border-l-green-500',
                      error: 'border-l-4 border-l-red-500',
                      warning: 'border-l-4 border-l-yellow-500',
                      info: 'border-l-4 border-l-blue-500',
                    }
                  }}
                />
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  
                  <Route path="/*" element={<ProtectedRoute />}>
                    <Route path="" element={<AppLayout />}>
                      <Route index element={<Dashboard />} />
                      <Route path="materias" element={<Subjects />} />
                      <Route path="plano-estudos" element={<StudyPlan />} />
                      <Route path="estatisticas" element={<Statistics />} />
                      <Route path="topicos" element={<Topics />} />
                      <Route path="revisoes" element={<Revisoes />} />
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
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
