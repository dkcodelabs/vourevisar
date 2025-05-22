
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Calendar, Phone, Lock } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { z } from 'zod';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const passwordSchema = z.object({
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const profileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phone: z.string().optional(),
});

const Profile = () => {
  const { profile, user, updateProfile, updatePassword } = useAuth();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Check if user is from Google provider
  const isGoogleUser = user?.app_metadata?.provider === 'google';
  
  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile?.name || '',
      phone: profile?.phone || '',
    },
    values: {
      name: profile?.name || '',
      phone: profile?.phone || '',
    },
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });
  
  const handleSaveProfile = async (values) => {
    if (!user) return;
    
    setIsSaving(true);
    
    try {
      await updateProfile({
        name: values.name,
        phone: values.phone,
      });
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (values) => {
    try {
      await updatePassword(values.password);
      setIsPasswordDialogOpen(false);
      passwordForm.reset();
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
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
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(handleSaveProfile)} className="space-y-4">
              <FormField
                control={profileForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Nome
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Seu nome" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
              
              <FormField
                control={profileForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      Telefone
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Seu telefone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
              
              <div className="flex gap-4 pt-2">
                <Button 
                  className="bg-app-blue hover:bg-app-light-blue"
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
                
                {/* Show password change button only for non-Google users */}
                {!isGoogleUser && (
                  <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        type="button"
                        className="flex items-center gap-2"
                      >
                        <Lock className="h-4 w-4" />
                        Alterar Senha
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Alterar Senha</DialogTitle>
                      </DialogHeader>
                      <Form {...passwordForm}>
                        <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-4 pt-2">
                          <FormField
                            control={passwordForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nova Senha</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="password"
                                    {...field} 
                                    placeholder="Digite sua nova senha" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={passwordForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Confirme a Senha</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="password"
                                    {...field} 
                                    placeholder="Confirme sua nova senha" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <DialogFooter>
                            <Button variant="outline" type="button" onClick={() => setIsPasswordDialogOpen(false)}>
                              Cancelar
                            </Button>
                            <Button type="submit" className="bg-app-blue hover:bg-app-light-blue">
                              Salvar Nova Senha
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </form>
          </Form>
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
