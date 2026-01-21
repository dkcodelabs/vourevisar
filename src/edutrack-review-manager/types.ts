
export enum SessionStatus {
  COMPLETED = 'completed',
  DELAYED = 'delayed',
  TODAY = 'today',
  FUTURE = 'future'
}

export interface SessionNode {
  id: string;
  label: string; // e.g., "24h", "7D"
  date: string;
  status: SessionStatus;
  meta?: string; // e.g., "Concluída (20min)", "54d atraso"
}

export interface StudyTopic {
  title: string;
  subtitle: string;
  sessions: SessionNode[];
}
