export type BillingRefundReconciliationStatus =
  | "pending"
  | "succeeded"
  | "failed"
  | "manual_review";

export const resolveBillingRefundReconciliationStatus = ({
  refundFound,
  refundMatches,
  cancellationSucceeded,
  providerStatus,
}: {
  refundFound: boolean;
  refundMatches: boolean;
  cancellationSucceeded: boolean;
  providerStatus: string | null;
}): BillingRefundReconciliationStatus => {
  if (!refundFound || !refundMatches || !cancellationSucceeded) return "manual_review";
  if (providerStatus === "succeeded") return "succeeded";
  if (providerStatus === "failed" || providerStatus === "canceled") return "failed";
  return "pending";
};
