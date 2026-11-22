import { platformDownload, platformPost, platformRequest } from "./client";

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
  beneficiaryKind: BeneficiaryKind;
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
export type ManualPayoutQuery = QueueQuery & { status?: ManualPayoutStatus; beneficiaryKind?: BeneficiaryKind };

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

// ==========================================
// UNIFIED FINANCIAL ARCHITECTURE TYPES & API
// ==========================================

export type FinancialDashboardMetrics = {
  period?: { from: string | null; to: string | null };
  grossCollections: { amountMinor: string; formatted: string };
  platformRevenue: { amountMinor: string; formatted: string };
  providerPayablesOutstanding: { amountMinor: string; formatted: string };
  paidOutTotal: { amountMinor: string; formatted: string };
  channelBreakdown: {
    onlineAppointments: { count: number; grossMinor: string; commissionMinor: string; payableMinor: string };
    offlineOpd: { count: number; grossMinor: string; commissionMinor: string; clinicSettlementMinor: string };
    subscriptions: { activeCount: number; totalRevenueMinor: string; mrrMinor: string };
    payouts: { count: number; totalMinor: string };
  };
  currency?: string;
  grossCollectionsMinor?: string;
  platformRevenueMinor?: string;
  providerPayablesOutstandingMinor?: string;
  payoutsCompletedMinor?: string;
  subscriptionRevenueMinor?: string;
  offlineOpdCollectionsMinor?: string;
  onlineConsultationsVolumeMinor?: string;
  refundsProcessedMinor?: string;
  unreconciledCount?: number;
  channels?: {
    onlineAppointments?: { count: number; grossMinor: string; platformCommissionMinor: string; providerPayableMinor: string };
    offlineOpd?: { billCount: number; grossMinor: string; platformFeeMinor: string; clinicSettlementMinor: string };
    subscriptions?: { activeSubscribers: number; totalPaymentsCount: number; revenueMinor: string; opdRevenueMinor: string; ipdRevenueMinor: string };
    payouts?: { completedCount: number; completedAmountMinor: string; pendingCount: number; pendingAmountMinor: string };
  };
};

export type UnifiedTransactionItem = {
  id: string;
  channel: "ONLINE_APPOINTMENT" | "OFFLINE_OPD" | "SUBSCRIPTION" | "PAYOUT" | "MANUAL_PAYOUT" | "REFUND";
  referenceNumber: string;
  appointmentId: string | null;
  clinicId: string | null;
  patientName: string | null;
  doctorName: string | null;
  amountMinor: string;
  currency: string;
  direction: "INFLOW" | "OUTFLOW";
  status: string;
  timestamp: string;
  paymentMethod: string | null;
  occurredAt?: string;
  description?: string;
  grossAmountMinor?: string;
  platformFeeMinor?: string;
  providerAmountMinor?: string;
  reference?: string;
  counterparty?: string;
};

export type AdminSubscriptionItem = {
  id: string;
  subscriberType: "CLINIC" | "INDEPENDENT_DOCTOR" | "DOCTOR";
  subscriberId: string;
  subscriberName: string;
  planCode: string;
  planName?: string;
  planVersion?: number;
  productKey?: string;
  productName?: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  billingCadence?: string;
  billingCycle: string;
  amountMinor: string;
  baseAmountMinor?: string;
  gstAmountMinor?: string;
  totalAmountMinor?: string;
  paymentReference?: string | null;
  invoiceNumber?: string | null;
  purchaseDate?: string;
  currency: string;
  lastPaymentDate: string | null;
  subscriptionId?: string;
  subjectKind?: "CLINIC" | "DOCTOR";
  subjectId?: string;
  subjectDisplayName?: string;
  startsAt?: string;
  endsAt?: string | null;
  graceEndsAt?: string | null;
  activationSource?: string;
  priceMinor?: string;
  lastPaymentReference?: string | null;
};

export type AdminSubscriptionDetail = AdminSubscriptionItem & {
  purchases: Array<{
    id: string;
    purchaseKind: string;
    status: string;
    amountMinor: string;
    currency: string;
    createdAt: string;
    paymentId?: string | null;
    paymentStatus?: string | null;
  }>;
  lifecycleEvents: Array<{
    id: string;
    eventType: string;
    occurredAt: string;
    payload?: unknown;
  }>;
  ledgerTransactions: Array<{
    id: string;
    status: string;
    description: string;
    postedAt: string | null;
    entries: Array<{
      accountCode: string;
      direction: string;
      amountMinor: string;
    }>;
  }>;
};

export type AdminOpdBillItem = {
  id: string;
  clinicId: string;
  clinicName?: string;
  clinicDisplayName?: string;
  appointmentId: string | null;
  billNumber: string;
  patientName: string | null;
  doctorName: string | null;
  grossAmountMinor: string;
  discountAmountMinor: string;
  netPayableMinor: string;
  commissionAmountMinor?: string;
  commissionGstAmountMinor?: string;
  platformFeeTotalMinor: string;
  clinicSettlementMinor: string;
  status: string;
  paymentCount?: number;
  createdAt: string;
};

export type ProviderPayableSummary = {
  beneficiaryKind: BeneficiaryKind;
  beneficiaryId: string;
  displayName: string;
  currency: string;
  totalGrossMinor: string;
  totalPlatformCommissionMinor: string;
  totalPayableMinor: string;
  totalPaidMinor: string;
  outstandingMinor: string;
  completedAppointmentsCount: number;
  pendingAppointmentsCount: number;
};

export type SettlementStatementCandidateItem = {
  allocationComponentId: string;
  appointmentId: string;
  operationalPatientId: string | null;
  patientName: string | null;
  doctorName: string | null;
  serviceDate: string;
  grossAmountMinor: string;
  platformCommissionMinor: string;
  providerPayableMinor: string;
  currency: string;
  componentId?: string;
  allocationSnapshotId?: string;
  appointmentStartsAt?: string;
  completedAt?: string;
  serviceName?: string;
  patientDisplayName?: string | null;
};

export type SettlementStatementItem = {
  id: string;
  statementId: string;
  allocationComponentId: string;
  appointmentId: string | null;
  operationalPatientId: string | null;
  patientName: string | null;
  doctorName: string | null;
  serviceDate: string;
  grossAmountMinor?: string;
  platformCommissionMinor?: string;
  amountMinor: string;
  currency: string;
  notes: string | null;
  createdAt: string;
  financialAllocationComponentId?: string;
  serviceName?: string;
  appointmentStartsAt?: string;
};

export type SettlementStatement = {
  id: string;
  statementNumber: string;
  beneficiaryKind: BeneficiaryKind;
  beneficiaryId: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  grossAmountMinor: string;
  platformCommissionMinor: string;
  netPayableMinor: string;
  itemCount: number;
  status: "DRAFT" | "GENERATED" | "APPROVED" | "PAID" | "VOID" | "CANCELLED";
  generatedByAccountId: string;
  approvedByAccountId: string | null;
  paidByAccountId?: string | null;
  payoutReference: string | null;
  paidAt: string | null;
  ledgerTransactionId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items?: SettlementStatementItem[];
  beneficiaryClinicId?: string | null;
  beneficiaryDoctorProfileId?: string | null;
  beneficiaryDisplayName?: string;
};

export function getFinancialDashboardMetrics(query: { from?: string; to?: string } = {}) {
  return platformRequest<{ metrics: FinancialDashboardMetrics }>(`/v1/platform/financial/dashboard${queryString(query)}`);
}

export function listUnifiedTransactions(query: { limit?: number; offset?: number; channel?: string; search?: string; from?: string; to?: string } = {}) {
  return platformRequest<{ items: UnifiedTransactionItem[]; total: number }>(`/v1/platform/financial/transactions${queryString(query)}`);
}

export function listAdminSubscriptions(query: { limit?: number; offset?: number; status?: string; search?: string; subscriberType?: string; productKey?: string } = {}) {
  return platformRequest<{ items: AdminSubscriptionItem[]; total: number }>(`/v1/platform/financial/subscriptions${queryString(query)}`);
}

export function getAdminSubscriptionDetail(subscriptionId: string) {
  return platformRequest<{ subscription: AdminSubscriptionDetail }>(`/v1/platform/financial/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

export function listAdminOpdBills(query: { limit?: number; offset?: number; clinicId?: string; status?: string } = {}) {
  return platformRequest<{ items: AdminOpdBillItem[]; total: number }>(`/v1/platform/financial/opd-bills${queryString(query)}`);
}

export function listProviderPayables() {
  return platformRequest<{ items: ProviderPayableSummary[] }>('/v1/platform/financial/payables');
}

export function listSettlementStatementCandidates(query: { beneficiaryKind: BeneficiaryKind; beneficiaryId: string; periodStart?: string; periodEnd?: string }) {
  return platformRequest<{ items: SettlementStatementCandidateItem[] }>(`/v1/platform/financial/settlement-statements/candidates${queryString(query)}`);
}

export function generateSettlementStatement(body: { beneficiaryKind: BeneficiaryKind; beneficiaryId: string; periodStart: string; periodEnd: string; notes?: string }) {
  return platformPost<{ statement: SettlementStatement }>(`/v1/platform/financial/settlement-statements`, body);
}

export function listSettlementStatements(query: { limit?: number; offset?: number; status?: string; beneficiaryKind?: string; beneficiaryId?: string } = {}) {
  return platformRequest<{ items: SettlementStatement[]; total: number }>(`/v1/platform/financial/settlement-statements${queryString(query)}`);
}

export function getSettlementStatementDetail(statementId: string) {
  return platformRequest<{ statement: SettlementStatement }>(`/v1/platform/financial/settlement-statements/${encodeURIComponent(statementId)}`);
}

export function approveSettlementStatement(statementId: string) {
  return platformPost<{ statement: SettlementStatement }>(`/v1/platform/financial/settlement-statements/${encodeURIComponent(statementId)}/approve`);
}

export function recordSettlementStatementPayment(statementId: string, body: { payoutReference: string; notes?: string }) {
  return platformPost<{ statement: SettlementStatement }>(`/v1/platform/financial/settlement-statements/${encodeURIComponent(statementId)}/pay`, body);
}

export function downloadSettlementStatementPdf(statementId: string) {
  return platformDownload(`/v1/platform/financial/settlement-statements/${encodeURIComponent(statementId)}/pdf`);
}
