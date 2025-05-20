
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

const Profile = () => {
  const { profile, user } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };
  
  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', user.id);
        
      if (error) throw error;
      
      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram atualizadas com sucesso.'
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar perfil',
        description: error.message,
        variant: 'destructive'
      });
      console.error('Erro:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };
  
  const createdAt = user?.created_at ? formatDate(user.created_at) : '';
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Perfil</h1>
      
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-xl">Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              Nome
            </Label>
            <Input
              id="name"
              value={name}
              onChange={handleNameChange}
              placeholder="Seu nome"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="email" className="flex items-center">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Label>
            <Input
              id="email"
              value={user?.email || ''}
              readOnly
              type="email"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="joined" className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Data de Cadastro
            </Label>
            <Input
              id="joined"
              value={createdAt}
              readOnly
            />
          </div>
          
          <Button 
            className="mt-4 bg-app-blue hover:bg-app-light-blue"
            onClick={handleSaveProfile}
            disabled={isSaving}
          >
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </CardContent>
      </Card>
      
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-xl">Estatísticas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="text-sm text-gray-500">Total de Matérias</h3>
              <p className="text-2xl font-bold mt-1">5</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="text-sm text-gray-500">Total de Tópicos</h3>
              <p className="text-2xl font-bold mt-1">15</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="text-sm text-gray-500">Revisões Realizadas</h3>
              <p className="text-2xl font-bold mt-1">35</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="text-sm text-gray-500">Dias Consecutivos</h3>
              <p className="text-2xl font-bold mt-1">12</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
