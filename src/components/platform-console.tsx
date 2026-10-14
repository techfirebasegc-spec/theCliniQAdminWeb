"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  activatePlatformClinic,
  approveClinicApplication,
  approveDoctorApplication,
  approveDoctorVerification,
  downloadVerificationEvidence,
  getClinicApplication,
  getClinicPublicDiscovery,
  getDoctorApplication,
  getDoctorPublicDiscovery,
  getPlatformClinic,
  getPlatformDoctor,
  inviteDoctor,
  listClinicApplications,
  listClinicCreatedDoctors,
  listReadyClinicCreatedDoctors,
  listDoctorApplications,
  listDoctorInvitations,
  listDoctorVerificationSubmissions,
  listOwnerInvitations,
  listPlatformClinics,
  listPlatformDoctors,
  listVerificationEvidence,
  platformDashboard,
  publishClinicPublicDiscovery,
  publishDoctorPublicDiscovery,
  rejectClinicApplication,
  rejectDoctorApplication,
  rejectDoctorVerification,
  resendDoctorInvitation,
  resendClinicCreatedDoctorActivation,
  recordClinicCreatedDoctorActivationEmail,
  resendOwnerInvitation,
  sendTransactionalEmailTest,
  reviewClinicCreatedDoctor,
  revokeClinicPublicDiscovery,
  revokeDoctorInvitation,
  revokeDoctorPublicDiscovery,
  revokeOwnerInvitation,
  type ClinicApplication,
  type ClinicCreatedDoctor,
  type DoctorApplication,
  type DoctorVerificationSubmission,
  type OwnerInvitation,
  type PlatformClinic,
  type PlatformDoctor,
  type PlatformDoctorInvitation,
  type PlatformMetrics,
  type PublicDiscoveryControl,
  type VerificationEvidence,
} from "../lib/platform-api/platform-admin";
import { PlatformApiError } from "../lib/platform-api/client";
import { firebaseAuth } from "../lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  ConfirmationDialog,
  EmptyState,
  ErrorState,
  Filters,
  Input,
  LoadingState,
  PageHeader,
  Search,
  Select,
  StatusBadge,
  Tabs,
  Toast,
  useToast,
} from "./ui";

function errorMessage(cause: unknown) {
  if (cause instanceof PlatformApiError)
    return cause.status === 401
      ? "Your Platform Admin session has expired. Please sign in again."
      : cause.status === 403
        ? "Platform Admin access is required for this action."
        : cause.message;
  return "The Platform request could not be completed.";
}
function date(value: string | null) {
  return value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
}
function CopyId({ label, value }: { label: string; value: string | null }) {
  if (!value) return <span className="muted">Not available</span>;
  return <span className="id-value"><code>{value}</code><Button type="button" variant="quiet" onClick={() => void navigator.clipboard.writeText(value)} aria-label={`Copy ${label}`}>Copy</Button></span>;
}
function DetailValue({ value }: { value: string | number | null | undefined }) { return value === null || value === undefined || value === "" ? <span className="muted">Not available</span> : <>{value}</>; }
function ServiceTable({ items }: { items: PlatformClinic["services"] | PlatformDoctor["services"] }) { return items.length ? <div className="table-scroll"><table><thead><tr><th>Service</th><th>Offering</th><th>Version / price</th><th>Availability</th><th>Exposure</th></tr></thead><tbody>{items.map((service) => <tr key={service.id}><td><CopyId label="service offering ID" value={service.id} /></td><td><strong>{service.name}</strong><br /><StatusBadge value={service.status} /></td><td><DetailValue value={service.versionStatus} />{service.priceAmountMinor ? <small>{service.priceAmountMinor} {service.currency ?? ""}</small> : null}</td><td><StatusBadge value={service.availabilityStatus} /></td><td><StatusBadge value={service.exposureStatus} /></td></tr>)}</tbody></table></div> : <EmptyState title="No services recorded" detail="No service offerings are currently associated with this record." />; }
function tone(status: string | null) {
  if (!status) return "neutral" as const;
  if (["ACTIVE", "ACCEPTED", "APPROVED", "VERIFIED", "PUBLISHED"].includes(status)) return "success" as const;
  if (["REVOKED", "REJECTED", "EXPIRED", "REMOVED", "SUSPENDED"].includes(status)) return "danger" as const;
  return "warning" as const;
}
function Page({
  children,
  crumbs,
}: {
  children: React.ReactNode;
  crumbs: string[];
}) {
  return (
    <>
      <Breadcrumbs items={crumbs} />
      {children}
    </>
  );
}

export function PlatformDashboard() {
  const [data, setData] = useState<PlatformMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void platformDashboard()
      .then(setData)
      .catch((cause) => setError(errorMessage(cause)));
  }, []);
  if (error) return <ErrorState detail={error} />;
  if (!data) return <LoadingState label="Loading platform overview…" />;
  const metrics = [
    ["Clinics", data.clinics],
    ["Doctors", data.doctors],
    ["Patients", data.patients],
    ["Active invitations", data.activeInvitations],
    ["Upcoming appointments", data.upcomingAppointments],
  ];
  return (
    <Page crumbs={["Platform Admin", "Dashboard"]}>
      <PageHeader eyebrow="The CliniQ Platform" title="Platform Dashboard" description="A cross-tenant operational overview using the platform metrics available to this workspace." />
      <section className="metrics platform-metrics">
        {metrics.map(([label, value]) => (
          <Card className="metric" key={String(label)}>
            <p>{label}</p>
            <strong>{value}</strong>
          </Card>
        ))}
      </section>
    </Page>
  );
}

export function ClinicsPage() {
  const [items, setItems] = useState<PlatformClinic[] | null>(null);
  const [discovery, setDiscovery] = useState<
    Record<string, PublicDiscoveryControl>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  useEffect(() => {
    void listPlatformClinics()
      .then(async (result) => {
        setItems(result.items);
        const values = await Promise.all(
          result.items.map(
            async (clinic) =>
              [
                clinic.id,
                (await getClinicPublicDiscovery(clinic.id)).publicDiscovery,
              ] as const,
          ),
        );
        setDiscovery(Object.fromEntries(values));
      })
      .catch((cause) => setError(errorMessage(cause)));
  }, []);
  if (error) return <ErrorState detail={error} />;
  if (!items) return <LoadingState label="Loading clinics…" />;
  const filteredItems = items.filter((clinic) => {
    const matchesQuery = [clinic.displayName, clinic.legalName, clinic.ownerEmail ?? "", clinic.tenantStatus, clinic.clinicStatus].join(" ").toLowerCase().includes(query.trim().toLowerCase());
    return matchesQuery && (!status || clinic.clinicStatus === status || clinic.tenantStatus === status);
  });
  return (
    <Page crumbs={["Platform Admin", "Clinics"]}>
      <PageHeader eyebrow="Organizations" title="Clinics" description="Every clinic, owner onboarding state, and public-discovery approval." action={<Link className="button button--primary" href="/platform/clinics/new">Create clinic</Link>}>
        <Filters>
          <Search label="Search clinics or owners" value={query} onChange={(event) => setQuery(event.target.value)} />
          <Select aria-label="Filter clinic status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="SUSPENDED">Suspended</option></Select>
        </Filters>
      </PageHeader>
      <Card>
        <Table
          headers={[
            "Clinic",
            "Owner",
            "Tenant",
            "Clinic",
            "Public Discovery",
            "Onboarding",
            "Actions",
          ]}
        >
          {filteredItems.length ? (
            filteredItems.map((clinic) => (
              <tr key={clinic.id}>
                <td>
                  <Link href={`/platform/clinics/${clinic.id}`}>
                    {clinic.displayName}
                  </Link>
                  <small>{clinic.legalName}</small>
                </td>
                <td>{clinic.ownerEmail ?? "Not assigned"}</td>
                <td>
                  <StatusBadge value={clinic.tenantStatus} />
                </td>
                <td>
                  <StatusBadge value={clinic.clinicStatus} />
                </td>
                <td>
                  <StatusBadge value={discovery[clinic.id]?.status ?? "NOT_READY"} />
                </td>
                <td>
                  <StatusBadge value={clinic.invitationStatus ?? clinic.ownerMembershipStatus ?? "NOT_STARTED"} />
                </td>
                <td><Link className="table-action" href={`/platform/clinics/${clinic.id}`}>Manage clinic</Link></td>
              </tr>
            ))
          ) : (
            <EmptyRow columns={7} label={query || status ? "No clinics match the current filters." : "No clinics are available."} />
          )}
        </Table>
      </Card>
    </Page>
  );
}

export function ClinicDetails({ clinicId }: { clinicId: string }) {
  const [item, setItem] = useState<PlatformClinic | null>(null);
  const [discovery, setDiscovery] = useState<PublicDiscoveryControl | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [confirmActivation, setConfirmActivation] = useState(false);
  const toast = useToast();
  const reload = () => {
    void Promise.all([
      getPlatformClinic(clinicId),
      getClinicPublicDiscovery(clinicId),
    ])
      .then(([clinic, visibility]) => {
        setItem(clinic.clinic);
        setDiscovery(visibility.publicDiscovery);
      })
      .catch((cause) => setError(errorMessage(cause)));
  };
  useEffect(reload, [clinicId]);
  async function activate() {
    setActivating(true);
    setError(null);
    try {
      await activatePlatformClinic(clinicId);
      toast.show("Clinic activated.");
      setConfirmActivation(false);
      reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setActivating(false);
    }
  }
  if (error) return <ErrorState detail={error} />;
  if (!item || !discovery) return <LoadingState label="Loading clinic…" />;
  return (
    <Page crumbs={["Platform Admin", "Clinics", item.displayName]}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Organization</p>
          <h1>{item.displayName}</h1>
          <p>{item.legalName}</p>
        </div>
      </div>
      <Card>
        <dl className="detail-list">
          <dt>Clinic ID</dt><dd><CopyId label="clinic ID" value={item.id} /></dd>
          <dt>Tenant ID</dt><dd><CopyId label="tenant ID" value={item.tenantId} /></dd>
          <dt>Clinic status</dt>
          <dd>
            <Badge tone={tone(item.clinicStatus)}>{item.clinicStatus}</Badge>
          </dd>
          <dt>Tenant status</dt>
          <dd>
            <Badge tone={tone(item.tenantStatus)}>{item.tenantStatus}</Badge>
          </dd>
          <dt>Owner</dt>
          <dd>{item.ownerEmail ?? "Not assigned"}</dd>
          <dt>Owner onboarding</dt><dd><DetailValue value={item.invitationStatus} /> · <DetailValue value={item.ownerMembershipStatus} /></dd>
          <dt>Public contact</dt><dd><DetailValue value={item.publicEmail} /> · <DetailValue value={item.publicPhone} /></dd>
          <dt>Created / updated</dt><dd>{date(item.createdAt)} · {date(item.updatedAt)}</dd>
        </dl>
        {item.address ? <p className="detail-copy">{item.address.line1}{item.address.line2 ? `, ${item.address.line2}` : ""}, {item.address.locality}, {item.address.region} {item.address.postalCode}, {item.address.countryCode}</p> : null}
        {item.about ? <p className="detail-copy">{item.about}</p> : null}
        {item.clinicStatus === "DRAFT" ? (
          <div className="platform-control">
            <Button
              disabled={activating}
              onClick={() => setConfirmActivation(true)}
            >
              Activate clinic
            </Button>
            <p className="control-help">
              Activation requires an active tenant and active Clinic Owner
              membership.
            </p>
          </div>
        ) : null}
      </Card>
      <Card><div className="card-heading"><div><p className="eyebrow">Operating profile</p><h2>Hours and associated doctors</h2></div></div>{item.operatingHours.length ? <ul className="detail-list-compact">{item.operatingHours.map((hour) => <li key={hour.weekday}>Day {hour.weekday}: {hour.opensAt}–{hour.closesAt}</li>)}</ul> : <p className="muted">Operating hours are not available.</p>}{item.doctors.length ? <div className="record-links">{item.doctors.map((doctor) => <Link key={doctor.id} href={`/platform/doctors/${doctor.id}`}>{doctor.displayName ?? "Unnamed doctor"} · {doctor.connectionStatus}</Link>)}</div> : <p className="muted">No clinic-doctor associations are recorded.</p>}</Card>
      <Card><div className="card-heading"><div><p className="eyebrow">Services and readiness</p><h2>Service catalogue</h2></div></div><ServiceTable items={item.services} /></Card>
      <ConfirmationDialog
        open={confirmActivation}
        onClose={() => setConfirmActivation(false)}
        onConfirm={() => void activate()}
      >
        Activate {item.displayName}? This changes the clinic from Draft to
        Active. Public Discovery approval remains separate.
      </ConfirmationDialog>
      <DiscoveryControls
        subjectName={item.displayName}
        value={discovery}
        publish={() => publishClinicPublicDiscovery(clinicId)}
        revoke={() => revokeClinicPublicDiscovery(clinicId)}
        onChanged={reload}
      />
      <Toast message={toast.message} />
    </Page>
  );
}

export function OwnersPage() {
  const [items, setItems] = useState<OwnerInvitation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  useEffect(() => {
    void listOwnerInvitations()
      .then((result) => setItems(result.items))
      .catch((cause) => setError(errorMessage(cause)));
  }, []);
  if (error) return <ErrorState detail={error} />;
  if (!items) return <LoadingState label="Loading clinic owners…" />;
  const filteredItems = items.filter((item) => [item.email ?? "", item.status].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <Page crumbs={["Platform Admin", "Clinic Owners"]}>
      <PageHeader eyebrow="Organizations" title="Clinic Owners" description="Owner invitation records and their current onboarding state."><Search label="Search owners or invitations" value={query} onChange={(event) => setQuery(event.target.value)} /></PageHeader>
      <InvitationTable
        kind="owner"
        items={filteredItems}
        onRefresh={() =>
          void listOwnerInvitations().then((result) => setItems(result.items))
        }
        onError={setError}
      />
    </Page>
  );
}

export function InvitationsPage({
  doctorsOnly = false,
}: {
  doctorsOnly?: boolean;
}) {
  const [owners, setOwners] = useState<OwnerInvitation[] | null>(
    doctorsOnly ? [] : null,
  );
  const [doctors, setDoctors] = useState<PlatformDoctorInvitation[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(doctorsOnly ? "doctors" : "owners");
  const refresh = () => {
    if (!doctorsOnly)
      void listOwnerInvitations()
        .then((result) => setOwners(result.items))
        .catch((cause) => setError(errorMessage(cause)));
    void listDoctorInvitations()
      .then((result) => setDoctors(result.items))
      .catch((cause) => setError(errorMessage(cause)));
  };
  useEffect(refresh, [doctorsOnly]);
  if (error) return <ErrorState detail={error} />;
  if (!owners || !doctors) return <LoadingState label="Loading invitations…" />;
  return (
    <Page
      crumbs={[
        "Platform Admin",
        doctorsOnly ? "Doctor Invitations" : "Invitations",
      ]}
    >
      <PageHeader eyebrow="Onboarding" title={doctorsOnly ? "Doctor Invitations" : "Invitations"} description="Invitation actions are available only while the current state supports them." action={doctorsOnly ? <Link className="button button--primary" href="/platform/doctors">Invite doctor</Link> : undefined} />
      {!doctorsOnly ? <Tabs items={[{ id: "owners", label: "Clinic Owner Invitations" }, { id: "doctors", label: "Doctor Invitations" }]} active={activeTab} onChange={setActiveTab} /> : null}
      {activeTab === "owners" && !doctorsOnly ? <InvitationTable kind="owner" items={owners} onRefresh={refresh} onError={setError} /> : null}
      {activeTab === "doctors" ? <InvitationTable kind="doctor" items={doctors} onRefresh={refresh} onError={setError} /> : null}
    </Page>
  );
}

export function DoctorsPage() {
  const [items, setItems] = useState<PlatformDoctor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [verification, setVerification] = useState("");
  useEffect(() => {
    void listPlatformDoctors()
      .then((result) => setItems(result.items))
      .catch((cause) => setError(errorMessage(cause)));
  }, []);
  if (error) return <ErrorState detail={error} />;
  if (!items) return <LoadingState label="Loading doctors…" />;
  const filteredItems = items.filter((doctor) => {
    const matchesQuery = [doctor.displayName ?? "", doctor.status, doctor.professionalVerificationStatus, ...doctor.clinicNames].join(" ").toLowerCase().includes(query.trim().toLowerCase());
    return matchesQuery && (!verification || doctor.professionalVerificationStatus === verification);
  });
  return (
    <Page crumbs={["Platform Admin", "Doctors"]}>
      <PageHeader eyebrow="Doctors" title="Doctors / Verification" description="Doctor profiles, clinic relationships, and professional verification remain distinct operational states." action={<Button onClick={() => setInviteOpen(true)}>Invite doctor</Button>}>
        <Filters><Search label="Search doctors or clinics" value={query} onChange={(event) => setQuery(event.target.value)} /><Select aria-label="Filter professional verification" value={verification} onChange={(event) => setVerification(event.target.value)}><option value="">All verification states</option><option value="NOT_SUBMITTED">Not submitted</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></Select></Filters>
      </PageHeader>
      <Card>
        <Table headers={["Doctor", "Account status", "Professional verification", "Clinics", "Actions"]}>
          {filteredItems.length ? (
            filteredItems.map((doctor) => (
              <tr key={doctor.id}>
                <td>
                  <Link href={`/platform/doctors/${doctor.id}`}>
                    {doctor.displayName ?? "Unnamed doctor"}
                  </Link>
                </td>
                <td>
                  <StatusBadge value={doctor.status} />
                </td>
                <td>
                  <StatusBadge value={doctor.professionalVerificationStatus} />
                </td>
                <td>
                  {doctor.clinicNames.length
                    ? doctor.clinicNames.join(", ")
                    : "Not associated"}
                </td>
                <td><Link className="table-action" href={`/platform/doctors/${doctor.id}`}>Review profile</Link></td>
              </tr>
            ))
          ) : (
            <EmptyRow columns={5} label={query || verification ? "No doctors match the current filters." : "No doctor profiles are available."} />
          )}
        </Table>
      </Card>
      {inviteOpen ? (
        <DoctorInviteForm
          onClose={() => setInviteOpen(false)}
          onCreated={() =>
            void listPlatformDoctors().then((result) => setItems(result.items))
          }
        />
      ) : null}
    </Page>
  );
}

export function DoctorDetails({ doctorId }: { doctorId: string }) {
  const [item, setItem] = useState<PlatformDoctor | null>(null);
  const [discovery, setDiscovery] = useState<PublicDiscoveryControl | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const reload = () => {
    void Promise.all([
      getPlatformDoctor(doctorId),
      getDoctorPublicDiscovery(doctorId),
    ])
      .then(([doctor, visibility]) => {
        setItem(doctor.doctor);
        setDiscovery(visibility.publicDiscovery);
      })
      .catch((cause) => setError(errorMessage(cause)));
  };
  useEffect(reload, [doctorId]);
  if (error) return <ErrorState detail={error} />;
  if (!item || !discovery) return <LoadingState label="Loading doctor…" />;
  return (
    <Page crumbs={["Platform Admin", "Doctors", item.displayName ?? "Doctor"]}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Doctor profile</p>
          <h1>{item.displayName ?? "Unnamed doctor"}</h1>
          <p>Platform-visible doctor record.</p>
        </div>
      </div>
      <Card>
        <dl className="detail-list">
          <dt>Doctor profile ID</dt><dd><CopyId label="doctor profile ID" value={item.id} /></dd>
          <dt>Account ID</dt><dd><CopyId label="doctor account ID" value={item.accountId} /></dd>
          <dt>Status</dt>
          <dd>
            <Badge tone={tone(item.status)}>{item.status}</Badge>
          </dd>
          <dt>Professional verification</dt>
          <dd>
            <Badge tone={tone(item.professionalVerificationStatus)}>
              {item.professionalVerificationStatus}
            </Badge>
          </dd>
          <dt>Clinic associations</dt>
          <dd>
            {item.clinicNames.length
              ? item.clinicNames.join(", ")
              : "Not associated"}
          </dd>
          <dt>Account status</dt><dd><StatusBadge value={item.accountStatus} /></dd>
          <dt>Professional profile</dt><dd><DetailValue value={item.professionalTitle} /> · <DetailValue value={item.specialization} /> · <DetailValue value={item.yearsExperience === null ? null : `${item.yearsExperience} years`} /></dd>
          <dt>Contact</dt><dd><DetailValue value={item.mobileNumber} /></dd>
          <dt>Created by clinic</dt><dd>{item.createdByClinicId ? <Link href={`/platform/clinics/${item.createdByClinicId}`}>{item.createdByClinicId}</Link> : <span className="muted">Independent or not recorded</span>}</dd>
          <dt>Created / updated</dt><dd>{date(item.createdAt)} · {date(item.updatedAt)}</dd>
        </dl>
        {item.shortIntroduction ? <p className="detail-copy">{item.shortIntroduction}</p> : null}{item.biography ? <p className="detail-copy">{item.biography}</p> : null}
      </Card>
      <Card><div className="card-heading"><div><p className="eyebrow">Professional information</p><h2>Qualifications and relationships</h2></div></div>{item.qualifications.length ? <ul className="detail-list-compact">{item.qualifications.map((qualification) => <li key={`${qualification.credential}-${qualification.institution}`}>{qualification.credential} · {qualification.institution}{qualification.completionYear ? ` (${qualification.completionYear})` : ""}</li>)}</ul> : <p className="muted">Qualifications are not available.</p>}<p><strong>Languages:</strong> {item.languages.length ? item.languages.join(", ") : "Not available"}</p>{item.clinics.length ? <div className="record-links">{item.clinics.map((clinic) => <Link key={clinic.id} href={`/platform/clinics/${clinic.id}`}>{clinic.displayName} · {clinic.connectionStatus}</Link>)}</div> : null}</Card>
      <Card><div className="card-heading"><div><p className="eyebrow">Services and readiness</p><h2>Service catalogue</h2></div></div><ServiceTable items={item.services} /></Card>
      <VerificationReview doctorId={doctorId} onChanged={reload} />
      <DiscoveryControls
        subjectName={item.displayName ?? "this doctor"}
        value={discovery}
        publish={() => publishDoctorPublicDiscovery(doctorId)}
        revoke={() => revokeDoctorPublicDiscovery(doctorId)}
        onChanged={reload}
      />
    </Page>
  );
}

function VerificationReview({
  doctorId,
  onChanged,
}: {
  doctorId: string;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<DoctorVerificationSubmission[] | null>(
    null,
  );
  const [evidence, setEvidence] = useState<
    Record<string, VerificationEvidence[]>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = () => {
    void listDoctorVerificationSubmissions(doctorId)
      .then(async (result) => {
        setItems(result.items);
        const values = await Promise.all(
          result.items.map(
            async (submission) =>
              [
                submission.id,
                (await listVerificationEvidence(submission.id)).items,
              ] as const,
          ),
        );
        setEvidence(Object.fromEntries(values));
      })
      .catch((cause) => setError(errorMessage(cause)));
  };
  useEffect(load, [doctorId]);
  async function review(
    submission: DoctorVerificationSubmission,
    decision: "approve" | "reject",
  ) {
    const rejectionReason =
      decision === "reject"
        ? window.prompt("Reason for rejection:")?.trim()
        : undefined;
    if (decision === "reject" && !rejectionReason) return;
    setBusy(submission.id);
    setError(null);
    try {
      if (decision === "approve")
        await approveDoctorVerification(submission.id);
      else await rejectDoctorVerification(submission.id, rejectionReason!);
      load();
      onChanged();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  }
  async function download(submissionId: string, item: VerificationEvidence) {
    setBusy(item.id);
    setError(null);
    try {
      const blob = await downloadVerificationEvidence(submissionId, item.id);
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = item.originalFilename;
      link.click();
      URL.revokeObjectURL(href);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  }
  if (error) return <ErrorState detail={error} />;
  if (!items) return <LoadingState label="Loading verification evidence…" />;
  return (
    <Card>
      <div className="card-heading">
        <div>
          <p className="eyebrow">Professional verification</p>
          <h2>Submitted evidence</h2>
        </div>
      </div>
      {items.length ? (
        items.map((submission) => (
          <section className="section" key={submission.id}>
            <p>
              <Badge tone={tone(submission.status)}>{submission.status}</Badge>{" "}
              Submitted {date(submission.submittedAt)}
            </p>
            <p className="muted">
              {submission.registrationAuthority} ·{" "}
              {submission.registrationJurisdiction} ·{" "}
              {submission.registrationIdentifier}
            </p>
            <ul>
              {(evidence[submission.id] ?? []).map((item) => (
                <li key={item.id}>
                  {item.originalFilename}{" "}
                  <small>
                    {item.contentType} · {item.byteSize} bytes
                  </small>
                  <Button
                    disabled={busy !== null}
                    variant="quiet"
                    onClick={() => void download(submission.id, item)}
                  >
                    Download
                  </Button>
                </li>
              ))}
            </ul>
            {submission.status === "PENDING" ? (
              <span className="row-actions">
                <Button
                  disabled={busy !== null}
                  onClick={() => void review(submission, "approve")}
                >
                  Approve
                </Button>
                <Button
                  disabled={busy !== null}
                  variant="secondary"
                  onClick={() => void review(submission, "reject")}
                >
                  Reject
                </Button>
              </span>
            ) : submission.rejectionReason ? (
              <p className="alert">Rejected: {submission.rejectionReason}</p>
            ) : null}
          </section>
        ))
      ) : (
        <EmptyState
          title="No verification submission"
          detail="This doctor has not submitted professional-registration evidence."
        />
      )}
    </Card>
  );
}

export function ClinicCreatedDoctorsPage() {
  const [items, setItems] = useState<ClinicCreatedDoctor[] | null>(null);
  const [clinics, setClinics] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [activationCooldowns, setActivationCooldowns] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const cooldownTimeouts = useRef<Record<string, number>>({});
  const load = useCallback(async () => {
    try {
      setError(null);
      const [pending, ready, clinicResult] = await Promise.all([
        listClinicCreatedDoctors(),
        listReadyClinicCreatedDoctors(),
        listPlatformClinics(),
      ]);
        setItems([...pending.items, ...ready.items]);
        setClinics(
          Object.fromEntries(
            clinicResult.items.map((clinic) => [clinic.id, clinic.displayName]),
          ),
        );
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }, []);
  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      listClinicCreatedDoctors(),
      listReadyClinicCreatedDoctors(),
      listPlatformClinics(),
    ])
      .then(([pending, ready, clinicResult]) => {
        if (cancelled) return;
        setItems([...pending.items, ...ready.items]);
        setClinics(
          Object.fromEntries(
            clinicResult.items.map((clinic) => [clinic.id, clinic.displayName]),
          ),
        );
      })
      .catch((cause) => {
        if (!cancelled) setError(errorMessage(cause));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(
    () => () => {
      Object.values(cooldownTimeouts.current).forEach((timeout) =>
        window.clearTimeout(timeout),
      );
    },
    [],
  );
  const beginActivationCooldown = useCallback((doctorId: string) => {
    const previousTimeout = cooldownTimeouts.current[doctorId];
    if (previousTimeout !== undefined) window.clearTimeout(previousTimeout);
    setActivationCooldowns((current) => ({ ...current, [doctorId]: true }));
    cooldownTimeouts.current[doctorId] = window.setTimeout(() => {
      delete cooldownTimeouts.current[doctorId];
      setActivationCooldowns((current) => ({ ...current, [doctorId]: false }));
    }, 60_000);
  }, []);
  async function review(
    item: ClinicCreatedDoctor,
    decision: "APPROVED" | "REJECTED",
  ) {
    const rejectionReason =
      decision === "REJECTED"
        ? window.prompt("Rejection reason:")?.trim()
        : undefined;
    if (decision === "REJECTED" && !rejectionReason) return;
    setBusy(item.id);
    setError(null);
    setNotice(null);
    setDeliveryError(null);
    try {
      const reviewed = await reviewClinicCreatedDoctor(
        item.id,
        decision,
        rejectionReason,
      );
      if (decision === "APPROVED") {
        try {
          await sendPasswordResetEmail(firebaseAuth(), reviewed.doctor.email);
          await recordClinicCreatedDoctorActivationEmail(reviewed.doctor.id, "REQUESTED");
          setNotice(
            "Doctor approved. Firebase sent the activation password-reset email.",
          );
        } catch (cause) {
          const code =
            typeof cause === "object" && cause !== null && "code" in cause
              ? String(cause.code)
              : "";
          try { await recordClinicCreatedDoctorActivationEmail(reviewed.doctor.id, "FAILED"); } catch { /* The approval and accepted activation request remain separately auditable. */ }
          setDeliveryError(code === "auth/user-not-found" ? "Doctor approved, but Firebase could not send the activation email. The account remains ready for resend." : "Doctor approved, but Firebase could not send the activation email. The account remains ready for resend.");
        }
      }
      void load();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  }
  async function resend(item: ClinicCreatedDoctor) {
    if (activationCooldowns[item.id]) return;
    setBusy(item.id); setError(null); setNotice(null); setDeliveryError(null);
    try {
      const response = await resendClinicCreatedDoctorActivation(item.id);
      beginActivationCooldown(item.id);
      try { await sendPasswordResetEmail(firebaseAuth(), response.doctor.email); await recordClinicCreatedDoctorActivationEmail(item.id, "REQUESTED"); setNotice("Firebase sent another activation password-reset email."); }
      catch { try { await recordClinicCreatedDoctorActivationEmail(item.id, "FAILED"); } catch { /* The accepted resend request remains auditable. */ } setDeliveryError("Firebase could not request the activation email. The account remains ready for resend."); }
    } catch (cause) { setError(errorMessage(cause)); } finally { setBusy(null); }
  }
  if (error) return <ErrorState detail={error} />;
  if (!items) return <LoadingState label="Loading clinic-created doctors…" />;
  const filteredItems = items.filter((item) => [item.displayName, item.email, item.specialization, clinics[item.clinicId] ?? ""].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <Page crumbs={["Platform Admin", "Clinic-created doctors"]}>
      <PageHeader eyebrow="Doctor onboarding" title="Clinic-created Doctors" description="Created by a clinic. Platform approval activates the existing account and relationship; it is not professional verification."><Search label="Search pending doctors or clinics" value={query} onChange={(event) => setQuery(event.target.value)} /></PageHeader>
      {process.env.NODE_ENV === "development" ? <EmailTesting /> : null}
      {notice ? <p className="alert">{notice}</p> : null}
      {deliveryError ? <p className="alert">{deliveryError}</p> : null}
      {filteredItems.length ? (
        <section className="cards">
          {filteredItems.map((item) => (
            <Card key={item.id}>
              <div className="card-heading">
                <div>
                  <p className="eyebrow">Created by Clinic</p>
                  <h2>{item.displayName}</h2>
                </div>
                <StatusBadge value={item.status} />
              </div>
              <dl className="detail-list">
                <dt>Clinic</dt>
                <dd>{clinics[item.clinicId] ?? item.clinicId}</dd>
                <dt>Email</dt>
                <dd>{item.email}</dd>
                <dt>Mobile</dt>
                <dd>{item.mobileNumber}</dd>
                <dt>Date of birth</dt>
                <dd>{item.dateOfBirth}</dd>
                <dt>Sex</dt>
                <dd>{item.sex}</dd>
                <dt>Specialization</dt>
                <dd>{item.specialization}</dd>
                <dt>Professional verification</dt>
                <dd>Not decided by this approval</dd>
              </dl>
              <p className="control-help">Platform status: {item.status === "PENDING" ? "Pending approval." : "Approved and ready for password setup."} This review does not professionally verify the doctor.</p>
              <span className="row-actions">
                {item.status === "PENDING" ? <><Button
                  disabled={busy !== null}
                  onClick={() => void review(item, "APPROVED")}
                >
                  {busy === item.id ? "Saving…" : "Approve"}
                </Button>
                <Button
                  disabled={busy !== null}
                  variant="secondary"
                  onClick={() => void review(item, "REJECTED")}
                >
                  Reject
                </Button></> : <Button disabled={busy !== null || activationCooldowns[item.id]} onClick={() => void resend(item)}>{busy === item.id ? "Sending…" : activationCooldowns[item.id] ? "Resend available shortly" : "Resend activation email"}</Button>}
              </span>
            </Card>
          ))}
        </section>
      ) : (
        <EmptyState title={query ? "No doctors match the current search" : "No pending clinic-created doctors"} detail={query ? "Try a different doctor, clinic, or specialization." : "Doctors created by clinics will appear here for Platform review."} />
      )}
    </Page>
  );
}

function EmailTesting() {
  const [emailType, setEmailType] = useState<"DOCTOR_ACTIVATION" | "DOCTOR_WELCOME">("DOCTOR_ACTIVATION");
  const [doctorName, setDoctorName] = useState("Dr. Abhishek Mohanty");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const valid = doctorName.trim().length > 0 && doctorName.trim().length <= 120 && !/[<>]/.test(doctorName) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim());
  async function send() { setBusy(true); setError(null); try { const result = await sendTransactionalEmailTest({ emailType, doctorName: doctorName.trim(), recipientEmail: recipientEmail.trim() }); setNotice(result.message); setConfirm(false); } catch { setError("Unable to send the test email. Please check the email configuration and try again."); setConfirm(false); } finally { setBusy(false); } }
  const label = emailType === "DOCTOR_ACTIVATION" ? "Doctor Activation" : "Doctor Welcome";
  return <Card><div className="card-heading"><div><p className="eyebrow">Development only</p><h2>Email Testing</h2></div></div><p className="control-help">Send a test copy of The CliniQ transactional email templates to a test mailbox. This does not affect any doctor account or onboarding state.</p><label>Email template<Select value={emailType} onChange={(event) => setEmailType(event.target.value as "DOCTOR_ACTIVATION" | "DOCTOR_WELCOME")}><option value="DOCTOR_ACTIVATION">Doctor Activation</option><option value="DOCTOR_WELCOME">Doctor Welcome</option></Select></label><label>Doctor name<Input value={doctorName} maxLength={120} onChange={(event) => setDoctorName(event.target.value)} /></label><label>Send test email to<Input type="email" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} /></label>{notice ? <p className="alert">{notice} Recipient: {recipientEmail.trim()} · Template: {label}</p> : null}{error ? <p className="alert">{error}</p> : null}<Button disabled={!valid || busy} onClick={() => setConfirm(true)}>Send Test Email</Button><ConfirmationDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={() => void send()}>Send a test copy of the current {label} template to {recipientEmail.trim()}. It does not activate an account, change a password, modify onboarding, or change professional verification.</ConfirmationDialog></Card>;
}

function DiscoveryControls({
  subjectName,
  value,
  publish,
  revoke,
  onChanged,
}: {
  subjectName: string;
  value: PublicDiscoveryControl;
  publish: () => Promise<unknown>;
  revoke: () => Promise<unknown>;
  onChanged: () => void;
}) {
  const [confirm, setConfirm] = useState<"publish" | "revoke" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const remove = value.status === "PUBLISHED";
  async function apply() {
    setBusy(true);
    setError(null);
    try {
      await (remove ? revoke() : publish());
      toast.show(
        remove
          ? "Removed from public discovery."
          : "Published to public discovery.",
      );
      setConfirm(null);
      onChanged();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="public-discovery-card">
      <div className="card-heading">
        <div>
          <p className="eyebrow">Public Discovery</p>
          <h2>Publication control</h2>
        </div>
        <Badge tone={tone(value.status)}>{value.status}</Badge>
      </div>
      <dl className="detail-list">
        <dt>Published services</dt>
        <dd>{value.publishedExposureCount}</dd>
        <dt>Readiness</dt>
        <dd>{value.reason ?? "Ready for publication."}</dd>
      </dl>
      <div className="platform-control">
        <Button
          disabled={value.status === "NOT_READY" || busy}
          onClick={() => setConfirm(remove ? "revoke" : "publish")}
        >
          {remove
            ? "Remove from Public Discovery"
            : "Publish to Public Discovery"}
        </Button>
        {value.status === "NOT_READY" ? (
          <p className="control-help">
            Cannot publish until at least one service exposure is active and has
            active availability.
          </p>
        ) : null}
      </div>
      {error ? <ErrorState detail={error} /> : null}
      <ConfirmationDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={() => void apply()}
      >
        {confirm === "revoke" ? (
          <>
            Remove {subjectName} from Public Discovery? This removes public
            discovery only; it does not delete services, availability,
            appointments, payments, or accounts.
          </>
        ) : (
          <>
            Publish {subjectName} to Public Discovery? Eligible services and
            availability will become visible through the public patient
            discovery experience.
          </>
        )}
      </ConfirmationDialog>
      <Toast message={toast.message} />
    </Card>
  );
}

export function DoctorApplicationsPage() {
  const [items, setItems] = useState<DoctorApplication[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  useEffect(() => {
    let cancelled = false;
    void listDoctorApplications()
      .then((result) => {
        if (!cancelled) setItems(result.items);
      })
      .catch((cause) => {
        if (!cancelled) setError(errorMessage(cause));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  if (error) return <ErrorState detail={error} />;
  if (!items) return <LoadingState label="Loading doctor applications…" />;
  const filteredItems = items.filter((item) => [item.displayName ?? "", item.profileStatus, item.professionalVerificationStatus].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <Page crumbs={["Platform Admin", "Doctor Applications"]}>
      <PageHeader eyebrow="Doctor onboarding" title="Doctor Applications" description="Review independent doctor applications. Professional verification remains a separate workflow."><Search label="Search applications" value={query} onChange={(event) => setQuery(event.target.value)} /></PageHeader>
      <Card>
        {filteredItems.length ? (
          <Table
            headers={[
              "Applicant",
              "Profile status",
              "Professional verification",
              "Submitted",
              "Review",
            ]}
          >
            {filteredItems.map((application) => (
              <tr key={application.id}>
                <td>
                  <Link
                    href={`/platform/doctor-applications/${application.id}`}
                  >
                    {application.displayName ?? "Unnamed doctor"}
                  </Link>
                  <small>{application.doctorProfileId}</small>
                </td>
                <td>
                  <StatusBadge value={application.profileStatus} />
                </td>
                <td>
                  <StatusBadge value={application.professionalVerificationStatus} />
                </td>
                <td>{date(application.submittedAt)}</td>
                <td>
                  <Link
                    className="table-action"
                    href={`/platform/doctor-applications/${application.id}`}
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title={query ? "No applications match the current search" : "No pending doctor applications"} detail={query ? "Try another applicant name or status." : "New independent doctor applications will appear here for Platform Admin review."} />
        )}
      </Card>
    </Page>
  );
}

export function DoctorApplicationDetails({
  applicationId,
}: {
  applicationId: string;
}) {
  const [item, setItem] = useState<DoctorApplication | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const reload = useCallback(async () => {
    try {
      setError(null);
      setItem((await getDoctorApplication(applicationId)).application);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }, [applicationId]);
  useEffect(() => {
    let cancelled = false;
    void getDoctorApplication(applicationId)
      .then((result) => {
        if (cancelled) return;
        setError(null);
        setItem(result.application);
      })
      .catch((cause) => {
        if (!cancelled) setError(errorMessage(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [applicationId]);
  async function approve() {
    await approveDoctorApplication(applicationId);
  }
  async function reject(rejectionReason: string) {
    await rejectDoctorApplication(applicationId, rejectionReason);
  }
  if (error) return <ErrorState detail={error} />;
  if (!item) return <LoadingState label="Loading doctor application…" />;
  const name = item.displayName ?? "Unnamed doctor";
  return (
    <Page crumbs={["Platform Admin", "Doctor Applications", name]}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Doctor onboarding</p>
          <h1>{name}</h1>
          <p>Application review is separate from professional verification.</p>
        </div>
      </div>
      <Card>
        <dl className="detail-list">
          <dt>Application status</dt>
          <dd>
            <Badge tone={tone(item.status)}>{item.status}</Badge>
          </dd>
          <dt>Doctor profile</dt>
          <dd>{item.doctorProfileId}</dd>
          <dt>Applicant account</dt>
          <dd>{item.doctorAccountId}</dd>
          <dt>Profile status</dt>
          <dd>
            <Badge tone={tone(item.profileStatus)}>{item.profileStatus}</Badge>
          </dd>
          <dt>Professional verification</dt>
          <dd>
            <Badge tone={tone(item.professionalVerificationStatus)}>
              {item.professionalVerificationStatus}
            </Badge>
          </dd>
          <dt>Submitted</dt>
          <dd>{date(item.submittedAt)}</dd>
          <dt>Reviewed</dt>
          <dd>{date(item.reviewedAt)}</dd>
        </dl>
        {item.rejectionReason ? (
          <p className="alert">Rejection reason: {item.rejectionReason}</p>
        ) : null}
      </Card>
      <ApplicationDecisionActions
        status={item.status}
        approvedNote="Application approval activates the existing doctor profile but does not complete professional verification. Review verification separately under Doctors / Verification."
        onApprove={approve}
        onReject={reject}
        onChanged={reload}
        toast={toast}
      />
      <Toast message={toast.message} />
    </Page>
  );
}

export function ClinicApplicationsPage() {
  const [items, setItems] = useState<ClinicApplication[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  useEffect(() => {
    let cancelled = false;
    void listClinicApplications()
      .then((result) => {
        if (!cancelled) setItems(result.items);
      })
      .catch((cause) => {
        if (!cancelled) setError(errorMessage(cause));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  if (error) return <ErrorState detail={error} />;
  if (!items) return <LoadingState label="Loading clinic applications…" />;
  const filteredItems = items.filter((item) => [item.clinicName, item.legalName, item.ownerEmail, item.status].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <Page crumbs={["Platform Admin", "Clinic Applications"]}>
      <PageHeader eyebrow="Clinic onboarding" title="Clinic Applications" description="Review clinic applications before the existing owner-invitation lifecycle begins."><Search label="Search clinics or owners" value={query} onChange={(event) => setQuery(event.target.value)} /></PageHeader>
      <Card>
        {filteredItems.length ? (
          <Table
            headers={[
              "Clinic",
              "Owner email",
              "Legal name",
              "Submitted",
              "Review",
            ]}
          >
            {filteredItems.map((application) => (
              <tr key={application.id}>
                <td>
                  <Link
                    href={`/platform/clinic-applications/${application.id}`}
                  >
                    {application.clinicName}
                  </Link>
                </td>
                <td>{application.ownerEmail}</td>
                <td>{application.legalName}</td>
                <td>{date(application.submittedAt)}</td>
                <td>
                  <Link
                    className="table-action"
                    href={`/platform/clinic-applications/${application.id}`}
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title={query ? "No applications match the current search" : "No pending clinic applications"} detail={query ? "Try another clinic, owner, or legal name." : "New clinic applications will appear here for Platform Admin review."} />
        )}
      </Card>
    </Page>
  );
}

export function ClinicApplicationDetails({
  applicationId,
}: {
  applicationId: string;
}) {
  const [item, setItem] = useState<ClinicApplication | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const reload = useCallback(async () => {
    try {
      setError(null);
      setItem((await getClinicApplication(applicationId)).application);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }, [applicationId]);
  useEffect(() => {
    let cancelled = false;
    void getClinicApplication(applicationId)
      .then((result) => {
        if (cancelled) return;
        setError(null);
        setItem(result.application);
      })
      .catch((cause) => {
        if (!cancelled) setError(errorMessage(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [applicationId]);
  async function approve() {
    await approveClinicApplication(applicationId);
  }
  async function reject(rejectionReason: string) {
    await rejectClinicApplication(applicationId, rejectionReason);
  }
  if (error) return <ErrorState detail={error} />;
  if (!item) return <LoadingState label="Loading clinic application…" />;
  return (
    <Page crumbs={["Platform Admin", "Clinic Applications", item.clinicName]}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Clinic onboarding</p>
          <h1>{item.clinicName}</h1>
          <p>
            Application review starts the existing clinic-owner onboarding
            lifecycle.
          </p>
        </div>
      </div>
      <Card>
        <dl className="detail-list">
          <dt>Application status</dt>
          <dd>
            <Badge tone={tone(item.status)}>{item.status}</Badge>
          </dd>
          <dt>Legal name</dt>
          <dd>{item.legalName}</dd>
          <dt>Owner email</dt>
          <dd>{item.ownerEmail}</dd>
          <dt>Applicant account</dt>
          <dd>{item.applicantAccountId}</dd>
          <dt>Submitted</dt>
          <dd>{date(item.submittedAt)}</dd>
          <dt>Reviewed</dt>
          <dd>{date(item.reviewedAt)}</dd>
        </dl>
        {item.rejectionReason ? (
          <p className="alert">Rejection reason: {item.rejectionReason}</p>
        ) : null}
      </Card>
      <ApplicationDecisionActions
        status={item.status}
        approvedNote="Approval creates the existing DRAFT clinic and owner invitation flow. Clinic activation and Public Discovery approval remain separate Platform Admin actions."
        onApprove={approve}
        onReject={reject}
        onChanged={reload}
        toast={toast}
      />
      <Toast message={toast.message} />
    </Page>
  );
}

function ApplicationDecisionActions({
  status,
  approvedNote,
  onApprove,
  onReject,
  onChanged,
  toast,
}: {
  status: "PENDING" | "APPROVED" | "REJECTED";
  approvedNote: string;
  onApprove: () => Promise<void>;
  onReject: (rejectionReason: string) => Promise<void>;
  onChanged: () => Promise<void>;
  toast: ReturnType<typeof useToast>;
}) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function review(decision: "approve" | "reject") {
    if (decision === "reject" && !rejectionReason.trim()) {
      setError("A rejection reason is required.");
      return;
    }
    setBusy(decision);
    setError(null);
    try {
      if (decision === "approve") await onApprove();
      else await onReject(rejectionReason.trim());
      await onChanged();
      toast.show(
        decision === "approve"
          ? "Application approved."
          : "Application rejected.",
      );
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  }
  if (status !== "PENDING")
    return (
      <Card>
        <p className="control-help">
          {status === "APPROVED"
            ? approvedNote
            : "This application was rejected. The applicant may resubmit through the existing application lifecycle."}
        </p>
      </Card>
    );
  return (
    <Card>
      <div className="card-heading">
        <div>
          <p className="eyebrow">Application review</p>
          <h2>Pending decision</h2>
        </div>
        <Badge tone="warning">PENDING</Badge>
      </div>
      <p className="control-help">
        Approve only after reviewing the authoritative application details.
        Rejection requires a reason.
      </p>
      <label>
        Rejection reason
        <textarea
          className="input"
          value={rejectionReason}
          onChange={(event) => setRejectionReason(event.target.value)}
          disabled={busy !== null}
        />
      </label>
      <span className="row-actions">
        <Button disabled={busy !== null} onClick={() => void review("approve")}>
          {busy === "approve" ? "Approving…" : "Approve application"}
        </Button>
        <Button
          disabled={busy !== null}
          variant="secondary"
          onClick={() => void review("reject")}
        >
          {busy === "reject" ? "Rejecting…" : "Reject application"}
        </Button>
      </span>
      {error ? <ErrorState detail={error} /> : null}
    </Card>
  );
}

function Table({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={`${header}-${index}`}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function EmptyRow({ columns, label }: { columns: number; label: string }) {
  return (
    <tr>
      <td colSpan={columns}>{label}</td>
    </tr>
  );
}
function InvitationTable({
  kind,
  items,
  onRefresh,
  onError,
}:
  | {
      kind: "owner";
      items: OwnerInvitation[];
      onRefresh: () => void;
      onError: (message: string | null) => void;
    }
  | {
      kind: "doctor";
      items: PlatformDoctorInvitation[];
      onRefresh: () => void;
      onError: (message: string | null) => void;
    }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const toast = useToast();
  const action = async (id: string, operation: "resend" | "revoke") => {
    setBusy(id);
    onError(null);
    try {
      if (kind === "owner") {
        if (operation === "resend") {
          const result = await resendOwnerInvitation(id);
          setLink(result.invitationUrl);
          toast.show(
            "New link generated. The previous link is no longer usable.",
          );
        } else await revokeOwnerInvitation(id);
      } else
        await (operation === "resend"
          ? resendDoctorInvitation(id)
          : revokeDoctorInvitation(id));
      onRefresh();
    } catch (cause) {
      onError(errorMessage(cause));
    } finally {
      setBusy(null);
      setRevokeId(null);
    }
  };
  const filteredItems = items.filter((item) => [item.email ?? "", item.status].join(" ").toLowerCase().includes(query.trim().toLowerCase()) && (!status || item.status === status));
  return (
    <Card>
      {link ? (
        <section className="generated-link">
          <strong>New clinic owner invitation link</strong>
          <Input value={link} readOnly aria-label="Generated invitation link" />
          <span className="row-actions">
            <Button
              variant="secondary"
              onClick={() =>
                void navigator.clipboard
                  .writeText(link)
                  .then(() => toast.show("Invitation link copied."))
              }
            >
              Copy link
            </Button>
            <a
              className="button button--secondary"
              href={link}
              target="_blank"
              rel="noreferrer"
            >
              Open
            </a>
          </span>
          <small>Generating a new link invalidates the previous link.</small>
        </section>
      ) : null}
      <Filters><Search label="Search invitations" value={query} onChange={(event) => setQuery(event.target.value)} /><Select aria-label="Filter invitation status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="INVITED">Invited</option><option value="ACCEPTED">Accepted</option><option value="REVOKED">Revoked</option><option value="EXPIRED">Expired</option></Select></Filters>
      <Table
        headers={[
          "Type",
          "Recipient",
          "Status",
          "Created",
          "Expiry",
          "Actions",
        ]}
      >
        {filteredItems.length ? (
          filteredItems.map((item) => (
            <tr key={item.id}>
              <td>{kind === "owner" ? "Clinic owner" : "Doctor"}</td>
              <td>{item.email}</td>
              <td>
                <StatusBadge value={item.status} />
                {item.acceptedAt ? (
                  <small>Accepted {date(item.acceptedAt)}</small>
                ) : null}
              </td>
              <td>{date(item.createdAt)}</td>
              <td>{date(item.expiresAt)}</td>
              <td>
                {item.status === "INVITED" ? (
                  <span className="row-actions">
                    <Button
                      variant="quiet"
                      disabled={busy === item.id}
                      onClick={() => void action(item.id, "resend")}
                    >
                      {kind === "owner" ? "Generate new link" : "Resend"}
                    </Button>
                    <Button
                      variant="quiet"
                      disabled={busy === item.id}
                      onClick={() => setRevokeId(item.id)}
                    >
                      Revoke
                    </Button>
                  </span>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))
        ) : (
          <EmptyRow columns={6} label={query || status ? "No invitations match the current filters." : "No invitations are available."} />
        )}
      </Table>
      <ConfirmationDialog
        open={revokeId !== null}
        onClose={() => setRevokeId(null)}
        onConfirm={() => {
          if (revokeId) void action(revokeId, "revoke");
        }}
      >
        Revoke this invitation? The invitation link will no longer be usable.
      </ConfirmationDialog>
      <Toast message={toast.message} />
    </Card>
  );
}
function DoctorInviteForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const created = await inviteDoctor({
        email,
        ...(displayName.trim() ? { displayName } : {}),
      });
      setResult(
        `Doctor invitation created for ${created.invitation.email}. Its status is now available in Doctor Invitations.`,
      );
      onCreated();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }
  return (
    <Card className="invite-form">
      <h2>Invite doctor</h2>
      <form onSubmit={(event) => void submit(event)}>
        <label>
          Doctor name
          <Input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </label>
        <label>
          Email address
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <span className="row-actions">
          <Button type="submit">Create invitation</Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </span>
      </form>
      {result ? <p className="alert">{result}</p> : null}
      {error ? <ErrorState detail={error} /> : null}
    </Card>
  );
}
