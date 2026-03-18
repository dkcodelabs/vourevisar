import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Settings, User, UserCheck, Crown, Shield, Users, XCircle, Clock } from "lucide-react";
import { Link } from 'react-router-dom';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSimpleSubscription } from '@/hooks/useSimpleSubscription';
import { motion, AnimatePresence } from 'framer-motion';
import { UserAvatar } from './ui/UserAvatar';

// Função para determinar o ícone baseado no badge
const getBadgeIcon = (displayBadge: string, _badgeColor: string) => {
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const loading = profileLoading || subscriptionLoading;

  useEffect(() => {
    if (profile?.name) {
      const firstNameOnly = profile.name.split(' ')[0];
      setFirstName(firstNameOnly);
    }
  }, [profile]);

  // Calcular posição do menu quando abre
  const updateMenuPosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 12,
        right: window.innerWidth - rect.right,
      });
    }
  }, []);

  useEffect(() => {
    if (isUserMenuOpen) {
      updateMenuPosition();
    }
  }, [isUserMenuOpen, updateMenuPosition]);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu-container') && !target.closest('.user-menu-dropdown')) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  if (!user) {
    return null;
  }

  const userInitials = profile?.name
    ? profile.name.trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : user.email?.charAt(0).toUpperCase() || 'U';

  const AccountIcon = getBadgeIcon(displayBadge, badgeColor);
  const badgeClasses = getBadgeClasses(badgeColor);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setIsUserMenuOpen(false);
    try {
      await signOut();
    } catch (error) {
      console.error('UserProfileNav: Logout error:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  // Dropdown renderizado via Portal — escapa overflow:hidden de qualquer pai
  const dropdownMenu = (
    <AnimatePresence>
      {isUserMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="user-menu-dropdown fixed w-56 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
          style={{
            top: menuPos.top,
            right: menuPos.right,
            zIndex: 99999,
            backgroundColor: 'var(--user-menu-bg, #ffffff)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--user-menu-border, rgba(0,0,0,0.05))',
          }}
        >
          <div className="p-2 space-y-1">
            <Link
              to="/perfil"
              onClick={() => setIsUserMenuOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-[#0f172a] dark:text-white hover:bg-[#00BFFF]/10 hover:text-[#00BFFF] rounded-xl transition-all group"
            >
              <User size={18} className="text-slate-400 dark:text-slate-500 group-hover:text-[#00BFFF] transition-colors" />
              Meu Perfil
            </Link>
            <Link
              to="/configuracoes"
              onClick={() => setIsUserMenuOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-[#0f172a] dark:text-white hover:bg-[#00BFFF]/10 hover:text-[#00BFFF] rounded-xl transition-all group"
            >
              <Settings size={18} className="text-slate-400 dark:text-slate-500 group-hover:text-[#00BFFF] transition-colors" />
              Configurações
            </Link>
            <div className="h-px my-1 mx-2" style={{ backgroundColor: 'var(--user-menu-separator, rgba(0,0,0,0.05))' }}></div>
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-[#FF8C00] hover:bg-[#FF8C00]/10 rounded-xl transition-all group"
            >
              <LogOut size={18} className="text-[#FF8C00]" />
              {isSigningOut ? 'Saindo...' : 'Sair'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* Trigger: Nome + Avatar clicável */}
      <div className="flex items-center gap-4 relative user-menu-container" ref={triggerRef}>
        <div
          className="flex items-center gap-4 cursor-pointer group"
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-primary transition-colors">
              {firstName || 'Usuário'}
            </p>
            <p className="text-[10px] text-primary font-bold uppercase tracking-widest opacity-80">
              {displayBadge || 'Estudante'}
            </p>
          </div>
          <div className="relative">
            <UserAvatar 
              src={profile?.avatar_url} 
              name={profile?.name || user.email} 
              className="relative w-11 h-11 rounded-xl grayscale-[20%] hover:grayscale-0 transition-all border border-black/5 dark:border-white/10"
              fallbackClassName="shadow-[0_4px_10px_rgba(0,0,0,0.1)] rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Portal: renderiza o dropdown diretamente no <body> */}
      {createPortal(dropdownMenu, document.body)}
    </>
  );
};

// Memoizar o componente para evitar re-renderizações desnecessárias
export const UserProfileNav = React.memo(UserProfileNavComponent);
