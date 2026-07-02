import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Bell, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { GradientButton } from '@/components/ui';
import { useCycleState } from '@/hooks/useCycleState';
import { useApp } from '@/contexts/AppContext';
import { ReviewProfile, UserSettings } from '@/types/study';
import { motion } from 'framer-motion';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ResetCycleConfirmDialog } from '@/components/ResetCycleConfirmDialog';
import { errorService } from '@/lib/errors/errorService';
import { toastGate } from '@/lib/errors/toastGate';
import { withTimeout } from '@/utils/withTimeout';

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

// ═══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════
const Settings = () => {
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

  const { isLoading: isCycleLoading, fetchUserCycle } = useCycleState();
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
      const { data, error } = await withTimeout(
        supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        12000,
        'Carregamento de configuracoes'
      );

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
        const { error: insertError } = await withTimeout(
          supabase
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
            }),
          12000,
          'Criacao de configuracoes'
        );
        if (insertError) throw insertError;
      }
    } catch (err: unknown) {
      console.error('Erro ao buscar configurações:', err);
      setError('Não foi possível carregar suas configurações.');
      errorService.report(err, { module: 'settings', action: 'fetch', userMessage: "Erro ao carregar configurações" });
    } finally {
      setIsLoading(false);
    }
  };



  // ─── Handlers ─────────────────────────────────────────




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
    } catch (err: unknown) {
      errorService.report(err, { module: 'settings', action: 'save_notifications', userMessage: "Erro ao salvar notificações" });
    } finally {
      setIsSaving(false);
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
      await supabase.from('study_cycles_v2').delete().eq('user_id', user.id);
      await supabase.from('general_notes').delete().eq('user_id', user.id);
      
      // Também excluir user_editais (Agrupamentos/Editais importados)
      await supabase.from('user_editais').delete().eq('user_id', user.id);

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
              <div className="grid max-w-md grid-cols-1 gap-4">



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
