import { platformDelete, platformDownload, platformPatch, platformPost, platformPut, platformRequest } from "./client";

export type HelpArticle = { id: string; slug: string; title: string; category: string; summary: string; prerequisites: string; steps: string[]; troubleshooting: string[]; links: Array<{ label: string; href: string }>; implementationStatus: "Implemented" | "Partial" | "Planned"; sourceReferences: string[]; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; published: unknown | null; lastReviewedAt: string | null };
export type HelpArticleInput = Omit<HelpArticle, "id" | "status" | "published" | "lastReviewedAt" | "createdAt" | "updatedAt"> & { lastReviewedAt?: string | null };
export function listHelpArticles() { return platformRequest<{ items: HelpArticle[] }>("/v1/platform/help/articles"); }
export function createHelpArticle(value: HelpArticleInput) { return platformPost<{ article: HelpArticle }>("/v1/platform/help/articles", value); }
export function updateHelpArticle(id: string, value: HelpArticleInput) { return platformRequest<{ article: HelpArticle }>(`/v1/platform/help/articles/${encodeURIComponent(id)}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(value) }); }
export function publishHelpArticle(id: string) { return platformPost<{ article: HelpArticle }>(`/v1/platform/help/articles/${encodeURIComponent(id)}/publish`, {}); }
export function archiveHelpArticle(id: string) { return platformPost<void>(`/v1/platform/help/articles/${encodeURIComponent(id)}/archive`, {}); }

export type PlatformServiceSummary = { id: string; name: string; status: string; versionStatus: string | null; priceAmountMinor: string | null; currency: string | null; availabilityStatus: string | null; exposureStatus: string | null };
export type PlatformClinicAssociation = { id: string; displayName: string; status: string; connectionStatus: string };
export type PlatformDoctorAssociation = { id: string; displayName: string | null; status: string; professionalVerificationStatus: string; connectionStatus: string };
export type PlatformClinic = { id: string; tenantId: string; displayName: string; legalName: string; clinicStatus: string; tenantStatus: string; ownerEmail: string | null; ownerMembershipStatus: string | null; invitationStatus: string | null; publicSlug: string | null; about: string | null; publicEmail: string | null; publicPhone: string | null; address: { line1: string; line2: string | null; locality: string; region: string; postalCode: string; countryCode: string } | null; operatingHours: Array<{ weekday: number; opensAt: string; closesAt: string }>; doctors: PlatformDoctorAssociation[]; services: PlatformServiceSummary[]; createdAt: string; updatedAt: string };
export type PlatformDoctor = { id: string; accountId: string; email: string | null; displayName: string | null; status: string; professionalVerificationStatus: string; clinicNames: string[]; accountStatus: string; professionalTitle: string | null; shortIntroduction: string | null; biography: string | null; yearsExperience: number | null; specialization: string | null; mobileNumber: string | null; publicSlug: string | null; createdByClinicId: string | null; qualifications: Array<{ credential: string; institution: string; completionYear: number | null }>; languages: string[]; clinics: PlatformClinicAssociation[]; services: PlatformServiceSummary[]; createdAt: string; updatedAt: string };
export type PlatformDoctorInvitation = { id: string; email: string; displayName: string | null; status: string; createdAt: string; expiresAt: string; revokedAt: string | null; acceptedAt: string | null };
export type OwnerInvitation = { id: string; tenantId: string; email: string | null; status: string; createdAt: string; expiresAt: string; acceptedAt: string | null; revokedAt: string | null };
export type PlatformMetrics = { clinics: number; doctors: number; patients: number; activeInvitations: number; upcomingAppointments: number };
export type PublicDiscoveryControl = { subjectId: string; subjectKind: "CLINIC" | "DOCTOR"; status: "NOT_READY" | "NOT_PUBLISHED" | "PUBLISHED" | "REVOKED"; publishedExposureCount: number; reason: string | null };
export type VerificationEvidence = { id: string; originalFilename: string; contentType: string; byteSize: number; status: string };
export type DoctorVerificationHistoryEntry = {
  id: string;
  submissionId: string;
  doctorProfileId: string;
  eventType:
    | "SUBMITTED"
    | "RESUBMITTED"
    | "AUTO_APPROVAL_SCHEDULED"
    | "HELD_FOR_MANUAL_REVIEW"
    | "APPROVED_MANUAL"
    | "APPROVED_AUTO"
    | "REJECTED";
  actorAccountId: string | null;
  actorKind: "DOCTOR" | "PLATFORM_ADMIN" | "SYSTEM_POLICY";
  reason: string | null;
  occurredAt: string;
};
export type DoctorVerificationSubmission = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  registrationAuthority: string;
  registrationJurisdiction: string;
  registrationIdentifier: string;
  submittedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  documentFileIds?: string[];
  approvalSource?: "ADMIN_MANUAL" | "AUTO_POLICY" | null;
  autoApprovalEligible?: boolean;
  autoApprovalDueAt?: string | null;
  manualReviewReason?: string | null;
};
export type DoctorApplication = { id: string; doctorProfileId: string; doctorAccountId: string; displayName: string | null; profileStatus: string; professionalVerificationStatus: string; status: "PENDING" | "APPROVED" | "REJECTED"; submittedAt: string; reviewedAt: string | null; reviewerAccountId: string | null; rejectionReason: string | null };
export type ClinicApplication = { id: string; applicantAccountId: string; legalName: string; clinicName: string; ownerEmail: string; status: "PENDING" | "APPROVED" | "REJECTED"; submittedAt: string; reviewerAccountId: string | null; reviewedAt: string | null; rejectionReason: string | null };
export type ClinicCreatedDoctor = { id: string; clinicId: string; doctorProfileId: string; accountId: string; displayName: string; email: string; mobileNumber: string; dateOfBirth: string; sex: "FEMALE" | "MALE" | "NON_BINARY" | "NOT_SPECIFIED"; specialization: string; status: "PENDING" | "APPROVED" | "REJECTED"; credentialStatus: "PENDING_SETUP" | "READY" | "CLAIMED"; rejectionReason: string | null };
export type ClinicCreatedDoctorEmailOperation = { id: string; operationType: "FIREBASE_PASSWORD_RESET" | "RESEND_ACTIVATION_LINK"; status: "PENDING" | "PROCESSING" | "RETRY_SCHEDULED" | "ACCEPTED" | "FAILED"; attemptCount: number; nextAttemptAt: string; lastAttemptAt: string | null; lastOutcomeAt: string | null; acceptedAt: string | null; providerMessageId: string | null; lastErrorCode: string | null; retryEligible: boolean };
export type CreatedPlatformAdmin = { accountId: string; firebaseUid: string };
export type PresentationTemplate = { id: string; key: string; displayName: string; description: string; status: string; versions: Array<{ version: number; rendererKey: string; status: string; designTokenSchema: Record<string, unknown>; layoutOptionSchema: Record<string, unknown>; sectionSchema: Record<string, unknown>; assetPolicy: Record<string, unknown>; defaultConfiguration: Record<string, unknown> }> };
export type PresentationCapability = { key: string; displayName: string; description: string; defaultEnabled: boolean; status: string };
export type PresentationEntitlement = { id: string; subject: { kind: "DOCTOR"; doctorProfileId: string } | { kind: "CLINIC"; clinicId: string }; subjectLabel: string; capabilityKey: string; effect: "GRANT" | "DENY"; status: "ACTIVE" | "REVOKED"; externalReference: string | null; effectiveEnabled: boolean; effectiveSource: "EXPLICIT_DENY" | "EXPLICIT_GRANT" | "PLATFORM_DEFAULT" | "EFFECTIVE_DENY" };
export type ProfessionalClassification = { id: string; code: string; displayName: string; status: "ACTIVE" | "INACTIVE" };
export type ProfessionalClassificationAssignment = { id: string; doctorProfileId: string; classification: ProfessionalClassification; assignedAt: string; assignedByAccountId: string; revokedAt: string | null; revokedByAccountId: string | null; reason: string };
export function listProfessionalClassifications() { return platformRequest<{ items: ProfessionalClassification[] }>("/v1/platform/professional-classifications"); }
export function listDoctorProfessionalClassifications(doctorId: string) { return platformRequest<{ items: ProfessionalClassificationAssignment[] }>(`/v1/platform/doctors/${encodeURIComponent(doctorId)}/professional-classifications`); }
export function assignProfessionalClassification(doctorId: string, classificationCode: string, reason: string) { return platformPost<{ assignment: ProfessionalClassificationAssignment }>(`/v1/platform/doctors/${encodeURIComponent(doctorId)}/professional-classifications`, { classificationCode, reason }); }
export function revokeProfessionalClassification(doctorId: string, classificationCode: string, reason: string) { return platformPost<{ assignment: ProfessionalClassificationAssignment }>(`/v1/platform/doctors/${encodeURIComponent(doctorId)}/professional-classifications/${encodeURIComponent(classificationCode)}/revoke`, { reason }); }
export type TransactionChannel =
  | "ONLINE_OPD"
  | "OFFLINE_OPD"
  | "ONLINE_IPD"
  | "OFFLINE_IPD"
  | "OPD_SUBSCRIPTION"
  | "IPD_SUBSCRIPTION"
  | "DOCTOR_SUBSCRIPTION"
  | "OTHER_FINANCIAL_SERVICE"
  | "ALL";

export type CommercialRuleVersion = {
  id: string;
  commercialRuleId: string;
  name?: string;
  description?: string;
  versionNumber: number;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "RETIRED";
  ruleType: string;
  channel?: TransactionChannel;
  beneficiaryType?: "PLATFORM" | "CLINIC" | "INDEPENDENT_DOCTOR" | "PARTNER";
  priority: number;
  effectiveFrom: string;
  effectiveUntil?: string;
  changeReason?: string | null;
  calculationBasis: string;
  processingFeeBearer: string;
  policy: {
    percentageBasisPoints?: string;
    fixedAmountMinor?: string;
    platformShareBasisPoints?: string;
    clinicShareBasisPoints?: string;
    doctorShareBasisPoints?: string;
    partnerShareBasisPoints?: string;
    gstRateBps?: number | string;
    taxType?: string;
    isInclusive?: boolean;
    hsnSacCode?: string;
    registrationNumber?: string;
    feeBearer?: string;
  };
  scopes: Array<{ kind: string; value?: string }>;
  submittedByAccountId?: string | null;
  submittedAt?: string | null;
  approvedByAccountId?: string | null;
  approvedAt?: string | null;
  supersedesVersionId?: string | null;
  createdAt?: string;
};

export type CommercialOfferingPreview = {
  offeringId: string;
  offeringName: string;
  result: "COVERED" | "UNCOVERED" | "AMBIGUOUS" | "INVALID";
  selectedVersionId?: string;
};

export type CommercialPartner = {
  id: string;
  name: string;
  partnerType: "REFERRAL" | "AFFILIATE" | "MARKETING" | "CORPORATE" | "HEALTHCARE_NETWORK";
  contactEmail: string;
  status: "DRAFT" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  settlementFrequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "MANUAL";
  minimumPayoutThresholdMinor: string;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PaymentGatewayConfig = {
  id: string;
  providerKey: string;
  environment: "TEST" | "LIVE";
  merchantAccountId: string;
  isActive: boolean;
  supportedPaymentModes: string[];
  currency: string;
  autoCapture: boolean;
  webhookUrl: string | null;
  webhookStatus: "HEALTHY" | "DEGRADED" | "UNCONFIGURED";
  keyId: string;
  keySecretMasked: string;
  lastRotatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FinancialGovernanceOverview = {
  totalActiveConfigurations: number;
  approvedVersions: number;
  pendingApprovals: number;
  upcomingChanges: number;
  expiredRules: number;
  uncoveredOfferings: number;
  ambiguousOfferings: number;
  lastModifiedAt: string | null;
  lastModifiedBy: string | null;
  nextScheduledChangeAt: string | null;
  channels: Record<string, { activeRulesCount: number; defaultRateBps?: number; defaultFixedMinor?: string }>;
};

export type CommercialSimulationResult = {
  channel: string;
  grossAmountMinor: string;
  discountAmountMinor: string;
  netPayableMinor: string;
  platformCommissionMinor: string;
  commissionRateBps: number;
  commissionCalculationBasis: string;
  providerPayableMinor: string;
  partnerShareMinor: string;
  taxAmountMinor: string;
  taxRateBps: number;
  taxType: string;
  gatewayFeeAmountMinor: string;
  gatewayGstAmountMinor: string;
  gatewayFeeBearer: string;
  estimatedNetSettlementMinor: string;
  resolutionTrace: {
    matchedRuleId: string;
    matchedVersionId: string;
    precedenceLevel: number;
    precedenceDescription: string;
  };
};
export type SubscriptionDefaultConfiguration = { id:string; productKey:"OFFLINE_OPD"|"IPD_MANAGEMENT"; subjectKind:"CLINIC"|"DOCTOR"; planId:string; planName:string; planVersionId:string; versionNumber:number; effectiveFrom:string; effectiveUntil:string|null; opdGraceDays:number; configuredByAccountId:string|null; createdAt:string };
export type SubscriptionProductKey = "OFFLINE_OPD" | "IPD_MANAGEMENT";
export type SubscriptionCatalogueProduct = { id:string; key:SubscriptionProductKey; displayName:string; status:string };
export type SubscriptionPlan = { id:string; productId:string; code:string; displayName:string; status:"DRAFT"|"ACTIVE"|"RETIRED"; createdAt:string };
export type SubscriptionPlanEntitlement = { key:string; enabled:boolean; value:Record<string,unknown> };
export type SubscriptionPlanVersion = { id:string; planId:string; versionNumber:number; status:"DRAFT"|"PUBLISHED"|"RETIRED"; effectiveFrom:string; effectiveUntil:string|null; currency:string; priceMinor:string; billingCadence:"MONTHLY"|"ANNUAL"|"NONE"; freeTrialEnabled:boolean; entitlements:SubscriptionPlanEntitlement[]; createdAt:string };

export function platformDashboard() { return platformRequest<PlatformMetrics>("/v1/platform/dashboard"); }
export function createPlatformAdmin(email: string) { return platformPost<CreatedPlatformAdmin>("/v1/platform/admins", { email }); }
export function requestExistingPlatformAdminActivationEmail(email: string) { return platformPost<{ accountId: string }>("/v1/platform/admins/activation-email", { email }); }
export function requestPlatformAdminActivationEmail(id: string) { return platformPost<void>(`/v1/platform/admins/${encodeURIComponent(id)}/activation-email`); }
export function recordPlatformAdminActivationEmail(id: string, outcome: "REQUESTED" | "FAILED") { return platformPost<void>(`/v1/platform/admins/${encodeURIComponent(id)}/activation-email/outcome`, { outcome }); }
export function listPlatformClinics() { return platformRequest<{ items: PlatformClinic[] }>("/v1/platform/clinics"); }
export function getPlatformClinic(id: string) { return platformRequest<{ clinic: PlatformClinic }>(`/v1/platform/clinics/${encodeURIComponent(id)}`); }
export function activatePlatformClinic(id: string) { return platformPost<{ clinic: PlatformClinic }>(`/v1/platform/clinics/${encodeURIComponent(id)}/activate`); }
export function grantClinicPrescriptionWorkflow(id: string, reason: string) { return platformPost<{ capability: { id: string; clinicId: string; status: string } }>(`/v1/platform/clinics/${encodeURIComponent(id)}/prescription-workflow/grant`, { reason }); }
export function revokeClinicPrescriptionWorkflow(id: string, reason: string) { return platformPost<{ capability: { clinicId: string; status: string } }>(`/v1/platform/clinics/${encodeURIComponent(id)}/prescription-workflow/revoke`, { reason }); }
export function listPlatformDoctors() { return platformRequest<{ items: PlatformDoctor[] }>("/v1/platform/doctors"); }
export function getPlatformDoctor(id: string) { return platformRequest<{ doctor: PlatformDoctor }>(`/v1/platform/doctors/${encodeURIComponent(id)}`); }
export function listOwnerInvitations() { return platformRequest<{ items: OwnerInvitation[] }>("/v1/platform/tenant-invitations"); }
export function resendOwnerInvitation(id: string) { return platformPost<{ invitation: OwnerInvitation; invitationUrl: string }>(`/v1/platform/tenant-invitations/${encodeURIComponent(id)}/resend`, {}); }
export function revokeOwnerInvitation(id: string) { return platformPost<void>(`/v1/platform/tenant-invitations/${encodeURIComponent(id)}/revoke`); }
export function listDoctorInvitations() { return platformRequest<{ items: PlatformDoctorInvitation[] }>("/v1/platform/doctor-invitations"); }
export function inviteDoctor(value: { email: string; displayName?: string }) { return platformPost<{ invitation: PlatformDoctorInvitation; emailStatus: "ACCEPTED_BY_PROVIDER" | "FAILED" }>("/v1/platform/doctor-invitations", value); }
export function resendDoctorInvitation(id: string) { return platformPost<{ invitation: PlatformDoctorInvitation; emailStatus: "ACCEPTED_BY_PROVIDER" | "FAILED" }>(`/v1/platform/doctor-invitations/${encodeURIComponent(id)}/resend`); }
export function revokeDoctorInvitation(id: string) { return platformPost<void>(`/v1/platform/doctor-invitations/${encodeURIComponent(id)}/revoke`); }
export function getClinicPublicDiscovery(id: string) { return platformRequest<{ publicDiscovery: PublicDiscoveryControl }>(`/v1/platform/clinics/${encodeURIComponent(id)}/public-discovery`); }
export function publishClinicPublicDiscovery(id: string) { return platformPost<{ publicDiscovery: PublicDiscoveryControl }>(`/v1/platform/clinics/${encodeURIComponent(id)}/public-discovery/publish`); }
export function revokeClinicPublicDiscovery(id: string) { return platformPost<{ publicDiscovery: PublicDiscoveryControl }>(`/v1/platform/clinics/${encodeURIComponent(id)}/public-discovery/revoke`); }
export function getDoctorPublicDiscovery(id: string) { return platformRequest<{ publicDiscovery: PublicDiscoveryControl }>(`/v1/platform/doctors/${encodeURIComponent(id)}/public-discovery`); }
export function publishDoctorPublicDiscovery(id: string) { return platformPost<{ publicDiscovery: PublicDiscoveryControl }>(`/v1/platform/doctors/${encodeURIComponent(id)}/public-discovery/publish`); }
export function revokeDoctorPublicDiscovery(id: string) { return platformPost<{ publicDiscovery: PublicDiscoveryControl }>(`/v1/platform/doctors/${encodeURIComponent(id)}/public-discovery/revoke`); }
export function listDoctorVerificationSubmissions(id: string) { return platformRequest<{ items: DoctorVerificationSubmission[] }>(`/v1/platform/doctors/${encodeURIComponent(id)}/verification-submissions`); }
export function listDoctorVerificationHistory(id: string) { return platformRequest<{ items: DoctorVerificationHistoryEntry[] }>(`/v1/platform/doctors/${encodeURIComponent(id)}/verification-history`); }
export function listVerificationEvidence(submissionId: string) { return platformRequest<{ items: VerificationEvidence[] }>(`/v1/platform/doctor-verification-submissions/${encodeURIComponent(submissionId)}/evidence`); }
export function downloadVerificationEvidence(submissionId: string, fileId: string) { return platformDownload(`/v1/platform/doctor-verification-submissions/${encodeURIComponent(submissionId)}/evidence/${encodeURIComponent(fileId)}/download`); }
export function approveDoctorVerification(submissionId: string) { return platformPost(`/v1/platform/doctor-verification-submissions/${encodeURIComponent(submissionId)}/approve`); }
export function rejectDoctorVerification(submissionId: string, rejectionReason: string) { return platformPost(`/v1/platform/doctor-verification-submissions/${encodeURIComponent(submissionId)}/reject`, { rejectionReason }); }
export function listDoctorApplications(query?: { status?: string }) { const q = query?.status ? `?status=${encodeURIComponent(query.status)}` : ""; return platformRequest<{ items: DoctorApplication[] }>(`/v1/platform/doctor-applications${q}`); }
export function getDoctorApplication(id: string) { return platformRequest<{ application: DoctorApplication }>(`/v1/platform/doctor-applications/${encodeURIComponent(id)}`); }
export function approveDoctorApplication(id: string) { return platformPost<{ application: DoctorApplication }>(`/v1/platform/doctor-applications/${encodeURIComponent(id)}/approve`); }
export function rejectDoctorApplication(id: string, rejectionReason: string) { return platformPost<{ application: DoctorApplication }>(`/v1/platform/doctor-applications/${encodeURIComponent(id)}/reject`, { rejectionReason }); }
export function listClinicApplications(query?: { status?: string }) { const q = query?.status ? `?status=${encodeURIComponent(query.status)}` : ""; return platformRequest<{ items: ClinicApplication[] }>(`/v1/platform/clinic-applications${q}`); }
export function getClinicApplication(id: string) { return platformRequest<{ application: ClinicApplication }>(`/v1/platform/clinic-applications/${encodeURIComponent(id)}`); }
export function approveClinicApplication(id: string) { return platformPost<{ application: ClinicApplication }>(`/v1/platform/clinic-applications/${encodeURIComponent(id)}/approve`); }
export function rejectClinicApplication(id: string, rejectionReason: string) { return platformPost<{ application: ClinicApplication }>(`/v1/platform/clinic-applications/${encodeURIComponent(id)}/reject`, { rejectionReason }); }
export function listClinicCreatedDoctors() { return platformRequest<{ items: ClinicCreatedDoctor[] }>("/v1/platform/clinic-created-doctors/pending"); }
export function listReadyClinicCreatedDoctors() { return platformRequest<{ items: ClinicCreatedDoctor[] }>("/v1/platform/clinic-created-doctors/ready"); }
export function reviewClinicCreatedDoctor(id: string, status: "APPROVED" | "REJECTED", rejectionReason?: string) { return platformPost<{ doctor: ClinicCreatedDoctor }>(`/v1/platform/clinic-created-doctors/${encodeURIComponent(id)}/review`, { status, ...(rejectionReason ? { rejectionReason } : {}) }); }
export function listClinicCreatedDoctorEmailOperations(id: string) { return platformRequest<{ items: ClinicCreatedDoctorEmailOperation[] }>(`/v1/platform/clinic-created-doctors/${encodeURIComponent(id)}/email-operations`); }
export function retryClinicCreatedDoctorEmailOperation(doctorId: string, operationId: string) { return platformPost<{ operation: ClinicCreatedDoctorEmailOperation }>(`/v1/platform/clinic-created-doctors/${encodeURIComponent(doctorId)}/email-operations/${encodeURIComponent(operationId)}/retry`, {}); }
export function resendClinicCreatedDoctorActivation(id: string) { return platformPost<{ doctor: ClinicCreatedDoctor }>(`/v1/platform/clinic-created-doctors/${encodeURIComponent(id)}/resend-activation`, {}); }
export function resendClinicCreatedDoctorWelcome(id: string) { return platformPost<{ success?: boolean; type?: string; doctor?: unknown }>(`/v1/platform/clinic-created-doctors/${encodeURIComponent(id)}/resend-welcome`, {}); }
export function resendDoctorWelcome(doctorId: string) { return platformPost<{ success: boolean; doctorId: string }>(`/v1/platform/doctors/${encodeURIComponent(doctorId)}/resend-welcome`, {}); }
export function resendClinicWelcome(clinicId: string) { return platformPost<{ success: boolean; clinicId: string }>(`/v1/platform/clinics/${encodeURIComponent(clinicId)}/resend-welcome`, {}); }
export function recordClinicCreatedDoctorActivationEmail(id: string, outcome: "REQUESTED" | "FAILED") { return platformPost<void>(`/v1/platform/clinic-created-doctors/${encodeURIComponent(id)}/activation-email`, { outcome }); }
export function sendTransactionalEmailTest(value: { emailType: "DOCTOR_ACTIVATION" | "DOCTOR_WELCOME"; doctorName: string; recipientEmail: string }) { return platformPost<{ success: true; emailType: "DOCTOR_ACTIVATION" | "DOCTOR_WELCOME"; message: string }>("/v1/platform/email-tests", value); }
export function listPresentationTemplates() { return platformRequest<{ items: PresentationTemplate[] }>("/v1/platform/presentation/templates"); }
export function listPresentationCapabilities() { return platformRequest<{ items: PresentationCapability[] }>("/v1/platform/presentation/capabilities"); }
export function setPresentationCapabilityDefault(key: string, defaultEnabled: boolean) { return platformPatch<{ capability: PresentationCapability }>(`/v1/platform/presentation/capabilities/${encodeURIComponent(key)}/default`, { defaultEnabled }); }
export function listPresentationEntitlements() { return platformRequest<{ items: PresentationEntitlement[] }>("/v1/platform/presentation/entitlements"); }
export function createPresentationEntitlement(value: { subject: PresentationEntitlement["subject"]; capabilityKey: string; effect: "GRANT" | "DENY"; externalReference?: string }) { return platformPost<{ entitlement: PresentationEntitlement }>("/v1/platform/presentation/entitlements", value); }
export function revokePresentationEntitlement(id: string) { return platformDelete<void>(`/v1/platform/presentation/entitlements/${encodeURIComponent(id)}`); }
export function listCommercialRules() { return platformRequest<{ items: CommercialRuleVersion[] }>("/v1/platform/commercial-rules"); }
export function getCommercialRulesOverview() { return platformRequest<FinancialGovernanceOverview>("/v1/platform/commercial-rules/overview"); }
export function previewCommercialRules() { return platformRequest<{ items: CommercialOfferingPreview[] }>("/v1/platform/commercial-rules/preview"); }
export function simulateCommercialRules(value: { channel: string; grossAmountMinor: string; discountAmountMinor?: string; serviceOfferingId?: string; clinicId?: string; doctorProfileId?: string; partnerId?: string; at?: string }) { return platformPost<CommercialSimulationResult>("/v1/platform/commercial-rules/simulate", value); }
export function createCommercialRule(value: { name?: string; description?: string; ruleType: string; channel?: string; beneficiaryType?: string; priority: number; effectiveFrom: string; calculationBasis: string; processingFeeBearer: string; changeReason?: string; policy: Record<string, unknown>; scopes: Array<{ kind: string; value?: string }> }) { return platformPost<{ version: CommercialRuleVersion }>("/v1/platform/commercial-rules", value); }
export function updateCommercialRuleDraft(id: string, value: { name?: string; description?: string; ruleType: string; channel?: string; beneficiaryType?: string; priority: number; effectiveFrom: string; calculationBasis: string; processingFeeBearer: string; changeReason?: string; policy: Record<string, unknown>; scopes: Array<{ kind: string; value?: string }> }) { return platformRequest<{ version: CommercialRuleVersion }>(`/v1/platform/commercial-rules/versions/${encodeURIComponent(id)}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(value) }); }
export function submitCommercialRule(id: string) { return platformPost<{ version: CommercialRuleVersion }>(`/v1/platform/commercial-rules/versions/${encodeURIComponent(id)}/submit`, {}); }
export function approveCommercialRule(id: string) { return platformPost<{ version: CommercialRuleVersion }>(`/v1/platform/commercial-rules/versions/${encodeURIComponent(id)}/approve`, {}); }
export function supersedeCommercialRule(id: string, value: { name?: string; description?: string; ruleType: string; channel?: string; beneficiaryType?: string; priority: number; effectiveFrom: string; calculationBasis: string; processingFeeBearer: string; changeReason?: string; policy: Record<string, unknown>; scopes: Array<{ kind: string; value?: string }> }) { return platformPost<{ version: CommercialRuleVersion }>(`/v1/platform/commercial-rules/versions/${encodeURIComponent(id)}/supersede`, value); }
export function retireCommercialRule(id: string, effectiveUntil: string) { return platformPost<void>(`/v1/platform/commercial-rules/versions/${encodeURIComponent(id)}/retire`, { effectiveUntil }); }
export function listCommercialPartners() { return platformRequest<{ items: CommercialPartner[] }>("/v1/platform/commercial-rules/partners"); }
export function createCommercialPartner(value: { name: string; partnerType: string; contactEmail: string; settlementFrequency?: string; minimumPayoutThresholdMinor?: string; notes?: string }) { return platformPost<{ partner: CommercialPartner }>("/v1/platform/commercial-rules/partners", value); }
export function updateCommercialPartner(id: string, value: Partial<CommercialPartner>) { return platformRequest<{ partner: CommercialPartner }>(`/v1/platform/commercial-rules/partners/${encodeURIComponent(id)}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(value) }); }
export function listPaymentGateways() { return platformRequest<{ items: PaymentGatewayConfig[] }>("/v1/platform/commercial-rules/gateways"); }
export function updatePaymentGateway(environment: "TEST" | "LIVE", value: Partial<PaymentGatewayConfig>) { return platformRequest<{ gateway: PaymentGatewayConfig }>(`/v1/platform/commercial-rules/gateways/${encodeURIComponent(environment)}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(value) }); }
export function listSubscriptionDefaultConfigurations(productKey?: SubscriptionDefaultConfiguration["productKey"]) { return platformRequest<{items:SubscriptionDefaultConfiguration[]}>(`/v1/platform/subscriptions/default-configurations${productKey?`?productKey=${productKey}`:""}`); }
export function scheduleSubscriptionDefaultConfiguration(value:{productKey:SubscriptionDefaultConfiguration["productKey"];subjectKind:SubscriptionDefaultConfiguration["subjectKind"];planVersionId:string;effectiveFrom:string;opdGraceDays:number}) { return platformPost<{configuration:SubscriptionDefaultConfiguration}>("/v1/platform/subscriptions/default-configurations",value); }
export function listSubscriptionProducts() { return platformRequest<{items:SubscriptionCatalogueProduct[]}>("/v1/platform/subscriptions/products"); }
export function listSubscriptionPlans(productKey:SubscriptionProductKey,limit=100,offset=0) { return platformRequest<{items:SubscriptionPlan[];total:number;limit:number;offset:number}>(`/v1/platform/subscriptions/products/${encodeURIComponent(productKey)}/plans?limit=${limit}&offset=${offset}`); }
export function createSubscriptionPlan(productKey:SubscriptionProductKey,value:{code:string;displayName:string}) { return platformPost<{plan:SubscriptionPlan}>(`/v1/platform/subscriptions/products/${encodeURIComponent(productKey)}/plans`,value); }
export function updateSubscriptionPlan(planId:string,value:{displayName:string}) { return platformPatch<{plan:SubscriptionPlan}>(`/v1/platform/subscriptions/plans/${encodeURIComponent(planId)}`,value); }
export function activateSubscriptionPlan(planId:string) { return platformPost<{plan:SubscriptionPlan}>(`/v1/platform/subscriptions/plans/${encodeURIComponent(planId)}/activate`,{}); }
export function retireSubscriptionPlan(planId:string) { return platformPost<{plan:SubscriptionPlan}>(`/v1/platform/subscriptions/plans/${encodeURIComponent(planId)}/archive`,{}); }
export function listSubscriptionPlanVersions(planId:string) { return platformRequest<{items:SubscriptionPlanVersion[]}>(`/v1/platform/subscriptions/plans/${encodeURIComponent(planId)}/versions`); }
export function createSubscriptionPlanVersion(planId:string,value:{effectiveFrom:string;effectiveUntil?:string;currency:string;priceMinor:string;billingCadence:"MONTHLY"|"ANNUAL"|"NONE";entitlements:SubscriptionPlanEntitlement[]}) { return platformPost<{version:SubscriptionPlanVersion}>(`/v1/platform/subscriptions/plans/${encodeURIComponent(planId)}/versions`,value); }
export function publishSubscriptionPlanVersion(versionId:string) { return platformPost<{version:SubscriptionPlanVersion}>(`/v1/platform/subscriptions/versions/${encodeURIComponent(versionId)}/publish`,{}); }
export function retireSubscriptionPlanVersion(versionId:string) { return platformPost<{version:SubscriptionPlanVersion}>(`/v1/platform/subscriptions/versions/${encodeURIComponent(versionId)}/archive`,{}); }
export type SubscriptionSubjectEligibility = { id: string; status: "ELIGIBLE" | "INELIGIBLE"; effectiveFrom: string; effectiveUntil: string | null; reason: string | null };
export type SetSubscriptionEligibilityInput = { status: "ELIGIBLE" | "INELIGIBLE"; effectiveFrom: string; effectiveUntil?: string; reason?: string };
export function getSubscriptionSubjectEligibility(productKey: SubscriptionProductKey, subjectKind: "CLINIC" | "DOCTOR", subjectId: string) { return platformRequest<{ items: SubscriptionSubjectEligibility[] }>(`/v1/platform/subscriptions/products/${encodeURIComponent(productKey)}/eligibility/${encodeURIComponent(subjectKind)}/${encodeURIComponent(subjectId)}`); }
export function setSubscriptionSubjectEligibility(productKey: SubscriptionProductKey, subjectKind: "CLINIC" | "DOCTOR", subjectId: string, value: SetSubscriptionEligibilityInput) { return platformRequest<{ eligibility: { id: string } }>(`/v1/platform/subscriptions/products/${encodeURIComponent(productKey)}/eligibility/${encodeURIComponent(subjectKind)}/${encodeURIComponent(subjectId)}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(value) }); }
export const listSubscriptionEligibility = getSubscriptionSubjectEligibility;
export const setSubscriptionEligibility = setSubscriptionSubjectEligibility;

export type EnquiryType = "DEMO_DOCTOR" | "DEMO_CLINIC" | "CAREER" | "PARTNER" | "GENERAL";
export type EnquiryStatus = "NEW" | "UNDER_REVIEW" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type Enquiry = {
  id: string;
  referenceNo: string;
  type: EnquiryType;
  name: string;
  email: string;
  mobile: string | null;
  message: string;
  status: EnquiryStatus;
  metadata: Record<string, unknown>;
  adminNotes: string | null;
  assignedToAccountId: string | null;
  reviewerAccountId: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type EnquiryStats = {
  total: number;
  new: number;
  underReview: number;
  inProgress: number;
  resolved: number;
  closed: number;
  demoDoctor: number;
  demoClinic: number;
  career: number;
  partner: number;
  general: number;
  doctorApplications: number;
  clinicApplications: number;
};
export function listEnquiries(query?: { type?: string; status?: string; search?: string; page?: number; limit?: number }) {
  const p = new URLSearchParams();
  if (query?.type) p.set("type", query.type);
  if (query?.status) p.set("status", query.status);
  if (query?.search) p.set("search", query.search);
  if (query?.page) p.set("page", String(query.page));
  if (query?.limit) p.set("limit", String(query.limit));
  const s = p.toString();
  return platformRequest<{ items: Enquiry[]; total: number; page: number; limit: number }>(`/v1/platform/enquiries${s ? `?${s}` : ""}`);
}
export function getEnquiryStats() {
  return platformRequest<EnquiryStats>("/v1/platform/enquiries/stats");
}
export function getEnquiry(id: string) {
  return platformRequest<{ enquiry: Enquiry }>(`/v1/platform/enquiries/${encodeURIComponent(id)}`);
}
export function updateEnquiryStatus(id: string, status: EnquiryStatus, adminNotes?: string) {
  return platformPatch<{ enquiry: Enquiry }>(`/v1/platform/enquiries/${encodeURIComponent(id)}`, { status, adminNotes });
}

export type PartnerStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type PlatformPartner = {
  id: string;
  name: string;
  slug: string;
  category: string;
  logoUrl: string | null;
  description: string;
  websiteUrl: string | null;
  status: PartnerStatus;
  isPublished: boolean;
  displayOrder: number;
  metadata: Record<string, unknown>;
  createdByAccountId: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type PlatformPartnerInput = {
  name: string;
  slug?: string;
  category?: string;
  logoUrl?: string | null;
  description: string;
  websiteUrl?: string | null;
  displayOrder?: number;
  status?: PartnerStatus;
  isPublished?: boolean;
};
export function listPlatformPartners(query?: { status?: PartnerStatus; search?: string }) {
  const p = new URLSearchParams();
  if (query?.status) p.set("status", query.status);
  if (query?.search) p.set("search", query.search);
  const s = p.toString();
  return platformRequest<{ items: PlatformPartner[] }>(`/v1/platform/partners${s ? `?${s}` : ""}`);
}
export function getPlatformPartner(id: string) {
  return platformRequest<{ partner: PlatformPartner }>(`/v1/platform/partners/${encodeURIComponent(id)}`);
}
export function createPlatformPartner(input: PlatformPartnerInput) {
  return platformPost<{ partner: PlatformPartner }>("/v1/platform/partners", input);
}
export function updatePlatformPartner(id: string, input: Partial<PlatformPartnerInput>) {
  return platformPatch<{ partner: PlatformPartner }>(`/v1/platform/partners/${encodeURIComponent(id)}`, input);
}
export function publishPlatformPartner(id: string) {
  return platformPost<{ partner: PlatformPartner }>(`/v1/platform/partners/${encodeURIComponent(id)}/publish`, {});
}
export function unpublishPlatformPartner(id: string) {
  return platformPost<{ partner: PlatformPartner }>(`/v1/platform/partners/${encodeURIComponent(id)}/unpublish`, {});
}
export function deletePlatformPartner(id: string) {
  return platformDelete<{ success: boolean }>(`/v1/platform/partners/${encodeURIComponent(id)}`);
}


