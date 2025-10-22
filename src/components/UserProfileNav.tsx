
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Settings, User, ChevronDown, UserCheck, Crown, Shield, Users, XCircle } from "lucide-react";
import { Link } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useSubscription } from '@/hooks/useSubscription';

// Função para determinar o tipo de conta e ícone - NOVA LÓGICA ÚNICA
const getAccountType = (isOwner: boolean, isAdmin: boolean, isModerator: boolean, hasActiveSubscription: boolean, isExpired: boolean) => {
  // 1. Roles administrativas têm prioridade absoluta
  if (isOwner) {
    return { 
      type: 'Proprietário', 
      icon: Crown, 
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      iconColor: 'text-purple-600'
    };
  }
  if (isAdmin) {
    return { 
      type: 'Administrador', 
      icon: Shield, 
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      iconColor: 'text-blue-600'
    };
  }
  if (isModerator) {
    return { 
      type: 'Moderador', 
      icon: Users, 
      color: 'text-green-600 bg-green-50 border-green-200',
      iconColor: 'text-green-600'
    };
  }
  
  // 2. Para usuários comuns - verificar status de assinatura
  if (isExpired) {
    return { 
      type: 'Expirado', 
      icon: XCircle, 
      color: 'text-red-600 bg-red-50 border-red-200',
      iconColor: 'text-red-600'
    };
  }
  
  if (hasActiveSubscription) {
    return { 
      type: 'Assinante', 
      icon: UserCheck, 
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      iconColor: 'text-yellow-600'
    };
  }
  
  // 3. Usuário sem assinatura (padrão)
  return { 
    type: 'Free', 
    icon: User, 
    color: 'text-gray-600 bg-gray-50 border-gray-200',
    iconColor: 'text-gray-600'
  };
};

export function UserProfileNav() {
  const { user, profile, signOut, loading } = useAuth();
  const { isOwner, isAdmin, isModerator } = useUserRole();
  const { hasActiveSubscription, isExpired } = useSubscription();
  const [firstName, setFirstName] = useState<string>('');
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (profile?.name) {
      const firstNameOnly = profile.name.split(' ')[0];
      setFirstName(firstNameOnly);
    }
  }, [profile]);

  if (!user) {
    return null;
  }

  const userInitials = profile?.name
    ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user.email?.charAt(0).toUpperCase() || 'U';

  // Determinar tipo de conta - NOVA LÓGICA ÚNICA
  const accountType = getAccountType(isOwner, isAdmin, isModerator, hasActiveSubscription, isExpired);
  const AccountIcon = accountType.icon;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      console.log('UserProfileNav: Starting logout...');
      await signOut();
    } catch (error) {
      console.error('UserProfileNav: Logout error:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center gap-3 px-3 py-2 h-auto hover:bg-gray-100 rounded-lg"
          disabled={loading || isSigningOut}
        >
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium text-gray-900">{firstName || 'Usuário'}</span>
            <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${accountType.color}`}>
              <AccountIcon className={`h-2.5 w-2.5 ${accountType.iconColor}`} />
              <span>{accountType.type}</span>
            </div>
          </div>
          
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || 'Avatar do usuário'} />
            <AvatarFallback className="bg-app-blue text-white text-sm font-medium">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <div className="flex flex-col space-y-2 p-3 border-b">
          <p className="text-sm font-medium leading-none text-gray-900">
            {profile?.name || 'Usuário'}
          </p>
          <p className="text-xs leading-none text-gray-500">
            {user.email}
          </p>
          {/* Badge do tipo de conta */}
          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${accountType.color} w-fit`}>
            <AccountIcon className={`h-3 w-3 ${accountType.iconColor}`} />
            <span>{accountType.type}</span>
          </div>
        </div>
        <div className="p-1">
          <DropdownMenuItem asChild>
            <Link to="/perfil" className="flex cursor-pointer items-center px-2 py-2 text-sm">
              <User className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/configuracoes" className="flex cursor-pointer items-center px-2 py-2 text-sm">
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleSignOut} 
            className="cursor-pointer px-2 py-2 text-sm text-red-600 focus:text-red-600"
            disabled={isSigningOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>{isSigningOut ? 'Saindo...' : 'Sair'}</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
