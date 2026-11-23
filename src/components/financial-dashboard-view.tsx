"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlatformApiError } from "../lib/platform-api/client";
import {
  getFinancialDashboardMetrics,
  type FinancialDashboardMetrics,
} from "../lib/platform-api/financial";
import {
  AnalyticsBarChart,
  AnalyticsDonutChart,
  Breadcrumbs,
  Button,
  Card,
  DatePicker,
  DonutSegment,
  ErrorState,
  FilterBar,
  FilterGroup,
  FinancialKpiCard,
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

  // Quick preset helper
  const applyPreset = (days: number | "month" | "all") => {
    if (days === "all") {
      setFrom("");
      setTo("");
      return;
    }
    const today = new Date();
    const toIso = today.toISOString().slice(0, 10);
    setTo(toIso);
    if (days === "month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setFrom(firstDay.toISOString().slice(0, 10));
    } else {
      const fromDate = new Date();
      fromDate.setDate(today.getDate() - days);
      setFrom(fromDate.toISOString().slice(0, 10));
    }
  };

  // Compute analytics segments if metrics are available
  const grossCollections = metrics
    ? Number(metrics.grossCollections?.amountMinor ?? metrics.grossCollectionsMinor ?? 0) / 100
    : 0;
  const platformRevenue = metrics
    ? Number(metrics.platformRevenue?.amountMinor ?? metrics.platformRevenueMinor ?? 0) / 100
    : 0;
  const providerPayables = metrics
    ? Number(metrics.providerPayablesOutstanding?.amountMinor ?? metrics.providerPayablesOutstandingMinor ?? 0) / 100
    : 0;
  const paidOut = metrics
    ? Number(metrics.paidOutTotal?.amountMinor ?? metrics.payoutsCompletedMinor ?? 0) / 100
    : 0;

  const onlineGross = metrics ? Number(metrics.channelBreakdown.onlineAppointments.grossMinor || 0) / 100 : 0;
  const opdGross = metrics ? Number(metrics.channelBreakdown.offlineOpd.grossMinor || 0) / 100 : 0;
  const subRevenue = metrics ? Number(metrics.channelBreakdown.subscriptions.totalRevenueMinor || 0) / 100 : 0;

  const channelSegments: DonutSegment[] = [
    {
      label: "Online Consultations",
      value: onlineGross,
      color: "#2563eb",
      formatted: metrics ? formatMinor(metrics.channelBreakdown.onlineAppointments.grossMinor) : "₹0",
    },
    {
      label: "Offline OPD Bills",
      value: opdGross,
      color: "#0d9488",
      formatted: metrics ? formatMinor(metrics.channelBreakdown.offlineOpd.grossMinor) : "₹0",
    },
    {
      label: "Commercial Subscriptions",
      value: subRevenue,
      color: "#8b5cf6",
      formatted: metrics ? formatMinor(metrics.channelBreakdown.subscriptions.totalRevenueMinor) : "₹0",
    },
  ];

  const flowBars = [
    {
      label: "Gross Collections",
      value: grossCollections,
      formatted: metrics?.grossCollections?.formatted ?? formatMinor(metrics?.grossCollectionsMinor ?? "0"),
      color: "#1e3a8a",
      sublabel: "Total funds collected across channels",
    },
    {
      label: "Provider Payables",
      value: providerPayables,
      formatted:
        metrics?.providerPayablesOutstanding?.formatted ??
        formatMinor(metrics?.providerPayablesOutstandingMinor ?? "0"),
      color: "#d97706",
      sublabel: "Liabilities owed to clinics & doctors",
    },
    {
      label: "Platform Revenue",
      value: platformRevenue,
      formatted: metrics?.platformRevenue?.formatted ?? formatMinor(metrics?.platformRevenueMinor ?? "0"),
      color: "#059669",
      sublabel: "Net commissions & subscription fees",
    },
    {
      label: "Disbursed Payouts",
      value: paidOut,
      formatted: metrics?.paidOutTotal?.formatted ?? formatMinor(metrics?.payoutsCompletedMinor ?? "0"),
      color: "#475569",
      sublabel: "Settled statements & manual payouts",
    },
  ];

  return (
    <div className={styles.container}>
      <Breadcrumbs items={["Platform Admin", "Financial Operations", "Overview"]} />
      <PageHeader
        eyebrow="Financial Operations"
        title="Financial Overview & Executive Dashboard"
        description="Consolidated financial analytics, collections, platform revenue, and provider liabilities across all channels."
        action={
          <div style={{ display: "flex", gap: "8px" }}>
            <Link href="/platform/financial/settlements">
              <Button variant="primary">+ Generate Settlement</Button>
            </Link>
            <Link href="/platform/financial/transactions">
              <Button variant="secondary">Browse Ledger</Button>
            </Link>
          </div>
        }
      />

      {/* Modern Full-Width Horizontal Filter Bar */}
      <FilterBar className={styles.filterToolbar}>
        <FilterGroup label="Date Range">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <DatePicker
              aria-label="From Date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={{ width: "150px" }}
            />
            <span style={{ fontSize: "13px", color: "#64748b" }}>to</span>
            <DatePicker
              aria-label="To Date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={{ width: "150px" }}
            />
          </div>
        </FilterGroup>

        <FilterGroup label="Presets">
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <Button variant="quiet" style={{ minHeight: "34px", padding: "0 8px", fontSize: "12px" }} onClick={() => applyPreset("all")}>
              All time
            </Button>
            <Button variant="quiet" style={{ minHeight: "34px", padding: "0 8px", fontSize: "12px" }} onClick={() => applyPreset(7)}>
              Last 7d
            </Button>
            <Button variant="quiet" style={{ minHeight: "34px", padding: "0 8px", fontSize: "12px" }} onClick={() => applyPreset(30)}>
              Last 30d
            </Button>
            <Button variant="quiet" style={{ minHeight: "34px", padding: "0 8px", fontSize: "12px" }} onClick={() => applyPreset("month")}>
              This month
            </Button>
          </div>
        </FilterGroup>

        <div style={{ display: "flex", gap: "8px", marginLeft: "auto", alignItems: "center" }}>
          <Button variant="secondary" onClick={() => setRefresh((r) => r + 1)}>
            Apply Filter
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
      </FilterBar>

      {error ? (
        <div style={{ marginTop: "16px" }}>
          <ErrorState detail={error} />
          <Button variant="secondary" onClick={() => setRefresh((r) => r + 1)} style={{ marginTop: 12 }}>
            Retry
          </Button>
        </div>
      ) : loading && !metrics ? (
        <div style={{ padding: "40px 0" }}>
          <LoadingState label="Loading consolidated financial analytics…" />
        </div>
      ) : metrics ? (
        <>
          {/* Executive KPI Grid */}
          <div className={styles.kpiGrid}>
            <FinancialKpiCard
              label="Gross Collections"
              value={metrics.grossCollections?.formatted ?? formatMinor(metrics.grossCollectionsMinor ?? "0")}
              subtext="Total funds collected across all channels"
              variant="default"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              }
            />
            <FinancialKpiCard
              label="Platform Revenue"
              value={metrics.platformRevenue?.formatted ?? formatMinor(metrics.platformRevenueMinor ?? "0")}
              subtext="Platform commissions & subscription earnings"
              variant="revenue"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              }
            />
            <FinancialKpiCard
              label="Provider Payables Outstanding"
              value={
                metrics.providerPayablesOutstanding?.formatted ??
                formatMinor(metrics.providerPayablesOutstandingMinor ?? "0")
              }
              subtext="Unsettled liabilities owed to clinics & doctors"
              variant="payable"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              }
            />
            <FinancialKpiCard
              label="Paid Out Total"
              value={metrics.paidOutTotal?.formatted ?? formatMinor(metrics.payoutsCompletedMinor ?? "0")}
              subtext="Disbursed payouts & settled statements"
              variant="paid"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <path d="m9 11 3 3L22 4" />
                </svg>
              }
            />
          </div>

          {/* Analytics Visualizations Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: "18px",
              margin: "20px 0",
            }}
          >
            <AnalyticsDonutChart
              title="Collections by Channel"
              segments={channelSegments}
              size={190}
              strokeWidth={26}
            />
            <AnalyticsBarChart title="Capital Allocation & Financial Flows" bars={flowBars} />
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
                  <span className={styles.channelMetricLabel}>Completed Consultations</span>
                  <span className={styles.channelMetricVal}>
                    {metrics.channelBreakdown.onlineAppointments.count}
                  </span>
                </div>
                <div className={styles.channelMetricRow}>
                  <span className={styles.channelMetricLabel}>Gross Digital Collections</span>
                  <span className={styles.channelMetricVal}>
                    {formatMinor(metrics.channelBreakdown.onlineAppointments.grossMinor)}
                  </span>
                </div>
                <div className={styles.channelMetricRow}>
                  <span className={styles.channelMetricLabel}>Platform Share (Commission)</span>
                  <span className={styles.channelMetricVal} style={{ color: "#059669" }}>
                    {formatMinor(metrics.channelBreakdown.onlineAppointments.commissionMinor)}
                  </span>
                </div>
                <div className={styles.channelMetricRow}>
                  <span className={styles.channelMetricLabel}>Doctor / Clinic Payable</span>
                  <span className={styles.channelMetricVal} style={{ color: "#d97706" }}>
                    {formatMinor(metrics.channelBreakdown.onlineAppointments.payableMinor)}
                  </span>
                </div>
              </div>
            </div>

            {/* Offline OPD Consultations */}
            <div className={styles.channelCard}>
              <div className={styles.channelHeader}>
                <h3 className={styles.channelTitle}>Offline OPD Walk-in Bills</h3>
                <Link href="/platform/financial/transactions?channel=OFFLINE_OPD" className="table-action">
                  View Bills &rarr;
                </Link>
              </div>
              <div className={styles.channelMetrics}>
                <div className={styles.channelMetricRow}>
                  <span className={styles.channelMetricLabel}>Desk Invoices Issued</span>
                  <span className={styles.channelMetricVal}>{metrics.channelBreakdown.offlineOpd.count}</span>
                </div>
                <div className={styles.channelMetricRow}>
                  <span className={styles.channelMetricLabel}>Clinic Counter Inflow</span>
                  <span className={styles.channelMetricVal}>
                    {formatMinor(metrics.channelBreakdown.offlineOpd.grossMinor)}
                  </span>
                </div>
                <div className={styles.channelMetricRow}>
                  <span className={styles.channelMetricLabel}>Platform Platform Fee</span>
                  <span className={styles.channelMetricVal} style={{ color: "#059669" }}>
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
                  <span className={styles.channelMetricLabel}>Active Paying Subscribers</span>
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
                  <span className={styles.channelMetricLabel}>Total Subscription Earnings</span>
                  <span className={styles.channelMetricVal} style={{ color: "#059669" }}>
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
                  <span className={styles.channelMetricVal}>{metrics.channelBreakdown.payouts.count}</span>
                </div>
                <div className={styles.channelMetricRow}>
                  <span className={styles.channelMetricLabel}>Total Disbursed Funds</span>
                  <span className={styles.channelMetricVal} style={{ color: "#2563eb" }}>
                    {formatMinor(metrics.channelBreakdown.payouts.totalMinor)}
                  </span>
                </div>
                <div className={styles.channelMetricRow}>
                  <span className={styles.channelMetricLabel}>Pending Liabilities</span>
                  <span className={styles.channelMetricVal} style={{ color: "#d97706" }}>
                    {metrics.providerPayablesOutstanding?.formatted ??
                      formatMinor(metrics.providerPayablesOutstandingMinor ?? "0")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <Card>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <div>
                <h3 style={{ margin: "0 0 4px 0", color: "#173654", fontSize: "16px", fontWeight: 700 }}>
                  Financial Operations Workflows
                </h3>
                <p style={{ margin: 0, color: "#64788b", fontSize: 13 }}>
                  Direct access to settlement batch generation, ledger audit, and reconciliation operations.
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
