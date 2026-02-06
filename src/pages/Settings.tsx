import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/lib/toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { GlassCard, AnimatedTitle, GradientButton } from '@/components/ui';
import { format, startOfDay, isBefore } from 'date-fns';
import { useCycleState } from '@/hooks/useCycleState';
import { useApp } from '@/contexts/AppContext';
import { ReviewProfile, REVIEW_PROFILES, UserSettings } from '@/types/study';
import { ProfileSelector } from '@/components/ProfileSelector';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Check } from "lucide-react";
// Removido hook de visibilidade que causava recarregamentos
import { motion } from 'framer-motion';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ResetCycleConfirmDialog } from '@/components/ResetCycleConfirmDialog';


interface UserCycle {
  id: string;
  user_id: string;
  ciclo_atual: string[];
  disciplinas_do_dia: string[];
  ciclos_realizados: number;
  data_inicio_ciclo: string;
  data_fim_ciclo: string | null;
  atualizado_em: string;
  created_at: string;
}

const Settings = () => {
  // Removido hook de visibilidade problemático

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
  const [hasReviews, setHasReviews] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Use the custom hook for cycle management
  const { userCycle, isLoading: isCycleLoading, fetchUserCycle, resetCycle } = useCycleState();
  const [isResettingCycle, setIsResettingCycle] = useState(false);

  const { fetchUserSettings: fetchUserSettingsContext, refreshData } = useApp();

  // Buscar configurações do usuário ao carregar a página
  useEffect(() => {
    if (user) {
      fetchUserSettings();
      checkHasReviews();
    } else {
      setIsLoading(false);
    }
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
          id: '', // Campo removido da tabela user_settings
          user_id: data.user_id || '',
          review_profile: data.review_profile as ReviewProfile,
          subjects_per_day: data.subjects_per_day,
          notifications_enabled: data.notifications_enabled,
          notification_time: data.notification_time,
          created_at: data.created_at || '',
          updated_at: data.updated_at || ''
        } as UserSettings);
      } else {
        // Create default settings if none exist
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
      setError('Não foi possível carregar suas configurações. Por favor, tente novamente mais tarde.');
      toast.error("Erro ao carregar configurações");
    } finally {
      setIsLoading(false);
    }
  };

  const checkHasReviews = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('topics')
      .select('id, subject_id, subjects!inner(user_id)')
      .eq('subjects.user_id', user.id)
      .gt('review_count', 0)
      .limit(1);
    if (error) {
      setHasReviews(false);
    }
    setHasReviews(data && data.length > 0);
  };

  const handleResetCycle = async () => {
    if (!user) {
      console.error('❌ Usuário não encontrado para reset');
      return;
    }

    console.log('🔄 Iniciando handleResetCycle...');
    setIsResettingCycle(true);
    try {
      console.log('🔄 Chamando resetCycle...');
      await resetCycle();

      console.log('✅ resetCycle executado com sucesso');

      // Atualizar todos os dados da aplicação
      console.log('🔄 Atualizando dados da aplicação...');
      await Promise.all([
        refreshData(), // Atualiza o contexto global
        fetchUserSettingsContext(), // Atualiza as configurações
        checkHasReviews() // Atualiza o estado de revisões
      ]);

      console.log('✅ Dados atualizados com sucesso');
      toast.success("Ciclo e revisões resetados com sucesso! Todas as matérias voltaram ao status inicial.");

      // Recarregar a página após um pequeno delay para garantir que todos os estados foram atualizados
      setTimeout(() => {
        console.log('🔄 Recarregando página...');
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error('❌ Erro ao resetar ciclo:', err);
      toast.error(`Não foi possível resetar o ciclo: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setIsResettingCycle(false);
    }
  };

  const handleNotificationsToggle = (checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications_enabled: checked
    }));
  };

  const handleSubjectsPerDayChange = async (value: number[]) => {
    const newValue = value[0];
    console.log('🔧 Mudando subjects_per_day de', settings.subjects_per_day, 'para', newValue);

    setSettings(prev => ({
      ...prev,
      subjects_per_day: newValue
    }));

    // Salvar imediatamente no banco de dados
    if (user) {
      try {
        const { error } = await supabase
          .from('user_settings')
          .update({
            subjects_per_day: newValue,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (error) throw error;

        console.log('✅ subjects_per_day salvo no banco:', newValue);

        // Atualizar o contexto global imediatamente
        await fetchUserSettingsContext();

        toast.success(`Agora você estudará ${newValue} matéria${newValue > 1 ? 's' : ''} por dia`);
      } catch (err) {
        console.error('Erro ao salvar subjects_per_day:', err);
        toast.error("Não foi possível atualizar a configuração");
        // Reverter o valor local se houve erro
        setSettings(prev => ({
          ...prev,
          subjects_per_day: settings.subjects_per_day
        }));
      }
    }
  };

  const handleNotificationTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({
      ...prev,
      notification_time: e.target.value
    }));
  };

  const handleProfileChange = async (newProfile: ReviewProfile) => {
    if (hasReviews) return;
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({ review_profile: newProfile })
        .eq('user_id', user?.id);

      if (error) throw error;

      setSettings(prev => ({
        ...prev,
        review_profile: newProfile
      }));
      toast.success("Perfil de revisão atualizado com sucesso!");
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error("Erro ao atualizar perfil de revisão");
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;

    setIsSaving(true);
    setError(null);

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

      // Atualizar o contexto global imediatamente
      await fetchUserSettingsContext();
      toast.success("Configurações salvas com sucesso");
    } catch (err: any) {
      console.error('Erro ao salvar configurações:', err);
      setError('Não foi possível salvar suas configurações. Por favor, tente novamente mais tarde.');
      toast.error("Não foi possível salvar suas configurações");
    } finally {
      setIsSaving(false);
    }
  };

  // Calcular disciplinas concluídas do ciclo atual
  const disciplinasConcluidas = userCycle?.ciclo_atual?.length || 0;

  const handleClearAll = async () => {
    if (!user) {
      toast.error("Usuário não autenticado.");
      return;
    }

    if (window.confirm("Tem certeza que deseja excluir TODAS as matérias, tópicos e revisões? Esta ação não pode ser desfeita!")) {
      try {
        console.log('🧹 Iniciando limpeza completa do sistema para usuário:', user.id);

        // 1. Buscar todas as matérias do usuário
        const { data: userSubjects, error: subjectsError } = await supabase
          .from('subjects')
          .select('id')
          .eq('user_id', user.id);

        if (subjectsError) throw subjectsError;

        const subjectIds = (userSubjects || []).map(s => s.id);
        console.log('🧹 Matérias encontradas:', subjectIds.length);

        // 2. Buscar e Deletar Tópicos e seu Histórico
        if (subjectIds.length > 0) {
          // Buscar IDs dos tópicos para deletar histórico
          const { data: userTopics, error: fetchTopicsError } = await supabase
            .from('topics')
            .select('id')
            .in('subject_id', subjectIds);

          if (fetchTopicsError) throw fetchTopicsError;

          const topicIds = (userTopics || []).map(t => t.id);

          if (topicIds.length > 0) {
            // 2.1 Deletar histórico de revisões
            const { error: historyError } = await supabase
              .from('topic_review_history')
              .delete()
              .in('topic_id', topicIds);

            if (historyError) throw historyError;
            console.log('🧹 Histórico de revisões deletado');
          }

          // 2.2 Deletar tópicos
          const { error: topicsError } = await supabase
            .from('topics')
            .delete()
            .in('subject_id', subjectIds);

          if (topicsError) throw topicsError;
          console.log('🧹 Tópicos deletados');
        }

        // 3. Deletar matérias do usuário
        const { error: subjectsDeleteError } = await supabase
          .from('subjects')
          .delete()
          .eq('user_id', user.id);

        if (subjectsDeleteError) throw subjectsDeleteError;
        console.log('🧹 Matérias deletadas');

        // 4. Deletar ciclos do usuário
        const { error: cyclesError } = await supabase
          .from('user_cycles')
          .delete()
          .eq('user_id', user.id);

        if (cyclesError) throw cyclesError;
        console.log('🧹 Ciclos deletados');

        // 5. Deletar sessões de estudo do usuário
        const { error: sessionsError } = await supabase
          .from('study_sessions')
          .delete()
          .eq('user_id', user.id);

        if (sessionsError) throw sessionsError;
        console.log('🧹 Sessões deletadas');

        // 6. Atualizar estados locais e contextos
        await Promise.all([
          refreshData(), // Atualiza o contexto global
          fetchUserCycle(), // Atualiza o ciclo do usuário
          fetchUserSettingsContext(), // Atualiza as configurações
        ]);

        toast.success("Sistema limpo com sucesso!");

        // Recarregar a página após um pequeno delay para garantir que todos os estados foram atualizados
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (err) {
        console.error('Erro ao limpar sistema:', err);
        toast.error("Ocorreu um erro ao tentar limpar o sistema. Tente novamente.");
      }
    }
  };

  if (isLoading || isCycleLoading) {
    return <LoadingSpinner message="Carregando configurações..." />;
  }

  function agruparPorMateria(topics) {
    const materias = {};
    topics.forEach(topic => {
      if (!materias[topic.subject_name]) materias[topic.subject_name] = [];
      materias[topic.subject_name].push(topic);
    });
    return materias;
  }

  function separarPorStatus(topics) {
    const hoje = startOfDay(new Date());
    return {
      atrasados: topics.filter(t => t.next_review && isBefore(startOfDay(new Date(t.next_review)), hoje)),
      hoje: topics.filter(t => t.next_review && startOfDay(new Date(t.next_review)).getTime() === hoje.getTime()),
      futuras: topics.filter(t => t.next_review && new Date(t.next_review) > hoje && startOfDay(new Date(t.next_review)).getTime() !== hoje.getTime()),
    };
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
            className="mb-6"
          >
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Configurações
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie suas preferências de estudo e conta
            </p>
          </motion.div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="estudos" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="estudos">Estudos</TabsTrigger>
              <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
              <TabsTrigger value="informacoes">Informações</TabsTrigger>
              <TabsTrigger value="sistema">Sistema</TabsTrigger>
            </TabsList>

            {/* Aba Estudos */}
            <TabsContent value="estudos" className="space-y-4">
              <GlassCard className="p-6">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">Perfil de Revisão</h2>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Escolha o perfil que melhor se adapta ao seu ritmo de estudos e experiência.
                      </p>
                      <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                        <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span>Atenção: Depois que a primeira revisão for marcada, o perfil ficará bloqueado para alterações. Para mudar de perfil, use o botão "Limpar Apenas Revisões" na aba Sistema.</span>
                      </div>
                    </div>
                  </div>

                  <div className="max-w-2xl">
                    <ProfileSelector
                      selected={settings?.review_profile}
                      onSelect={handleProfileChange}
                      onboarding={false}
                      disabled={hasReviews}
                    />
                    {hasReviews && (
                      <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded text-sm">
                        <strong>Perfil bloqueado:</strong> Há revisões em andamento.
                        Para alterar o perfil, use "Limpar Apenas Revisões" na aba Sistema.
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
              <div className="grid gap-4 md:grid-cols-2">
                <GlassCard className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-semibold">Planejamento</h2>
                      <p className="text-sm text-muted-foreground">
                        Configure seus estudos diários.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium mb-2">
                          Matérias por dia: {settings.subjects_per_day}
                        </h3>
                        <Slider
                          value={[settings.subjects_per_day]}
                          max={10}
                          min={1}
                          step={1}
                          onValueChange={handleSubjectsPerDayChange}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Mudanças aplicadas imediatamente
                        </p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium mb-2">Organizar Matérias</h3>
                        <GradientButton
                          className="w-full"
                          onClick={() => navigate('/materias')}
                        >
                          Gerenciar Matérias
                        </GradientButton>
                      </div>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-semibold">Progresso do Ciclo</h2>
                      <p className="text-sm text-muted-foreground">
                        Acompanhe suas estatísticas.
                      </p>
                    </div>

                    {userCycle ? (
                      <div className="space-y-4">
                        <div className="text-center p-3 bg-primary/10 rounded-lg">
                          <div className="text-2xl font-bold text-primary">{userCycle.ciclos_realizados || 0}</div>
                          <div className="text-sm text-muted-foreground">Total de ciclos</div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Data Início: </span>
                            <span className="text-muted-foreground">
                              {userCycle.data_inicio_ciclo ? format(new Date(userCycle.data_inicio_ciclo), 'dd/MM/yyyy') : 'Não iniciado'}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Data Último Ciclo: </span>
                            <span className="text-muted-foreground">
                              {userCycle.data_fim_ciclo ? format(new Date(userCycle.data_fim_ciclo), 'dd/MM/yyyy') : 'Nenhum ciclo concluído'}
                            </span>
                          </div>
                        </div>

                        <Button
                          variant="destructive"
                          onClick={handleResetCycle}
                          disabled={isResettingCycle}
                          className="w-full"
                          size="sm"
                        >
                          {isResettingCycle ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Resetando...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Resetar Ciclo
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground text-sm">Nenhum ciclo encontrado</p>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </div>
            </TabsContent>

            {/* Aba Notificações */}
            <TabsContent value="notificacoes" className="space-y-4">
              <GlassCard className="p-6">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">Lembretes</h2>
                    <p className="text-sm text-muted-foreground">
                      Configure suas notificações de estudo.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium">Notificações ativas</h3>
                        <p className="text-xs text-muted-foreground">
                          Receba lembretes para estudar
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifications_enabled}
                        onCheckedChange={handleNotificationsToggle}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notification-time" className="text-sm">Horário Principal</Label>
                      <Input
                        id="notification-time"
                        type="time"
                        value={settings.notification_time}
                        onChange={handleNotificationTimeChange}
                        className="max-w-[160px]"
                      />
                    </div>

                    <div className="pt-2">
                      <GradientButton
                        onClick={handleSaveSettings}
                        disabled={isSaving}
                        className="w-full"
                      >
                        {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                      </GradientButton>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </TabsContent>

            {/* Aba Informações */}
            <TabsContent value="informacoes" className="space-y-4">
              <GlassCard className="p-6">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold">Como Funcionam as Porcentagens</h2>
                    <p className="text-sm text-muted-foreground">
                      Entenda como são calculadas as porcentagens de progresso das suas matérias.
                    </p>
                  </div>

                  {/* Categorização Geral */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">Categorias de Status</h3>
                    <div className="grid gap-3">
                      <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                        <span className="text-2xl">🎯</span>
                        <div>
                          <div className="font-medium text-emerald-800 dark:text-emerald-200">100% - Dominada</div>
                          <div className="text-sm text-emerald-600 dark:text-emerald-400">Todas as revisões do perfil foram completadas</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <span className="text-2xl">⚡</span>
                        <div>
                          <div className="font-medium text-blue-800 dark:text-blue-200">60-99% - Progredindo</div>
                          <div className="text-sm text-blue-600 dark:text-blue-400">Boa parte das revisões já foi feita</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                        <span className="text-2xl">⚠️</span>
                        <div>
                          <div className="font-medium text-orange-800 dark:text-orange-200">40-59% - Precisa Atenção</div>
                          <div className="text-sm text-orange-600 dark:text-orange-400">Algumas revisões feitas, mas precisa de mais foco</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <span className="text-2xl">🚨</span>
                        <div>
                          <div className="font-medium text-red-800 dark:text-red-200">0-39% - Crítica</div>
                          <div className="text-sm text-red-600 dark:text-red-400">Poucas ou nenhuma revisão feita</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Perfis de Revisão */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">Porcentagens por Perfil de Revisão</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Cada perfil tem um número diferente de revisões, o que afeta como a porcentagem é calculada.
                    </p>

                    <div className="grid gap-4 md:grid-cols-3">
                      {/* Iniciante */}
                      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">🌟</span>
                          <h4 className="font-medium">Iniciante</h4>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          6 revisões por tópico
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>6/6 revisões:</span>
                            <span className="font-medium text-emerald-600">100% 🎯</span>
                          </div>
                          <div className="flex justify-between">
                            <span>4-5 revisões:</span>
                            <span className="font-medium text-blue-600">67-83% ⚡</span>
                          </div>
                          <div className="flex justify-between">
                            <span>2-3 revisões:</span>
                            <span className="font-medium text-orange-600">33-50% ⚠️</span>
                          </div>
                          <div className="flex justify-between">
                            <span>0-1 revisões:</span>
                            <span className="font-medium text-red-600">0-17% 🚨</span>
                          </div>
                        </div>
                      </div>

                      {/* Intermediário */}
                      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">🚀</span>
                          <h4 className="font-medium">Intermediário</h4>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          4 revisões por tópico
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>4/4 revisões:</span>
                            <span className="font-medium text-emerald-600">100% 🎯</span>
                          </div>
                          <div className="flex justify-between">
                            <span>3 revisões:</span>
                            <span className="font-medium text-blue-600">75% ⚡</span>
                          </div>
                          <div className="flex justify-between">
                            <span>2 revisões:</span>
                            <span className="font-medium text-orange-600">50% ⚠️</span>
                          </div>
                          <div className="flex justify-between">
                            <span>0-1 revisões:</span>
                            <span className="font-medium text-red-600">0-25% 🚨</span>
                          </div>
                        </div>
                      </div>

                      {/* Avançado */}
                      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">💎</span>
                          <h4 className="font-medium">Avançado</h4>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          3 revisões por tópico
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>3/3 revisões:</span>
                            <span className="font-medium text-emerald-600">100% 🎯</span>
                          </div>
                          <div className="flex justify-between">
                            <span>2 revisões:</span>
                            <span className="font-medium text-blue-600">67% ⚡</span>
                          </div>
                          <div className="flex justify-between">
                            <span>1 revisão:</span>
                            <span className="font-medium text-orange-600">33% ⚠️</span>
                          </div>
                          <div className="flex justify-between">
                            <span>0 revisões:</span>
                            <span className="font-medium text-red-600">0% 🚨</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Como é Calculado */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">Como é Calculado</h3>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="space-y-3 text-sm">
                        <div>
                          <strong>1. Para cada tópico:</strong> (Revisões feitas ÷ Revisões do perfil) × 100
                        </div>
                        <div>
                          <strong>2. Para a matéria:</strong> Média de todos os tópicos
                        </div>
                        <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                          <strong>Exemplo:</strong> Matéria com 2 tópicos (Perfil Intermediário)
                          <br />
                          • Tópico A: 4/4 revisões = 100%
                          <br />
                          • Tópico B: 2/4 revisões = 50%
                          <br />
                          • <strong>Resultado:</strong> (100% + 50%) ÷ 2 = 75% - Progredindo ⚡
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </TabsContent>

            {/* Aba Sistema */}
            <TabsContent value="sistema" className="space-y-4">
              <GlassCard className="p-6">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold">Gerenciar Dados</h2>
                    <p className="text-sm text-muted-foreground">
                      Reinicie seu ambiente de estudos.
                    </p>
                  </div>

                  {/* Botão Limpar Apenas Revisões */}
                  <div className="space-y-3">
                    <div className="p-4 border border-blue-200 bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-800 rounded-lg">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        Limpar Apenas Revisões
                      </h3>
                      <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                        Remove o progresso de revisões mas mantém suas matérias e tópicos intactos.
                      </p>
                      <Button
                        variant="outline"
                        className="w-full justify-start border-blue-500 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/40"
                        onClick={async () => {
                          if (!user) {
                            toast.error("Usuário não autenticado.");
                            return;
                          }
                          if (window.confirm("Tem certeza que deseja limpar apenas as revisões? As matérias e tópicos serão mantidos, mas todo o progresso será zerado.")) {
                            try {
                              console.log('🔄 Iniciando reset das revisões para usuário:', user.id);

                              // 1. Buscar todas as matérias do usuário
                              const { data: subjectsData, error: subjectsError } = await supabase
                                .from('subjects')
                                .select('id')
                                .eq('user_id', user.id);
                              if (subjectsError) throw subjectsError;
                              const subjectIds = (subjectsData || []).map(s => s.id);
                              console.log('🔄 Matérias encontradas:', subjectIds.length);

                              // 2. Resetar TODOS os campos de revisão dos tópicos
                              if (subjectIds.length > 0) {
                                const { error: topicsError } = await supabase
                                  .from('topics')
                                  .update({
                                    review_stage: null,
                                    review_count: 0,
                                    next_review: null,
                                    last_reviewed_at: null,
                                    completed: false,
                                    updated_at: new Date().toISOString()
                                  })
                                  .in('subject_id', subjectIds);

                                if (topicsError) throw topicsError;
                                console.log('✅ Tópicos resetados');
                              }

                              // 3. Resetar status das matérias
                              const { error: subjectsUpdateError } = await supabase
                                .from('subjects')
                                .update({
                                  status: 'Nova',
                                  updated_at: new Date().toISOString()
                                })
                                .eq('user_id', user.id);

                              if (subjectsUpdateError) throw subjectsUpdateError;
                              console.log('✅ Status das matérias resetado');

                              // 4. Resetar COMPLETAMENTE o ciclo do usuário
                              const { error: cycleError } = await supabase
                                .from('user_cycles')
                                .update({
                                  ciclo_atual: [],
                                  disciplinas_do_dia: [],
                                  materias_estudadas_ciclo: [], // CRÍTICO: Limpar matérias estudadas
                                  ciclos_realizados: 0,
                                  data_inicio_ciclo: null,
                                  data_fim_ciclo: null,
                                  atualizado_em: new Date().toISOString()
                                })
                                .eq('user_id', user.id);

                              if (cycleError) throw cycleError;
                              console.log('✅ Ciclo resetado completamente');

                              // 5. Deletar sessões de estudo (opcional, mas recomendado)
                              const { error: sessionsError } = await supabase
                                .from('study_sessions')
                                .delete()
                                .eq('user_id', user.id);

                              if (sessionsError) {
                                console.warn('⚠️ Erro ao deletar sessões (não crítico):', sessionsError);
                              } else {
                                console.log('✅ Sessões de estudo deletadas');
                              }

                              // 6. CRÍTICO: Limpar estado global do frontend
                              console.log('🔄 Limpando estado global...');

                              // Importar e usar as funções do cycleState
                              const { updateStudiedSubjects, resetCycle } = await import('@/utils/cycleState');
                              updateStudiedSubjects([]); // Limpar matérias estudadas
                              resetCycle(0); // Resetar para ciclo 0

                              // 7. Disparar eventos para atualizar componentes
                              console.log('🔄 Disparando eventos de atualização...');
                              window.dispatchEvent(new CustomEvent('cycleUpdated', {
                                detail: {
                                  isReset: true,
                                  reason: 'reviewsCleared',
                                  timestamp: Date.now()
                                }
                              }));

                              // 8. Atualizar dados da aplicação
                              await Promise.all([
                                refreshData(),
                                fetchUserCycle(),
                                fetchUserSettingsContext(),
                              ]);

                              toast.success("Revisões limpas com sucesso! O sistema foi reiniciado.");

                              setTimeout(() => {
                                console.log('🔄 Recarregando página...');
                                window.location.reload();
                              }, 1500);

                            } catch (err) {
                              console.error('❌ Erro ao limpar revisões:', err);
                              toast.error(`Erro ao limpar revisões: ${err.message || 'Erro desconhecido'}`);
                            }
                          }
                        }}
                      >
                        Limpar Apenas Revisões
                      </Button>
                    </div>
                  </div>

                  {/* Zona de Perigo */}
                  <div className="p-4 border-2 border-destructive/50 bg-destructive/5 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                      <h3 className="font-semibold text-destructive">
                        Zona de Perigo
                      </h3>
                    </div>
                    <p className="text-sm text-destructive/80">
                      Esta ação irá remover <strong>permanentemente</strong> todas as suas matérias, tópicos, revisões e anotações. Não há como desfazer.
                    </p>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => setResetDialogOpen(true)}
                    >
                      ⚠️ Reset Completo (Irreversível)
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </TabsContent>


          </Tabs>

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
