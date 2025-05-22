import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    subjects_per_day: 3,
    notifications_enabled: true,
    notification_time: "08:00"
  });
  
  // Buscar configurações do usuário ao carregar a página
  useEffect(() => {
    if (user) {
      fetchUserSettings();
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
          subjects_per_day: data.subjects_per_day,
          notifications_enabled: data.notifications_enabled,
          notification_time: data.notification_time
        });
      } else {
        // Create default settings if none exist
        const { error: insertError } = await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            subjects_per_day: settings.subjects_per_day,
            notifications_enabled: settings.notifications_enabled,
            notification_time: settings.notification_time
          });
          
        if (insertError) throw insertError;
      }
    } catch (err: any) {
      console.error('Erro ao buscar configurações:', err);
      setError('Não foi possível carregar suas configurações. Por favor, tente novamente mais tarde.');
      toast({
        title: "Erro",
        description: "Não foi possível carregar suas configurações",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
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
    setError(null);
    
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
    } catch (err: any) {
      console.error('Erro ao salvar configurações:', err);
      setError('Não foi possível salvar suas configurações. Por favor, tente novamente mais tarde.');
      toast({
        title: "Erro",
        description: "Não foi possível salvar suas configurações",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-app-blue" />
        <span className="ml-2">Carregando configurações...</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Configurações</h1>
      
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
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
              <Button 
                variant="outline" 
                className="mr-2"
                onClick={() => window.location.href = '/materias'}
              >
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
