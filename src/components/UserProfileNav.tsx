
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
import { LogOut, Settings, User, ChevronDown, UserCheck, Crown, Shield, Users, XCircle, Clock } from "lucide-react";
import { Link } from 'react-router-dom';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSimpleSubscription } from '@/hooks/useSimpleSubscription';

// Função para determinar o ícone baseado no badge - INTEGRADA COM NOVO HOOK
const getBadgeIcon = (displayBadge: string, badgeColor: string) => {
  if (displayBadge.includes('Proprietário')) return Crown;
  if (displayBadge.includes('Administrador')) return Shield;
  if (displayBadge.includes('Moderador')) return Users;
  if (displayBadge.includes('Anual') || displayBadge.includes('Mensal')) return UserCheck;
  if (displayBadge.includes('Trial')) return Clock;
  if (displayBadge.includes('Expirado')) return XCircle;
  return User;
};

// Função para determinar as classes CSS baseado na cor
const getBadgeClasses = (badgeColor: string) => {
  switch (badgeColor) {
    case 'purple':
      return 'text-purple-600 bg-purple-50 border-purple-200';
    case 'blue':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'green':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'yellow':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'red':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'gray':
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const UserProfileNavComponent = () => {
  const { user, signOut } = useAuth();
  const {
    profile,
    loading: profileLoading
  } = useUserProfile();
  const {
    displayBadge,
    badgeColor,
    isActive: hasActiveSubscription,
    loading: subscriptionLoading
  } = useSimpleSubscription();
  const [firstName, setFirstName] = useState<string>('');
  const [isSigningOut, setIsSigningOut] = useState(false);

  const loading = profileLoading || subscriptionLoading;

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

  // Usar o novo sistema integrado
  const AccountIcon = getBadgeIcon(displayBadge, badgeColor);
  const badgeClasses = getBadgeClasses(badgeColor);

  // Log removido para otimização

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
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
          className="flex items-center gap-2 px-2 py-2 h-auto hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          disabled={loading || isSigningOut}
        >
          {/* Avatar first */}
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || 'Avatar do usuário'} />
            <AvatarFallback className="bg-app-blue text-white text-sm font-medium">
              {userInitials}
            </AvatarFallback>
          </Avatar>

          {/* Name and badge to the right */}
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{firstName || 'Usuário'}</span>
            <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border ${badgeClasses}`}>
              <AccountIcon className="h-2.5 w-2.5" />
              <span>{displayBadge}</span>
            </div>
          </div>

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
          {/* Badge do tipo de conta - INTEGRADO */}
          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${badgeClasses} w-fit`}>
            <AccountIcon className="h-3 w-3" />
            <span>{displayBadge}</span>
          </div>

          {/* Informações da assinatura se ativa */}
          {hasActiveSubscription && profile?.subscription?.subscription_ends_at && (
            <div className="text-xs text-gray-400 mt-1">
              Expira: {new Date(profile.subscription.subscription_ends_at).toLocaleDateString('pt-BR')}
            </div>
          )}
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
};

// Memoizar o componente para evitar re-renderizações desnecessárias
export const UserProfileNav = React.memo(UserProfileNavComponent);
