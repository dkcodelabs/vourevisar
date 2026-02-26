import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserLogger } from '@/hooks/useUserLogger';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toastManager } from '@/utils/toastManager';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  ArrowRight,
  UserPlus
} from 'lucide-react';
import { TracerLogo } from '@/components/ui/TracerLogo';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logEvent } = useUserLogger();
  const { signIn, signUp, signInWithGoogle, user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [shakePassword, setShakePassword] = useState(false);
  const passwordInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log('[DEBUG] Login.tsx: Montagem/Renderização. isLoading=', isLoading, ' user=', !!user);
    return () => console.log('[DEBUG] Login.tsx: Desmontando componente.');
  }, [isLoading, user]);

  // Redirect if already authenticated
  useEffect(() => {
    const checkUserAndRedirect = async () => {
      if (user) {
        // Security Check: Active Status before redirecting
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_active')
          .eq('id', user.id)
          .single();

        if (profile && profile.is_active === false) {
          // If inactive, ensure we are signed out and show error
          await supabase.auth.signOut();
          toastManager.error("Sua conta está desativada. Entre em contato com o suporte.", { id: 'account-deactivated' });
          setIsLoading(false);
          return;
        }

        // If we are here, user is active
        let from = location.state?.from?.pathname || '/dashboard';
        if (from === '/') {
          from = '/dashboard';
        }

        navigate(from, { replace: true });
      }
    };

    checkUserAndRedirect();
  }, [user, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isRegistering) {
        if (!name.trim()) {
          toastManager.error('Nome é obrigatório');
          setIsLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          toastManager.error('As senhas não coincidem');
          setIsLoading(false);
          return;
        }

        if (password.length < 6) {
          toastManager.error('A senha deve ter pelo menos 6 caracteres');
          setIsLoading(false);
          return;
        }

        const result = await signUp(email, password, name, phone);
        if (result.success) {
          localStorage.setItem('pendingConfirmationEmail', email);
          navigate('/confirm-email', { replace: true });
        } else {
          setIsLoading(false);
        }
      } else {
        if (!password) {
          toastManager.error('Informe sua senha para entrar.');
          setShakePassword(true);
          setTimeout(() => setShakePassword(false), 500);
          passwordInputRef.current?.focus();
          setIsLoading(false);
          return;
        }

        const result = await signIn(email, password);
        console.log('[DEBUG] Login.tsx: Resultado do signIn:', result);
        if (!result.success) {
          if (result.error?.includes('Invalid login credentials')) {
            toastManager.error('Email ou senha incorretos.');
          } else if (result.error?.includes('Email not confirmed')) {
            toastManager.error('Email não confirmado. Verifique sua caixa de entrada.');
          } else if (result.error?.includes('Too many requests') || result.error?.includes('rate limit')) {
            toastManager.error('Muitas tentativas. Tente novamente em alguns minutos.');
          } else {
            toastManager.error('Erro ao fazer login. Tente novamente.');
          }
        }
      }
    } catch (error) {
      console.error('Login/Signup error:', error);
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const result = await signInWithGoogle();
      if (result.success) {
        await logEvent('LOGIN', { method: 'google' });
        let from = location.state?.from?.pathname || '/dashboard';
        if (from === '/') {
          from = '/dashboard';
        }
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error('Google login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toastManager.error('Por favor, insira seu email no campo acima');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toastManager.error('Por favor, insira um email válido');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          toastManager.error('Email não confirmado. Verifique sua caixa de entrada primeiro.');
        } else if (error.message.includes('rate limit')) {
          toastManager.error('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
        } else if (error.message.includes('User not found')) {
          toastManager.success('Se este email estiver cadastrado, você receberá um link para redefinir sua senha.');
          setShowForgotPassword(false);
        } else {
          toastManager.error('Erro ao enviar email de recuperação. Tente novamente.');
        }
        return;
      }

      toastManager.success(
        'Email enviado! Verifique sua caixa de entrada (e spam) para redefinir sua senha.',
        { duration: 6000 }
      );
      setShowForgotPassword(false);
    } catch (error) {
      console.error('❌ Erro inesperado:', error);
      toastManager.error('Erro ao enviar email de recuperação. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen w-full flex items-start sm:items-center justify-center bg-background p-4 sm:p-6 transition-colors duration-300 font-sans overflow-y-auto pt-8 pb-8 sm:pt-4 sm:pb-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[400px] glass-card rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl bg-card border-white/5 my-4"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-3 sm:mb-6">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center text-foreground">
            {isRegistering ? <UserPlus size={14} className="sm:size-[18px]" /> : <ArrowRight size={14} className="sm:size-[18px]" />}
          </div>
          <h2 className="text-lg sm:text-2xl font-black text-foreground tracking-tight">
            {showForgotPassword ? 'Recuperar' : isRegistering ? 'Criar Conta' : 'Entrar'}
          </h2>
        </div>

        {/* Logo Area */}
        <div className="flex flex-col items-center mb-3 sm:mb-6 w-full">
          <div className="w-full max-w-[140px] sm:max-w-[220px]">
            <TracerLogo />
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <AnimatePresence mode="wait">
            {isRegistering && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 sm:space-y-4 overflow-hidden"
              >
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Nome</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors sm:size-[18px]" size={16} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-primary/5 border border-transparent focus:border-primary/30 rounded-xl sm:rounded-2xl py-3 sm:py-4 pl-11 sm:pl-12 pr-4 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/30"
                      placeholder="Seu nome completo"
                      required={isRegistering}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Telefone (opcional)</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors sm:size-[18px]" size={16} />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-primary/5 border border-transparent focus:border-primary/30 rounded-xl sm:rounded-2xl py-3 sm:py-4 pl-11 sm:pl-12 pr-4 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/30"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors sm:size-[18px]" size={16} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-primary/5 border border-transparent focus:border-primary/30 rounded-xl sm:rounded-2xl py-3 sm:py-4 pl-11 sm:pl-12 pr-4 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/30"
                placeholder="seu@email.com"
                required
              />
            </div>
          </div>

          {!showForgotPassword && (
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Senha</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors sm:size-[18px]" size={16} />
                <motion.input
                  animate={shakePassword ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-[#0F1115] border ${shakePassword ? 'border-red-500/50' : 'border-transparent'} focus:border-primary/30 rounded-xl sm:rounded-2xl py-3 sm:py-4 pl-11 sm:pl-12 pr-11 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/30 shadow-inner`}
                  placeholder="Digite sua senha"
                  required={!showForgotPassword}
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
          )}

          {isRegistering && (
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Confirmar Senha</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors sm:size-[18px]" size={16} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#0F1115] border border-transparent focus:border-primary/30 rounded-xl sm:rounded-2xl py-3 sm:py-4 pl-11 sm:pl-12 pr-11 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/30 shadow-inner"
                  placeholder="••••••••"
                  required
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
          )}

          <button
            type={showForgotPassword ? "button" : "submit"}
            onClick={showForgotPassword ? handleForgotPassword : undefined}
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 sm:py-4 rounded-xl sm:rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
          >
            {showForgotPassword ? 'Enviar Link' : isRegistering ? 'Criar Conta' : 'Entrar'}
          </button>

          {!isRegistering && !showForgotPassword && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm font-bold text-primary hover:underline transition-colors mt-2"
              >
                Esqueci minha senha
              </button>
            </div>
          )}

          {showForgotPassword && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors mt-2"
              >
                Voltar ao login
              </button>
            </div>
          )}

          {!isRegistering && !showForgotPassword && (
            <>
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-black/5 dark:border-white/5"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest">
                  <span className="bg-card px-4 text-muted-foreground">OU</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-foreground font-bold py-3.5 sm:py-4 rounded-xl sm:rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continuar com Google
              </button>
            </>
          )}

          {!showForgotPassword && (
            <div className="mt-6 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                {isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?'} {' '}
                <button
                  type="button"
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-primary font-bold hover:underline transition-colors"
                >
                  {isRegistering ? 'Entre aqui' : 'Registre-se'}
                </button>
              </p>
            </div>
          )}
        </form>
      </motion.div>
    </div>
  );
};

export default Login;