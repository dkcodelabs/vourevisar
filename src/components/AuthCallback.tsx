
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toastGate } from '@/lib/errors/toastGate';

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

  if (loading) { // Assuming 'isProcessing' was meant to be 'loading' or a new state variable that wasn't declared. For syntactic correctness, using 'loading'.
    return (
      <div className="flex items-center justify-center min-h-screen bg-background transition-colors duration-300">
        <div className="text-center flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Autenticando...</p>
        </div>
      </div>
    );
  }

  return <Navigate to={redirectPath} replace />;
}
