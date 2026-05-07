import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  RefreshCw, BookOpen, Bell, Settings2, AlertTriangle,
  Clock, Globe, Loader2, CheckCircle2, ChevronRight,
  CreditCard, User
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { GradientButton } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCycleState } from '@/hooks/useCycleState';
import { useApp } from '@/contexts/AppContext';
import { ReviewProfile, UserSettings } from '@/types/study';
import { motion } from 'framer-motion';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ResetCycleConfirmDialog } from '@/components/ResetCycleConfirmDialog';
import { errorService } from '@/lib/errors/errorService';
import { toastGate } from '@/lib/errors/toastGate';

// ─── Design System Components (padrão Perfil v2) ───────────
const SettingsCard = ({
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

// ─── Constantes ─────────────────────────────────────────────
const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (GMT-2)' },
  { value: 'America/Belem', label: 'Belém (GMT-3)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (GMT-3)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (GMT-4)' },
  { value: 'America/Campo_Grande', label: 'Campo Grande (GMT-4)' },
  { value: 'America/Porto_Velho', label: 'Porto Velho (GMT-4)' },
  { value: 'America/Boa_Vista', label: 'Boa Vista (GMT-4)' },
];

// ═══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════
const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    id: '',
    user_id: user?.id || '',
    review_profile: ReviewProfile.INTERMEDIATE,
    subjects_per_day: 3,
    notifications_enabled: true,
    notification_time: "08:00",
    created_at: '',
    updated_at: ''
  });
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [timezone, setTimezone] = useState('America/Sao_Paulo');

  const { userCycle, isLoading: isCycleLoading, fetchUserCycle, resetCycle } = useCycleState();
  const [isResettingCycle, setIsResettingCycle] = useState(false);
  const { fetchUserSettings: fetchUserSettingsContext, refreshData } = useApp();

  // ─── Data loading ─────────────────────────────────────
  useEffect(() => {
    if (user) {
      fetchUserSettings();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchUserSettings = async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: '',
          user_id: data.user_id || '',
          review_profile: data.review_profile as ReviewProfile,
          subjects_per_day: data.subjects_per_day,
          notifications_enabled: data.notifications_enabled,
          notification_time: data.notification_time,
          created_at: data.created_at || '',
          updated_at: data.updated_at || ''
        } as UserSettings);
      } else {
        const { error: insertError } = await supabase
          .from('user_settings')
          .insert({
            id: '',
            user_id: user.id,
            review_profile: settings.review_profile,
            subjects_per_day: settings.subjects_per_day,
            notifications_enabled: settings.notifications_enabled,
            notification_time: settings.notification_time,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        if (insertError) throw insertError;
      }
    } catch (err: any) {
      console.error('Erro ao buscar configurações:', err);
      setError('Não foi possível carregar suas configurações.');
      errorService.report(err, { module: 'settings', action: 'fetch', userMessage: "Erro ao carregar configurações" });
    } finally {
      setIsLoading(false);
    }
  };



  // ─── Handlers ─────────────────────────────────────────
  const handleSubjectsPerDayChange = async (value: number[]) => {
    const newValue = value[0];
    setSettings(prev => ({ ...prev, subjects_per_day: newValue }));

    if (user) {
      try {
        const { error } = await supabase
          .from('user_settings')
          .update({ subjects_per_day: newValue, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
        if (error) throw error;
        await fetchUserSettingsContext();
        toast.success(`Agora você estudará ${newValue} matéria${newValue > 1 ? 's' : ''} por dia`);
      } catch (err) {
        console.error('Erro ao salvar subjects_per_day:', err);
        toastGate.notifyError("Não foi possível atualizar", "SET-UPD-FAIL", { severity: 'low' });
        setSettings(prev => ({ ...prev, subjects_per_day: settings.subjects_per_day }));
      }
    }
  };



  const handleNotificationsToggle = (checked: boolean) => {
    setSettings(prev => ({ ...prev, notifications_enabled: checked }));
  };

  const handleNotificationTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({ ...prev, notification_time: e.target.value }));
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          subjects_per_day: settings.subjects_per_day,
          notifications_enabled: settings.notifications_enabled,
          notification_time: settings.notification_time,
          review_profile: settings.review_profile,
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
      await fetchUserSettingsContext();
      toast.success("Notificações salvas!");
    } catch (err: any) {
      errorService.report(err, { module: 'settings', action: 'save_notifications', userMessage: "Erro ao salvar notificações" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetCycle = async () => {
    if (!user) return;
    setIsResettingCycle(true);
    try {
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects').select('id').eq('user_id', user.id);
      if (subjectsError) throw subjectsError;
      const subjectIds = (subjectsData || [])
        .map(s => s.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);

      if (subjectIds.length > 0) {
        const { error: topicsError } = await supabase
          .from('topics')
          .update({
            review_stage: null, review_count: 0, next_review: null,
            last_reviewed_at: null, completed: false, updated_at: new Date().toISOString()
          })
          .in('subject_id', subjectIds);
        if (topicsError) throw topicsError;
      }

      await supabase.from('subjects').update({ status: 'Nova', updated_at: new Date().toISOString() }).eq('user_id', user.id);
      await supabase.from('user_cycles').update({
        ciclo_atual: [], disciplinas_do_dia: [], materias_estudadas_ciclo: [],
        ciclos_realizados: 0, data_inicio_ciclo: null, data_fim_ciclo: null,
        atualizado_em: new Date().toISOString()
      }).eq('user_id', user.id);
      await supabase.from('study_sessions').delete().eq('user_id', user.id);

      const { updateStudiedSubjects, resetCycle: resetCycleState } = await import('@/utils/cycleState');
      updateStudiedSubjects([]);
      resetCycleState(0);
      window.dispatchEvent(new CustomEvent('cycleUpdated', { detail: { isReset: true, reason: 'reviewsCleared', timestamp: Date.now() } }));

      await Promise.all([refreshData(), fetchUserCycle(), fetchUserSettingsContext()]);
      toast.success("Ciclo reiniciado com sucesso!");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      errorService.report(err, { module: 'settings', action: 'reset_cycle', userMessage: "Erro ao reiniciar ciclo" });
    } finally {
      setIsResettingCycle(false);
    }
  };

  const handleClearAll = async () => {
    if (!user) {
      toastGate.notifyError("Usuário não autenticado.", "AUTH-002", { severity: 'low' });
      return;
    }
    try {
      const { data: userSubjects, error: subjectsError } = await supabase.from('subjects').select('id').eq('user_id', user.id);
      if (subjectsError) throw subjectsError;
      const subjectIds = (userSubjects || [])
        .map(s => s.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);

      if (subjectIds.length > 0) {
        const { data: userTopics } = await supabase
          .from('topics')
          .select('id')
          .in('subject_id', subjectIds);
          
        const topicIds = (userTopics || [])
          .map(t => t.id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0);
          
        if (topicIds.length > 0) {
          await supabase.from('topic_review_history').delete().in('topic_id', topicIds);
        }
        await supabase.from('topics').delete().in('subject_id', subjectIds);
      }

      await supabase.from('subjects').delete().eq('user_id', user.id);
      await supabase.from('user_cycles').delete().eq('user_id', user.id);
      await supabase.from('study_sessions').delete().eq('user_id', user.id);
      
      // Também excluir user_editais (Agrupamentos/Editais importados)
      await (supabase as any).from('user_editais').delete().eq('user_id', user.id);

      // Limpar os caches locais para não exibir dados "fantasmas" na montagem
      localStorage.removeItem(`subjects_${user.id} `);
      localStorage.removeItem(`user_cycle_cache_${user.id} `);

      await Promise.all([refreshData(), fetchUserCycle(), fetchUserSettingsContext()]);
      toast.success("Sistema limpo com sucesso!");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      errorService.report(err, { module: 'settings', action: 'clear_all', userMessage: "Erro ao limpar sistema." });
    }
  };

  if (isLoading || isCycleLoading) {
    return <LoadingSpinner size="large" message="Carregando configurações..." fullPage />;
  }

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <TooltipProvider>
      <div className="pb-10 h-full w-full">
        <div className="w-full pb-8 pt-0">

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="max-w-4xl mx-auto space-y-10">
            {/* ═══════════════════════════════════════════ */}
            {/* SEÇÃO PREFERÊNCIAS                         */}
            {/* ═══════════════════════════════════════════ */}
            <section>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 pl-1 font-sans">
                Preferências Gerais
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Planejamento */}
                <SettingsCard delay={0}>
                  <SectionHeader
                    icon={Settings2}
                    iconColor="bg-indigo-500/10 text-indigo-500"
                    label="PLANEJAMENTO"
                  />

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Matérias por dia</span>
                        <span className="text-sm font-bold text-foreground">{settings.subjects_per_day}</span>
                      </div>
                      <Slider
                        value={[settings.subjects_per_day]}
                        max={10}
                        min={1}
                        step={1}
                        onValueChange={handleSubjectsPerDayChange}
                        className="w-full"
                      />
                      <p className="text-[10px] text-muted-foreground/60 mt-1.5">Mudanças aplicadas imediatamente</p>
                    </div>

                    <GradientButton
                      type="button"
                      variant="outline"
                      className="w-full text-xs py-1.5"
                      onClick={() => navigate('/ciclo-estudos')}
                    >
                      <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                      Gerenciar Ciclo
                    </GradientButton>
                  </div>
                </SettingsCard>

                {/* Lembretes */}
                <SettingsCard delay={1}>
                  <SectionHeader
                    icon={Bell}
                    iconColor="bg-amber-500/10 text-amber-500"
                    label="LEMBRETES"
                  />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2.5 border-b border-border/30">
                      <div>
                        <p className="text-sm font-medium text-foreground">Notificações ativas</p>
                        <p className="text-[10px] text-muted-foreground">Receba lembretes para estudar</p>
                      </div>
                      <Switch
                        checked={settings.notifications_enabled}
                        onCheckedChange={handleNotificationsToggle}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="notification-time" className="text-xs text-muted-foreground">
                        Horário principal
                      </Label>
                      <Input
                        id="notification-time"
                        type="time"
                        value={settings.notification_time}
                        onChange={handleNotificationTimeChange}
                        className="max-w-[140px] h-9 text-sm"
                      />
                    </div>

                    <GradientButton
                      type="button"
                      className="w-full text-xs py-1.5"
                      onClick={handleSaveNotifications}
                      disabled={isSaving}
                    >
                      {isSaving
                        ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Salvando</>
                        : <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Salvar Notificações</>
                      }
                    </GradientButton>
                  </div>
                </SettingsCard>

                {/* Fuso Horário */}
                <SettingsCard delay={2}>
                  <SectionHeader
                    icon={Globe}
                    iconColor="bg-emerald-500/10 text-emerald-500"
                    label="FUSO HORÁRIO"
                  />

                  <div className="space-y-3">
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map(tz => (
                          <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground/60">
                      Define o horário de referência para notificações e agendamentos.
                    </p>
                  </div>
                </SettingsCard>

                {/* Links rápidos */}
                <SettingsCard delay={3}>
                  <SectionHeader
                    icon={Settings2}
                    iconColor="bg-slate-500/10 text-slate-500"
                    label="ATALHOS"
                  />

                  <div className="space-y-2">
                    <button
                      onClick={() => navigate('/perfil')}
                      className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg border border-border/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground/60" />
                        <span className="text-sm text-muted-foreground">Editar Perfil</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                    </button>

                    <button
                      onClick={() => toast.info('Em breve: Portal de gerenciamento')}
                      className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg border border-border/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground/60" />
                        <span className="text-sm text-muted-foreground">Gerenciar Assinatura</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                    </button>
                  </div>
                </SettingsCard>
              </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* SEÇÃO GERENCIAMENTO AVANÇADO                 */}
            {/* ═══════════════════════════════════════════ */}
            <section>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 pl-1 font-sans mt-8 border-t border-border/40 pt-8">
                Gerenciamento Avançado
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Reiniciar Ciclo */}
                <SettingsCard delay={4}>
                  <SectionHeader
                    icon={RefreshCw}
                    iconColor="bg-sky-500/10 text-sky-500"
                    label="REINICIAR CICLO"
                  />

                  <p className="text-xs text-muted-foreground mb-4">
                    Reinicia seu ciclo de revisões mantendo matérias e tópicos. Ideal para recomeçar seus estudos.
                  </p>

                  <Button
                    variant="outline"
                    className="w-full text-xs border-sky-500/30 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10"
                    onClick={handleResetCycle}
                    disabled={isResettingCycle}
                    size="sm"
                  >
                    {isResettingCycle ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Reiniciando...</>
                    ) : (
                      <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Reiniciar Ciclo de Revisões</>
                    )}
                  </Button>
                </SettingsCard>

                {/* Zona de Perigo */}
                <SettingsCard delay={5}>
                  <SectionHeader
                    icon={AlertTriangle}
                    iconColor="bg-red-500/10 text-red-500"
                    label="ZONA DE PERIGO"
                  />

                  <div className="p-4 border-2 border-destructive/30 bg-destructive/5 rounded-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                      <h3 className="text-sm font-semibold text-destructive">Reset Completo</h3>
                    </div>
                    <p className="text-xs text-destructive/80">
                      Remove <strong>permanentemente</strong> todas as matérias, tópicos, revisões e anotações. Esta ação é irreversível.
                    </p>
                    <Button
                      variant="destructive"
                      className="w-full text-xs"
                      size="sm"
                      onClick={() => setResetDialogOpen(true)}
                    >
                      ⚠️ Reset Completo (Irreversível)
                    </Button>
                  </div>
                </SettingsCard>

              </div>
            </section>
          </div>

          <ResetCycleConfirmDialog
            open={resetDialogOpen}
            onOpenChange={setResetDialogOpen}
            onConfirm={handleClearAll}
            userId={user?.id || ''}
          />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Settings;
