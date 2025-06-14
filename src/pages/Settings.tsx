import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { GlassCard, AnimatedTitle, GradientButton } from '@/components/ui';
import { format } from 'date-fns';
import { useCycleState } from '@/hooks/useCycleState';
import { useApp } from '@/contexts/AppContext';
import { ReviewProfile, REVIEW_PROFILES, UserSettings } from '@/types/study';
import { ProfileSelector } from '@/components/ProfileSelector';

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
  const { toast } = useToast();
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
          id: data.id || '',
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
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar configurações"
      });
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
      toast({
        title: "Sucesso",
        description: "Ciclo resetado com sucesso"
      });
    } catch (err: any) {
      console.error('Erro ao resetar ciclo:', err);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível resetar o ciclo"
      });
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
  
  const handleSubjectsPerDayChange = (value: number[]) => {
    setSettings(prev => ({
      ...prev,
      subjects_per_day: value[0]
    }));
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
      toast({
        title: "Sucesso",
        description: "Perfil de revisão atualizado com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao atualizar perfil de revisão"
      });
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
      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso"
      });
    } catch (err: any) {
      console.error('Erro ao salvar configurações:', err);
      setError('Não foi possível salvar suas configurações. Por favor, tente novamente mais tarde.');
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar suas configurações"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Calcular disciplinas concluídas do ciclo atual
  const disciplinasConcluidas = userCycle?.ciclo_atual?.length || 0;
  
  const handleClearAll = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Usuário não autenticado."
      });
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
        
        toast({
          title: "Sucesso",
          description: "Sistema limpo com sucesso!"
        });
        
        // Recarregar a página após um pequeno delay para garantir que todos os estados foram atualizados
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (err) {
        console.error('Erro ao limpar sistema:', err);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Ocorreu um erro ao tentar limpar o sistema. Tente novamente."
        });
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
  
  return (
    <div className="space-y-6">
      <AnimatedTitle>Configurações</AnimatedTitle>
      
      {/* Perfil de Revisão */}
      <GlassCard className="p-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Perfil de Revisão</h2>
          <p className="text-sm text-gray-600">
            Escolha seu perfil de acordo com sua experiência e necessidade de revisão.
          </p>
          
          <div className="max-w-2xl">
            <ProfileSelector selected={settings?.review_profile} onSelect={handleProfileChange} onboarding={false} disabled={hasReviews} />
            {hasReviews && (
              <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded">
                Você já possui revisões em andamento. O perfil de revisão não pode ser alterado para não comprometer seu progresso.<br />
                <span className="block mt-2 text-sm text-yellow-700">Assim que concluir todas as revisões dos seus tópicos, você poderá escolher outro perfil de revisão nas configurações.</span>
              </div>
            )}
          </div>
        </div>
      </GlassCard>
      
      {/* Novo Card: Limpeza do Sistema */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-bold mb-2">Limpar Sistema</h2>
        <p className="text-sm text-gray-600 mb-4">
          Use as opções abaixo para reiniciar seu ambiente de estudos. 
          <br />
          <span className="font-semibold text-red-600">Atenção:</span> esta ação não pode ser desfeita!
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Limpar tudo */}
          <Button
            variant="destructive"
            onClick={handleClearAll}
          >
            Limpar tudo
          </Button>
          {/* Limpar apenas revisões */}
          <Button
            variant="outline"
            className="border-blue-500 text-blue-700"
            onClick={async () => {
              if (!user) {
                toast({
                  variant: "destructive",
                  title: "Erro",
                  description: "Usuário não autenticado."
                });
                return;
              }
              if (window.confirm("Tem certeza que deseja limpar apenas as revisões? As matérias e tópicos serão mantidos, mas todo o progresso será zerado.")) {
                try {
                  console.log('🔄 Iniciando reset das revisões para usuário:', user.id);
                  
                  // Buscar todas as matérias do usuário
                  const { data: subjectsData, error: subjectsError } = await supabase
                    .from('subjects')
                    .select('id')
                    .eq('user_id', user.id);
                  if (subjectsError) throw subjectsError;
                  const subjectIds = (subjectsData || []).map(s => s.id);
                  console.log('🔄 Matérias encontradas:', subjectIds.length);
                  
                  // Resetar tópicos do usuário
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
                    console.log('🔄 Tópicos resetados');
                  }
                  
                  // Resetar matérias do usuário
                  await supabase
                    .from('subjects')
                    .update({ status: 'Nova' })
                    .eq('user_id', user.id);
                  console.log('🔄 Matérias resetadas');
                  
                  // Resetar ciclos do usuário
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
                  console.log('🔄 Ciclos resetados');
                  
                  toast({
                    title: "Sucesso",
                    description: "Revisões e progresso limpos!"
                  });
                  
                  // Aguardar um pouco para garantir que a operação foi concluída
                  setTimeout(() => {
                    console.log('🔄 Recarregando página após reset');
                    window.location.reload();
                  }, 1000);
                } catch (err) {
                  console.error('Erro ao limpar revisões:', err);
                  toast({
                    variant: "destructive",
                    title: "Erro",
                    description: "Ocorreu um erro ao tentar zerar o progresso. Tente novamente."
                  });
                }
              }
            }}
          >
            Limpar apenas revisões
          </Button>
        </div>
      </GlassCard>
      
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Planejamento de Estudos</h2>
            <p className="text-sm text-gray-600">
              Personalize como você organiza seus estudos diários.
            </p>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Quantidade de Matérias por Dia: {settings.subjects_per_day}</h3>
                <Slider 
                  value={[settings.subjects_per_day]}
                  max={10}
                  min={1}
                  step={1}
                  onValueChange={handleSubjectsPerDayChange}
                  className="w-full"
                />
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-3">Organização da Sequência de Matérias</h3>
                <GradientButton 
                  className="w-full"
                  onClick={() => window.location.href = '/materias'}
                >
                  Ir para Gerenciar Matérias
                </GradientButton>
                <p className="text-xs text-gray-500 mt-2">
                  A ordem das matérias é definida na seção "Gerenciamento de Matérias".
                </p>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Informações do Ciclo</h2>
            <p className="text-sm text-gray-600">
              Acompanhe seu progresso e gerencie seus ciclos de estudo.
            </p>
            
            {userCycle ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50/70 rounded-lg">
                    <div className="text-2xl font-bold text-app-blue">{userCycle.ciclos_realizados}</div>
                    <div className="text-xs text-gray-600">Ciclos Realizados</div>
                  </div>
                  <div className="text-center p-3 bg-green-50/70 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{disciplinasConcluidas}</div>
                    <div className="text-xs text-gray-600">Disciplinas Concluídas</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Início do Ciclo Atual: </span>
                    <span className="text-gray-600">
                      {format(new Date(userCycle.data_inicio_ciclo), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="destructive"
                    onClick={handleResetCycle}
                    disabled={isResettingCycle}
                    className="w-full"
                  >
                    {isResettingCycle ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Resetando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Resetar Ciclo Completo
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    Isso irá zerar todos os ciclos realizados e reiniciar o contador.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500">Nenhum ciclo encontrado</p>
              </div>
            )}
          </div>
        </GlassCard>
        
        <GlassCard className="p-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Notificações</h2>
            <p className="text-sm text-gray-600">
              Configure os lembretes de estudo e revisão.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Ativar notificações de estudo</h3>
                  <p className="text-xs text-gray-500">
                    Receba lembretes para suas sessões de estudo
                  </p>
                </div>
                <Switch 
                  checked={settings.notifications_enabled}
                  onCheckedChange={handleNotificationsToggle}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notification-time" className="text-sm">Horário da Notificação Principal</Label>
                <Input 
                  id="notification-time"
                  type="time"
                  value={settings.notification_time}
                  onChange={handleNotificationTimeChange}
                  className="max-w-[200px]"
                />
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
      <div className="flex w-full mt-4">
        <GradientButton 
          className="w-full mx-auto max-w-2xl"
          onClick={handleSaveSettings}
          disabled={isSaving}
        >
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </GradientButton>
      </div>
    </div>
  );
};

export default Settings;
