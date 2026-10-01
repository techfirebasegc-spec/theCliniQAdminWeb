import { mockDashboard } from "./mock-dashboard";
import type { DashboardData } from "./types";
import { getAdminContexts, listAdminAppointments } from "../platform-api/admin";

export class NoActiveTenantContextError extends Error {
  public constructor() {
    super("No active clinic tenant context is assigned to this admin account.");
  }
}

export async function loadDashboard(): Promise<DashboardData> {
  const contexts = (await getAdminContexts()).items;
  if (!contexts.length) throw new NoActiveTenantContextError();
  const results = await Promise.all(contexts.map((context) => listAdminAppointments(context.tenantId, { limit: 10, offset: 0 })));
  const appointments = results.flatMap((result) => result.items).sort((left, right) => right.startsAt.localeCompare(left.startsAt)).slice(0, 10);
  const total = results.reduce((sum, result) => sum + result.page.total, 0);
  const clinicNames = contexts.map((context) => context.clinic?.displayName ?? context.tenantId);
  const isPlatformAdmin = contexts.some((context) => context.access === "PLATFORM_ADMIN");
  return {
    ...mockDashboard,
    sourceLabel: `${isPlatformAdmin ? "Platform Administrator. " : ""}Live appointments for ${clinicNames.join(", ")}. Other dashboard areas remain development mock data.`,
    metrics: [{ label: "Appointments", value: String(total), change: `Across ${contexts.length} active tenant ${contexts.length === 1 ? "context" : "contexts"}`, tone: "navy" }, ...mockDashboard.metrics.slice(1)],
    appointments: appointments.map((appointment) => ({ patient: appointment.patientDisplayName ?? "Patient", service: appointment.serviceName, time: new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(appointment.startsAt)), status: appointmentStatus(appointment.status) })),
  };
}

function appointmentStatus(status: string): string {
  return status.split("_").map((part) => `${part.slice(0, 1)}${part.slice(1).toLowerCase()}`).join(" ");
}
