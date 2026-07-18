import { Search } from 'lucide-react';
import type { CycleEntryState } from '@/utils/cycleEntryState';

type CycleEmptyStateProps = {
  state: CycleEntryState;
  onGoToEditais: () => void;
};

export function CycleEmptyState({
  state,
  onGoToEditais,
}: CycleEmptyStateProps) {
  if (state.kind === 'access_loading'
    || state.kind === 'access_error'
    || state.kind === 'access_blocked'
    || state.kind === 'load_error'
    || state.kind === 'ready') {
    return null;
  }

  if (state.kind === 'search_empty') {
    return (
      <>
        <div className="app-empty-orb mb-6 flex h-16 w-16 items-center justify-center rounded-full">
          <Search size={32} className="text-content-muted" />
        </div>
        <h3 className="mb-2 text-lg font-bold text-foreground">Nada encontrado na fila</h3>
        <p className="text-content-muted mb-6 max-w-sm">
          A busca não encontrou matéria ou tópico neste ciclo.
        </p>
      </>
    );
  }

  if (state.kind === 'first_access_no_editais') {
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

  if (state.kind === 'editais_without_content') {
    return (
      <>
        <div className="app-empty-orb mb-6 flex h-20 w-20 items-center justify-center rounded-full">
          <span className="text-4xl text-primary">📄</span>
        </div>
        <h3 className="mb-3 text-xl font-bold text-title-section">Seu edital ainda está sem conteúdo</h3>
        <p className="text-content-muted mb-8 max-w-md leading-relaxed">
          O edital foi cadastrado, mas ainda não tem matérias e tópicos para entrar no ciclo.
        </p>
        <button onClick={onGoToEditais} className="app-primary-button px-6 py-3">
          Completar edital
        </button>
      </>
    );
  }

  if (state.kind === 'editais_ready_not_loaded') {
    return (
      <>
        <div className="app-empty-orb mb-6 flex h-20 w-20 items-center justify-center rounded-full">
          <span className="text-4xl text-primary">📚</span>
        </div>
        <h3 className="mb-3 text-xl font-bold text-title-section">Escolha o que vai para o ciclo</h3>
        <p className="text-content-muted mb-8 max-w-md leading-relaxed">
          Você já tem edital com conteúdo cadastrado. Carregue as matérias em Meus Editais para começar a estudar.
        </p>
        <button onClick={onGoToEditais} className="app-primary-button px-6 py-3">
          Carregar edital no ciclo
        </button>
      </>
    );
  }

  if (state.kind === 'cycle_loaded_empty') {
    return (
      <>
        <div className="app-empty-orb mb-6 flex h-20 w-20 items-center justify-center rounded-full">
          <span className="text-4xl text-primary">📚</span>
        </div>
        <h3 className="mb-3 text-xl font-bold text-title-section">O ciclo está sem matérias</h3>
        <p className="text-content-muted mb-8 max-w-md leading-relaxed">
          O ciclo foi carregado, mas não encontramos matérias válidas nele. Revise seus editais para carregar conteúdo novamente.
        </p>
        <button onClick={onGoToEditais} className="app-primary-button px-6 py-3">
          Revisar Meus Editais
        </button>
      </>
    );
  }

  return (
    <>
      <div className="app-empty-orb mb-6 flex h-16 w-16 items-center justify-center rounded-full">
        <Search size={32} className="text-content-muted" />
      </div>
      <h3 className="mb-2 text-lg font-bold text-foreground">Nenhuma matéria disponível</h3>
      <p className="text-content-muted mb-6 max-w-sm">Não há conteúdo para mostrar neste ciclo.</p>
      <button onClick={onGoToEditais} className="app-primary-button px-5 py-2">Ir para Meus Editais</button>
    </>
  );
}
