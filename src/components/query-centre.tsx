"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  approveClinicApplication,
  approveDoctorApplication,
  getEnquiryStats,
  listClinicApplications,
  listDoctorApplications,
  listEnquiries,
  rejectClinicApplication,
  rejectDoctorApplication,
  updateEnquiryStatus,
  type ClinicApplication,
  type DoctorApplication,
  type Enquiry,
  type EnquiryStats,
  type EnquiryStatus,
} from "../lib/platform-api/platform-admin";
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  PageHeader,
  Select,
  statusTone,
  Toast,
  useToast,
} from "./ui";

type QueryTab = "ALL" | "DEMO" | "DOCTOR_APPS" | "CLINIC_APPS" | "PARTNER" | "CAREER";

type UnifiedRecord = {
  id: string;
  source: "ENQUIRY" | "DOCTOR_APP" | "CLINIC_APP";
  referenceId: string;
  typeLabel: string;
  typeTone: "neutral" | "warning" | "success" | "danger";
  name: string;
  email: string;
  phone: string | null;
  submittedAt: string;
  status: string;
  statusTone: "neutral" | "warning" | "success" | "danger";
  messageSnippet: string;
  rawEnquiry?: Enquiry;
  rawDoctorApp?: DoctorApplication;
  rawClinicApp?: ClinicApplication;
};

export function QueryCentre() {
  const [tab, setTab] = useState<QueryTab>("ALL");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [stats, setStats] = useState<EnquiryStats | null>(null);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [doctorApps, setDoctorApps] = useState<DoctorApplication[]>([]);
  const [clinicApps, setClinicApps] = useState<ClinicApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<UnifiedRecord | null>(null);

  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<EnquiryStatus>("NEW");
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);

  const toast = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, enqRes, docRes, clnRes] = await Promise.all([
        getEnquiryStats().catch(() => null),
        listEnquiries({ limit: 100 }),
        listDoctorApplications({ status: "ALL" }).catch(() => ({ items: [] })),
        listClinicApplications({ status: "ALL" }).catch(() => ({ items: [] })),
      ]);

      if (statsRes) setStats(statsRes);
      setEnquiries(enqRes.items);
      setDoctorApps(docRes.items);
      setClinicApps(clnRes.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  const unifiedRecords = useMemo((): UnifiedRecord[] => {
    const list: UnifiedRecord[] = [];

    // Enquiries
    for (const e of enquiries) {
      let typeLabel = "General Enquiry";
      let typeTone: UnifiedRecord["typeTone"] = "neutral";
      if (e.type === "DEMO_DOCTOR") {
        typeLabel = "Demo (Doctor)";
        typeTone = "neutral";
      } else if (e.type === "DEMO_CLINIC") {
        typeLabel = "Demo (Clinic)";
        typeTone = "neutral";
      } else if (e.type === "CAREER") {
        typeLabel = "Career Enquiry";
        typeTone = "warning";
      } else if (e.type === "PARTNER") {
        typeLabel = "Partner Enquiry";
        typeTone = "success";
      }

      const sTone = statusTone(e.status);

      list.push({
        id: e.id,
        source: "ENQUIRY",
        referenceId: e.referenceNo,
        typeLabel,
        typeTone,
        name: e.name,
        email: e.email,
        phone: e.mobile,
        submittedAt: e.submittedAt,
        status: e.status,
        statusTone: sTone,
        messageSnippet: e.message,
        rawEnquiry: e,
      });
    }

    // Doctor applications
    for (const d of doctorApps) {
      const sTone = statusTone(d.status);

      list.push({
        id: d.id,
        source: "DOCTOR_APP",
        referenceId: `DOC-${d.id.slice(0, 8).toUpperCase()}`,
        typeLabel: "Doctor Application",
        typeTone: "neutral",
        name: d.displayName ?? "Doctor Applicant",
        email: "Profile: " + d.doctorProfileId.slice(0, 8),
        phone: null,
        submittedAt: d.submittedAt,
        status: d.status,
        statusTone: sTone,
        messageSnippet: `Doctor onboarding application. Status: ${d.status}. Profile verification: ${d.professionalVerificationStatus}`,
        rawDoctorApp: d,
      });
    }

    // Clinic applications
    for (const c of clinicApps) {
      const sTone = statusTone(c.status);

      list.push({
        id: c.id,
        source: "CLINIC_APP",
        referenceId: `CLN-${c.id.slice(0, 8).toUpperCase()}`,
        typeLabel: "Clinic Application",
        typeTone: "neutral",
        name: c.clinicName,
        email: c.ownerEmail,
        phone: null,
        submittedAt: c.submittedAt,
        status: c.status,
        statusTone: sTone,
        messageSnippet: `Clinic onboarding for ${c.clinicName} (Legal: ${c.legalName}).`,
        rawClinicApp: c,
      });
    }

    // Sort by submittedAt descending
    return list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [enquiries, doctorApps, clinicApps]);

  const filteredRecords = useMemo(() => {
    return unifiedRecords.filter((r) => {
      // Tab filter
      if (tab === "DEMO" && !r.typeLabel.startsWith("Demo")) return false;
      if (tab === "DOCTOR_APPS" && r.source !== "DOCTOR_APP") return false;
      if (tab === "CLINIC_APPS" && r.source !== "CLINIC_APP") return false;
      if (tab === "PARTNER" && r.typeLabel !== "Partner Enquiry") return false;
      if (tab === "CAREER" && r.typeLabel !== "Career Enquiry") return false;

      // Status filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "PENDING" && r.status !== "PENDING" && r.status !== "NEW") return false;
        else if (statusFilter === "RESOLVED" && r.status !== "RESOLVED" && r.status !== "APPROVED") return false;
        else if (statusFilter === "CLOSED" && r.status !== "CLOSED" && r.status !== "REJECTED") return false;
        else if (statusFilter !== "PENDING" && statusFilter !== "RESOLVED" && statusFilter !== "CLOSED" && r.status !== statusFilter) return false;
      }

      // Search filter
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matches =
          r.referenceId.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          (r.phone && r.phone.toLowerCase().includes(q)) ||
          r.typeLabel.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [unifiedRecords, tab, statusFilter, search]);

  const openRecord = (rec: UnifiedRecord) => {
    setSelectedRecord(rec);
    setShowRejectBox(false);
    setRejectionReason("");
    if (rec.rawEnquiry) {
      setNewStatus(rec.rawEnquiry.status);
      setAdminNotes(rec.rawEnquiry.adminNotes ?? "");
    }
  };

  const handleUpdateEnquiry = async () => {
    if (!selectedRecord || !selectedRecord.rawEnquiry) return;
    setUpdating(true);
    try {
      const res = await updateEnquiryStatus(selectedRecord.id, newStatus, adminNotes);
      toast.show("Enquiry updated successfully.");
      setEnquiries((prev) => prev.map((e) => (e.id === res.enquiry.id ? res.enquiry : e)));
      setSelectedRecord((prev) => (prev ? { ...prev, status: res.enquiry.status, rawEnquiry: res.enquiry } : null));
      void loadData();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to update enquiry");
    } finally {
      setUpdating(false);
    }
  };

  const handleApproveDoctor = async (id: string) => {
    setUpdating(true);
    try {
      const res = await approveDoctorApplication(id);
      toast.show("Doctor application approved successfully.");
      setDoctorApps((prev) => prev.map((d) => (d.id === id ? res.application : d)));
      setSelectedRecord((prev) => prev ? { ...prev, status: "APPROVED", rawDoctorApp: res.application } : null);
      void loadData();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to approve application");
    } finally {
      setUpdating(false);
    }
  };

  const handleRejectDoctor = async (id: string) => {
    if (!rejectionReason.trim()) {
      toast.show("Please enter a reason for rejection.");
      return;
    }
    setUpdating(true);
    try {
      const res = await rejectDoctorApplication(id, rejectionReason.trim());
      toast.show("Doctor application rejected.");
      setDoctorApps((prev) => prev.map((d) => (d.id === id ? res.application : d)));
      setSelectedRecord((prev) => prev ? { ...prev, status: "REJECTED", rawDoctorApp: res.application } : null);
      setShowRejectBox(false);
      void loadData();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to reject application");
    } finally {
      setUpdating(false);
    }
  };

  const handleApproveClinic = async (id: string) => {
    setUpdating(true);
    try {
      const res = await approveClinicApplication(id);
      toast.show("Clinic application approved successfully.");
      setClinicApps((prev) => prev.map((c) => (c.id === id ? res.application : c)));
      setSelectedRecord((prev) => prev ? { ...prev, status: "APPROVED", rawClinicApp: res.application } : null);
      void loadData();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to approve application");
    } finally {
      setUpdating(false);
    }
  };

  const handleRejectClinic = async (id: string) => {
    if (!rejectionReason.trim()) {
      toast.show("Please enter a reason for rejection.");
      return;
    }
    setUpdating(true);
    try {
      const res = await rejectClinicApplication(id, rejectionReason.trim());
      toast.show("Clinic application rejected.");
      setClinicApps((prev) => prev.map((c) => (c.id === id ? res.application : c)));
      setSelectedRecord((prev) => prev ? { ...prev, status: "REJECTED", rawClinicApp: res.application } : null);
      setShowRejectBox(false);
      void loadData();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to reject application");
    } finally {
      setUpdating(false);
    }
  };

  // KPI Calculations
  const totalQueriesCount = unifiedRecords.length;
  const newOrPendingCount = unifiedRecords.filter((r) => r.status === "NEW" || r.status === "PENDING").length;
  const inProgressCount = unifiedRecords.filter((r) => r.status === "UNDER_REVIEW" || r.status === "IN_PROGRESS").length;
  const resolvedOrApprovedCount = unifiedRecords.filter((r) => r.status === "RESOLVED" || r.status === "APPROVED").length;
  const demoRequestsCount = stats ? (stats.demoDoctor + stats.demoClinic) : enquiries.filter((e) => e.type.startsWith("DEMO")).length;
  const doctorAppsCount = stats?.doctorApplications ?? doctorApps.length;
  const clinicAppsCount = stats?.clinicApplications ?? clinicApps.length;
  const careerEnquiriesCount = stats?.career ?? enquiries.filter((e) => e.type === "CAREER").length;

  return (
    <div className="page-shell">
      <Toast message={toast.message} />
      <PageHeader
        eyebrow="Business Development"
        title="Query Centre"
        description="Centralized administrative repository for Book a Demo inquiries, provider onboarding applications, and career submissions."
        action={
          <Button variant="secondary" onClick={loadData} disabled={loading}>
            {loading ? "Refreshing…" : "↻ Refresh Data"}
          </Button>
        }
      />

      {/* KPI Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Card>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted, #64748b)" }}>Total Pipeline</p>
          <h3 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 700 }}>{totalQueriesCount}</h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted, #64748b)" }}>All queries &amp; applications</p>
        </Card>
        <Card>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted, #64748b)" }}>New / Pending</p>
          <h3 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 700, color: "var(--accent-blue, #2563eb)" }}>
            {newOrPendingCount}
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--accent-blue, #2563eb)" }}>Awaiting initial review</p>
        </Card>
        <Card>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted, #64748b)" }}>In Progress / Review</p>
          <h3 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 700, color: "var(--warning-amber, #d97706)" }}>
            {inProgressCount}
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--warning-amber, #d97706)" }}>Active discussions</p>
        </Card>
        <Card>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted, #64748b)" }}>Resolved / Approved</p>
          <h3 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 700, color: "var(--success-green, #16a34a)" }}>
            {resolvedOrApprovedCount}
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--success-green, #16a34a)" }}>Successfully closed</p>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <div style={{ padding: "12px 16px", background: "var(--card-bg, #ffffff)", borderRadius: 8, border: "1px solid var(--border-color, #e2e8f0)" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted, #64748b)" }}>Demo Requests</span>
          <strong style={{ display: "block", fontSize: 20, marginTop: 2 }}>{demoRequestsCount}</strong>
        </div>
        <div style={{ padding: "12px 16px", background: "var(--card-bg, #ffffff)", borderRadius: 8, border: "1px solid var(--border-color, #e2e8f0)" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted, #64748b)" }}>Doctor Apps</span>
          <strong style={{ display: "block", fontSize: 20, marginTop: 2 }}>{doctorAppsCount}</strong>
        </div>
        <div style={{ padding: "12px 16px", background: "var(--card-bg, #ffffff)", borderRadius: 8, border: "1px solid var(--border-color, #e2e8f0)" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted, #64748b)" }}>Clinic Apps</span>
          <strong style={{ display: "block", fontSize: 20, marginTop: 2 }}>{clinicAppsCount}</strong>
        </div>
        <div style={{ padding: "12px 16px", background: "var(--card-bg, #ffffff)", borderRadius: 8, border: "1px solid var(--border-color, #e2e8f0)" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted, #64748b)" }}>Career Enquiries</span>
          <strong style={{ display: "block", fontSize: 20, marginTop: 2 }}>{careerEnquiriesCount}</strong>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <Card>
        <div style={{ borderBottom: "1px solid var(--border-color, #e2e8f0)", padding: "4px 8px 0", display: "flex", gap: 8, overflowX: "auto" }}>
          {[
            { key: "ALL", label: `All Queries (${unifiedRecords.length})` },
            { key: "DEMO", label: `Demo Requests (${demoRequestsCount})` },
            { key: "DOCTOR_APPS", label: `Doctor Applications (${doctorAppsCount})` },
            { key: "CLINIC_APPS", label: `Clinic Applications (${clinicAppsCount})` },
            { key: "PARTNER", label: `Partner Enquiries (${enquiries.filter((e) => e.type === "PARTNER").length})` },
            { key: "CAREER", label: `Career Enquiries (${careerEnquiriesCount})` },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key as QueryTab)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: tab === t.key ? "2px solid #2563eb" : "2px solid transparent",
                color: tab === t.key ? "#2563eb" : "var(--text-muted, #64748b)",
                fontWeight: tab === t.key ? 600 : 500,
                padding: "10px 14px",
                cursor: "pointer",
                fontSize: 14,
                whiteSpace: "nowrap",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter / Search Bar */}
        <div style={{ padding: "12px 8px", borderBottom: "1px solid var(--border-color, #e2e8f0)", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <Input
              placeholder="Search by ID, name, email, phone, or type…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ width: 180 }}>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New</option>
              <option value="PENDING">Pending Review</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved / Approved</option>
              <option value="CLOSED">Closed / Rejected</option>
            </Select>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div style={{ padding: 48 }}>
            <LoadingState label="Loading central query pipeline…" />
          </div>
        ) : error ? (
          <div style={{ padding: 32 }}>
            <ErrorState detail={error} />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ padding: 48 }}>
            <EmptyState
              title="No records found"
              detail={search ? "No queries matched your search criteria." : "No queries in this section currently."}
            />
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "var(--table-header-bg, #f8fafc)", borderBottom: "1px solid var(--border-color, #e2e8f0)" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Reference</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Type</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Applicant / Contact</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Submitted</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r) => (
                  <tr
                    key={`${r.source}-${r.id}`}
                    style={{ borderBottom: "1px solid var(--border-color, #f1f5f9)", cursor: "pointer" }}
                    onClick={() => openRecord(r)}
                  >
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontWeight: 600, color: "#2563eb" }}>
                      {r.referenceId}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <Badge tone={r.typeTone}>{r.typeLabel}</Badge>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <strong style={{ display: "block" }}>{r.name}</strong>
                      <span style={{ fontSize: 12, color: "var(--text-muted, #64748b)" }}>
                        {r.email} {r.phone ? `• ${r.phone}` : ""}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-muted, #64748b)" }}>
                      {new Date(r.submittedAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <Badge tone={r.statusTone}>{r.status}</Badge>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <Button
                        variant="quiet"
                        onClick={(e) => {
                          e.stopPropagation();
                          openRecord(r);
                        }}
                      >
                        Inspect →
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Detail Slide-out Drawer */}
      <Drawer
        open={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        title={selectedRecord ? `${selectedRecord.typeLabel} — ${selectedRecord.referenceId}` : "Record Details"}
        placement="right"
        size="lg"
      >
        {selectedRecord && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: 12, textTransform: "uppercase", color: "#93c5fd", fontWeight: 700, letterSpacing: "0.06em" }}>
                {selectedRecord.typeLabel}
              </p>
              <h2 style={{ margin: "0 0 8px", fontSize: 22, color: "#ffffff", fontWeight: 700 }}>{selectedRecord.referenceId}</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <Badge tone={selectedRecord.typeTone}>{selectedRecord.typeLabel}</Badge>
                <Badge tone={selectedRecord.statusTone}>{selectedRecord.status}</Badge>
              </div>
            </div>

            <Card>
              <h4 style={{ margin: "0 0 12px", fontSize: 15 }}>Contact &amp; Applicant Details</h4>
              <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "110px 1fr", gap: "8px 12px", fontSize: 13 }}>
                <dt style={{ color: "var(--text-muted, #64748b)" }}>Name</dt>
                <dd style={{ margin: 0, fontWeight: 600 }}>{selectedRecord.name}</dd>

                <dt style={{ color: "var(--text-muted, #64748b)" }}>Email</dt>
                <dd style={{ margin: 0 }}>{selectedRecord.email}</dd>

                {selectedRecord.phone && (
                  <>
                    <dt style={{ color: "var(--text-muted, #64748b)" }}>Mobile</dt>
                    <dd style={{ margin: 0 }}>{selectedRecord.phone}</dd>
                  </>
                )}

                <dt style={{ color: "var(--text-muted, #64748b)" }}>Submitted</dt>
                <dd style={{ margin: 0 }}>
                  {new Date(selectedRecord.submittedAt).toLocaleString("en-IN")}
                </dd>
              </dl>
            </Card>

            <Card>
              <h4 style={{ margin: "0 0 8px", fontSize: 15 }}>Requirements / Message Details</h4>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", background: "var(--bg-subtle, #f8fafc)", padding: 12, borderRadius: 6 }}>
                {selectedRecord.rawEnquiry?.message ?? selectedRecord.messageSnippet}
              </p>
            </Card>

            {/* Actions for Enquiries */}
            {selectedRecord.source === "ENQUIRY" && selectedRecord.rawEnquiry && (
              <Card>
                <h4 style={{ margin: "0 0 12px", fontSize: 15 }}>Enquiry Status Management</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, marginBottom: 4, fontWeight: 500 }}>
                      Change Status
                    </label>
                    <Select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as EnquiryStatus)}
                    >
                      <option value="NEW">NEW</option>
                      <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="CLOSED">CLOSED</option>
                    </Select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, marginBottom: 4, fontWeight: 500 }}>
                      Admin Notes &amp; Follow-up
                    </label>
                    <textarea
                      style={{
                        width: "100%",
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid var(--border-color, #cbd5e1)",
                        fontSize: 13,
                        minHeight: 80,
                        fontFamily: "inherit",
                      }}
                      placeholder="Add internal notes about conversation, demo scheduling, or resolution…"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                    />
                  </div>

                  <Button
                    variant="primary"
                    onClick={handleUpdateEnquiry}
                    disabled={updating}
                  >
                    {updating ? "Saving Changes…" : "Update Enquiry Status"}
                  </Button>
                </div>
              </Card>
            )}

            {/* Actions for Doctor Applications */}
            {selectedRecord.source === "DOCTOR_APP" && selectedRecord.rawDoctorApp && (
              <Card>
                <h4 style={{ margin: "0 0 12px", fontSize: 15 }}>Application Decision</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted, #64748b)" }}>
                    Approve or reject this independent doctor application. Approval activates the provider profile within the governed CliniQ platform.
                  </p>

                  {selectedRecord.status === "PENDING" && (
                    <>
                      <div style={{ display: "flex", gap: 10 }}>
                        <Button
                          variant="primary"
                          onClick={() => handleApproveDoctor(selectedRecord.id)}
                          disabled={updating}
                        >
                          {updating ? "Processing…" : "✓ Approve Application"}
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => setShowRejectBox(true)}
                          disabled={updating}
                        >
                          Reject Application…
                        </Button>
                      </div>

                      {showRejectBox && (
                        <div style={{ padding: 12, background: "#fef2f2", borderRadius: 6, border: "1px solid #fecaca" }}>
                          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#991b1b", marginBottom: 6 }}>
                            Reason for Rejection *
                          </label>
                          <textarea
                            style={{
                              width: "100%",
                              padding: 8,
                              borderRadius: 6,
                              border: "1px solid #fca5a5",
                              fontSize: 13,
                              minHeight: 70,
                              fontFamily: "inherit",
                            }}
                            placeholder="State clear reason for doctor applicant to review…"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                          />
                          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                            <Button
                              variant="danger"
                              onClick={() => handleRejectDoctor(selectedRecord.id)}
                              disabled={updating}
                            >
                              Confirm Rejection
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => setShowRejectBox(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div style={{ marginTop: 8 }}>
                    <Link
                      href={`/platform/doctor-applications/${selectedRecord.id}`}
                      style={{ fontSize: 13, color: "#2563eb", textDecoration: "underline" }}
                    >
                      Open dedicated Doctor Application workspace →
                    </Link>
                  </div>
                </div>
              </Card>
            )}

            {/* Actions for Clinic Applications */}
            {selectedRecord.source === "CLINIC_APP" && selectedRecord.rawClinicApp && (
              <Card>
                <h4 style={{ margin: "0 0 12px", fontSize: 15 }}>Clinic Application Decision</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted, #64748b)" }}>
                    Approve or reject this clinic application. Approval starts the official clinic owner onboarding workflow.
                  </p>

                  {selectedRecord.status === "PENDING" && (
                    <>
                      <div style={{ display: "flex", gap: 10 }}>
                        <Button
                          variant="primary"
                          onClick={() => handleApproveClinic(selectedRecord.id)}
                          disabled={updating}
                        >
                          {updating ? "Processing…" : "✓ Approve Clinic Application"}
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => setShowRejectBox(true)}
                          disabled={updating}
                        >
                          Reject Application…
                        </Button>
                      </div>

                      {showRejectBox && (
                        <div style={{ padding: 12, background: "#fef2f2", borderRadius: 6, border: "1px solid #fecaca" }}>
                          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#991b1b", marginBottom: 6 }}>
                            Reason for Rejection *
                          </label>
                          <textarea
                            style={{
                              width: "100%",
                              padding: 8,
                              borderRadius: 6,
                              border: "1px solid #fca5a5",
                              fontSize: 13,
                              minHeight: 70,
                              fontFamily: "inherit",
                            }}
                            placeholder="State reason for clinic applicant…"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                          />
                          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                            <Button
                              variant="danger"
                              onClick={() => handleRejectClinic(selectedRecord.id)}
                              disabled={updating}
                            >
                              Confirm Rejection
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => setShowRejectBox(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div style={{ marginTop: 8 }}>
                    <Link
                      href={`/platform/clinic-applications/${selectedRecord.id}`}
                      style={{ fontSize: 13, color: "#2563eb", textDecoration: "underline" }}
                    >
                      Open dedicated Clinic Application workspace →
                    </Link>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
