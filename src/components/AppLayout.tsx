import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import {
  ChevronRight,
  ChevronDown,
  NotebookPen,
  Bell,
  Menu,
  Sparkles,
  CornerDownRight,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { StudentHubPanel } from "./student-hub/StudentHubPanel";
import { useStudentHubBadge } from "@/hooks/useStudentHubBadge";
import { useSimpleSubscription } from "@/hooks/useSimpleSubscription";
import { useUserProfile } from "@/hooks/useUserProfile";
import { FocusTimer } from "./FocusTimer";
import { UserProfileNav } from "./UserProfileNav";

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
  const { displayBadge } = useSimpleSubscription();
  const { profile } = useUserProfile();

  // Formatação consistente de iniciais sem uso de API externa ui-avatars
  const userInitials = profile?.name
    ? profile.name.trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U';

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);

  // Fechar sidebar mobile ao navegar
  React.useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    // App Shell Global Area - Fixed Shell, Scrollable Main Card
    <div className="h-[100dvh] flex sm:p-4 gap-4 overflow-hidden transition-colors duration-300 font-sans bg-background">
      {/* Sidebar Desktop Card */}
      <div className="hidden md:flex h-[calc(100dvh-2rem)] shrink-0 z-20">
        <AppSidebar />
      </div>

      {/* Main Content Area Card */}
      <main className="flex-1 h-[100dvh] sm:h-[calc(100dvh-2rem)] glass-card rounded-none sm:rounded-[24px] relative transition-colors duration-300 flex w-full min-w-0 overflow-hidden">

        {/* Blur Gradient Overlay For Scroll (Atua como um "fade" para o topo) */}
        <div className="absolute top-0 left-0 right-0 h-32 z-[30] pointer-events-none fade-top-glass"></div>

        {/* Header and Content Wrapper */}
        <div className="flex flex-col w-full h-full relative">
          {/* Header Action Bar - Fixo no topo sem sticky principal, fica sobreposto e o scroll passa por baixo via z-index */}
          <div className="w-full px-4 sm:px-8 pt-8 sm:pt-3 pb-2 shrink-0 z-[40] bg-transparent absolute top-0 left-0 right-0">

            {/* === MOBILE/TABLET: Ícones em cima === */}
            <div className="flex flex-col gap-2 lg:hidden">
              {/* Linha 1: Hamburger + Ícones (sempre visíveis) */}
              <div className="flex items-center justify-between">
                <Button
                  className="h-9 w-9 text-muted-foreground"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileSidebarOpen(true)}
                >
                  <Menu size={20} />
                </Button>

                <div className="flex items-center gap-1.5">
                  <FocusTimer />
                  <ThemeToggle />

                  {features.STUDENT_HUB && (
                    <button
                      onClick={() => setIsHubOpen(true)}
                      className="w-9 h-9 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-all relative"
                      title="Central do Aluno"
                    >
                      <Bell className="text-muted-foreground" size={18} />
                      {totalUnreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-secondary rounded-full shadow-[0_0_5px_#FF8C00]"></span>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => setIsGeneralNotesModalOpen(true)}
                    className="w-9 h-9 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-all relative"
                    title="Anotações Gerais"
                  >
                    <NotebookPen className="text-muted-foreground" size={18} />
                  </button>

                  <div className="pl-1">
                    {user && <UserProfileNav />}
                  </div>
                </div>
              </div>
            </div>

            {/* === DESKTOP: Layout original (1 linha) === */}
            <div className="hidden lg:flex items-center justify-between gap-4">
              <div className="flex flex-col flex-1 min-w-0">
                {pageTitle === 'Painel' ? (
                  <>
                    <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2 truncate">
                      {hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'}, <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent truncate">{user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Estudante'}</span>! <span className="text-base shrink-0">👋</span>
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 font-medium truncate">
                      Foco total nos estudos! O seu sucesso depende da constante dedicação.
                    </p>
                  </>
                ) : (
                  <h1 className="text-lg font-bold tracking-tight text-foreground truncate">
                    {pageTitle}
                  </h1>
                )}
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <FocusTimer />
                <ThemeToggle />

                {features.STUDENT_HUB && (
                  <button
                    onClick={() => setIsHubOpen(true)}
                    className="w-10 h-10 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-all border border-black/5 dark:border-white/5 relative group"
                    title="Central do Aluno"
                  >
                    <Bell className="text-slate-500 group-hover:text-primary transition-colors" size={20} />
                    {totalUnreadCount > 0 && (
                      <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-secondary rounded-full shadow-[0_0_5px_#FF8C00]"></span>
                    )}
                  </button>
                )}

                <button
                  onClick={() => setIsGeneralNotesModalOpen(true)}
                  className="w-10 h-10 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-all border border-black/5 dark:border-white/5 relative group"
                  title="Anotações Gerais"
                >
                  <NotebookPen className="text-slate-500 group-hover:text-primary transition-colors" size={20} />
                </button>

                <div className="flex items-center pl-4 border-l border-black/10 dark:border-white/10">
                  <UserProfileNav />
                </div>
              </div>
            </div>
          </div>

          {/* Pseudo-backdrop para o header flex, reativa o efeito de transparência desfocada no conteúdo scrolado */}
          <div className="absolute top-0 left-0 right-0 h-32 z-[35] pointer-events-none fade-top-glass-header"></div>

          {/* Constrained Wrapper for Content - O padding top extra acomoda o header absolute */}
          <div className="flex-1 w-full overflow-y-auto overscroll-contain layout-scrollbar relative">
            <div className="w-full max-w-[1600px] mx-auto flex flex-col min-h-full">
              {/* Content Area */}
              <div className="flex-1 w-full px-5 sm:px-8 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-20 lg:pt-28 xl:pt-24">

                {/* Título Mobile Rolável */}
                <div className="lg:hidden mb-6 flex flex-col pt-2">
                  {pageTitle === 'Painel' ? (
                    <>
                      <h1 className="text-[22px] font-bold tracking-tight text-foreground flex items-center gap-1.5 flex-wrap leading-tight">
                        {hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'},
                        <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                          {user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Estudante'}
                        </span>! <span className="text-xl">👋</span>
                      </h1>
                      <p className="text-sm text-muted-foreground mt-1 font-medium">
                        Foco total nos estudos! O seu sucesso depende da constante dedicação.
                      </p>
                    </>
                  ) : (
                    <h1 className="text-[22px] font-bold tracking-tight text-foreground">
                      {pageTitle}
                    </h1>
                  )}
                </div>

                <Outlet />
              </div>
            </div>
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
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-[280px] h-full bg-sidebar flex flex-col overflow-hidden z-[50]"
            >
              <AppSidebar />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div >
  );
};
