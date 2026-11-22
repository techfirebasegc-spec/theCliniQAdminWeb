"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listPlatformClinics,
  listPlatformDoctors,
  listSubscriptionEligibility,
  setSubscriptionEligibility,
  type PlatformClinic,
  type PlatformDoctor,
  type SubscriptionProductKey,
  type SubscriptionSubjectEligibility,
} from "../lib/platform-api/platform-admin";
import { PlatformApiError } from "../lib/platform-api/client";
import {
  Alert,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Modal,
  Select,
  StatusBadge,
  useToast,
} from "./ui";

function errorMessage(cause: unknown, fallback: string) {
  if (!(cause instanceof PlatformApiError)) return `${fallback} Check that the Platform API is reachable.`;
  if (cause.status === 401) return "Platform Admin session expired. Please sign in again.";
  if (cause.status === 403) return "Platform Admin access is required to manage subject eligibility.";
  return cause.message || fallback;
}

export function SubscriptionSubjectEligibilityView() {
  const [clinics, setClinics] = useState<PlatformClinic[]>([]);
  const [doctors, setDoctors] = useState<PlatformDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [subjectKind, setSubjectKind] = useState<"CLINIC" | "DOCTOR">("CLINIC");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<SubscriptionProductKey>("OFFLINE_OPD");

  const [eligibilityRecords, setEligibilityRecords] = useState<SubscriptionSubjectEligibility[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // Set eligibility modal
  const [modalOpen, setModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<"ELIGIBLE" | "INELIGIBLE">("ELIGIBLE");
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 16));
  const [effectiveUntil, setEffectiveUntil] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [formValidation, setFormValidation] = useState<string | null>(null);

  const { message, show } = useToast();

  const loadSubjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clinicRes, doctorRes] = await Promise.all([
        listPlatformClinics(),
        listPlatformDoctors(),
      ]);
      setClinics(clinicRes.items || []);
      setDoctors(doctorRes.items || []);
      if (clinicRes.items && clinicRes.items.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(clinicRes.items[0].id);
      }
    } catch (cause) {
      setError(errorMessage(cause, "Unable to load clinics and doctors."));
    } finally {
      setLoading(false);
    }
  }, [selectedSubjectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSubjects();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSubjects]);

  const loadEligibility = useCallback(async (productKey: SubscriptionProductKey, kind: "CLINIC" | "DOCTOR", id: string) => {
    if (!id) return;
    setRecordsLoading(true);
    setError(null);
    try {
      const res = await listSubscriptionEligibility(productKey, kind, id);
      setEligibilityRecords(res.items || []);
    } catch (cause) {
      setError(errorMessage(cause, "Unable to load eligibility history."));
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSubjectId) {
      const timer = window.setTimeout(() => {
        void loadEligibility(selectedProduct, subjectKind, selectedSubjectId);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [selectedSubjectId, selectedProduct, subjectKind, loadEligibility]);

  const handleSubjectKindChange = (kind: "CLINIC" | "DOCTOR") => {
    setSubjectKind(kind);
    if (kind === "CLINIC" && clinics.length > 0) {
      setSelectedSubjectId(clinics[0].id);
    } else if (kind === "DOCTOR" && doctors.length > 0) {
      setSelectedSubjectId(doctors[0].id);
    } else {
      setSelectedSubjectId("");
    }
  };

  const handleSaveEligibility = async () => {
    if (!selectedSubjectId) return;
    const fromDate = new Date(effectiveFrom);
    const untilDate = effectiveUntil ? new Date(effectiveUntil) : undefined;

    if (Number.isNaN(fromDate.getTime())) {
      setFormValidation("Enter a valid effective from date.");
      return;
    }
    if (untilDate && (Number.isNaN(untilDate.getTime()) || untilDate <= fromDate)) {
      setFormValidation("Effective until date must be later than effective from date.");
      return;
    }
    if (reason.trim() && (reason.trim().length < 3 || reason.trim().length > 500)) {
      setFormValidation("Reason must be between 3 and 500 characters if provided.");
      return;
    }

    setSaving(true);
    setFormValidation(null);
    try {
      await setSubscriptionEligibility(selectedProduct, subjectKind, selectedSubjectId, {
        status: newStatus,
        effectiveFrom: fromDate.toISOString(),
        ...(untilDate ? { effectiveUntil: untilDate.toISOString() } : {}),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });

      show(`Eligibility set to ${newStatus} for ${selectedProduct === "OFFLINE_OPD" ? "Offline OPD" : "IPD Management"}.`);
      setModalOpen(false);
      setReason("");
      await loadEligibility(selectedProduct, subjectKind, selectedSubjectId);
    } catch (cause) {
      setFormValidation(errorMessage(cause, "Failed to set eligibility."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading clinics and doctors for eligibility management…" />;
  }

  const currentSubjectLabel = subjectKind === "CLINIC"
    ? clinics.find(c => c.id === selectedSubjectId)?.displayName ?? "Selected clinic"
    : doctors.find(d => d.id === selectedSubjectId)?.displayName ?? "Selected doctor";

  const latestEligibility = eligibilityRecords[0];

  return (
    <div className="stack" style={{ gap: "1.5rem" }}>
      {error ? <ErrorState detail={error} /> : null}

      <Card>
        <div className="card-heading">
          <div>
            <h2>Subject Eligibility for Subscription Products</h2>
            <p>
              Providers must have active commercial eligibility to purchase subscription plans or resolve default operational access.
            </p>
          </div>
        </div>

        <div className="form-grid" style={{ gridTemplateColumns: "1fr 2fr 1fr", gap: "1rem", alignItems: "flex-end" }}>
          <label>
            Subject Type
            <Select
              value={subjectKind}
              onChange={(e) => handleSubjectKindChange(e.target.value as "CLINIC" | "DOCTOR")}
            >
              <option value="CLINIC">Clinic</option>
              <option value="DOCTOR">Independent Doctor</option>
            </Select>
          </label>

          <label>
            {subjectKind === "CLINIC" ? "Clinic Account" : "Doctor Profile"}
            <Select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
            >
              {subjectKind === "CLINIC"
                ? clinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName} ({c.clinicStatus})
                    </option>
                  ))
                : doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.displayName || "Dr. Unnamed"} ({d.professionalVerificationStatus})
                    </option>
                  ))}
            </Select>
          </label>

          <label>
            Product
            <Select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value as SubscriptionProductKey)}
            >
              <option value="OFFLINE_OPD">Offline OPD</option>
              <option value="IPD_MANAGEMENT">IPD Management</option>
            </Select>
          </label>
        </div>
      </Card>

      {selectedSubjectId ? (
        <Card>
          <div className="card-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2>{currentSubjectLabel} · {selectedProduct === "OFFLINE_OPD" ? "Offline OPD" : "IPD Management"}</h2>
              <p>
                Current status:{" "}
                {latestEligibility ? (
                  <StatusBadge value={latestEligibility.status} />
                ) : (
                  <span className="muted">No explicit eligibility record (defaults to ineligible)</span>
                )}
              </p>
            </div>
            <Button onClick={() => setModalOpen(true)}>Set Eligibility</Button>
          </div>

          <h3>Eligibility History</h3>
          {recordsLoading ? (
            <LoadingState label="Loading eligibility records…" />
          ) : eligibilityRecords.length ? (
            <DataTable>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Effective From</th>
                  <th>Effective Until</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {eligibilityRecords.map((rec) => (
                  <tr key={rec.id}>
                    <td><StatusBadge value={rec.status} /></td>
                    <td>{new Date(rec.effectiveFrom).toLocaleString()}</td>
                    <td>{rec.effectiveUntil ? new Date(rec.effectiveUntil).toLocaleString() : "Indefinite (onward)"}</td>
                    <td>{rec.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <EmptyState
              title="No eligibility records"
              detail={`No eligibility decisions have been recorded for ${currentSubjectLabel} on ${selectedProduct}.`}
              action={<Button onClick={() => setModalOpen(true)}>Grant eligibility</Button>}
            />
          )}
        </Card>
      ) : null}

      <Modal
        open={modalOpen}
        title={`Set Eligibility for ${currentSubjectLabel}`}
        onClose={() => !saving && setModalOpen(false)}
      >
        <p className="muted" style={{ marginBottom: "1rem" }}>
          Target product: <strong>{selectedProduct === "OFFLINE_OPD" ? "Offline OPD" : "IPD Management"}</strong>
        </p>

        <div className="form-grid">
          <label>
            Eligibility Decision
            <Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as "ELIGIBLE" | "INELIGIBLE")}
              disabled={saving}
            >
              <option value="ELIGIBLE">ELIGIBLE (Allow purchase &amp; defaults)</option>
              <option value="INELIGIBLE">INELIGIBLE (Block commercial access)</option>
            </Select>
          </label>

          <label>
            Effective From
            <Input
              type="datetime-local"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              disabled={saving}
            />
          </label>

          <label>
            Effective Until (optional)
            <Input
              type="datetime-local"
              value={effectiveUntil}
              onChange={(e) => setEffectiveUntil(e.target.value)}
              placeholder="Leave empty for open-ended"
              disabled={saving}
            />
          </label>

          <label>
            Reason / Operational Justification
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Verified clinic eligible for Offline OPD operations"
              disabled={saving}
            />
          </label>
        </div>

        {formValidation ? <Alert tone="error">{formValidation}</Alert> : null}

        <div className="dialog-actions" style={{ marginTop: "1.5rem" }}>
          <Button onClick={() => void handleSaveEligibility()} disabled={saving}>
            {saving ? "Saving…" : "Save eligibility decision"}
          </Button>
          <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
            Cancel
          </Button>
        </div>
      </Modal>

      {message ? <Alert>{message}</Alert> : null}
    </div>
  );
}
