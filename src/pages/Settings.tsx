import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw } from 'lucide-react';
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
import { motion } from 'framer-motion';
import { TooltipProvider } from '@/components/ui/tooltip';

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
    if (!user || !userCycle) return;

    setIsResettingCycle(true);
    try {
      await resetCycle();
      toast.success("Ciclo resetado com sucesso");
    } catch (err: any) {
      console.error('Erro ao resetar ciclo:', err);
      toast.error("Não foi possível resetar o ciclo");
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
        
        // 2. Deletar tópicos das matérias do usuário
        if (subjectIds.length > 0) {
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
          checkHasReviews() // Atualiza o estado de revisões
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
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-app-blue" />
        <span className="ml-2">Carregando configurações...</span>
      </div>
    );
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="estudos">Estudos</TabsTrigger>
              <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
              <TabsTrigger value="sistema">Sistema</TabsTrigger>
            </TabsList>

            {/* Aba Estudos */}
            <TabsContent value="estudos" className="space-y-4">
              <GlassCard className="p-6">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">Perfil de Revisão</h2>
                    <p className="text-sm text-muted-foreground">
                      Escolha o perfil que melhor se adapta ao seu ritmo de estudos e experiência.
                    </p>
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
                        <strong>Perfil bloqueado:</strong> Você possui revisões em andamento. 
                        Complete todas as revisões para alterar o perfil.
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
                          onClick={() => window.location.href = '/materias'}
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
                              {format(new Date(userCycle.data_inicio_ciclo), 'dd/MM/yyyy')}
                            </span>
                          </div>
                          {userCycle.data_fim_ciclo && (
                            <div>
                              <span className="font-medium">Data Último Ciclo: </span>
                              <span className="text-muted-foreground">
                                {format(new Date(userCycle.data_fim_ciclo), 'dd/MM/yyyy')}
                              </span>
                            </div>
                          )}
                        </div>
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

            {/* Aba Sistema */}
            <TabsContent value="sistema" className="space-y-4">
              <GlassCard className="p-6">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">Gerenciar Dados</h2>
                    <p className="text-sm text-muted-foreground">
                      Reinicie seu ambiente de estudos.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="p-3 border border-yellow-200 bg-yellow-50/50 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Atenção:</strong> Estas ações não podem ser desfeitas!
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Button
                        variant="outline"
                        className="w-full justify-start border-blue-500 text-blue-700 hover:bg-blue-50"
                        onClick={async () => {
                          if (!user) {
                            toast.error("Usuário não autenticado.");
                            return;
                          }
                          if (window.confirm("Tem certeza que deseja limpar apenas as revisões? As matérias e tópicos serão mantidos, mas todo o progresso será zerado.")) {
                            try {
                              console.log('🔄 Iniciando reset das revisões para usuário:', user.id);
                              
                              const { data: subjectsData, error: subjectsError } = await supabase
                                .from('subjects')
                                .select('id')
                                .eq('user_id', user.id);
                              if (subjectsError) throw subjectsError;
                              const subjectIds = (subjectsData || []).map(s => s.id);
                              
                              if (subjectIds.length > 0) {
                                await supabase
                                  .from('topics')
                                  .update({
                                    review_stage: null,
                                    review_count: 0,
                                    next_review: null,
                                    last_reviewed_at: null,
                                    completed: false
                                  })
                                  .in('subject_id', subjectIds);
                              }
                              
                              await supabase
                                .from('subjects')
                                .update({ status: 'Nova' })
                                .eq('user_id', user.id);
                              
                              await supabase
                                .from('user_cycles')
                                .update({
                                  ciclo_atual: [],
                                  disciplinas_do_dia: [],
                                  ciclos_realizados: 0,
                                  data_inicio_ciclo: null,
                                  data_fim_ciclo: null
                                })
                                .eq('user_id', user.id);
                              
                              toast.success("Revisões limpos!");
                              setTimeout(() => window.location.reload(), 1000);
                            } catch (err) {
                              console.error('Erro ao limpar revisões:', err);
                              toast.error("Erro ao limpar revisões.");
                            }
                          }
                        }}
                      >
                        Limpar Apenas Revisões
                      </Button>

                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={handleClearAll}
                      >
                        Limpar Tudo (Matérias + Revisões)
                      </Button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Settings;
