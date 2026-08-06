import { RefreshCw, WifiOff } from 'lucide-react';
import { DashboardDecisionExperience } from '@/components/dashboard-decision/DashboardDecisionExperience';
import { PremiumStateCard } from '@/components/ui/PremiumStateCard';
import { useDashboardDecisionModel } from '@/hooks/useDashboardDecisionModel';

const Dashboard = () => {
  const {
    model,
    activityRange,
    setActivityRange,
    addReminder,
    toggleReminder,
    deleteReminder,
    updateCycleName,
    isAddingReminder,
    isDeletingReminder,
    isUpdatingCycleName,
    navigateToAction,
  } = useDashboardDecisionModel();

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

  return (
    <div className="h-full w-full pb-10">
      <DashboardDecisionExperience
        model={model}
        activityRange={activityRange}
        onActivityRangeChange={setActivityRange}
        onNavigate={navigateToAction}
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
