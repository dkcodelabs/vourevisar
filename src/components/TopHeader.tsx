
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Calendar, List, Clock, TrendingUp, Timer, Menu, Target, Settings, LucideIcon, StickyNote
} from "lucide-react";
import { FocusTimer } from './FocusTimer';
import { UserProfileNav } from './UserProfileNav';
import { useAuth } from '@/contexts/AuthContext';
import { PomodoroPopover } from '@/components/PomodoroPopover';
import { useSharedPomodoroTimer } from '@/hooks/useSharedPomodoroTimer';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useUserRole } from '@/hooks/useUserRole';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

// Função para gerar navItems baseado nas permissões
const getNavItems = (isAdmin: boolean): NavItem[] => {
  const baseItems: NavItem[] = [
    { to: "/dashboard", label: "Painel", icon: LayoutDashboard, end: true },
    { to: "/ciclo-estudos", label: "Ciclo de Estudos", icon: Target },
    { to: "/revisoes", label: "Revisões", icon: Clock },
    { to: "/materias", label: "Matérias", icon: BookOpen },
    { to: "/topicos", label: "Tópicos", icon: List },
    { to: "/estatisticas", label: "Estatísticas", icon: TrendingUp },
  ];


  return baseItems;
};

// Hook personalizado para lógica de navegação
const useNavigation = () => {
  const location = useLocation();

  const isItemActive = React.useCallback((item: NavItem) => {
    if (item.end) {
      return location.pathname === item.to;
    }

    // Para tópicos, considerar ativo se estiver em /topicos ou /materias/*/topicos
    if (item.to === '/topicos') {
      return location.pathname === '/topicos' || location.pathname.includes('/topicos');
    }

    // Para matérias, considerar ativo apenas se estiver exatamente em /materias
    if (item.to === '/materias') {
      return location.pathname === '/materias';
    }

    return location.pathname.startsWith(item.to);
  }, [location.pathname]);

  return { isItemActive, location };
};

import GeneralNotesModal from '@/components/GeneralNotesModal';
import NotesModal from '@/components/reviews/NotesModal';
import SubjectNotesModal from '@/components/reviews/SubjectNotesModal';

// ... (imports remain the same)

export const TopHeader = () => {
  const { user } = useAuth();
  const { isItemActive } = useNavigation();
  const { timeLeft, isRunning, getProgress, formatTime, getState, isBlinking } = useSharedPomodoroTimer();
  const { isAdmin } = useUserRole();

  // Modal States
  const [isGeneralNotesModalOpen, setIsGeneralNotesModalOpen] = React.useState(false);
  const [topicNotesModal, setTopicNotesModal] = React.useState({
    isOpen: false,
    topicId: '',
    topicName: '',
    subjectName: ''
  });
  const [subjectNotesModal, setSubjectNotesModal] = React.useState({
    isOpen: false,
    subjectId: '',
    subjectName: ''
  });

  // Memoizar cálculos para evitar re-renders desnecessários
  const state = React.useMemo(() => getState(), [getState]);
  const progress = React.useMemo(() => Math.max(0, Math.min(100, getProgress() || 0)), [getProgress]);
  const formattedTime = React.useMemo(() => formatTime(timeLeft), [formatTime, timeLeft]);
  const navItems = React.useMemo(() => getNavItems(isAdmin), [isAdmin]);

  return (
    <header className="w-full py-3 relative z-50">
      <div className="w-full max-w-[1920px] mx-auto px-4">
        <div className="flex items-center justify-between gap-4">

          {/* Left Side: Logo (separate) + Navigation Menu */}
          <div className="flex items-center gap-3">
            {/* Logo - Standalone */}
            <div className="flex items-center gap-2 lg:gap-3">
              {/* Mobile Menu Button */}
              <div className="lg:hidden">
                <MobileMenu navItems={navItems} />
              </div>

              <img
                src="/logo.png"
                alt="vouRevisar"
                className="h-10 w-auto" // Increased size
              />
            </div>

            {/* Navigation Menu - Desktop only, separate from logo */}
            <nav className="hidden lg:flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg px-2 py-2 shadow-md border border-gray-200 dark:border-gray-700">
              {navItems.map((item) => {
                const isActive = isItemActive(item);

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end ?? false}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${isActive
                      ? 'bg-brand-blue text-white'
                      : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                  >
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Right Side: Utility Icons - separated */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 justify-end">

            {/* 1. Review Focus Timer (New) */}
            <FocusTimer />

            {/* 2. Annotations Button (Refactored: Icon Only) */}
            <button
              onClick={() => setIsGeneralNotesModalOpen(true)}
              className="flex items-center justify-center w-9 h-9 text-gray-700 bg-transparent hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-gray-800 focus:outline-none"
              title="Anotações Gerais"
            >
              <StickyNote className="w-5 h-5" />
            </button>

            {/* 3. Pomodoro Timer Icon */}
            {user && (
              <PomodoroPopover>
                <div className="flex items-center gap-2">
                  {/* Tempo visível quando rodando ou pausado */}
                  {timeLeft < 25 * 60 && (
                    <span className={`text-sm font-mono font-semibold hidden sm:block transition-all duration-300 ${isBlinking
                      ? 'text-red-500 animate-pulse'
                      : 'text-muted-foreground'
                      }`}>
                      {timeLeft === 0 && isBlinking ? '00:00' : formattedTime}
                    </span>
                  )}

                  <button className="relative flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 rounded-full transition-all duration-200 hover:scale-105">
                    {/* Progress circle */}
                    <svg className="absolute w-9 h-9 lg:w-10 lg:h-10 transform -rotate-90" viewBox="0 0 48 48">
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        className="text-muted-foreground/20"
                      />
                      {state !== 'stopped' && (
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 20}
                          strokeDashoffset={2 * Math.PI * 20 * (1 - (progress || 0) / 100)}
                          className={`transition-all duration-1000 ease-linear ${state === 'running' ? 'text-green-500' : state === 'paused' ? 'text-red-500' : 'text-muted-foreground'
                            }`}
                        />
                      )}
                    </svg>

                    {/* Timer icon ou tempo no mobile */}
                    {state === 'stopped' ? (
                      <Timer
                        size={16}
                        className="text-muted-foreground"
                      />
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className={`text-[10px] font-mono font-bold sm:hidden transition-all duration-300 ${isBlinking
                          ? 'text-red-500 animate-pulse'
                          : 'text-muted-foreground'
                          }`}>
                          {timeLeft === 0 && isBlinking ? '00' : formattedTime.split(':')[0]}
                        </span>
                        <Timer
                          size={16}
                          className={`hidden sm:block transition-all duration-300 ${isBlinking
                            ? 'text-red-500 animate-pulse'
                            : state === 'running'
                              ? 'text-green-600 animate-pulse'
                              : 'text-red-600'
                            }`}
                        />
                      </div>
                    )}
                  </button>
                </div>
              </PomodoroPopover>
            )}

            {/* 4. Theme Toggle (Extremo Direito) */}
            <ThemeToggle />

            {/* User Profile */}
            {user && (
              <div className="flex items-center ml-1">
                <UserProfileNav />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <GeneralNotesModal
        isOpen={isGeneralNotesModalOpen}
        onClose={() => setIsGeneralNotesModalOpen(false)}
        onOpenTopicNotes={(topicId, topicName, subjectName) => {
          setTopicNotesModal({
            isOpen: true,
            topicId,
            topicName,
            subjectName
          });
        }}
        onOpenSubjectNotes={(subjectId, subjectName) => {
          setSubjectNotesModal({
            isOpen: true,
            subjectId,
            subjectName
          });
        }}
      />

      <NotesModal
        isOpen={topicNotesModal.isOpen}
        onClose={() => setTopicNotesModal({ isOpen: false, topicId: '', topicName: '', subjectName: '' })}
        topicId={topicNotesModal.topicId}
        topicName={topicNotesModal.topicName}
        subjectName={topicNotesModal.subjectName}
      />

      <SubjectNotesModal
        isOpen={subjectNotesModal.isOpen}
        onClose={() => setSubjectNotesModal({ isOpen: false, subjectId: '', subjectName: '' })}
        subjectId={subjectNotesModal.subjectId}
        subjectName={subjectNotesModal.subjectName}
      />
    </header>
  );
};

// Mobile Menu Component
const MobileMenu = ({ navItems }: { navItems: NavItem[] }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { isItemActive, location } = useNavigation();

  // Fechar menu quando a rota mudar
  React.useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-lg text-muted-foreground hover:bg-muted transition-colors duration-200"
        aria-label="Menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu - positioned to the left */}
          <div className="absolute left-0 top-12 w-64 bg-card rounded-lg shadow-lg border border-border z-50 p-2 max-h-[80vh] overflow-y-auto transition-colors duration-200">
            <div className="p-2 border-b border-border mb-2">
              <h3 className="text-sm font-semibold text-foreground">Menu de Navegação</h3>
            </div>
            {navItems.map((item) => {
              const isActive = isItemActive(item);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end ?? false}
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors w-full ${isActive
                    ? 'bg-brand-blue text-white'
                    : 'text-muted-foreground hover:bg-muted'
                    }`}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon size={18} className="mr-3 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
