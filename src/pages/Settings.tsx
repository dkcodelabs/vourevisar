
import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const { userProfile, setUserProfile } = useApp();
  const { toast } = useToast();
  
  const handleNotificationsToggle = (checked: boolean) => {
    setUserProfile({
      ...userProfile,
      settings: {
        ...userProfile.settings,
        notificationsEnabled: checked
      }
    });
  };
  
  const handleSubjectsPerDayChange = (value: number[]) => {
    setUserProfile({
      ...userProfile,
      settings: {
        ...userProfile.settings,
        subjectsPerDay: value[0]
      }
    });
  };
  
  const handleNotificationTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserProfile({
      ...userProfile,
      settings: {
        ...userProfile.settings,
        notificationTime: e.target.value
      }
    });
  };
  
  const handleSaveSettings = () => {
    // In a real app, this would save to a database
    toast({
      title: "Sucesso",
      description: "Configurações salvas com sucesso",
    });
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
              <h3 className="font-medium mb-2">Quantidade de Matérias por Dia: {userProfile.settings.subjectsPerDay}</h3>
              <Slider 
                defaultValue={[userProfile.settings.subjectsPerDay]}
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
              checked={userProfile.settings.notificationsEnabled}
              onCheckedChange={handleNotificationsToggle}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notification-time">Horário da Notificação Principal</Label>
            <Input 
              id="notification-time"
              type="time"
              value={userProfile.settings.notificationTime}
              onChange={handleNotificationTimeChange}
              className="max-w-[200px]"
            />
          </div>
          
          <Button 
            className="mt-4 bg-app-blue hover:bg-app-light-blue"
            onClick={handleSaveSettings}
          >
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
