
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export function AuthCallback() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Process the OAuth callback
    const handleAuthCallback = async () => {
      try {
        setLoading(true);
        
        // Get the current URL hash
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
          // The hash contains tokens, process them
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error("Error processing OAuth callback:", error);
            setError('Falha na autenticação. Por favor, tente novamente.');
            toast({
              title: 'Erro na autenticação',
              description: 'Não foi possível completar o login. Por favor, tente novamente.',
              variant: 'destructive'
            });
          } else if (data.session) {
            // Successfully authenticated
            console.log("Authentication successful, session established");
            toast({
              title: 'Login bem-sucedido',
              description: 'Você foi autenticado com sucesso!',
            });
          }
        }
      } catch (err) {
        console.error("Error in auth callback:", err);
        setError('Erro ao processar autenticação');
        toast({
          title: 'Erro na autenticação',
          description: 'Ocorreu um erro ao processar sua autenticação.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, []);

  // Show loading indicator while processing
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-app-blue"></div>
        <p className="ml-2">Processando autenticação...</p>
      </div>
    );
  }

  // If there was an error, you could show an error message or redirect to login
  if (error) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to homepage after successful authentication
  return <Navigate to="/" replace />;
}
