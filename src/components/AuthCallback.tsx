
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function AuthCallback() {
  const [loading, setLoading] = useState(true);
  const [redirectPath, setRedirectPath] = useState('/');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Processando callback de autenticação...');
        
        // Primeiro verificar se já há uma sessão ativa
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        if (existingSession) {
          console.log('Sessão já ativa encontrada, redirecionando...');
          toast.success('Login realizado com sucesso!');
          setRedirectPath('/');
          return;
        }

        // Verificar se há código de autorização nos parâmetros da URL
        const urlParams = new URLSearchParams(window.location.search);
        const authCode = urlParams.get('code');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        if (error) {
          console.error('Erro OAuth:', error, errorDescription);
          toast.error('Erro na autenticação: ' + (errorDescription || error));
          setRedirectPath('/login');
          return;
        }
        
        if (authCode) {
          console.log('Código de autorização encontrado, aguardando processamento automático...');
          
          // Aguardar um pouco para o Supabase processar automaticamente
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Verificar novamente se a sessão foi estabelecida
          const { data: { session: newSession } } = await supabase.auth.getSession();
          
          if (newSession) {
            console.log('Sessão estabelecida com sucesso');
            toast.success('Login realizado com sucesso!');
            setRedirectPath('/');
          } else {
            console.log('Sessão não estabelecida, redirecionando para login');
            toast.error('Erro na autenticação. Tente novamente.');
            setRedirectPath('/login');
          }
        } else {
          console.log('Nenhum código de autorização encontrado, redirecionando para login');
          setRedirectPath('/login');
        }
        
        // Limpar a URL removendo parâmetros de consulta
        if (window.location.search) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        
      } catch (err) {
        console.error('Erro no callback de autenticação:', err);
        toast.error('Erro na autenticação');
        setRedirectPath('/login');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Processando autenticação...</p>
        </div>
      </div>
    );
  }

  return <Navigate to={redirectPath} replace />;
}
