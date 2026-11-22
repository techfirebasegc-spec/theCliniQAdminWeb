"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PlatformApiError } from "../lib/platform-api/client";
import {
  approveSettlementStatement,
  downloadSettlementStatementPdf,
  getSettlementStatementDetail,
  recordSettlementStatementPayment,
  type SettlementStatement,
} from "../lib/platform-api/financial";
import {
  Breadcrumbs,
  Button,
  DataTable,
  ErrorState,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  StatusBadge,
  useToast,
  Toast,
} from "./ui";
import styles from "./financial-management.module.css";

function formatMoney(amountMinor: string | number, currency = "INR") {
  const num = Number(amountMinor) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(dateStr));
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateStr));
}

export function FinancialSettlementDetailView({ statementId }: { statementId: string }) {
  const [statement, setStatement] = useState<SettlementStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  // Approval state
  const [approving, setApproving] = useState(false);

  // Payment modal state
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payoutRef, setPayoutRef] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const toast = useToast();

  const handleDownloadPdf = async () => {
    if (!statement || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const blob = await downloadSettlementStatementPdf(statement.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${statement.statementNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast.show("Could not download statement PDF. Try Print / Save PDF instead.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  useEffect(() => {
    let active = true;
    getSettlementStatementDetail(statementId)
      .then((res) => {
        if (active) {
          setStatement(res.statement);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          if (err instanceof PlatformApiError) {
            setError(err.message || "Failed to load settlement statement.");
          } else {
            setError("Network error loading statement details.");
          }
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [statementId, refresh]);

  const handleApprove = async () => {
    if (!statement || approving) return;
    setApproving(true);
    try {
      const res = await approveSettlementStatement(statement.id);
      setStatement(res.statement);
      toast.show("Settlement statement approved!");
      setRefresh((r) => r + 1);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to approve statement.");
    } finally {
      setApproving(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!statement || !payoutRef.trim() || paying) {
      setPayError("Payout reference (e.g. UTR / Bank Reference) is required.");
      return;
    }
    setPaying(true);
    setPayError(null);
    try {
      const res = await recordSettlementStatementPayment(statement.id, {
        payoutReference: payoutRef.trim(),
        notes: payNotes.trim() || undefined,
      });
      setStatement(res.statement);
      toast.show("Payout recorded and ledger entry posted!");
      setPayModalOpen(false);
      setRefresh((r) => r + 1);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Failed to record payment.");
    } finally {
      setPaying(false);
    }
  };

  if (error) {
    return (
      <div className={styles.container}>
        <Breadcrumbs items={["Platform Admin", "Financial Operations", "Settlement Statements", "Detail"]} />
        <ErrorState detail={error} />
        <Link href="/platform/financial/settlements">
          <Button variant="secondary">&larr; Back to Settlements</Button>
        </Link>
      </div>
    );
  }

  if (loading && !statement) {
    return (
      <div className={styles.container}>
        <Breadcrumbs items={["Platform Admin", "Financial Operations", "Settlement Statements", "Detail"]} />
        <LoadingState label="Loading settlement statement details…" />
      </div>
    );
  }

  if (!statement) return null;

  return (
    <div className={styles.container}>
      <Breadcrumbs
        items={[
          "Platform Admin",
          "Financial Operations",
          "Settlement Statements",
          statement.statementNumber,
        ]}
      />
      <PageHeader
        eyebrow="Financial Operations"
        title={`Settlement Statement: ${statement.statementNumber}`}
        description={`Consolidated settlement for ${statement.beneficiaryKind} (${statement.beneficiaryId}).`}
        action={
          <div className={styles.actionButtons}>
            {(statement.status === "GENERATED" || statement.status === "DRAFT") && (
              <Button variant="primary" disabled={approving} onClick={handleApprove}>
                {approving ? "Approving…" : "Approve Statement"}
              </Button>
            )}
            {statement.status === "APPROVED" && (
              <Button variant="primary" onClick={() => setPayModalOpen(true)}>
                Record Payout / Bank Transfer
              </Button>
            )}
            <Button variant="secondary" disabled={downloadingPdf} onClick={handleDownloadPdf}>
              {downloadingPdf ? "Generating PDF…" : "Download PDF"}
            </Button>
            <Button variant="quiet" onClick={() => window.print()}>
              Print
            </Button>
            <Link href="/platform/financial/settlements">
              <Button variant="quiet">&larr; Statements List</Button>
            </Link>
          </div>
        }
      />

      {/* Main Statement Meta Box */}
      <div className={styles.statementHeaderBox}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <h2 style={{ margin: 0, color: "#173654" }}>{statement.statementNumber}</h2>
            <StatusBadge value={statement.status} />
          </div>
          <p style={{ margin: "0 0 12px 0", color: "#64788b", fontSize: 14 }}>
            Statement Period: <strong>{formatDate(statement.periodStart)}</strong> to{" "}
            <strong>{formatDate(statement.periodEnd)}</strong> ({statement.itemCount} completed appointments)
          </p>

          <div className={styles.statementMeta}>
            <div className={styles.statementMetaItem}>
              <span className={styles.statementMetaLabel}>Beneficiary</span>
              <span className={styles.statementMetaValue}>
                {statement.beneficiaryKind}: <code>{statement.beneficiaryId.slice(0, 16)}</code>
              </span>
            </div>
            <div className={styles.statementMetaItem}>
              <span className={styles.statementMetaLabel}>Gross Collections</span>
              <span className={styles.statementMetaValue}>
                {formatMoney(statement.grossAmountMinor, statement.currency)}
              </span>
            </div>
            <div className={styles.statementMetaItem}>
              <span className={styles.statementMetaLabel}>Platform Commission</span>
              <span className={styles.statementMetaValue}>
                - {formatMoney(statement.platformCommissionMinor, statement.currency)}
              </span>
            </div>
            <div className={styles.statementMetaItem}>
              <span className={styles.statementMetaLabel}>Net Disbursement</span>
              <span className={styles.statementAmountBig}>
                {formatMoney(statement.netPayableMinor, statement.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Audit & Settlement Payment Evidence */}
      <div className={styles.channelsGrid}>
        <div className={styles.channelCard}>
          <h4 className={styles.channelTitle}>Statement Audit Trail</h4>
          <div className={styles.channelMetrics} style={{ marginTop: 12 }}>
            <div className={styles.channelMetricRow}>
              <span className={styles.channelMetricLabel}>Generated Date</span>
              <span className={styles.channelMetricVal}>{formatDateTime(statement.createdAt)}</span>
            </div>
            <div className={styles.channelMetricRow}>
              <span className={styles.channelMetricLabel}>Generated By</span>
              <span className={styles.channelMetricVal}>
                <code>{statement.generatedByAccountId.slice(0, 14)}</code>
              </span>
            </div>
            <div className={styles.channelMetricRow}>
              <span className={styles.channelMetricLabel}>Approved By</span>
              <span className={styles.channelMetricVal}>
                {statement.approvedByAccountId ? (
                  <code>{statement.approvedByAccountId.slice(0, 14)}</code>
                ) : (
                  "—"
                )}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.channelCard}>
          <h4 className={styles.channelTitle}>Disbursement Details</h4>
          <div className={styles.channelMetrics} style={{ marginTop: 12 }}>
            <div className={styles.channelMetricRow}>
              <span className={styles.channelMetricLabel}>Disbursement Status</span>
              <span className={styles.channelMetricVal}>
                <StatusBadge value={statement.status === "PAID" ? "SETTLED" : statement.status} />
              </span>
            </div>
            <div className={styles.channelMetricRow}>
              <span className={styles.channelMetricLabel}>Payout Reference (UTR)</span>
              <span className={styles.channelMetricVal}>
                {statement.payoutReference ? <strong>{statement.payoutReference}</strong> : "—"}
              </span>
            </div>
            <div className={styles.channelMetricRow}>
              <span className={styles.channelMetricLabel}>Paid At</span>
              <span className={styles.channelMetricVal}>{formatDateTime(statement.paidAt)}</span>
            </div>
            {statement.ledgerTransactionId && (
              <div className={styles.channelMetricRow}>
                <span className={styles.channelMetricLabel}>General Ledger Tx</span>
                <span className={styles.channelMetricVal}>
                  <code>{statement.ledgerTransactionId.slice(0, 14)}</code>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Line Items Table */}
      <div className={styles.tableSection}>
        <div className={styles.tableHeaderBar}>
          <h3 className={styles.tableTitle}>
            Line Items Breakdown ({statement.items?.length ?? 0} Consultations)
          </h3>
        </div>

        <DataTable>
          <thead>
            <tr>
              <th>Service Date</th>
              <th>Appointment ID</th>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Gross Collected</th>
              <th>Platform Commission</th>
              <th>Net Disbursed</th>
            </tr>
          </thead>
          <tbody>
            {(statement.items ?? []).map((item) => (
              <tr key={item.id}>
                <td>{formatDate(item.serviceDate)}</td>
                <td>
                  <code>{item.appointmentId?.slice(0, 12) ?? "—"}</code>
                </td>
                <td>{item.patientName || "—"}</td>
                <td>{item.doctorName || "—"}</td>
                <td>{formatMoney(item.grossAmountMinor ?? "0", item.currency)}</td>
                <td style={{ color: "#d97706" }}>
                  - {formatMoney(item.platformCommissionMinor ?? "0", item.currency)}
                </td>
                <td style={{ fontWeight: 700, color: "#059669" }}>
                  {formatMoney(item.amountMinor, item.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>

      {/* Modal: Record Payout */}
      <Modal
        open={payModalOpen}
        title="Record Payout / Bank Settlement"
        onClose={() => {
          setPayModalOpen(false);
          setPayError(null);
        }}
      >
        <div style={{ padding: "0 4px" }}>
          <p style={{ color: "#64788b", fontSize: 14, margin: "0 0 16px 0" }}>
            Record disbursement evidence (e.g. Bank UTR / NEFT reference). This marks the statement as <strong>PAID</strong> and automatically posts the debit/credit double-entry journal transaction to the General Ledger.
          </p>

          {payError && (
            <div style={{ marginBottom: 16 }}>
              <ErrorState detail={payError} />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
                Bank Payout Reference / UTR Number
              </label>
              <Input
                placeholder="e.g. UTR-HDFC-20261122-12345"
                value={payoutRef}
                onChange={(e) => setPayoutRef(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
                Notes / Settlement Memo (Optional)
              </label>
              <Input
                placeholder="e.g. Paid via HDFC corporate netbanking"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="dialog-actions" style={{ marginTop: 20 }}>
            <Button
              variant="primary"
              disabled={paying || !payoutRef.trim()}
              onClick={handleRecordPayment}
            >
              {paying ? "Recording..." : "Confirm & Post Payout"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setPayModalOpen(false);
                setPayError(null);
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
