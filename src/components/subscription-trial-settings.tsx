"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listTrialConfigurations,
  updateTrialConfiguration,
  type SubscriptionPlan,
  type SubscriptionPlanVersion,
  type SubscriptionProductKey,
  type SubscriptionCatalogueProduct,
  type SubscriptionSubjectKind,
  type SubscriptionTrialConfiguration,
} from "../lib/platform-api/platform-admin";
import { Alert, Button, Card, ErrorState, Input, LoadingState, Select, StatusBadge } from "./ui";

export function SubscriptionTrialSettings({
  products,
  plans,
  planVersionsMap,
  onToast,
}: {
  products: SubscriptionCatalogueProduct[];
  plans: SubscriptionPlan[];
  planVersionsMap: Record<string, SubscriptionPlanVersion[]>;
  onToast: (msg: string) => void;
}) {
  const [configs, setConfigs] = useState<SubscriptionTrialConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKind, setSavingKind] = useState<SubscriptionSubjectKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<
    Record<SubscriptionSubjectKind, { enabled: boolean; durationDays: string; eligiblePlanVersionId: string }>
  >({
    CLINIC: { enabled: true, durationDays: "14", eligiblePlanVersionId: "" },
    DOCTOR: { enabled: true, durationDays: "14", eligiblePlanVersionId: "" },
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listTrialConfigurations();
      setConfigs(res.items);
      const next = {
        CLINIC: { enabled: true, durationDays: "14", eligiblePlanVersionId: "" },
        DOCTOR: { enabled: true, durationDays: "14", eligiblePlanVersionId: "" },
      };
      for (const item of res.items) {
        next[item.subjectKind] = {
          enabled: item.enabled,
          durationDays: String(item.durationDays),
          eligiblePlanVersionId: item.eligiblePlanVersionId ?? "",
        };
      }
      setDrafts(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load trial configurations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const opdProductId = products.find((p) => p.key === ("OFFLINE_OPD" as SubscriptionProductKey))?.id;

  const eligibleVersionsFor = (kind: SubscriptionSubjectKind) => {
    const out: Array<{ versionId: string; label: string }> = [];
    for (const plan of plans) {
      if (opdProductId && plan.productId !== opdProductId) continue;
      if ((plan.subjectKind ?? "CLINIC") !== kind) continue;
      if (plan.status !== "ACTIVE") continue;
      const published = (planVersionsMap[plan.id] ?? []).find((v) => v.status === "PUBLISHED");
      if (published) {
        out.push({
          versionId: published.id,
          label: `${plan.displayName} (${plan.code} · v${published.versionNumber})`,
        });
      }
    }
    return out;
  };

  const handleSave = async (kind: SubscriptionSubjectKind) => {
    const draft = drafts[kind];
    const days = Number(draft.durationDays);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      setError("Trial duration must be an integer between 1 and 365 days.");
      return;
    }
    setSavingKind(kind);
    setError(null);
    try {
      await updateTrialConfiguration(kind, {
        enabled: draft.enabled,
        durationDays: days,
        eligiblePlanVersionId: draft.eligiblePlanVersionId || null,
      });
      onToast(`${kind === "CLINIC" ? "Clinic" : "Individual Doctor"} trial configuration saved.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save trial configuration.");
    } finally {
      setSavingKind(null);
    }
  };

  if (loading) return <LoadingState label="Loading free trial settings…" />;

  return (
    <div className="stack">
      {error ? <ErrorState detail={error} /> : null}
      <Card>
        <div className="card-heading">
          <div>
            <h2>Free trial governance</h2>
            <p>
              Configure onboarding trials independently for Clinics and Individual Doctors. Trials grant temporary access to the configured OPD plan without auto-renewing; once expired, providers must purchase a paid plan (or use a 100% coupon). Repeated trials for the same clinic, doctor profile, or owner account are blocked automatically.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px", marginTop: "12px" }}>
          {(["CLINIC", "DOCTOR"] as SubscriptionSubjectKind[]).map((kind) => {
            const current = configs.find((c) => c.subjectKind === kind);
            const draft = drafts[kind];
            const options = eligibleVersionsFor(kind);
            const isSaving = savingKind === kind;

            return (
              <div
                key={kind}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "16px",
                  background: "#f8fafc",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>{kind === "CLINIC" ? "Clinic Free Trial" : "Individual Doctor Free Trial"}</h3>
                  <StatusBadge value={draft.enabled ? "ACTIVE" : "DISABLED"} />
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={draft.enabled}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [kind]: { ...prev[kind], enabled: e.target.checked },
                      }))
                    }
                    disabled={isSaving}
                  />
                  Enable free trial for {kind === "CLINIC" ? "Clinics" : "Individual Doctors"}
                </label>

                <label>
                  Trial duration (days)
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={draft.durationDays}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [kind]: { ...prev[kind], durationDays: e.target.value },
                      }))
                    }
                    disabled={isSaving}
                  />
                </label>

                <label>
                  Eligible OPD Plan Version
                  <Select
                    value={draft.eligiblePlanVersionId}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [kind]: { ...prev[kind], eligiblePlanVersionId: e.target.value },
                      }))
                    }
                    disabled={isSaving}
                  >
                    <option value="">Select active published OPD plan…</option>
                    {options.map((opt) => (
                      <option key={opt.versionId} value={opt.versionId}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </label>

                {current?.eligiblePlanName ? (
                  <Alert>
                    Currently mapped to <strong>{current.eligiblePlanName}</strong> ({current.durationDays} days).
                  </Alert>
                ) : null}

                <div>
                  <Button onClick={() => void handleSave(kind)} disabled={isSaving}>
                    {isSaving ? "Saving…" : `Save ${kind === "CLINIC" ? "Clinic" : "Doctor"} Trial`}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
