import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronDown, Notebook, Timer, Menu, CornerDownRight, NotebookPen, Bell } from "lucide-react";
import { StudentHubPanel } from './student-hub/StudentHubPanel';
import { FocusTimer } from "./FocusTimer";
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { MobileBottomBar } from "./layout/MobileBottomBar";
import { ThemeToggle } from "./ThemeToggle";
import { PomodoroPopover } from "./PomodoroPopover";
import { useSharedPomodoroTimer } from "@/hooks/useSharedPomodoroTimer";
import { useUserLogger } from "@/hooks/useUserLogger";
import { Button } from "@/components/ui/button";
import GeneralNotesModal from './GeneralNotesModal';
import NotesModal from './reviews/NotesModal';
import SubjectNotesModal from './reviews/SubjectNotesModal';
import { supabase } from '@/integrations/supabase/client';
import { toastManager } from '@/utils/toastManager';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

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
      <div className="hidden sm:flex items-center gap-1.5 text-gray-500">
        <span className="font-medium">Menu</span>
        <ChevronRight size={14} className="text-gray-400" />
        <span className="font-semibold text-gray-800">{pageTitle}</span>
      </div>

      {/* Mobile: Menu com seta + Nome da Página */}
      <div className="sm:hidden flex flex-col">
        <div className="flex items-center gap-1 text-gray-500">
          <span className="text-xs font-medium">Menu</span>
          <ChevronDown size={12} className="text-gray-400" />
        </div>
        <div className="flex items-center gap-1">
          <CornerDownRight size={12} className="text-gray-400" />
          <span className="font-semibold text-gray-800 truncate max-w-[180px]">{pageTitle}</span>
        </div>
      </div>
    </div>
  );
};

// Componente do Header que precisa estar dentro do SidebarProvider para acesso ao contexto
const TopHeader = ({ pageTitle, onOpenNotes, onOpenHub, hubUnreadCount }: { pageTitle: string; onOpenNotes: () => void; onOpenHub: () => void; hubUnreadCount: number }) => {
  const { timeLeft, getState, formatTime, isBlinking } = useSharedPomodoroTimer();
  const pomodoroState = getState();
  const formattedTime = formatTime(timeLeft);

  return (
    // ... imports fixed below via separate edit for top of file or let's try to include imports if I can.
    // Actually, I need to add imports to the top of the file first.
    // I'll do two edits or try to merge.
    // Let's do the inner content first, assuming imports will be added.

    <header className="fixed top-0 left-0 right-0 z-50 h-[72px] w-full flex items-center justify-between px-6 bg-white shadow-md border-b border-gray-200 transition-all">
      <div className="flex items-center gap-4">
        <MobileMenuToggle />
        <div className="hidden md:flex items-center gap-4">
          <img src="/logo.png" alt="vouRevisar" className="h-8 w-auto" />
          <div className="h-6 w-px bg-gray-200" />
        </div>
        <PageBreadcrumb pageTitle={pageTitle} />
      </div>

      <div className="flex items-center gap-3">
        {/* 1. Focus Timer (Leftmost) */}
        <FocusTimer />

        {/* 2. Notification Bell (Central do Aluno) */}
        <button
          onClick={onOpenHub}
          className="relative flex items-center justify-center w-9 h-9 text-gray-700 bg-transparent hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-gray-800 focus:outline-none"
          title="Central do Aluno"
        >
          <Bell className="w-5 h-5" strokeWidth={1.5} />
          {hubUnreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-blue-500 rounded-full">
              {hubUnreadCount}
            </span>
          )}
        </button>

        {/* 3. Annotations Button (NotebookPen) */}
        <button
          onClick={onOpenNotes}
          className="flex items-center justify-center w-9 h-9 text-gray-700 bg-transparent hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-gray-800 focus:outline-none"
          title="Anotações Gerais"
        >
          <NotebookPen className="w-5 h-5" strokeWidth={1.5} />
        </button>

        {/* 3. Pomodoro Timer */}
        <PomodoroPopover>
          <div className="flex items-center gap-2">
            {timeLeft < 25 * 60 && (
              <span className={`text-sm font-mono font-semibold hidden sm:block transition-all duration-300 ${isBlinking ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`}>
                {formattedTime}
              </span>
            )}
            <button className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm hover:scale-105 transition-transform">
              <Timer size={18} className={pomodoroState === 'running' ? 'text-green-500 animate-pulse' : 'text-gray-500'} />
            </button>
          </div>
        </PomodoroPopover>

        {/* 4. Theme Toggle (Rightmost) */}
        <ThemeToggle />
      </div>
    </header>
  );
};

export const AppLayout = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { logSessionStart } = useUserLogger();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  React.useEffect(() => {
    logSessionStart();

    // Security Check: Active Status
    const checkActiveStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_active')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking active status:', error);
        return;
      }

      if (profile && profile.is_active === false) {
        console.warn('USER DEACTIVATED - Force Logout');
        await signOut();
        // signOut already navigates to /login. We can add query param if needed, but context might overwrite.
        // Let's trust signOut handling, or force navigation after.
        navigate('/login?reason=deactivated');
        toastManager.error("Sua conta foi desativada. Entre em contato com o suporte.", { id: 'account-deactivated' });
      }
    };

    checkActiveStatus();
    // Optional: Set up an interval or subscription for real-time kick
    const interval = setInterval(checkActiveStatus, 60000); // Check every minute
    return () => clearInterval(interval);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Student Hub state
  const [isHubOpen, setIsHubOpen] = React.useState(false);

  return (
    <SidebarProvider defaultOpen={true}>
      {/* Fixed Full-Width Header */}
      <TopHeader
        pageTitle={pageTitle}
        onOpenNotes={() => setIsGeneralNotesModalOpen(true)}
        onOpenHub={() => setIsHubOpen(true)}
        hubUnreadCount={1}
      />

      {/* Main Content Area - pushed down by header height */}
      <div className="flex min-h-screen w-full pt-[72px] bg-background transition-colors duration-200">
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

      {/* Central do Aluno */}
      <StudentHubPanel isOpen={isHubOpen} onClose={() => setIsHubOpen(false)} />
    </SidebarProvider>
  );
};
