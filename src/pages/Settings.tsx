import React, { useState, useEffect } from 'react';
import { User, Bell, Palette, Database, RotateCcw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GlassCard, AnimatedTitle, GradientButton } from '@/components/ui';
import { useCycleState } from '@/hooks/useCycleState';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserSettings {
  subjectsPerDay: number;
  notificationsEnabled: boolean;
  notificationTime: string;
}

interface UserProfile {
  name: string;
  email: string;
  phone: string;
}

const Settings = () => {
  const { user } = useAuth();
  const { cycleState, resetCycles, loadCycleData } = useCycleState();
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    phone: ''
  });
  const [settings, setSettings] = useState<UserSettings>({
    subjectsPerDay: 3,
    notificationsEnabled: true,
    notificationTime: '08:00'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadUserData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Buscar perfil do usuário
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Buscar configurações do usuário
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (settingsError) throw settingsError;

      // Atualizar estados
      if (profileData) {
        setProfile({
          name: profileData.name || '',
          email: profileData.email || '',
          phone: profileData.phone || ''
        });
      }

      if (settingsData) {
        setSettings({
          subjectsPerDay: settingsData.subjects_per_day,
          notificationsEnabled: settingsData.notifications_enabled,
          notificationTime: settingsData.notification_time
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do usuário');
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: profile.name,
          phone: profile.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Perfil atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast.error('Erro ao salvar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const saveSettings = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({
          subjects_per_day: settings.subjectsPerDay,
          notifications_enabled: settings.notificationsEnabled,
          notification_time: settings.notificationTime,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Configurações salvas com sucesso');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetCycles = async () => {
    try {
      await resetCycles();
      toast.success('Ciclos resetados com sucesso');
    } catch (error) {
      console.error('Erro ao resetar ciclos:', error);
      toast.error('Erro ao resetar ciclos');
    }
  };

  useEffect(() => {
    loadUserData();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-app-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatedTitle>Configurações</AnimatedTitle>

      {/* Perfil do Usuário */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <User className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Perfil do Usuário</h3>
        </div>
        
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="Seu nome"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500">O e-mail não pode ser alterado</p>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>
          
          <GradientButton 
            onClick={saveProfile}
            disabled={isSaving}
            className="mt-4"
          >
            {isSaving ? 'Salvando...' : 'Salvar Perfil'}
          </GradientButton>
        </div>
      </GlassCard>

      {/* Configurações de Estudo */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold">Configurações de Estudo</h3>
        </div>
        
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="subjectsPerDay">Matérias por dia</Label>
            <Input
              id="subjectsPerDay"
              type="number"
              min="1"
              max="10"
              value={settings.subjectsPerDay}
              onChange={(e) => setSettings({ ...settings, subjectsPerDay: parseInt(e.target.value) || 1 })}
            />
            <p className="text-xs text-gray-500">Número de matérias a estudar por dia</p>
          </div>
          
          <GradientButton 
            onClick={saveSettings}
            disabled={isSaving}
            className="mt-4"
          >
            {isSaving ? 'Salvando...' : 'Salvar Configurações'}
          </GradientButton>
        </div>
      </GlassCard>

      {/* Configurações de Notificação */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="h-5 w-5 text-yellow-600" />
          <h3 className="text-lg font-semibold">Notificações</h3>
        </div>
        
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ativar notificações</Label>
              <p className="text-xs text-gray-500">Receber lembretes de estudo</p>
            </div>
            <Switch
              checked={settings.notificationsEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, notificationsEnabled: checked })}
            />
          </div>
          
          {settings.notificationsEnabled && (
            <div className="grid gap-2">
              <Label htmlFor="notificationTime">Horário das notificações</Label>
              <Input
                id="notificationTime"
                type="time"
                value={settings.notificationTime}
                onChange={(e) => setSettings({ ...settings, notificationTime: e.target.value })}
              />
            </div>
          )}
          
          <GradientButton 
            onClick={saveSettings}
            disabled={isSaving}
            className="mt-4"
          >
            {isSaving ? 'Salvando...' : 'Salvar Notificações'}
          </GradientButton>
        </div>
      </GlassCard>

      {/* Informações dos Ciclos */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold">Gerenciamento de Ciclos</h3>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{cycleState.completedCycles}</p>
              <p className="text-sm text-blue-700">Ciclos Totais</p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{cycleState.completedSubjects}</p>
              <p className="text-sm text-green-700">Disciplinas do Ciclo Atual</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{cycleState.totalSubjects}</p>
              <p className="text-sm text-purple-700">Total de Disciplinas</p>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Progresso do Ciclo Atual:</span>
              <span className="text-sm font-medium">
                {cycleState.completedSubjects}/{cycleState.totalSubjects}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                style={{ 
                  width: `${cycleState.totalSubjects > 0 ? (cycleState.completedSubjects / cycleState.totalSubjects) * 100 : 0}%` 
                }}
              ></div>
            </div>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <GradientButton 
                variant="outline"
                className="w-full mt-4 text-red-600 border-red-200 hover:bg-red-50"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Resetar Ciclos
              </GradientButton>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Resetar Ciclos</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá resetar todos os ciclos concluídos e o progresso atual do ciclo. 
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleResetCycles}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  Resetar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </GlassCard>
    </div>
  );
};

export default Settings;
