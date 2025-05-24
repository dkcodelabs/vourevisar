import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  UserPlus
} from '@phosphor-icons/react';
import PageContainer from '@/components/layout/PageContainer';
import { GlassCard, GradientButton, AnimatedTitle } from '@/components/ui';

const Login = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        toast.success('Conta criada com sucesso! Verifique seu email.');
        setIsRegistering(false);
      } else {
        try {
          await signIn(email, password);
          navigate('/dashboard');
        } catch (error: any) {
          toast.error(error.message);
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer>
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="w-full max-w-md p-8">
          <AnimatedTitle 
            icon={isRegistering ? <UserPlus size={32} weight="duotone" /> : <SignIn size={32} weight="duotone" />}
            className="mb-8 text-center"
          >
            {isRegistering ? 'Criar Conta' : 'Entrar'}
          </AnimatedTitle>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <Envelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-app-blue focus:ring-2 focus:ring-app-blue/20 transition-all"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2 rounded-lg border border-gray-200 focus:border-app-blue focus:ring-2 focus:ring-app-blue/20 transition-all"
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

            <GradientButton
              type="submit"
              className="w-full"
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

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-sm text-app-blue hover:text-blue-700 transition-colors"
              >
                {isRegistering ? 'Já tem uma conta? Entre aqui' : 'Não tem uma conta? Registre-se'}
              </button>
            </div>
          </form>
        </GlassCard>
      </div>
    </PageContainer>
  );
};

export default Login;
