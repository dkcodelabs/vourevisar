
import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Calendar } from 'lucide-react';

const Profile = () => {
  const { userProfile, setUserProfile } = useApp();
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserProfile({
      ...userProfile,
      name: e.target.value
    });
  };
  
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserProfile({
      ...userProfile,
      email: e.target.value
    });
  };
  
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
              value={userProfile.name}
              onChange={handleNameChange}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="email" className="flex items-center">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Label>
            <Input
              id="email"
              value={userProfile.email}
              onChange={handleEmailChange}
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
              value="01/01/2023"
              readOnly
            />
          </div>
          
          <Button className="mt-4 bg-app-blue hover:bg-app-light-blue">
            Salvar Alterações
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
