
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Definindo o tipo para as configurações do usuário
interface UserSettings {
  subjects_per_day: number;
  notifications_enabled: boolean;
  notification_time: string;
}

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    subjects_per_day: 3,
    notifications_enabled: true,
    notification_time: "08:00"
  });
  
  // Buscar configurações do usuário ao carregar a página
  useEffect(() => {
    if (user) {
      fetchUserSettings();
    }
  }, [user]);
  
  const fetchUserSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setSettings({
          subjects_per_day: data.subjects_per_day,
          notifications_enabled: data.notifications_enabled,
          notification_time: data.notification_time
        });
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar suas configurações",
        variant: "destructive"
      });
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
  
  const handleSaveSettings = async () => {
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
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso",
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar suas configurações",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Configurações</h1>
      
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl">Planejamento de Estudos</CardTitle>
          <p className="text-sm text-gray-600">
            Personalize como você organiza seus estudos diários.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Quantidade de Matérias por Dia: {settings.subjects_per_day}</h3>
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
              <h3 className="font-medium mb-3">Organização da Sequência de Matérias</h3>
              <Button variant="outline" className="mr-2">
                Ir para Gerenciar Matérias
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                A ordem das matérias é definida na seção "Gerenciamento de Matérias".
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl">Notificações</CardTitle>
          <p className="text-sm text-gray-600">
            Configure os lembretes de estudo e revisão.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Ativar notificações de estudo</h3>
              <p className="text-sm text-gray-500">
                Receba lembretes para suas sessões de estudo
              </p>
            </div>
            <Switch 
              checked={settings.notifications_enabled}
              onCheckedChange={handleNotificationsToggle}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notification-time">Horário da Notificação Principal</Label>
            <Input 
              id="notification-time"
              type="time"
              value={settings.notification_time}
              onChange={handleNotificationTimeChange}
              className="max-w-[200px]"
            />
          </div>
          
          <Button 
            className="mt-4 bg-app-blue hover:bg-app-light-blue"
            onClick={handleSaveSettings}
            disabled={isSaving}
          >
            {isSaving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
