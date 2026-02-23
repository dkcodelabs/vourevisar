/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Calendar, 
  Layers, 
  BarChart3, 
  Settings, 
  Bell, 
  ChevronLeft, 
  ChevronRight,
  Database,
  Code2,
  CheckCircle2,
  Zap,
  Clock,
  MoreHorizontal
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
      active ? 'nav-item-active' : 'text-slate-400 hover:bg-primary/5 hover:text-primary'
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
  <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-primary/5 hover:text-primary rounded-xl transition-all group">
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
      <p className="text-4xl font-black text-white">{value}</p>
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
    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-primary/30 transition-all">
      <Icon className="text-primary" size={24} />
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-end mb-2">
        <h4 className="font-bold text-white text-[15px] tracking-tight">{title}</h4>
        <span className="text-[11px] font-black text-secondary">{progress.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
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
          : 'bg-white/5'
      }`}></div>}
    </div>
    <div className="pb-6">
      <p className={`text-sm font-bold text-white transition-colors ${
        active ? 'group-hover:text-secondary' : 'group-hover:text-primary'
      }`}>{title}</p>
      <p className="text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-wider">{time}</p>
    </div>
  </li>
);

export default function App() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex p-4 gap-4 overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: collapsed ? 80 : 256 }}
        className="flex flex-col bg-deep-slate rounded-3xl shrink-0 overflow-hidden relative border border-white/5"
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,191,255,0.3)]">
              <Layers className="text-black font-bold" size={20} />
            </div>
            {!collapsed && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-white font-extrabold text-xl tracking-tight whitespace-nowrap"
              >
                EDU<span className="text-primary">FLOW</span>
              </motion.span>
            )}
          </div>
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-slate-500"
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-3 space-y-8 mt-6">
          <div>
            {!collapsed && <p className="px-4 data-label mb-4">Core Console</p>}
            <nav className="space-y-1">
              <SidebarItem icon={LayoutDashboard} label="Dashboard" active collapsed={collapsed} />
              <SidebarItem icon={BookOpen} label="Courses" collapsed={collapsed} />
              <SidebarItem icon={Clock} label="Timeline" collapsed={collapsed} />
              <SidebarItem icon={Layers} label="Resources" collapsed={collapsed} />
              <SidebarItem icon={BarChart3} label="Analytics" collapsed={collapsed} />
            </nav>
          </div>

          <div>
            {!collapsed && (
              <div className="flex items-center justify-between px-4 mb-4">
                <p className="data-label">Active Modules</p>
              </div>
            )}
            <nav className="space-y-1">
              <ModuleItem color="bg-secondary" label="UI Engineering" collapsed={collapsed} />
              <ModuleItem color="bg-primary" label="Data Structures" collapsed={collapsed} />
            </nav>
          </div>
        </div>

        <div className="p-4 mt-auto border-t border-white/5">
          <SidebarItem icon={Settings} label="System Config" collapsed={collapsed} />
          {!collapsed && (
            <div className="px-4 py-2 text-[10px] text-slate-600 font-mono tracking-tighter">
              V.2.0.4-STABLE
            </div>
          )}
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 h-[calc(100vh-2rem)] overflow-y-auto no-scrollbar glass-card rounded-3xl p-8 relative">
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              System: <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Online</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium tracking-wide">Welcome back, operative Alex Johnson.</p>
          </div>

          <div className="flex items-center gap-5">
            <button className="w-11 h-11 flex items-center justify-center bg-white/5 rounded-xl hover:bg-white/10 transition-all border border-white/5 relative group">
              <Bell className="text-slate-400 group-hover:text-primary transition-colors" size={20} />
              <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-secondary rounded-full shadow-[0_0_5px_#FF8C00]"></span>
            </button>
            
            <div className="flex items-center gap-4 pl-5 border-l border-white/10">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-white tracking-tight">Alex Johnson</p>
                <p className="text-[10px] text-primary font-bold uppercase tracking-widest opacity-80">Level 4 Access</p>
              </div>
              <div className="relative group cursor-pointer">
                <div className="absolute -inset-0.5 bg-gradient-to-tr from-primary to-secondary rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                <img 
                  alt="User" 
                  className="relative w-11 h-11 rounded-xl object-cover grayscale-[20%] hover:grayscale-0 transition-all border border-white/10" 
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
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Current Processing</h2>
              <a className="text-xs font-bold text-primary hover:text-white transition-colors" href="#">TERMINAL VIEW</a>
            </div>
            <div className="space-y-4">
              <ProcessingCard title="Advanced React Patterns" progress={65.0} icon={Code2} />
              <ProcessingCard title="PostgreSQL Mastery" progress={42.8} icon={Database} />
            </div>
          </section>

          {/* Scheduled Events */}
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Scheduled Events</h2>
              <button className="text-xs font-bold text-slate-500 hover:text-white transition-colors">LOG</button>
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
      </main>
    </div>
  );
}
