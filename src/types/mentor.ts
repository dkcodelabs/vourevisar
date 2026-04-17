/**
 * Tipos do Sistema de Alertas do Mentor IA (vouRevisar)
 *
 * Levels:
 *  - critical   → Nível 1: Risco de Esquecimento Crítico (Importância ≥ 4 + atraso)
 *  - warning    → Nível 2: Gargalo de Desempenho (trend Piorando)
 *  - strategic  → Nível 3: Alerta Estratégico (projeção edital / reta final)
 *  - consolidated → Nível 4: Consolidação Silenciosa (intervalo máximo atingido)
 */

export type MentorAlertLevel = 'critical' | 'warning' | 'strategic' | 'consolidated';

export type MentorTrendLabel = 'Melhorando' | 'Estável' | 'Piorando' | 'Sem histórico';

export type MentorStrategicType = 'ritmoAbaixo' | 'retaFinal' | 'continuo';

// ──────────────────────────────────────────────
// Alerta de tópico/matéria (Níveis 1 e 2)
// ──────────────────────────────────────────────
export interface MentorAlert {
  id: string;
  level: MentorAlertLevel;
  /** ID real da matéria (sem sufixo -view-N) */
  subjectId: string;
  subjectName: string;
  topicId?: string;
  topicName?: string;
  /** Mensagem gerada pelo Mentor para exibição no tooltip ou banner */
  message: string;
  /** Dias em atraso na revisão (daysOverdue > 0 = atrasado) */
  daysOverdue?: number;
  /** Nota de Importância derivada do total_volume (1-5) */
  notaImportancia?: 1 | 2 | 3 | 4 | 5;
  /** Volume de questões (origem: topics.total_volume) */
  totalVolume?: number;
  /** Tendência calculada via memory_stability + review_count */
  trendLabel?: MentorTrendLabel;
}

// ──────────────────────────────────────────────
// Insight estratégico de edital (Nível 3)
// ──────────────────────────────────────────────
export interface MentorStrategicInsight {
  type: MentorStrategicType;
  message: string;
  examDate?: string | null;
  /** Dias restantes até a prova (null se sem data) */
  daysUntilExam?: number | null;
  /** Percentual de tópicos concluídos vs ritmo necessário */
  progressVsNeeded?: number;
}

// ──────────────────────────────────────────────
// Tópico consolidado (Nível 4)
// ──────────────────────────────────────────────
export interface MentorConsolidatedTopic {
  topicId: string;
  topicName: string;
  subjectId: string;
  subjectName: string;
  /** Intervalo atual do tópico em dias */
  currentInterval: number;
  /** Teto máximo permitido pelo perfil do usuário */
  maxIntervalCap: number;
}

// ──────────────────────────────────────────────
// Objeto retornado pelo hook useMentorInsights
// ──────────────────────────────────────────────
export interface MentorInsights {
  /** Nível 1: até 3 alertas críticos ordenados por total_volume desc */
  criticalAlerts: MentorAlert[];
  /** Nível 2: alertas consultivos de gargalo (trend Piorando) */
  gargalos: MentorAlert[];
  /** Nível 3: insight estratégico de edital (reta final / ritmo / contínuo) */
  strategicInsight: MentorStrategicInsight | null;
  /** Nível 4: tópicos consolidados (intervalo máximo atingido) */
  consolidatedTopics: MentorConsolidatedTopic[];
  /** Map rápido subjectId → MentorAlert (Nível 1) para lookup nas cards */
  criticalBySubject: Map<string, MentorAlert>;
  /** Map rápido topicId → MentorAlert (Nível 1) para lookup nos itens de revisão do ciclo */
  criticalByTopic: Map<string, MentorAlert>;
  /** Map rápido topicId → MentorAlert (Nível 2) para lookup nos itens de revisão */
  gargaloByTopic: Map<string, MentorAlert>;
  /** Todos os gargalos identificados (independente de limite 3) */
  allGargalos: MentorAlert[];
  /** Set de topicIds consolidados para lookup rápido */
  consolidatedTopicIds: Set<string>;
  /** Map de tendências de cada tópico (Piorando, Estável, etc) */
  trendByTopic: Map<string, MentorTrendLabel>;
  /** Verdadeiro se há pelo menos 1 alerta de qualquer nível */
  hasAnyAlert: boolean;
  /** Total de alertas ativos (máx 3 por rate limiting) */
  totalAlertCount: number;
}
