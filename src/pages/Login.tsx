
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ModernCard } from '@/components/ui/modern-card';
import { ModernInput } from '@/components/ui/modern-input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { toast } from 'sonner';
import { z } from 'zod';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { X, Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

const signupSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone inválido').optional(),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

const Login = () => {
  const { user, signIn, signUp, signInWithGoogle, resetPassword, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('login');
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signupForm = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const forgotPasswordForm = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  // Se já estiver logado, redireciona para a página inicial
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (values) => {
    try {
      await signIn(values.email, values.password);
    } catch (error) {
      console.error('Erro no login:', error);
    }
  };

  const handleSignUp = async (values) => {
    try {
      await signUp(values.email, values.password, values.name, values.phone);
      setActiveTab('login');
    } catch (error) {
      console.error('Erro no cadastro:', error);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Erro ao fazer login com Google:', error);
    }
  };

  const handleForgotPassword = async (values) => {
    setResetPasswordLoading(true);
    try {
      await resetPassword(values.email);
      setIsForgotPasswordOpen(false);
      forgotPasswordForm.reset();
      toast.success('Email de redefinição de senha enviado!');
    } catch (error) {
      console.error('Erro ao enviar email de recuperação:', error);
      toast.error('Erro ao enviar email. Verifique se o email está correto.');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Email inválido';
    }
    return null;
  };

  const validatePassword = (value: string) => {
    if (value.length < 6) {
      return 'A senha deve ter pelo menos 6 caracteres';
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-surface-50 to-brand-100 dark:from-surface-950 dark:via-surface-900 dark:to-surface-950 flex items-center justify-center p-4 safe-area-inset">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-brand-200/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-brand-300/20 to-transparent rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          duration: 0.6, 
          ease: [0.4, 0, 0.2, 1],
          staggerChildren: 0.1 
        }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-600 to-brand-800 bg-clip-text text-transparent">
            vouRevisar
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">
            Transforme seus estudos em conquistas
          </p>
        </motion.div>
        
        <ModernCard variant="glass" className="overflow-hidden">
          <div className="p-8">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center mb-8"
            >
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Bem-vindo de volta
              </h2>
              <p className="text-muted-foreground">
                Gerencie seus estudos de forma inteligente
              </p>
            </motion.div>
            
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
              {/* Tab Navigation */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-surface-100 dark:bg-surface-800 p-1 rounded-xl">
                  <TabsTrigger 
                    value="login" 
                    className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-surface-700 data-[state=active]:shadow-md transition-all duration-200"
                  >
                    Entrar
                  </TabsTrigger>
                  <TabsTrigger 
                    value="cadastro"
                    className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-surface-700 data-[state=active]:shadow-md transition-all duration-200"
                  >
                    Cadastrar
                  </TabsTrigger>
                </TabsList>
              </motion.div>
              
              {/* Login Tab */}
              <TabsContent value="login">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-6">
                        <FormField
                          control={loginForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <ModernInput
                                  {...field}
                                  label="Email"
                                  type="email"
                                  leftIcon={<Mail className="h-4 w-4" />}
                                  onRealTimeValidation={validateEmail}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <ModernInput
                                  {...field}
                                  label="Senha"
                                  type="password"
                                  leftIcon={<Lock className="h-4 w-4" />}
                                  onRealTimeValidation={validatePassword}
                                />
                              </FormControl>
                              <FormMessage />
                              <div className="flex justify-end">
                                <button 
                                  type="button" 
                                  className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors focus-ring rounded"
                                  onClick={() => setIsForgotPasswordOpen(true)}
                                >
                                  Esqueceu sua senha?
                                </button>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="submit" 
                          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 border-0 shadow-lg hover:shadow-xl transition-all duration-200 interactive-button"
                          disabled={loading}
                        >
                          {loading ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Entrando...
                            </div>
                          ) : (
                            'Entrar'
                          )}
                        </Button>
                      </form>
                    </Form>
                  </motion.div>
                </AnimatePresence>
              </TabsContent>
              
              {/* Signup Tab */}
              <TabsContent value="cadastro">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="signup"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Form {...signupForm}>
                      <form onSubmit={signupForm.handleSubmit(handleSignUp)} className="space-y-6">
                        <FormField
                          control={signupForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <ModernInput
                                  {...field}
                                  label="Nome completo"
                                  leftIcon={<User className="h-4 w-4" />}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={signupForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <ModernInput
                                  {...field}
                                  label="Email"
                                  type="email"
                                  leftIcon={<Mail className="h-4 w-4" />}
                                  onRealTimeValidation={validateEmail}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={signupForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <ModernInput
                                  {...field}
                                  label="Telefone"
                                  type="tel"
                                  leftIcon={<Phone className="h-4 w-4" />}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={signupForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <ModernInput
                                  {...field}
                                  label="Senha"
                                  type="password"
                                  leftIcon={<Lock className="h-4 w-4" />}
                                  onRealTimeValidation={validatePassword}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={signupForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <ModernInput
                                  {...field}
                                  label="Confirme a senha"
                                  type="password"
                                  leftIcon={<Lock className="h-4 w-4" />}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="submit" 
                          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 border-0 shadow-lg hover:shadow-xl transition-all duration-200 interactive-button"
                          disabled={loading}
                        >
                          {loading ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Criando conta...
                            </div>
                          ) : (
                            'Criar conta'
                          )}
                        </Button>
                      </form>
                    </Form>
                  </motion.div>
                </AnimatePresence>
              </TabsContent>
            </Tabs>
            
            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-4 text-muted-foreground font-medium">
                  Ou continue com
                </span>
              </div>
            </div>
            
            {/* Google Sign In */}
            <Button 
              variant="outline" 
              className="w-full h-12 text-base font-medium border-2 hover:bg-surface-50 dark:hover:bg-surface-800 transition-all duration-200 interactive-button"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <FcGoogle className="w-5 h-5 mr-3" />
              Google
            </Button>
          </div>
        </ModernCard>
        
        {/* Modal de Esqueceu Senha */}
        <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
          <DialogContent className="sm:max-w-md glass-card border-0">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Recuperar senha</DialogTitle>
              <button
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none touch-target"
                onClick={() => setIsForgotPasswordOpen(false)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Fechar</span>
              </button>
            </DialogHeader>
            <div className="text-sm text-muted-foreground pb-4">
              Digite seu email e enviaremos um link para redefinir sua senha.
            </div>
            <Form {...forgotPasswordForm}>
              <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="space-y-4">
                <FormField
                  control={forgotPasswordForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <ModernInput
                          {...field}
                          label="Email"
                          type="email"
                          leftIcon={<Mail className="h-4 w-4" />}
                          onRealTimeValidation={validateEmail}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="flex gap-2 mt-6">
                  <Button 
                    variant="outline" 
                    type="button" 
                    onClick={() => setIsForgotPasswordOpen(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 border-0"
                    disabled={resetPasswordLoading}
                  >
                    {resetPasswordLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Enviando...
                      </div>
                    ) : (
                      'Enviar link'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
};

export default Login;
