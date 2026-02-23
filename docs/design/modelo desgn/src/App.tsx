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
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active = false, 
  collapsed = false 
}: { 
  icon: any, 
  label: string, 
  active?: boolean, 
  collapsed?: boolean 
}) => (
  <a 
    href="#" 
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
      active ? 'nav-item-active' : 'text-sidebar-muted hover:bg-primary/5 hover:text-primary'
    }`}
  >
    <Icon size={22} />
    {!collapsed && <span className="font-medium text-sm whitespace-nowrap">{label}</span>}
  </a>
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

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

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
            <SidebarItem icon={LayoutDashboard} label="Painel" collapsed={collapsed} />
            <SidebarItem icon={RotateCcw} label="Ciclo de Estudos" collapsed={collapsed} />
            <SidebarItem icon={Clock} label="Revisões" active collapsed={collapsed} />
            <SidebarItem icon={Book} label="Matérias" collapsed={collapsed} />
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
                System: <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Online</span>
              </h1>
              <p className="text-content-muted text-sm mt-1 font-medium tracking-wide">Welcome back, operative Alex Johnson.</p>
            </div>

            <div className="flex items-center gap-5">
              <button 
                onClick={toggleTheme}
                className="w-11 h-11 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-all border border-black/5 dark:border-white/5 group"
              >
                {isDarkMode ? (
                  <Sun className="text-content-muted group-hover:text-primary transition-colors" size={20} />
                ) : (
                  <Moon className="text-content-muted group-hover:text-primary transition-colors" size={20} />
                )}
              </button>

              <button className="w-11 h-11 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-all border border-black/5 dark:border-white/5 relative group">
                <Bell className="text-content-muted group-hover:text-primary transition-colors" size={20} />
                <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-secondary rounded-full shadow-[0_0_5px_#FF8C00]"></span>
              </button>
              
              <div className="flex items-center gap-4 pl-5 border-l border-black/10 dark:border-white/10">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-content-main tracking-tight">Alex Johnson</p>
                  <p className="text-[10px] text-primary font-bold uppercase tracking-widest opacity-80">Level 4 Access</p>
                </div>
                <div className="relative group cursor-pointer">
                  <div className="absolute -inset-0.5 bg-gradient-to-tr from-primary to-secondary rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                  <img 
                    alt="User" 
                    className="relative w-11 h-11 rounded-xl object-cover grayscale-[20%] hover:grayscale-0 transition-all border border-black/5 dark:border-white/10" 
                    src="https://picsum.photos/seed/alex/100/100"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </div>
          </header>

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
        </div>
      </main>
    </div>
  );
}
