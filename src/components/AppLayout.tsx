import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Notebook, Timer, Menu, CornerDownRight } from "lucide-react";
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

const CustomSidebarToggle = () => {
  const { state, toggleSidebar, isMobile } = useSidebar();

  // On mobile, the sidebar (Sheet) now includes its own toggle for perfect animation sync.
  // So we hide this external toggle completely on mobile.
  if (isMobile) return null;

  return (
    <button
      onClick={toggleSidebar}
      className={`
        fixed z-[60]
        flex items-center justify-center 
        w-6 h-12 
        bg-[#1E2A3B]
        text-white 
        rounded-r-lg
        shadow-lg 
        hover:bg-[#2A3F5F]
        transition-all duration-300
        group
      `}
      style={{
        top: '72px',
        left: state === 'expanded' ? '16rem' : '6rem',
        transition: 'left 0.2s ease-in-out'
      }}
      title={state === 'expanded' ? 'Recolher Menu' : 'Expandir Menu'}
    >
      {state === 'expanded' ? (
        <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
      ) : (
        <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
      )}
    </button>
  );
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

      {/* Mobile: Menu em cima, setinha L + nome embaixo */}
      <div className="sm:hidden flex flex-col">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Menu</span>
        <div className="flex items-center gap-1 -mt-0.5">
          <CornerDownRight size={12} className="text-gray-400" />
          <span className="font-semibold text-gray-800 dark:text-gray-100">{pageTitle}</span>
        </div>
      </div>
    </div>
  );
};

export const AppLayout = () => {
  const { timeLeft, getState, getProgress, formatTime, isBlinking } = useSharedPomodoroTimer();
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

  const pomodoroState = getState();
  const formattedTime = formatTime(timeLeft);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
        <AppSidebar />

        <SidebarInset className="flex flex-col flex-1 pb-20 md:pb-6 relative min-w-0">
          <CustomSidebarToggle />

          {/* Top Navbar */}
          <header className="sticky top-0 z-30 h-16 w-full flex items-center justify-between px-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors">
            <div className="flex items-center">
              <MobileMenuToggle />
              <PageBreadcrumb pageTitle={pageTitle} />
            </div>

            <div className="flex items-center gap-3">
              {/* Annotations Button */}
              <button
                onClick={() => setIsGeneralNotesModalOpen(true)}
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
