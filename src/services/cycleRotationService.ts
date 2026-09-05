import { invokeUserRpc } from '@/services/userRpcService';
import type { UserCycle } from '@/types';

export type AdvanceCycleRotationResult = {
  ok: boolean;
  already_studied: boolean;
  rotation_completed: boolean;
  completed_cycle_number: number | null;
  next_cycle_number: number;
  snapshot_id: string | null;
  cycle: UserCycle;
};

export async function advanceCycleRotation(params: {
  userId: string;
  userCycleId: string;
  subjectId: string;
  expectedCycleNumber: number;
}) {
  return invokeUserRpc<AdvanceCycleRotationResult>('advance_cycle_rotation', {
    p_user_id: params.userId,
    p_user_cycle_id: params.userCycleId,
    p_subject_id: params.subjectId,
    p_expected_cycle_number: params.expectedCycleNumber,
  });
}
