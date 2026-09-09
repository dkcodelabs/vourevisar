import { RefreshCw, WifiOff } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { DashboardDecisionExperience } from '@/components/dashboard-decision/DashboardDecisionExperience';
import { PremiumStateCard } from '@/components/ui/PremiumStateCard';
import { useActivationCompletionTelemetry } from '@/features/activation/hooks/useActivationTelemetry';
import { useDashboardDecisionModel } from '@/hooks/useDashboardDecisionModel';

const Dashboard = () => {
  const {
    model,
    addReminder,
    toggleReminder,
    deleteReminder,
    updateCycleName,
    isAddingReminder,
    isDeletingReminder,
    isUpdatingCycleName,
    navigateToAction,
    retryDashboardDataIssue,
  } = useDashboardDecisionModel();
  useActivationCompletionTelemetry(
    !model.isLoading && (model.totals?.startedTopics ?? 0) > 0,
  );

  if (model.error) {
    return (
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-8 sm:p-6">
        <PremiumStateCard
          icon={WifiOff}
          label="Conexão interrompida"
          title="Seus estudos estão salvos. Só não consegui buscar os dados agora."
          description="Parece que a internet caiu ou ficou instável por alguns segundos. Confira sua conexão e tente novamente para recarregar o painel."
          actionLabel="Tentar novamente"
          actionIcon={RefreshCw}
          requiresOnline
          onAction={() => window.location.reload()}
          helperText="Se voltar sozinho, é só continuar de onde parou."
          technicalDetail={model.error instanceof Error ? model.error.message : String(model.error)}
        />
      </div>
    );
  }

  if (!model.isLoading && (
    model.examContext.state === 'missing_cycle' ||
    model.totals.startedTopics === 0
  )) {
    return <Navigate to="/ativacao" replace />;
  }

  return (
    <div className="dashboard-page h-full w-full pb-10">
      <DashboardDecisionExperience
        model={model}
        onNavigate={navigateToAction}
        onRetryDataIssue={retryDashboardDataIssue}
        onAddReminder={addReminder}
        onToggleReminder={toggleReminder}
        onDeleteReminder={deleteReminder}
        onUpdateCycleName={updateCycleName}
        isAddingReminder={isAddingReminder}
        isDeletingReminder={isDeletingReminder}
        isUpdatingCycleName={isUpdatingCycleName}
      />
    </div>
  );
};

export default Dashboard;
