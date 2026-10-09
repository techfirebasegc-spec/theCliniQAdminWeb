import { platformPost, platformRequest } from "./client";

export type EligibilityStatus = "NOT_APPLICABLE" | "PENDING_COMPLETION" | "ON_HOLD" | "ELIGIBLE" | "BLOCKED" | "RECONCILIATION_REQUIRED";
export type ManualPayoutStatus = "ELIGIBLE" | "APPROVED" | "PROCESSING" | "COMPLETED" | "FAILED" | "RECONCILIATION_REQUIRED";
export type BeneficiaryKind = "CLINIC" | "INDEPENDENT_DOCTOR";

export type EligibilityQueueItem = {
  id: string;
  componentId: string;
  appointmentId: string | null;
  beneficiaryKind: BeneficiaryKind;
  beneficiaryId: string;
  amountMinor: string | number;
  currency: string;
  status: EligibilityStatus;
  reasonCode: string;
  holdUntil: string | null;
  createdAt: string;
};

export type InitialEligibilityCandidate = {
  componentId: string;
  allocationId: string;
  appointmentId: string;
  completedAt: string;
  grossAmountMinor: string | number;
  providerPayableMinor: string | number;
  currency: string;
  beneficiaryKind: BeneficiaryKind;
  beneficiaryId: string;
  displayState: "NOT_EVALUATED";
};

export type ManualPayoutQueueItem = {
  id: string;
  componentId: string;
  appointmentId: string | null;
  beneficiaryKind: "INDEPENDENT_DOCTOR";
  beneficiaryId: string;
  amountMinor: string | number;
  currency: string;
  status: ManualPayoutStatus;
  createdAt: string;
  updatedAt: string;
};

export type ManualPayoutEvidence = {
  id: string;
  reference: string;
  payoutDate: string;
  amountMinor: string | number;
  currency: string;
  notes: string | null;
  createdAt: string;
};

export type ReconciliationQueueItem = EligibilityQueueItem & {
  payoutId: string | null;
  payoutStatus: ManualPayoutStatus | null;
};

type Money = { amountMinor: string | number; currency: string };
export type ManualPayoutDetail = {
  payout: Money & { id: string; componentId: string; status: ManualPayoutStatus; allocationSnapshotId: string; appointmentId: string; paymentId: string | null; createdAt: string; approvedAt: string | null; processingAt: string | null; completedAt: string | null; failedAt: string | null; failureReason: string | null; reconciliationReason: string | null };
  allocation: { snapshot: Money & { status: string; calculationBasis: string; createdAt: string }; providerPayable: Money & { componentType: "PROVIDER_PAYABLE"; settlementEligibilityStatus: EligibilityStatus; beneficiary: { kind: BeneficiaryKind; clinicId?: string; doctorProfileId?: string } } };
  appointment: { id: string; status: string; serviceOfferingId: string; startsAt: string; endsAt: string; delivery: { kind: "CLINIC_ASSIGNED_DOCTOR" | "INDEPENDENT_DOCTOR"; doctorProfileId: string; clinicServiceDoctorAssignmentId: string | null } | null; completion: { occurredAt: string; previousStatus: string | null; resultingStatus: string | null } | null };
  payment: { id: string; status: string; providerKey: string; providerPaymentId: string; verifiedAt: string | null; createdAt: string; updatedAt: string; intent: { id: string; status: string; providerKey: string; providerOrderId: string | null; createdAt: string; updatedAt: string } | null } | null;
  beneficiary: { kind: BeneficiaryKind; id: string; displayLabel: string | null };
  eligibilityEvents: EligibilityQueueItem[];
  latestEligibility: EligibilityQueueItem | null;
  reconciliationEligibilityEvents: EligibilityQueueItem[];
  evidence: ManualPayoutEvidence[];
  refunds: Array<Money & { id: string; providerKey: string; providerRefundId: string | null; status: string; createdAt: string; updatedAt: string; attempts: Array<{ id: string; attemptNumber: number; status: string; providerKey: string; providerRefundId: string | null; failureCode: string | null; reconciliationRequiredAt: string | null; claimedAt: string; completedAt: string | null; createdAt: string }> }>;
  cancellation: { decisions: Array<{ id: string; previousAppointmentStatus: string; resultingAppointmentStatus: string; reasonCategory: string; cancellationAt: string; refundOutcome: string; refundAmountMinor: string | number; currency: string; settlementConsequence: string; createdAt: string }>; consequences: Array<{ id: string; consequenceStatus: string; amountMinor: string | number; currency: string; settlementConsequence: string; createdAt: string }> };
  reconciliationRecords: Array<{ id: string; status: string; providerKey: string; providerWebhookEventId: string | null; internalEntityType: string; createdAt: string; resolvedAt: string | null }>;
};

export type ManualPayoutAction = "approve" | "processing" | "complete" | "fail" | "retry";

type QueueQuery = { limit?: number; offset?: number };
export type EligibilityQuery = QueueQuery & { status?: EligibilityStatus; beneficiaryKind?: BeneficiaryKind };
export type ManualPayoutQuery = QueueQuery & { status?: ManualPayoutStatus; beneficiaryKind?: "INDEPENDENT_DOCTOR" };

function queryString(query: Record<string, string | number | undefined>) {
  const parameters = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined) parameters.set(key, String(value));
  return parameters.size ? `?${parameters.toString()}` : "";
}

export function listFinancialEligibility(query: EligibilityQuery = {}) {
  return platformRequest<{ items: EligibilityQueueItem[] }>(`/v1/platform/financial/eligibility${queryString(query)}`);
}

export function listInitialEligibilityCandidates(query: QueueQuery = {}) {
  return platformRequest<{ items: InitialEligibilityCandidate[] }>(`/v1/platform/financial/provider-payables/eligibility-candidates${queryString(query)}`);
}

export function evaluateFinancialEligibility(componentId: string) {
  return platformPost<{ eligibility: { id: string; componentId: string; status: EligibilityStatus; reasonCode: string; createdAt: string } }>(`/v1/platform/financial/provider-payables/${encodeURIComponent(componentId)}/evaluate`);
}

export function listManualPayouts(query: ManualPayoutQuery = {}) {
  return platformRequest<{ items: ManualPayoutQueueItem[] }>(`/v1/platform/financial/manual-payouts${queryString(query)}`);
}

export function createManualPayout(componentId: string, idempotencyKey: string) {
  return platformPost<{ payout: { id: string; componentId: string; status: ManualPayoutStatus; amountMinor: string | number; currency: string } }>(`/v1/platform/financial/provider-payables/${encodeURIComponent(componentId)}/payouts`, { idempotencyKey });
}

export function getManualPayoutDetail(payoutId: string) {
  return platformRequest<{ detail: ManualPayoutDetail }>(`/v1/platform/financial/manual-payouts/${encodeURIComponent(payoutId)}`);
}

export function actionManualPayout(payoutId: string, action: ManualPayoutAction, options: { reason?: string } = {}) {
  return platformPost<{ payout: { id: string; componentId: string; status: ManualPayoutStatus; amountMinor: string | number; currency: string } }>(`/v1/platform/financial/manual-payouts/${encodeURIComponent(payoutId)}/${action}`, options.reason ? { reason: options.reason } : {});
}

export function listManualPayoutEvidence(payoutId: string) {
  return platformRequest<{ items: ManualPayoutEvidence[] }>(`/v1/platform/financial/manual-payouts/${encodeURIComponent(payoutId)}/evidence`);
}

export function recordManualPayoutEvidence(payoutId: string, evidence: { idempotencyKey: string; reference: string; payoutDate: string; notes?: string }) {
  return platformPost<{ evidence: ManualPayoutEvidence }>(`/v1/platform/financial/manual-payouts/${encodeURIComponent(payoutId)}/evidence`, evidence);
}

export function listFinancialReconciliation(query: QueueQuery = {}) {
  return platformRequest<{ items: ReconciliationQueueItem[] }>(`/v1/platform/financial/reconciliation${queryString(query)}`);
}
