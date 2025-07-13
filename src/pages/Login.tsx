
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { 
  User, 
  Lock, 
  Envelope, 
  Eye, 
  EyeSlash,
  SignIn,
  UserPlus,
  Phone
} from '@phosphor-icons/react';
import PageContainer from '@/components/layout/PageContainer';
import { GlassCard, GradientButton, AnimatedTitle } from '@/components/ui';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, signInWithGoogle, resetPassword, user } = useAuth();
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

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || '/';
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
          // Reset form after successful signup
          setIsRegistering(false);
          setName('');
          setPhone('');
          setEmail('');
          setPassword('');
          setConfirmPassword('');
        }
      } else {
        const result = await signIn(email, password);
        if (result.success) {
          const from = location.state?.from?.pathname || '/';
          navigate(from, { replace: true });
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
        const from = location.state?.from?.pathname || '/';
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
        console.error('Forgot password error:', error);
        toast.error('Erro ao enviar email de recuperação');
        return;
      }
      
      toast.success('Se este email estiver cadastrado, você receberá um link para redefinir sua senha');
      setShowForgotPassword(false);
    } catch (error: any) {
      console.error('Forgot password error:', error);
      toast.error('Erro ao enviar email de recuperação');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer>
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="w-full max-w-md p-8">
          <AnimatedTitle 
            icon={isRegistering ? <UserPlus size={32} weight="duotone" /> : <SignIn size={32} weight="duotone" />}
            className="mb-8 text-center"
          >
            {isRegistering ? 'Criar Conta' : 'Entrar'}
          </AnimatedTitle>

          <form onSubmit={handleSubmit} className="space-y-6">
            {isRegistering && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm focus:border-app-blue focus:ring-2 focus:ring-app-blue/20 transition-all"
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Telefone (opcional)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm focus:border-app-blue focus:ring-2 focus:ring-app-blue/20 transition-all"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <div className="relative">
                <Envelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm focus:border-app-blue focus:ring-2 focus:ring-app-blue/20 transition-all"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm focus:border-app-blue focus:ring-2 focus:ring-app-blue/20 transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {isRegistering && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirmar Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm focus:border-app-blue focus:ring-2 focus:ring-app-blue/20 transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            )}

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
                 isRegistering ? 'Criar Conta' : 'Entrar'
               )}
             </GradientButton>

             {!isRegistering && !showForgotPassword && (
               <div className="text-center">
                 <button
                   type="button"
                   onClick={() => setShowForgotPassword(true)}
                   className="text-sm text-app-blue hover:text-blue-700 transition-colors"
                 >
                   Esqueci minha senha
                 </button>
               </div>
             )}

             {!isRegistering && !showForgotPassword && (
               <>
                 <div className="relative">
                   <div className="absolute inset-0 flex items-center">
                     <span className="w-full border-t border-gray-300 dark:border-gray-600" />
                   </div>
                   <div className="relative flex justify-center text-xs uppercase">
                     <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">Ou</span>
                   </div>
                 </div>

                 <button
                   type="button"
                   onClick={handleGoogleLogin}
                   disabled={isLoading}
                   className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm hover:bg-gray-50/70 dark:hover:bg-gray-700/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-app-blue transition-all"
                 >
                   <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                     <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                     <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                     <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                     <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                   </svg>
                   Continuar com Google
                 </button>
               </>
             )}

              {showForgotPassword ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    Clique no botão abaixo para receber um email de recuperação no endereço: <strong>{email}</strong>
                  </p>

                  <GradientButton
                    onClick={handleForgotPassword}
                    className="w-full py-3"
                    disabled={isLoading || !email}
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      'Enviar email de recuperação'
                    )}
                  </GradientButton>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(false)}
                      className="text-sm text-app-blue hover:text-blue-700 transition-colors"
                    >
                      Voltar ao login
                    </button>
                  </div>
                </div>
              ) : (
               <div className="text-center">
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
                   className="text-sm text-app-blue hover:text-blue-700 transition-colors"
                 >
                   {isRegistering ? 'Já tem uma conta? Entre aqui' : 'Não tem uma conta? Registre-se'}
                 </button>
               </div>
             )}
           </form>
        </GlassCard>
      </div>
    </PageContainer>
  );
};

export default Login;
