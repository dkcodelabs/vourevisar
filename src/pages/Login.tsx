import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { motion } from 'framer-motion';
import {
  User,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Phone,
  ArrowRight,
  UserPlus
} from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
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

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      let from = location.state?.from?.pathname || '/dashboard';
      // If redirecting to landing page (root), force dashboard instead
      if (from === '/') {
        from = '/dashboard';
      }
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isRegistering) {
        if (!name.trim()) {
          toast.error('Nome é obrigatório');
          return;
        }

        if (password !== confirmPassword) {
          toast.error('As senhas não coincidem');
          return;
        }

        if (password.length < 6) {
          toast.error('A senha deve ter pelo menos 6 caracteres');
          return;
        }

        const result = await signUp(email, password, name, phone);
        if (result.success) {
          // Store email for confirmation page
          localStorage.setItem('pendingConfirmationEmail', email);
          // Redirect to email confirmation page
          navigate('/confirm-email', { replace: true });
        }
      } else {
        if (!password) {
          toast.error('Informe sua senha para entrar.');
          setShakePassword(true);
          setTimeout(() => setShakePassword(false), 500);
          passwordInputRef.current?.focus();
          setIsLoading(false);
          return;
        }

        const result = await signIn(email, password);
        if (result.success) {
          let from = location.state?.from?.pathname || '/dashboard';
          // If redirecting to landing page (root), force dashboard instead
          if (from === '/') {
            from = '/dashboard';
          }
          navigate(from, { replace: true });
        } else {
          // Tratamento de erros específicos
          if (result.error?.includes('Invalid login credentials')) {
            toast.error('Email ou senha incorretos.');
          } else if (result.error?.includes('Email not confirmed')) {
            toast.error('Email não confirmado. Verifique sua caixa de entrada.');
          } else if (result.error?.includes('Too many requests') || result.error?.includes('rate limit')) {
            toast.error('Muitas tentativas. Tente novamente em alguns minutos.');
          } else {
            toast.error('Erro ao fazer login. Tente novamente.');
          }
        }
      }
    } catch (error: any) {
      console.error('Login/Signup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const result = await signInWithGoogle();
      if (result.success) {
        let from = location.state?.from?.pathname || '/dashboard';
        // If redirecting to landing page (root), force dashboard instead
        if (from === '/') {
          from = '/dashboard';
        }
        navigate(from, { replace: true });
      }
    } catch (error: any) {
      console.error('Google login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error('Por favor, insira seu email no campo acima');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Por favor, insira um email válido');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          toast.error('Email não confirmado. Verifique sua caixa de entrada primeiro.');
        } else if (error.message.includes('rate limit')) {
          toast.error('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
        } else if (error.message.includes('User not found')) {
          toast.success('Se este email estiver cadastrado, você receberá um link para redefinir sua senha.');
          setShowForgotPassword(false);
        } else {
          toast.error('Erro ao enviar email de recuperação. Tente novamente.');
        }
        return;
      }

      toast.success(
        'Email enviado! Verifique sua caixa de entrada (e spam) para redefinir sua senha.',
        { duration: 6000 }
      );
      setShowForgotPassword(false);
    } catch (error: any) {
      console.error('❌ Erro inesperado:', error);
      toast.error('Erro ao enviar email de recuperação. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[480px] bg-white rounded-3xl shadow-xl border border-slate-100 p-8 md:p-10 relative overflow-hidden">

        {/* Header com Logo e Título */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            {/* Ícone ou Logo Pequeno se necessário, mas o design pede título com ícone */}
            {isRegistering ? (
              <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center text-slate-900">
                <UserPlus size={24} />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center text-slate-900">
                <ArrowRight size={24} />
              </div>
            )}

            <h1 className="text-3xl font-bold">
              {showForgotPassword ? (
                <span className="text-brand-blue">Recuperar Senha</span>
              ) : isRegistering ? (
                <span className="text-brand-blue">Criar Conta</span>
              ) : (
                <span className="bg-gradient-to-r from-slate-900 to-brand-blue bg-clip-text text-transparent">Entrar</span>
              )}
            </h1>
          </div>

          {/* Logo Centralizada (Opcional, baseada no pedido do usuário) */}
          {/* O usuário pediu "colocar minha logo", então vamos adicionar */}
          <div className="flex justify-center mb-6">
            <img src="/logo.png" alt="vouRevisar" className="h-12 w-auto" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off" noValidate>
          {isRegistering && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 ml-1">Nome</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all text-slate-900 placeholder:text-slate-400 outline-none"
                    placeholder="Seu nome completo"
                    required
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 ml-1">Telefone (opcional)</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all text-slate-900 placeholder:text-slate-400 outline-none"
                    placeholder="(11) 99999-9999"
                    autoComplete="tel"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all text-slate-900 placeholder:text-slate-400 outline-none"
                placeholder="seu@email.com"
                required
                autoComplete="email"
                name="email"
                readOnly={!isRegistering} // Hack: prevent autofill on load
                onFocus={(e) => e.target.removeAttribute('readonly')}
              />
            </div>
          </div>

          {!showForgotPassword && (
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <motion.input
                  animate={shakePassword ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-12 pr-12 py-3.5 rounded-xl border ${shakePassword ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all text-slate-900 placeholder:text-slate-400 outline-none`}
                  placeholder="Digite sua senha"
                  required={!showForgotPassword}
                  autoComplete="current-password"
                  name="password"
                  readOnly={!isRegistering} // Hack: prevent autofill on load
                  onFocus={(e) => {
                    e.target.removeAttribute('readonly');
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          )}

          {isRegistering && (
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1">Confirmar Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all text-slate-900 placeholder:text-slate-400 outline-none"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          )}

          {!showForgotPassword && (
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-bold text-lg shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                isRegistering ? 'Criar Conta' : 'Entrar'
              )}
            </button>
          )}

          {!isRegistering && !showForgotPassword && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm font-medium text-brand-blue hover:text-blue-700 transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>
          )}

          {!isRegistering && !showForgotPassword && (
            <>
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-4 text-slate-400 font-medium tracking-wider">Ou</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-3.5 border border-slate-200 rounded-xl shadow-sm text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continuar com Google
              </button>
            </>
          )}

          {showForgotPassword ? (
            <div className="space-y-6 pt-2">
              <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 border border-blue-100">
                Digite seu email acima e clique no botão abaixo para receber um link de recuperação.
              </div>

              <button
                onClick={handleForgotPassword}
                className="w-full py-4 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-bold text-lg shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center"
                disabled={isLoading || !email}
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  'Enviar email de recuperação'
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Voltar ao login
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  // Reset form when switching modes
                  setName('');
                  setPhone('');
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="text-sm text-slate-600 hover:text-brand-blue transition-colors"
              >
                {isRegistering ? 'Já tem uma conta? ' : 'Não tem uma conta? '}
                <span className="font-bold text-brand-blue">{isRegistering ? 'Entre aqui' : 'Registre-se'}</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;