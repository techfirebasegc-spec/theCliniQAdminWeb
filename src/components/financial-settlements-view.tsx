"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PlatformApiError } from "../lib/platform-api/client";
import {
  generateSettlementStatement,
  getCommissionAdjustments,
  listProviderPayables,
  listSettlementStatementCandidates,
  listSettlementStatements,
  reverseUnsettledCommissions,
  type BeneficiaryKind,
  type CommissionAdjustmentStatusResponse,
  type ProviderPayableSummary,
  type SettlementStatement,
  type SettlementStatementCandidateItem,
} from "../lib/platform-api/financial";
import {
  Breadcrumbs,
  Button,
  DataTable,
  DatePicker,
  EmptyState,
  ErrorState,
  FilterBar,
  FilterGroup,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  useToast,
  Toast,
} from "./ui";
import styles from "./financial-management.module.css";

const PAGE_SIZE = 25;

function formatMoney(amountMinor: string | number, currency = "INR") {
  const num = Number(amountMinor) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(dateStr));
}

export function FinancialSettlementsView() {
  const [status, setStatus] = useState("");
  const [beneficiaryKind, setBeneficiaryKind] = useState<BeneficiaryKind | "">("");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<SettlementStatement[]>([]);
  const [total, setTotal] = useState(0);
  const [commissionStatus, setCommissionStatus] = useState<CommissionAdjustmentStatusResponse | null>(null);
  const [reversingCommissions, setReversingCommissions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  // Provider payables summary state
  const [payables, setPayables] = useState<ProviderPayableSummary[]>([]);
  const [loadingPayables, setLoadingPayables] = useState(true);

  // Modal generation state
  const [modalOpen, setModalOpen] = useState(false);
  const [genKind, setGenKind] = useState<BeneficiaryKind>("CLINIC");
  const [genId, setGenId] = useState("");
  const [genStart, setGenStart] = useState("");
  const [genEnd, setGenEnd] = useState("");
  const [genNotes, setGenNotes] = useState("");
  const [candidates, setCandidates] = useState<SettlementStatementCandidateItem[] | null>(null);
  const [checkingCandidates, setCheckingCandidates] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const toast = useToast();

  useEffect(() => {
    let active = true;
    listProviderPayables()
      .then((res) => {
        if (active) {
          setPayables(res.items);
          setLoadingPayables(false);
        }
      })
      .catch(() => {
        if (active) setLoadingPayables(false);
      });

    listSettlementStatements({
      limit: PAGE_SIZE,
      offset,
      status: status || undefined,
      beneficiaryKind: beneficiaryKind || undefined,
    })
      .then((response) => {
        if (active) {
          setItems(response.items);
          setTotal(response.total);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          if (err instanceof PlatformApiError) {
            setError(err.message || "Failed to load settlement statements.");
          } else {
            setError("Network error loading settlement statements.");
          }
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [status, beneficiaryKind, offset, refresh]);

  const handleCheckCandidates = async () => {
    if (!genId.trim() || !genStart || !genEnd) {
      setModalError("Beneficiary ID, Period Start, and Period End are required.");
      return;
    }
    setCheckingCandidates(true);
    setModalError(null);
    try {
      const res = await listSettlementStatementCandidates({
        beneficiaryKind: genKind,
        beneficiaryId: genId.trim(),
        periodStart: genStart,
        periodEnd: genEnd,
      });
      setCandidates(res.items);
      if (!res.items.length) {
        setModalError("No eligible completed appointments found in this period.");
      }
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Error checking eligible items.");
    } finally {
      setCheckingCandidates(false);
    }
  };

  const handleGenerate = async () => {
    if (!genId.trim() || !genStart || !genEnd) {
      setModalError("Beneficiary ID and period dates are required.");
      return;
    }
    setGenerating(true);
    setModalError(null);
    try {
      const res = await generateSettlementStatement({
        beneficiaryKind: genKind,
        beneficiaryId: genId.trim(),
        periodStart: genStart,
        periodEnd: genEnd,
        notes: genNotes.trim() || undefined,
      });
      toast.show(`Settlement Statement ${res.statement.statementNumber} generated!`);
      setModalOpen(false);
      setCandidates(null);
      setGenId("");
      setGenNotes("");
      setRefresh((r) => r + 1);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to generate settlement statement.");
    } finally {
      setGenerating(false);
    }
  };

  const handleReverseCommissions = async () => {
    setReversingCommissions(true);
    try {
      const res = await reverseUnsettledCommissions({ cancelUnpaidStatements: true });
      toast.show(`Reversed ${res.appliedCount} unsettled commission deduction(s) (${formatMoney(res.totalReversedMinor)}).`);
      const nextStatus = await getCommissionAdjustments();
      setCommissionStatus(nextStatus);
      setRefresh((r) => r + 1);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to reverse unsettled commissions.");
    } finally {
      setReversingCommissions(false);
    }
  };

  useEffect(() => {
    void getCommissionAdjustments().then(setCommissionStatus).catch(() => {});
  }, [refresh]);

  const candidateGross = (candidates ?? []).reduce((acc, c) => acc + BigInt(c.grossAmountMinor), BigInt(0));
  const candidateCommission = (candidates ?? []).reduce((acc, c) => acc + BigInt(c.platformCommissionMinor), BigInt(0));
  const candidatePayable = (candidates ?? []).reduce((acc, c) => acc + BigInt(c.providerPayableMinor), BigInt(0));

  return (
    <div className={styles.container}>
      <Breadcrumbs items={["Platform Admin", "Financial Operations", "Settlement Statements"]} />
      <PageHeader
        eyebrow="Financial Operations"
        title="Settlement Statements & Batch Payouts"
        description="Generate, approve, and execute consolidated financial settlement statements for clinics and independent doctors."
        action={
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            + Generate Settlement Statement
          </Button>
        }
      />

      {/* Modern Horizontal Filter Bar */}
      <FilterBar>
        <FilterGroup label="Status">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">All Statuses</option>
            <option value="GENERATED">Draft / Generated</option>
            <option value="APPROVED">Approved</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </FilterGroup>

        <FilterGroup label="Beneficiary">
          <Select
            value={beneficiaryKind}
            onChange={(e) => {
              setBeneficiaryKind(e.target.value as BeneficiaryKind | "");
              setOffset(0);
            }}
          >
            <option value="">All Beneficiaries</option>
            <option value="CLINIC">Clinics</option>
            <option value="INDEPENDENT_DOCTOR">Independent Doctors</option>
          </Select>
        </FilterGroup>

        <div className="filter-bar-actions">
          <Button variant="secondary" onClick={() => setRefresh((r) => r + 1)}>
            Apply Filter
          </Button>
          {(status || beneficiaryKind) && (
            <Button
              variant="quiet"
              onClick={() => {
                setStatus("");
                setBeneficiaryKind("");
                setOffset(0);
                setRefresh((r) => r + 1);
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </FilterBar>

      {/* 1. Provider Payables Balances Section */}
      <div className={styles.tableSection}>
        <div className={styles.tableHeaderBar}>
          <div>
            <h3 className={styles.tableTitle}>Provider Payables & Entitlement Balances</h3>
            <p style={{ margin: "4px 0 0 0", color: "#64788b", fontSize: 13 }}>
              Accumulated consultation revenues, platform commissions, and outstanding disbursements for clinics and independent doctors.
            </p>
          </div>
        </div>

        {loadingPayables ? (
          <LoadingState label="Loading provider payables…" />
        ) : !payables.length ? (
          <EmptyState title="No provider payables" detail="No active clinics or doctors found." />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Beneficiary</th>
                <th>Type</th>
                <th>Gross Consultations</th>
                <th>Platform Revenue</th>
                <th>Total Payable</th>
                <th>Total Paid Out</th>
                <th>Outstanding Balance</th>
                <th>Pending</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {payables.map((prov) => (
                <tr key={`${prov.beneficiaryKind}:${prov.beneficiaryId}`}>
                  <td>
                    <strong>{prov.displayName}</strong>
                    <div><small style={{ color: "#64788b" }}><code>{prov.beneficiaryId.slice(0, 16)}</code></small></div>
                  </td>
                  <td><StatusBadge value={prov.beneficiaryKind} /></td>
                  <td>{formatMoney(prov.totalGrossMinor, prov.currency)}</td>
                  <td style={{ color: "#d97706" }}>{formatMoney(prov.totalPlatformCommissionMinor, prov.currency)}</td>
                  <td>{formatMoney(prov.totalPayableMinor, prov.currency)}</td>
                  <td style={{ color: "#059669" }}>{formatMoney(prov.totalPaidMinor, prov.currency)}</td>
                  <td style={{ fontWeight: 800, color: BigInt(prov.outstandingMinor) > 0 ? "#b91c1c" : "#059669" }}>
                    {formatMoney(prov.outstandingMinor, prov.currency)}
                  </td>
                  <td>
                    {prov.pendingAppointmentsCount > 0 ? (
                      <span className={styles.badgePending}>{prov.pendingAppointmentsCount} pending</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setGenKind(prov.beneficiaryKind);
                        setGenId(prov.beneficiaryId);
                        setCandidates(null);
                        setModalError(null);
                        setModalOpen(true);
                      }}
                    >
                      Generate Statement
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </div>

      {error ? (
        <div>
          <ErrorState detail={error} />
          <Button variant="secondary" onClick={() => setRefresh((r) => r + 1)} style={{ marginTop: 12 }}>
            Retry
          </Button>
        </div>
      ) : loading && !items.length ? (
        <LoadingState label="Loading settlement statements…" />
      ) : !items.length ? (
        <EmptyState
          title="No settlement statements found"
          detail="Generate a new settlement statement for a clinic or doctor to disburse accumulated payables."
          action={
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              Generate Statement
            </Button>
          }
        />
      ) : (
        <div className={styles.tableSection}>
          <div className={styles.tableHeaderBar}>
            <h3 className={styles.tableTitle}>
              Settlement Statements ({total.toLocaleString()} total)
            </h3>
          </div>

          <DataTable>
            <thead>
              <tr>
                <th>Statement #</th>
                <th>Beneficiary</th>
                <th>Period</th>
                <th>Items</th>
                <th>Gross Collections</th>
                <th>Commission</th>
                <th>Net Payable</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((stmt) => (
                <tr key={stmt.id}>
                  <td>
                    <strong>{stmt.statementNumber}</strong>
                  </td>
                  <td>
                    <div>
                      <small style={{ color: "#64788b" }}>{stmt.beneficiaryKind}: </small>
                      <code>{stmt.beneficiaryId.slice(0, 16)}</code>
                    </div>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {formatDate(stmt.periodStart)} – {formatDate(stmt.periodEnd)}
                  </td>
                  <td>{stmt.itemCount}</td>
                  <td>{formatMoney(stmt.grossAmountMinor, stmt.currency)}</td>
                  <td>{formatMoney(stmt.platformCommissionMinor, stmt.currency)}</td>
                  <td style={{ fontWeight: 800, color: "#059669" }}>
                    {formatMoney(stmt.netPayableMinor, stmt.currency)}
                  </td>
                  <td>
                    <StatusBadge value={stmt.status} />
                  </td>
                  <td>
                    <Link
                      href={`/platform/financial/settlements/${stmt.id}`}
                      className="table-action"
                    >
                      View & Manage &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      )}

      {/* Modal to Generate Statement */}
      <Modal
        open={modalOpen}
        title="Generate Settlement Statement"
        onClose={() => {
          setModalOpen(false);
          setCandidates(null);
          setModalError(null);
        }}
      >
        <div style={{ padding: "0 4px" }}>
          <p style={{ color: "#64788b", fontSize: 14, margin: "0 0 16px 0" }}>
            Aggregate all completed consultations and appointments for a clinic or doctor into a verified financial settlement statement.
          </p>

          {modalError && (
            <div style={{ marginBottom: 16 }}>
              <ErrorState detail={modalError} />
            </div>
          )}

          <div className={styles.formGrid}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
                Beneficiary Type
              </label>
              <Select
                value={genKind}
                onChange={(e) => setGenKind(e.target.value as BeneficiaryKind)}
              >
                <option value="CLINIC">Clinic</option>
                <option value="INDEPENDENT_DOCTOR">Independent Doctor</option>
              </Select>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
                {genKind === "CLINIC" ? "Clinic ID" : "Doctor ID"}
              </label>
              <Input
                placeholder={`Enter ${genKind === "CLINIC" ? "Clinic UUID" : "Doctor UUID"}`}
                value={genId}
                onChange={(e) => setGenId(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
                Period Start Date
              </label>
              <DatePicker
                value={genStart}
                onChange={(e) => setGenStart(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
                Period End Date
              </label>
              <DatePicker
                value={genEnd}
                onChange={(e) => setGenEnd(e.target.value)}
              />
            </div>

            <div className={styles.formFull}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
                Notes / Reference (Optional)
              </label>
              <Input
                placeholder="e.g. Monthly batch settlement"
                value={genNotes}
                onChange={(e) => setGenNotes(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, margin: "12px 0 20px 0" }}>
            <Button
              variant="secondary"
              disabled={checkingCandidates}
              onClick={handleCheckCandidates}
            >
              {checkingCandidates ? "Checking eligible..." : "Preview Eligible Items"}
            </Button>
          </div>

          {candidates && candidates.length > 0 && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 8,
                padding: "16px",
                marginBottom: 20,
              }}
            >
              <h4 style={{ margin: "0 0 10px 0", color: "#166534" }}>
                ✓ {candidates.length} Completed Consultations Found
              </h4>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <span>Gross Collections: <strong>{formatMoney(candidateGross.toString())}</strong></span>
                <span>Platform Commission: <strong>{formatMoney(candidateCommission.toString())}</strong></span>
                <span>Net Payable: <strong style={{ color: "#15803d" }}>{formatMoney(candidatePayable.toString())}</strong></span>
              </div>
            </div>
          )}

          <div className="dialog-actions">
            <Button
              variant="primary"
              disabled={generating || (candidates !== null && candidates.length === 0)}
              onClick={handleGenerate}
            >
              {generating ? "Generating..." : "Generate Statement"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setModalOpen(false);
                setCandidates(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Toast message={toast.message} />
    </div>
  );
}
