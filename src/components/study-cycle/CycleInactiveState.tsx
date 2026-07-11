type CycleInactiveStateProps = {
  hasActiveCycle: boolean;
  onGoToEditais: () => void;
};

export function CycleInactiveState({
  hasActiveCycle,
  onGoToEditais,
}: CycleInactiveStateProps) {
  return (
    <div className="flex min-h-[520px] w-full items-center justify-center text-center">
      <div className="flex max-w-md flex-col items-center">
        <div className="app-empty-orb mb-6 flex h-20 w-20 items-center justify-center rounded-full">
          <span className="text-4xl text-primary">📚</span>
        </div>
        <h3 className="mb-3 text-xl font-bold text-foreground">
          {hasActiveCycle ? 'Nenhuma matéria ativa no ciclo' : 'Seu ciclo ainda não está montado'}
        </h3>
        <p className="text-content-muted mx-auto mb-8 leading-relaxed">
          {hasActiveCycle
            ? 'As matérias do ciclo foram ocultadas ou removidas do edital. Reative as matérias em Meus Editais para continuar estudando.'
            : 'Escolha um edital e ative as matérias que farão parte da fila. A página só vira mapa de estudo quando existe uma fila real.'}
        </p>
        <button
          onClick={onGoToEditais}
          className="app-primary-button px-6 py-3"
        >
          Ir para Meus Editais
        </button>
      </div>
    </div>
  );
}
