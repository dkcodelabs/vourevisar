/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react';
import { differenceInHours } from 'date-fns';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, CheckCircle2, Clock, Eye, Loader2, PlusCircle, Wand2, X } from 'lucide-react';

import { FEEDBACK_LABELS, type FeedbackStatus } from '@/services/feedbackService';

export type FeedbackType = 'melhoria' | 'nova_funcionalidade' | 'problema' | 'improvement' | 'feature_request' | 'ux_issue';

export interface FeedbackRecord {
  id: string;
  protocol_code: string;
  feedback_id: string;
  type: FeedbackType;
  title: string;
  description: string;
  status: FeedbackStatus;
  impact: string;
  actor_user_id: string;
  actor_email: string | null;
  route_path: string | null;
  feature_area: string | null;
  session_id: string | null;
  metadata: Record<string, unknown> | null;
  admin_notes: string | null;
  admin_reply: string | null;
  admin_reply_at: string | null;
  admin_reason: string | null;
  assigned_to: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  sla_first_response_due_at: string | null;
  sla_resolution_due_at: string | null;
  sla_breached_first_response: boolean | null;
  sla_breached_resolution: boolean | null;
}

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: ReactNode }> = {
  nova: { label: FEEDBACK_LABELS.nova, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: <Clock size={12} /> },
  planejada: { label: FEEDBACK_LABELS.planejada, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', icon: <Eye size={12} /> },
  em_desenvolvimento: { label: FEEDBACK_LABELS.em_desenvolvimento, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: <Loader2 size={12} /> },
  concluida: { label: FEEDBACK_LABELS.concluida, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', icon: <CheckCircle2 size={12} /> },
  nao_planejada: { label: FEEDBACK_LABELS.nao_planejada, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800', icon: <X size={12} /> },
};

export const TYPE_CONFIG: Record<string, { label: string; icon: ReactNode }> = {
  melhoria: { label: 'Melhoria', icon: <Wand2 size={12} /> },
  nova_funcionalidade: { label: 'Nova Funcionalidade', icon: <PlusCircle size={12} /> },
  problema: { label: 'Problema', icon: <AlertTriangle size={12} /> },
  improvement: { label: 'Melhoria', icon: <Wand2 size={12} /> },
  feature_request: { label: 'Nova Funcionalidade', icon: <PlusCircle size={12} /> },
  ux_issue: { label: 'Problema', icon: <AlertTriangle size={12} /> },
};

export const IMPACT_MAP: Record<string, string> = { low: 'Baixo', medium: 'Médio', high: 'Alto', critical: 'Crítico' };
export const PIPELINE_STATUSES: FeedbackStatus[] = ['nova', 'planejada', 'em_desenvolvimento', 'concluida', 'nao_planejada'];

export function formatDate(value: string) {
  if (!value) return '-';
  return format(new Date(value), 'dd/MM/yy HH:mm', { locale: ptBR });
}

export function getSLAStatusBadge(dueAt: string | null, actualAt: string | null, breached: boolean | null, _type?: 'response' | 'resolution') {
  if (!dueAt) return { label: '-', color: 'text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' };
  if (actualAt) {
    return breached
      ? { label: 'Atrasado', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' }
      : { label: 'No Prazo', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' };
  }
  const timeLeftHours = differenceInHours(new Date(dueAt), new Date());
  if (timeLeftHours < 0) return { label: 'Estourado', color: 'text-red-600 font-bold', bg: 'bg-red-100 dark:bg-red-900/30' };
  if (timeLeftHours < 4) return { label: 'Em Risco', color: 'text-amber-600 font-bold', bg: 'bg-amber-100 dark:bg-amber-900/30' };
  return { label: 'Em dia', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' };
}

export const RESPONSE_TEMPLATES: Record<string, { label: string; text: string }[]> = {
  nova: [
    { label: 'Recebido padrão', text: 'Olá! Recebemos seu feedback e ele será analisado em breve pela nossa equipe de produto. Obrigado por contribuir!' },
    { label: 'Em Análise', text: 'Olá! Sua sugestão está em análise técnica para avaliarmos a viabilidade. Te avisaremos assim que tivermos novidades.' },
  ],
  planejada: [
    { label: 'Planejada', text: 'Ótima notícia! Sua sugestão foi aceita e entrou para o nosso backlog de desenvolvimento. Em breve estará disponível.' },
    { label: 'Já existe', text: 'Olá! Analisamos sua sugestão e percebemos que essa funcionalidade já existe ou será atendida por uma melhoria planejada.' },
  ],
  em_desenvolvimento: [{ label: 'Em Desenvolvimento', text: 'Olá! Sua sugestão já está sendo desenvolvida por nossa equipe. Avisaremos assim que for lançada.' }],
  concluida: [
    { label: 'Concluída', text: 'Olá! Temos o prazer de informar que sua solicitação foi atendida na nova atualização. Confira e nos diga o que achou!' },
    { label: 'Não Planejada / Recusada', text: 'Olá! Agradecemos a sugestão. No momento, decidimos não seguir com essa implementação por fugir do escopo atual, mas manteremos o registro para o futuro.' },
  ],
  nao_planejada: [{ label: 'Não planejada', text: 'Olá! Agradecemos a sugestão. No momento, decidimos não seguir com essa implementação por fugir do escopo atual, mas manteremos o registro para o futuro.' }],
};

export const DEFAULT_TEMPLATE_BY_STATUS: Record<string, string> = Object.fromEntries(
  Object.entries(RESPONSE_TEMPLATES).map(([status, templates]) => [status, templates[0].text]),
);
