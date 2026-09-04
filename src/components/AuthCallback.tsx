
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { exchangeAuthCode, getAuthSession, setAuthSession, signOutAuth, updateAuthPassword, verifyAuthOtp } from '@/services/authFlowService';
import { toastGate } from '@/lib/errors/toastGate';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { isEmailConfirmationPending } from '@/utils/authConfirmation';
import { completePendingSignupLegalAcceptance } from '@/features/billing/legal/signupLegalAcceptanceService';

const getConfirmEmailRedirect = (
  status: 'expired' | 'error' | 'unconfirmed',
  email?: string | null
) => {
  const params = new URLSearchParams({ status });
  const normalizedEmail = email?.trim();

  if (normalizedEmail) {
    params.set('email', normalizedEmail);
  }

  return `/confirm-email?${params.toString()}`;
};

const clearPendingConfirmationMarkers = () => {
  localStorage.removeItem('pendingConfirmationEmail');
  localStorage.removeItem('pendingConfirmationCooldownUntil');
};

export function AuthCallback() {
  const [loading, setLoading] = useState(true);
  const [redirectPath, setRedirectPath] = useState('/');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Verificar parâmetros da URL
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const error = urlParams.get('error');
        const errorCode = urlParams.get('error_code') || hashParams.get('error_code');
        const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
        const authCode = urlParams.get('code');
        const type = urlParams.get('type') || hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const pendingConfirmationEmail = localStorage.getItem('pendingConfirmationEmail')?.toLowerCase();

        // Recovery with a code is validated by ResetPassword, which owns the
        // recovery session and must not be treated as a normal login.
        if (type === 'recovery' && !authCode && !(accessToken && refreshToken)) {
          console.log('AuthCallback: Detectado fluxo de recuperação, redirecionando para /reset-password');
          setRedirectPath('/reset-password');
          setLoading(false);
          return;
        }

        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionError } = await setAuthSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError || !sessionData.session?.user) {
            await signOutAuth('local');
            setRedirectPath(getConfirmEmailRedirect('error', pendingConfirmationEmail));
            return;
          }

          if (type === 'recovery') {
            setRedirectPath('/reset-password');
            return;
          }

          const confirmedUserEmail = sessionData.session.user.email?.toLowerCase();
          const isSignupConfirmation = type === 'signup'
            || Boolean(pendingConfirmationEmail && confirmedUserEmail === pendingConfirmationEmail);

          if (isSignupConfirmation) {
            if (sessionData.session.user.email) {
              localStorage.setItem('confirmedEmail', sessionData.session.user.email);
            }
            clearPendingConfirmationMarkers();
            await signOutAuth();
            setRedirectPath('/login?confirmed=1');
          } else {
            await completePendingSignupLegalAcceptance();
            setRedirectPath('/dashboard');
          }
          return;
        }

        // Se há erro nos parâmetros, exibir e redirecionar
        if (error) {
          console.warn('AuthCallback: link de autenticação rejeitado:', error, errorCode);
          // Do not let a previous browser session survive an auth-link error.
          await signOutAuth();
          if (errorCode === 'otp_expired' || errorDescription?.toLowerCase().includes('expired')) {
            setRedirectPath(getConfirmEmailRedirect('expired', pendingConfirmationEmail));
          } else {
            setRedirectPath(getConfirmEmailRedirect('error', pendingConfirmationEmail));
          }
          return;
        }

        // O código do callback tem prioridade sobre qualquer sessão antiga no navegador.
        // Uma sessão existente poderia fazer o link de confirmação cair direto no dashboard.
        if (authCode) {
          if (type === 'recovery') {
            setRedirectPath('/reset-password');
            return;
          }

          const { data: exchangedSession, error: exchangeError } = await exchangeAuthCode(authCode);

          if (exchangeError) {
            const message = exchangeError.message.toLowerCase();
            if (exchangeError.code === 'otp_expired' || message.includes('expired') || message.includes('invalid')) {
              await signOutAuth();
              setRedirectPath(getConfirmEmailRedirect('expired', pendingConfirmationEmail));
            } else {
              await signOutAuth();
              toastGate.notifyError('Não foi possível concluir a confirmação. Tente reenviar o email.', 'AUTH-CALLBACK-02', { severity: 'low' });
              setRedirectPath(getConfirmEmailRedirect('error', pendingConfirmationEmail));
            }
            return;
          }

          if (exchangedSession.user && isEmailConfirmationPending(exchangedSession.user)) {
            localStorage.setItem('pendingConfirmationEmail', exchangedSession.user.email || '');
            await signOutAuth();
            setRedirectPath(getConfirmEmailRedirect('unconfirmed', exchangedSession.user.email));
            return;
          }

          if (exchangedSession.user?.email) {
            localStorage.setItem('confirmedEmail', exchangedSession.user.email);
          }
          const exchangedUserEmail = exchangedSession.user?.email?.toLowerCase();
          const isSignupConfirmation = type === 'signup'
            || Boolean(pendingConfirmationEmail && exchangedUserEmail === pendingConfirmationEmail);

          if (isSignupConfirmation) {
            clearPendingConfirmationMarkers();
            await signOutAuth();
            setRedirectPath('/login?confirmed=1');
          } else {
            await completePendingSignupLegalAcceptance();
            setRedirectPath('/dashboard');
          }
          return;
        }

        // Sem credenciais de callback, não transformar uma confirmação pendente
        // em acesso só porque havia sessão antiga no navegador. Alguns links
        // expirados/malformados podem voltar para o redirect_to sem parâmetros.
        if (pendingConfirmationEmail) {
          await signOutAuth();
          setRedirectPath(getConfirmEmailRedirect('expired', pendingConfirmationEmail));
          return;
        }

        // Sem código, preservar o comportamento normal de uma rota aberta diretamente.
        const { data: { session: existingSession } } = await getAuthSession();

        if (existingSession?.user && isEmailConfirmationPending(existingSession.user)) {
          localStorage.setItem('pendingConfirmationEmail', existingSession.user.email || '');
          await signOutAuth();
          setRedirectPath(getConfirmEmailRedirect('unconfirmed', existingSession.user.email));
          return;
        }

        if (existingSession) {
          await completePendingSignupLegalAcceptance();
          setRedirectPath('/dashboard');
          return;
        }

        setRedirectPath('/login');

      } catch (err: unknown) {
        console.error('AuthCallback: Erro não tratado:', err);
        await signOutAuth();
        toastGate.notifyError('Erro na autenticação', 'AUTH-CALLBACK-UNK', { severity: 'low' });
        setRedirectPath('/login');
      } finally {
        setLoading(false);

        // Limpar a URL
        if (window.location.search || window.location.hash) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };

    handleAuthCallback();
  }, []);

  if (loading) {
    return <LoadingSpinner size="large" message="Autenticando..." fullPage />;
  }

  return <Navigate to={redirectPath} replace />;
}
