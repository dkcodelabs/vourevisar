import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import {
  User, Mail, Calendar, Phone, Lock, Shield, CreditCard,
  GraduationCap, Target, Clock, BookOpen, Camera, Loader2,
  CheckCircle2, ShieldCheck, Pencil, ExternalLink
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toast } from '@/lib/toast';
import { z } from 'zod';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { errorService } from '@/lib/errors/errorService';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { GradientButton } from '@/components/ui';
import { motion } from 'framer-motion';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useSubscriptionInfo } from '@/hooks/useSubscriptionInfo';

// ─── Schemas ────────────────────────────────────────────────
const profileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phone: z.string().optional(),
});

const academicSchema = z.object({
  targetExam: z.string().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  dailyHours: z.string().optional(),
  examDate: z.string().optional(),
  focusArea: z.string().optional(),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

// ─── Tipos ──────────────────────────────────────────────────
interface AcademicInfo {
  targetExam?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  dailyHours?: string;
  examDate?: string;
  focusArea?: string;
}

// ─── Constantes ─────────────────────────────────────────────
const PLAN_LABELS: Record<string, string> = {
  free_trial: 'Teste Gratuito',
  monthly: 'Mensal',
  annual: 'Anual',
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  trial: { label: 'Em teste', variant: 'secondary' },
  active: { label: 'Ativo', variant: 'default' },
  expired: { label: 'Expirado', variant: 'destructive' },
  canceled: { label: 'Cancelado', variant: 'destructive' },
  suspended: { label: 'Suspenso', variant: 'destructive' },
};

// ─── Componente de Card (padrão do Dashboard) ───────────────
const ProfileCard = ({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: delay * 0.08, duration: 0.4, type: 'spring', stiffness: 120 }}
    className={`glow-card rounded-2xl p-5 ${className}`}
  >
    {children}
  </motion.div>
);

// ─── Header de seção (padrão Dashboard: uppercase + tracking) ─
const SectionHeader = ({
  icon: Icon,
  iconColor,
  label,
  action,
}: {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  action?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2.5">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconColor}`}>
        <Icon className="h-4 w-4" />
      </div>
      <span className="data-label">{label}</span>
    </div>
    {action}
  </div>
);

// ─── Linha de dados (padrão Dashboard: ícone + label + valor) ─
const DataRow = ({
  icon: Icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  valueColor?: string;
}) => (
  <div className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
    <span className={`text-sm font-semibold ${valueColor || 'text-foreground'}`}>
      {value}
    </span>
  </div>
);

// ─── Interfaces de Formulário ──────────────────────────
type ProfileFormValues = z.infer<typeof profileSchema>;
type AcademicFormValues = z.infer<typeof academicSchema>;
type ResetFormValues = z.infer<typeof resetPasswordSchema>;

// ═══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════
const Profile = () => {
  const { profile, user, updateProfile, resetPassword } = useAuth();
  const { subscriptionInfo, loading: subLoading } = useSubscriptionInfo();
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAcademic, setIsSavingAcademic] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingAcademic, setIsEditingAcademic] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const authProviders = user?.identities?.map((identity) => identity.provider) || [];
  const isGoogleUser = user?.app_metadata?.provider === 'google' || authProviders.includes('google');

  // ─── Forms ──────────────────────────────────────────────
  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', phone: '' },
  });

  const academicForm = useForm({
    resolver: zodResolver(academicSchema),
    defaultValues: {
      targetExam: '',
      level: undefined as 'beginner' | 'intermediate' | 'advanced' | undefined,
      dailyHours: '',
      examDate: '',
      focusArea: '',
    },
  });

  const resetForm = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: user?.email || '' },
  });

  useEffect(() => {
    if (profile) {
      profileForm.reset({ name: profile.name || '', phone: profile.phone || '' });
      const prefs = (profile.preferences as Record<string, unknown>) || {};
      const academic = prefs.academic as AcademicInfo | undefined;
      if (academic) {
        academicForm.reset({
          targetExam: academic.targetExam || '',
          level: academic.level || undefined,
          dailyHours: academic.dailyHours || '',
          examDate: academic.examDate || '',
          focusArea: academic.focusArea || '',
        });
      }
    }
  }, [profile, profileForm, academicForm]);

  useEffect(() => {
    if (profile?.avatar_url) setAvatarPreview(profile.avatar_url);
    else if (user?.user_metadata?.avatar_url) setAvatarPreview(user.user_metadata.avatar_url);
  }, [profile, user]);

  // ─── Handlers ─────────────────────────────────────────
  const handleSaveProfile = async (values: ProfileFormValues) => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateProfile({ name: values.name, phone: values.phone });
      toast.success('Perfil atualizado!');
      setIsEditingProfile(false);
    } catch (error: unknown) {
      errorService.report(error as Error, { module: 'profile', action: 'save-profile', userMessage: 'Erro ao salvar perfil.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAcademic = async (values: AcademicFormValues) => {
    if (!user) return;
    setIsSavingAcademic(true);
    try {
      const currentPrefs = (profile?.preferences as Record<string, unknown>) || {};
      await updateProfile({ preferences: { ...currentPrefs, academic: values } });
      toast.success('Informações acadêmicas salvas!');
      setIsEditingAcademic(false);
    } catch (error: unknown) {
      errorService.report(error as Error, { module: 'profile', action: 'save-academic', userMessage: 'Erro ao salvar informações acadêmicas.' });
    } finally {
      setIsSavingAcademic(false);
    }
  };

  const handleResetPassword = async (values: ResetFormValues) => {
    if (values.email !== user?.email) {
      errorService.report(new Error('Email divergente'), { module: 'profile', action: 'reset-password', userMessage: 'O email deve ser o mesmo da sua conta atual.' });
      return;
    }
    try {
      setIsSaving(true);
      const result = await resetPassword(values.email);

      if (!result.success) {
        throw new Error(result.error || 'Erro ao enviar email de redefinição.');
      }

      setIsResetDialogOpen(false);
      resetForm.reset();
    } catch (error: unknown) {
      errorService.report(error as Error, { module: 'profile', action: 'reset-password', userMessage: 'Erro ao enviar email de redefinição.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { 
      errorService.report(new Error('File too large'), { module: 'profile', action: 'avatar-upload', userMessage: 'Máximo 2MB' });
      return; 
    }
    if (!file.type.startsWith('image/')) { 
      errorService.report(new Error('Invalid file type'), { module: 'profile', action: 'avatar-upload', userMessage: 'Selecione uma imagem' });
      return; 
    }

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${user.id}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await updateProfile({ avatar_url: publicUrl });
      setAvatarPreview(publicUrl);
      toast.success('Foto atualizada!');
    } catch (error: unknown) {
      errorService.report(error as Error, { module: 'profile', action: 'avatar-upload', userMessage: 'Erro ao enviar foto.' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    const [, year, month, day] = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/) ?? [];
    if (!year || !month || !day) return '—';
    return `${day}/${month}/${year}`;
  };

  const getDaysUntil = (dateString?: string | null) => {
    if (!dateString) return null;
    const target = new Date(dateString);
    if (Number.isNaN(target.getTime())) return null;
    return Math.max(0, Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  };

  const getInitials = () => {
    const name = profile?.name || user?.user_metadata?.name || '';
    return name.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || '?';
  };

  const getLevelLabel = (level?: string) => {
    const map: Record<string, string> = { beginner: 'Iniciante', intermediate: 'Intermediário', advanced: 'Avançado' };
    return level ? map[level] || level : '—';
  };

  if (!user) return <LoadingSpinner size="large" fullPage />;

  const academic = ((profile?.preferences as Record<string, unknown>) || {}).academic as AcademicInfo | undefined;
  const subscriptionRenewalDate = subscriptionInfo?.status === 'trial'
    ? subscriptionInfo.trial_ends_at
    : subscriptionInfo?.next_billing_date || subscriptionInfo?.subscription_ends_at;
  const subscriptionDaysRemaining = getDaysUntil(subscriptionRenewalDate);

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <TooltipProvider>
      <div className="pb-10 h-full w-full">
        <div className="w-full pb-8 pt-0">

          {/* ────────────────────────────────────────── */}
          {/* LINHA 1: 3 Cards no topo (como Dashboard) */}
          {/* ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

            {/* CARD 1: Identidade — Avatar + Nome + Email */}
            <ProfileCard delay={0}>
              <SectionHeader
                icon={User}
                iconColor="bg-blue-500/10 text-blue-500"
                label="IDENTIFICAÇÃO"
                action={
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-muted-foreground/50 hover:text-primary transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                }
              />
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

              <div className="flex items-center gap-4 mb-4">
                <div
                  className="relative group cursor-pointer flex-shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-border/50 bg-muted flex items-center justify-center">
                    {isUploadingAvatar ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-base font-bold text-muted-foreground">{getInitials()}</span>
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-foreground truncate">
                    {profile?.name || 'Usuário'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              </div>

              <DataRow icon={Calendar} label="Membro desde" value={formatDate(user.created_at)} />
              <DataRow icon={Phone} label="Telefone" value={profile?.phone || '—'} />
              <DataRow
                icon={Shield}
                label="Login"
                value={
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {isGoogleUser ? '🔗 Google' : '📧 Email'}
                  </Badge>
                }
              />
            </ProfileCard>

            {/* CARD 2: Assinatura */}
            <ProfileCard delay={1}>
              <SectionHeader
                icon={CreditCard}
                iconColor="bg-amber-500/10 text-amber-500"
                label="ASSINATURA"
              />

              {subLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : subscriptionInfo ? (
                <>
                  <div className="text-center mb-4">
                    <p className="text-3xl font-black text-foreground">
                      {PLAN_LABELS[subscriptionInfo.plan] || subscriptionInfo.plan}
                    </p>
                    <Badge
                      variant={STATUS_CONFIG[subscriptionInfo.status]?.variant || 'outline'}
                      className="mt-1"
                    >
                      {STATUS_CONFIG[subscriptionInfo.status]?.label || subscriptionInfo.status}
                    </Badge>
                  </div>

                  <DataRow
                    icon={Calendar}
                    label="Ativado em"
                    value={formatDate(subscriptionInfo.subscription_started_at || subscriptionInfo.trial_started_at || subscriptionInfo.created_at)}
                  />
                  <DataRow
                    icon={Calendar}
                    label={subscriptionInfo.status === 'trial' ? 'Fim do teste' : 'Próxima cobrança'}
                    value={formatDate(subscriptionRenewalDate)}
                  />
                  {subscriptionDaysRemaining !== null && (
                    <DataRow
                      icon={Clock}
                      label="Tempo restante"
                      value={
                        subscriptionDaysRemaining === 0
                          ? 'Vence hoje'
                          : subscriptionDaysRemaining === 1
                            ? '1 dia'
                            : `${subscriptionDaysRemaining} dias`
                      }
                      valueColor={
                        subscriptionDaysRemaining <= 3
                          ? 'text-red-500'
                          : subscriptionDaysRemaining <= 7
                            ? 'text-amber-500'
                            : 'text-emerald-500 font-bold'
                      }
                    />
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <CreditCard className="h-6 w-6 mx-auto mb-1 opacity-30" />
                  <p className="text-xs text-muted-foreground">Sem assinatura</p>
                </div>
              )}

              <div className="mt-3">
                <GradientButton
                  type="button"
                  variant="outline"
                  className="w-full text-xs py-1.5"
                  onClick={() => toast.info('Em breve: Portal de gerenciamento')}
                >
                  Gerenciar Assinatura
                </GradientButton>
              </div>
            </ProfileCard>

            {/* CARD 3: Segurança */}
            <ProfileCard delay={2}>
              <SectionHeader
                icon={Lock}
                iconColor="bg-red-500/10 text-red-500"
                label="SEGURANÇA"
              />

              {/* Senha */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <span className="text-sm text-muted-foreground">Senha</span>
                  </div>
                  {isGoogleUser ? (
                    <div className="flex flex-col items-end gap-1 text-right">
                      <span className="text-xs font-medium text-muted-foreground">Gerenciada pelo Google</span>
                      <a
                        href="https://myaccount.google.com/security"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        Alterar no Google
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ) : (
                    <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                      <DialogTrigger asChild>
                        <button className="text-xs text-primary font-medium hover:underline">
                          Redefinir
                        </button>
                      </DialogTrigger>
                      <DialogContent aria-describedby="reset-desc">
                        <DialogHeader>
                          <DialogTitle>Redefinir Senha</DialogTitle>
                        </DialogHeader>
                        <div id="reset-desc" className="sr-only">Enviar link de redefinição de senha</div>
                        <Form {...resetForm}>
                          <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-4 pt-2">
                            <FormField
                              control={resetForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center text-sm">
                                    <Mail className="h-4 w-4 mr-2" />
                                    Confirme seu email
                                  </FormLabel>
                                  <FormControl>
                                    <Input type="email" {...field} placeholder="Seu email atual" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <DialogFooter>
                              <GradientButton type="submit" disabled={isSaving}>
                                {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</> : 'Enviar Link'}
                              </GradientButton>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                {/* 2FA */}
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <span className="text-sm text-muted-foreground">2FA</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    Em breve
                  </Badge>
                </div>

                {/* Metodo Login */}
                <DataRow
                  icon={Shield}
                  label="Método"
                  value={
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {isGoogleUser ? '🔗 Google' : '📧 Email'}
                    </Badge>
                  }
                />
              </div>
            </ProfileCard>
          </div>

          {/* ────────────────────────────────────────── */}
          {/* LINHA 2: Dados Pessoais + Acadêmico       */}
          {/* ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* CARD: Dados Pessoais (editável) */}
            <ProfileCard delay={3}>
              <SectionHeader
                icon={User}
                iconColor="bg-indigo-500/10 text-indigo-500"
                label="DADOS PESSOAIS"
                action={
                  !isEditingProfile ? (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="text-muted-foreground/50 hover:text-primary transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  ) : null
                }
              />

              {isEditingProfile ? (
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(handleSaveProfile)} className="space-y-3">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Nome</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Seu nome" className="h-9 text-sm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Telefone</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="(00) 00000-0000" className="h-9 text-sm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2 pt-1">
                      <GradientButton type="submit" className="flex-1 text-xs py-1.5" disabled={isSaving}>
                        {isSaving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Salvando</> : <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Salvar</>}
                      </GradientButton>
                      <GradientButton
                        type="button"
                        variant="outline"
                        className="text-xs py-1.5 px-3"
                        onClick={() => {
                          setIsEditingProfile(false);
                          profileForm.reset({ name: profile?.name || '', phone: profile?.phone || '' });
                        }}
                      >
                        Cancelar
                      </GradientButton>
                    </div>
                  </form>
                </Form>
              ) : (
                <div>
                  <DataRow icon={User} label="Nome" value={profile?.name || '—'} />
                  <DataRow icon={Mail} label="Email" value={user?.email || '—'} />
                  <DataRow icon={Phone} label="Telefone" value={profile?.phone || '—'} />
                  <DataRow icon={Calendar} label="Cadastro" value={formatDate(user.created_at)} />
                </div>
              )}
            </ProfileCard>

            {/* CARD: Informações Acadêmicas (editável) */}
            <ProfileCard delay={4}>
              <SectionHeader
                icon={GraduationCap}
                iconColor="bg-emerald-500/10 text-emerald-500"
                label="INFORMAÇÕES ACADÊMICAS"
                action={
                  !isEditingAcademic ? (
                    <button
                      onClick={() => setIsEditingAcademic(true)}
                      className="text-muted-foreground/50 hover:text-primary transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  ) : null
                }
              />

              {isEditingAcademic ? (
                <Form {...academicForm}>
                  <form onSubmit={academicForm.handleSubmit(handleSaveAcademic)} className="space-y-3">
                    <FormField
                      control={academicForm.control}
                      name="targetExam"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Concurso Alvo</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: TRT, PF, INSS..." className="h-9 text-sm" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={academicForm.control}
                      name="level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Nível</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="beginner">Iniciante</SelectItem>
                              <SelectItem value="intermediate">Intermediário</SelectItem>
                              <SelectItem value="advanced">Avançado</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={academicForm.control}
                      name="dailyHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Carga Diária</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: 4h" className="h-9 text-sm" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={academicForm.control}
                      name="examDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Data da Prova</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" className="h-9 text-sm" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={academicForm.control}
                      name="focusArea"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Área de Foco</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: Direito Constitucional" className="h-9 text-sm" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2 pt-1">
                      <GradientButton type="submit" className="flex-1 text-xs py-1.5" disabled={isSavingAcademic}>
                        {isSavingAcademic ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Salvando</> : <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Salvar</>}
                      </GradientButton>
                      <GradientButton
                        type="button"
                        variant="outline"
                        className="text-xs py-1.5 px-3"
                        onClick={() => {
                          setIsEditingAcademic(false);
                          const prefs = (profile?.preferences as Record<string, unknown>) || {};
                          const ac = prefs.academic as AcademicInfo | undefined;
                          academicForm.reset({
                            targetExam: ac?.targetExam || '',
                            level: ac?.level || undefined,
                            dailyHours: ac?.dailyHours || '',
                            examDate: ac?.examDate || '',
                            focusArea: ac?.focusArea || '',
                          });
                        }}
                      >
                        Cancelar
                      </GradientButton>
                    </div>
                  </form>
                </Form>
              ) : (
                <div>
                  <DataRow icon={Target} label="Concurso" value={academic?.targetExam || '—'} />
                  <DataRow icon={BookOpen} label="Nível" value={getLevelLabel(academic?.level)} />
                  <DataRow icon={Clock} label="Carga diária" value={academic?.dailyHours || '—'} />
                  <DataRow icon={Calendar} label="Prova" value={academic?.examDate ? formatDate(academic.examDate) : '—'} />
                  <DataRow icon={Target} label="Foco" value={academic?.focusArea || '—'} />
                </div>
              )}
            </ProfileCard>
          </div>

        </div>
      </div>
    </TooltipProvider>
  );
};

export default Profile;
