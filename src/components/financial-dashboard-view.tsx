"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PlatformApiError } from "../lib/platform-api/client";
import {
  getFinancialDashboardMetrics,
  type FinancialDashboardMetrics,
} from "../lib/platform-api/financial";
import {
  Breadcrumbs,
  Button,
  Card,
  DatePicker,
  ErrorState,
  LoadingState,
  PageHeader,
} from "./ui";
import styles from "./financial-management.module.css";

function formatMinor(minorStr: string | number, currency = "INR") {
  const num = Number(minorStr) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function FinancialDashboardView() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [metrics, setMetrics] = useState<FinancialDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    getFinancialDashboardMetrics({
      from: from || undefined,
      to: to || undefined,
    })
      .then((response) => {
        if (active) {
          setMetrics(response.metrics);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          if (err instanceof PlatformApiError) {
            setError(err.message || "Failed to load financial dashboard metrics.");
          } else {
            setError("Network or server error while loading dashboard metrics.");
          }
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [from, to, refresh]);

  return (
    <div className={styles.container}>
      <Breadcrumbs items={["Platform Admin", "Financial Operations", "Overview"]} />
      <PageHeader
        eyebrow="Financial Operations"
        title="Financial Overview & Executive Dashboard"
        description="Consolidated financial analytics, collections, platform revenue, and provider liabilities across all channels."
      >
        <div className={styles.filterRow}>
          <span>Filter Date:</span>
          <DatePicker
            aria-label="From Date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span>to</span>
          <DatePicker
            aria-label="To Date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <Button variant="secondary" onClick={() => setRefresh((r) => r + 1)}>
            Apply
          </Button>
          {(from || to) && (
            <Button
              variant="quiet"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </PageHeader>

      {error ? (
        <div>
          <ErrorState detail={error} />
          <Button variant="secondary" onClick={() => setRefresh((r) => r + 1)} style={{ marginTop: 12 }}>
            Retry
          </Button>
        </div>
      ) : loading && !metrics ? (
        <LoadingState label="Loading financial metrics…" />
      ) : metrics ? (
        <>
          {/* Executive KPI Grid */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <p className={styles.kpiLabel}>Gross Collections</p>
              <h2 className={styles.kpiValue}>{metrics.grossCollections?.formatted ?? formatMinor(metrics.grossCollectionsMinor ?? "0")}</h2>
              <p className={styles.kpiSubtext}>Total funds collected across all channels</p>
            </div>
            <div className={`${styles.kpiCard} ${styles.kpiRevenue}`}>
              <p className={styles.kpiLabel}>Platform Revenue</p>
              <h2 className={styles.kpiValue}>{metrics.platformRevenue?.formatted ?? formatMinor(metrics.platformRevenueMinor ?? "0")}</h2>
              <p className={styles.kpiSubtext}>Commissions & subscription earnings</p>
            </div>
            <div className={`${styles.kpiCard} ${styles.kpiPayable}`}>
              <p className={styles.kpiLabel}>Provider Payables Outstanding</p>
              <h2 className={styles.kpiValue}>{metrics.providerPayablesOutstanding?.formatted ?? formatMinor(metrics.providerPayablesOutstandingMinor ?? "0")}</h2>
              <p className={styles.kpiSubtext}>Liabilities owed to clinics & doctors</p>
            </div>
            <div className={`${styles.kpiCard} ${styles.kpiPaid}`}>
              <p className={styles.kpiLabel}>Paid Out Total</p>
              <h2 className={styles.kpiValue}>{metrics.paidOutTotal?.formatted ?? formatMinor(metrics.payoutsCompletedMinor ?? "0")}</h2>
              <p className={styles.kpiSubtext}>Disbursed payouts & settled statements</p>
            </div>
          </div>

          {/* Channel Breakdown Cards */}
          <div className={styles.channelsGrid}>
            {/* Online Appointments */}
            <div className={styles.channelCard}>
              <div className={styles.channelHeader}>
                <h3 className={styles.channelTitle}>Online Appointments (Razorpay)</h3>
                <Link href="/platform/financial/transactions?channel=ONLINE_APPOINTMENT" className="table-action">
                  View Ledger &rarr;
                </Link>
              </div>
              <div className={styles.channelMetrics}>
                <div className={styles.channelMetricRow}>
                  <span className={styles.channelMetricLabel}>Transactions</span>
                  <span className={styles.channelMetricVal}>
                    {metrics.channelBreakdown.onlineAppointments.count}
                  </span>
                </div>
                <div className={styles.channelMetricRow}>
                  <span className={styles.channelMetricLabel}>Gross Inflow</span>
                  <span className={styles.channelMetricVal}>
                    {formatMinor(metrics.channelBreakdown.onlineAppointments.grossMinor)}
                  </span>
                </div>
                <div className={styles.channelMetricRow}>
                  <span className={styles.channelMetricLabel}>Platform Commission</span>
                  <span className={styles.channelMetricVal}>
                    {formatMinor(metrics.channelBreakdown.onlineAppointments.commissionMinor)}
                  </span>
                </div>
                <div className={styles.channelMetricRow}>
                  <span className={styles.channelMetricLabel}>Doctor / Clinic Payable</span>
                  <span className={styles.channelMetricVal}>
                    {formatMinor(metrics.channelBreakdown.onlineAppointments.payableMinor)}
                  </span>
                </div>
              </div>
            </div>

            {/* Offline OPD Consultations */}
            <div className={styles.channelCard}>
              <div className={styles.channelHeader}>
                <h3 className={styles.channelTitle}>Offline OPD Consultations</h3>
                <Link href="/platform/financial/transactions?channel=OFFLINE_OPD" className="table-action">
                  View Bills &rarr;
                </Link>
              </div>
              <div className={styles.channelMetrics}>
                <div className={styles.channelMetricRow}>
                  <span className={styles.channelMetricLabel}>Bills Issued</span>
                  <span className={styles.channelMetricVal}>
                    {metrics.channelBreakdown.offlineOpd.count}
                  </span>
                </div>
                <div className={styles.channelMetricRow}>
                  <span className={styles.channelMetricLabel}>Clinic Collections</span>
                  <span className={styles.channelMetricVal}>
                    {formatMinor(metrics.channelBreakdown.offlineOpd.grossMinor)}
                  </span>
                </div>
                <div className={styles.channelMetricRow}>
                  <span className={styles.channelMetricLabel}>Platform Convenience Fee</span>
                  <span className={styles.channelMetricVal}>
                    {formatMinor(metrics.channelBreakdown.offlineOpd.commissionMinor)}
                  </span>
                </div>
                <div className={styles.channelMetricRow}>
                  <span className={styles.channelMetricLabel}>Clinic Retained Net</span>
                  <span className={styles.channelMetricVal}>
                    {formatMinor(metrics.channelBreakdown.offlineOpd.clinicSettlementMinor)}
                  </span>
                </div>
              </div>
            </div>

            {/* Subscriptions */}
            <div className={styles.channelCard}>
              <div className={styles.channelHeader}>
                <h3 className={styles.channelTitle}>Commercial Subscriptions</h3>
                <Link href="/platform/financial/subscriptions" className="table-action">
                  Subscribers &rarr;
                </Link>
              </div>
              <div className={styles.channelMetrics}>
                <div className={styles.channelMetricRow}>
                  <span className={styles.channelMetricLabel}>Active Subscribers</span>
                  <span className={styles.channelMetricVal}>
                    {metrics.channelBreakdown.subscriptions.activeCount}
                  </span>
                </div>
                <div className={styles.channelMetricRow}>
                  <span className={styles.channelMetricLabel}>Monthly Recurring Revenue (MRR)</span>
                  <span className={styles.channelMetricVal}>
                    {formatMinor(metrics.channelBreakdown.subscriptions.mrrMinor)}
                  </span>
                </div>
                <div className={styles.channelMetricRow}>
                  <span className={styles.channelMetricLabel}>Total Subscription Revenue</span>
                  <span className={styles.channelMetricVal}>
                    {formatMinor(metrics.channelBreakdown.subscriptions.totalRevenueMinor)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payouts & Settlements */}
            <div className={styles.channelCard}>
              <div className={styles.channelHeader}>
                <h3 className={styles.channelTitle}>Settlements & Payouts</h3>
                <Link href="/platform/financial/settlements" className="table-action">
                  Statements &rarr;
                </Link>
              </div>
              <div className={styles.channelMetrics}>
                <div className={styles.channelMetricRow}>
                  <span className={styles.channelMetricLabel}>Completed Payout Operations</span>
                  <span className={styles.channelMetricVal}>
                    {metrics.channelBreakdown.payouts.count}
                  </span>
                </div>
                <div className={styles.channelMetricRow}>
                  <span className={styles.channelMetricLabel}>Total Disbursed Funds</span>
                  <span className={styles.channelMetricVal}>
                    {formatMinor(metrics.channelBreakdown.payouts.totalMinor)}
                  </span>
                </div>
                <div className={styles.channelMetricRow}>
                  <span className={styles.channelMetricLabel}>Outstanding Liabilities</span>
                  <span className={styles.channelMetricVal}>
                    {metrics.providerPayablesOutstanding?.formatted ?? formatMinor(metrics.providerPayablesOutstandingMinor ?? "0")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ margin: "0 0 4px 0", color: "#173654" }}>Financial Workflows</h3>
                <p style={{ margin: 0, color: "#64788b", fontSize: 14 }}>
                  Direct access to settlement batching, transaction search, and reconciliation workflows.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link href="/platform/financial/settlements">
                  <Button variant="primary">Generate Settlement Statement</Button>
                </Link>
                <Link href="/platform/financial/transactions">
                  <Button variant="secondary">Browse Unified Transactions</Button>
                </Link>
                <Link href="/platform/financial/manual-payouts">
                  <Button variant="secondary">Manual Payouts</Button>
                </Link>
                <Link href="/platform/financial/reconciliation">
                  <Button variant="quiet">Reconciliation</Button>
                </Link>
              </div>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
