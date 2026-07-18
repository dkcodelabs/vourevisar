import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toastGate } from '@/lib/errors/toastGate';
import { toast } from '@/lib/toast'; // Keep toast for success messages
import { motion } from 'framer-motion';
import { Mail, CheckCircle, RefreshCw, ArrowLeft } from 'lucide-react'; // Keep CheckCircle and ArrowLeft
import PageContainer from '@/components/layout/PageContainer';
import { GlassCard, GradientButton } from '@/components/ui';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { isEmailConfirmationPending } from '@/utils/authConfirmation';
import { getAuthCallbackUrl } from '@/utils/authRedirect';

type ResendFeedback = {
  tone: 'success' | 'error';
  message: string;
};

const ConfirmEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [resendFeedback, setResendFeedback] = useState<ResendFeedback | null>(null);
  const confirmationStatus = searchParams.get('status');
  const isLinkExpired = confirmationStatus === 'expired';
  const hasConfirmationError = confirmationStatus === 'expired' || confirmationStatus === 'error';

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

    const checkExistingSession = async () => {
      if (hasConfirmationError) return;

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) return;

      if (isEmailConfirmationPending(session.user)) {
        await supabase.auth.signOut();
        return;
      }

      setIsConfirmed(true);
      localStorage.removeItem('pendingConfirmationEmail');
      toast.success('Email confirmado com sucesso!');
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2000);
    };

    checkExistingSession();

    if (hasConfirmationError) return;

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user && !isEmailConfirmationPending(session.user)) {
        setIsConfirmed(true);
        localStorage.removeItem('pendingConfirmationEmail');
        toast.success('Email confirmado com sucesso!');
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 2000);
      }
    });

    return () => subscription.unsubscribe();
  }, [hasConfirmationError, navigate, searchParams]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    if (!email || resendCooldown > 0) return;

    setIsResending(true);
    setResendFeedback(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: getAuthCallbackUrl()
        }
      });

      if (error) {
        const normalizedMessage = error.message.toLowerCase();

        if (error.status === 429) {
          setResendFeedback({
            tone: 'error',
            message: 'Muitas tentativas. Aguarde alguns minutos antes de pedir outro email.'
          });
          toastGate.notifyError('Muitas tentativas. Aguarde alguns minutos.', 'AUTH-RATE-LIMIT', { severity: 'medium' });
        } else if (normalizedMessage.includes('already confirmed') || normalizedMessage.includes('already been confirmed')) {
          setResendFeedback({
            tone: 'error',
            message: 'Este email já foi confirmado. Volte ao login e entre com sua senha.'
          });
          toastGate.notifyError('Este email já foi confirmado. Entre pelo login.', 'AUTH-ALREADY-CONFIRMED', { severity: 'low' });
        } else {
          setResendFeedback({
            tone: 'error',
            message: 'Não foi possível reenviar agora. Aguarde um momento e tente novamente.'
          });
          toastGate.notifyError('Erro ao reenviar email. Tente novamente.', 'AUTH-RESEND-ERR', { severity: 'low' });
        }
        return;
      }

      toast.success('Email de confirmação reenviado!');
      setResendFeedback({
        tone: 'success',
        message: 'Novo email enviado. Use o link mais recente para confirmar seu cadastro.'
      });
      setResendCooldown(60); // 60 second cooldown
    } catch (error) {
      setResendFeedback({
        tone: 'error',
        message: 'Não foi possível reenviar agora. Aguarde um momento e tente novamente.'
      });
      toastGate.notifyError('Erro ao reenviar email.', 'AUTH-RESEND-UNK', { severity: 'medium' });
    } finally {
      setIsResending(false);
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
            <div className="flex flex-col items-center gap-4">
              <LoadingSpinner size="small" />
              <p className="text-sm font-bold text-muted-foreground tracking-widest uppercase animate-pulse">
                Redirecionando...
              </p>
            </div>
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
            <div className="w-20 h-20 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {isLinkExpired ? 'Link de confirmação expirado' : 'Verifique seu email'}
            </h1>
            <p className="text-content-muted">
              {isLinkExpired
                ? 'Este link não é mais válido. Solicite um novo email para confirmar seu cadastro.'
                : 'Enviamos um link de confirmação para:'}
            </p>
            {email && (
              <p className="font-semibold text-foreground mt-2">
                {email}
              </p>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-info/10 border border-info/20 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-foreground mb-2">
              Próximos passos:
            </h3>
            <ol className="text-sm text-content-muted space-y-2 list-decimal list-inside">
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
                  <LoadingSpinner size="xs" variant="minimal" className="mr-2" />
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

            {resendFeedback && (
              <div
                role="status"
                className={`rounded-lg border px-3 py-2 text-sm ${
                  resendFeedback.tone === 'success'
                    ? 'border-success/25 bg-success/10 text-success'
                    : 'border-destructive/25 bg-destructive/10 text-destructive'
                }`}
              >
                {resendFeedback.message}
                {resendFeedback.message.includes('Volte ao login') && (
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="ml-1 font-semibold underline underline-offset-2"
                  >
                    Ir para o login
                  </button>
                )}
              </div>
            )}

            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 flex items-center justify-center gap-2 text-content-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar ao login
            </button>
          </div>

          {/* Tips */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-sm text-content-muted text-center">
              Não encontrou o email? Verifique sua pasta de spam ou lixo eletrônico.
            </p>
          </div>
        </GlassCard>
      </div>
    </PageContainer>
  );
};

export default ConfirmEmail;
