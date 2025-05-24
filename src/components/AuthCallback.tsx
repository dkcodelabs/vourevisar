
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export function AuthCallback() {
  const [loading, setLoading] = useState(true);
  const [redirectPath, setRedirectPath] = useState('/');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Processing OAuth callback...');
        console.log('Current URL:', window.location.href);
        console.log('Hash:', window.location.hash);
        console.log('Search:', window.location.search);
        
        // Check if we have tokens in the URL (either hash or search params)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const searchParams = new URLSearchParams(window.location.search);
        
        const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
        
        console.log('Access token found:', !!accessToken);
        console.log('Refresh token found:', !!refreshToken);
        
        if (accessToken) {
          // Set the session using the tokens from URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });
          
          if (error) {
            console.error('Error setting session:', error);
            toast({
              title: 'Erro na autenticação',
              description: 'Não foi possível completar o login. Tente novamente.',
              variant: 'destructive'
            });
            setRedirectPath('/login');
          } else if (data.session) {
            console.log('Session established successfully');
            toast({
              title: 'Login realizado com sucesso!',
              description: 'Bem-vindo ao vouRevisar!',
            });
            setRedirectPath('/');
          }
        } else {
          // No tokens found, try to get existing session
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Error getting session:', error);
            setRedirectPath('/login');
          } else if (session) {
            console.log('Existing session found');
            setRedirectPath('/');
          } else {
            console.log('No session found, redirecting to login');
            setRedirectPath('/login');
          }
        }
        
        // Clean up the URL by removing hash parameters
        if (window.location.hash) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        
      } catch (err) {
        console.error('Error in auth callback:', err);
        toast({
          title: 'Erro na autenticação',
          description: 'Ocorreu um erro durante o processo de login.',
          variant: 'destructive'
        });
        setRedirectPath('/login');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-app-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Processando autenticação...</p>
        </div>
      </div>
    );
  }

  return <Navigate to={redirectPath} replace />;
}
