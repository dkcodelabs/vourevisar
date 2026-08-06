type CreatedEdital = {
  createdAt?: string | null;
};

function getCreatedTimestamp(value?: string | null): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

/** Sorts editais by creation time, newest first. Unknown dates stay at the end. */
export function compareEditaisByCreatedOrder(
  left: CreatedEdital,
  right: CreatedEdital,
): number {
  const leftTimestamp = getCreatedTimestamp(left.createdAt);
  const rightTimestamp = getCreatedTimestamp(right.createdAt);

  if (leftTimestamp === null && rightTimestamp === null) return 0;
  if (leftTimestamp === null) return 1;
  if (rightTimestamp === null) return -1;

  return rightTimestamp - leftTimestamp;
}
