import { Search } from 'lucide-react';

type CycleEmptyStateProps = {
  hasLocalSubjects: boolean;
  isSearchActive: boolean;
  onGoToEditais: () => void;
};

export function CycleEmptyState({
  hasLocalSubjects,
  isSearchActive,
  onGoToEditais,
}: CycleEmptyStateProps) {
  if (!hasLocalSubjects) {
    return (
      <>
        <div className="app-empty-orb mb-6 flex h-20 w-20 items-center justify-center rounded-full">
          <span className="text-4xl text-primary">📚</span>
        </div>
        <h3 className="mb-3 text-xl font-bold text-title-section">
          Nenhuma matéria cadastrada
        </h3>
        <p className="text-content-muted max-w-md mx-auto mb-8 leading-relaxed">
          Importe um edital ou cadastre matérias em Meus Editais para montar uma fila de ciclo confiável.
        </p>
        <button
          onClick={onGoToEditais}
          className="app-primary-button px-6 py-3"
        >
          Ir para Meus Editais
        </button>
      </>
    );
  }

  return (
    <>
      <div className="app-empty-orb mb-6 flex h-16 w-16 items-center justify-center rounded-full">
        <Search size={32} className="text-content-muted" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">
        {isSearchActive ? 'Nada encontrado na fila' : 'Nenhuma matéria ativa no ciclo'}
      </h3>
      <p className="text-content-muted max-w-sm mx-auto mb-6">
        {isSearchActive
          ? 'A busca não encontrou matéria ou tópico ativo neste ciclo.'
          : 'Todas as matérias foram ocultadas ou o edital foi removido do ciclo. Reative matérias em Meus Editais para continuar.'}
      </p>
      <button
        onClick={onGoToEditais}
        className="app-primary-button px-5 py-2"
      >
        Ir para Meus Editais
      </button>
    </>
  );
}
