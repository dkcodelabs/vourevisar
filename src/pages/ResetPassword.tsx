import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import { GlassCard, GradientButton, AnimatedTitle } from '@/components/ui';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);

  useEffect(() => {
    const handleAuthRedirect = async () => {
      try {
        // Get URL params from current location
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const type = urlParams.get('type');
        const code = urlParams.get('code');
        const token_hash = urlParams.get('token_hash');

        console.log('Reset password check:', {
          hasToken: !!token,
          token_hash: !!token_hash,
          type,
          hasCode: !!code,
          url: window.location.href,
          search: window.location.search
        });

        // Check active session first (existing logic)
        const { data: currentSession } = await supabase.auth.getSession();
        if (currentSession?.session) {
          console.log('Active session found before checking recovery code. Skipping verification.');
          setIsValidToken(true);
          return;
        }

        // Handle OTP Token Hash (New Flow - Bypass PKCE)
        if (token_hash && type === 'recovery') {
          console.log('Token hash found, verifying OTP manually...');
          const { data, error } = await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash,
          });

          if (error) {
            console.error('Error verifying OTP:', error);
            toast.error('Link inválido ou expirado.');
            navigate('/login');
            return;
          }

          if (data.session) {
            console.log('OTP verified successfully, session established.');
            setIsValidToken(true);
            return; // Success!
          }
        }

        // Handle direct email link with token
        if (token && type === 'recovery') {
          console.log('Recovery token found, attempting to verify session');
          // Give some time for Supabase to process the token
          await new Promise(resolve => setTimeout(resolve, 1000));

          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

          if (sessionError) {
            console.error('Session error:', sessionError);
            toast.error('Link inválido ou expirado');
            navigate('/login');
            return;
          }

          if (sessionData.session) {
            console.log('Valid session found for recovery');
            setIsValidToken(true);
          } else {
            console.log('No session found, token may be invalid');
            toast.error('Link inválido ou expirado');
            navigate('/login');
            return;
          }
        }
        // Handle code-based redirect
        else if (code) {
          console.log('Recovery code found, exchanging for session');
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);

            if (error) {
              console.error('Error exchanging code:', error);
              toast.error('Link inválido ou expirado');
              navigate('/login');
              return;
            }

            if (data.session) {
              console.log('Successfully exchanged code for session');
              setIsValidToken(true);
            } else {
              console.error('No session returned from code exchange');

              // Fallback: Check if user is already logged in (Robust check)
              const { data: userData, error: userError } = await supabase.auth.getUser();
              if (userData?.user && !userError) {
                console.log('Using existing authenticated user as fallback');
                setIsValidToken(true);
              } else {
                toast.error('Link inválido ou expirado. Faça login novamente.');
                navigate('/login');
                return;
              }
            }
          } catch (error: any) {
            console.error('Error in code exchange:', error);

            // ERROR HANDLING WITH FALLBACK
            // Wait a moment for any state to settle
            await new Promise(resolve => setTimeout(resolve, 500));

            // Robust check using getUser() which verifies with server
            const { data: userData, error: userError } = await supabase.auth.getUser();

            if (userData?.user && !userError) {
              console.log('PKCE error occurred but active user session found. Allowing reset.');
              setIsValidToken(true);
              // Optional: You could show a specialized toast here if needed
              // toast.info("Sessão ativa detectada. Você pode redefinir sua senha.");
            } else {
              if (error.name === 'AuthPKCECodeVerifierMissingError') {
                // Detailed error for debugging/user info
                console.warn('PKCE Verifier Missing: Browser executing the link is different from the one that requested it.');
                toast.error('Por segurança, abra o link no mesmo navegador/dispositivo que solicitou.');
              } else {
                toast.error('Link inválido ou expirado.');
              }
              navigate('/login');
            }
            return;
          }
        }
        // Check for existing session
        else {
          const { data, error } = await supabase.auth.getSession();

          if (error) {
            console.error('Error getting session:', error);
            toast.error('Erro ao verificar sessão');
            navigate('/login');
            return;
          }

          if (data.session) {
            console.log('Existing session found');
            setIsValidToken(true);
          } else {
            console.log('No session or recovery parameters found');
            toast.error('Link inválido ou expirado');
            navigate('/login');
            return;
          }
        }
      } catch (error) {
        console.error('Error in auth redirect handler:', error);
        toast.error('Erro ao processar link de recuperação');
        navigate('/login');
      } finally {
        setIsCheckingToken(false);
      }
    };

    // Add a small delay to ensure the page has loaded
    const timer = setTimeout(handleAuthRedirect, 100);
    return () => clearTimeout(timer);
  }, [navigate]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsLoading(true);
    try {
      // Check if we have a valid session before updating password
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        console.error('No valid session found for password update');
        toast.error('Sessão expirada. Tente novamente com um novo link');
        navigate('/login');
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('Error updating password:', error);
        toast.error('Erro ao redefinir senha');
        return;
      }

      toast.success('Senha redefinida com sucesso!');
      // Redirect to dashboard after successful password reset
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('Erro ao redefinir senha');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingToken) {
    return (
      <PageContainer>
        <div className="min-h-screen flex items-center justify-center p-4">
          <GlassCard className="w-full max-w-md p-8 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-app-blue border-t-transparent rounded-full mx-auto mb-4"
            />
            <p className="text-gray-600 dark:text-gray-400">Validando link de recuperação...</p>
          </GlassCard>
        </div>
      </PageContainer>
    );
  }

  if (!isValidToken) {
    return null; // Component will redirect to login
  }

  return (
    <PageContainer>
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="w-full max-w-md p-8">
          <AnimatedTitle
            icon={<Lock size={32} />}
            className="mb-8 text-center"
          >
            Redefinir Senha
          </AnimatedTitle>

          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm focus:border-app-blue focus:ring-2 focus:ring-app-blue/20 transition-all"
                  placeholder="Digite sua nova senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirmar Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm focus:border-app-blue focus:ring-2 focus:ring-app-blue/20 transition-all"
                  placeholder="Confirme sua nova senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <GradientButton
              type="submit"
              className="w-full py-3"
              disabled={isLoading}
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                'Redefinir Senha'
              )}
            </GradientButton>
          </form>
        </GlassCard>
      </div>
    </PageContainer>
  );
};

export default ResetPassword;