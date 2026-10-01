"use client";

import { useEffect, useState } from "react";
import { getAdminContexts, listAdminAppointments, listAdminMemberships, listAdminServices, type AdminAppointment, type AdminMembership, type AdminService, type AdminTenantContext, type PageResult } from "../lib/platform-api/admin";
import { Badge, Breadcrumbs, Button, Card, DatePicker, EmptyState, ErrorState, Filters, LoadingState, Pagination, Select } from "./ui";

const pageSize = 25;
const appointmentStatuses = ["", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "EXPIRED", "PAYMENT_FAILED"];

function readable(value: string) { return value.split("_").map((part) => `${part.slice(0, 1)}${part.slice(1).toLowerCase()}`).join(" "); }
function tone(status: string): "neutral" | "success" | "warning" | "danger" { return status === "CONFIRMED" || status === "COMPLETED" || status === "ACTIVE" ? "success" : status === "CANCELLED" || status === "EXPIRED" || status === "REMOVED" || status === "SUSPENDED" ? "danger" : "warning"; }
function dateTime(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function contextName(context: AdminTenantContext) { const name = context.clinic?.displayName ?? context.tenantId; return context.access === "PLATFORM_ADMIN" ? `${name} · Platform administrator` : name; }

function useTenantContexts() {
  const [contexts, setContexts] = useState<AdminTenantContext[] | null>(null);
  const [tenantId, setTenantId] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void getAdminContexts().then((result) => { setContexts(result.items); setTenantId((current) => current || result.items[0]?.tenantId || ""); }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Tenant context could not be loaded.")); }, []);
  return { contexts, tenantId, setTenantId, error };
}

function ContextControl({ contexts, tenantId, onChange }: { contexts: AdminTenantContext[]; tenantId: string; onChange: (tenantId: string) => void }) {
  return <label className="context-control">Clinic context<Select value={tenantId} onChange={(event) => onChange(event.target.value)}>{contexts.map((context) => <option key={context.tenantId} value={context.tenantId}>{contextName(context)}</option>)}</Select></label>;
}

function PageControls({ result, onPrevious, onNext }: { result: PageResult<unknown>; onPrevious: () => void; onNext: () => void }) {
  const current = Math.floor(result.page.offset / result.page.limit) + 1;
  const total = Math.max(1, Math.ceil(result.page.total / result.page.limit));
  return <div className="page-controls"><Pagination current={current} total={total} /><div><Button variant="secondary" onClick={onPrevious} disabled={result.page.offset === 0}>Previous</Button><Button variant="secondary" onClick={onNext} disabled={result.page.offset + result.page.limit >= result.page.total}>Next</Button></div></div>;
}

export function AppointmentsPageContent() {
  const { contexts, tenantId, setTenantId, error: contextError } = useTenantContexts();
  const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [status, setStatus] = useState(""); const [offset, setOffset] = useState(0);
  const requestKey = `${tenantId}:${offset}:${from}:${to}:${status}`;
  const [result, setResult] = useState<{ key: string; value: PageResult<AdminAppointment> } | null>(null); const [error, setError] = useState<{ key: string; message: string } | null>(null);
  useEffect(() => { if (!tenantId) return; void listAdminAppointments(tenantId, { limit: pageSize, offset, ...(from ? { from } : {}), ...(to ? { to } : {}), ...(status ? { status } : {}) }).then((value) => setResult({ key: requestKey, value })).catch((cause: unknown) => setError({ key: requestKey, message: cause instanceof Error ? cause.message : "Appointments could not be loaded." })); }, [tenantId, offset, from, to, status, requestKey]);
  const currentResult = result?.key === requestKey ? result.value : null; const currentError = error?.key === requestKey ? error.message : null;
  if (contextError) return <ErrorState detail={contextError} />;
  if (!contexts) return <LoadingState label="Loading appointment contexts…" />;
  if (!contexts.length) return <EmptyState title="No active clinic context" detail="This admin account is not assigned to an active clinic tenant." />;
  return <><Breadcrumbs items={["Operations", "Appointments"]} /><div className="page-heading"><div><p className="eyebrow">Scheduling</p><h1>Appointments</h1><p>Read-only appointments for the selected clinic context.</p></div><ContextControl contexts={contexts} tenantId={tenantId} onChange={(value) => { setTenantId(value); setOffset(0); }} /></div><Card><Filters><DatePicker aria-label="From date" value={from} onChange={(event) => { setFrom(event.target.value); setOffset(0); }} /><DatePicker aria-label="To date" value={to} onChange={(event) => { setTo(event.target.value); setOffset(0); }} /><Select aria-label="Appointment status" value={status} onChange={(event) => { setStatus(event.target.value); setOffset(0); }}>{appointmentStatuses.map((value) => <option key={value || "all"} value={value}>{value ? readable(value) : "All statuses"}</option>)}</Select></Filters></Card>{currentError ? <ErrorState detail={currentError} /> : !currentResult ? <LoadingState label="Loading appointments…" /> : !currentResult.items.length ? <EmptyState title="No appointments found" detail="No appointments match the selected context and filters." /> : <Card><div className="table-scroll"><table><thead><tr><th>Date and time</th><th>Patient</th><th>Service</th><th>Status</th></tr></thead><tbody>{currentResult.items.map((appointment) => <tr key={appointment.id}><td>{dateTime(appointment.startsAt)}</td><td><strong>{appointment.patientDisplayName ?? "No patient profile"}</strong></td><td>{appointment.serviceName}</td><td><Badge tone={tone(appointment.status)}>{readable(appointment.status)}</Badge></td></tr>)}</tbody></table></div><PageControls result={currentResult} onPrevious={() => setOffset((value) => Math.max(0, value - pageSize))} onNext={() => setOffset((value) => value + pageSize)} /></Card>}</>;
}

export function ServicesPageContent() {
  const { contexts, tenantId, setTenantId, error: contextError } = useTenantContexts();
  const [offset, setOffset] = useState(0); const requestKey = `${tenantId}:${offset}`; const [result, setResult] = useState<{ key: string; value: PageResult<AdminService> } | null>(null); const [error, setError] = useState<{ key: string; message: string } | null>(null);
  useEffect(() => { if (!tenantId) return; void listAdminServices(tenantId, { limit: pageSize, offset }).then((value) => setResult({ key: requestKey, value })).catch((cause: unknown) => setError({ key: requestKey, message: cause instanceof Error ? cause.message : "Services could not be loaded." })); }, [tenantId, offset, requestKey]);
  const currentResult = result?.key === requestKey ? result.value : null; const currentError = error?.key === requestKey ? error.message : null;
  if (contextError) return <ErrorState detail={contextError} />;
  if (!contexts) return <LoadingState label="Loading service contexts…" />;
  if (!contexts.length) return <EmptyState title="No active clinic context" detail="This admin account is not assigned to an active clinic tenant." />;
  return <><Breadcrumbs items={["Operations", "Services"]} /><div className="page-heading"><div><p className="eyebrow">Operations</p><h1>Services</h1><p>Read-only services for the selected clinic context.</p></div><ContextControl contexts={contexts} tenantId={tenantId} onChange={(value) => { setTenantId(value); setOffset(0); }} /></div>{currentError ? <ErrorState detail={currentError} /> : !currentResult ? <LoadingState label="Loading services…" /> : !currentResult.items.length ? <EmptyState title="No services found" detail="This clinic context has no services to display." /> : <Card><div className="table-scroll"><table><thead><tr><th>Service</th><th>Description</th><th>Status</th></tr></thead><tbody>{currentResult.items.map((service) => <tr key={service.id}><td><strong>{service.name}</strong></td><td>{service.description ?? "No description"}</td><td><Badge tone={tone(service.status)}>{readable(service.status)}</Badge></td></tr>)}</tbody></table></div><PageControls result={currentResult} onPrevious={() => setOffset((value) => Math.max(0, value - pageSize))} onNext={() => setOffset((value) => value + pageSize)} /></Card>}</>;
}

export function EmployeesPageContent() {
  const { contexts, tenantId, setTenantId, error: contextError } = useTenantContexts();
  const [offset, setOffset] = useState(0); const requestKey = `${tenantId}:${offset}`; const [result, setResult] = useState<{ key: string; value: PageResult<AdminMembership> } | null>(null); const [error, setError] = useState<{ key: string; message: string } | null>(null);
  useEffect(() => { if (!tenantId) return; void listAdminMemberships(tenantId, { limit: pageSize, offset }).then((value) => setResult({ key: requestKey, value })).catch((cause: unknown) => setError({ key: requestKey, message: cause instanceof Error ? cause.message : "Memberships could not be loaded." })); }, [tenantId, offset, requestKey]);
  const currentResult = result?.key === requestKey ? result.value : null; const currentError = error?.key === requestKey ? error.message : null;
  if (contextError) return <ErrorState detail={contextError} />;
  if (!contexts) return <LoadingState label="Loading membership contexts…" />;
  if (!contexts.length) return <EmptyState title="No active clinic context" detail="This admin account is not assigned to an active clinic tenant." />;
  return <><Breadcrumbs items={["People", "Employees"]} /><div className="page-heading"><div><p className="eyebrow">People</p><h1>Employees</h1><p>Read-only tenant memberships for the selected clinic context.</p></div><ContextControl contexts={contexts} tenantId={tenantId} onChange={(value) => { setTenantId(value); setOffset(0); }} /></div>{currentError ? <ErrorState detail={currentError} /> : !currentResult ? <LoadingState label="Loading memberships…" /> : !currentResult.items.length ? <EmptyState title="No memberships found" detail="This clinic context has no memberships to display." /> : <Card><div className="table-scroll"><table><thead><tr><th>Account</th><th>Role</th><th>Membership status</th></tr></thead><tbody>{currentResult.items.map((membership) => <tr key={membership.id}><td><strong>{membership.accountId}</strong></td><td>{readable(membership.role)}</td><td><Badge tone={tone(membership.status)}>{readable(membership.status)}</Badge></td></tr>)}</tbody></table></div><PageControls result={currentResult} onPrevious={() => setOffset((value) => Math.max(0, value - pageSize))} onNext={() => setOffset((value) => value + pageSize)} /></Card>}</>;
}
