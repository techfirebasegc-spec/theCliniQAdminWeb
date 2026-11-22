"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listSubscriptionDefaultConfigurations,
  listSubscriptionPlans,
  listSubscriptionPlanVersions,
  scheduleSubscriptionDefaultConfiguration,
  type SubscriptionDefaultConfiguration,
  type SubscriptionPlanVersion,
} from "../lib/platform-api/platform-admin";
import { PlatformApiError } from "../lib/platform-api/client";
import { Alert, Button, Card, DataTable, EmptyState, ErrorState, LoadingState, PageHeader, Select, StatusBadge, useToast } from "./ui";

function loadErrorMessage(cause: unknown) {
  if (!(cause instanceof PlatformApiError)) return "Subscription defaults could not be loaded. Check that the local API is reachable, then retry.";
  if (cause.status === 401) return "Your Platform Admin session has expired. Sign in again before managing subscription defaults.";
  if (cause.status === 403) return "Platform Admin access is required to manage subscription defaults.";
  if (cause.status === 404) return "Subscription defaults are unavailable on the running API. Verify that the current API routes are running.";
  if (cause.status >= 500) return "Subscription defaults are unavailable on the API. Verify that the local subscription migrations are applied, then retry.";
  return cause.message || "Subscription defaults could not be loaded.";
}

export function SubscriptionDefaultConfigurations() {
  const [product, setProduct] = useState<SubscriptionDefaultConfiguration["productKey"]>("OFFLINE_OPD");
  const [items, setItems] = useState<SubscriptionDefaultConfiguration[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [kind, setKind] = useState<"CLINIC" | "DOCTOR">("CLINIC");
  const [availableVersions, setAvailableVersions] = useState<Array<{ planName: string; version: SubscriptionPlanVersion }>>([]);
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [grace, setGrace] = useState("7");
  const [saving, setSaving] = useState(false);
  const { message, show } = useToast();

  const load = useCallback(async () => {
    setItems(null);
    setError(null);
    setLoadFailed(false);
    try {
      const [defaultsRes, plansRes] = await Promise.all([
        listSubscriptionDefaultConfigurations(product),
        listSubscriptionPlans(product),
      ]);
      setItems(defaultsRes.items);

      // Load published versions for these plans
      const versionLists = await Promise.all(
        plansRes.items.filter((p) => p.status === "ACTIVE").map(async (plan) => {
          const vRes = await listSubscriptionPlanVersions(plan.id);
          return vRes.items
            .filter((v) => v.status === "PUBLISHED")
            .map((version) => ({ planName: plan.displayName, version }));
        }),
      );
      const flattened = versionLists.flat();
      setAvailableVersions(flattened);
      if (flattened.length > 0 && !selectedVersionId) {
        setSelectedVersionId(flattened[0].version.id);
      }
    } catch (cause) {
      setItems([]);
      setLoadFailed(true);
      setError(loadErrorMessage(cause));
    }
  }, [product, selectedVersionId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const save = async () => {
    if (items === null || loadFailed) return;
    const days = Number(grace);
    if (!selectedVersionId || !date || !Number.isInteger(days) || days < 0 || days > 31 || (product === "IPD_MANAGEMENT" && days !== 0)) {
      setError(product === "IPD_MANAGEMENT" ? "IPD has no configured grace-period field in the approved foundation." : "Select a published plan version, effective date, and a whole-number grace period from 0 to 31.");
      return;
    }
    setSaving(true);
    try {
      await scheduleSubscriptionDefaultConfiguration({
        productKey: product,
        subjectKind: kind,
        planVersionId: selectedVersionId,
        effectiveFrom: new Date(date).toISOString(),
        opdGraceDays: days,
      });
      show("Default subscription configuration scheduled.");
      await load();
    } catch {
      setError("The configuration was not saved. The version must be published and eligible for this product, and the effective period must not overlap.");
    } finally {
      setSaving(false);
    }
  };

  const selectedDetails = availableVersions.find((item) => item.version.id === selectedVersionId);

  return (
    <>
      <PageHeader
        eyebrow="Subscription configuration"
        title="Default plans"
        description="Effective-dated defaults only. Free default access is provided to eligible clinics and doctors based on these rules."
      />
      {error ? <ErrorState detail={error} /> : null}
      <Card>
        <div className="card-heading">
          <div>
            <h2>Schedule default plan configuration</h2>
            <p>Select an active published plan version to serve as the default tier for eligible accounts.</p>
          </div>
        </div>
        <div className="filters" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
          <label>
            <span style={{ fontSize: "12px", fontWeight: 600 }}>Product</span>
            <Select value={product} onChange={(e) => { setProduct(e.target.value as typeof product); setSelectedVersionId(""); }}>
              <option value="OFFLINE_OPD">Offline OPD</option>
              <option value="IPD_MANAGEMENT">IPD Management</option>
            </Select>
          </label>
          <label>
            <span style={{ fontSize: "12px", fontWeight: 600 }}>Recipient scope</span>
            <Select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              <option value="CLINIC">Clinic default</option>
              <option value="DOCTOR">Independent-doctor default</option>
            </Select>
          </label>
          <label>
            <span style={{ fontSize: "12px", fontWeight: 600 }}>Published plan version</span>
            {availableVersions.length > 0 ? (
              <Select value={selectedVersionId} onChange={(e) => setSelectedVersionId(e.target.value)}>
                {availableVersions.map((item) => (
                  <option key={item.version.id} value={item.version.id}>
                    {item.planName} · v{item.version.versionNumber} ({item.version.billingCadence} · ₹{Number(item.version.priceMinor) / 100})
                  </option>
                ))}
              </Select>
            ) : (
              <input
                aria-label="Published plan version ID"
                placeholder="No published versions available"
                value={selectedVersionId}
                onChange={(e) => setSelectedVersionId(e.target.value)}
              />
            )}
          </label>
          <label>
            <span style={{ fontSize: "12px", fontWeight: 600 }}>Effective from</span>
            <input aria-label="Effective from" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            <span style={{ fontSize: "12px", fontWeight: 600 }}>OPD grace days (0-31)</span>
            <input aria-label="OPD grace days" value={grace} onChange={(e) => setGrace(e.target.value)} disabled={product === "IPD_MANAGEMENT"} />
          </label>
        </div>

        {selectedDetails ? (
          <div style={{ marginTop: "12px", padding: "10px 14px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px" }}>
            <strong>Included entitlements in selected default:</strong>
            <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
              {selectedDetails.version.entitlements.map((entry) => (
                <li key={entry.key}>
                  <code>{entry.key}</code>: {JSON.stringify(entry.value)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div style={{ marginTop: "14px" }}>
          <Button onClick={() => void save()} disabled={saving || items === null || loadFailed || !selectedVersionId}>
            {saving ? "Saving…" : "Schedule default"}
          </Button>
        </div>
      </Card>

      {items === null ? (
        <LoadingState label="Loading subscription defaults…" />
      ) : items.length ? (
        <Card>
          <div className="card-heading">
            <div>
              <h2>Current active &amp; scheduled defaults</h2>
              <p>Historical and scheduled default configuration records.</p>
            </div>
          </div>
          <DataTable>
            <thead>
              <tr>
                <th>Scope</th>
                <th>Plan version</th>
                <th>Grace</th>
                <th>Effective period</th>
                <th>Configured by</th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id}>
                  <td><strong>{x.subjectKind}</strong></td>
                  <td>
                    {x.planName} · v{x.versionNumber}
                    <br />
                    <small style={{ color: "#64748b" }}>{x.planVersionId}</small>
                  </td>
                  <td>{product === "OFFLINE_OPD" ? `${x.opdGraceDays} days` : "Not applicable"}</td>
                  <td>
                    {new Date(x.effectiveFrom).toLocaleString()}
                    {x.effectiveUntil ? ` – ${new Date(x.effectiveUntil).toLocaleString()}` : " onward"}
                  </td>
                  <td>{x.configuredByAccountId ?? "Foundation record"}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Card>
      ) : (
        <EmptyState title="No default configuration" detail="No active or scheduled configuration has been recorded for this product." />
      )}
      {message ? <Alert>{message}</Alert> : null}
    </>
  );
}
