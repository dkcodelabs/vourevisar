import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronDown, Notebook, Timer, Menu, CornerDownRight } from "lucide-react";
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { MobileBottomBar } from "./layout/MobileBottomBar";
import { ThemeToggle } from "./ThemeToggle";
import { PomodoroPopover } from "./PomodoroPopover";
import { useSharedPomodoroTimer } from "@/hooks/useSharedPomodoroTimer";
import { Button } from "@/components/ui/button";
import GeneralNotesModal from './GeneralNotesModal';
import NotesModal from './reviews/NotesModal';
import SubjectNotesModal from './reviews/SubjectNotesModal';

const routeTitles: Record<string, string> = {
  '/dashboard': 'Painel',
  '/ciclo-estudos': 'Ciclo de Estudos',
  '/revisoes': 'Revisões',
  '/materias': 'Matérias',
  '/topicos': 'Tópicos',
  '/estatisticas': 'Estatísticas',
  '/gerenciamento': 'Gerenciamento',
  '/perfil': 'Perfil',
  '/configuracoes': 'Configurações',
};

const MobileMenuToggle = () => {
  const { toggleSidebar, isMobile } = useSidebar();

  if (!isMobile) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-10 w-10 text-gray-500 mr-2"
      onClick={toggleSidebar}
    >
      <Menu className="h-6 w-6" />
    </Button>
  );
};

// Componente de Breadcrumb para o título da página
const PageBreadcrumb = ({ pageTitle }: { pageTitle: string }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center text-sm">
      {/* Desktop: Menu > Nome da Página */}
      <div className="hidden sm:flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
        <span className="font-medium">Menu</span>
        <ChevronRight size={14} className="text-gray-400" />
        <span className="font-semibold text-gray-800 dark:text-gray-100">{pageTitle}</span>
      </div>

      {/* Mobile: Menu com seta + Nome da Página */}
      <div className="sm:hidden flex flex-col">
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <span className="text-xs font-medium">Menu</span>
          <ChevronDown size={12} className="text-gray-400" />
        </div>
        <div className="flex items-center gap-1">
          <CornerDownRight size={12} className="text-gray-400" />
          <span className="font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[180px]">{pageTitle}</span>
        </div>
      </div>
    </div>
  );
};

// Componente do Header que precisa estar dentro do SidebarProvider para acesso ao contexto
const TopHeader = ({ pageTitle, onOpenNotes }: { pageTitle: string; onOpenNotes: () => void }) => {
  const { timeLeft, getState, formatTime, isBlinking } = useSharedPomodoroTimer();
  const pomodoroState = getState();
  const formattedTime = formatTime(timeLeft);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[72px] w-full flex items-center justify-between px-6 bg-white/95 backdrop-blur-md shadow-md border-b border-gray-200 transition-all">
      <div className="flex items-center gap-4">
        <MobileMenuToggle />
        <div className="hidden md:flex items-center gap-4">
          <img src="/logo.png" alt="vouRevisar" className="h-8 w-auto" />
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
        </div>
        <PageBreadcrumb pageTitle={pageTitle} />
      </div>

      <div className="flex items-center gap-3">
        {/* Annotations Button */}
        <button
          onClick={onOpenNotes}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700 dark:hover:text-white"
          title="Anotações Gerais"
        >
          <Notebook className="w-4 h-4" />
          <span className="hidden lg:inline">Anotações</span>
        </button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Pomodoro Timer */}
        <PomodoroPopover>
          <div className="flex items-center gap-2">
            {timeLeft < 25 * 60 && (
              <span className={`text-sm font-mono font-semibold hidden sm:block transition-all duration-300 ${isBlinking ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`}>
                {formattedTime}
              </span>
            )}
            <button className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:scale-105 transition-transform">
              <Timer size={18} className={pomodoroState === 'running' ? 'text-green-500 animate-pulse' : 'text-gray-500'} />
            </button>
          </div>
        </PomodoroPopover>
      </div>
    </header>
  );
};

export const AppLayout = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Encontrar o título correspondente
  const pageTitle = routeTitles[currentPath] ||
    Object.entries(routeTitles).find(([route]) => currentPath.startsWith(route))?.[1] ||
    'Painel';

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

  return (
    <SidebarProvider defaultOpen={true}>
      {/* Fixed Full-Width Header */}
      <TopHeader pageTitle={pageTitle} onOpenNotes={() => setIsGeneralNotesModalOpen(true)} />

      {/* Main Content Area - pushed down by header height */}
      <div className="flex min-h-screen w-full pt-[72px] bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
        <AppSidebar />

        <SidebarInset className="flex flex-col flex-1 pb-20 md:pb-6 relative min-w-0 overflow-y-auto">
          <main className="flex-1 w-full max-w-[1440px] mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Outlet />
          </main>
        </SidebarInset>

        <MobileBottomBar />

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
      </div>
    </SidebarProvider>
  );
};
