import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, NotebookPen } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import GeneralNotesModal from "@/components/GeneralNotesModal";
import { FocusTimer } from "@/components/FocusTimer";
import { NetworkStatusOverlay } from "@/components/NetworkStatusOverlay";
import NotesModal from "@/components/reviews/NotesModal";
import SubjectNotesModal from "@/components/reviews/SubjectNotesModal";
import { StudentHubPanel } from "@/components/student-hub/StudentHubPanel";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { useStudentHubBadge } from "@/hooks/useStudentHubBadge";
import { useUserLogger } from "@/hooks/useUserLogger";
import { fetchAccountActiveStatus } from '@/services/accountStatusService';
import { features } from "@/lib/features";
import { toastManager } from "@/utils/toastManager";

const routeTitles: Record<string, string> = {
  "/ativacao": "Seu ponto de partida",
  "/planos": "Planos",
  "/dashboard": "Painel",
  "/meus-editais": "Meus Editais",
  "/ciclo-estudos": "Ciclo de Estudos",
  "/revisoes": "Revisões",
  "/treino": "Treino inteligente",
  "/pratica": "Prática",
  "/estatisticas": "Evolução",
  "/conta/assinatura": "Minha assinatura",
  "/conta": "Conta",
  "/perfil": "Perfil",
  "/configuracoes": "Configurações",
  "/admin/ai-settings": "Gestão de IA",
  "/admin/pricing": "Divulgação e Repasses",
  "/admin/referrals": "Divulgação e Repasses",
  "/admin/audit": "Auditoria",
  "/admin/subscription": "Assinaturas",
  "/admin/users": "Gerenciar Usuários",
  "/admin/editais": "Gerenciar Editais",
  "/admin/feedback": "Feedback",
  "/reveal-cards": "Componentes UI",
  "/reveal-card-demo": "Modelos de Componentes",
  "/admin/system/errors": "Erros do Sistema",
};

const getRouteLabel = (pathname: string) =>
  routeTitles[pathname] ||
  Object.entries(routeTitles).find(([route]) => pathname.startsWith(route))?.[1] ||
  "Painel";

const appDataOverlayRoutes = [
  "/ativacao",
  "/dashboard",
  "/meus-editais",
  "/ciclo-estudos",
  "/revisoes",
  "/treino",
  "/pratica",
  "/estatisticas",
];

const shouldShowAppDataOverlay = (pathname: string) =>
  appDataOverlayRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logSessionStart } = useUserLogger();
  const { signOut, user } = useAuth();
  const { error: appError } = useApp();
  const { totalUnreadCount } = useStudentHubBadge();
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
  const [isHubOpen, setIsHubOpen] = React.useState(false);
  const [studentHubInitialTab, setStudentHubInitialTab] =
    React.useState<'notificacoes' | 'feedbacks'>('notificacoes');

  const currentPath = location.pathname;
  const isDashboardRoute = currentPath === '/dashboard';
  const pageTitle = getRouteLabel(currentPath);
  const showAppDataOverlay = shouldShowAppDataOverlay(currentPath);
  const showStudyUtilities = ![
    '/ativacao',
    '/planos',
    '/conta',
    '/conta/assinatura',
  ].includes(currentPath);

  React.useEffect(() => {
    if (!user) return;

    logSessionStart(user);

    const checkActiveStatus = async () => {
      try {
        const isActive = await fetchAccountActiveStatus(user.id);
        if (!isActive) {
        console.warn("[AppLayout] USUÁRIO DESATIVADO - Logout forçado");
        await signOut();
        navigate("/login?reason=deactivated");
        toastManager.error(
          "Sua conta foi desativada. Entre em contato com o suporte.",
          { id: "account-deactivated" },
        );
        }
      } catch {
        // Falhas transitórias não devem desconectar o aluno.
      }
    };

    if (user) {
      checkActiveStatus();
      const interval = setInterval(checkActiveStatus, 120000);
      return () => clearInterval(interval);
    }
  }, [user, signOut, navigate, logSessionStart]);

  if (currentPath.startsWith('/pratica/')) {
    return (
      <div className="min-h-dvh bg-background">
        <Outlet />
      </div>
    );
  }

  return (
    <SidebarProvider className={`app-page-bg${isDashboardRoute ? ' dashboard-app-shell' : ''}`}>
      <AppSidebar
        onOpenHelp={() => {
          setStudentHubInitialTab('feedbacks');
          setIsHubOpen(true);
        }}
      />
      <SidebarInset className={`h-svh overflow-hidden bg-transparent${isDashboardRoute ? ' dashboard-app-inset' : ''}`}>
        <header className={`app-shell-header flex min-h-[58px] sm:min-h-[62px] shrink-0 items-center justify-between gap-3 px-3 py-2 sm:px-5 lg:px-6${isDashboardRoute ? ' dashboard-app-header' : ''}`}>
          <SidebarTrigger className="app-header-trigger -ml-1 shrink-0" title="Abrir menu" />

          <div className="flex min-w-0 flex-1 items-center">
            <h1 className="app-type-page-title min-w-0 max-w-full truncate text-title-page font-bold text-lg sm:text-xl">
              {pageTitle}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            {showStudyUtilities ? (
              <>
                <FocusTimer />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="app-header-icon rounded-full"
                  onClick={() => setIsGeneralNotesModalOpen(true)}
                  title="Anotações Gerais"
                  aria-label="Anotações Gerais"
                >
                  <NotebookPen className="size-4 sm:size-[1.125rem]" />
                </Button>
              </>
            ) : null}

            {features.STUDENT_HUB && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="app-header-icon relative rounded-full"
                onClick={() => {
                  setStudentHubInitialTab('notificacoes');
                  setIsHubOpen(true);
                }}
                title="Central do Aluno"
                aria-label="Central do Aluno"
              >
                <Bell className="size-4 sm:size-[1.125rem]" />
                {totalUnreadCount > 0 && (
                  <span className="absolute right-2 top-2 size-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.85)] ring-2 ring-background" />
                )}
              </Button>
            )}
          </div>
        </header>

        <main className={`layout-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-transparent${isDashboardRoute ? ' dashboard-app-content' : ''}`}>
          <div className="mx-auto flex min-h-full w-full max-w-[1480px] flex-col px-3 py-4 sm:px-5 lg:px-6">
            <Outlet />
          </div>
        </main>
      </SidebarInset>

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

      {features.STUDENT_HUB && (
        <StudentHubPanel
          isOpen={isHubOpen}
          initialTab={studentHubInitialTab}
          onClose={() => setIsHubOpen(false)}
        />
      )}

      <NetworkStatusOverlay appError={showAppDataOverlay ? appError : null} />
    </SidebarProvider>
  );
};
