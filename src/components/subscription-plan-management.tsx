"use client";

import { useCallback, useEffect, useState } from "react";
import {
  activateSubscriptionPlan,
  createSubscriptionPlan,
  createSubscriptionPlanVersion,
  getSubscriptionSubjectEligibility,
  listPlatformClinics,
  listPlatformDoctors,
  listSubscriptionPlanVersions,
  listSubscriptionPlans,
  listSubscriptionProducts,
  publishSubscriptionPlanVersion,
  retireSubscriptionPlan,
  retireSubscriptionPlanVersion,
  setSubscriptionSubjectEligibility,
  type PlatformClinic,
  type PlatformDoctor,
  type SubscriptionCatalogueProduct,
  type SubscriptionPlan,
  type SubscriptionPlanEntitlement,
  type SubscriptionPlanVersion,
  type SubscriptionProductKey,
  type SubscriptionSubjectEligibility,
  updateSubscriptionPlan,
} from "../lib/platform-api/platform-admin";
import { PlatformApiError } from "../lib/platform-api/client";
import { Alert, Button, Card, ConfirmationDialog, DataTable, EmptyState, ErrorState, Input, LoadingState, Modal, PageHeader, Select, StatusBadge, Tabs, useToast } from "./ui";
import { SubscriptionDefaultConfigurations } from "./subscription-default-configurations";
import { SubscriptionSubjectEligibilityView } from "./subscription-subject-eligibility";
import styles from "./subscription-plan-management.module.css";

type Section = "plans" | "defaults" | "eligibility";
type EntitlementDraft = { key: string; enabled: boolean; value: string };
type Confirmation = {
  kind: "activate-plan" | "publish-version" | "retire-and-publish" | "retire-version" | "retire-plan";
  id: string;
  label: string;
  secondaryId?: string;
} | null;

function errorMessage(cause: unknown, fallback: string) {
  if (!(cause instanceof PlatformApiError)) return `${fallback} Check that the local API is reachable, then retry.`;
  if (cause.status === 401) return "Your Platform Admin session has expired. Sign in again before managing subscription plans.";
  if (cause.status === 403) return "Platform Admin access is required to manage subscription plans.";
  if (cause.status === 404) return "The requested subscription catalogue record is no longer available.";
  if (cause.status === 409) return `${fallback} There is a conflict with existing records (e.g. an active version effective period overlaps, or an active version prevents plan archiving).`;
  if (cause.status >= 500) return `${fallback} The Platform API encountered an unexpected server error. Retry the request, then review the API logs if it persists.`;
  return cause.message || fallback;
}

function formatMinor(value: string, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(BigInt(value)) / 100);
  } catch {
    return `${value} ${currency} minor units`;
  }
}

function displayPeriod(version: SubscriptionPlanVersion) {
  return `${new Date(version.effectiveFrom).toLocaleString()}${version.effectiveUntil ? ` – ${new Date(version.effectiveUntil).toLocaleString()}` : " onward"}`;
}

export function SubscriptionPlanManagement() {
  const [section, setSection] = useState<Section>("plans");
  const [products, setProducts] = useState<SubscriptionCatalogueProduct[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [planVersionsMap, setPlanVersionsMap] = useState<Record<string, SubscriptionPlanVersion[]>>({});
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productFilter, setProductFilter] = useState<SubscriptionProductKey | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<SubscriptionPlan["status"] | "ALL">("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [working, setWorking] = useState<string | null>(null);
  const { message, show } = useToast();

  const reload = useCallback(async () => {
    setLoading(true);
    setReady(false);
    setError(null);
    try {
      const productResponse = await listSubscriptionProducts();
      const pages = await Promise.all(productResponse.items.map((product) => listSubscriptionPlans(product.key)));
      const cataloguePlans = pages.flatMap((page) => page.items);

      // Load all versions for each plan to separate published from draft
      const versionEntries = await Promise.all(
        cataloguePlans.map(async (plan) => {
          const res = await listSubscriptionPlanVersions(plan.id);
          return [plan.id, res.items] as const;
        }),
      );

      setProducts(productResponse.items);
      setPlans(cataloguePlans);
      setPlanVersionsMap(Object.fromEntries(versionEntries));
      setReady(true);
    } catch (cause) {
      setProducts([]);
      setPlans([]);
      setPlanVersionsMap({});
      setError(errorMessage(cause, "Subscription plans could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void reload(); }, 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  const createPlan = async (productKey: SubscriptionProductKey, code: string, displayName: string) => {
    if (!ready) return;
    setWorking("create-plan");
    setError(null);
    try {
      await createSubscriptionPlan(productKey, { code: code.trim(), displayName: displayName.trim() });
      setCreateOpen(false);
      show("Plan created as a draft. Add and publish a version before activating.");
      await reload();
    } catch (cause) {
      setError(errorMessage(cause, "The subscription plan could not be created."));
    } finally {
      setWorking(null);
    }
  };

  const confirm = async () => {
    if (!confirmation || !ready) return;
    const action = confirmation;
    setWorking(action.id);
    setError(null);
    try {
      if (action.kind === "activate-plan") {
        await activateSubscriptionPlan(action.id);
        show("Plan activated. Published versions are now eligible for purchase.");
      }
      if (action.kind === "publish-version") {
        await publishSubscriptionPlanVersion(action.id);
        show("Plan version published. Published terms are immutable.");
      }
      if (action.kind === "retire-and-publish") {
        // First retire previous published version, then publish new version
        if (action.secondaryId) {
          await retireSubscriptionPlanVersion(action.secondaryId);
        }
        await publishSubscriptionPlanVersion(action.id);
        show("Previous version retired and new version published successfully.");
      }
      if (action.kind === "retire-version") {
        await retireSubscriptionPlanVersion(action.id);
        show("Plan version retired. It will no longer be offered for new purchases.");
      }
      if (action.kind === "retire-plan") {
        await retireSubscriptionPlan(action.id);
        setSelectedPlan(null);
        show("Plan retired.");
      }
      setConfirmation(null);
      await reload();
    } catch (cause) {
      setError(errorMessage(cause, "The subscription plan change could not be completed."));
    } finally {
      setWorking(null);
    }
  };

  const visiblePlans = plans.filter(
    (plan) =>
      (productFilter === "ALL" || products.find((product) => product.id === plan.productId)?.key === productFilter) &&
      (statusFilter === "ALL" || plan.status === statusFilter),
  );
  const controlsDisabled = !ready || loading || working !== null;

  return (
    <>
      <PageHeader
        eyebrow="Subscription governance"
        title="Subscription plans &amp; catalogue"
        description="Versioned commercial catalogue. Plan status controls catalogue offering state; version status governs immutable pricing and entitlements."
        action={
          section === "plans" ? (
            <Button onClick={() => setCreateOpen(true)} disabled={controlsDisabled}>
              Create plan
            </Button>
          ) : undefined
        }
      />
      <Tabs
        active={section}
        onChange={(value) => setSection(value as Section)}
        items={[
          { id: "plans", label: "Products & plans" },
          { id: "defaults", label: "Default plan configuration" },
          { id: "eligibility", label: "Subject eligibility" },
        ]}
      />

      {section === "defaults" ? (
        <SubscriptionDefaultConfigurations />
      ) : section === "eligibility" ? (
        <SubscriptionSubjectEligibilityView />
      ) : (
        <>
          {error ? <ErrorState detail={error} /> : null}
          {loading ? <LoadingState label="Loading subscription products and plans…" /> : null}
          {!loading && !ready ? (
            <Card>
              <h2>Subscription catalogue unavailable</h2>
              <p>Plan actions are disabled until the current catalogue loads.</p>
              <Button variant="secondary" onClick={() => void reload()}>
                Retry loading catalogue
              </Button>
            </Card>
          ) : null}
          {ready ? (
            <div className="stack">
              <Card>
                <div className="card-heading">
                  <div>
                    <h2>Subscription products</h2>
                    <p>Foundation products governed by The CliniQ Platform.</p>
                  </div>
                </div>
                <DataTable>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Key</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td><strong>{product.displayName}</strong></td>
                        <td><code>{product.key}</code></td>
                        <td><StatusBadge value={product.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </Card>

              <Card>
                <div className="card-heading">
                  <div>
                    <h2>Catalogue plans</h2>
                    <p>
                      <strong>Plan status:</strong> Defines whether the plan offering is DRAFT, ACTIVE (eligible for offering), or RETIRED.
                      <br />
                      <strong>Version status:</strong> Governs immutable commercial pricing and entitlement terms. Only active plans with a PUBLISHED version can be purchased.
                    </p>
                  </div>
                </div>
                <div className="filters">
                  <Select aria-label="Filter plans by product" value={productFilter} onChange={(event) => setProductFilter(event.target.value as SubscriptionProductKey | "ALL")}>
                    <option value="ALL">All products</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.key}>{product.displayName}</option>
                    ))}
                  </Select>
                  <Select aria-label="Filter plans by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as SubscriptionPlan["status"] | "ALL")}>
                    <option value="ALL">All plan statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active</option>
                    <option value="RETIRED">Retired</option>
                  </Select>
                </div>

                {visiblePlans.length ? (
                  <DataTable>
                    <thead>
                      <tr>
                        <th>Plan &amp; Code</th>
                        <th>Product</th>
                        <th>Plan status</th>
                        <th>Published live version</th>
                        <th>Draft version</th>
                        <th>Created</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePlans.map((plan) => {
                        const allVersions = planVersionsMap[plan.id] || [];
                        const published = allVersions.find((v) => v.status === "PUBLISHED");
                        const draft = allVersions.find((v) => v.status === "DRAFT");
                        const prod = products.find((p) => p.id === plan.productId);

                        return (
                          <tr key={plan.id}>
                            <td>
                              <strong>{plan.displayName}</strong>
                              <br />
                              <small><code>{plan.code}</code></small>
                            </td>
                            <td>{prod?.displayName ?? "Product unavailable"}</td>
                            <td>
                              <StatusBadge value={plan.status} />
                            </td>
                            <td>
                              {published ? (
                                <>
                                  <span style={{ fontWeight: 600, color: "#166534" }}>v{published.versionNumber} (Live)</span>
                                  <br />
                                  <small>
                                    {formatMinor(published.priceMinor, published.currency)} / {published.billingCadence.toLowerCase()}
                                  </small>
                                </>
                              ) : (
                                <span style={{ color: "#64748b" }}>No published version</span>
                              )}
                            </td>
                            <td>
                              {draft ? (
                                <span style={{ color: "#b45309", fontWeight: 600 }}>v{draft.versionNumber} (Draft)</span>
                              ) : (
                                <span style={{ color: "#94a3b8" }}>—</span>
                              )}
                            </td>
                            <td>{new Date(plan.createdAt).toLocaleDateString()}</td>
                            <td>
                              <Button variant="secondary" onClick={() => setSelectedPlan(plan)}>
                                Manage
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </DataTable>
                ) : (
                  <EmptyState title="No subscription plans" detail="No plans match the selected product and status filters." action={<Button onClick={() => setCreateOpen(true)}>Create plan</Button>} />
                )}
              </Card>
            </div>
          ) : null}
        </>
      )}

      <PlanCreateModal open={createOpen} products={products} busy={working === "create-plan"} onClose={() => !working && setCreateOpen(false)} onCreate={createPlan} />
      <PlanDetailModal
        plan={selectedPlan}
        products={products}
        busy={working}
        onClose={() => !working && setSelectedPlan(null)}
        onError={setError}
        onReload={reload}
        onConfirm={setConfirmation}
      />
      <ConfirmationDialog
        open={confirmation !== null}
        onClose={() => !working && setConfirmation(null)}
        onConfirm={() => void confirm()}
      >
        {confirmation?.kind === "activate-plan"
          ? `Activate plan ${confirmation.label}? Active plans with a published version will immediately become visible to eligible providers.`
          : confirmation?.kind === "publish-version"
          ? `Publish ${confirmation.label}? Published commercial pricing and entitlements are legally immutable.`
          : confirmation?.kind === "retire-and-publish"
          ? `Publish ${confirmation.label} and retire previous version? To avoid effective-period overlap conflicts, the previous published version will be retired immediately.`
          : confirmation?.kind === "retire-version"
          ? `Retire ${confirmation.label}? It will no longer be offered for new purchases.`
          : `Retire plan ${confirmation?.label}? Permitted only when every version is retired.`}
      </ConfirmationDialog>
      {message ? <Alert>{message}</Alert> : null}
    </>
  );
}

function PlanCreateModal({
  open,
  products,
  busy,
  onClose,
  onCreate,
}: {
  open: boolean;
  products: SubscriptionCatalogueProduct[];
  busy: boolean;
  onClose: () => void;
  onCreate: (product: SubscriptionProductKey, code: string, name: string) => Promise<void>;
}) {
  const [product, setProduct] = useState<SubscriptionProductKey>("OFFLINE_OPD");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [validation, setValidation] = useState<string | null>(null);

  const submit = async () => {
    if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(code.trim().toUpperCase()) || !name.trim()) {
      setValidation("Use a plan code beginning with a letter, containing only uppercase letters, numbers, or underscores, and enter a plan name.");
      return;
    }
    setValidation(null);
    await onCreate(product, code.toUpperCase(), name);
  };

  return (
    <Modal open={open} title="Create subscription plan" onClose={onClose}>
      <div className="form-grid">
        <label>
          Product
          <Select value={product} onChange={(event) => setProduct(event.target.value as SubscriptionProductKey)} disabled={busy}>
            {products.map((item) => (
              <option key={item.id} value={item.key}>{item.displayName}</option>
            ))}
          </Select>
        </label>
        <label>
          Plan code
          <Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="GROWTH_OPD" autoComplete="off" disabled={busy} />
        </label>
        <label>
          Plan name
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Growth Offline OPD" autoComplete="off" disabled={busy} />
        </label>
      </div>
      {validation ? <Alert tone="error">{validation}</Alert> : null}
      <p>Creating a plan defines the catalogue entry in DRAFT state. You must add and publish a version before activating.</p>
      <div className="dialog-actions">
        <Button onClick={() => void submit()} disabled={busy || !products.length}>
          {busy ? "Creating…" : "Create draft plan"}
        </Button>
        <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
      </div>
    </Modal>
  );
}

function PlanDetailModal({
  plan,
  products,
  busy,
  onClose,
  onError,
  onReload,
  onConfirm,
}: {
  plan: SubscriptionPlan | null;
  products: SubscriptionCatalogueProduct[];
  busy: string | null;
  onClose: () => void;
  onError: (value: string | null) => void;
  onReload: () => Promise<void>;
  onConfirm: (value: Confirmation) => void;
}) {
  const [versions, setVersions] = useState<SubscriptionPlanVersion[] | null>(null);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [creatingVersion, setCreatingVersion] = useState(false);

  const loadVersions = useCallback(async () => {
    if (!plan) return;
    setVersions(null);
    setVersionError(null);
    setName(plan.displayName);
    try {
      setVersions((await listSubscriptionPlanVersions(plan.id)).items);
    } catch (cause) {
      setVersions([]);
      setVersionError(errorMessage(cause, "Plan version history could not be loaded."));
    }
  }, [plan]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadVersions(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadVersions]);

  if (!plan) return null;
  const product = products.find((item) => item.id === plan.productId);
  const publishedVersion = versions?.find((v) => v.status === "PUBLISHED");

  const saveName = async () => {
    if (!name.trim() || name.trim() === plan.displayName) return;
    setSavingName(true);
    onError(null);
    try {
      await updateSubscriptionPlan(plan.id, { displayName: name.trim() });
      await onReload();
    } catch (cause) {
      onError(errorMessage(cause, "The plan name could not be updated."));
    } finally {
      setSavingName(false);
    }
  };

  const createVersion = async (value: {
    effectiveFrom: string;
    effectiveUntil?: string;
    currency: string;
    priceMinor: string;
    billingCadence: "MONTHLY" | "ANNUAL" | "NONE";
    entitlements: SubscriptionPlanEntitlement[];
  }) => {
    setCreatingVersion(true);
    onError(null);
    try {
      await createSubscriptionPlanVersion(plan.id, value);
      await loadVersions();
      await onReload();
    } catch (cause) {
      onError(errorMessage(cause, "The plan version could not be created."));
    } finally {
      setCreatingVersion(false);
    }
  };

  const handlePublishClick = (draftVersion: SubscriptionPlanVersion) => {
    if (publishedVersion && publishedVersion.id !== draftVersion.id) {
      // Overlap conflict danger: offer to retire published and publish draft
      onConfirm({
        kind: "retire-and-publish",
        id: draftVersion.id,
        label: `version ${draftVersion.versionNumber}`,
        secondaryId: publishedVersion.id,
      });
    } else {
      onConfirm({
        kind: "publish-version",
        id: draftVersion.id,
        label: `version ${draftVersion.versionNumber}`,
      });
    }
  };

  return (
    <Modal open title={`Manage ${plan.displayName}`} onClose={onClose} className={styles.planManageModal}>
      <div className={styles.modalScrollBody}>
        {/* 1. Plan Overview Summary Bar */}
        <div className={styles.summaryBar}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Plan Status</span>
            <div className={styles.summaryValue}><StatusBadge value={plan.status} /></div>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Product</span>
            <div className={styles.summaryValue}>{product?.displayName ?? "Product unavailable"}</div>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Plan Code</span>
            <div className={styles.summaryValue}><code className={styles.codeBadge}>{plan.code}</code></div>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Live Version</span>
            <div className={styles.summaryValue}>
              {publishedVersion ? (
                <span className={styles.liveVersionBadge}>
                  v{publishedVersion.versionNumber} ({formatMinor(publishedVersion.priceMinor, publishedVersion.currency)})
                </span>
              ) : (
                <span className={styles.noVersionBadge}>None published</span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Plan Name Card */}
        <div className={styles.planNameCard}>
          <div className={styles.planNameForm}>
            <label className={styles.planNameLabel}>
              <span>Plan name</span>
              <Input
                className={styles.planNameInput}
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={savingName || busy !== null}
              />
            </label>
            <Button
              variant="secondary"
              className={styles.saveNameButton}
              onClick={() => void saveName()}
              disabled={savingName || busy !== null || !name.trim() || name.trim() === plan.displayName}
            >
              {savingName ? "Saving…" : "Save name"}
            </Button>
          </div>
        </div>

        {/* 3. Draft Version Form */}
        <PlanVersionForm
          disabled={creatingVersion || busy !== null || plan.status === "RETIRED"}
          productKey={product?.key}
          onCreate={createVersion}
        />

        {/* 4. Version History & Terms */}
        <div className={styles.versionHistoryCard}>
          <div className={styles.sectionHeading}>
            <h2>Version history &amp; terms</h2>
            <p>
              Published versions cannot be edited. Retiring a published version removes it from new purchases while preserving existing subscriptions.
            </p>
          </div>

          {versionError ? <ErrorState detail={versionError} /> : null}
          {versions === null ? (
            <LoadingState label="Loading plan versions…" />
          ) : versions.length ? (
            <div className={styles.tableWrapper}>
              <table className={styles.versionTable}>
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Commercial terms</th>
                    <th>Effective period</th>
                    <th>Entitlements</th>
                    <th>Version status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((version) => (
                    <tr key={version.id}>
                      <td><span className={styles.versionTag}>v{version.versionNumber}</span></td>
                      <td>
                        <strong>{formatMinor(version.priceMinor, version.currency)}</strong>
                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                          {version.billingCadence}{version.freeTrialEnabled ? " · Trial enabled" : ""}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: "13px", color: "#475569" }}>{displayPeriod(version)}</span>
                      </td>
                      <td>
                        {version.entitlements.length ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {version.entitlements.map((entry) => (
                              <div key={entry.key} style={{ fontSize: "12px", display: "flex", gap: "6px", alignItems: "center" }}>
                                <span className={styles.entitlementTag}>{entry.key}</span>
                                <span style={{ color: "#64748b" }}>{JSON.stringify(entry.value)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "12px" }}>No entitlements</span>
                        )}
                      </td>
                      <td><StatusBadge value={version.status} /></td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          {version.status === "DRAFT" ? (
                            <>
                              <Button onClick={() => handlePublishClick(version)} disabled={busy !== null}>
                                Publish
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() => onConfirm({ kind: "retire-version", id: version.id, label: `draft version ${version.versionNumber}` })}
                                disabled={busy !== null}
                              >
                                Discard
                              </Button>
                            </>
                          ) : version.status === "PUBLISHED" ? (
                            <Button
                              variant="danger"
                              onClick={() => onConfirm({ kind: "retire-version", id: version.id, label: `published version ${version.versionNumber}` })}
                              disabled={busy !== null}
                            >
                              Retire
                            </Button>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "12px" }}>Retired</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No versions yet" detail="Create a draft version with the required pricing and entitlement values." />
          )}
        </div>

        {/* 5. Plan Actions */}
        {plan.status !== "RETIRED" ? (
          <div className={styles.planActionsFooter}>
            {plan.status === "DRAFT" ? (
              <Button onClick={() => onConfirm({ kind: "activate-plan", id: plan.id, label: plan.displayName })} disabled={busy !== null || !versions?.some((v) => v.status === "PUBLISHED")}>
                Activate plan
              </Button>
            ) : null}
            <Button variant="danger" onClick={() => onConfirm({ kind: "retire-plan", id: plan.id, label: plan.displayName })} disabled={busy !== null}>
              Retire plan
            </Button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function PlanVersionForm({
  disabled,
  productKey,
  onCreate,
}: {
  disabled: boolean;
  productKey: SubscriptionProductKey | undefined;
  onCreate: (value: {
    effectiveFrom: string;
    effectiveUntil?: string;
    currency: string;
    priceMinor: string;
    billingCadence: "MONTHLY" | "ANNUAL" | "NONE";
    entitlements: SubscriptionPlanEntitlement[];
  }) => Promise<void>;
}) {
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 16));
  const [effectiveUntil, setEffectiveUntil] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [priceMinor, setPriceMinor] = useState(productKey === "IPD_MANAGEMENT" ? "199900" : "99900");
  const [cadence, setCadence] = useState<"MONTHLY" | "ANNUAL" | "NONE">("MONTHLY");
  const [entitlements, setEntitlements] = useState<EntitlementDraft[]>([
    { key: productKey === "IPD_MANAGEMENT" ? "ipd.bed.limit" : "opd.offline-appointment.committed", enabled: true, value: JSON.stringify({ allowance: 500 }) },
    { key: "clinic.staff.seats", enabled: true, value: JSON.stringify({ limit: 10 }) },
  ]);
  const [validation, setValidation] = useState<string | null>(null);

  const applyPreset = (preset: "OPD_FREE" | "OPD_GROWTH" | "IPD_STANDARD") => {
    if (preset === "OPD_FREE") {
      setPriceMinor("0");
      setCadence("NONE");
      setEntitlements([
        { key: "opd.offline-appointment.committed", enabled: true, value: JSON.stringify({ allowance: 100 }) },
        { key: "clinic.staff.seats", enabled: true, value: JSON.stringify({ limit: 5 }) },
      ]);
    } else if (preset === "OPD_GROWTH") {
      setPriceMinor("99900");
      setCadence("MONTHLY");
      setEntitlements([
        { key: "opd.offline-appointment.committed", enabled: true, value: JSON.stringify({ allowance: 500 }) },
        { key: "clinic.staff.seats", enabled: true, value: JSON.stringify({ limit: 15 }) },
      ]);
    } else if (preset === "IPD_STANDARD") {
      setPriceMinor("199900");
      setCadence("MONTHLY");
      setEntitlements([
        { key: "ipd.bed.limit", enabled: true, value: JSON.stringify({ limit: 25 }) },
        { key: "ipd.admission", enabled: true, value: JSON.stringify({ enabled: true }) },
        { key: "clinic.staff.seats", enabled: true, value: JSON.stringify({ limit: 20 }) },
      ]);
    }
  };

  const updateEntitlement = (index: number, patch: Partial<EntitlementDraft>) =>
    setEntitlements((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));

  const submit = async () => {
    let parsed: SubscriptionPlanEntitlement[];
    try {
      parsed = entitlements
        .filter((item) => item.key.trim() || item.value.trim() !== "{}")
        .map((item) => ({ key: item.key.trim(), enabled: item.enabled, value: JSON.parse(item.value) as Record<string, unknown> }));
    } catch {
      setValidation("Each entitlement value must be valid JSON object text.");
      return;
    }

    const start = new Date(effectiveFrom);
    const end = effectiveUntil ? new Date(effectiveUntil) : null;
    const duplicateKeys = new Set(parsed.map((item) => item.key)).size !== parsed.length;

    if (
      !effectiveFrom ||
      Number.isNaN(start.getTime()) ||
      (end && (Number.isNaN(end.getTime()) || end <= start)) ||
      !/^\d+$/.test(priceMinor) ||
      !/^[A-Za-z]{3}$/.test(currency) ||
      (cadence === "NONE" && priceMinor !== "0") ||
      (productKey === "IPD_MANAGEMENT" && (cadence === "NONE" || priceMinor === "0")) ||
      duplicateKeys ||
      parsed.some((item) => !/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/.test(item.key) || typeof item.value !== "object" || item.value === null || Array.isArray(item.value))
    ) {
      setValidation(
        productKey === "IPD_MANAGEMENT"
          ? "IPD versions require a positive paid monthly or annual term, valid effective period, three-letter currency, and unique entitlement keys with JSON objects."
          : "Enter a valid effective period, non-negative price in minor units, three-letter currency, valid cadence, and unique entitlement keys with JSON objects.",
      );
      return;
    }

    setValidation(null);
    await onCreate({
      effectiveFrom: start.toISOString(),
      ...(end ? { effectiveUntil: end.toISOString() } : {}),
      currency: currency.toUpperCase(),
      priceMinor,
      billingCadence: cadence,
      entitlements: parsed,
    });

    setEffectiveUntil("");
  };

  return (
    <div className={styles.draftVersionCard}>
      <div className={styles.sectionHeading}>
        <h2>Create immutable draft version</h2>
        <p>Published versions cannot be edited. Prices are entered in minor units (e.g. 99900 = ₹999.00).</p>
      </div>

      <div className={styles.presetBar}>
        <span className={styles.presetLabel}>Quick Presets:</span>
        {productKey === "OFFLINE_OPD" ? (
          <>
            <button
              type="button"
              className={styles.presetButton}
              onClick={() => applyPreset("OPD_FREE")}
            >
              Free Default (100 appts, 5 seats)
            </button>
            <button
              type="button"
              className={styles.presetButton}
              onClick={() => applyPreset("OPD_GROWTH")}
            >
              Growth Tier (₹999/mo, 500 appts, 15 seats)
            </button>
          </>
        ) : (
          <button
            type="button"
            className={styles.presetButton}
            onClick={() => applyPreset("IPD_STANDARD")}
          >
            Standard IPD (₹1,999/mo, 25 beds, 20 seats)
          </button>
        )}
      </div>

      <div className={styles.formGridRow}>
        <label className={styles.fieldLabel}>
          <span>Effective from</span>
          <Input type="datetime-local" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} disabled={disabled} />
        </label>
        <label className={styles.fieldLabel}>
          <span>Effective until (optional)</span>
          <Input type="datetime-local" value={effectiveUntil} onChange={(event) => setEffectiveUntil(event.target.value)} disabled={disabled} />
        </label>
      </div>

      <div className={styles.formGridRowThree}>
        <label className={styles.fieldLabel}>
          <div className={styles.labelHeader}>
            <span>Price (minor units: 100 = ₹1.00)</span>
            <span className={styles.pricePreviewBadge}>{formatMinor(priceMinor || "0", currency)}</span>
          </div>
          <Input inputMode="numeric" value={priceMinor} onChange={(event) => setPriceMinor(event.target.value.replace(/\D/g, ""))} placeholder="0" disabled={disabled} />
        </label>
        <label className={styles.fieldLabel}>
          <span>Currency</span>
          <Input value={currency} maxLength={3} onChange={(event) => setCurrency(event.target.value.toUpperCase())} disabled={disabled} />
        </label>
        <label className={styles.fieldLabel}>
          <span>Billing cadence</span>
          <Select value={cadence} onChange={(event) => setCadence(event.target.value as typeof cadence)} disabled={disabled}>
            <option value="MONTHLY">Monthly</option>
            <option value="ANNUAL">Annual</option>
            {productKey !== "IPD_MANAGEMENT" ? <option value="NONE">None (Free tier)</option> : null}
          </Select>
        </label>
      </div>

      <div className={styles.entitlementsContainer}>
        <div className={styles.subHeading}>
          <h3>Entitlements and usage quotas</h3>
          <p>Configure feature limits for this plan version (allowances, active staff-seat limits, and admissions).</p>
        </div>

        <div className={styles.entitlementList}>
          {entitlements.map((item, index) => (
            <div className={styles.entitlementCard} key={index}>
              <label className={styles.fieldLabel}>
                <span>Entitlement Key</span>
                <Input value={item.key} onChange={(event) => updateEntitlement(index, { key: event.target.value })} placeholder="opd.offline-appointment.committed" disabled={disabled} />
              </label>
              <label className={styles.fieldLabel}>
                <span>Value (JSON object)</span>
                <Input value={item.value} onChange={(event) => updateEntitlement(index, { value: event.target.value })} placeholder='{"allowance":500}' disabled={disabled} />
              </label>
              <label className={styles.fieldLabel}>
                <span>Status</span>
                <Select value={item.enabled ? "true" : "false"} onChange={(event) => updateEntitlement(index, { enabled: event.target.value === "true" })} disabled={disabled}>
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </Select>
              </label>
              <div>
                <button
                  type="button"
                  className={styles.removeEntitlementBtn}
                  onClick={() => setEntitlements((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                  disabled={disabled || entitlements.length === 1}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.draftActionsRow}>
          <Button variant="secondary" onClick={() => setEntitlements((items) => [...items, { key: "", enabled: true, value: "{}" }])} disabled={disabled}>
            + Add entitlement
          </Button>
          <Button onClick={() => void submit()} disabled={disabled}>
            Create draft version
          </Button>
        </div>
      </div>
      {validation ? <Alert tone="error">{validation}</Alert> : null}
    </div>
  );
}


