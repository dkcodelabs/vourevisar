
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { toast } from 'sonner';
import { z } from 'zod';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { X } from 'lucide-react';

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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-6">
      <div className="mb-8">
        <span className="text-app-blue font-bold text-4xl">vouRevisar</span>
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Bem-vindo(a) ao vouRevisar</CardTitle>
          <CardDescription>
            Gerencie seus estudos e revisões de forma eficiente
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="seu@email.com" 
                            type="email"
                            {...field} 
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
                        <div className="flex items-center justify-between">
                          <FormLabel>Senha</FormLabel>
                          <button 
                            type="button" 
                            className="text-sm text-app-blue hover:underline"
                            onClick={() => setIsForgotPasswordOpen(true)}
                          >
                            Esqueceu sua senha?
                          </button>
                        </div>
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder="Sua senha" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-app-blue hover:bg-app-light-blue"
                    disabled={loading}
                  >
                    {loading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="cadastro">
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(handleSignUp)} className="space-y-4">
                  <FormField
                    control={signupForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Seu nome completo"
                            {...field} 
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
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="seu@email.com" 
                            {...field} 
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
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="(99) 99999-9999"
                            {...field} 
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
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder="Crie uma senha" 
                            {...field} 
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
                        <FormLabel>Confirme a senha</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder="Confirme sua senha" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-app-blue hover:bg-app-light-blue"
                    disabled={loading}
                  >
                    {loading ? 'Criando conta...' : 'Criar conta'}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <div className="relative px-6 py-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Ou continue com
            </span>
          </div>
        </div>
        
        <CardFooter className="px-6 pt-0 pb-6">
          <Button 
            variant="outline" 
            className="w-full flex items-center gap-2"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <FcGoogle size={20} />
            Google
          </Button>
        </CardFooter>
      </Card>
      
      {/* Modal de Esqueceu Senha */}
      <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Esqueceu sua senha?</DialogTitle>
            <button
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
              onClick={() => setIsForgotPasswordOpen(false)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </button>
          </DialogHeader>
          <div className="text-sm text-muted-foreground pb-4">
            Digite seu email abaixo e enviaremos um link para redefinir sua senha.
          </div>
          <Form {...forgotPasswordForm}>
            <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="space-y-4">
              <FormField
                control={forgotPasswordForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="seu@email.com" 
                        type="email" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="sm:justify-between mt-4 gap-2">
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={() => setIsForgotPasswordOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-app-blue hover:bg-app-light-blue"
                  disabled={resetPasswordLoading}
                >
                  Enviar link de recuperação
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
