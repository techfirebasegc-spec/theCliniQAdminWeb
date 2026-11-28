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
              label="Net Collections"
              value={metrics.grossCollections?.formatted ?? formatMinor(metrics.grossCollectionsMinor ?? "0")}
              subtext={
                metrics.discountsMinor && metrics.discountsMinor !== "0"
                  ? `Net of ${formatMinor(metrics.discountsMinor)} patient discounts`
                  : "Total verified funds collected across channels"
              }
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
              subtext={
                metrics.platformFeeGstMinor && metrics.platformFeeGstMinor !== "0"
                  ? `Net revenue (excl. ${formatMinor(metrics.platformFeeGstMinor)} GST liability)`
                  : "Platform commissions, fees & subscriptions (excl. GST)"
              }
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
              subtext={
                metrics.inProgressPayablesMinor && metrics.inProgressPayablesMinor !== "0"
                  ? `Completed & settled-ready (${formatMinor(metrics.inProgressPayablesMinor)} in-progress escrow)`
                  : "Completed paid consultations awaiting payout"
              }
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

          {metrics.revenueByCommercialModel && (
            <div style={{ marginBottom: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>Legacy Provider Commission (Historical)</span>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>
                    {metrics.revenueByCommercialModel.providerCommission.count} txns
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px" }}>
                  <div><span style={{ color: "#64748b" }}>Service Volume:</span> <strong>{formatMinor(metrics.revenueByCommercialModel.providerCommission.serviceAmountMinor)}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Platform Revenue:</span> <strong style={{ color: "#7c3aed" }}>{formatMinor(metrics.revenueByCommercialModel.providerCommission.platformRevenueMinor)}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Commission:</span> <strong>{formatMinor(metrics.revenueByCommercialModel.providerCommission.commissionMinor)}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Provider Payable:</span> <strong style={{ color: "#059669" }}>{formatMinor(metrics.revenueByCommercialModel.providerCommission.providerPayableMinor)}</strong></div>
                </div>
              </div>

              <div style={{ background: "#ffffff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#1d4ed8" }}>Patient-Paid Platform Fee (Active)</span>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "#2563eb" }}>
                    {metrics.revenueByCommercialModel.patientPlatformFee.count} txns
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px" }}>
                  <div><span style={{ color: "#64748b" }}>Service Volume:</span> <strong>{formatMinor(metrics.revenueByCommercialModel.patientPlatformFee.serviceAmountMinor)}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Platform Revenue:</span> <strong style={{ color: "#7c3aed" }}>{formatMinor(metrics.revenueByCommercialModel.patientPlatformFee.platformRevenueMinor)}</strong></div>
                  <div><span style={{ color: "#64748b" }}>GST Collected:</span> <strong>{formatMinor(metrics.revenueByCommercialModel.patientPlatformFee.platformFeeGstMinor)}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Provider Payable (100%):</span> <strong style={{ color: "#059669" }}>{formatMinor(metrics.revenueByCommercialModel.patientPlatformFee.providerPayableMinor)}</strong></div>
                </div>
              </div>
            </div>
          )}

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
                  <span className={styles.channelMetricLabel}>Completed Payments</span>
                  <span className={styles.channelMetricVal}>
                    {metrics.channelBreakdown.onlineAppointments.count}
                  </span>
                </div>
                <div className={styles.channelMetricRow}>
                  <span className={styles.channelMetricLabel}>Patient Payments Collected</span>
                  <span className={styles.channelMetricVal}>
                    {formatMinor(metrics.channelBreakdown.onlineAppointments.grossMinor)}
                  </span>
                </div>
                <div className={styles.channelMetricRow}>
                  <span className={styles.channelMetricLabel}>Platform Net Revenue (Excl. GST)</span>
                  <span className={styles.channelMetricVal} style={{ color: "#059669" }}>
                    {formatMinor(
                      metrics.channelBreakdown.onlineAppointments.platformRevenueMinor ??
                        metrics.channelBreakdown.onlineAppointments.commissionMinor,
                    )}
                  </span>
                </div>
                {metrics.channelBreakdown.onlineAppointments.platformFeeGstMinor &&
                  metrics.channelBreakdown.onlineAppointments.platformFeeGstMinor !== "0" && (
                  <div className={styles.channelMetricRow}>
                    <span className={styles.channelMetricLabel}>Platform Fee GST Liability</span>
                    <span className={styles.channelMetricVal} style={{ color: "#64748b" }}>
                      {formatMinor(metrics.channelBreakdown.onlineAppointments.platformFeeGstMinor)}
                    </span>
                  </div>
                )}
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
                  <span className={styles.channelMetricLabel}>Paid Invoices</span>
                  <span className={styles.channelMetricVal}>{metrics.channelBreakdown.offlineOpd.count}</span>
                </div>
                <div className={styles.channelMetricRow}>
                  <span className={styles.channelMetricLabel}>Clinic Counter Collected (Net of Discount)</span>
                  <span className={styles.channelMetricVal}>
                    {formatMinor(metrics.channelBreakdown.offlineOpd.grossMinor)}
                  </span>
                </div>
                <div className={styles.channelMetricRow}>
                  <span className={styles.channelMetricLabel}>Platform Net Revenue (Excl. GST)</span>
                  <span className={styles.channelMetricVal} style={{ color: "#059669" }}>
                    {formatMinor(
                      metrics.channelBreakdown.offlineOpd.platformRevenueMinor ??
                        metrics.channelBreakdown.offlineOpd.commissionMinor,
                    )}
                  </span>
                </div>
                {metrics.channelBreakdown.offlineOpd.gstMinor && metrics.channelBreakdown.offlineOpd.gstMinor !== "0" && (
                  <div className={styles.channelMetricRow}>
                    <span className={styles.channelMetricLabel}>Platform GST Liability</span>
                    <span className={styles.channelMetricVal} style={{ color: "#64748b" }}>
                      {formatMinor(metrics.channelBreakdown.offlineOpd.gstMinor)}
                    </span>
                  </div>
                )}
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

          {/* Revenue by Commercial Model */}
          {metrics.revenueByCommercialModel && (
            <div className={styles.channelsGrid} style={{ marginTop: "18px" }}>
              <div className={styles.channelCard}>
                <div className={styles.channelHeader}>
                  <h3 className={styles.channelTitle}>Model A: Provider Commission</h3>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    {metrics.revenueByCommercialModel.providerCommission.count} bookings
                  </span>
                </div>
                <div className={styles.channelMetrics}>
                  <div className={styles.channelMetricRow}>
                    <span className={styles.channelMetricLabel}>Service Volume</span>
                    <span className={styles.channelMetricVal}>
                      {formatMinor(metrics.revenueByCommercialModel.providerCommission.serviceAmountMinor)}
                    </span>
                  </div>
                  <div className={styles.channelMetricRow}>
                    <span className={styles.channelMetricLabel}>Provider Commission</span>
                    <span className={styles.channelMetricVal} style={{ color: "#059669" }}>
                      {formatMinor(metrics.revenueByCommercialModel.providerCommission.commissionMinor)}
                    </span>
                  </div>
                  <div className={styles.channelMetricRow}>
                    <span className={styles.channelMetricLabel}>Provider Payable</span>
                    <span className={styles.channelMetricVal}>
                      {formatMinor(metrics.revenueByCommercialModel.providerCommission.providerPayableMinor)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.channelCard}>
                <div className={styles.channelHeader}>
                  <h3 className={styles.channelTitle}>Model B: Patient-Paid Platform Fee</h3>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    {metrics.revenueByCommercialModel.patientPlatformFee.count} bookings
                  </span>
                </div>
                <div className={styles.channelMetrics}>
                  <div className={styles.channelMetricRow}>
                    <span className={styles.channelMetricLabel}>Service Volume (100% Provider Payable)</span>
                    <span className={styles.channelMetricVal}>
                      {formatMinor(metrics.revenueByCommercialModel.patientPlatformFee.serviceAmountMinor)}
                    </span>
                  </div>
                  <div className={styles.channelMetricRow}>
                    <span className={styles.channelMetricLabel}>Platform Net Revenue (excl. GST)</span>
                    <span className={styles.channelMetricVal} style={{ color: "#059669" }}>
                      {formatMinor(metrics.revenueByCommercialModel.patientPlatformFee.platformRevenueMinor)}
                    </span>
                  </div>
                  <div className={styles.channelMetricRow}>
                    <span className={styles.channelMetricLabel}>GST Liability (Separated)</span>
                    <span className={styles.channelMetricVal} style={{ color: "#64748b" }}>
                      {formatMinor(metrics.revenueByCommercialModel.patientPlatformFee.platformFeeGstMinor)}
                    </span>
                  </div>
                  <div className={styles.channelMetricRow}>
                    <span className={styles.channelMetricLabel}>Patient Total Collected</span>
                    <span className={styles.channelMetricVal}>
                      {formatMinor(metrics.revenueByCommercialModel.patientPlatformFee.patientPayableMinor)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Double-Entry Financial Reconciliation */}
          {metrics.reconciliation && (
            <div style={{ marginTop: "18px", marginBottom: "18px" }}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <h3 style={{ margin: "0 0 2px 0", color: "#173654", fontSize: "16px", fontWeight: 700 }}>
                      Double-Entry Financial Reconciliation
                    </h3>
                    <p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>
                      Net Collections = Online Provider Payable + Offline Clinic Retained + Platform Net Revenue + GST Liability · Active Model: Patient-Paid Platform Fee (0% Commission)
                    </p>
                  </div>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: 700,
                      background: metrics.reconciliation.unallocatedDeltaMinor === "0" ? "#dcfce7" : "#fef2f2",
                      color: metrics.reconciliation.unallocatedDeltaMinor === "0" ? "#166534" : "#991b1b",
                    }}
                  >
                    {metrics.reconciliation.unallocatedDeltaMinor === "0" ? "Reconciled (₹0.00 Delta)" : `Delta: ${formatMinor(metrics.reconciliation.unallocatedDeltaMinor)}`}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", fontSize: "13px" }}>
                  <div><span style={{ color: "#64748b" }}>Gross Service Value:</span> <strong>{formatMinor(metrics.reconciliation.grossServiceValueMinor)}</strong></div>
                  <div><span style={{ color: "#64748b" }}>OPD Discounts:</span> <strong>-{formatMinor(metrics.reconciliation.discountsMinor)}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Net Collections:</span> <strong>{formatMinor(metrics.reconciliation.netCollectionsMinor)}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Online Provider Payable:</span> <strong>{formatMinor(metrics.reconciliation.onlineProviderPayableMinor)}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Offline Clinic Retained:</span> <strong>{formatMinor(metrics.reconciliation.offlineClinicRetainedMinor)}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Platform Net Revenue:</span> <strong style={{ color: "#059669" }}>{formatMinor(metrics.reconciliation.platformNetRevenueMinor)}</strong></div>
                  <div><span style={{ color: "#64748b" }}>GST Tax Liability:</span> <strong>{formatMinor(metrics.reconciliation.totalTaxLiabilityMinor)}</strong></div>
                  <div><span style={{ color: "#64748b" }}>In-Progress Escrow:</span> <strong>{formatMinor(metrics.reconciliation.inProgressEscrowPayablesMinor)}</strong></div>
                  {metrics.reconciliation.commissionAdjustmentsMinor && BigInt(metrics.reconciliation.commissionAdjustmentsMinor) > BigInt(0) && (
                    <div><span style={{ color: "#64748b" }}>Commission Reversals:</span> <strong style={{ color: "#1d4ed8" }}>+{formatMinor(metrics.reconciliation.commissionAdjustmentsMinor)}</strong></div>
                  )}
                </div>
              </Card>
            </div>
          )}

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
