export const isWithinWithdrawalWindow = (
  nowMs: number,
  contractedAt: string,
  withdrawalDeadline: string,
) => {
  const startedAtMs = new Date(contractedAt).getTime();
  const deadlineMs = new Date(withdrawalDeadline).getTime();

  return Number.isFinite(nowMs) &&
    Number.isFinite(startedAtMs) &&
    Number.isFinite(deadlineMs) &&
    deadlineMs > startedAtMs &&
    nowMs >= startedAtMs &&
    nowMs <= deadlineMs;
};
