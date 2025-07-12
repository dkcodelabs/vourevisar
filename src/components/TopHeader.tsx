
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, BookOpen, Calendar, List, Clock, HelpCircle, TrendingUp, Timer, LucideIcon 
} from "lucide-react";
import { UserProfileNav } from './UserProfileNav';
import { useAuth } from '@/contexts/AuthContext';
import { PomodoroModal } from '@/components/dashboard/PomodoroModal';
import { usePomodoroTimer } from '@/hooks/usePomodoroTimer';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const navItems: NavItem[] = [
  { to: "/", label: "Painel", icon: LayoutDashboard, end: true },
  { to: "/materias", label: "Matérias", icon: BookOpen },
  { to: "/plano-estudos", label: "Plano de Estudos", icon: Calendar },
  { to: "/topicos", label: "Tópicos", icon: List },
  { to: "/revisoes", label: "Revisões", icon: Clock },
  { to: "/questoes", label: "Questões", icon: HelpCircle },
  { to: "/estatisticas", label: "Estatísticas", icon: TrendingUp },
];

export function TopHeader() {
  const { user } = useAuth();
  const location = useLocation();
  const [pomodoroOpen, setPomodoroOpen] = React.useState(false);
  const { state, timeLeft, progress, formatTime } = usePomodoroTimer();

  // Função para verificar se o item está ativo
  const isItemActive = (item: NavItem) => {
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
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center min-w-0">
            <span className="text-app-blue font-bold text-xl lg:text-2xl truncate">vouRevisar</span>
          </div>

          {/* Navigation - Hidden on mobile, properly responsive */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = isItemActive(item);
              
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end ?? false}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive 
                      ? 'bg-app-blue text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon size={16} className="mr-2 flex-shrink-0" />
                  <span className="hidden xl:inline">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Pomodoro & Mobile Menu Button & User Profile */}
          <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
            {/* Pomodoro Timer Icon */}
            {user && (
              <button
                onClick={() => setPomodoroOpen(true)}
                className="relative flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 rounded-full transition-all duration-200 hover:scale-105"
              >
                {/* Progress circle */}
                <svg className="absolute w-10 h-10 lg:w-12 lg:h-12 transform -rotate-90" viewBox="0 0 48 48">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    className="text-gray-200"
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
                      strokeDashoffset={2 * Math.PI * 20 * (1 - progress / 100)}
                      className={`transition-all duration-1000 ease-linear ${
                        state === 'running' ? 'text-green-500' : state === 'paused' ? 'text-red-500' : 'text-gray-400'
                      }`}
                    />
                  )}
                </svg>
                
                {/* Timer icon in center */}
                <Timer 
                  size={14} 
                  className={`${
                    state === 'running' 
                      ? 'text-green-600 animate-pulse' 
                      : state === 'paused' 
                        ? 'text-red-600' 
                        : 'text-gray-600'
                  }`}
                />
                
                {/* Time display when active */}
                {state !== 'stopped' && (
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                    <span className="text-xs font-mono bg-white px-1 py-0.5 rounded border shadow-sm whitespace-nowrap">
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                )}
              </button>
            )}

            {/* Mobile Menu Button */}
            <div className="lg:hidden">
              <MobileMenu navItems={navItems} />
            </div>

            {/* User Profile */}
            {user && (
              <div className="flex items-center">
                <UserProfileNav />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pomodoro Modal */}
      <PomodoroModal 
        open={pomodoroOpen} 
        onOpenChange={setPomodoroOpen} 
      />
    </header>
  );
}

// Mobile Menu Component
function MobileMenu({ navItems }: { navItems: NavItem[] }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();

  const isItemActive = (item: NavItem) => {
    if (item.end) {
      return location.pathname === item.to;
    }
    
    if (item.to === '/topicos') {
      return location.pathname === '/topicos' || location.pathname.includes('/topicos');
    }
    
    if (item.to === '/materias') {
      return location.pathname === '/materias';
    }
    
    return location.pathname.startsWith(item.to);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-700 hover:bg-gray-100"
        aria-label="Menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 top-12 w-64 bg-white rounded-lg shadow-lg border z-50 p-2 max-h-[80vh] overflow-y-auto">
            <div className="p-2 border-b border-gray-100 mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Menu de Navegação</h3>
            </div>
            {navItems.map((item) => {
              const isActive = isItemActive(item);
              
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end ?? false}
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors w-full ${
                    isActive 
                      ? 'bg-app-blue text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
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
}
