import { platformRequest } from "./client";

export type AdminTenantContext = { membershipId: string | null; tenantId: string; role: "PLATFORM_ADMIN" | "CLINIC_OWNER" | "CLINIC_ADMIN" | "CLINIC_STAFF" | "DOCTOR" | "PATIENT"; access: "PLATFORM_ADMIN" | "TENANT_MEMBERSHIP"; clinic: { id: string; displayName: string; status: string } | null };
export type AdminAppointment = { id: string; patientProfileId: string | null; patientDisplayName: string | null; serviceOfferingId: string; serviceName: string; status: string; startsAt: string; endsAt: string };
export type AdminService = { id: string; name: string; description: string | null; status: string };
export type AdminMembership = { id: string; accountId: string; role: "CLINIC_OWNER" | "CLINIC_ADMIN" | "CLINIC_STAFF" | "DOCTOR" | "PATIENT"; status: string };
export type PageResult<T> = { items: T[]; page: { limit: number; offset: number; total: number } };

export function getAdminContexts() { return platformRequest<{ items: AdminTenantContext[] }>("/v1/admin/context"); }
export function listAdminAppointments(tenantId: string, query: { from?: string; to?: string; status?: string; limit?: number; offset?: number } = {}) {
  const parameters = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined) parameters.set(key, String(value));
  const suffix = parameters.size ? `?${parameters.toString()}` : "";
  return platformRequest<PageResult<AdminAppointment>>(`/v1/admin/tenants/${encodeURIComponent(tenantId)}/appointments${suffix}`);
}
export function listAdminServices(tenantId: string, query: { limit?: number; offset?: number } = {}) {
  const parameters = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined) parameters.set(key, String(value));
  const suffix = parameters.size ? `?${parameters.toString()}` : "";
  return platformRequest<PageResult<AdminService>>(`/v1/admin/tenants/${encodeURIComponent(tenantId)}/services${suffix}`);
}
export function listAdminMemberships(tenantId: string, query: { limit?: number; offset?: number } = {}) {
  const parameters = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined) parameters.set(key, String(value));
  const suffix = parameters.size ? `?${parameters.toString()}` : "";
  return platformRequest<PageResult<AdminMembership>>(`/v1/admin/tenants/${encodeURIComponent(tenantId)}/memberships${suffix}`);
}
