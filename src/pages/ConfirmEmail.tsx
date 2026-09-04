import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCurrentAuthUser, resendConfirmationEmail } from '@/services/authFlowService';
import { toastGate } from '@/lib/errors/toastGate';
import { toast } from '@/lib/toast';
import { Mail, RefreshCw, ArrowLeft } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import { GlassCard, GradientButton } from '@/components/ui';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getAuthCallbackUrl } from '@/utils/authRedirect';
import { hasConfirmedEmail } from '@/utils/authConfirmation';

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
  const [resendFeedback, setResendFeedback] = useState<ResendFeedback | null>(null);
  const confirmationStatus = searchParams.get('status');
  const isAwaitingConfirmation = confirmationStatus === 'unconfirmed';
  const isLinkExpired = confirmationStatus === 'expired';
  const hasConfirmationError = confirmationStatus === 'expired' || confirmationStatus === 'error';

  useEffect(() => {
    // Get email from URL params or localStorage
    const emailParam = searchParams.get('email');
    const storedEmail = localStorage.getItem('pendingConfirmationEmail');
    const resolvedEmail = emailParam || storedEmail;

    if (emailParam) {
      setEmail(emailParam);
    } else if (storedEmail) {
      setEmail(storedEmail);
    }

    const confirmedEmail = localStorage.getItem('confirmedEmail')?.trim().toLowerCase();
    if (resolvedEmail && confirmedEmail === resolvedEmail.trim().toLowerCase()) {
      navigate('/login?confirmed=1', { replace: true });
      return;
    }

    const cooldownUntil = Number(localStorage.getItem('pendingConfirmationCooldownUntil') || 0);
    const remainingSeconds = Math.ceil((cooldownUntil - Date.now()) / 1000);
    if (remainingSeconds > 0) {
      setResendCooldown(remainingSeconds);
    } else {
      localStorage.removeItem('pendingConfirmationCooldownUntil');
    }
  }, [navigate, searchParams]);

  useEffect(() => {
    const handleConfirmationFromAnotherTab = (event: StorageEvent) => {
      const confirmedEmail = event.key === 'confirmedEmail' ? event.newValue?.trim().toLowerCase() : null;
      if (!confirmedEmail || !email || confirmedEmail !== email.trim().toLowerCase()) return;

      localStorage.removeItem('pendingConfirmationCooldownUntil');
      navigate('/login?confirmed=1', { replace: true });
    };

    window.addEventListener('storage', handleConfirmationFromAnotherTab);
    return () => window.removeEventListener('storage', handleConfirmationFromAnotherTab);
  }, [email, navigate]);

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
      // A confirmation opened in another tab can leave this screen mounted.
      // Check the local Supabase session before asking the provider to resend;
      // the provider may intentionally return a generic success for confirmed
      // emails to avoid revealing account state.
      const { data: userData, error: userError } = await getCurrentAuthUser();
      if (!userError && userData.user && hasConfirmedEmail(userData.user)) {
        localStorage.removeItem('pendingConfirmationCooldownUntil');
        setResendFeedback({
          tone: 'error',
          message: 'Este email já foi confirmado. Volte ao login e entre com sua senha.'
        });
        toastGate.notifyError('Este email já foi confirmado. Entre pelo login.', 'AUTH-ALREADY-CONFIRMED', { severity: 'low' });
        return;
      }

      const { error } = await resendConfirmationEmail(email, getAuthCallbackUrl());

      if (error) {
        const normalizedMessage = error.message.toLowerCase();

        if (error.status === 429) {
          setResendCooldown(60);
          localStorage.setItem('pendingConfirmationCooldownUntil', String(Date.now() + 60_000));
          setResendFeedback({
            tone: 'error',
            message: 'O serviço de email está temporariamente limitando novos envios. Aguarde cerca de 1 minuto antes de tentar novamente.'
          });
          toastGate.notifyError('O envio está temporariamente limitado. Aguarde um minuto.', 'AUTH-RATE-LIMIT', { severity: 'medium' });
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

      toast.success('Solicitação de confirmação aceita.');
      setResendFeedback({
        tone: 'success',
        message: 'Se a confirmação ainda estiver pendente, o email poderá chegar em alguns minutos. Verifique sua caixa de entrada, spam ou lixo eletrônico.'
      });
      setResendCooldown(60); // 60 second cooldown
      localStorage.setItem('pendingConfirmationCooldownUntil', String(Date.now() + 60_000));
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
              {isLinkExpired
                ? 'Link de confirmação expirado'
                : hasConfirmationError
                  ? 'Não foi possível confirmar seu email'
                  : isAwaitingConfirmation
                    ? 'Email ainda não confirmado'
                    : 'Verifique seu email'}
            </h1>
            <p className="text-content-muted">
              {isLinkExpired
                ? 'Este link não é mais válido. Solicite um novo email para confirmar seu cadastro.'
                : hasConfirmationError
                  ? 'O link não pôde ser concluído. Solicite um novo email e use o link mais recente.'
                  : isAwaitingConfirmation
                    ? 'Confirme seu cadastro pelo link enviado anteriormente. Se não encontrar o email, solicite um novo link.'
                    : 'Se este endereço precisar de confirmação, enviaremos um link para:'}
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
              {hasConfirmationError ? 'Como continuar:' : 'Próximos passos:'}
            </h3>
            <ol className="text-sm text-content-muted space-y-2 list-decimal list-inside">
              {hasConfirmationError || isAwaitingConfirmation ? (
                <>
                  <li>Clique em reenviar abaixo</li>
                  <li>Abra o email mais recente do vouRevisar</li>
                  <li>Clique em "Confirmar meu cadastro"</li>
                </>
              ) : (
                <>
                  <li>Aguarde alguns minutos e abra seu email</li>
                  <li>Se receber uma mensagem do vouRevisar, clique em "Confirmar meu cadastro"</li>
                  <li>Você será redirecionado automaticamente</li>
                </>
              )}
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
