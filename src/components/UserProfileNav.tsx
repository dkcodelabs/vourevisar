
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
import { LogOut, Settings, User, ChevronDown } from "lucide-react";
import { Link } from 'react-router-dom';

export function UserProfileNav() {
  const { user, profile, signOut, loading } = useAuth();
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
            <span className="text-xs text-gray-500">vouRevisar</span>
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
        <div className="flex flex-col space-y-1 p-3 border-b">
          <p className="text-sm font-medium leading-none text-gray-900">{profile?.name || 'Usuário'}</p>
          <p className="text-xs leading-none text-gray-500">
            {user.email}
          </p>
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
