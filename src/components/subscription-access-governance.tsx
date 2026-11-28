"use client";

import { useCallback, useEffect, useState } from "react";
import {
  backfillSubscriptionGrandfathering,
  createSubscriptionGrandfatheringGrant,
  getSubscriptionEnforcementPolicy,
  listPlatformClinics,
  listPlatformDoctors,
  listSubscriptionGrandfatheringGrants,
  revokeSubscriptionGrandfatheringGrant,
  updateSubscriptionEnforcementPolicy,
  type PlatformClinic,
  type PlatformDoctor,
  type SubscriptionEnforcementPolicy,
  type SubscriptionGrandfatheringGrant,
  type SubscriptionSubjectKind,
} from "../lib/platform-api/platform-admin";
import { Alert, Button, Card, DataTable, EmptyState, ErrorState, Input, LoadingState, Select, StatusBadge } from "./ui";

export function SubscriptionAccessGovernance({
  onToast,
}: {
  onToast: (msg: string) => void;
}) {
  const [policy, setPolicy] = useState<SubscriptionEnforcementPolicy | null>(null);
  const [grants, setGrants] = useState<SubscriptionGrandfatheringGrant[]>([]);
  const [clinics, setClinics] = useState<PlatformClinic[]>([]);
  const [doctors, setDoctors] = useState<PlatformDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [enforceClinic, setEnforceClinic] = useState(true);
  const [enforceDoctor, setEnforceDoctor] = useState(true);
  const [grandfatheringEnabled, setGrandfatheringEnabled] = useState(true);
  const [defaultDays, setDefaultDays] = useState("30");

  const [grantKind, setGrantKind] = useState<SubscriptionSubjectKind>("CLINIC");
  const [grantSubjectId, setGrantSubjectId] = useState("");
  const [grantDays, setGrantDays] = useState("30");
  const [grantReason, setGrantReason] = useState("Verified provider transition grace period");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [policyRes, grantsRes, clinicsRes, doctorsRes] = await Promise.all([
        getSubscriptionEnforcementPolicy(),
        listSubscriptionGrandfatheringGrants(),
        listPlatformClinics().catch(() => ({ items: [] })),
        listPlatformDoctors().catch(() => ({ items: [] })),
      ]);
      setPolicy(policyRes.policy);
      setEnforceClinic(policyRes.policy.enforceClinicSubscription);
      setEnforceDoctor(policyRes.policy.enforceDoctorSubscription);
      setGrandfatheringEnabled(policyRes.policy.grandfatheringEnabled);
      setDefaultDays(String(policyRes.policy.defaultGrandfatheringDays));
      setGrants(grantsRes.items);
      setClinics(clinicsRes.items);
      setDoctors(doctorsRes.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load subscription enforcement settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const handleSavePolicy = async () => {
    const days = Number(defaultDays);
    if (!Number.isInteger(days) || days < 0 || days > 365) {
      setError("Default grandfathering days must be between 0 and 365.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateSubscriptionEnforcementPolicy({
        enforceClinicSubscription: enforceClinic,
        enforceDoctorSubscription: enforceDoctor,
        grandfatheringEnabled,
        defaultGrandfatheringDays: days,
      });
      onToast("Subscription enforcement policy updated.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save enforcement policy.");
    } finally {
      setSaving(false);
    }
  };

  const handleBackfill = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await backfillSubscriptionGrandfathering(Number(defaultDays) || 30);
      onToast(`Granted transition grace period to ${res.result.grantedClinics} clinic(s) and ${res.result.grantedDoctors} doctor(s).`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not backfill grandfathering grants.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateGrant = async () => {
    if (!grantSubjectId) {
      setError("Select a Clinic or Doctor to grant a transition grace period.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createSubscriptionGrandfatheringGrant({
        subjectKind: grantKind,
        subjectId: grantSubjectId,
        durationDays: Number(grantDays) || 30,
        reason: grantReason.trim() || undefined,
      });
      onToast("Transition grace period granted.");
      setGrantSubjectId("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create grace grant.");
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeGrant = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      await revokeSubscriptionGrandfatheringGrant(id);
      onToast("Grandfathering grace grant revoked.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not revoke grace grant.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Loading enforcement policy and grandfathering grants…" />;

  return (
    <div className="stack">
      {error ? <ErrorState detail={error} /> : null}

      <Card>
        <div className="card-heading">
          <div>
            <h2>Mandatory subscription enforcement &amp; grandfathering policy</h2>
            <p>
              Verification, Subscription Status, and Service Publication are evaluated independently. When enforcement is enabled, verified Clinics and Individual Doctors require an active subscription, active free trial, or active grandfathering grace period before their public listing, booking, and OPD/IPD services operate.
            </p>
          </div>
        </div>

        <div className="form-grid" style={{ marginTop: "12px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={enforceClinic}
              onChange={(e) => setEnforceClinic(e.target.checked)}
              disabled={saving}
            />
            Enforce mandatory subscription for Clinics
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={enforceDoctor}
              onChange={(e) => setEnforceDoctor(e.target.checked)}
              disabled={saving}
            />
            Enforce mandatory subscription for Individual Doctors
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={grandfatheringEnabled}
              onChange={(e) => setGrandfatheringEnabled(e.target.checked)}
              disabled={saving}
            />
            Allow existing verified providers to use grandfathering grace grants
          </label>
          <label>
            Default Grace Period (days)
            <Input
              type="number"
              min={0}
              max={365}
              value={defaultDays}
              onChange={(e) => setDefaultDays(e.target.value)}
              disabled={saving}
            />
          </label>
        </div>

        {policy ? (
          <Alert>
            Policy last updated: {new Date(policy.updatedAt).toLocaleString()}
          </Alert>
        ) : null}

        <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
          <Button onClick={() => void handleSavePolicy()} disabled={saving}>
            {saving ? "Saving…" : "Save enforcement policy"}
          </Button>
          <Button variant="secondary" onClick={() => void handleBackfill()} disabled={saving}>
            Grant grace period to unsubscribed verified providers
          </Button>
        </div>
      </Card>

      <Card>
        <div className="card-heading">
          <div>
            <h2>Transition grace-period grants</h2>
            <p>Prevent accidental visibility loss for previously verified Clinics and Doctors while they transition to paid plans.</p>
          </div>
        </div>

        <div className="form-grid" style={{ marginBottom: "16px" }}>
          <label>
            Provider Type
            <Select
              value={grantKind}
              onChange={(e) => {
                setGrantKind(e.target.value as SubscriptionSubjectKind);
                setGrantSubjectId("");
              }}
              disabled={saving}
            >
              <option value="CLINIC">Clinic</option>
              <option value="DOCTOR">Individual Doctor</option>
            </Select>
          </label>
          <label>
            Provider
            <Select value={grantSubjectId} onChange={(e) => setGrantSubjectId(e.target.value)} disabled={saving}>
              <option value="">Select {grantKind === "CLINIC" ? "Clinic" : "Doctor"}…</option>
              {grantKind === "CLINIC"
                ? clinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName} ({c.clinicStatus})
                    </option>
                  ))
                : doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.displayName || d.email || d.id} ({d.professionalVerificationStatus})
                    </option>
                  ))}
            </Select>
          </label>
          <label>
            Duration (days)
            <Input type="number" min={1} max={365} value={grantDays} onChange={(e) => setGrantDays(e.target.value)} disabled={saving} />
          </label>
          <label>
            Reason
            <Input value={grantReason} onChange={(e) => setGrantReason(e.target.value)} disabled={saving} />
          </label>
        </div>
        <div style={{ marginBottom: "16px" }}>
          <Button variant="secondary" onClick={() => void handleCreateGrant()} disabled={saving || !grantSubjectId}>
            Issue grace grant
          </Button>
        </div>

        {grants.length === 0 ? (
          <EmptyState title="No grandfathering grants" detail="No active or historical transition grace periods exist." />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Provider</th>
                <th>Type</th>
                <th>Status</th>
                <th>Window</th>
                <th>Reason</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {grants.map((g) => (
                <tr key={g.id}>
                  <td>
                    <strong>{g.subjectDisplayName || g.subjectId.slice(0, 12)}</strong>
                  </td>
                  <td>{g.subjectKind}</td>
                  <td><StatusBadge value={g.status} /></td>
                  <td style={{ fontSize: "12px" }}>
                    {new Date(g.startsAt).toLocaleDateString()} – {new Date(g.endsAt).toLocaleDateString()}
                  </td>
                  <td style={{ fontSize: "12px", color: "#64748b" }}>{g.reason || "—"}</td>
                  <td>
                    {g.status === "ACTIVE" ? (
                      <Button variant="secondary" onClick={() => void handleRevokeGrant(g.id)} disabled={saving}>
                        Revoke
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>
    </div>
  );
}
