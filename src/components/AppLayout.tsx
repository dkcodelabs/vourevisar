import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronDown, Notebook, Timer, Menu, CornerDownRight, NotebookPen, Bell } from "lucide-react";
import { StudentHubPanel } from './student-hub/StudentHubPanel';
import { useStudentHubBadge } from '@/hooks/useStudentHubBadge';
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
import { features } from '@/lib/features';

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
      className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-full mr-1 -ml-2"
      onClick={toggleSidebar}
    >
      <Menu size={18} />
    </Button>
  );
};

// Componente de Breadcrumb para o título da página
const PageBreadcrumb = ({ pageTitle }: { pageTitle: string }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center text-sm">
      {/* Desktop: Menu > Nome da Página */}
      <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground/80">
        <span className="font-medium text-[13px]">Menu</span>
        <ChevronRight size={14} className="text-muted-foreground/40" />
        <span className="font-bold text-foreground tracking-tight text-[14.5px]">{pageTitle}</span>
      </div>

      {/* Mobile: Menu com seta + Nome da Página */}
      <div className="sm:hidden flex flex-col">
        <div className="flex items-center gap-1 text-muted-foreground/80">
          <span className="text-xs font-medium">Menu</span>
          <ChevronDown size={12} className="text-muted-foreground/40" />
        </div>
        <div className="flex items-center gap-1">
          <CornerDownRight size={12} className="text-muted-foreground/40" />
          <span className="font-bold text-foreground truncate max-w-[180px] tracking-tight">{pageTitle}</span>
        </div>
      </div>
    </div>
  );
};

const TopHeader = ({ pageTitle, onOpenNotes, onOpenHub, hubUnreadCount }: { pageTitle: string; onOpenNotes: () => void; onOpenHub: () => void; hubUnreadCount: number }) => {
  const { timeLeft, getState, formatTime, isBlinking } = useSharedPomodoroTimer();
  const pomodoroState = getState();
  const formattedTime = formatTime(timeLeft);

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] h-[60px] w-full flex items-center justify-between px-6 bg-card shadow-sm border-b border-solid border-border transition-all">
      <div className="flex items-center gap-4">
        <MobileMenuToggle />
        <div className="hidden md:flex items-center gap-4">
          <img src="/logo.png" alt="vouRevisar" className="h-[26px] w-auto" />
          <div className="h-5 w-px bg-border" />
        </div>
        <PageBreadcrumb pageTitle={pageTitle} />
      </div>

      <div className="flex items-center gap-2">
        {/* 1. Focus Timer (Leftmost) */}
        <FocusTimer />

        {/* 2. Notification Bell (Central do Aluno) */}
        {features.STUDENT_HUB && (
          <button
            onClick={onOpenHub}
            className="relative flex items-center justify-center w-9 h-9 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-full transition-all duration-300 focus:outline-none group"
            title="Central do Aluno"
            aria-label={hubUnreadCount > 0 ? `Notificações, ${hubUnreadCount} não lida${hubUnreadCount > 1 ? 's' : ''}` : 'Notificações'}
          >
            <Bell size={18} strokeWidth={2} className="transition-transform group-hover:scale-110" aria-hidden="true" />
            {hubUnreadCount > 0 && (
              <span className="absolute top-0 right-0 flex items-center justify-center min-w-[17px] h-4.5 px-1 text-[10px] font-black text-white bg-blue-500 rounded-full border-2 border-card shadow-sm" aria-hidden="true">
                {hubUnreadCount}
              </span>
            )}
          </button>
        )}

        {/* 3. Annotations Button (NotebookPen) */}
        <button
          onClick={onOpenNotes}
          className="flex items-center justify-center w-9 h-9 text-muted-foreground hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-full transition-all duration-300 focus:outline-none group"
          title="Anotações Gerais"
        >
          <NotebookPen size={18} strokeWidth={2} className="transition-transform group-hover:scale-110" />
        </button>

        {/* 3. Pomodoro Timer (Oculto)
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
        */}

        {/* 4. Theme Toggle (Rightmost) */}
        <div className="ml-1">
          <ThemeToggle />
        </div>
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

  // USAR NOVO HOOK UNIFICADO
  const { totalUnreadCount } = useStudentHubBadge();

  return (
    <SidebarProvider defaultOpen={true}>
      {/* Fixed Full-Width Header */}
      <TopHeader
        pageTitle={pageTitle}
        onOpenNotes={() => setIsGeneralNotesModalOpen(true)}
        onOpenHub={() => setIsHubOpen(true)}
        hubUnreadCount={totalUnreadCount}
      />

      {/* Main Content Area - no longer pushed down by global padding to allow glassmorphism scroll effect */}
      <div className="flex min-h-screen w-full bg-background transition-colors duration-200">
        <AppSidebar />

        <SidebarInset className={`bg-transparent flex flex-col flex-1 pb-20 md:pb-6 relative min-w-0 ${isHubOpen ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 pb-4 md:pb-6 lg:pb-8 pt-[72px] md:pt-[88px] animate-in fade-in slide-in-from-bottom-4 duration-500">
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
      {features.STUDENT_HUB && (
        <StudentHubPanel isOpen={isHubOpen} onClose={() => setIsHubOpen(false)} />
      )}
    </SidebarProvider>
  );
};
