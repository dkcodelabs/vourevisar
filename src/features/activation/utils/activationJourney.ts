import type {
  ActivationJourney,
  ActivationSnapshot,
} from '@/features/activation/types';

export function getActivationJourney(snapshot: ActivationSnapshot): ActivationJourney {
  const readyEditais = snapshot.editais.filter((edital) => edital.subjectCount > 0);
  const readyEdital = readyEditais[0] ?? null;
  const incompleteEdital = snapshot.editais.find((edital) => edital.subjectCount === 0) ?? null;

  if (snapshot.hasFirstStudy) {
    return {
      kind: 'activated',
      activeStep: 3,
      completedSteps: 3,
      title: 'Seu plano já está em movimento',
      description: 'O Painel agora pode usar seu histórico real para indicar a próxima ação.',
      primaryActionLabel: 'Ir para o Painel',
      primaryHref: '/dashboard',
      edital: readyEdital,
      cycleName: snapshot.cycleName,
    };
  }

  if (snapshot.editais.length === 0) {
    return {
      kind: 'no_edital',
      activeStep: 0,
      completedSteps: 0,
      title: 'Transforme seu edital em uma rotina que sabe o próximo passo.',
      description: 'Adicione o conteúdo do seu concurso. O vouRevisar organiza matérias, ciclo, estudos e revisões em uma sequência executável.',
      primaryActionLabel: 'Escolher edital no catálogo',
      primaryHref: '/meus-editais',
      primaryState: { openImportModal: true, importTab: 'ready' },
      edital: null,
      cycleName: null,
    };
  }

  if (!readyEdital) {
    return {
      kind: 'edital_without_content',
      activeStep: 0,
      completedSteps: 0,
      title: 'Seu edital precisa do conteúdo que vai orientar o estudo.',
      description: 'Complete matérias e tópicos para o sistema montar um ciclo e começar a programar suas revisões.',
      primaryActionLabel: 'Completar meu edital',
      primaryHref: '/meus-editais',
      primaryState: incompleteEdital ? { openEditalId: incompleteEdital.id } : undefined,
      edital: incompleteEdital,
      cycleName: null,
    };
  }

  if (!snapshot.hasActiveCycle) {
    if (readyEditais.length > 1) {
      return {
        kind: 'edital_selection_required',
        activeStep: 1,
        completedSteps: 1,
        title: 'Você tem mais de um edital pronto para virar ciclo.',
        description: 'Escolha qual preparação quer colocar em movimento agora. Nada será carregado automaticamente.',
        primaryActionLabel: 'Escolher meu edital',
        primaryHref: '#editais-prontos',
        edital: null,
        eligibleEditais: readyEditais,
        cycleName: null,
      };
    }

    return {
      kind: 'cycle_not_loaded',
      activeStep: 1,
      completedSteps: 1,
      title: 'Seu edital está pronto. Agora ele precisa virar um ciclo.',
      description: 'Ao carregar o edital, você escolhe as matérias e cria a fila que conduz seu estudo sem apagar o progresso existente.',
      primaryActionLabel: 'Montar meu ciclo',
      primaryHref: `/meus-editais?sourceId=${encodeURIComponent(readyEdital.id)}`,
      edital: readyEdital,
      cycleName: null,
    };
  }

  return {
    kind: 'first_study_pending',
    activeStep: 2,
    completedSteps: 2,
    title: 'Seu plano está pronto para o primeiro contato.',
    description: 'Comece por um tópico do ciclo. A partir desse registro, o vouRevisar passa a organizar as próximas revisões e sua continuidade.',
    primaryActionLabel: 'Começar meu primeiro tópico',
    primaryHref: '/ciclo-estudos',
    edital: readyEdital,
    cycleName: snapshot.cycleName,
  };
}
