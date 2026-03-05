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
  EyeOff,
  ChevronUp,
  LayoutGrid,
  Rows,
  Copy,
  Files,
  Trash2,
  CheckSquare,
  Square,
  GripVertical,
  Star,
  HelpCircle,
  Maximize2,
  Minimize2,
  Play,
  Sparkles,
  Layers,
  Wand2,
  PenLine,
  Loader2,
  Save,
  Undo2,
  ArrowLeft,
  Check,
  X,
  Search as SearchIcon,
  Info,
  Merge,
  Settings2,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

interface Topic {
  id: number;
  title: string;
  status: 'not_studied' | 'completed' | 'in_days' | 'delayed';
  isStarted?: boolean;
  source?: string;
}

interface Subject {
  id: number;
  title: string;
  progress: number;
  isDuplicate: boolean;
  topics: Topic[];
  source?: string;
}

const Toast = ({ message, onClose }: { message: string, onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: -20, x: '-50%' }}
    animate={{ opacity: 1, y: 0, x: '-50%' }}
    exit={{ opacity: 0, y: -20, x: '-50%' }}
    className="fixed top-8 left-1/2 z-[100] bg-rose-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm tracking-wide"
  >
    <Info size={18} />
    {message}
    <button onClick={onClose} className="ml-2 hover:opacity-70 transition-opacity">
      <X size={16} />
    </button>
  </motion.div>
);

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

interface TopicItemProps {
  index: number;
  title: string;
  status: 'not_studied' | 'completed' | 'in_days' | 'delayed';
  isStarted?: boolean;
  source?: string;
}

const TopicItem: React.FC<TopicItemProps> = ({ 
  index, 
  title, 
  status, 
  isStarted = false,
  source
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'not_studied':
        return <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[9px] font-bold text-slate-500 dark:text-slate-400">Não estudado</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">Concluído</span>;
      case 'in_days':
        return <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-[9px] font-bold text-indigo-600 dark:text-indigo-400">Em 1 dia</span>;
      case 'delayed':
        return <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-[9px] font-bold text-rose-600 dark:text-rose-400">2 dias de atraso</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-all group">
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold text-content-muted w-3">{index}.</span>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-content-main">{title}</span>
          {source && (
            <span className="text-[8px] font-black text-primary/60 uppercase tracking-widest">{source}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {getStatusBadge()}
        <button className="p-1 text-content-muted hover:text-primary transition-colors">
          <FileText size={14} />
        </button>
        <button className={`w-6 h-6 flex items-center justify-center rounded-full transition-all ${
          isStarted 
            ? 'bg-primary/20 text-primary hover:bg-primary/30' 
            : 'bg-black/5 dark:bg-white/5 text-content-muted hover:text-primary'
        }`}>
          {isStarted ? <ArrowRight size={12} /> : <Circle size={12} />}
        </button>
      </div>
    </div>
  );
};

const TopicList = ({ topics = [], variant = 'standard' }: { topics?: Topic[], variant?: 'standard' | 'cycle' }) => (
  <div className={variant === 'cycle' ? "mt-2 space-y-2" : "mt-2 ml-4 p-3 rounded-xl bg-black/5 dark:bg-black/20 space-y-2 border border-black/5 dark:border-white/5"}>
    <div className="relative group">
      <input 
        type="text" 
        placeholder="Novo tópico..." 
        className={`w-full bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-lg py-1.5 px-3 pr-8 text-xs focus:outline-none focus:border-primary/30 transition-all text-content-main placeholder:text-content-muted/50 ${variant === 'cycle' ? 'rounded-xl py-2 px-4 pr-10 shadow-sm' : ''}`}
      />
      <button className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-all ${variant === 'cycle' ? 'right-2 w-7 h-7 rounded-lg' : ''}`}>
        <Plus size={variant === 'cycle' ? 16 : 14} />
      </button>
    </div>
    <div className={`space-y-1 ${variant === 'cycle' ? 'space-y-1.5 pl-1' : ''}`}>
      {topics.length > 0 ? (
        topics.map((topic, idx) => (
          <TopicItem 
            key={topic.id} 
            index={idx + 1} 
            title={topic.title} 
            status={topic.status} 
            isStarted={topic.isStarted}
            source={topic.source}
          />
        ))
      ) : (
        <div className="py-4 text-center text-[10px] text-content-muted uppercase font-bold tracking-widest">Nenhum tópico cadastrado</div>
      )}
    </div>
  </div>
);

const SubjectCard: React.FC<{ 
  index: number, 
  title: string, 
  progress: number,
  topics?: Topic[],
  isExpanded?: boolean,
  onToggle?: () => void,
  isDuplicate?: boolean,
  isSelectionMode?: boolean,
  isSelected?: boolean,
  onSelect?: () => void,
  source?: string,
  isDisabled?: boolean,
  onDisabledClick?: () => void
}> = ({ 
  index, 
  title, 
  progress,
  topics = [],
  isExpanded,
  onToggle,
  isDuplicate,
  isSelectionMode,
  isSelected,
  onSelect,
  source,
  isDisabled,
  onDisabledClick
}) => (
  <div className="flex flex-col">
    <div 
      onClick={isDisabled ? onDisabledClick : (isSelectionMode ? onSelect : onToggle)}
      className={`glow-card p-4 rounded-2xl flex items-center justify-between group hover:border-primary/20 transition-all cursor-pointer ${
        isExpanded ? 'border-primary/30 shadow-primary/5' : ''
      } ${isSelected ? 'border-primary/50 bg-primary/5' : ''} ${isDisabled ? 'opacity-40 grayscale-[0.5] cursor-not-allowed' : ''}`}
    >
      <div className="flex items-center gap-3">
        {isSelectionMode ? (
          <div className={isDisabled ? 'text-content-muted' : 'text-primary'}>
            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
          </div>
        ) : (
          <GripVertical size={14} className="text-content-muted opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
        )}
        <div className="w-7 h-5 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
          <span className="text-[9px] font-bold text-primary">#{index}</span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-content-main text-xs tracking-tight uppercase truncate max-w-[250px]">{title}</h4>
            {isDuplicate && (
              <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[8px] font-black rounded-md border border-primary/20">DUP</span>
            )}
          </div>
          {source && (
            <span className="text-[8px] font-black text-content-muted uppercase tracking-widest mt-0.5">#{source}</span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <CircularProgress progress={progress} size={28} />
        <div className="flex items-center gap-0.5">
          <button 
            onClick={(e) => { e.stopPropagation(); }}
            title="Anotações"
            className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors text-primary"
          >
            <FileText size={14} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); }}
            title={isDuplicate ? "Cópia" : "Duplicar"}
            className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors text-content-muted hover:text-primary"
          >
            {isDuplicate ? <Files size={14} /> : <Copy size={14} />}
          </button>
        </div>
        <div className="w-px h-4 bg-black/5 dark:bg-white/5 mx-0.5"></div>
        <button className={`p-1.5 hover:bg-primary/10 rounded-lg transition-all text-content-muted hover:text-primary ${
          isExpanded ? 'rotate-180 text-primary' : ''
        }`}>
          <ChevronDown size={16} />
        </button>
      </div>
    </div>
    <AnimatePresence>
      {isExpanded && !isSelectionMode && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden px-2"
        >
          <TopicList topics={topics} />
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const CycleSubjectCard = ({ 
  index, 
  title, 
  progress,
  topics = [],
  isExpanded,
  onToggle,
  viewMode = 'list',
  isDuplicate,
  isSelectionMode,
  isSelected,
  onSelect,
  source,
  isDisabled,
  onDisabledClick
}: { 
  index: number, 
  title: string, 
  progress: number,
  topics?: Topic[],
  isExpanded?: boolean,
  onToggle?: () => void,
  viewMode?: 'grid' | 'list',
  isDuplicate?: boolean,
  isSelectionMode?: boolean,
  isSelected?: boolean,
  onSelect?: () => void,
  source?: string,
  isDisabled?: boolean,
  onDisabledClick?: () => void
}) => (
  <div className={`flex flex-col ${viewMode === 'grid' ? 'h-full' : ''}`}>
    <div 
      onClick={isDisabled ? onDisabledClick : (isSelectionMode ? onSelect : onToggle)}
      className={`glow-card p-4 rounded-2xl flex items-center justify-between group hover:border-primary/20 transition-all cursor-pointer ${
        isExpanded ? 'border-primary/30 shadow-primary/5' : ''
      } ${isSelected ? 'border-primary/50 bg-primary/5' : ''} ${isDisabled ? 'opacity-40 grayscale-[0.5] cursor-not-allowed' : ''}`}
    >
      <div className="flex items-center gap-3">
        {isSelectionMode ? (
          <div className={isDisabled ? 'text-content-muted' : 'text-primary'}>
            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
          </div>
        ) : (
          <GripVertical size={14} className="text-content-muted opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
        )}
        <div className="w-7 h-5 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
          <span className="text-[9px] font-bold text-primary">#{index}</span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-content-main text-xs tracking-tight uppercase truncate max-w-[200px]">{title}</h4>
            {isDuplicate && (
              <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[8px] font-black rounded-md border border-primary/20">DUP</span>
            )}
          </div>
          {source && (
            <span className="text-[8px] font-black text-content-muted uppercase tracking-widest mt-0.5">#{source}</span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <CircularProgress progress={progress} size={28} />
        <div className="flex items-center gap-0.5">
          <button 
            onClick={(e) => { e.stopPropagation(); }}
            title="Anotações"
            className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors text-primary"
          >
            <FileText size={14} />
          </button>
        </div>
        <div className="w-px h-4 bg-black/5 dark:bg-white/5 mx-0.5"></div>
        <button className={`p-1.5 hover:bg-primary/10 rounded-lg transition-all text-content-muted hover:text-primary ${
          isExpanded ? 'rotate-180 text-primary' : ''
        }`}>
          <ChevronDown size={16} />
        </button>
      </div>
    </div>
    {viewMode === 'list' && (
      <AnimatePresence>
        {isExpanded && !isSelectionMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden px-4"
          >
            <TopicList variant="cycle" />
          </motion.div>
        )}
      </AnimatePresence>
    )}
    {viewMode === 'grid' && !isSelectionMode && <div className="px-2"><TopicList variant="cycle" /></div>}
  </div>
);

const CycleTopicItem: React.FC<{ 
  name: string, 
  subject: string, 
  difficulty: number, 
  progressLabel: string, 
  progressValue: number,
  source?: string
}> = ({ 
  name, 
  subject, 
  difficulty, 
  progressLabel, 
  progressValue,
  source
}) => (
  <div className="flex items-center justify-between py-3 px-6 hover:bg-primary/5 transition-colors border-b border-black/5 dark:border-white/5 last:border-0 group">
    <div className="flex items-center gap-4 flex-1">
      <div className="w-1 h-8 bg-rose-500 rounded-full opacity-70 group-hover:opacity-100 transition-opacity"></div>
      <div>
        <h4 className="text-xs font-bold text-content-main leading-tight">{name}</h4>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[9px] text-content-muted font-bold uppercase tracking-wider">{subject}</p>
          {source && (
            <span className="text-[8px] font-black text-content-muted uppercase tracking-widest bg-primary/5 px-1 rounded">#{source}</span>
          )}
        </div>
      </div>
    </div>
    
    <div className="flex items-center justify-center w-32">
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-bold text-content-main">{difficulty}</span>
        <Star size={10} className="fill-secondary text-secondary" />
      </div>
    </div>

    <div className="flex flex-col items-center w-32">
      <span className="text-[9px] font-black text-rose-500 mb-1">{progressLabel}</span>
      <div className="w-16 bg-black/5 dark:bg-white/5 h-1 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progressValue}%` }}
          className="bg-rose-500 h-full rounded-full shadow-[0_0_5px_rgba(244,63,94,0.3)]" 
        />
      </div>
    </div>

    <div className="flex items-center justify-end gap-3 w-32">
      <button className="p-1.5 text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all">
        <Sparkles size={14} />
      </button>
      <button className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all">
        <Play size={14} fill="currentColor" />
      </button>
      <button className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-all">
        <FileText size={14} />
      </button>
    </div>
  </div>
);

const CycleView = ({ isMaximized, setIsMaximized }: { isMaximized: boolean, setIsMaximized: (val: boolean) => void }) => {
  const [groupBySubject, setGroupBySubject] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Hoje']);
  const [sortBy, setSortBy] = useState<'name' | 'difficulty' | 'progress'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [difficultyFilter, setDifficultyFilter] = useState(0);
  const [progressFilter, setProgressFilter] = useState('Todos');

  const cycleDifficultyFilter = () => {
    setDifficultyFilter((prev) => (prev + 1) % 4);
  };

  const cycleProgressFilter = () => {
    const filters = ['Todos', 'R1', 'R2', 'R3', 'R4'];
    const currentIndex = filters.indexOf(progressFilter);
    const nextIndex = (currentIndex + 1) % filters.length;
    setProgressFilter(filters[nextIndex]);
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => 
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    );
  };

  const handleSort = (field: 'name' | 'difficulty' | 'progress') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const topics = [
    { id: 1, name: 'Redes de Computadores', subject: 'NOÇÕES DE INFORMÁTICA', difficulty: 2, progressLabel: 'R4', progressValue: 80, status: 'Hoje' },
    { id: 2, name: 'Pontuação', subject: 'LÍNGUA PORTUGUESA', difficulty: 2, progressLabel: 'R1', progressValue: 30, status: 'Hoje' },
    { id: 3, name: 'Teste mat top 1', subject: 'TESTE MATERIA', difficulty: 2, progressLabel: 'R2', progressValue: 50, status: 'Hoje' },
    { id: 4, name: 'topia 1', subject: 'TEST SUBJECT', difficulty: 1, progressLabel: 'R2', progressValue: 45, status: 'Hoje' },
  ];

  const filteredTopics = topics.filter(topic => {
    const matchesDifficulty = difficultyFilter === 0 || topic.difficulty === difficultyFilter;
    const matchesProgress = progressFilter === 'Todos' || topic.progressLabel === progressFilter;
    return matchesDifficulty && matchesProgress;
  });

  const sortedTopics = [...filteredTopics].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
    else if (sortBy === 'difficulty') comparison = a.difficulty - b.difficulty;
    else if (sortBy === 'progress') comparison = a.progressValue - b.progressValue;
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const groups = groupBySubject 
    ? Array.from(new Set(sortedTopics.map(t => t.subject))).map(s => ({ name: s, items: sortedTopics.filter(t => t.subject === s), color: 'text-primary' }))
    : [
        { name: 'Hoje', items: sortedTopics.filter(t => t.status === 'Hoje'), color: 'text-rose-500' },
        { name: 'Futuras', items: [], color: 'text-indigo-500' },
        { name: 'Não Iniciados', items: [], color: 'text-slate-500' },
        { name: 'Concluídas', items: [], color: 'text-emerald-500' },
      ];

  const toggleAllGroups = () => {
    if (expandedGroups.length > 0) {
      setExpandedGroups([]);
      setIsMaximized(false);
    } else {
      setExpandedGroups(groups.map(g => g.name));
      setIsMaximized(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="glow-card p-2 rounded-2xl flex items-center gap-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-content-muted/50" size={16} />
          <input 
            type="text" 
            placeholder="Pesquisar no ciclo..." 
            className="w-full h-10 bg-slate-50 dark:bg-white/5 border-none rounded-xl pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all text-content-main placeholder:text-content-muted/30"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 rounded-xl p-1 h-10">
          <button 
            onClick={() => setGroupBySubject(false)}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all uppercase tracking-wider ${!groupBySubject ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-content-muted hover:text-primary'}`}
          >
            Padrão
          </button>
          <button 
            onClick={() => setGroupBySubject(true)}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all uppercase tracking-wider ${groupBySubject ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-content-muted hover:text-primary'}`}
          >
            Matéria
          </button>
        </div>

        <div className="w-px h-6 bg-black/5 dark:bg-white/5 mx-1"></div>

        <div className="flex items-center gap-1 px-2">
          <button className="px-4 py-1.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-500 flex items-center gap-2">
            Hoje <span className="bg-rose-500 text-white px-1.5 py-0.5 rounded-full text-[9px]">4</span>
          </button>
        </div>

        <div className="w-px h-6 bg-black/5 dark:bg-white/5 mx-1"></div>

        <div className="flex items-center gap-1">
          <button 
            onClick={toggleAllGroups}
            title={expandedGroups.length > 0 ? "Recolher tudo" : "Expandir tudo"}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
              expandedGroups.length > 0 ? 'bg-primary/10 text-primary' : 'text-content-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            {expandedGroups.length > 0 ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button className="w-10 h-10 flex items-center justify-center text-content-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors">
            <HelpCircle size={18} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.name} className="glow-card rounded-xl overflow-hidden border border-black/5 dark:border-white/5 shadow-sm">
            <button 
              onClick={() => toggleGroup(group.name)}
              className="w-full flex items-center justify-between py-3 px-5 hover:bg-primary/5 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-white/5 text-content-muted transition-transform ${expandedGroups.includes(group.name) ? 'rotate-0' : '-rotate-90'}`}>
                  <ChevronDown size={14} />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[13px] font-bold uppercase tracking-tight ${group.color || 'text-content-main'}`}>{group.name}</span>
                  {group.name === 'Hoje' && !groupBySubject && (
                    <>
                      <span className="text-[13px] font-bold text-content-muted opacity-30">/</span>
                      <span className="text-[13px] font-bold text-rose-500">Atrasadas</span>
                    </>
                  )}
                  <span className="bg-black/5 dark:bg-white/5 text-content-muted px-2 py-0.5 rounded-md text-[9px] font-bold ml-2">{group.items.length} itens</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-content-muted opacity-40 group-hover:opacity-100 transition-opacity">Clique para alternar visão</span>
            </button>

            <AnimatePresence>
              {expandedGroups.includes(group.name) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-slate-50/50 dark:bg-black/20 border-t border-black/5 dark:border-white/5">
                    <div className="grid grid-cols-[1fr_128px_128px_128px] px-6 py-4 border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleSort('name'); }}
                        className="text-[10px] font-bold text-content-muted uppercase tracking-widest text-left hover:text-primary transition-colors flex items-center gap-2 group/h"
                      >
                        <div className="flex items-center gap-2">
                          TÓPICO / MATÉRIA
                          <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase">
                            {sortBy === 'name' ? 'Nome' : 'Tópico'}
                          </span>
                        </div>
                        <div className={`flex flex-col gap-0.5 transition-opacity ${sortBy === 'name' ? 'opacity-100' : 'opacity-0 group-hover/h:opacity-50'}`}>
                          <ChevronDown size={8} className={`transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); cycleDifficultyFilter(); }}
                        className="text-[10px] font-bold text-content-muted uppercase tracking-widest text-center hover:text-primary transition-colors flex flex-col items-center gap-1 group/h"
                      >
                        <div className={`flex items-center gap-2 transition-colors ${difficultyFilter > 0 ? 'text-primary' : ''}`}>
                          DIFICULDADE
                          <div className={`flex flex-col gap-0.5 transition-opacity ${sortBy === 'difficulty' ? 'opacity-100' : 'opacity-0 group-hover/h:opacity-50'}`}>
                            <ChevronDown size={8} className={`transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                          </div>
                        </div>
                        <div className="flex items-center gap-0">
                          {[1, 2, 3].map((s) => (
                            <Star key={s} size={10} className={s <= difficultyFilter ? 'fill-primary text-primary' : 'text-content-muted/30'} />
                          ))}
                          {difficultyFilter === 0 && <span className="text-[8px] ml-1 text-content-muted/50">TODAS</span>}
                        </div>
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); cycleProgressFilter(); }}
                        className="text-[10px] font-bold text-content-muted uppercase tracking-widest text-center hover:text-primary transition-colors flex flex-col items-center gap-1 group/h"
                      >
                        <div className={`flex items-center gap-2 transition-colors ${progressFilter !== 'Todos' ? 'text-primary' : ''}`}>
                          PROGRESSO
                          <div className={`flex flex-col gap-0.5 transition-opacity ${sortBy === 'progress' ? 'opacity-100' : 'opacity-0 group-hover/h:opacity-50'}`}>
                            <ChevronDown size={8} className={`transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                          </div>
                        </div>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-black transition-all ${progressFilter === 'Todos' ? 'bg-content-muted/10 text-content-muted/50' : 'bg-primary text-white shadow-sm'}`}>
                          {progressFilter}
                        </span>
                      </button>
                      <span className="text-[10px] font-bold text-content-muted uppercase tracking-widest text-center flex items-center justify-center">AÇÕES</span>
                    </div>
                    {group.items.length > 0 ? (
                      <div className="divide-y divide-black/5 dark:divide-white/5">
                        {group.items.map(topic => (
                          <CycleTopicItem 
                            key={topic.id} 
                            name={topic.name}
                            subject={topic.subject}
                            difficulty={topic.difficulty}
                            progressLabel={topic.progressLabel}
                            progressValue={topic.progressValue}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <p className="text-xs font-bold text-content-muted uppercase tracking-widest">Nenhum item nesta categoria</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
};

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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" className="w-full h-auto max-w-[280px]">
            <defs>
              <linearGradient id="neonGradientGraph" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ff7b00" />
                <stop offset="50%" stopColor="#ffea00" />
                <stop offset="100%" stopColor="#00ff87" />
              </linearGradient>

              <filter id="neonGlow" filterUnits="userSpaceOnUse" x="-200" y="-200" width="1200" height="1000">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur2" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur3" />
                <feMerge>
                  <feMergeNode in="blur3" />
                  <feMergeNode in="blur2" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Linha Base Azul */}
            <path d="M 580 345 L 220 345.01" stroke="#00d2ff" strokeWidth="12" strokeLinecap="round" fill="none"
              filter="url(#neonGlow)" />

            {/* Linha do Gráfico */}
            <path d="M 220 320 L 330 180 L 440 300 L 580 140" stroke="url(#neonGradientGraph)" strokeWidth="12"
              strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#neonGlow)" />

            {/* Texto */}
            <g>
              <text x="400" y="420" fontSize="64" className="fill-content-main" textAnchor="middle" letterSpacing="-1.5"
                fontFamily="Plus Jakarta Sans, Inter, system-ui, sans-serif">
                <tspan fontWeight="400">vou</tspan>
                <tspan fontWeight="700">Revisar</tspan>
              </text>
            </g>
          </svg>
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

const TopicsView = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('Todas as disciplinas');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [difficultyFilter, setDifficultyFilter] = useState(0);
  const [sortBy, setSortBy] = useState<'subject' | 'name'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const allTopics = [
    { id: 1, name: 'Teste mat top 1', subject: 'Teste Materia', difficulty: 2, status: '1/4 - 18 dias atraso', statusType: 'atrasado', color: 'bg-red-500', revisionDate: '2024-02-10' },
    { id: 2, name: 'topia 1', subject: 'Test Subject', difficulty: 3, status: '1/4 - 4 dias atraso', statusType: 'atrasado', color: 'bg-red-500', revisionDate: '2024-02-24' },
    { id: 3, name: 'Redes de Computadores', subject: 'Noções De Informática', difficulty: 2, status: '4/4 - Em 1 dias', statusType: 'futuro', color: 'bg-blue-500', revisionDate: '2024-03-02' },
    { id: 4, name: 'Internet', subject: 'Noções De Informática', difficulty: 3, status: '2/4 - Em 2 dias', statusType: 'futuro', color: 'bg-blue-500', revisionDate: '2024-03-03' },
    { id: 5, name: 'topico 3', subject: 'Test Subjecttest Subject', difficulty: 0, status: '0/4 - Em 0 dias', statusType: 'futuro', color: 'bg-blue-500', revisionDate: '2024-03-01' },
    { id: 6, name: 'topico 4', subject: 'Test Subjecttest Subject', difficulty: 0, status: '0/4 - Em 0 dias', statusType: 'futuro', color: 'bg-blue-500', revisionDate: '2024-03-01' },
    { id: 7, name: 'topico 2', subject: 'Test Subject', difficulty: 0, status: '0/4 - Em 0 dias', statusType: 'futuro', color: 'bg-blue-500', revisionDate: '2024-03-01' },
    { id: 8, name: 'Crase', subject: 'Língua Portuguesa', difficulty: 1, status: 'Concluído', statusType: 'concluido', color: 'bg-green-500', revisionDate: '2024-02-28' },
    { id: 9, name: 'Pontuação', subject: 'Língua Portuguesa', difficulty: 0, status: '0/4 - Em 0 dias', statusType: 'futuro', color: 'bg-blue-500', revisionDate: '2024-03-01' },
  ];

  const filteredTopics = allTopics
    .filter(topic => {
      const matchesSearch = topic.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           topic.subject.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject = subjectFilter === 'Todas as disciplinas' || topic.subject === subjectFilter;
      const matchesStatus = statusFilter === 'Todos' || 
                           (statusFilter === 'Atrasado' && topic.statusType === 'atrasado') ||
                           (statusFilter === 'Futuro' && topic.statusType === 'futuro') ||
                           (statusFilter === 'Hoje' && topic.status.includes('0 dias')) ||
                           (statusFilter === 'Concluído' && topic.statusType === 'concluido');
      const matchesDifficulty = difficultyFilter === 0 || topic.difficulty === difficultyFilter;
      
      return matchesSearch && matchesSubject && matchesStatus && matchesDifficulty;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortBy === 'subject') comparison = a.subject.localeCompare(b.subject);
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const cycleStatusFilter = () => {
    const filters = ['Todos', 'Atrasado', 'Hoje', 'Futuro', 'Concluído'];
    const currentIndex = filters.indexOf(statusFilter);
    const nextIndex = (currentIndex + 1) % filters.length;
    setStatusFilter(filters[nextIndex]);
  };

  const cycleDifficultyFilter = () => {
    setDifficultyFilter((prev) => (prev + 1) % 4);
  };

  const toggleTopicSort = () => {
    if (sortBy === 'name') setSortBy('subject');
    else setSortBy('name');
  };

  const renderStars = (count: number) => {
    return (
      <div className="flex items-center justify-center gap-0">
        {[1, 2, 3].map((star) => (
          <Star 
            key={star} 
            size={11} 
            className={`${star <= count ? 'fill-secondary text-secondary' : 'text-content-muted/30'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters Header */}
      <div className="glow-card p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" size={14} />
          <input 
            type="text" 
            placeholder="Pesquisar tópicos ou matérias..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-primary/30 transition-all text-content-main placeholder:text-content-muted/50 shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2 text-content-muted font-bold uppercase tracking-widest hidden sm:flex">
          <Zap size={14} className="text-primary" />
          <p className="text-[10px]">
            Clique nos cabeçalhos para filtrar e ordenar
          </p>
        </div>
      </div>

      {/* Topics Table */}
      <div className="glow-card rounded-2xl overflow-hidden border border-black/5 dark:border-white/5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                <th 
                  className="px-6 py-4 text-[10px] font-bold text-content-muted uppercase tracking-widest cursor-pointer hover:text-primary transition-colors"
                  onClick={toggleTopicSort}
                >
                  <div className="flex items-center gap-2">
                    TÓPICO / MATÉRIA
                    <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase">
                      {sortBy === 'name' ? 'Nome' : 'Matéria'}
                    </span>
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-[10px] font-bold text-content-muted uppercase tracking-widest cursor-pointer hover:text-primary transition-colors text-center"
                  onClick={cycleDifficultyFilter}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span>DIFICULDADE</span>
                    <div className="flex items-center gap-0">
                      {[1, 2, 3].map((s) => (
                        <Star key={s} size={10} className={s <= difficultyFilter ? 'fill-primary text-primary' : 'text-content-muted/30'} />
                      ))}
                      {difficultyFilter === 0 && <span className="text-[8px] ml-1">TODAS</span>}
                    </div>
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-[10px] font-bold text-content-muted uppercase tracking-widest cursor-pointer hover:text-primary transition-colors text-center"
                  onClick={cycleStatusFilter}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span>STATUS</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase ${
                      statusFilter === 'Todos' ? 'bg-content-muted/10 text-content-muted' : 'bg-primary/10 text-primary'
                    }`}>
                      {statusFilter}
                    </span>
                  </div>
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-content-muted uppercase tracking-widest text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {filteredTopics.length > 0 ? (
                filteredTopics.map((topic) => (
                  <tr key={topic.id} className="group hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-content-main">{topic.name}</span>
                        <span className="text-[10px] text-content-muted font-medium">{topic.subject}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      {renderStars(topic.difficulty)}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${
                        topic.statusType === 'atrasado' ? 'bg-red-500/10 text-red-500' :
                        topic.statusType === 'futuro' ? 'bg-blue-500/10 text-blue-500' :
                        topic.statusType === 'concluido' ? 'bg-green-500/10 text-green-500' :
                        'bg-blue-500/10 text-blue-500'
                      }`}>
                        {topic.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors text-content-muted hover:text-primary">
                          <FileText size={11} />
                        </button>
                        <button className="p-1.5 hover:bg-secondary/10 rounded-lg transition-colors text-content-muted hover:text-secondary">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <p className="text-xs font-bold text-content-muted uppercase tracking-widest">Nenhum tópico encontrado com os filtros atuais</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


const EmptySubjectsState = ({ onImportClick, onManualClick }: { onImportClick: () => void, onManualClick: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-20 px-6 text-center max-w-4xl mx-auto"
  >
    <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(14,116,144,0.2)] border border-primary/20">
      <div className="text-4xl">📖</div>
    </div>
    
    <h2 className="text-4xl font-black text-content-main mb-4 tracking-tight">
      Organize seu Conteúdo de Estudos
    </h2>
    
    <p className="text-content-muted text-base leading-relaxed mb-12 max-w-lg font-medium">
      Cadastre suas matérias e tópicos — o sistema cuida de tudo para você.
    </p>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
      <motion.button
        whileHover={{ y: -8, scale: 1.02 }}
        onClick={onImportClick}
        className="glow-card p-10 rounded-[40px] flex flex-col items-center text-center group transition-all border-primary/10 hover:border-primary/40 bg-zinc-900/50 backdrop-blur-xl relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(14,116,144,0.2)] border border-primary/20">
          <Wand2 className="text-primary" size={32} />
        </div>
        <h3 className="text-xl font-black text-content-main mb-4 tracking-tight">Importar Edital Completo</h3>
        <p className="text-sm text-content-muted leading-relaxed font-medium">
          Busque um concurso pronto ou use nossa IA para ler seu PDF em segundos.
        </p>
      </motion.button>

      <motion.button
        whileHover={{ y: -8, scale: 1.02 }}
        onClick={onManualClick}
        className="glow-card p-10 rounded-[40px] flex flex-col items-center text-center group transition-all border-white/5 hover:border-white/10 bg-zinc-800/30 backdrop-blur-xl"
      >
        <div className="w-20 h-20 bg-zinc-700/30 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform border border-white/5">
          <PenLine className="text-content-muted group-hover:text-primary transition-colors" size={32} />
        </div>
        <h3 className="text-xl font-black text-content-main mb-4 tracking-tight">Adicionar Manualmente</h3>
        <p className="text-sm text-content-muted leading-relaxed font-medium">
          Cadastre suas disciplinas e tópicos um por um.
        </p>
      </motion.button>
    </div>
  </motion.div>
);

interface MergeSuggestion {
  subjectIds: number[];
  suggestedName: string;
  approved: boolean;
}

const SmartMergeModal = ({ 
  isOpen, 
  onClose, 
  suggestions, 
  subjects,
  onApply 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  suggestions: MergeSuggestion[], 
  subjects: Subject[],
  onApply: (approvedSuggestions: MergeSuggestion[]) => void 
}) => {
  const [localSuggestions, setLocalSuggestions] = useState<MergeSuggestion[]>([]);

  useEffect(() => {
    setLocalSuggestions(suggestions);
  }, [suggestions, isOpen]);

  if (!isOpen) return null;

  const toggleApproval = (index: number) => {
    setLocalSuggestions(prev => prev.map((s, i) => i === index ? { ...s, approved: !s.approved } : s));
  };

  const updateName = (index: number, name: string) => {
    setLocalSuggestions(prev => prev.map((s, i) => i === index ? { ...s, suggestedName: name } : s));
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-2xl bg-card-slate border border-black/10 dark:border-white/10 rounded-[32px] p-8 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-black text-content-main tracking-tight flex items-center gap-2">
              <Sparkles className="text-primary" size={20} />
              Sugestões Inteligentes de Mescla
            </h3>
            <p className="text-xs text-content-muted mt-1">A IA identificou matérias duplicadas ou similares.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
            <X size={20} className="text-content-muted" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-8 custom-scrollbar">
          {localSuggestions.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-deep-slate rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-content-muted" />
              </div>
              <p className="text-sm font-bold text-content-muted uppercase tracking-widest">Nenhuma sugestão encontrada</p>
            </div>
          ) : (
            localSuggestions.map((suggestion, idx) => {
              const subjectsToMerge = subjects.filter(s => suggestion.subjectIds.includes(s.id));
              return (
                <div 
                  key={idx} 
                  className={`p-5 rounded-2xl border transition-all ${
                    suggestion.approved ? 'bg-primary/5 border-primary/30' : 'bg-deep-slate border-black/5 dark:border-white/5 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-primary mb-2">
                        <RotateCcw size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Unir Matérias:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {subjectsToMerge.map(s => (
                          <span key={s.id} className="px-2 py-1 bg-deep-slate rounded-lg text-[10px] font-bold text-content-main border border-black/5 dark:border-white/5">
                            {s.title} {s.source && <span className="text-content-muted ml-1">#{s.source}</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button 
                      onClick={() => toggleApproval(idx)}
                      className={`shrink-0 w-12 h-6 rounded-full relative transition-all ${
                        suggestion.approved ? 'bg-primary' : 'bg-zinc-400 dark:bg-zinc-700'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                        suggestion.approved ? 'left-7' : 'left-1'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 bg-black/20 p-3 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 shrink-0">
                      <PenLine size={14} className="text-content-muted" />
                      <span className="text-[10px] font-bold text-content-muted uppercase tracking-widest">Nome Final:</span>
                    </div>
                    <input 
                      type="text" 
                      value={suggestion.suggestedName}
                      onChange={(e) => updateName(idx, e.target.value)}
                      className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-content-main p-0"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-zinc-800 text-content-muted font-black rounded-2xl hover:bg-zinc-700 transition-all uppercase text-xs tracking-widest"
          >
            CANCELAR
          </button>
          <button 
            disabled={!localSuggestions.some(s => s.approved)}
            onClick={() => onApply(localSuggestions.filter(s => s.approved))}
            className="flex-1 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary/90 transition-all uppercase text-xs tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            APLICAR MESCLAS APROVADAS
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const MergeModal = ({ 
  isOpen, 
  onClose, 
  selectedSubjects, 
  onConfirm 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  selectedSubjects: Subject[], 
  onConfirm: (finalName: string) => void 
}) => {
  const [selectedName, setSelectedName] = useState('');
  const [customName, setCustomName] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  useEffect(() => {
    if (selectedSubjects.length > 0) {
      setSelectedName(selectedSubjects[0].title);
    }
  }, [selectedSubjects, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[24px] p-6 shadow-2xl"
      >
        <h3 className="text-lg font-black text-content-main mb-4 tracking-tight">Mesclar Matérias</h3>
        <p className="text-xs text-content-muted mb-6">Qual será o nome final da matéria?</p>
        
        <div className="space-y-4 mb-8">
          {selectedSubjects.map((s) => (
            <label key={s.id} className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-800/50 border border-white/5 cursor-pointer hover:border-primary/30 transition-all">
              <input 
                type="radio" 
                name="mergeName" 
                checked={!useCustom && selectedName === s.title}
                onChange={() => {
                  setSelectedName(s.title);
                  setUseCustom(false);
                }}
                className="w-4 h-4 text-primary bg-zinc-900 border-white/10 focus:ring-primary"
              />
              <span className="text-sm font-bold text-content-main uppercase">{s.title}</span>
            </label>
          ))}
          
          <div className={`p-4 rounded-2xl bg-zinc-800/50 border transition-all ${useCustom ? 'border-primary/50' : 'border-white/5'}`}>
            <label className="flex items-center gap-3 cursor-pointer mb-3">
              <input 
                type="radio" 
                name="mergeName" 
                checked={useCustom}
                onChange={() => setUseCustom(true)}
                className="w-4 h-4 text-primary bg-zinc-900 border-white/10 focus:ring-primary"
              />
              <span className="text-sm font-bold text-content-main uppercase">Nome Personalizado</span>
            </label>
            <input 
              type="text" 
              value={customName}
              onChange={(e) => {
                setCustomName(e.target.value);
                setUseCustom(true);
              }}
              placeholder="Digite o novo nome..."
              className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-2 text-sm text-content-main focus:outline-none focus:border-primary/30"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-zinc-800 text-content-muted font-black rounded-xl hover:bg-zinc-700 transition-all uppercase text-[10px] tracking-widest"
          >
            CANCELAR
          </button>
          <button 
            onClick={() => onConfirm(useCustom ? customName : selectedName)}
            className="flex-1 py-3 bg-primary text-white font-black rounded-xl hover:bg-primary/90 transition-all uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20"
          >
            CONFIRMAR
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ImportEditalModal = ({ isOpen, onClose, onImport, subjects, initialTab = 'ready' }: { isOpen: boolean, onClose: () => void, onImport: (data: Subject[]) => void, subjects: Subject[], initialTab?: 'ready' | 'ia' | 'manual' }) => {
  const [activeTab, setActiveTab] = useState<'ready' | 'ia' | 'manual'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [sourceName, setSourceName] = useState('');
  
  // Manual States
  const [manualTitle, setManualTitle] = useState('');
  const [manualTopics, setManualTopics] = useState<string[]>(['']);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);
  
  // IA States
  const [iaStage, setIaStage] = useState<'input' | 'processing' | 'review'>('input');
  const [inputText, setInputText] = useState('');
  const [processingMsg, setProcessingMsg] = useState('Lendo o edital...');
  const [aiResult, setAiResult] = useState<any[]>([]);

  const readyEditais = [
    { id: 1, organ: "Polícia Civil ES", position: "Investigador", year: "2026", status: "PÓS-EDITAL", subjectsCount: 12, category: "Carreiras Policiais" },
    { id: 2, organ: "INSS", position: "Técnico do Seguro Social", year: "2025", status: "PREVISTO", subjectsCount: 8, category: "Tribunais" },
    { id: 3, organ: "Banco do Brasil", position: "Escriturário", year: "2024", status: "CONCLUÍDO", subjectsCount: 10, category: "Bancárias" },
    { id: 4, organ: "Polícia Militar ES", position: "Soldado", year: "2026", status: "PÓS-EDITAL", subjectsCount: 10, category: "Carreiras Policiais" },
  ];

  const filteredEditais = readyEditais.filter(e => {
    const matchesSearch = e.organ.toLowerCase().includes(searchQuery.toLowerCase()) || e.position.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || e.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleIaImport = async () => {
    if (!inputText.trim()) return;
    setIaStage('processing');
    const messages = ["Lendo o edital...", "Separando matérias...", "Criando tópicos...", "Finalizando estrutura..."];
    let msgIndex = 0;
    const msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setProcessingMsg(messages[msgIndex]);
    }, 1500);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analise o seguinte conteúdo programático de edital e extraia as matérias e seus respectivos tópicos. 
        Retorne APENAS um JSON no formato: {"subjects": [{"title": "Nome da Matéria", "topics": ["Tópico 1", "Tópico 2"]}]}.
        Conteúdo: ${inputText}`,
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text || '{"subjects": []}');
      setAiResult(result.subjects.map((s: any, idx: number) => ({
        ...s,
        id: Date.now() + idx,
        selected: true,
        expanded: true,
        topics: s.topics.map((t: string, tIdx: number) => ({ id: tIdx, name: t, selected: true }))
      })));
      setIaStage('review');
    } catch (error) {
      console.error("AI Error:", error);
      alert("Erro ao processar com IA. Tente novamente.");
      setIaStage('input');
    } finally {
      clearInterval(msgInterval);
    }
  };

  const handleSaveAiResult = () => {
    const nextId = subjects.length > 0 ? Math.max(...subjects.map(s => s.id)) + 1 : 1;
    const finalData: Subject[] = aiResult
      .filter(s => s.selected)
      .map((s, sIdx) => ({
        id: nextId + sIdx,
        title: s.title,
        progress: 0,
        isDuplicate: false,
        source: sourceName || undefined,
        topics: s.topics.filter((t: any) => t.selected).map((t: any, idx: number) => ({
          id: Date.now() + idx,
          title: t.name,
          status: 'not_studied',
          source: sourceName || undefined
        }))
      }));
    onImport(finalData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-2xl bg-card-slate border border-black/10 dark:border-white/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-black text-content-main tracking-tight">Importar Edital</h2>
            <p className="text-xs text-content-muted font-medium mt-1">Escolha um edital pronto ou use nossa IA</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-content-muted">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto no-scrollbar flex-1">
          <div className="flex gap-2 bg-deep-slate p-1 rounded-[20px] mb-6 w-fit mx-auto border border-black/5 dark:border-white/5">
            <button 
              onClick={() => setActiveTab('ready')}
              className={`px-4 py-2.5 rounded-[14px] text-[9px] font-black transition-all uppercase tracking-widest ${activeTab === 'ready' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-content-muted hover:text-primary'}`}
            >
              Editais Prontos
            </button>
            <button 
              onClick={() => setActiveTab('ia')}
              className={`px-4 py-2.5 rounded-[14px] text-[9px] font-black transition-all uppercase tracking-widest ${activeTab === 'ia' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-content-muted hover:text-primary'}`}
            >
              Importar com IA
            </button>
            <button 
              onClick={() => setActiveTab('manual')}
              className={`px-4 py-2.5 rounded-[14px] text-[9px] font-black transition-all uppercase tracking-widest ${activeTab === 'manual' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-content-muted hover:text-primary'}`}
            >
              Adicionar Manual
            </button>
          </div>

          {activeTab === 'ready' ? (
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="relative">
                  <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-content-muted" size={20} />
                  <input 
                    type="text" 
                    placeholder="Buscar concurso (ex: PCES, PMES, INSS...)" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-16 bg-deep-slate border border-black/5 dark:border-white/5 rounded-[24px] pl-16 pr-6 text-sm font-medium focus:outline-none focus:border-primary/40 transition-all text-content-main placeholder:text-content-muted/50"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  {['Todos', 'Carreiras Policiais', 'Tribunais', 'Bancárias'].map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-6 py-2.5 rounded-full text-[10px] font-black transition-all uppercase tracking-widest ${selectedCategory === cat ? 'bg-primary text-white' : 'bg-deep-slate text-content-muted hover:text-primary'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {filteredEditais.length > 0 ? (
                  filteredEditais.map(edital => (
                    <div key={edital.id} className="glow-card p-6 rounded-[32px] flex items-center justify-between group hover:border-primary/30 transition-all bg-zinc-800/30">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/10">
                          <FileText size={28} />
                        </div>
                        <div>
                          <h4 className="font-black text-content-main text-base tracking-tight">{edital.organ} - {edital.position}</h4>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-[11px] font-black text-secondary uppercase tracking-widest">{edital.status} {edital.year}</span>
                            <span className="text-[11px] font-bold text-content-muted uppercase tracking-widest">{edital.subjectsCount} matérias</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          onImport([{ id: edital.id, title: edital.organ, progress: 0, isDuplicate: false, topics: [] }]);
                          onClose();
                        }}
                        className="px-8 py-3 bg-primary text-white text-[11px] font-black rounded-[18px] hover:bg-primary/90 transition-all uppercase tracking-widest shadow-lg shadow-primary/20"
                      >
                        IMPORTAR EDITAL
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center">
                    <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                      <SearchIcon className="text-content-muted" size={32} />
                    </div>
                    <p className="text-lg font-black text-content-main mb-2">Não encontramos esse edital pré-cadastrado.</p>
                    <p className="text-sm text-content-muted font-medium">Use a aba 'Importar com IA' para cadastrar o seu agora mesmo.</p>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'ia' ? (
            <div className="space-y-8">
              {iaStage === 'input' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="glow-card p-8 rounded-[40px] space-y-4 bg-zinc-800/30">
                      <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em] ml-1">Concurso / Origem</label>
                      <input 
                        type="text" 
                        value={sourceName}
                        onChange={(e) => setSourceName(e.target.value)}
                        placeholder="Ex: PC-ES, Faculdade, TRT..."
                        className="w-full bg-zinc-900/50 border border-white/5 focus:border-primary/40 rounded-[24px] px-8 py-4 text-sm font-medium text-content-main outline-none transition-all"
                      />
                    </div>
                    <div className="glow-card p-8 rounded-[40px] space-y-4 bg-zinc-800/30">
                      <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em] ml-1">Conteúdo Programático</label>
                      <textarea 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Cole aqui o texto do conteúdo programático do edital (Ctrl+V)..."
                        className="w-full h-80 bg-zinc-900/50 border border-white/5 focus:border-primary/40 rounded-[24px] p-8 text-sm font-medium text-content-main outline-none transition-all resize-none no-scrollbar"
                      />
                    </div>
                  </div>
              <button 
                onClick={handleIaImport}
                disabled={!inputText.trim()}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-black py-4 rounded-[20px] shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-xs tracking-widest uppercase"
              >
                <Sparkles size={18} />
                ESTRUTURAR COM IA
              </button>
                </motion.div>
              )}

              {iaStage === 'processing' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-32 flex flex-col items-center justify-center text-center">
                  <div className="relative mb-10">
                    <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full animate-pulse"></div>
                    <Loader2 className="text-primary animate-spin relative" size={80} />
                  </div>
                  <h3 className="text-2xl font-black text-content-main mb-3 tracking-tight">{processingMsg}</h3>
                  <p className="text-xs text-content-muted font-bold uppercase tracking-[0.3em]">Aguarde alguns segundos...</p>
                </motion.div>
              )}

              {iaStage === 'review' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-content-main tracking-tight">Revisão da Estrutura</h3>
                    <button onClick={() => setIaStage('input')} className="flex items-center gap-2 px-6 py-2.5 text-[10px] font-black text-content-muted hover:text-primary transition-colors uppercase tracking-widest bg-zinc-800 rounded-full">
                      <Undo2 size={14} /> Voltar
                    </button>
                  </div>

                  <div className="space-y-4">
                    {aiResult.map((subject, sIdx) => (
                      <div key={subject.id} className="glow-card rounded-[32px] overflow-hidden border border-white/5 bg-zinc-800/20">
                        <div className="p-6 flex items-center justify-between bg-zinc-800/40">
                          <div className="flex items-center gap-4">
                            <input 
                              type="checkbox" 
                              checked={subject.selected}
                              onChange={() => {
                                const newResult = [...aiResult];
                                newResult[sIdx].selected = !newResult[sIdx].selected;
                                setAiResult(newResult);
                              }}
                              className="w-5 h-5 rounded-lg border-white/10 text-primary focus:ring-primary bg-zinc-900"
                            />
                            <div className="flex items-center gap-2">
                              <input 
                                type="text" 
                                value={subject.title}
                                onChange={(e) => {
                                  const newResult = [...aiResult];
                                  newResult[sIdx].title = e.target.value;
                                  setAiResult(newResult);
                                }}
                                className="bg-transparent font-black text-base text-content-main focus:outline-none border-b border-transparent focus:border-primary/40 tracking-tight"
                              />
                              <Edit3 size={14} className="text-content-muted/50" />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                const newResult = [...aiResult];
                                newResult[sIdx].expanded = !newResult[sIdx].expanded;
                                setAiResult(newResult);
                              }}
                              className="p-2 text-content-muted hover:text-primary transition-colors"
                            >
                              {subject.expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                            <button 
                              onClick={() => setAiResult(aiResult.filter((_, i) => i !== sIdx))}
                              className="p-2 text-content-muted hover:text-secondary transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                        {subject.selected && subject.expanded && (
                          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-900/20">
                            {subject.topics.map((topic: any, tIdx: number) => (
                              <div key={tIdx} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 group transition-colors">
                                <input 
                                  type="checkbox" 
                                  checked={topic.selected}
                                  onChange={() => {
                                    const newResult = [...aiResult];
                                    newResult[sIdx].topics[tIdx].selected = !newResult[sIdx].topics[tIdx].selected;
                                    setAiResult(newResult);
                                  }}
                                  className="w-4 h-4 rounded border-white/10 text-primary focus:ring-primary bg-zinc-900"
                                />
                                <div className="flex items-center gap-2 flex-1">
                                  <input 
                                    type="text" 
                                    value={topic.name}
                                    onChange={(e) => {
                                      const newResult = [...aiResult];
                                      newResult[sIdx].topics[tIdx].name = e.target.value;
                                      setAiResult(newResult);
                                    }}
                                    className="flex-1 bg-transparent text-sm text-content-muted font-medium focus:text-content-main focus:outline-none border-b border-transparent focus:border-primary/40"
                                  />
                                  <Edit3 size={12} className="text-content-muted/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={handleSaveAiResult}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-black py-4 rounded-[20px] shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-xs tracking-widest uppercase"
                  >
                    <Save size={18} />
                    SALVAR E IMPORTAR
                  </button>
                </motion.div>
              )}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glow-card p-8 rounded-[40px] space-y-4 bg-zinc-800/30">
                  <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em] ml-1">Nome da Matéria</label>
                  <input 
                    type="text" 
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="Ex: Matemática, Direito Penal..."
                    className="w-full bg-zinc-900/50 border border-white/5 focus:border-primary/40 rounded-[24px] px-8 py-4 text-sm font-medium text-content-main outline-none transition-all"
                  />
                </div>
                <div className="glow-card p-8 rounded-[40px] space-y-4 bg-zinc-800/30">
                  <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em] ml-1">Concurso / Origem</label>
                  <input 
                    type="text" 
                    value={sourceName}
                    onChange={(e) => setSourceName(e.target.value)}
                    placeholder="Ex: PC-ES, Faculdade, TRT..."
                    className="w-full bg-zinc-900/50 border border-white/5 focus:border-primary/40 rounded-[24px] px-8 py-4 text-sm font-medium text-content-main outline-none transition-all"
                  />
                </div>
              </div>

              <div className="glow-card p-8 rounded-[40px] space-y-6 bg-zinc-800/30">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em] ml-1">Tópicos</label>
                  <button 
                    onClick={() => setManualTopics([...manualTopics, ''])}
                    className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest hover:opacity-80 transition-all"
                  >
                    <Plus size={14} />
                    ADICIONAR TÓPICO
                  </button>
                </div>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
                  {manualTopics.map((topic, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex-1 relative">
                        <input 
                          type="text" 
                          value={topic}
                          onChange={(e) => {
                            const newTopics = [...manualTopics];
                            newTopics[idx] = e.target.value;
                            setManualTopics(newTopics);
                          }}
                          placeholder={`Tópico ${idx + 1}`}
                          className="w-full bg-zinc-900/50 border border-white/5 focus:border-primary/40 rounded-[18px] px-6 py-3 text-xs font-medium text-content-main outline-none transition-all"
                        />
                      </div>
                      <button 
                        onClick={() => setManualTopics(manualTopics.filter((_, i) => i !== idx))}
                        className="w-12 h-12 flex items-center justify-center rounded-[18px] border border-rose-500/30 bg-rose-500/5 text-rose-500 hover:bg-rose-500/20 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => {
                  if (!manualTitle.trim()) return;
                  const nextId = subjects.length > 0 ? Math.max(...subjects.map(s => s.id)) + 1 : 1;
                  const newSubject: Subject = {
                    id: nextId,
                    title: manualTitle,
                    progress: 0,
                    isDuplicate: false,
                    source: sourceName || undefined,
                    topics: manualTopics.filter(t => t.trim()).map((t, idx) => ({
                      id: Date.now() + idx,
                      title: t,
                      status: 'not_studied',
                      source: sourceName || undefined
                    }))
                  };
                  onImport([newSubject]);
                  onClose();
                  setManualTitle('');
                  setManualTopics(['']);
                  setSourceName('');
                }}
                disabled={!manualTitle.trim()}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-black py-4 rounded-[20px] shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-xs tracking-widest uppercase"
              >
                <Save size={18} />
                SALVAR MATÉRIA
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const EditalManager = () => {
  const [editais, setEditais] = useState([
    { id: 1, name: "PMES - Soldado", date: "04/03/2026", subjects: 10 },
    { id: 2, name: "PCES - Investigador", date: "01/03/2026", subjects: 12 },
  ]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-content-main tracking-tight">Meus Editais Importados</h2>
          <p className="text-sm text-content-muted font-medium mt-1">Gerencie os editais vinculados ao seu painel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {editais.map(edital => (
          <div key={edital.id} className="glow-card p-6 rounded-[32px] flex items-center justify-between bg-zinc-800/30 border-white/5">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/10">
                <Calendar size={28} />
              </div>
              <div>
                <h4 className="font-black text-content-main text-lg tracking-tight">{edital.name}</h4>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-[11px] font-black text-content-muted uppercase tracking-widest">Importado em {edital.date}</span>
                  <span className="text-[11px] font-bold text-primary uppercase tracking-widest">{edital.subjects} matérias</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setEditais(editais.filter(e => e.id !== edital.id))}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20"
              title="Excluir edital e tópicos vinculados"
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const INITIAL_SUBJECTS: Subject[] = [
  { 
    id: 1, 
    title: "TEST SUBJECT", 
    progress: 50, 
    isDuplicate: false,
    source: 'PC-ES',
    topics: [
      { id: 101, title: "Tópico 1.1", status: 'in_days', isStarted: true, source: 'PC-ES' },
      { id: 102, title: "Tópico 1.2", status: 'not_studied', source: 'PC-ES' }
    ]
  },
  { 
    id: 2, 
    title: "TEST SUBJECTTEST SUBJECT", 
    progress: 0, 
    isDuplicate: true,
    source: 'Faculdade',
    topics: [
      { id: 201, title: "Tópico 2.1", status: 'not_studied', source: 'Faculdade' }
    ]
  },
  { 
    id: 3, 
    title: "LÍNGUA PORTUGUESA", 
    progress: 50, 
    isDuplicate: false,
    source: 'TRT',
    topics: [
      { id: 301, title: "Gramática", status: 'completed', source: 'TRT' },
      { id: 302, title: "Interpretação", status: 'delayed', source: 'TRT' }
    ]
  },
  { 
    id: 4, 
    title: "TEST SUBJECT", 
    progress: 0, 
    isDuplicate: false,
    source: 'Policia Legislativa',
    topics: [
      { id: 401, title: "Tópico 4.1", status: 'not_studied', source: 'Policia Legislativa' }
    ]
  },
];

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'subjects' | 'cycle' | 'topics' | 'import' | 'edital-manager'>('subjects');
  const [expandedSubject, setExpandedSubject] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [allExpanded, setAllExpanded] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isMergeMode, setIsMergeMode] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isSmartMergeModalOpen, setIsSmartMergeModalOpen] = useState(false);
  const [mergeSuggestions, setMergeSuggestions] = useState<MergeSuggestion[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importInitialTab, setImportInitialTab] = useState<'ready' | 'ia' | 'manual'>('ready');
  const [subjects, setSubjects] = useState(INITIAL_SUBJECTS);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const toggleSelection = (id: number) => {
    const subject = subjects.find(s => s.id === id);
    if (!subject) return;

    const isSelected = selectedSubjects.includes(id);
    
    if (!isSelected && isMergeMode) {
      const selectedSources = subjects
        .filter(s => selectedSubjects.includes(s.id))
        .map(s => s.source)
        .filter(Boolean);
      
      if (subject.source && selectedSources.includes(subject.source)) {
        setToast("Você não pode mesclar matérias do mesmo edital.");
        return;
      }
    }

    setSelectedSubjects(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleMerge = () => {
    if (selectedSubjects.length < 2) return;
    setIsMergeModalOpen(true);
  };

  const handleSuggestMerges = async () => {
    if (subjects.length < 2) {
      setToast("Você precisa de pelo menos 2 matérias para sugerir mesclas.");
      return;
    }

    setIsSuggesting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analise esta lista de matérias de estudo e agrupe as que tratam exatamente do mesmo assunto, mesmo que o nome tenha pequenas variações. 
        Ignore matérias que são claramente diferentes.
        Retorne um JSON no formato: Array<{ subjectIds: number[], suggestedName: string }>
        
        Matérias:
        ${subjects.map(s => `ID: ${s.id}, Título: ${s.title}${s.source ? `, Edital: ${s.source}` : ''}`).join('\n')}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                subjectIds: {
                  type: Type.ARRAY,
                  items: { type: Type.NUMBER }
                },
                suggestedName: { type: Type.STRING }
              },
              required: ["subjectIds", "suggestedName"]
            }
          }
        }
      });

      const suggestions = JSON.parse(response.text || "[]");
      
      // Filter out suggestions with less than 2 subjects or invalid IDs
      const validSuggestions = suggestions
        .filter((s: any) => s.subjectIds.length >= 2)
        .map((s: any) => ({
          ...s,
          approved: true
        }));

      if (validSuggestions.length === 0) {
        setToast("Não encontramos matérias similares para mesclar.");
      } else {
        setMergeSuggestions(validSuggestions);
        setIsSmartMergeModalOpen(true);
      }
    } catch (error) {
      console.error("Erro ao sugerir mesclas:", error);
      setToast("Erro ao processar sugestões. Tente novamente.");
    } finally {
      setIsSuggesting(false);
    }
  };

  const executeSmartMerges = (approvedSuggestions: MergeSuggestion[]) => {
    setSubjects(prev => {
      let currentSubjects = [...prev];
      
      approvedSuggestions.forEach(suggestion => {
        const subjectsToMerge = currentSubjects.filter(s => suggestion.subjectIds.includes(s.id));
        if (subjectsToMerge.length < 2) return;

        const minId = Math.min(...subjectsToMerge.map(s => s.id));
        const allTopics = subjectsToMerge.flatMap(s => s.topics);
        
        // Remove merged subjects and add the new one
        currentSubjects = currentSubjects.filter(s => !suggestion.subjectIds.includes(s.id));
        
        currentSubjects.push({
          id: minId,
          title: suggestion.suggestedName,
          progress: Math.round(allTopics.filter(t => t.status === 'completed').length / allTopics.length * 100) || 0,
          isDuplicate: false,
          topics: allTopics.map((t, idx) => ({ ...t, id: idx + 1 })),
          source: [...new Set(subjectsToMerge.map(s => s.source).filter(Boolean))].join(', ')
        });
      });

      return currentSubjects.sort((a, b) => a.id - b.id);
    });

    setIsSmartMergeModalOpen(false);
    setToast(`${approvedSuggestions.length} mesclas aplicadas com sucesso!`);
  };

  const executeMerge = (finalName: string) => {
    const subjectsToMerge = subjects.filter(s => selectedSubjects.includes(s.id));
    
    // Find the minimum ID to maintain sequence as requested
    const minId = Math.min(...subjectsToMerge.map(s => s.id));
    
    // Combine all topics
    const allTopics = subjectsToMerge.flatMap(s => s.topics);
    
    const newSubject: Subject = { 
      id: minId, 
      title: finalName, 
      progress: 0, 
      isDuplicate: false,
      source: [...new Set(subjectsToMerge.map(s => s.source).filter(Boolean))].join(', '),
      topics: allTopics
    };
    
    setSubjects(prev => {
      const filtered = prev.filter(s => !selectedSubjects.includes(s.id));
      return [...filtered, newSubject].sort((a, b) => a.id - b.id);
    });
    
    setSelectedSubjects([]);
    setIsMergeMode(false);
    setIsMergeModalOpen(false);
  };

  const selectAll = () => {
    setSelectedSubjects([1, 2, 3, 4, 5]);
  };

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
      <AnimatePresence>
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>

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
            <SidebarItem 
              icon={RotateCcw} 
              label="Ciclo de Estudos" 
              active={activeView === 'cycle'}
              onClick={() => setActiveView('cycle')}
              collapsed={collapsed} 
            />
            <SidebarItem 
              icon={Settings2} 
              label="Meus Editais" 
              active={activeView === 'edital-manager'}
              onClick={() => setActiveView('edital-manager')}
              collapsed={collapsed} 
            />
            <SidebarItem icon={Clock} label="Revisões" collapsed={collapsed} />
            <SidebarItem 
              icon={Book} 
              label="Matérias" 
              active={activeView === 'subjects'} 
              onClick={() => setActiveView('subjects')}
              collapsed={collapsed} 
            />
            <SidebarItem 
              icon={List} 
              label="Tópicos" 
              active={activeView === 'topics'}
              onClick={() => setActiveView('topics')}
              collapsed={collapsed} 
            />
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
                ) : activeView === 'topics' ? (
                  'Tópicos'
                ) : activeView === 'subjects' ? (
                  'Matérias'
                ) : activeView === 'import' ? (
                  'Importar Edital'
                ) : activeView === 'edital-manager' ? (
                  'Meus Editais'
                ) : activeView === 'cycle' ? (
                  'Ciclo de Estudos'
                ) : (
                  'Configurações'
                )}
              </h1>
              <p className="text-content-muted text-sm mt-1 font-medium tracking-wide">
                {activeView === 'dashboard' 
                  ? 'Welcome back, operative Alex Johnson.' 
                  : activeView === 'topics'
                  ? 'Visualize e gerencie todos os seus tópicos de estudo'
                  : activeView === 'subjects'
                  ? 'Gerencie suas disciplinas e organize seu conteúdo'
                  : activeView === 'import'
                  ? 'Escolha um edital pronto ou use nossa IA para estruturar seu estudo'
                  : activeView === 'edital-manager'
                  ? 'Gerencie os editais que você já importou'
                  : activeView === 'cycle'
                  ? 'Gerencie seu progresso e metas diárias'
                  : 'Ajuste suas preferências e configurações do sistema'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {activeView === 'subjects' && (
                <button 
                  onClick={() => setSubjects(subjects.length > 0 ? [] : INITIAL_SUBJECTS)}
                  className="px-3 py-1.5 bg-amber-500/10 text-amber-500 rounded-lg text-[10px] font-bold border border-amber-500/20 hover:bg-amber-500/20 transition-all flex items-center gap-2"
                >
                  <Sparkles size={12} />
                  {subjects.length > 0 ? 'SIMULAR VAZIO' : 'RESTAURAR DADOS'}
                </button>
              )}
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
          ) : activeView === 'topics' ? (
            <TopicsView />
          ) : activeView === 'cycle' ? (
            <CycleView isMaximized={isMaximized} setIsMaximized={setIsMaximized} />
          ) : activeView === 'edital-manager' ? (
            <EditalManager />
          ) : (
            <div className="space-y-4">
              {subjects.length > 0 ? (
                <>
                  {/* Search and Filters */}
                  <div className="glow-card p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" size={14} />
                      <input 
                        type="text" 
                        placeholder="Buscar..." 
                        className="w-full h-10 bg-deep-slate border border-black/5 dark:border-white/5 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-primary/30 transition-all text-content-main placeholder:text-content-muted/50 shadow-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button 
                        onClick={handleSuggestMerges}
                        disabled={isSuggesting}
                        className="h-10 px-4 bg-deep-slate text-content-muted hover:text-primary hover:border-primary/30 transition-all border border-black/5 dark:border-white/5 rounded-xl flex items-center gap-2 shadow-sm disabled:opacity-50"
                      >
                        {isSuggesting ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Sparkles size={14} className="text-primary" />
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-widest">Sugerir Mesclas</span>
                      </button>

                      <button 
                        onClick={() => {
                          setIsMergeMode(!isMergeMode);
                          setSelectedSubjects([]);
                        }}
                        className={`h-10 px-4 text-[10px] font-bold rounded-xl transition-all border border-black/5 dark:border-white/5 shadow-sm flex items-center gap-2 ${isMergeMode ? 'bg-primary text-white border-primary/30' : 'bg-deep-slate text-content-muted hover:text-primary hover:border-primary/30'}`}
                      >
                        <Merge size={14} />
                        {isMergeMode ? 'CANCELAR MESCLA' : 'MESCLAR MATÉRIAS'}
                      </button>

                      <button 
                        onClick={() => setIsImportModalOpen(true)}
                        className="h-10 px-4 bg-primary text-white text-[10px] font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                      >
                        <Plus size={14} />
                        NOVA MATÉRIA
                      </button>
                    </div>
                  </div>

                  {/* Subjects List */}
                  <div className="space-y-3 pb-24">
                    {(() => {
                      const selectedSources = subjects
                        .filter(s => selectedSubjects.includes(s.id))
                        .map(s => s.source)
                        .filter(Boolean);

                      return subjects.map((subject) => {
                        const isDisabled = isMergeMode && 
                          !selectedSubjects.includes(subject.id) && 
                          subject.source && 
                          selectedSources.includes(subject.source);

                        return (
                          <SubjectCard 
                            key={subject.id}
                            index={subject.id} 
                            title={subject.title} 
                            progress={subject.progress} 
                            topics={subject.topics}
                            isExpanded={expandedSubject === subject.id}
                            onToggle={() => setExpandedSubject(expandedSubject === subject.id ? null : subject.id)}
                            isDuplicate={subject.isDuplicate}
                            isSelectionMode={isMergeMode || isSelectionMode}
                            isSelected={selectedSubjects.includes(subject.id)}
                            onSelect={() => toggleSelection(subject.id)}
                            source={subject.source}
                            isDisabled={isDisabled}
                            onDisabledClick={() => setToast("Você não pode mesclar matérias do mesmo edital.")}
                          />
                        );
                      });
                    })()}
                  </div>

                  {/* Floating Merge Bar */}
                  <AnimatePresence>
                    {isMergeMode && selectedSubjects.length >= 2 && (
                      <motion.div 
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
                      >
                        <div className="bg-zinc-900 border border-primary/30 rounded-[24px] p-4 shadow-2xl flex items-center justify-between backdrop-blur-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                              <Merge size={20} />
                            </div>
                            <div>
                              <p className="text-xs font-black text-content-main uppercase tracking-widest">Unir {selectedSubjects.length} Matérias</p>
                              <p className="text-[10px] text-content-muted font-bold uppercase tracking-widest">Ação irreversível</p>
                            </div>
                          </div>
                          <button 
                            onClick={handleMerge}
                            className="px-6 py-2.5 bg-primary text-white text-[10px] font-black rounded-xl hover:bg-primary/90 transition-all uppercase tracking-widest shadow-lg shadow-primary/20"
                          >
                            CONFIRMAR
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <EmptySubjectsState 
                  onImportClick={() => {
                    setImportInitialTab('ready');
                    setIsImportModalOpen(true);
                  }} 
                  onManualClick={() => {
                    setImportInitialTab('manual');
                    setIsImportModalOpen(true);
                  }} 
                />
              )}
            </div>
          )}
        </div>

        <ImportEditalModal 
          isOpen={isImportModalOpen} 
          onClose={() => setIsImportModalOpen(false)}
          initialTab={importInitialTab}
          subjects={subjects}
          onImport={(data) => setSubjects([...subjects, ...data])}
        />

        <MergeModal 
          isOpen={isMergeModalOpen}
          onClose={() => setIsMergeModalOpen(false)}
          selectedSubjects={subjects.filter(s => selectedSubjects.includes(s.id))}
          onConfirm={executeMerge}
        />

        <SmartMergeModal 
          isOpen={isSmartMergeModalOpen}
          onClose={() => setIsSmartMergeModalOpen(false)}
          suggestions={mergeSuggestions}
          subjects={subjects}
          onApply={executeSmartMerges}
        />
      </main>
    </div>
  );
}
