
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, BookOpen, Calendar, List, Clock, HelpCircle, TrendingUp, Timer, Menu, Target, LucideIcon 
} from "lucide-react";
import { UserProfileNav } from './UserProfileNav';
import { useAuth } from '@/contexts/AuthContext';
import { PomodoroPopover } from '@/components/PomodoroPopover';
import { useSharedPomodoroTimer } from '@/hooks/useSharedPomodoroTimer';
import { ThemeToggle } from '@/components/ThemeToggle';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

// Mover navItems para fora do componente para evitar recriação
const navItems: NavItem[] = [
  { to: "/", label: "Painel", icon: LayoutDashboard, end: true },
  { to: "/materias", label: "Matérias", icon: BookOpen },
  { to: "/ciclo-estudos", label: "Ciclo de Estudos", icon: Target },
  // Plano de estudos removido - substituído por Ciclo de Estudos
  { to: "/topicos", label: "Tópicos", icon: List },
  { to: "/revisoes", label: "Revisões", icon: Clock },
  { to: "/questoes", label: "Questões", icon: HelpCircle },
  { to: "/estatisticas", label: "Estatísticas", icon: TrendingUp },
];

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

export const TopHeader = React.memo(() => {
  const { user } = useAuth();
  const { isItemActive } = useNavigation();
  const { timeLeft, isRunning, getProgress, formatTime, getState, isBlinking } = useSharedPomodoroTimer();
  
  // Memoizar cálculos para evitar re-renders desnecessários
  const state = React.useMemo(() => getState(), [getState]);
  const progress = React.useMemo(() => Math.max(0, Math.min(100, getProgress() || 0)), [getProgress]);
  const formattedTime = React.useMemo(() => formatTime(timeLeft), [formatTime, timeLeft]);

  return (
    <header className="w-full">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Mobile Menu Button & Logo */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Menu Button - moved to left */}
            <div className="lg:hidden">
              <MobileMenu navItems={navItems} />
            </div>
            
            <img 
              src="/lovable-uploads/c7e19ddd-6ca7-4be9-938f-ec4d2e307476.png" 
              alt="vouRevisar" 
              className="h-8 lg:h-10 w-auto"
            />
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
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <item.icon size={16} className="mr-2 flex-shrink-0" />
                  <span className="hidden xl:inline">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Theme Toggle, Pomodoro & User Profile */}
          <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
            {/* Theme Toggle */}
            <ThemeToggle />
            {/* Pomodoro Timer Icon */}
            {user && (
              <PomodoroPopover>
                <div className="flex items-center gap-2">
                  {/* Tempo visível quando rodando ou pausado */}
                  {timeLeft < 25 * 60 && (
                    <span className={`text-sm font-mono font-semibold hidden sm:block transition-all duration-300 ${
                      isBlinking 
                        ? 'text-red-500 animate-pulse' 
                        : 'text-muted-foreground'
                    }`}>
                      {timeLeft === 0 && isBlinking ? '00:00' : formattedTime}
                    </span>
                  )}
                  
                  <button className="relative flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 rounded-full transition-all duration-200 hover:scale-105">
                    {/* Progress circle */}
                    <svg className="absolute w-10 h-10 lg:w-12 lg:h-12 transform -rotate-90" viewBox="0 0 48 48">
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        className="text-muted-foreground"
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
                          className={`transition-all duration-1000 ease-linear ${
                            state === 'running' ? 'text-green-500' : state === 'paused' ? 'text-red-500' : 'text-muted-foreground'
                          }`}
                        />
                      )}
                    </svg>
                    
                    {/* Timer icon ou tempo no mobile */}
                    {state === 'stopped' ? (
                      <Timer 
                        size={14} 
                        className="text-muted-foreground"
                      />
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className={`text-xs font-mono font-bold sm:hidden transition-all duration-300 ${
                          isBlinking 
                            ? 'text-red-500 animate-pulse' 
                            : 'text-muted-foreground'
                        }`}>
                          {timeLeft === 0 && isBlinking ? '00' : formattedTime.split(':')[0]}
                        </span>
                        <span className={`text-xs font-mono font-bold sm:hidden transition-all duration-300 ${
                          isBlinking 
                            ? 'text-red-500 animate-pulse' 
                            : 'text-muted-foreground'
                        }`}>
                          {timeLeft === 0 && isBlinking ? '00' : formattedTime.split(':')[1]}
                        </span>
                        <Timer 
                          size={14} 
                          className={`hidden sm:block transition-all duration-300 ${
                            isBlinking 
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

            {/* User Profile */}
            {user && (
              <div className="flex items-center">
                <UserProfileNav />
              </div>
            )}
          </div>
        </div>
      </div>


    </header>
  );
});

// Mobile Menu Component
const MobileMenu = React.memo(({ navItems }: { navItems: NavItem[] }) => {
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
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors w-full ${
                    isActive 
                      ? 'bg-app-blue text-white' 
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
});
