import type { DashboardAction } from "@/types/dashboardDecision";

export const trialHref = "/login?mode=register&source=landing";
export const journey = [
  {
    title: "Tudo começa pelo seu edital.",
    short: "Seu edital",
    text: "Escolha no catálogo, importe um PDF com IA ou crie do seu jeito. Matérias e tópicos ganham um lugar.",
    detail: "Catálogo, PDF com IA e criação manual",
    icon: "edital",
  },
  {
    title: "Um ciclo para sair do papel.",
    short: "Seu ciclo",
    text: "Organize as matérias e percorra seu conteúdo com uma fila clara. A preparação anda no seu ritmo.",
    detail: "Matérias organizadas em uma rotina executável",
    icon: "ciclo",
  },
  {
    title: "Estude com foco. Depois, coloque em prática.",
    short: "Foco e treino",
    text: "O cronômetro acompanha sua sessão. Questões e flashcards gerados por IA trabalham o conteúdo que você está estudando.",
    detail: "Cronômetro, questões e flashcards no contexto do seu estudo",
    icon: "treino",
  },
  {
    title: "Revisar também entra no plano.",
    short: "Sua revisão",
    text: "Seu histórico e a dificuldade registrada ajudam a organizar as próximas revisões. Você encontra o que precisa de atenção.",
    detail: "Revisões espaçadas com uma próxima ação clara",
    icon: "revisao",
  },
  {
    title: "Enxergue o caminho percorrido.",
    short: "Sua evolução",
    text: "Veja o avanço no edital e compare os giros do ciclo. Entenda sua rotina a partir do que você realmente estudou.",
    detail: "Progresso do edital e comparação entre giros",
    icon: "evolucao",
  },
] as const;

export const demoAction: DashboardAction = {
  id: "marketing-example",
  kind: "review_today",
  tone: "info",
  title: "Revisar Direitos fundamentais",
  description: "Retome um tópico do seu edital.",
  reason:
    "Esta revisão está prevista para hoje. Retome o conteúdo antes de continuar seu ciclo.",
  scientificBasis:
    "No produto, a próxima ação considera seu ciclo, histórico e revisões pendentes. Os dados desta prévia são demonstrativos.",
  primaryLabel: "Revisar agora",
  primaryHref: "/revisoes",
  priorityScore: 1,
  target: {
    subjectName: "Direito Constitucional",
    topicName: "Direitos e garantias fundamentais",
  },
};

export const comparison = [
  [
    "Conteúdo do edital",
    "Espalhado entre arquivos e anotações",
    "Matérias e tópicos no mesmo lugar",
  ],
  [
    "O que estudar agora",
    "Uma decisão nova a cada sessão",
    "Uma próxima ação para continuar",
  ],
  [
    "Tempo de foco",
    "Sessões que ficam só na intenção",
    "Cronômetro para acompanhar seu estudo",
  ],
  [
    "Hora de revisar",
    "Datas controladas por você",
    "Agenda baseada no seu histórico",
  ],
  ["Prática", "Separada da rotina", "Questões e flashcards no contexto"],
  [
    "Evolução",
    "Difícil de reunir e comparar",
    "Visão do edital e dos giros do ciclo",
  ],
] as const;

export const faqs = [
  [
    "Como funcionam os 7 dias grátis?",
    "Novas contas recebem 7 dias de acesso gratuito, sem cartão e sem cobrança automática. Ao final, você escolhe se quer assinar.",
  ],
  [
    "Preciso cadastrar um cartão para testar?",
    "Não. Você pode criar sua conta com e-mail ou Google. Um pagamento só acontece quando você escolhe um plano e confirma a contratação.",
  ],
  [
    "Posso usar meu próprio edital?",
    "Sim. Você pode escolher no catálogo, importar um PDF com IA ou criar seu edital manualmente. As extrações com IA seguem os limites do seu acesso.",
  ],
  [
    "O vouRevisar tem aulas ou garante aprovação?",
    "O vouRevisar organiza sua preparação, prática e revisões. Ele não substitui seu material de estudo nem promete aprovação ou classificação.",
  ],
  [
    "Funciona no celular?",
    "Sim. Acesse pelo navegador do celular, tablet ou computador usando a mesma conta.",
  ],
  [
    "Como funciona o cancelamento?",
    "Você pode gerenciar a assinatura e cancelar futuras renovações na sua conta. Pedidos de reembolso seguem a Política de Cancelamento e Reembolso disponível no rodapé.",
  ],
] as const;
