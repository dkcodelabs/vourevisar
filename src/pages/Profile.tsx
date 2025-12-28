import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Calendar, Phone, Lock, } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from '@/lib/toast';
import { z } from 'zod';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useNavigate } from 'react-router-dom';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { GlassCard, AnimatedTitle, GradientButton } from '@/components/ui';
import { motion } from 'framer-motion';
import { TooltipProvider } from '@/components/ui/tooltip';

const passwordSchema = z.object({
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const resetPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
  newPassword: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const profileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phone: z.string().optional(),
});

interface StatsData {
  totalSubjects: number;
  totalTopics: number;
  totalReviews: number;
  consecutiveDays: number;
}

const Profile = () => {
  const { profile, user, updateProfile, updatePassword, resetPassword } = useAuth();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statsData, setStatsData] = useState<StatsData>({
    totalSubjects: 0,
    totalTopics: 0,
    totalReviews: 0,
    consecutiveDays: 0
  });
  const navigate = useNavigate();

  // Check if user is from Google provider
  const isGoogleUser = user?.app_metadata?.provider === 'google';

  // Populate form with profile data when it becomes available
  useEffect(() => {
    if (profile) {
      profileForm.reset({
        name: profile.name || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  // Fetch statistics data
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!user) return;

      try {
        await fetchStatsData();
      } catch (error) {
        console.error('Erro ao carregar dados estatísticos:', error);
        if (isMounted) {
          setError('Não foi possível carregar os dados estatísticos');
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const fetchStatsData = async () => {
    if (!user) return;

    setIsLoadingStats(true);
    setError(null);

    try {
      // Buscar total de matérias
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id')
        .eq('user_id', user.id);

      if (subjectsError) throw subjectsError;

      const subjectIds = subjectsData?.map(subject => subject.id) || [];

      // Se não houver matérias, retorna estatísticas zeradas
      if (subjectIds.length === 0) {
        setStatsData({
          totalSubjects: 0,
          totalTopics: 0,
          totalReviews: 0,
          consecutiveDays: 0
        });
        return;
      }

      // Buscar total de tópicos
      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select('id, review_count')
        .in('subject_id', subjectIds);

      if (topicsError) throw topicsError;

      // Calcular total de revisões
      const totalReviews = topicsData?.reduce((sum, topic) => sum + (topic.review_count || 0), 0) || 0;

      setStatsData({
        totalSubjects: subjectsData?.length || 0,
        totalTopics: topicsData?.length || 0,
        totalReviews: totalReviews,
        consecutiveDays: 0 // Placeholder
      });

    } catch (err: any) {
      console.error('Erro ao buscar estatísticas do perfil:', err);
      setStatsData({
        totalSubjects: 0,
        totalTopics: 0,
        totalReviews: 0,
        consecutiveDays: 0
      });
      setError(null); // Não exibe erro para o usuário
    } finally {
      setIsLoadingStats(false);
    }
  };

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile?.name || '',
      phone: profile?.phone || '',
    },
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const resetPasswordForm = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: user?.email || '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handleSaveProfile = async (values) => {
    if (!user) return;

    setIsSaving(true);
    setError(null);

    try {
      await updateProfile({
        name: values.name,
        phone: values.phone,
      });
    } catch (error: any) {
      setError('Erro ao salvar perfil: ' + error.message);
      console.error('Erro:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (values) => {
    setError(null);
    try {
      await updatePassword(values.password);
      setIsPasswordDialogOpen(false);
      passwordForm.reset();
    } catch (error: any) {
      setError('Erro ao alterar senha: ' + error.message);
      console.error('Erro ao alterar senha:', error);
    }
  };

  const handleResetPassword = async (values) => {
    setError(null);

    // Verificar se o email é o mesmo do usuário logado
    if (values.email !== user?.email) {
      setError('O email deve ser o mesmo da sua conta atual');
      return;
    }

    try {
      setIsSaving(true);
      await resetPassword(values.email);
      setIsResetPasswordDialogOpen(false);
      resetPasswordForm.reset();
      toast.success("Email enviado! Verifique sua caixa de entrada para redefinir sua senha.");
    } catch (error: any) {
      setError('Erro ao enviar email de redefinição: ' + error.message);
      console.error('Erro ao enviar email de redefinição:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const createdAt = user?.created_at ? formatDate(user.created_at) : '';

  if (!user) {
    return <LoadingSpinner />;
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Perfil
            </h1>
          </motion.div>
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <GlassCard className="max-w-xl p-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Informações Pessoais</h2>

              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(handleSaveProfile)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center text-sm">
                          <User className="h-4 w-4 mr-2" />
                          Nome
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Seu nome" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-2">
                    <Label htmlFor="email" className="flex items-center text-sm">
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      value={user?.email || ''}
                      readOnly
                      type="email"
                    />
                  </div>

                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center text-sm">
                          <Phone className="h-4 w-4 mr-2" />
                          Telefone
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Seu telefone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-2">
                    <Label htmlFor="joined" className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      Data de Cadastro
                    </Label>
                    <Input
                      id="joined"
                      value={createdAt}
                      readOnly
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <GradientButton
                      type="submit"
                      className="flex-1"
                      disabled={isSaving}
                    >
                      {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </GradientButton>

                    {!isGoogleUser && (
                      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                        <DialogTrigger asChild>
                          <GradientButton
                            type="button"
                            variant="outline"
                            className="flex-1"
                          >
                            <Lock className="h-4 w-4 mr-2" />
                            Alterar Senha
                          </GradientButton>
                        </DialogTrigger>
                        <DialogContent aria-describedby="change-password-description">
                          <DialogHeader>
                            <DialogTitle>Alterar Senha</DialogTitle>
                          </DialogHeader>
                          <div id="change-password-description" className="sr-only">
                            Formulário para alterar sua senha atual. Digite uma nova senha e confirme-a.
                          </div>
                          <Form {...passwordForm}>
                            <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-4 pt-2">
                              <FormField
                                control={passwordForm.control}
                                name="password"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm">Nova Senha</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="password"
                                        {...field}
                                        placeholder="Digite sua nova senha"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={passwordForm.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm">Confirme a Senha</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="password"
                                        {...field}
                                        placeholder="Confirme sua nova senha"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <DialogFooter>
                                <GradientButton type="submit">
                                  Alterar Senha
                                </GradientButton>
                              </DialogFooter>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </form>
              </Form>
            </div>
          </GlassCard>

          {/* Card de Redefinição de Senha */}
          <GlassCard className="max-w-xl p-6 mt-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Redefinir Senha</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Receba um email com link para redefinir sua senha
              </p>

              <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
                <DialogTrigger asChild>
                  <GradientButton
                    type="button"
                    className="w-full"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Redefinir Senha por Email
                  </GradientButton>
                </DialogTrigger>
                <DialogContent aria-describedby="reset-password-description">
                  <DialogHeader>
                    <DialogTitle>Redefinir Senha</DialogTitle>
                  </DialogHeader>
                  <div id="reset-password-description" className="sr-only">
                    Formulário para redefinir sua senha por email. Digite seu email atual para receber um link de redefinição.
                  </div>
                  <Form {...resetPasswordForm}>
                    <form onSubmit={resetPasswordForm.handleSubmit(handleResetPassword)} className="space-y-4 pt-2">
                      <FormField
                        control={resetPasswordForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center text-sm">
                              <Mail className="h-4 w-4 mr-2" />
                              Confirme seu email
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                {...field}
                                placeholder="Digite seu email atual"
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-gray-500">
                              Deve ser o mesmo email da sua conta atual
                            </p>
                          </FormItem>
                        )}
                      />

                      <DialogFooter>
                        <GradientButton
                          type="submit"
                          disabled={isSaving}
                        >
                          {isSaving ? 'Enviando...' : 'Enviar Email de Redefinição'}
                        </GradientButton>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </GlassCard>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Profile;
