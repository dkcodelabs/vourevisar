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
import { supabase } from "@/integrations/supabase/client";
import { features } from "@/lib/features";
import { toastManager } from "@/utils/toastManager";

const routeTitles: Record<string, string> = {
  "/dashboard": "Painel",
  "/meus-editais": "Meus Editais",
  "/ciclo-estudos": "Ciclo de Estudos",
  "/revisoes": "Revisões",
  "/cadernos": "Cadernos",
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
  "/admin/system/errors": "Erros do Sistema",
};

const routeDescriptions: Record<string, string> = {
  "/admin/feedback": "Gerencie e responda aos feedbacks recebidos.",
  "/admin/subscription": "Controle de planos, status de pagamento e acesso dos usuários.",
  "/dashboard": "Foco total nos estudos! O seu sucesso depende da constante dedicação.",
  "/ciclo-estudos": "O que estudar agora para avançar melhor no edital.",
  "/admin/users": "Gerencie os membros da sua equipe e suas permissões de conta aqui.",
  "/admin/ai-settings": "Gestão de IA e comportamento do Gemini para extração de editais.",
  "/admin/audit": "Rastreamento de ações e eventos do sistema.",
};

const getRouteLabel = (pathname: string) =>
  routeTitles[pathname] ||
  Object.entries(routeTitles).find(([route]) => pathname.startsWith(route))?.[1] ||
  "Painel";

const appDataOverlayRoutes = [
  "/dashboard",
  "/meus-editais",
  "/ciclo-estudos",
  "/revisoes",
  "/cadernos",
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
  const pageTitle = getRouteLabel(currentPath);
  const showAppDataOverlay = shouldShowAppDataOverlay(currentPath);
  const routeDescription =
    routeDescriptions[currentPath] ||
    Object.entries(routeDescriptions).find(([route]) =>
      currentPath.startsWith(route),
    )?.[1];

  React.useEffect(() => {
    if (!user) return;

    logSessionStart(user);

    const checkActiveStatus = async () => {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", user.id)
        .single();

      if (error) return;

      if (profile && profile.is_active === false) {
        console.warn("[AppLayout] USUÁRIO DESATIVADO - Logout forçado");
        await signOut();
        navigate("/login?reason=deactivated");
        toastManager.error(
          "Sua conta foi desativada. Entre em contato com o suporte.",
          { id: "account-deactivated" },
        );
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
    <SidebarProvider className="app-page-bg">
      <AppSidebar
        onOpenHelp={() => {
          setStudentHubInitialTab('feedbacks');
          setIsHubOpen(true);
        }}
      />
      <SidebarInset className="h-svh overflow-hidden bg-transparent">
        <header className="app-shell-header flex min-h-16 shrink-0 items-center gap-3 px-3 py-2.5 sm:px-6">
          <SidebarTrigger className="app-header-trigger -ml-1 shrink-0" title="Abrir menu" />

          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <h1 className="app-type-page-title min-w-0 max-w-full break-words text-title-page">
              {pageTitle}
            </h1>
            {routeDescription && (
              <p className="app-type-page-subtitle mt-0.5 hidden min-w-0 max-w-full overflow-hidden text-content-muted [-webkit-box-orient:vertical] [-webkit-line-clamp:1] sm:[display:-webkit-box] min-[760px]:[-webkit-line-clamp:2]">
                {routeDescription}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <FocusTimer />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="app-header-icon rounded-lg"
              onClick={() => setIsGeneralNotesModalOpen(true)}
              title="Anotações Gerais"
            >
              <NotebookPen />
            </Button>

            {features.STUDENT_HUB && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="app-header-icon relative rounded-lg"
                onClick={() => {
                  setStudentHubInitialTab('notificacoes');
                  setIsHubOpen(true);
                }}
                title="Central do Aluno"
              >
                <Bell />
                {totalUnreadCount > 0 && (
                  <span className="absolute right-2 top-2 size-1.5 rounded-full bg-secondary shadow-[0_0_5px_#FF8C00]" />
                )}
              </Button>
            )}
          </div>
        </header>

        <main className="layout-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-transparent">
          <div className="mx-auto flex min-h-full w-full max-w-[1680px] flex-col px-3 py-4 sm:px-4 lg:px-5 xl:px-6">
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
