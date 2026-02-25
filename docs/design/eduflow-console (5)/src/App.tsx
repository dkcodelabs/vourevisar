/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  RotateCcw,
  Clock,
  Book,
  List,
  BarChart3,
  Settings,
  Users,
  FileUp,
  CreditCard,
  Monitor,
  Shield,
  ClipboardList,
  MessageSquare,
  Bell, 
  ChevronLeft, 
  ChevronRight,
  Database,
  Code2,
  CheckCircle2,
  Zap,
  Sun,
  Moon,
  User,
  LogOut,
  Search,
  Filter,
  Grid,
  List as ListIcon,
  Edit3,
  ChevronDown,
  Hourglass,
  FileText,
  Plus,
  ArrowRight,
  Circle,
  Mail,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active = false, 
  collapsed = false,
  onClick
}: { 
  icon: any, 
  label: string, 
  active?: boolean, 
  collapsed?: boolean,
  onClick?: () => void
}) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
      active ? 'nav-item-active' : 'text-sidebar-muted hover:bg-primary/5 hover:text-primary'
    }`}
  >
    <Icon size={22} />
    {!collapsed && <span className="font-medium text-sm whitespace-nowrap">{label}</span>}
  </button>
);

const ModuleItem = ({ 
  color, 
  label, 
  collapsed = false 
}: { 
  color: string, 
  label: string, 
  collapsed?: boolean 
}) => (
  <a href="#" className="flex items-center gap-3 px-4 py-3 text-sidebar-muted hover:bg-primary/5 hover:text-primary rounded-xl transition-all group">
    <span className={`w-2 h-2 rounded-full ${color} shadow-[0_0_8px_currentColor]`}></span>
    {!collapsed && <span className="font-medium text-sm whitespace-nowrap">{label}</span>}
  </a>
);

const StatCard = ({ 
  label, 
  value, 
  subValue, 
  icon: Icon, 
  colorClass = "text-primary" 
}: { 
  label: string, 
  value: string, 
  subValue: string, 
  icon: any,
  colorClass?: string
}) => (
  <div className="glow-card p-6 rounded-3xl relative overflow-hidden group">
    <div className={`absolute top-0 right-0 w-32 h-32 ${colorClass.replace('text-', 'bg-')}/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:opacity-100 transition-opacity`}></div>
    <div className="flex items-center justify-between mb-6">
      <span className="data-label">{label}</span>
      <Icon className={`${colorClass} opacity-80`} size={20} />
    </div>
    <div className="flex items-baseline gap-2">
      <p className="text-4xl font-black text-content-main">{value}</p>
      <p className={`text-[10px] font-bold ${colorClass} opacity-60 uppercase`}>{subValue}</p>
    </div>
  </div>
);

const ProcessingCard = ({ 
  title, 
  progress, 
  icon: Icon 
}: { 
  title: string, 
  progress: number, 
  icon: any 
}) => (
  <div className="glow-card p-5 rounded-2xl flex items-center gap-5 group">
    <div className="w-14 h-14 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center border border-black/5 dark:border-white/5 group-hover:border-primary/30 transition-all">
      <Icon className="text-primary" size={24} />
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-end mb-2">
        <h4 className="font-bold text-content-main text-[15px] tracking-tight">{title}</h4>
        <span className="text-[11px] font-black text-secondary">{progress.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-black/5 dark:bg-white/5 h-2 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="bg-gradient-to-r from-primary to-secondary h-full rounded-full shadow-[0_0_8px_rgba(255,140,0,0.4)]"
        />
      </div>
    </div>
  </div>
);

const EventItem = ({ 
  title, 
  time, 
  active = false, 
  isLast = false 
}: { 
  title: string, 
  time: string, 
  active?: boolean,
  isLast?: boolean
}) => (
  <li className="flex gap-4 group">
    <div className="flex flex-col items-center">
      <div className={`w-2.5 h-2.5 rounded-full transition-all ${
        active 
          ? 'bg-secondary shadow-[0_0_8px_#FF8C00] ring-4 ring-secondary/10' 
          : 'bg-slate-600 group-hover:bg-primary'
      }`}></div>
      {!isLast && <div className={`w-px h-full my-2 ${
        active 
          ? 'bg-gradient-to-b from-secondary/30 to-white/5' 
          : 'bg-black/5 dark:bg-white/5'
      }`}></div>}
    </div>
    <div className="pb-6">
      <p className={`text-sm font-bold text-content-main transition-colors ${
        active ? 'group-hover:text-secondary' : 'group-hover:text-primary'
      }`}>{title}</p>
      <p className="text-[11px] font-medium text-content-muted mt-1 uppercase tracking-wider">{time}</p>
    </div>
  </li>
);

const CircularProgress = ({ progress, size = 36 }: { progress: number, size?: number }) => {
  const radius = (size - 4) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-black/5 dark:text-white/5"
          strokeWidth="3"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="text-emerald-500 transition-all duration-500 ease-out"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <span className="absolute text-[9px] font-black text-content-main">{progress}%</span>
    </div>
  );
};

const TopicItem = ({ 
  index, 
  title, 
  status, 
  isStarted = false 
}: { 
  index: number, 
  title: string, 
  status: 'not_studied' | 'completed' | 'in_days' | 'delayed',
  isStarted?: boolean
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'not_studied':
        return <span className="px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400">Não estudado</span>;
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Concluído</span>;
      case 'in_days':
        return <span className="px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Em 1 dia</span>;
      case 'delayed':
        return <span className="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-900/30 text-[10px] font-bold text-rose-600 dark:text-rose-400">2 dias de atraso</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-all group">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-bold text-content-muted w-4">{index}.</span>
        <span className="text-sm font-medium text-content-main">{title}</span>
      </div>
      <div className="flex items-center gap-4">
        {getStatusBadge()}
        <button className="p-1.5 text-content-muted hover:text-primary transition-colors">
          <FileText size={16} />
        </button>
        <button className={`w-7 h-7 flex items-center justify-center rounded-full transition-all ${
          isStarted 
            ? 'bg-primary/20 text-primary hover:bg-primary/30' 
            : 'bg-black/5 dark:bg-white/5 text-content-muted hover:text-primary'
        }`}>
          {isStarted ? <ArrowRight size={14} /> : <Circle size={14} />}
        </button>
      </div>
    </div>
  );
};

const TopicList = () => (
  <div className="mt-2 ml-4 p-4 rounded-2xl bg-black/5 dark:bg-black/20 space-y-3 border border-black/5 dark:border-white/5">
    <div className="relative group">
      <input 
        type="text" 
        placeholder="Novo tópico..." 
        className="w-full bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl py-2.5 px-4 pr-10 text-sm focus:outline-none focus:border-primary/30 transition-all text-content-main placeholder:text-content-muted/50"
      />
      <button className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all">
        <Plus size={16} />
      </button>
    </div>
    <div className="space-y-1">
      <TopicItem index={1} title="Tópico 1" status="in_days" isStarted />
      <TopicItem index={2} title="Tópico 2" status="not_studied" />
    </div>
  </div>
);

const SubjectCard = ({ 
  index, 
  title, 
  progress,
  subProgress,
  isExpanded,
  onToggle
}: { 
  index: number, 
  title: string, 
  progress: number,
  subProgress?: string,
  isExpanded?: boolean,
  onToggle?: () => void
}) => (
  <div className="flex flex-col">
    <div 
      onClick={onToggle}
      className={`glow-card p-4 rounded-2xl flex items-center justify-between group hover:border-primary/20 transition-all cursor-pointer ${
        isExpanded ? 'border-primary/30 shadow-primary/5' : ''
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="w-8 h-6 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-primary">{index}</span>
        </div>
        <h4 className="font-bold text-content-main text-sm tracking-tight uppercase truncate">{title}</h4>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 shrink-0">
          <CircularProgress progress={progress} />
          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => { e.stopPropagation(); }}
              className="p-2 hover:bg-primary/10 rounded-xl transition-colors text-content-muted hover:text-primary"
            >
              <FileText size={18} />
            </button>
            <button className={`p-2 hover:bg-primary/10 rounded-xl transition-all text-content-muted hover:text-primary ${
              isExpanded ? 'rotate-180 text-primary' : ''
            }`}>
              <ChevronDown size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <TopicList />
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const LoginScreen = ({ onLogin }: { onLogin: () => void }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg-main p-4 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[440px] glass-card rounded-[40px] p-10 shadow-2xl relative overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center text-content-main">
            <ArrowRight size={20} />
          </div>
          <h2 className="text-3xl font-black text-content-main tracking-tight">Entrar</h2>
        </div>

        {/* Logo Area */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex items-center gap-2">
            <div className="relative">
              <RotateCcw className="text-primary w-10 h-10" strokeWidth={3} />
              <CheckCircle2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-500 w-4 h-4" strokeWidth={4} />
            </div>
            <span className="text-2xl font-black text-content-main tracking-tighter">
              vou<span className="text-primary">Revisar</span>
            </span>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-content-muted uppercase tracking-widest ml-1">Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-content-muted group-focus-within:text-primary transition-colors" size={18} />
              <input 
                type="email" 
                defaultValue="dwefotografia@gmail.com"
                className="w-full bg-primary/5 border border-transparent focus:border-primary/30 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium text-content-main outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-content-muted uppercase tracking-widest ml-1">Senha</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-content-muted group-focus-within:text-primary transition-colors" size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                defaultValue="******"
                className="w-full bg-primary/5 border border-transparent focus:border-primary/30 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium text-content-main outline-none transition-all"
              />
              <button 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-content-muted hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            onClick={onLogin}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Entrar
          </button>

          <div className="text-center">
            <a href="#" className="text-sm font-bold text-primary hover:underline">Esqueci minha senha</a>
          </div>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-black/5 dark:border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card-slate dark:bg-deep-slate px-4 text-content-muted font-bold tracking-widest">OU</span>
            </div>
          </div>

          <button className="w-full bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-content-main font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar com Google
          </button>
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm font-medium text-content-muted">
            Não tem uma conta? <a href="#" className="text-primary font-bold hover:underline">Registre-se</a>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'subjects'>('dashboard');
  const [expandedSubject, setExpandedSubject] = useState<number | null>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu-container')) {
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

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="min-h-screen flex p-4 gap-4 overflow-hidden transition-colors duration-300">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: collapsed ? 80 : 256 }}
        className="flex flex-col bg-deep-slate rounded-3xl shrink-0 overflow-hidden relative border border-black/5 dark:border-white/5 transition-colors duration-300"
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,191,255,0.3)]">
              <BarChart3 className="text-black font-bold" size={20} />
            </div>
            {!collapsed && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sidebar-text font-extrabold text-xl tracking-tight whitespace-nowrap"
              >
                EDU<span className="text-primary">FLOW</span>
              </motion.span>
            )}
          </div>
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-sidebar-muted"
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-3 space-y-8 mt-6">
          <nav className="space-y-1">
            <SidebarItem 
              icon={LayoutDashboard} 
              label="Painel" 
              active={activeView === 'dashboard'} 
              onClick={() => setActiveView('dashboard')}
              collapsed={collapsed} 
            />
            <SidebarItem icon={RotateCcw} label="Ciclo de Estudos" collapsed={collapsed} />
            <SidebarItem icon={Clock} label="Revisões" collapsed={collapsed} />
            <SidebarItem 
              icon={Book} 
              label="Matérias" 
              active={activeView === 'subjects'} 
              onClick={() => setActiveView('subjects')}
              collapsed={collapsed} 
            />
            <SidebarItem icon={List} label="Tópicos" collapsed={collapsed} />
            <SidebarItem icon={BarChart3} label="Estatísticas" collapsed={collapsed} />
          </nav>

          <div className="pt-4 border-t border-white/5">
            <nav className="space-y-1">
              <SidebarItem icon={Settings} label="Gerenciamento V1 (Legacy)" collapsed={collapsed} />
              <SidebarItem icon={Users} label="Gerenciar Usuários" collapsed={collapsed} />
              <SidebarItem icon={FileUp} label="Importar Questões" collapsed={collapsed} />
              <SidebarItem icon={CreditCard} label="Assinaturas" collapsed={collapsed} />
              <SidebarItem icon={Monitor} label="Sistema" collapsed={collapsed} />
              <SidebarItem icon={Shield} label="Segurança" collapsed={collapsed} />
              <SidebarItem icon={ClipboardList} label="Auditoria" collapsed={collapsed} />
              <SidebarItem icon={MessageSquare} label="Feedback" collapsed={collapsed} />
            </nav>
          </div>
        </div>

        <div className="p-4 mt-auto border-t border-black/5 dark:border-white/5">
          <SidebarItem icon={Settings} label="System Config" collapsed={collapsed} />
          {!collapsed && (
            <div className="px-4 py-2 text-[10px] text-slate-600 font-mono tracking-tighter">
              V.2.0.4-STABLE
            </div>
          )}
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 h-[calc(100vh-2rem)] overflow-y-auto no-scrollbar glass-card rounded-3xl relative transition-colors duration-300">
        <div className="max-w-[1400px] mx-auto px-6 py-8 sm:px-10 sm:py-10 w-full">
          <header className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-content-main">
                {activeView === 'dashboard' ? (
                  <>System: <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Online</span></>
                ) : (
                  'Ciclo de Estudos'
                )}
              </h1>
              <p className="text-content-muted text-sm mt-1 font-medium tracking-wide">
                {activeView === 'dashboard' 
                  ? 'Welcome back, operative Alex Johnson.' 
                  : 'Gerencie seu progresso e metas diárias'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-all group border border-black/5 dark:border-white/5">
                <Hourglass size={16} className="text-content-muted group-hover:text-primary" />
                <span className="text-[11px] font-bold text-content-muted group-hover:text-content-main uppercase tracking-wider">Iniciar</span>
              </button>

              <div className="flex items-center gap-2">
                <button 
                  onClick={toggleTheme}
                  className="w-10 h-10 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-all border border-black/5 dark:border-white/5 group"
                >
                  {isDarkMode ? (
                    <Sun className="text-content-muted group-hover:text-primary transition-colors" size={18} />
                  ) : (
                    <Moon className="text-content-muted group-hover:text-primary transition-colors" size={18} />
                  )}
                </button>

                <button className="w-10 h-10 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-all border border-black/5 dark:border-white/5 relative group">
                  <Bell className="text-content-muted group-hover:text-primary transition-colors" size={18} />
                  <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-secondary rounded-full shadow-[0_0_5px_#FF8C00]"></span>
                </button>

                <button className="w-10 h-10 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-all border border-black/5 dark:border-white/5 group">
                  <FileText className="text-content-muted group-hover:text-primary" size={18} />
                </button>
              </div>
              
              <div className="flex items-center gap-3 pl-4 border-l border-black/10 dark:border-white/10 relative user-menu-container">
                <div 
                  className="flex items-center gap-3 cursor-pointer group"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-content-main tracking-tight group-hover:text-primary transition-colors leading-tight">Dwe</p>
                    <p className="text-[9px] text-primary font-bold uppercase tracking-widest opacity-80 leading-tight">Anual</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-tr from-primary to-secondary rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                    <img 
                      alt="User" 
                      className="relative w-10 h-10 rounded-xl object-cover grayscale-[20%] hover:grayscale-0 transition-all border border-black/5 dark:border-white/10" 
                      src="https://picsum.photos/seed/alex/100/100"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute top-full right-0 mt-3 w-56 bg-card-slate dark:bg-deep-slate border border-black/5 dark:border-white/5 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                    >
                      <div className="p-2 space-y-1">
                        <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-content-main hover:bg-primary/10 hover:text-primary rounded-xl transition-all group">
                          <User size={18} className="text-content-muted group-hover:text-primary" />
                          Meu Perfil
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-content-main hover:bg-primary/10 hover:text-primary rounded-xl transition-all group">
                          <Settings size={18} className="text-content-muted group-hover:text-primary" />
                          Configurações
                        </button>
                        <div className="h-px bg-black/5 dark:bg-white/5 my-1 mx-2"></div>
                        <button 
                          onClick={() => setIsLoggedIn(false)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-secondary hover:bg-secondary/10 rounded-xl transition-all group"
                        >
                          <LogOut size={18} className="text-secondary" />
                          Sair
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          {activeView === 'dashboard' ? (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <StatCard 
                  label="Active Tracks" 
                  value="08" 
                  subValue="+25% INCREASE" 
                  icon={Zap} 
                  colorClass="text-primary"
                />
                <StatCard 
                  label="Compute Time" 
                  value="24.5h" 
                  subValue="DAILY QUOTA: 86%" 
                  icon={BarChart3} 
                  colorClass="text-secondary"
                />
                <StatCard 
                  label="Validations" 
                  value="03" 
                  subValue="PENDING: 01" 
                  icon={CheckCircle2} 
                  colorClass="text-primary"
                />
              </div>

              {/* Bottom Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Current Processing */}
                <section className="lg:col-span-3">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-content-muted">Current Processing</h2>
                    <a className="text-xs font-bold text-primary hover:text-content-main transition-colors" href="#">TERMINAL VIEW</a>
                  </div>
                  <div className="space-y-4">
                    <ProcessingCard title="Advanced React Patterns" progress={65.0} icon={Code2} />
                    <ProcessingCard title="PostgreSQL Mastery" progress={42.8} icon={Database} />
                  </div>
                </section>

                {/* Scheduled Events */}
                <section className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-content-muted">Scheduled Events</h2>
                    <button className="text-xs font-bold text-content-muted hover:text-content-main transition-colors">LOG</button>
                  </div>
                  <div className="glow-card rounded-3xl p-6 relative">
                    <ul className="space-y-2">
                      <EventItem title="Quiz: Introduction to Hooks" time="T-MINUS: 02:40:00" active />
                      <EventItem title="Assignment: Schema Design" time="Tomorrow, 23:59" />
                      <EventItem title="Project Review: Portfolio" time="Friday, 10:00" isLast />
                    </ul>
                  </div>
                </section>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              {/* Search and Filters */}
              <div className="glow-card p-6 rounded-3xl flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-content-muted" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar..." 
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-primary/30 transition-all text-content-main placeholder:text-content-muted/50"
                  />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button className="flex items-center justify-center w-12 h-12 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl text-content-muted hover:text-primary transition-all">
                    <ChevronDown size={20} />
                  </button>
                  <div className="flex items-center bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl p-1.5 gap-1">
                    <button className="p-2 text-primary bg-white dark:bg-white/10 rounded-lg shadow-sm">
                      <Grid size={18} />
                    </button>
                    <button className="p-2 text-content-muted hover:text-primary transition-colors">
                      <ListIcon size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Subjects List */}
              <div className="space-y-4">
                <SubjectCard 
                  index={1} 
                  title="TEST SUBJECT" 
                  progress={50} 
                  isExpanded={expandedSubject === 1}
                  onToggle={() => setExpandedSubject(expandedSubject === 1 ? null : 1)}
                />
                <SubjectCard 
                  index={2} 
                  title="TEST SUBJECTTEST SUBJECT" 
                  progress={0} 
                  isExpanded={expandedSubject === 2}
                  onToggle={() => setExpandedSubject(expandedSubject === 2 ? null : 2)}
                />
                <SubjectCard 
                  index={3} 
                  title="LÍNGUA PORTUGUESA" 
                  progress={50} 
                  isExpanded={expandedSubject === 3}
                  onToggle={() => setExpandedSubject(expandedSubject === 3 ? null : 3)}
                />
                <SubjectCard 
                  index={4} 
                  title="TEST SUBJECT" 
                  progress={0} 
                  isExpanded={expandedSubject === 4}
                  onToggle={() => setExpandedSubject(expandedSubject === 4 ? null : 4)}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
