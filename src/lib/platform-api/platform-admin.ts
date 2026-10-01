import { platformDownload, platformPost, platformRequest } from "./client";

export type PlatformClinic = { id: string; tenantId: string; displayName: string; legalName: string; clinicStatus: string; tenantStatus: string; ownerEmail: string | null; ownerMembershipStatus: string | null; invitationStatus: string | null };
export type PlatformDoctor = { id: string; accountId: string; displayName: string | null; status: string; professionalVerificationStatus: string; clinicNames: string[] };
export type PlatformDoctorInvitation = { id: string; email: string; displayName: string | null; status: string; createdAt: string; expiresAt: string; revokedAt: string | null; acceptedAt: string | null };
export type OwnerInvitation = { id: string; tenantId: string; email: string | null; status: string; createdAt: string; expiresAt: string; acceptedAt: string | null; revokedAt: string | null };
export type PlatformMetrics = { clinics: number; doctors: number; patients: number; activeInvitations: number; upcomingAppointments: number };
export type PublicDiscoveryControl = { subjectId: string; subjectKind: "CLINIC" | "DOCTOR"; status: "NOT_READY" | "NOT_PUBLISHED" | "PUBLISHED" | "REVOKED"; publishedExposureCount: number; reason: string | null };
export type VerificationEvidence = { id: string; originalFilename: string; contentType: string; byteSize: number; status: string };
export type DoctorVerificationSubmission = { id: string; status: "PENDING" | "APPROVED" | "REJECTED"; registrationAuthority: string; registrationJurisdiction: string; registrationIdentifier: string; submittedAt: string; reviewedAt: string | null; rejectionReason: string | null };
export type DoctorApplication = { id: string; doctorProfileId: string; doctorAccountId: string; displayName: string | null; profileStatus: string; professionalVerificationStatus: string; status: "PENDING" | "APPROVED" | "REJECTED"; submittedAt: string; reviewedAt: string | null; reviewerAccountId: string | null; rejectionReason: string | null };
export type ClinicApplication = { id: string; applicantAccountId: string; legalName: string; clinicName: string; ownerEmail: string; status: "PENDING" | "APPROVED" | "REJECTED"; submittedAt: string; reviewerAccountId: string | null; reviewedAt: string | null; rejectionReason: string | null };

export function platformDashboard() { return platformRequest<PlatformMetrics>("/v1/platform/dashboard"); }
export function listPlatformClinics() { return platformRequest<{ items: PlatformClinic[] }>("/v1/platform/clinics"); }
export function getPlatformClinic(id: string) { return platformRequest<{ clinic: PlatformClinic }>(`/v1/platform/clinics/${encodeURIComponent(id)}`); }
export function activatePlatformClinic(id: string) { return platformPost<{ clinic: PlatformClinic }>(`/v1/platform/clinics/${encodeURIComponent(id)}/activate`); }
export function listPlatformDoctors() { return platformRequest<{ items: PlatformDoctor[] }>("/v1/platform/doctors"); }
export function getPlatformDoctor(id: string) { return platformRequest<{ doctor: PlatformDoctor }>(`/v1/platform/doctors/${encodeURIComponent(id)}`); }
export function listOwnerInvitations() { return platformRequest<{ items: OwnerInvitation[] }>("/v1/platform/tenant-invitations"); }
export function resendOwnerInvitation(id: string) { return platformPost<{ invitation: OwnerInvitation; invitationUrl: string }>(`/v1/platform/tenant-invitations/${encodeURIComponent(id)}/resend`, {}); }
export function revokeOwnerInvitation(id: string) { return platformPost<void>(`/v1/platform/tenant-invitations/${encodeURIComponent(id)}/revoke`); }
export function listDoctorInvitations() { return platformRequest<{ items: PlatformDoctorInvitation[] }>("/v1/platform/doctor-invitations"); }
export function inviteDoctor(value: { email: string; displayName?: string }) { return platformPost<{ invitation: PlatformDoctorInvitation }>("/v1/platform/doctor-invitations", value); }
export function resendDoctorInvitation(id: string) { return platformPost<{ invitation: PlatformDoctorInvitation }>(`/v1/platform/doctor-invitations/${encodeURIComponent(id)}/resend`); }
export function revokeDoctorInvitation(id: string) { return platformPost<void>(`/v1/platform/doctor-invitations/${encodeURIComponent(id)}/revoke`); }
export function getClinicPublicDiscovery(id: string) { return platformRequest<{ publicDiscovery: PublicDiscoveryControl }>(`/v1/platform/clinics/${encodeURIComponent(id)}/public-discovery`); }
export function publishClinicPublicDiscovery(id: string) { return platformPost<{ publicDiscovery: PublicDiscoveryControl }>(`/v1/platform/clinics/${encodeURIComponent(id)}/public-discovery/publish`); }
export function revokeClinicPublicDiscovery(id: string) { return platformPost<{ publicDiscovery: PublicDiscoveryControl }>(`/v1/platform/clinics/${encodeURIComponent(id)}/public-discovery/revoke`); }
export function getDoctorPublicDiscovery(id: string) { return platformRequest<{ publicDiscovery: PublicDiscoveryControl }>(`/v1/platform/doctors/${encodeURIComponent(id)}/public-discovery`); }
export function publishDoctorPublicDiscovery(id: string) { return platformPost<{ publicDiscovery: PublicDiscoveryControl }>(`/v1/platform/doctors/${encodeURIComponent(id)}/public-discovery/publish`); }
export function revokeDoctorPublicDiscovery(id: string) { return platformPost<{ publicDiscovery: PublicDiscoveryControl }>(`/v1/platform/doctors/${encodeURIComponent(id)}/public-discovery/revoke`); }
export function listDoctorVerificationSubmissions(id: string) { return platformRequest<{ items: DoctorVerificationSubmission[] }>(`/v1/platform/doctors/${encodeURIComponent(id)}/verification-submissions`); }
export function listVerificationEvidence(submissionId: string) { return platformRequest<{ items: VerificationEvidence[] }>(`/v1/platform/doctor-verification-submissions/${encodeURIComponent(submissionId)}/evidence`); }
export function downloadVerificationEvidence(submissionId: string, fileId: string) { return platformDownload(`/v1/platform/doctor-verification-submissions/${encodeURIComponent(submissionId)}/evidence/${encodeURIComponent(fileId)}/download`); }
export function approveDoctorVerification(submissionId: string) { return platformPost(`/v1/platform/doctor-verification-submissions/${encodeURIComponent(submissionId)}/approve`); }
export function rejectDoctorVerification(submissionId: string, rejectionReason: string) { return platformPost(`/v1/platform/doctor-verification-submissions/${encodeURIComponent(submissionId)}/reject`, { rejectionReason }); }
export function listDoctorApplications() { return platformRequest<{ items: DoctorApplication[] }>("/v1/platform/doctor-applications"); }
export function getDoctorApplication(id: string) { return platformRequest<{ application: DoctorApplication }>(`/v1/platform/doctor-applications/${encodeURIComponent(id)}`); }
export function approveDoctorApplication(id: string) { return platformPost<{ application: DoctorApplication }>(`/v1/platform/doctor-applications/${encodeURIComponent(id)}/approve`); }
export function rejectDoctorApplication(id: string, rejectionReason: string) { return platformPost<{ application: DoctorApplication }>(`/v1/platform/doctor-applications/${encodeURIComponent(id)}/reject`, { rejectionReason }); }
export function listClinicApplications() { return platformRequest<{ items: ClinicApplication[] }>("/v1/platform/clinic-applications"); }
export function getClinicApplication(id: string) { return platformRequest<{ application: ClinicApplication }>(`/v1/platform/clinic-applications/${encodeURIComponent(id)}`); }
export function approveClinicApplication(id: string) { return platformPost<{ application: ClinicApplication }>(`/v1/platform/clinic-applications/${encodeURIComponent(id)}/approve`); }
export function rejectClinicApplication(id: string, rejectionReason: string) { return platformPost<{ application: ClinicApplication }>(`/v1/platform/clinic-applications/${encodeURIComponent(id)}/reject`, { rejectionReason }); }
