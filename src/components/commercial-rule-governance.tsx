"use client";

import { useEffect, useState } from "react";
import { approveCommercialRule, createCommercialRule, listCommercialRules, previewCommercialRules, retireCommercialRule, submitCommercialRule, type CommercialOfferingPreview, type CommercialRuleVersion } from "../lib/platform-api/platform-admin";
import { PlatformApiError } from "../lib/platform-api/client";
import { Alert, Button, Card, DataTable, ErrorState, LoadingState, PageHeader, Select, StatusBadge, useToast } from "./ui";

function loadErrorMessage(cause: unknown) {
  if (!(cause instanceof PlatformApiError)) return "Commercial governance could not be loaded. Check that the local API is reachable, then retry.";
  if (cause.status === 401) return "Your Platform Admin session has expired. Sign in again before reviewing commercial governance.";
  if (cause.status === 403) return "Platform Admin access is required to review commercial governance.";
  if (cause.status === 404) return "Commercial governance is unavailable on the current API. Verify that the running API includes the commercial-governance routes.";
  if (cause.status >= 500) return "Commercial governance is unavailable on the API. Verify that the commercial-governance database migration is applied, then retry.";
  return cause.message || "Commercial governance could not be loaded.";
}

export function CommercialRuleGovernance() {
  const [rules, setRules] = useState<CommercialRuleVersion[]>([]);
  const [preview, setPreview] = useState<CommercialOfferingPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [basisPoints, setBasisPoints] = useState("1500");
  const { message, show } = useToast();

  const reload = async () => {
    setLoading(true);
    setReady(false);
    setError(null);
    try {
      const [ruleResponse, previewResponse] = await Promise.all([listCommercialRules(), previewCommercialRules()]);
      setRules(ruleResponse.items);
      setPreview(previewResponse.items);
      setReady(true);
    } catch (cause) {
      setRules([]);
      setPreview([]);
      setError(loadErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void reload(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const createDefault = async () => {
    if (!ready) return;
    setWorking("default");
    try {
      await createCommercialRule({ ruleType: "PERCENTAGE", priority: 0, effectiveFrom: new Date().toISOString(), calculationBasis: "PLATFORM_COMMISSION", processingFeeBearer: "THECLINIQ", policy: { percentageBasisPoints: 2000 }, scopes: [{ kind: "OTHER_APPROVED", value: "PLATFORM_DEFAULT" }] });
      show("20% platform default saved as a draft. It is not active until approved.");
      await reload();
    } catch {
      setError("The default draft could not be created.");
    } finally {
      setWorking(null);
    }
  };

  const createServiceRule = async () => {
    if (!ready) return;
    const value = Number(basisPoints);
    if (!serviceId || !Number.isInteger(value) || value < 0) {
      setError("Select an offering and enter a whole-number basis-point commission.");
      return;
    }
    setWorking("service");
    try {
      await createCommercialRule({ ruleType: "PERCENTAGE", priority: 1, effectiveFrom: new Date().toISOString(), calculationBasis: "PLATFORM_COMMISSION", processingFeeBearer: "THECLINIQ", policy: { percentageBasisPoints: value }, scopes: [{ kind: "SERVICE", value: serviceId }] });
      show("Service-specific rule saved as a draft. It is not active until approved.");
      await reload();
    } catch {
      setError("The service rule draft could not be created.");
    } finally {
      setWorking(null);
    }
  };

  const action = async (id: string, kind: "submit" | "approve" | "retire") => {
    if (!ready) return;
    setWorking(id);
    try {
      if (kind === "submit") await submitCommercialRule(id);
      else if (kind === "approve") await approveCommercialRule(id);
      else await retireCommercialRule(id, new Date().toISOString());
      show(kind === "retire" ? "Rule version retired." : `Rule version ${kind}ted.`);
      await reload();
    } catch {
      setError("The commercial-rule lifecycle operation could not be completed.");
    } finally {
      setWorking(null);
    }
  };

  const uncovered = preview.filter((item) => item.result !== "COVERED");
  const controlsDisabled = !ready || working !== null;

  return <>
    <PageHeader eyebrow="Financial Operations" title="Commercial rule governance" description="Versioned, effective-dated commission rules. Historical allocation snapshots are never changed." />
    {error ? <ErrorState detail={error} /> : null}
    {loading ? <LoadingState label="Loading commercial rules..." /> : null}
    {!loading && !ready ? <Card><h2>Governance data unavailable</h2><p>Rule lifecycle actions are disabled until the API returns the current rules and applicability preview.</p><Button variant="secondary" onClick={() => void reload()} disabled={loading}>Retry loading governance data</Button></Card> : null}
    {ready ? <div className="stack">
      <div className="metrics-grid">
        <Card><strong>{rules.filter((rule) => rule.status === "APPROVED").length}</strong><span>Approved versions</span></Card>
        <Card><strong>{uncovered.filter((item) => item.result === "UNCOVERED").length}</strong><span>Uncovered active offerings</span></Card>
        <Card><strong>{uncovered.filter((item) => item.result === "AMBIGUOUS").length}</strong><span>Ambiguous offerings</span></Card>
        <Card><Button onClick={() => void createDefault()} disabled={controlsDisabled}>Create 20% default draft</Button><span>Explicit fallback only; approval remains required.</span></Card>
      </div>
      <Card><h2>Create service-specific draft</h2><div className="filters"><Select value={serviceId} onChange={(event) => setServiceId(event.target.value)} disabled={controlsDisabled}><option value="">Select offering</option>{preview.map((item) => <option key={item.offeringId} value={item.offeringId}>{item.offeringName}</option>)}</Select><input aria-label="Commission basis points" value={basisPoints} onChange={(event) => setBasisPoints(event.target.value)} inputMode="numeric" disabled={controlsDisabled} /><Button onClick={() => void createServiceRule()} disabled={controlsDisabled}>Create service draft</Button></div><p>Service rules use priority 1, above the explicit priority-0 platform fallback.</p></Card>
      <Card><h2>Applicability review</h2><DataTable><thead><tr><th>Offering</th><th>Result</th><th>Selected version</th></tr></thead><tbody>{preview.map((item) => <tr key={item.offeringId}><td>{item.offeringName}</td><td><StatusBadge value={item.result} /></td><td>{item.selectedVersionId ?? "—"}</td></tr>)}</tbody></DataTable></Card>
      <Card><h2>Rule history</h2><DataTable><thead><tr><th>Rule</th><th>Version</th><th>Scope</th><th>Priority</th><th>Effective period</th><th>Status</th><th /></tr></thead><tbody>{rules.map((rule) => <tr key={rule.id}><td>{rule.ruleType}</td><td>v{rule.versionNumber}</td><td>{rule.scopes.map((scope) => `${scope.kind}${scope.value ? `: ${scope.value}` : ""}`).join(", ")}</td><td>{rule.priority}</td><td>{new Date(rule.effectiveFrom).toLocaleString()}{rule.effectiveUntil ? ` – ${new Date(rule.effectiveUntil).toLocaleString()}` : " onward"}</td><td><StatusBadge value={rule.status} /></td><td>{rule.status === "DRAFT" ? <Button variant="secondary" disabled={controlsDisabled} onClick={() => void action(rule.id, "submit")}>Submit</Button> : rule.status === "SUBMITTED" ? <Button disabled={controlsDisabled} onClick={() => void action(rule.id, "approve")}>Approve</Button> : rule.status === "APPROVED" ? <Button variant="danger" disabled={controlsDisabled} onClick={() => void action(rule.id, "retire")}>Retire</Button> : null}</td></tr>)}</tbody></DataTable></Card>
    </div> : null}
    {message ? <Alert>{message}</Alert> : null}
  </>;
}
