
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  
  // Se estiver carregando, exibe um indicador de carregamento
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-app-blue"></div>
      </div>
    );
  }
  
  // Se não houver usuário autenticado, redireciona para login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Se houver usuário autenticado, renderiza o conteúdo protegido
  return <Outlet />;
};
