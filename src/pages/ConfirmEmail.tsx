import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toastGate } from '@/lib/errors/toastGate';
import { toast } from '@/lib/toast'; // Keep toast for success messages
import { motion } from 'framer-motion';
import { Mail, CheckCircle, RefreshCw, ArrowLeft } from 'lucide-react'; // Keep CheckCircle and ArrowLeft
import PageContainer from '@/components/layout/PageContainer';
import { GlassCard, GradientButton } from '@/components/ui';

const ConfirmEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Changed from isResending to isLoading
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    // Get email from URL params or localStorage
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else {
      const storedEmail = localStorage.getItem('pendingConfirmationEmail');
      if (storedEmail) {
        setEmail(storedEmail);
      }
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        setIsConfirmed(true);
        localStorage.removeItem('pendingConfirmationEmail');
        toast.success('Email confirmado com sucesso!');
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 2000);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, searchParams]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    if (!email || resendCooldown > 0) return;

    setIsLoading(true); // Use isLoading
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin} /auth/callback`
        }
      });

      if (error) {
        if (error.status === 429) { // Check for status code 429 for rate limit
          toastGate.notifyError('Muitas tentativas. Aguarde alguns minutos.', 'AUTH-RATE-LIMIT', { severity: 'medium' });
        } else {
          toastGate.notifyError('Erro ao reenviar email. Tente novamente.', 'AUTH-RESEND-ERR', { severity: 'low' });
        }
        return;
      }

      toast.success('Email de confirmação reenviado!');
      setResendCooldown(60); // 60 second cooldown
    } catch (error) {
      toastGate.notifyError('Erro ao reenviar email.', 'AUTH-RESEND-UNK', { severity: 'medium' });
    } finally {
      setIsLoading(false); // Use isLoading
    }
  };

  if (isConfirmed) {
    return (
      <PageContainer>
        <div className="min-h-screen flex items-center justify-center p-4">
          <GlassCard className="w-full max-w-md p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-10 h-10 text-green-600" />
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Email Confirmado! 🎉
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Redirecionando para o dashboard...
            </p>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full mx-auto"
            />
          </GlassCard>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="w-full max-w-md p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-brand-blue" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Verifique seu email
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Enviamos um link de confirmação para:
            </p>
            {email && (
              <p className="font-semibold text-gray-900 dark:text-white mt-2">
                {email}
              </p>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Próximos passos:
            </h3>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-decimal list-inside">
              <li>Abra seu email</li>
              <li>Procure por um email do vouRevisar</li>
              <li>Clique no botão "Confirmar meu cadastro"</li>
              <li>Você será redirecionado automaticamente</li>
            </ol>
          </div>

          {/* Resend Button */}
          <div className="space-y-4">
            <GradientButton
              onClick={handleResendEmail}
              disabled={isResending || resendCooldown > 0 || !email}
              className="w-full py-3 flex items-center justify-center gap-2"
            >
              {isResending ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                  Enviando...
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Reenviar em {resendCooldown}s
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Reenviar email de confirmação
                </>
              )}
            </GradientButton>

            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar ao login
            </button>
          </div>

          {/* Tips */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Não encontrou o email? Verifique sua pasta de spam ou lixo eletrônico.
            </p>
          </div>
        </GlassCard>
      </div>
    </PageContainer>
  );
};

export default ConfirmEmail;
