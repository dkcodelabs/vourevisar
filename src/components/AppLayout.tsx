import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import {
  ChevronRight,
  ChevronDown,
  NotebookPen,
  Bell,
  Menu,
  Sparkles, // Added Sparkles
  CornerDownRight,
} from "lucide-react";
import { StudentHubPanel } from "./student-hub/StudentHubPanel";
import { useStudentHubBadge } from "@/hooks/useStudentHubBadge";
import { FocusTimer } from "./FocusTimer";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "./ThemeToggle";
import { useUserLogger } from "@/hooks/useUserLogger";
import { Button } from "@/components/ui/button";
import GeneralNotesModal from "./GeneralNotesModal";
import NotesModal from "./reviews/NotesModal";
import SubjectNotesModal from "./reviews/SubjectNotesModal";
import { supabase } from "@/integrations/supabase/client";
import { toastManager } from "@/utils/toastManager";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { features } from "@/lib/features";

const routeTitles: Record<string, string> = {
  "/dashboard": "Painel",
  "/ciclo-estudos": "Ciclo de Estudos",
  "/revisoes": "Revisões",
  "/materias": "Matérias",
  "/topicos": "Tópicos",
  "/estatisticas": "Estatísticas",
  "/gerenciamento": "Gerenciamento",
  "/perfil": "Perfil",
  "/configuracoes": "Configurações",
};

// Removed MobileMenuToggle from here as it relies on useSidebar which we are removing from the wrap
// We will simply pass a state or context if we need a mobile drawer, but let's build the desktop first

// Componente de Breadcrumb para o título da página
const PageBreadcrumb = ({ pageTitle }: { pageTitle: string }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center text-sm">
      {/* Desktop: Menu > Nome da Página */}
      <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground/80">
        <span className="font-medium text-[13px]">Menu</span>
        <ChevronRight size={14} className="text-muted-foreground/40" />
        <span className="font-bold text-foreground tracking-tight text-[14.5px]">
          {pageTitle}
        </span>
      </div>

      {/* Mobile: Menu com seta + Nome da Página */}
      <div className="sm:hidden flex flex-col">
        <div className="flex items-center gap-1 text-muted-foreground/80">
          <span className="text-xs font-medium">Menu</span>
          <ChevronDown size={12} className="text-muted-foreground/40" />
        </div>
        <div className="flex items-center gap-1">
          <CornerDownRight size={12} className="text-muted-foreground/40" />
          <span className="font-bold text-foreground truncate max-w-[180px] tracking-tight">
            {pageTitle}
          </span>
        </div>
      </div>
    </div>
  );
};

// O TopHeader original foi removido para eliminar a barra superior (logo, menu, caminho)

export const AppLayout = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { logSessionStart } = useUserLogger();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const hour = new Date().getHours();

  React.useEffect(() => {
    logSessionStart();

    // Security Check: Active Status
    const checkActiveStatus = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error checking active status:", error);
        return;
      }

      if (profile && profile.is_active === false) {
        console.warn("USER DEACTIVATED - Force Logout");
        await signOut();
        // signOut already navigates to /login. We can add query param if needed, but context might overwrite.
        // Let's trust signOut handling, or force navigation after.
        navigate("/login?reason=deactivated");
        toastManager.error(
          "Sua conta foi desativada. Entre em contato com o suporte.",
          { id: "account-deactivated" },
        );
      }
    };

    checkActiveStatus();
    // Optional: Set up an interval or subscription for real-time kick
    const interval = setInterval(checkActiveStatus, 60000); // Check every minute
    return () => clearInterval(interval);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Encontrar o título correspondente
  const pageTitle =
    routeTitles[currentPath] ||
    Object.entries(routeTitles).find(([route]) =>
      currentPath.startsWith(route),
    )?.[1] ||
    "Painel";

  // Modal States
  const [isGeneralNotesModalOpen, setIsGeneralNotesModalOpen] =
    React.useState(false);
  const [topicNotesModal, setTopicNotesModal] = React.useState({
    isOpen: false,
    topicId: "",
    topicName: "",
    subjectName: "",
  });
  const [subjectNotesModal, setSubjectNotesModal] = React.useState({
    isOpen: false,
    subjectId: "",
    subjectName: "",
  });

  // Student Hub state
  const [isHubOpen, setIsHubOpen] = React.useState(false);

  // USAR NOVO HOOK UNIFICADO
  const { totalUnreadCount } = useStudentHubBadge();

  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);

  return (
    // App Shell Global Area - Fixed Shell, Scrollable Main Card
    <div className="min-h-screen flex w-full p-4 gap-4 overflow-hidden transition-colors duration-300 font-sans max-w-[1920px] mx-auto">
      {/* Sidebar Desktop Card */}
      <div className="hidden md:flex h-full shrink-0 z-20">
        <AppSidebar />
      </div>

      {/* Main Content Area Card (Scrolls Internally) */}
      <main className="flex-1 h-[calc(100vh-2rem)] glass-card rounded-[24px] relative transition-colors duration-300 flex flex-col w-full min-w-0 overflow-y-auto overscroll-contain layout-scrollbar">

        {/* Constrained Wrapper for Header and Content */}
        <div className="w-full max-w-[1440px] mx-auto flex flex-col min-h-full">

          {/* Header Action Bar */}
          <div className="w-full px-6 pt-6 pb-2 flex items-center justify-between gap-3 shrink-0 sticky top-0 z-10 transition-all border-b border-transparent backdrop-blur-sm bg-card/30">
            <div className="flex items-center gap-4">
              <Button
                className="md:hidden h-9 w-9 text-muted-foreground mr-2"
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileSidebarOpen(true)}
              >
                <Menu size={20} />
              </Button>

              <div className="flex flex-col">
                {pageTitle === 'Painel' ? (
                  <>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                      {hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'}, <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Estudante'}</span>! <span className="text-lg">👋</span>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                      Foco total nos estudos! O seu sucesso depende da constante dedicação.
                    </p>
                  </>
                ) : (
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {pageTitle}
                  </h1>
                )}
              </div>
            </div>

            <div className="flex items-center gap-5">
              <FocusTimer />
              <ThemeToggle />

              {features.STUDENT_HUB && (
                <button
                  onClick={() => setIsHubOpen(true)}
                  className="w-11 h-11 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-all border border-black/5 dark:border-white/5 relative group"
                  title="Central do Aluno"
                >
                  <Bell className="text-slate-500 group-hover:text-primary transition-colors" size={20} />
                  {totalUnreadCount > 0 && (
                    <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-secondary rounded-full shadow-[0_0_5px_#FF8C00]"></span>
                  )}
                </button>
              )}

              <button
                onClick={() => setIsGeneralNotesModalOpen(true)}
                className="w-11 h-11 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-all border border-black/5 dark:border-white/5 relative group"
                title="Anotações Gerais"
              >
                <NotebookPen className="text-slate-500 group-hover:text-primary transition-colors" size={20} />
              </button>

              <div className="flex items-center gap-4 pl-5 border-l border-black/10 dark:border-white/10 hidden sm:flex">
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{user?.user_metadata?.name || user?.email?.split('@')[0] || 'Estudante'}</p>
                  <p className="text-[10px] text-primary font-bold uppercase tracking-widest opacity-80">Acesso Estudante</p>
                </div>
                <div className="relative group cursor-pointer">
                  <div className="absolute -inset-0.5 bg-gradient-to-tr from-primary to-secondary rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                  <img
                    alt="User"
                    className="relative w-11 h-11 rounded-xl object-cover grayscale-[20%] hover:grayscale-0 transition-all border border-black/5 dark:border-white/10"
                    src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user?.user_metadata?.name || 'Estudante'}&background=random`}
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 w-full px-6 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Modals and Overlays */}
      <GeneralNotesModal
        isOpen={isGeneralNotesModalOpen}
        onClose={() => setIsGeneralNotesModalOpen(false)}
        onOpenTopicNotes={(topicId, topicName, subjectName) =>
          setTopicNotesModal({ isOpen: true, topicId, topicName, subjectName })
        }
        onOpenSubjectNotes={(subjectId, subjectName) =>
          setSubjectNotesModal({ isOpen: true, subjectId, subjectName })
        }
      />

      <NotesModal
        isOpen={topicNotesModal.isOpen}
        onClose={() =>
          setTopicNotesModal({
            isOpen: false,
            topicId: "",
            topicName: "",
            subjectName: "",
          })
        }
        topicId={topicNotesModal.topicId}
        topicName={topicNotesModal.topicName}
        subjectName={topicNotesModal.subjectName}
      />

      <SubjectNotesModal
        isOpen={subjectNotesModal.isOpen}
        onClose={() =>
          setSubjectNotesModal({
            isOpen: false,
            subjectId: "",
            subjectName: "",
          })
        }
        subjectId={subjectNotesModal.subjectId}
        subjectName={subjectNotesModal.subjectName}
      />

      {/* Central do Aluno */}
      {
        features.STUDENT_HUB && (
          <StudentHubPanel
            isOpen={isHubOpen}
            onClose={() => setIsHubOpen(false)}
          />
        )
      }

      {/* Mobile Drawer Overlay */}
      {
        isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <aside className="relative w-[280px] h-full bg-sidebar flex flex-col overflow-hidden animate-in slide-in-from-left z-[50]">
              <AppSidebar />
            </aside>
          </div>
        )
      }
    </div >
  );
};
