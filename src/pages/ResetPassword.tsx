import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';
import { errorService } from '@/lib/errors/errorService';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import { GlassCard, GradientButton, AnimatedTitle } from '@/components/ui';
import { TracerLogo } from '@/components/ui/TracerLogo';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

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
          search: window.location.search,
          hash: window.location.hash
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
            toastGate.notifyError('Link inválido ou expirado.', 'AUTH-OTP-INV', { severity: 'low' });
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
            toastGate.notifyError('Link inválido ou expirado', 'AUTH-SESS-INV', { severity: 'low' });
            navigate('/login');
            return;
          }

          if (sessionData.session) {
            console.log('Valid session found for recovery');
            setIsValidToken(true);
          } else {
            console.log('No session found, token may be invalid');
            toastGate.notifyError('Link inválido ou expirado', 'AUTH-TOK-INV', { severity: 'low' });
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
              toastGate.notifyError('Link inválido ou expirado', 'AUTH-CODE-INV', { severity: 'low' });
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
                toastGate.notifyError('Link inválido ou expirado. Faça login novamente.', 'AUTH-LINK-EXP', { severity: 'low' });
                navigate('/login');
                return;
              }
            }
          } catch (error: unknown) {
            console.error('Error in code exchange:', error);
            const authError = error as { name?: string };

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
              if (authError.name === 'AuthPKCECodeVerifierMissingError') {
                // Detailed error for debugging/user info
                console.warn('PKCE Verifier Missing: Browser executing the link is different from the one that requested it.');
                toastGate.notifyError('Por segurança, abra o link no mesmo navegador/dispositivo que solicitou.', 'AUTH-PKCE-MIS', { severity: 'medium' });
              } else {
                toastGate.notifyError('Link inválido ou expirado.', 'AUTH-LINK-INV', { severity: 'low' });
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
            errorService.report(error, { module: 'auth', action: 'check_session', userMessage: "Erro ao verificar sessão" });
            navigate('/login');
            return;
          }

          if (data.session) {
            console.log('Existing session found');
            setIsValidToken(true);
          } else {
            console.log('No session or recovery parameters found');
            toastGate.notifyError('Link inválido ou expirado', 'AUTH-PARAM-MISS', { severity: 'low' });
            navigate('/login');
            return;
          }
        }
      } catch (error) {
        console.error('Error in auth redirect handler:', error);
        errorService.report(error, { module: 'auth', action: 'redirect_handler', userMessage: "Erro ao processar link de recuperação" });
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
      toastGate.notifyError('A senha deve ter pelo menos 6 caracteres', 'AUTH-PASS-LEN', { severity: 'low' });
      return;
    }

    if (password !== confirmPassword) {
      toastGate.notifyError('As senhas não coincidem', 'AUTH-PASS-MISMATCH', { severity: 'low' });
      return;
    }

    setIsLoading(true);
    try {
      // Check if we have a valid session before updating password
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        console.error('No valid session found for password update');
        toastGate.notifyError('Sessão expirada. Tente novamente com um novo link', 'AUTH-SESS-EXP', { severity: 'medium' });
        navigate('/login');
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('Error updating password:', error);
        errorService.report(error, { module: 'auth', action: 'update_password', userMessage: "Erro ao redefinir senha" });
        return;
      }

      toast.success('Senha redefinida com sucesso!');
      // Redirect to dashboard after successful password reset
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Reset password error:', error);
      errorService.report(error, { module: 'auth', action: 'reset_password_submit', userMessage: "Erro ao redefinir senha" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingToken) {
    return <LoadingSpinner size="large" message="Validando link..." fullPage />;
  }

  if (!isValidToken) {
    return null; // Component will redirect to login
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 sm:p-6 transition-colors duration-300 font-sans overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[400px] glass-card rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl bg-card border border-border dark:border-white/5 my-4"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-secondary dark:bg-white/5 rounded-xl flex items-center justify-center text-foreground">
            <Lock size={16} className="sm:size-[18px]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Redefinir Senha
          </h2>
        </div>

        {/* Logo Area */}
        <div className="flex flex-col items-center mb-4 sm:mb-6 w-full">
          <div className="w-full max-w-[160px] sm:max-w-[220px]">
            <TracerLogo />
          </div>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Nova Senha</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors sm:size-[18px]" size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-primary/5 border border-transparent focus:border-primary/30 rounded-xl sm:rounded-2xl py-3 sm:py-4 pl-11 sm:pl-12 pr-11 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/30"
                placeholder="No mínimo 6 caracteres"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff className="sm:size-[18px]" size={16} /> : <Eye className="sm:size-[18px]" size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors sm:size-[18px]" size={16} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-primary/5 border border-transparent focus:border-primary/30 rounded-xl sm:rounded-2xl py-3 sm:py-4 pl-11 sm:pl-12 pr-11 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/30"
                placeholder="Repita a nova senha"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="sm:size-[18px]" size={16} /> : <Eye className="sm:size-[18px]" size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 sm:py-4 rounded-xl sm:rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 mt-4"
          >
            {isLoading ? <LoadingSpinner size="small" /> : 'Redefinir Senha'}
          </button>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              Voltar ao login
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;