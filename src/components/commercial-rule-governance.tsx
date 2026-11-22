"use client";

import { useEffect, useState } from "react";
import {
  approveCommercialRule,
  createCommercialPartner,
  createCommercialRule,
  getCommercialRulesOverview,
  listCommercialPartners,
  listCommercialRules,
  listPaymentGateways,
  previewCommercialRules,
  retireCommercialRule,
  simulateCommercialRules,
  submitCommercialRule,
  supersedeCommercialRule,
  updateCommercialPartner,
  updatePaymentGateway,
  type CommercialOfferingPreview,
  type CommercialPartner,
  type CommercialRuleVersion,
  type CommercialSimulationResult,
  type FinancialGovernanceOverview,
  type PaymentGatewayConfig,
  type TransactionChannel,
} from "../lib/platform-api/platform-admin";
import { PlatformApiError } from "../lib/platform-api/client";
import {
  Alert,
  Badge,
  Button,
  Card,
  DataTable,
  DatePicker,
  ErrorState,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Tabs,
  useToast,
} from "./ui";
import styles from "./commercial-governance.module.css";

function loadErrorMessage(cause: unknown) {
  if (!(cause instanceof PlatformApiError)) {
    return "Commercial governance could not be loaded. Check that the local API is reachable, then retry.";
  }
  if (cause.status === 401) return "Your Platform Admin session has expired. Sign in again before reviewing commercial governance.";
  if (cause.status === 403) return "Platform Admin access is required to review commercial governance.";
  if (cause.status === 404) return "Commercial governance is unavailable on the current API.";
  if (cause.status >= 500) return "Commercial governance is unavailable on the API. Verify that database migrations are applied.";
  return cause.message || "Commercial governance could not be loaded.";
}

const TABS = [
  { id: "overview", label: "Financial Overview" },
  { id: "channels", label: "Transaction Channels" },
  { id: "rules", label: "Commercial Rules" },
  { id: "partners", label: "Partner Financials" },
  { id: "tax", label: "GST & Tax Governance" },
  { id: "gateway", label: "Razorpay & Gateway" },
  { id: "simulation", label: "Financial Simulator" },
  { id: "history", label: "Version History" },
] as const;

export function CommercialRuleGovernance() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [rules, setRules] = useState<CommercialRuleVersion[]>([]);
  const [overview, setOverview] = useState<FinancialGovernanceOverview | null>(null);
  const [preview, setPreview] = useState<CommercialOfferingPreview[]>([]);
  const [partners, setPartners] = useState<CommercialPartner[]>([]);
  const [gateways, setGateways] = useState<PaymentGatewayConfig[]>([]);

  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { message, show } = useToast();

  // Filters for Rules tab
  const [filterChannel, setFilterChannel] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Create Draft Rule Modal
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftRuleType, setDraftRuleType] = useState<string>("PERCENTAGE");
  const [draftChannel, setDraftChannel] = useState<TransactionChannel>("ONLINE_OPD");
  const [draftBeneficiary, setDraftBeneficiary] = useState<string>("PLATFORM");
  const [draftBasisPoints, setDraftBasisPoints] = useState("1500");
  const [draftFixedAmount, setDraftFixedAmount] = useState("0");
  const [draftPriority, setDraftPriority] = useState("1");
  const [draftScopeKind, setDraftScopeKind] = useState("CHANNEL");
  const [draftScopeValue, setDraftScopeValue] = useState("ONLINE_OPD");
  const [draftChangeReason, setDraftChangeReason] = useState("");

  // Supersede Modal
  const [supersedeModalOpen, setSupersedeModalOpen] = useState(false);
  const [supersedeTarget, setSupersedeTarget] = useState<CommercialRuleVersion | null>(null);
  const [supersedeBasisPoints, setSupersedeBasisPoints] = useState("");
  const [supersedeFixedAmount, setSupersedeFixedAmount] = useState("");
  const [supersedeEffectiveFrom, setSupersedeEffectiveFrom] = useState("");
  const [supersedeReason, setSupersedeReason] = useState("");

  // Retire Modal
  const [retireModalOpen, setRetireModalOpen] = useState(false);
  const [retireTargetId, setRetireTargetId] = useState<string | null>(null);
  const [retireEffectiveUntil, setRetireEffectiveUntil] = useState("");

  // Partner Modal
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerType, setPartnerType] = useState<CommercialPartner["partnerType"]>("REFERRAL");
  const [partnerFrequency, setPartnerFrequency] = useState<CommercialPartner["settlementFrequency"]>("MONTHLY");
  const [partnerMinPayout, setPartnerMinPayout] = useState("50000");

  // Simulator
  const [simChannel, setSimChannel] = useState<TransactionChannel>("ONLINE_OPD");
  const [simGross, setSimGross] = useState("1000");
  const [simDiscount, setSimDiscount] = useState("0");
  const [simServiceId, setSimServiceId] = useState("");
  const [simPartnerId, setSimPartnerId] = useState("");
  const [simResult, setSimResult] = useState<CommercialSimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);

  const reload = async () => {
    setLoading(true);
    setReady(false);
    setError(null);
    try {
      const [rulesRes, overviewRes, previewRes, partnersRes, gatewaysRes] = await Promise.all([
        listCommercialRules(),
        getCommercialRulesOverview(),
        previewCommercialRules(),
        listCommercialPartners(),
        listPaymentGateways(),
      ]);
      setRules(rulesRes.items);
      setOverview(overviewRes);
      setPreview(previewRes.items);
      setPartners(partnersRes.items);
      setGateways(gatewaysRes.items);
      setReady(true);
    } catch (cause) {
      setError(loadErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void reload();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Action handlers
  const handleAction = async (id: string, kind: "submit" | "approve" | "retire") => {
    if (!ready) return;
    setWorking(id);
    try {
      if (kind === "submit") await submitCommercialRule(id);
      else if (kind === "approve") await approveCommercialRule(id);
      else await retireCommercialRule(id, retireEffectiveUntil || new Date().toISOString());
      show(kind === "retire" ? "Rule retired successfully." : `Rule version ${kind}d successfully.`);
      setRetireModalOpen(false);
      await reload();
    } catch {
      setError(`Failed to perform ${kind} operation.`);
    } finally {
      setWorking(null);
    }
  };

  const handleCreateDraft = async () => {
    if (!ready) return;
    setWorking("create_draft");
    try {
      const bps = Number(draftBasisPoints);
      const fixed = Number(draftFixedAmount);
      const prio = Number(draftPriority);

      await createCommercialRule({
        name: draftName.trim() || undefined,
        description: draftDescription.trim() || undefined,
        ruleType: draftRuleType,
        channel: draftChannel,
        beneficiaryType: draftBeneficiary as never,
        priority: prio,
        effectiveFrom: new Date().toISOString(),
        calculationBasis: draftRuleType === "TAX_GST" ? "TAX_CALCULATION" : "PLATFORM_COMMISSION",
        processingFeeBearer: "THECLINIQ",
        changeReason: draftChangeReason.trim() || "Administrative draft rule created",
        policy: {
          ...(draftRuleType === "TAX_GST" ? { gstRateBps: bps, taxType: "GST" } : {}),
          ...(bps > 0 ? { percentageBasisPoints: bps } : {}),
          ...(fixed > 0 ? { fixedAmountMinor: fixed * 100 } : {}),
        },
        scopes: [{ kind: draftScopeKind, value: draftScopeValue.trim() || undefined }],
      });

      show("Rule draft created successfully. Approval is required before it becomes active.");
      setDraftModalOpen(false);
      resetDraftForm();
      await reload();
    } catch {
      setError("Failed to create rule draft. Ensure priority and scope are valid.");
    } finally {
      setWorking(null);
    }
  };

  const handleSupersede = async () => {
    if (!ready || !supersedeTarget) return;
    setWorking("supersede");
    try {
      const bps = Number(supersedeBasisPoints);
      const effFrom = supersedeEffectiveFrom ? new Date(supersedeEffectiveFrom).toISOString() : new Date().toISOString();

      await supersedeCommercialRule(supersedeTarget.id, {
        name: supersedeTarget.name,
        description: supersedeTarget.description,
        ruleType: supersedeTarget.ruleType,
        channel: supersedeTarget.channel,
        beneficiaryType: supersedeTarget.beneficiaryType,
        priority: supersedeTarget.priority,
        effectiveFrom: effFrom,
        calculationBasis: supersedeTarget.calculationBasis,
        processingFeeBearer: supersedeTarget.processingFeeBearer as never,
        changeReason: supersedeReason.trim() || "Scheduled commercial rate update",
        policy: {
          ...supersedeTarget.policy,
          percentageBasisPoints: bps,
        },
        scopes: supersedeTarget.scopes,
      });

      show("Scheduled rule version drafted successfully.");
      setSupersedeModalOpen(false);
      await reload();
    } catch {
      setError("Failed to schedule superseding version.");
    } finally {
      setWorking(null);
    }
  };

  const handleCreatePartner = async () => {
    if (!ready) return;
    setWorking("partner");
    try {
      await createCommercialPartner({
        name: partnerName.trim(),
        contactEmail: partnerEmail.trim(),
        partnerType,
        settlementFrequency: partnerFrequency,
        minimumPayoutThresholdMinor: partnerMinPayout,
      });
      show("Commercial partner registered successfully.");
      setPartnerModalOpen(false);
      setPartnerName("");
      setPartnerEmail("");
      await reload();
    } catch {
      setError("Failed to register commercial partner.");
    } finally {
      setWorking(null);
    }
  };

  const handleRunSimulation = async () => {
    if (!ready) return;
    setSimulating(true);
    try {
      const grossMinor = (parseFloat(simGross) || 0) * 100;
      const discountMinor = (parseFloat(simDiscount) || 0) * 100;

      const result = await simulateCommercialRules({
        channel: simChannel,
        grossAmountMinor: grossMinor.toString(),
        discountAmountMinor: discountMinor.toString(),
        serviceOfferingId: simServiceId || undefined,
        partnerId: simPartnerId || undefined,
      });
      setSimResult(result);
    } catch {
      setError("Financial simulation failed. Check selected channel or offering.");
    } finally {
      setSimulating(false);
    }
  };

  const resetDraftForm = () => {
    setDraftName("");
    setDraftDescription("");
    setDraftRuleType("PERCENTAGE");
    setDraftChannel("ONLINE_OPD");
    setDraftBeneficiary("PLATFORM");
    setDraftBasisPoints("1500");
    setDraftFixedAmount("0");
    setDraftPriority("1");
    setDraftScopeKind("CHANNEL");
    setDraftScopeValue("ONLINE_OPD");
    setDraftChangeReason("");
  };

  const filteredRules = rules.filter(r => {
    if (filterChannel !== "ALL" && r.channel !== filterChannel && r.channel !== "ALL") return false;
    if (filterStatus !== "ALL" && r.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className={styles.governanceContainer}>
      <PageHeader
        eyebrow="Financial Operations & Commercial Architecture"
        title="Commercial Rules & Financial Governance Centre"
        description="Authoritative, versioned, and auditable financial policies governing commissions, partner splits, platform fees, GST rates, and payment gateway charges across The CliniQ."
        action={
          <div style={{ display: "flex", gap: "8px" }}>
            <Button variant="secondary" onClick={() => void reload()} disabled={loading}>
              Refresh
            </Button>
            <Button onClick={() => setDraftModalOpen(true)} disabled={!ready}>
              + Create Rule Draft
            </Button>
          </div>
        }
      />

      {error ? <ErrorState detail={error} /> : null}
      {loading ? <LoadingState label="Loading commercial rules and financial governance..." /> : null}

      {ready && overview ? (
        <>
          {/* Metadata Banner */}
          <div className={styles.metaBanner}>
            <div className={styles.metaItem}>
              <span>Status:</span> <strong>All Channels Governed</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Active Configurations:</span> <strong>{overview.totalActiveConfigurations}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Next Scheduled Change:</span>{" "}
              <strong>{overview.nextScheduledChangeAt ? new Date(overview.nextScheduledChangeAt).toLocaleDateString() : "None"}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Last Modified:</span>{" "}
              <strong>{overview.lastModifiedAt ? new Date(overview.lastModifiedAt).toLocaleDateString() : "Initial Migration"}</strong>
            </div>
          </div>

          {/* Navigation Tabs */}
          <Tabs items={TABS} active={activeTab} onChange={setActiveTab} />

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div className={styles.kpiGrid}>
                <div className={`${styles.kpiCard} ${styles.kpiCardSuccess}`}>
                  <p className={styles.kpiLabel}>Active Configurations</p>
                  <p className={styles.kpiValue}>{overview.totalActiveConfigurations}</p>
                  <p className={styles.kpiSubtext}>{overview.approvedVersions} total approved versions</p>
                </div>
                <div className={`${styles.kpiCard} ${styles.kpiCardWarning}`}>
                  <p className={styles.kpiLabel}>Pending Approvals</p>
                  <p className={styles.kpiValue}>{overview.pendingApprovals}</p>
                  <p className={styles.kpiSubtext}>Draft & submitted versions</p>
                </div>
                <div className={`${styles.kpiCard} ${styles.kpiCardPurple}`}>
                  <p className={styles.kpiLabel}>Upcoming Changes</p>
                  <p className={styles.kpiValue}>{overview.upcomingChanges}</p>
                  <p className={styles.kpiSubtext}>Future effective dates scheduled</p>
                </div>
                <div className={styles.kpiCard}>
                  <p className={styles.kpiLabel}>Expired Rules</p>
                  <p className={styles.kpiValue}>{overview.expiredRules}</p>
                  <p className={styles.kpiSubtext}>Retired historical versions</p>
                </div>
                <div className={`${styles.kpiCard} ${overview.uncoveredOfferings > 0 ? styles.kpiCardAlert : ""}`}>
                  <p className={styles.kpiLabel}>Uncovered Operations</p>
                  <p className={styles.kpiValue}>{overview.uncoveredOfferings}</p>
                  <p className={styles.kpiSubtext}>Services lacking approved rule</p>
                </div>
                <div className={`${styles.kpiCard} ${overview.ambiguousOfferings > 0 ? styles.kpiCardAlert : ""}`}>
                  <p className={styles.kpiLabel}>Conflicting Rules</p>
                  <p className={styles.kpiValue}>{overview.ambiguousOfferings}</p>
                  <p className={styles.kpiSubtext}>Ambiguities detected by engine</p>
                </div>
              </div>

              {/* Channel Quick Summary */}
              <Card>
                <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "700" }}>Transaction Channel Commercial Baseline</h3>
                <div className={styles.channelsGrid}>
                  {Object.entries(overview.channels).map(([ch, info]) => (
                    <div key={ch} className={styles.channelCard}>
                      <div className={styles.channelHeader}>
                        <h4 className={styles.channelTitle}>{ch.replace(/_/g, " ")}</h4>
                        <span className={styles.channelBadge}>{info.activeRulesCount} Active Rules</span>
                      </div>
                      <div className={styles.channelDetails}>
                        <div className={styles.detailRow}>
                          <span>Standard Commission Rate:</span>
                          <span className={styles.detailValue}>
                            {info.defaultRateBps !== undefined ? `${(info.defaultRateBps / 100).toFixed(2)}%` : "None"}
                          </span>
                        </div>
                        <div className={styles.detailRow}>
                          <span>Precedence Level:</span>
                          <span className={styles.precedenceBadge}>Level 2 (Channel)</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: TRANSACTION CHANNELS */}
          {activeTab === "channels" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>Transaction Channel Configurations</h3>
                    <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13px" }}>
                      Each channel has independent commercial governance. Rules do not automatically cross channels.
                    </p>
                  </div>
                  <Button onClick={() => setDraftModalOpen(true)}>+ Configure New Channel Rule</Button>
                </div>

                <div className={styles.channelsGrid}>
                  {[
                    { key: "ONLINE_OPD", name: "Online OPD Consultations", desc: "Patient video/chat consultations booked online with direct payment capture." },
                    { key: "OFFLINE_OPD", name: "Offline OPD Walk-in Bills", desc: "Clinic reception consultation bills with clinic-side or POS collection." },
                    { key: "OFFLINE_IPD", name: "Offline IPD Admissions", desc: "Inpatient admission, bed charges, and hospital treatment procedures." },
                    { key: "OPD_SUBSCRIPTION", name: "OPD Clinic Subscriptions", desc: "Monthly/annual SaaS plans for clinic outpatient management." },
                    { key: "IPD_SUBSCRIPTION", name: "IPD Management Subscriptions", desc: "Modular inpatient bed and admission SaaS plan subscriptions." },
                    { key: "DOCTOR_SUBSCRIPTION", name: "Independent Doctor Subscriptions", desc: "Independent practitioner profile presentation and booking plans." },
                  ].map(ch => {
                    const channelRules = rules.filter(r => r.channel === ch.key && r.status === "APPROVED");
                    return (
                      <div key={ch.key} className={styles.channelCard}>
                        <div className={styles.channelHeader}>
                          <div>
                            <h4 className={styles.channelTitle}>{ch.name}</h4>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>Code: {ch.key}</span>
                          </div>
                          <Badge tone={channelRules.length > 0 ? "success" : "warning"}>
                            {channelRules.length > 0 ? "Configured" : "Needs Config"}
                          </Badge>
                        </div>
                        <p style={{ fontSize: "12px", color: "#475569", margin: 0 }}>{ch.desc}</p>
                        <div className={styles.channelDetails}>
                          <div className={styles.detailRow}>
                            <span>Active Governed Rules:</span>
                            <span className={styles.detailValue}>{channelRules.length}</span>
                          </div>
                          <div className={styles.detailRow}>
                            <span>Top Priority Rule:</span>
                            <span className={styles.detailValue}>
                              {channelRules[0]?.name || (channelRules[0]?.policy.percentageBasisPoints ? `${Number(channelRules[0].policy.percentageBasisPoints) / 100}%` : "None")}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setDraftChannel(ch.key as TransactionChannel);
                            setDraftScopeKind("CHANNEL");
                            setDraftScopeValue(ch.key);
                            setDraftModalOpen(true);
                          }}
                        >
                          Draft Channel Rule
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* TAB 3: COMMERCIAL RULES MANAGEMENT */}
          {activeTab === "rules" && (
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <Select value={filterChannel} onChange={e => setFilterChannel(e.target.value)}>
                    <option value="ALL">All Channels</option>
                    <option value="ONLINE_OPD">Online OPD</option>
                    <option value="OFFLINE_OPD">Offline OPD</option>
                    <option value="OFFLINE_IPD">Offline IPD</option>
                    <option value="OPD_SUBSCRIPTION">OPD Subscriptions</option>
                    <option value="IPD_SUBSCRIPTION">IPD Subscriptions</option>
                  </Select>
                  <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="ALL">All Statuses</option>
                    <option value="APPROVED">Approved</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="DRAFT">Draft</option>
                    <option value="RETIRED">Retired</option>
                  </Select>
                </div>
                <Button onClick={() => setDraftModalOpen(true)}>+ New Rule Draft</Button>
              </div>

              <DataTable>
                <thead>
                  <tr>
                    <th>Rule Name</th>
                    <th>Type</th>
                    <th>Channel</th>
                    <th>Beneficiary</th>
                    <th>Rate / Fee</th>
                    <th>Prio</th>
                    <th>Effective Period</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRules.map(rule => (
                    <tr key={rule.id}>
                      <td>
                        <strong>{rule.name || rule.ruleType}</strong>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>v{rule.versionNumber} • {rule.id.slice(0, 8)}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: "12px", fontWeight: "600" }}>{rule.ruleType}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: "12px" }}>{rule.channel || "ALL"}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: "12px" }}>{rule.beneficiaryType || "PLATFORM"}</span>
                      </td>
                      <td>
                        <strong style={{ color: "#0f172a" }}>
                          {rule.policy.percentageBasisPoints !== undefined
                            ? `${(Number(rule.policy.percentageBasisPoints) / 100).toFixed(2)}%`
                            : rule.policy.fixedAmountMinor !== undefined
                            ? `₹${(Number(rule.policy.fixedAmountMinor) / 100).toFixed(2)}`
                            : rule.policy.gstRateBps !== undefined
                            ? `${(Number(rule.policy.gstRateBps) / 100).toFixed(2)}% GST`
                            : "0.00"}
                        </strong>
                      </td>
                      <td>{rule.priority}</td>
                      <td style={{ fontSize: "12px" }}>
                        {new Date(rule.effectiveFrom).toLocaleDateString()}
                        {rule.effectiveUntil ? ` – ${new Date(rule.effectiveUntil).toLocaleDateString()}` : " onward"}
                      </td>
                      <td>
                        <StatusBadge value={rule.status} />
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          {rule.status === "DRAFT" && (
                            <Button
                              variant="secondary"
                              disabled={working !== null}
                              onClick={() => void handleAction(rule.id, "submit")}
                            >
                              Submit
                            </Button>
                          )}
                          {rule.status === "SUBMITTED" && (
                            <Button
                              disabled={working !== null}
                              onClick={() => void handleAction(rule.id, "approve")}
                            >
                              Approve
                            </Button>
                          )}
                          {rule.status === "APPROVED" && (
                            <>
                              <Button
                                variant="secondary"
                                disabled={working !== null}
                                onClick={() => {
                                  setSupersedeTarget(rule);
                                  setSupersedeBasisPoints(rule.policy.percentageBasisPoints?.toString() || "");
                                  setSupersedeFixedAmount(rule.policy.fixedAmountMinor?.toString() || "");
                                  setSupersedeEffectiveFrom(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
                                  setSupersedeModalOpen(true);
                                }}
                              >
                                Supersede
                              </Button>
                              <Button
                                variant="danger"
                                disabled={working !== null}
                                onClick={() => {
                                  setRetireTargetId(rule.id);
                                  setRetireEffectiveUntil(new Date().toISOString());
                                  setRetireModalOpen(true);
                                }}
                              >
                                Retire
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </Card>
          )}

          {/* TAB 4: PARTNER FINANCIALS */}
          {activeTab === "partners" && (
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>Commercial Partner Financial Configuration</h3>
                  <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13px" }}>
                    Configure referral commissions, revenue splits, and payout thresholds for healthcare network partners.
                  </p>
                </div>
                <Button onClick={() => setPartnerModalOpen(true)}>+ Register New Partner</Button>
              </div>

              <DataTable>
                <thead>
                  <tr>
                    <th>Partner Name</th>
                    <th>Type</th>
                    <th>Contact Email</th>
                    <th>Settlement Cadence</th>
                    <th>Min Payout Threshold</th>
                    <th>Status</th>
                    <th>Registered At</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                        No commercial partners registered yet. Click &quot;Register New Partner&quot; to add one.
                      </td>
                    </tr>
                  ) : (
                    partners.map(p => (
                      <tr key={p.id}>
                        <td><strong>{p.name}</strong></td>
                        <td><span style={{ fontSize: "12px", fontWeight: "600" }}>{p.partnerType}</span></td>
                        <td>{p.contactEmail}</td>
                        <td>{p.settlementFrequency}</td>
                        <td>₹{(Number(p.minimumPayoutThresholdMinor) / 100).toFixed(2)}</td>
                        <td><StatusBadge value={p.status} /></td>
                        <td style={{ fontSize: "12px" }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </DataTable>
            </Card>
          )}

          {/* TAB 5: GST & TAX GOVERNANCE */}
          {activeTab === "tax" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div className={styles.channelsGrid}>
                <div className={styles.channelCard}>
                  <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Platform Facilitation GST Policy</h4>
                  <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                    GST is calculated strictly on platform facilitation service fees, never on the gross patient consultation.
                  </p>
                  <div className={styles.channelDetails}>
                    <div className={styles.detailRow}>
                      <span>Standard GST Rate:</span>
                      <strong style={{ fontSize: "18px", color: "#0f172a" }}>18.00% (1800 bps)</strong>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Tax Component Split:</span>
                      <span className={styles.detailValue}>CGST 9.00% + SGST 9.00% (Intra-state) / IGST 18.00%</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span>HSN / SAC Code:</span>
                      <span className={styles.detailValue}>998311 (Healthcare support services)</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span>GST Registration (GSTIN):</span>
                      <span className={styles.detailValue}>27AABCU9603R1ZM</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Tax Quoting Basis:</span>
                      <span className={styles.detailValue}>Exclusive of Platform Fee</span>
                    </div>
                  </div>
                </div>

                <div className={styles.channelCard}>
                  <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Tax Compliance Governance</h4>
                  <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                    Tax policy modifications require administrator governance and accounting validation.
                  </p>
                  <div className={styles.channelDetails}>
                    <div className={styles.detailRow}>
                      <span>Historical Preservation:</span>
                      <span className={styles.detailValue}>Guaranteed immutable per snapshot</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span>General Ledger Account:</span>
                      <span className={styles.detailValue}>2110 (GST Output Liability)</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Tax Exemption Code:</span>
                      <span className={styles.detailValue}>Sec. 12AA / 80G Applicable where registered</span>
                    </div>
                  </div>
                </div>
              </div>

              <Card>
                <h4 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "700" }}>Approved Tax Configuration Versions</h4>
                <DataTable>
                  <thead>
                    <tr>
                      <th>Rule ID</th>
                      <th>Category</th>
                      <th>GST Rate</th>
                      <th>Tax Type</th>
                      <th>Effective From</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.filter(r => r.ruleType === "TAX_GST").map(r => (
                      <tr key={r.id}>
                        <td><strong>{r.name || "GST Facilitation Rule"}</strong></td>
                        <td>Platform Facilitation</td>
                        <td><strong>{r.policy.gstRateBps ? `${Number(r.policy.gstRateBps) / 100}%` : "18.00%"}</strong></td>
                        <td>{r.policy.taxType || "GST"}</td>
                        <td>{new Date(r.effectiveFrom).toLocaleDateString()}</td>
                        <td><StatusBadge value={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </Card>
            </div>
          )}

          {/* TAB 6: RAZORPAY & GATEWAY */}
          {activeTab === "gateway" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <Card>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "700" }}>Payment Gateway Environments (Razorpay)</h3>
                <p style={{ margin: "0 0 20px 0", color: "#64748b", fontSize: "13px" }}>
                  Managed integration with Razorpay. Secret credentials are stored securely and never returned in browser responses.
                </p>

                <div className={styles.channelsGrid}>
                  {gateways.map(gw => (
                    <div key={gw.id} className={styles.channelCard}>
                      <div className={styles.channelHeader}>
                        <div>
                          <h4 className={styles.channelTitle}>{gw.providerKey} — {gw.environment}</h4>
                          <span style={{ fontSize: "12px", color: "#64748b" }}>Merchant: {gw.merchantAccountId}</span>
                        </div>
                        <Badge tone={gw.environment === "LIVE" ? "success" : "warning"}>
                          {gw.environment}
                        </Badge>
                      </div>
                      <div className={styles.channelDetails}>
                        <div className={styles.detailRow}>
                          <span>Status:</span>
                          <span className={styles.detailValue}>{gw.isActive ? "Active" : "Inactive"}</span>
                        </div>
                        <div className={styles.detailRow}>
                          <span>API Key ID:</span>
                          <span className={styles.detailValue}>{gw.keyId}</span>
                        </div>
                        <div className={styles.detailRow}>
                          <span>Secret Key:</span>
                          <span className={styles.detailValue}>{gw.keySecretMasked}</span>
                        </div>
                        <div className={styles.detailRow}>
                          <span>Webhook Health:</span>
                          <Badge tone={gw.webhookStatus === "HEALTHY" ? "success" : "danger"}>
                            {gw.webhookStatus}
                          </Badge>
                        </div>
                        <div className={styles.detailRow}>
                          <span>Auto Capture:</span>
                          <span className={styles.detailValue}>{gw.autoCapture ? "Enabled" : "Disabled"}</span>
                        </div>
                        <div className={styles.detailRow}>
                          <span>Supported Modes:</span>
                          <span className={styles.detailValue}>{gw.supportedPaymentModes.join(", ")}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h4 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "700" }}>Payment Gateway Fee Policies</h4>
                <DataTable>
                  <thead>
                    <tr>
                      <th>Policy Name</th>
                      <th>Processing Fee %</th>
                      <th>Fixed Fee</th>
                      <th>GST on Fee</th>
                      <th>Fee Bearer</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.filter(r => r.ruleType === "GATEWAY_FEE").map(r => (
                      <tr key={r.id}>
                        <td><strong>{r.name || "Razorpay Fee Policy"}</strong></td>
                        <td>{r.policy.percentageBasisPoints ? `${Number(r.policy.percentageBasisPoints) / 100}%` : "2.00%"}</td>
                        <td>₹0.00</td>
                        <td>18.00%</td>
                        <td><Badge tone="neutral">{r.policy.feeBearer || "THECLINIQ"}</Badge></td>
                        <td><StatusBadge value={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </Card>
            </div>
          )}

          {/* TAB 7: SIMULATOR */}
          {activeTab === "simulation" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <Card>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "700" }}>Interactive Financial Calculation Simulator</h3>
                <p style={{ margin: "0 0 20px 0", color: "#64748b", fontSize: "13px" }}>
                  Test financial outcomes against active approved configurations before publishing new rules.
                </p>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Transaction Channel</label>
                    <Select value={simChannel} onChange={e => setSimChannel(e.target.value as TransactionChannel)}>
                      <option value="ONLINE_OPD">Online OPD (Consultation)</option>
                      <option value="OFFLINE_OPD">Offline OPD (Walk-in)</option>
                      <option value="OFFLINE_IPD">Offline IPD (Admission)</option>
                      <option value="OPD_SUBSCRIPTION">OPD Subscription</option>
                      <option value="IPD_SUBSCRIPTION">IPD Subscription</option>
                    </Select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Gross Amount (₹)</label>
                    <Input
                      type="number"
                      value={simGross}
                      onChange={e => setSimGross(e.target.value)}
                      placeholder="1000"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Discount Amount (₹)</label>
                    <Input
                      type="number"
                      value={simDiscount}
                      onChange={e => setSimDiscount(e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Service Offering (Optional)</label>
                    <Select value={simServiceId} onChange={e => setSimServiceId(e.target.value)}>
                      <option value="">Default / None</option>
                      {preview.map(p => (
                        <option key={p.offeringId} value={p.offeringId}>{p.offeringName}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div style={{ marginTop: "20px" }}>
                  <Button onClick={() => void handleRunSimulation()} disabled={simulating}>
                    {simulating ? "Simulating..." : "Execute Simulation"}
                  </Button>
                </div>
              </Card>

              {simResult ? (
                <div className={styles.waterfallCard}>
                  <h4 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "700" }}>Calculation Waterfall & Allocation Breakdown</h4>
                  <div className={styles.waterfallRow}>
                    <span>Gross Patient Transaction:</span>
                    <strong>₹{(Number(simResult.grossAmountMinor) / 100).toFixed(2)}</strong>
                  </div>
                  <div className={styles.waterfallRow}>
                    <span>Patient Discount:</span>
                    <span style={{ color: "#dc2626" }}>-₹{(Number(simResult.discountAmountMinor) / 100).toFixed(2)}</span>
                  </div>
                  <div className={styles.waterfallRow} style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: "6px" }}>
                    <span>Net Paid by Patient:</span>
                    <strong>₹{(Number(simResult.netPayableMinor) / 100).toFixed(2)}</strong>
                  </div>
                  <div className={styles.waterfallRow}>
                    <span>Platform Commission ({simResult.commissionRateBps / 100}%):</span>
                    <span style={{ color: "#d97706" }}>-₹{(Number(simResult.platformCommissionMinor) / 100).toFixed(2)}</span>
                  </div>
                  <div className={styles.waterfallRow}>
                    <span>GST on Platform Commission ({simResult.taxRateBps / 100}%):</span>
                    <span style={{ color: "#d97706" }}>-₹{(Number(simResult.taxAmountMinor) / 100).toFixed(2)}</span>
                  </div>
                  {Number(simResult.partnerShareMinor) > 0 && (
                    <div className={styles.waterfallRow}>
                      <span>Partner Revenue Share:</span>
                      <span style={{ color: "#2563eb" }}>-₹{(Number(simResult.partnerShareMinor) / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className={styles.waterfallRow}>
                    <span>Estimated Net Provider Settlement:</span>
                    <strong>₹{(Number(simResult.estimatedNetSettlementMinor) / 100).toFixed(2)}</strong>
                  </div>

                  <div className={styles.traceBox}>
                    <strong>Resolution Engine Trace:</strong>
                    <div>Matched Rule Version: <code>{simResult.resolutionTrace.matchedVersionId}</code></div>
                    <div>Precedence Level: <strong>Level {simResult.resolutionTrace.precedenceLevel}</strong> ({simResult.resolutionTrace.precedenceDescription})</div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 8: VERSION HISTORY */}
          {activeTab === "history" && (
            <Card>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: "700" }}>Immutable Version History & Audit Trail</h3>
              <DataTable>
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Rule Name</th>
                    <th>Channel</th>
                    <th>Rate / Amount</th>
                    <th>Priority</th>
                    <th>Effective Dates</th>
                    <th>Change Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map(rule => (
                    <tr key={rule.id}>
                      <td><strong>v{rule.versionNumber}</strong></td>
                      <td>{rule.name || rule.ruleType}</td>
                      <td>{rule.channel || "ALL"}</td>
                      <td>
                        {rule.policy.percentageBasisPoints !== undefined
                          ? `${(Number(rule.policy.percentageBasisPoints) / 100).toFixed(2)}%`
                          : rule.policy.fixedAmountMinor !== undefined
                          ? `₹${(Number(rule.policy.fixedAmountMinor) / 100).toFixed(2)}`
                          : rule.policy.gstRateBps !== undefined
                          ? `${(Number(rule.policy.gstRateBps) / 100).toFixed(2)}% GST`
                          : "0.00"}
                      </td>
                      <td>{rule.priority}</td>
                      <td style={{ fontSize: "12px" }}>
                        {new Date(rule.effectiveFrom).toLocaleDateString()}
                        {rule.effectiveUntil ? ` – ${new Date(rule.effectiveUntil).toLocaleDateString()}` : " onward"}
                      </td>
                      <td style={{ fontSize: "12px", color: "#475569" }}>{rule.changeReason || "Baseline rule"}</td>
                      <td><StatusBadge value={rule.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </Card>
          )}

          {/* MODAL 1: DRAFT NEW RULE */}
          <Modal
            open={draftModalOpen}
            title="Create Governed Commercial Rule Draft"
            onClose={() => setDraftModalOpen(false)}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px 0" }}>
              <div className={styles.formGroup}>
                <label>Rule Name</label>
                <Input
                  value={draftName}
                  onChange={e => setDraftName(e.target.value)}
                  placeholder="e.g. Offline OPD Facilitation 5%"
                />
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Transaction Channel</label>
                  <Select value={draftChannel} onChange={e => setDraftChannel(e.target.value as TransactionChannel)}>
                    <option value="ONLINE_OPD">Online OPD</option>
                    <option value="OFFLINE_OPD">Offline OPD</option>
                    <option value="OFFLINE_IPD">Offline IPD</option>
                    <option value="OPD_SUBSCRIPTION">OPD Subscription</option>
                    <option value="IPD_SUBSCRIPTION">IPD Subscription</option>
                    <option value="ALL">All Channels</option>
                  </Select>
                </div>

                <div className={styles.formGroup}>
                  <label>Rule Type</label>
                  <Select value={draftRuleType} onChange={e => setDraftRuleType(e.target.value)}>
                    <option value="PERCENTAGE">Percentage Commission</option>
                    <option value="FIXED">Fixed Service Fee</option>
                    <option value="TAX_GST">GST / Tax Policy</option>
                    <option value="GATEWAY_FEE">Payment Gateway Fee</option>
                    <option value="ZERO_COMMISSION">Zero Commission</option>
                  </Select>
                </div>

                <div className={styles.formGroup}>
                  <label>Beneficiary</label>
                  <Select value={draftBeneficiary} onChange={e => setDraftBeneficiary(e.target.value)}>
                    <option value="PLATFORM">The CliniQ Platform</option>
                    <option value="CLINIC">Clinic Organization</option>
                    <option value="INDEPENDENT_DOCTOR">Independent Doctor</option>
                    <option value="PARTNER">Commercial Partner</option>
                  </Select>
                </div>

                <div className={styles.formGroup}>
                  <label>Priority (0 = Fallback, &gt;0 = High)</label>
                  <Input
                    type="number"
                    value={draftPriority}
                    onChange={e => setDraftPriority(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Commission / Rate (Basis Points)</label>
                  <Input
                    type="number"
                    value={draftBasisPoints}
                    onChange={e => setDraftBasisPoints(e.target.value)}
                    placeholder="1500 = 15%"
                  />
                  <span className={styles.formHint}>100 basis points = 1.00%</span>
                </div>

                <div className={styles.formGroup}>
                  <label>Fixed Amount (₹)</label>
                  <Input
                    type="number"
                    value={draftFixedAmount}
                    onChange={e => setDraftFixedAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Change Reason / Business Justification</label>
                <Input
                  value={draftChangeReason}
                  onChange={e => setDraftChangeReason(e.target.value)}
                  placeholder="e.g. Commercial realignment for Q1"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                <Button variant="secondary" onClick={() => setDraftModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => void handleCreateDraft()} disabled={working !== null}>
                  Save Draft
                </Button>
              </div>
            </div>
          </Modal>

          {/* MODAL 2: SUPERSEDE RULE */}
          <Modal
            open={supersedeModalOpen}
            title={`Schedule Change: ${supersedeTarget?.name || supersedeTarget?.ruleType}`}
            onClose={() => setSupersedeModalOpen(false)}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px 0" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                Creates a new version that will supersede the current version on the specified effective date.
              </p>

              <div className={styles.formGroup}>
                <label>New Commission Rate (Basis Points)</label>
                <Input
                  type="number"
                  value={supersedeBasisPoints}
                  onChange={e => setSupersedeBasisPoints(e.target.value)}
                  placeholder="e.g. 1800 for 18%"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Effective From Date</label>
                <DatePicker
                  value={supersedeEffectiveFrom}
                  onChange={e => setSupersedeEffectiveFrom(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Reason for Scheduled Change</label>
                <Input
                  value={supersedeReason}
                  onChange={e => setSupersedeReason(e.target.value)}
                  placeholder="e.g. Contract renewal"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                <Button variant="secondary" onClick={() => setSupersedeModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => void handleSupersede()} disabled={working !== null}>
                  Schedule Version
                </Button>
              </div>
            </div>
          </Modal>

          {/* MODAL 3: RETIRE RULE */}
          <Modal
            open={retireModalOpen}
            title="Retire Commercial Rule Version"
            onClose={() => setRetireModalOpen(false)}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px 0" }}>
              <p style={{ margin: 0, fontSize: "14px", color: "#0f172a" }}>
                Are you sure you want to retire this rule version? Historical transactions will retain their original rates, but no future calculations will use this rule.
              </p>

              <div className={styles.formGroup}>
                <label>Effective Until Date</label>
                <DatePicker
                  value={retireEffectiveUntil}
                  onChange={e => setRetireEffectiveUntil(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                <Button variant="secondary" onClick={() => setRetireModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={() => retireTargetId && void handleAction(retireTargetId, "retire")}
                  disabled={working !== null}
                >
                  Confirm Retirement
                </Button>
              </div>
            </div>
          </Modal>

          {/* MODAL 4: PARTNER REGISTRATION */}
          <Modal
            open={partnerModalOpen}
            title="Register Commercial Healthcare Partner"
            onClose={() => setPartnerModalOpen(false)}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px 0" }}>
              <div className={styles.formGroup}>
                <label>Partner Legal Entity Name</label>
                <Input
                  value={partnerName}
                  onChange={e => setPartnerName(e.target.value)}
                  placeholder="e.g. Apex Health Network"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Contact Email</label>
                <Input
                  type="email"
                  value={partnerEmail}
                  onChange={e => setPartnerEmail(e.target.value)}
                  placeholder="finance@partner.com"
                />
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Partner Type</label>
                  <Select value={partnerType} onChange={e => setPartnerType(e.target.value as CommercialPartner["partnerType"])}>
                    <option value="REFERRAL">Referral Network</option>
                    <option value="AFFILIATE">Affiliate Healthcare</option>
                    <option value="CORPORATE">Corporate Partner</option>
                    <option value="MARKETING">Marketing Partner</option>
                  </Select>
                </div>

                <div className={styles.formGroup}>
                  <label>Settlement Frequency</label>
                  <Select value={partnerFrequency} onChange={e => setPartnerFrequency(e.target.value as CommercialPartner["settlementFrequency"])}>
                    <option value="WEEKLY">Weekly</option>
                    <option value="BIWEEKLY">Bi-Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="MANUAL">Manual / On Demand</option>
                  </Select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Minimum Payout Threshold (in Paisa, e.g. 50000 = ₹500)</label>
                <Input
                  type="number"
                  value={partnerMinPayout}
                  onChange={e => setPartnerMinPayout(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                <Button variant="secondary" onClick={() => setPartnerModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => void handleCreatePartner()} disabled={working !== null}>
                  Register Partner
                </Button>
              </div>
            </div>
          </Modal>
        </>
      ) : null}

      {message ? <Alert>{message}</Alert> : null}
    </div>
  );
}
