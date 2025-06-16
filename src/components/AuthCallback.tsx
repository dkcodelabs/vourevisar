
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
        console.log('URL atual:', window.location.href);
        console.log('Hash:', window.location.hash);
        console.log('Search:', window.location.search);
        
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
          console.log('Código de autorização encontrado, trocando por sessão...');
          
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
          
          if (exchangeError) {
            console.error('Erro ao trocar código por sessão:', exchangeError);
            toast.error('Erro na autenticação. Tente novamente.');
            setRedirectPath('/login');
          } else if (data.session) {
            console.log('Sessão estabelecida com sucesso');
            toast.success('Login realizado com sucesso!');
            setRedirectPath('/');
          }
        } else {
          // Verificar se há tokens na URL (hash ou parâmetros de busca)
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const searchParams = new URLSearchParams(window.location.search);
          
          const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
          
          console.log('Access token encontrado:', !!accessToken);
          console.log('Refresh token encontrado:', !!refreshToken);
          
          if (accessToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            });
            
            if (error) {
              console.error('Erro ao definir sessão:', error);
              toast.error('Erro na autenticação. Tente novamente.');
              setRedirectPath('/login');
            } else if (data.session) {
              console.log('Sessão estabelecida com sucesso');
              toast.success('Login realizado com sucesso!');
              setRedirectPath('/');
            }
          } else {
            // Tentar obter sessão existente
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
              console.error('Erro ao obter sessão:', error);
              setRedirectPath('/login');
            } else if (session) {
              console.log('Sessão existente encontrada');
              toast.success('Login realizado com sucesso!');
              setRedirectPath('/');
            } else {
              console.log('Nenhuma sessão encontrada, redirecionando para login');
              setRedirectPath('/login');
            }
          }
        }
        
        // Limpar a URL removendo parâmetros de consulta e hash
        if (window.location.search || window.location.hash) {
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
