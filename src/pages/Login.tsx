import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useUserLogger } from "@/hooks/useUserLogger";
import { useAuth } from "@/contexts/AuthContext";
import { requestPasswordReset, signOutAuth } from "@/services/authFlowService";
import { toastManager } from "@/utils/toastManager";
import {
  isEmailConfirmationPending,
  isExpectedPasswordSignInError,
} from "@/utils/authConfirmation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  ArrowRight,
  UserPlus,
  CheckCircle,
} from "lucide-react";
import { GoogleAccess } from "@/components/marketing/GoogleAccess";
import { AuthShell } from "@/components/marketing/AuthShell";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getSupportEmailUrl } from "@/config/support";
import { getPostAuthRedirect } from "@/utils/authRedirect";
import {
  isBillingContractAcceptanceEnabled,
  signupLegalAcceptance,
} from "@/features/billing/legal/billingLegalDocuments";

const legalAcceptanceEnabled = isBillingContractAcceptanceEnabled();

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logEvent } = useUserLogger();
  const {
    signIn,
    signUp,
    signInWithGoogle,
    user,
    loading: authLoading,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isRegistering =
    new URLSearchParams(location.search).get("mode") === "register";
  const setIsRegistering = (register: boolean) => {
    const query = new URLSearchParams(location.search);
    if (register) query.set("mode", "register");
    else query.delete("mode");
    navigate(
      { pathname: "/login", search: query.toString() },
      { replace: true, state: location.state },
    );
  };
  const [hasAcceptedLegalDocuments, setHasAcceptedLegalDocuments] =
    useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [shakePassword, setShakePassword] = useState(false);
  const passwordInputRef = React.useRef<HTMLInputElement>(null);
  const emailConfirmed =
    new URLSearchParams(location.search).get("confirmed") === "1";
  const supportEmailUrl = getSupportEmailUrl("Ajuda para acessar o vouRevisar");

  useEffect(() => {
    const confirmedEmail = localStorage.getItem("confirmedEmail");
    if (emailConfirmed && confirmedEmail) {
      setEmail(confirmedEmail);
    }
  }, [emailConfirmed]);

  // Redirect if already authenticated
  useEffect(() => {
    const checkUserAndRedirect = async () => {
      if (user) {
        if (isEmailConfirmationPending(user)) {
          localStorage.setItem("pendingConfirmationEmail", user.email || "");
          await signOutAuth();
          toastManager.error(
            "Email não confirmado. Verifique sua caixa de entrada.",
          );
          navigate("/confirm-email", { replace: true });
          return;
        }

        // If we are here, user is active
        const from = getPostAuthRedirect(
          location.state?.from,
          new URLSearchParams(location.search).get("redirect"),
        );

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
          toastManager.error("Nome é obrigatório");
          setIsLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          toastManager.error("As senhas não coincidem");
          setIsLoading(false);
          return;
        }

        if (password.length < 6) {
          toastManager.error("A senha deve ter pelo menos 6 caracteres");
          setIsLoading(false);
          return;
        }

        if (legalAcceptanceEnabled && !hasAcceptedLegalDocuments) {
          toastManager.error(
            "Confirme os Termos de Uso e a Política de Privacidade para criar sua conta.",
          );
          setIsLoading(false);
          return;
        }

        const result = await signUp(
          email.trim(),
          password,
          name,
          phone,
          legalAcceptanceEnabled ? signupLegalAcceptance : undefined,
        );
        if (result.success) {
          localStorage.setItem("pendingConfirmationEmail", email.trim());
          navigate("/confirm-email", { replace: true });
        } else {
          setIsLoading(false);
        }
      } else {
        if (!password) {
          toastManager.error("Informe sua senha para entrar.");
          setShakePassword(true);
          setTimeout(() => setShakePassword(false), 500);
          passwordInputRef.current?.focus();
          setIsLoading(false);
          return;
        }

        // Do not race authentication against a local timeout. Promise.race would
        // leave signIn running after the UI showed an error, allowing a late
        // response to create a session and record an access unexpectedly.
        const result = await signIn(email.trim(), password);

        if (!result.success) {
          if (result.error?.includes("Invalid login credentials")) {
            toastManager.error("Email ou senha incorretos.");
          } else if (result.error?.includes("Email not confirmed")) {
            toastManager.error(
              "Email não confirmado. Verifique sua caixa de entrada.",
            );
            navigate(
              `/confirm-email?status=unconfirmed&email=${encodeURIComponent(email.trim())}`,
              { replace: true },
            );
          } else if (
            result.error?.includes("Too many requests") ||
            result.error?.includes("rate limit")
          ) {
            toastManager.error(
              "Muitas tentativas. Tente novamente em alguns minutos.",
            );
          } else if (
            result.error?.includes("FetchError") ||
            result.error?.includes("AbortError") ||
            result.error?.includes("Failed to fetch")
          ) {
            toastManager.error(
              "Erro de conexão. Verifique sua internet ou tente novamente mais tarde.",
            );
          } else {
            toastManager.error("Erro ao fazer login. Tente novamente.");
          }
          setIsLoading(false);
        } else {
          // Keep this marker available long enough for an older confirmation
          // tab to redirect, then consume it after the login is accepted.
          localStorage.removeItem("confirmedEmail");
          localStorage.removeItem("pendingConfirmationEmail");
          localStorage.removeItem("pendingConfirmationCooldownUntil");
          setIsLoading(false);
        }
      }
    } catch (error: unknown) {
      if (!isExpectedPasswordSignInError(error)) {
        console.error("Login/Signup error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : "";
      if (
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("AuthRetryableFetchError")
      ) {
        toastManager.error(
          "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.",
        );
      } else {
        toastManager.error("Ocorreu um erro inesperado. Tente novamente.");
      }
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const result = await signInWithGoogle();
      if (result.success) {
        await logEvent("LOGIN", { method: "google" });
        const from = getPostAuthRedirect(
          location.state?.from,
          new URLSearchParams(location.search).get("redirect"),
        );
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error("Google login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toastManager.error("Por favor, insira seu email no campo acima");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toastManager.error("Por favor, insira um email válido");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await requestPasswordReset(
        email.trim(),
        `${window.location.origin}/reset-password`,
      );

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          toastManager.error(
            "Email não confirmado. Verifique sua caixa de entrada primeiro.",
          );
        } else if (error.message.includes("rate limit")) {
          toastManager.error(
            "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
          );
        } else if (error.message.includes("User not found")) {
          toastManager.success(
            "Se esta conta usar email e senha, enviaremos as instruções. Se você entra com Google, continue pelo botão do Google.",
          );
          setShowForgotPassword(false);
        } else {
          toastManager.error(
            "Erro ao enviar email de recuperação. Tente novamente.",
          );
        }
        return;
      }

      toastManager.success(
        "Se esta conta usar email e senha, enviaremos as instruções. Se você entra com Google, continue pelo botão do Google.",
        { duration: 6000 },
      );
      setShowForgotPassword(false);
    } catch (error) {
      console.error("❌ Erro inesperado:", error);
      toastManager.error(
        "Erro ao enviar email de recuperação. Tente novamente mais tarde.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Do not expose the empty login form while Supabase is restoring a persisted
  // session or while a successful password sign-in is validating the profile.
  if (authLoading && !user) {
    return (
      <AuthShell>
        <LoadingSpinner size="large" />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <motion.div
        initial={false}
        className="w-full [&_input:not([type=checkbox])]:bg-slate-50 [&_input:not([type=checkbox])]:border-slate-200 [&_input:not([type=checkbox])]:rounded-xl [&_input:not([type=checkbox])]:shadow-none [&_input:not([type=checkbox])]:py-3 [&_input]:placeholder:text-slate-400 [&_label]:normal-case [&_label]:tracking-normal [&_label]:text-xs [&_label]:text-slate-600 [&_input:focus-visible]:ring-2 [&_input:focus-visible]:ring-blue-500"
      >
        <div className="mb-7">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-foreground sm:size-10">
            {isRegistering ? (
              <UserPlus size={14} className="sm:size-[18px]" />
            ) : (
              <ArrowRight size={14} className="sm:size-[18px]" />
            )}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-black tracking-tight text-foreground sm:text-2xl">
                {showForgotPassword
                  ? "Recupere seu acesso"
                  : isRegistering
                    ? "Comece seu próximo passo."
                    : "Bom ter você de volta."}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {showForgotPassword
                  ? "Informe seu email para receber o link de recuperação."
                  : isRegistering
                    ? "Crie sua conta e conheça sua central de progresso. 7 dias grátis, sem cartão."
                    : "Sua rotina de estudos espera por você."}
              </p>
            </div>
          </div>
          {emailConfirmed && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-success/25 bg-success/10 p-3 text-sm text-foreground">
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              <p>
                <strong>Email confirmado.</strong> Agora entre com sua senha para
                acessar o vouRevisar.
              </p>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!showForgotPassword && (
            <GoogleAccess onClick={handleGoogleLogin} isLoading={isLoading} />
          )}
          <AnimatePresence mode="wait">
            {isRegistering && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 sm:space-y-4 overflow-hidden"
              >
                <div className="space-y-1.5 sm:space-y-2">
                  <label
                    htmlFor="signup-name"
                    className="text-xs font-semibold text-slate-600"
                  >
                    Nome
                  </label>
                  <div className="relative group">
                    <User
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors sm:size-[18px]"
                      size={16}
                    />
                    <input
                      id="signup-name"
                      autoComplete="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-secondary/50 border border-transparent focus:border-primary/30 rounded-xl sm:rounded-2xl py-3 sm:py-4 pl-11 sm:pl-12 pr-4 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/30 shadow-inner"
                      placeholder="Seu nome completo"
                      required={isRegistering}
                    />
                  </div>
                </div>

                <details className="space-y-2">
                  <summary className="cursor-pointer py-1 text-xs font-medium text-slate-500">
                    Adicionar telefone (opcional)
                  </summary>
                  <label
                    htmlFor="signup-phone"
                    className="text-xs font-semibold text-slate-600"
                  >
                    Telefone (opcional)
                  </label>
                  <div className="relative group">
                    <Phone
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors sm:size-[18px]"
                      size={16}
                    />
                    <input
                      id="signup-phone"
                      autoComplete="tel"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-secondary/50 border border-transparent focus:border-primary/30 rounded-xl sm:rounded-2xl py-3 sm:py-4 pl-11 sm:pl-12 pr-4 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/30 shadow-inner"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </details>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1.5 sm:space-y-2">
            <label
              htmlFor="login-email"
              className="text-xs font-semibold text-slate-600"
            >
              Email
            </label>
            <div className="relative group">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors sm:size-[18px]"
                size={16}
              />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                className="w-full bg-primary/5 border border-transparent focus:border-primary/30 rounded-xl sm:rounded-2xl py-3 sm:py-4 pl-11 sm:pl-12 pr-4 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/30"
                placeholder="seu@email.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          {showForgotPassword && (
            <p className="rounded-xl border border-border/60 bg-secondary/30 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              A recuperação de senha é para contas que entram com email e senha.
              Se você usa Google, continue pelo Google abaixo.
            </p>
          )}

          {!showForgotPassword && (
            <div className="space-y-1.5 sm:space-y-2">
              <label
                htmlFor="login-password"
                className="text-xs font-semibold text-slate-600"
              >
                Senha
              </label>
              <div className="relative group">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors sm:size-[18px]"
                  size={16}
                />
                <motion.input
                  animate={shakePassword ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  ref={passwordInputRef}
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-secondary/50 border ${shakePassword ? "border-red-500/50" : "border-transparent"} focus:border-primary/30 rounded-xl sm:rounded-2xl py-3 sm:py-4 pl-11 sm:pl-12 pr-11 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/30 shadow-inner`}
                  placeholder="Digite sua senha"
                  required={!showForgotPassword}
                  autoComplete={
                    isRegistering ? "new-password" : "current-password"
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="sm:size-[18px]" size={16} />
                  ) : (
                    <Eye className="sm:size-[18px]" size={16} />
                  )}
                </button>
              </div>
            </div>
          )}

          {isRegistering && (
            <div className="space-y-3">
              {legalAcceptanceEnabled && (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-secondary/30 p-3 text-xs font-semibold leading-5 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={hasAcceptedLegalDocuments}
                    onChange={(event) =>
                      setHasAcceptedLegalDocuments(event.target.checked)
                    }
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span>
                    Li e concordo com os{" "}
                    <Link
                      to="/termos"
                      className="font-bold text-primary underline"
                    >
                      Termos de Uso
                    </Link>{" "}
                    e a{" "}
                    <Link
                      to="/privacidade"
                      className="font-bold text-primary underline"
                    >
                      Política de Privacidade
                    </Link>
                    . Entendo que receberei 7 dias grátis, sem cartão e sem
                    cobrança automática.
                  </span>
                </label>
              )}
              <div className="space-y-1.5 sm:space-y-2">
                <label
                  htmlFor="signup-confirm"
                  className="text-xs font-semibold text-slate-600"
                >
                  Confirmar senha
                </label>
                <div className="relative group">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors sm:size-[18px]"
                    size={16}
                  />
                  <input
                    id="signup-confirm"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#0F1115] border border-transparent focus:border-primary/30 rounded-xl sm:rounded-2xl py-3 sm:py-4 pl-11 sm:pl-12 pr-11 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/30 shadow-inner"
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={
                      showConfirmPassword
                        ? "Ocultar confirmação de senha"
                        : "Mostrar confirmação de senha"
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="sm:size-[18px]" size={16} />
                    ) : (
                      <Eye className="sm:size-[18px]" size={16} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            type={showForgotPassword ? "button" : "submit"}
            onClick={showForgotPassword ? handleForgotPassword : undefined}
            disabled={
              isLoading ||
              (isRegistering &&
                legalAcceptanceEnabled &&
                !hasAcceptedLegalDocuments)
            }
            className="w-full bg-[#1765dc] hover:bg-[#1254bd] text-white font-bold py-3.5 sm:py-4 rounded-xl shadow-lg shadow-blue-600/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
          >
            {isLoading ? (
              <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin block" />
            ) : showForgotPassword ? (
              "Enviar Link"
            ) : isRegistering ? (
              "Criar Conta"
            ) : (
              "Entrar"
            )}
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

          {!showForgotPassword && (
            <div className="mt-6 text-center space-y-4">
              <p className="text-sm font-medium text-muted-foreground">
                {isRegistering ? "Já tem uma conta?" : "Não tem uma conta?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setHasAcceptedLegalDocuments(false);
                  }}
                  className="text-primary font-bold hover:underline transition-colors"
                >
                  {isRegistering ? "Entre aqui" : "Registre-se"}
                </button>
              </p>

              {!isRegistering && (
                <div className="mt-6 pt-4 border-t border-border dark:border-white/5 flex flex-col items-center gap-3">
                  <a
                    href={supportEmailUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Mail size={14} aria-hidden="true" />
                    Precisa de ajuda? Fale com o suporte
                  </a>
                </div>
              )}
            </div>
          )}
        </form>
      </motion.div>
    </AuthShell>
  );
};

export default Login;
