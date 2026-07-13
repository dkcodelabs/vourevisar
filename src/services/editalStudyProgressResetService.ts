import { invokeUserRpc } from '@/services/userRpcService';

type ResetEditalStudyProgressResult = {
  ok?: boolean;
  reset_topics?: unknown;
  deleted_history?: unknown;
  deleted_sessions?: unknown;
};

export async function resetEditalStudyProgress({
  editalId,
  userId,
}: {
  editalId: string;
  userId: string;
}) {
  const result = await invokeUserRpc<ResetEditalStudyProgressResult | null>('reset_edital_study_progress', {
    p_user_id: userId,
    p_edital_id: editalId,
  });

  if (result?.ok === false) {
    throw new Error('Falha ao reiniciar progresso do edital.');
  }

  return {
    resetTopics: Number(result?.reset_topics || 0),
    deletedHistory: Number(result?.deleted_history || 0),
    deletedSessions: Number(result?.deleted_sessions || 0),
  };
}
