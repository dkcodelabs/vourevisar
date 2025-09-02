
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
        
        // Verificar parâmetros da URL
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        const authCode = urlParams.get('code');
        
        console.log('Parâmetros da URL:', { error, errorDescription, authCode });
        
        // Se há erro nos parâmetros, exibir e redirecionar
        if (error) {
          console.error('Erro OAuth:', error, errorDescription);
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
          console.log('Sessão já ativa encontrada');
          toast.success('Login realizado com sucesso!');
          setRedirectPath('/');
          return;
        }

        // Se há código de autorização, aguardar processamento automático do Supabase
        if (authCode) {
          console.log('Código de autorização encontrado, aguardando processamento...');
          
          // Aguardar processamento automático
          let attempts = 0;
          const maxAttempts = 10;
          
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const { data: { session: newSession } } = await supabase.auth.getSession();
            
            if (newSession) {
              console.log('Sessão estabelecida com sucesso');
              toast.success('Login realizado com sucesso!');
              setRedirectPath('/');
              return;
            }
            
            attempts++;
          }
          
          // Se não conseguiu estabelecer sessão após tentativas
          console.log('Não foi possível estabelecer sessão');
          toast.error('Erro na autenticação. Tente novamente.');
          setRedirectPath('/login');
        } else {
          // Sem código de autorização
          console.log('Nenhum código de autorização encontrado');
          setRedirectPath('/login');
        }
        
      } catch (err) {
        console.error('Erro no callback de autenticação:', err);
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
