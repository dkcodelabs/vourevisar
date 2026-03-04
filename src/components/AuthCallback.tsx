
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toastGate } from '@/lib/errors/toastGate';
import { LoadingSpinner } from './ui/LoadingSpinner';

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
        const type = urlParams.get('type');

        // Se o tipo for recovery, redirecionar para a página de reset password
        if (type === 'recovery') {
          console.log('AuthCallback: Detectado fluxo de recuperação, redirecionando para /reset-password');
          setRedirectPath('/reset-password');
          setLoading(false);
          return;
        }

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

          toastGate.notifyError(errorMessage, 'AUTH-CALLBACK-01', { severity: 'low' });
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
          toastGate.notifyError('Erro na autenticação. Tente novamente.', 'AUTH-CALLBACK-02', { severity: 'low' });
          setRedirectPath('/login');
        } else {
          // Sem código de autorização
          setRedirectPath('/login');
        }

      } catch (err: unknown) {
        console.error('AuthCallback: Erro não tratado:', err);
        toastGate.notifyError('Erro na autenticação', 'AUTH-CALLBACK-UNK', { severity: 'low' });
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
    return <LoadingSpinner size="large" message="Autenticando..." fullPage />;
  }

  return <Navigate to={redirectPath} replace />;
}
