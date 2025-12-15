
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';

export function AuthCallback() {
  const [loading, setLoading] = useState(true);
  const [redirectPath, setRedirectPath] = useState('/');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Verificar parâmetros da URL
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        const authCode = urlParams.get('code');

        // Se há erro nos parâmetros, exibir e redirecionar
        if (error) {
          console.error('AuthCallback: Erro OAuth detectado:', error, errorDescription);
          let errorMessage = 'Erro na autenticação';

          if (error === 'access_denied') {
            errorMessage = 'Acesso negado pelo usuário';
          } else if (error === 'invalid_request') {
            errorMessage = 'Configuração OAuth inválida. Verifique as configurações no Google Cloud Console.';
          } else if (errorDescription) {
            errorMessage = errorDescription;
          }

          toast.error(errorMessage);
          setRedirectPath('/login');
          return;
        }

        // Verificar se já há uma sessão ativa
        const { data: { session: existingSession } } = await supabase.auth.getSession();

        if (existingSession) {
          setRedirectPath('/dashboard');
          return;
        }

        // Se há código de autorização, aguardar processamento automático do Supabase
        if (authCode) {
          // Aguardar processamento automático
          let attempts = 0;
          const maxAttempts = 10;

          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));

            const { data: { session: newSession } } = await supabase.auth.getSession();

            if (newSession) {
              setRedirectPath('/dashboard');
              return;
            }

            attempts++;
          }

          // Se não conseguiu estabelecer sessão após tentativas
          toast.error('Erro na autenticação. Tente novamente.');
          setRedirectPath('/login');
        } else {
          // Sem código de autorização
          setRedirectPath('/login');
        }

      } catch (err) {
        console.error('AuthCallback: Erro não tratado:', err);
        toast.error('Erro na autenticação');
        setRedirectPath('/login');
      } finally {
        setLoading(false);

        // Limpar a URL
        if (window.location.search) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };

    handleAuthCallback();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Processando autenticação...</p>
        </div>
      </div>
    );
  }

  return <Navigate to={redirectPath} replace />;
}
