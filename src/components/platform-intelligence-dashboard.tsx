"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listPlatformClinics,
  listPlatformDoctors,
  listDoctorApplications,
  listClinicApplications,
  listDoctorInvitations,
  platformDashboard,
  type PlatformClinic,
  type PlatformDoctor,
  type PlatformMetrics,
  type DoctorApplication,
  type ClinicApplication,
  type PlatformDoctorInvitation,
} from "../lib/platform-api/platform-admin";
import {
  getFinancialDashboardMetrics,
  type FinancialDashboardMetrics,
} from "../lib/platform-api/financial";
import {
  getAdminContexts,
  listAdminAppointments,
  type AdminAppointment,
} from "../lib/platform-api/admin";
import { PlatformApiError } from "../lib/platform-api/client";
import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusBadge,
  AnalyticsDonutChart,
  AnalyticsBarChart,
  AnalyticsProgressPipeline,
} from "./ui";
import styles from "./platform-intelligence.module.css";

type DatePreset = "today" | "7d" | "30d" | "90d" | "this_year" | "all_time" | "custom";

function formatCurrency(minor: string | number | undefined, currency = "INR"): string {
  if (minor === undefined || minor === null || minor === "") return "₹0.00";
  const num = typeof minor === "string" ? parseFloat(minor) : minor;
  if (isNaN(num)) return "₹0.00";
  const major = num / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function calculatePresetDates(preset: DatePreset): { fromDate: string; toDate: string } {
  const now = new Date();
  const toDate = now.toISOString().split("T")[0];

  if (preset === "today") {
    return { fromDate: toDate, toDate };
  }
  if (preset === "7d") {
    const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { fromDate: from.toISOString().split("T")[0], toDate };
  }
  if (preset === "30d") {
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { fromDate: from.toISOString().split("T")[0], toDate };
  }
  if (preset === "90d") {
    const from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return { fromDate: from.toISOString().split("T")[0], toDate };
  }
  if (preset === "this_year") {
    const from = new Date(now.getFullYear(), 0, 1);
    return { fromDate: from.toISOString().split("T")[0], toDate };
  }
  return { fromDate: "", toDate: "" };
}

export function PlatformIntelligenceDashboard() {
  // Global filter state
  const [preset, setPreset] = useState<DatePreset>("30d");
  const [customFrom, setCustomFrom] = useState(() => calculatePresetDates("30d").fromDate);
  const [customTo, setCustomTo] = useState(() => calculatePresetDates("30d").toDate);
  const [selectedClinicId, setSelectedClinicId] = useState<string>("");
  const [selectedServiceType, setSelectedServiceType] = useState<string>("");

  // Data state
  const [platformStats, setPlatformStats] = useState<PlatformMetrics | null>(null);
  const [clinics, setClinics] = useState<PlatformClinic[]>([]);
  const [doctors, setDoctors] = useState<PlatformDoctor[]>([]);
  const [financialMetrics, setFinancialMetrics] = useState<FinancialDashboardMetrics | null>(null);
  const [doctorApplications, setDoctorApplications] = useState<DoctorApplication[]>([]);
  const [clinicApplications, setClinicApplications] = useState<ClinicApplication[]>([]);
  const [invitations, setInvitations] = useState<PlatformDoctorInvitation[]>([]);
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);

  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Table & leaderboard interactive filters
  const [clinicSearch, setClinicSearch] = useState<string>("");
  const [clinicStatusFilter, setClinicStatusFilter] = useState<string>("");
  const [clinicSortBy, setClinicSortBy] = useState<"doctors" | "services" | "name">("doctors");

  const [doctorSearch, setDoctorSearch] = useState<string>("");
  const [doctorVerificationFilter, setDoctorVerificationFilter] = useState<string>("");

  // Effective reporting date range
  const { fromDate, toDate } = useMemo(() => {
    if (preset === "all_time") return { fromDate: "", toDate: "" };
    if (preset === "custom") return { fromDate: customFrom, toDate: customTo };
    return calculatePresetDates(preset);
  }, [preset, customFrom, customTo]);

  // Data fetcher for manual refresh
  const executeDataFetch = useCallback(async () => {
    try {
      const finQuery = fromDate && toDate ? { from: fromDate, to: toDate } : {};

      const [
        dashResult,
        clinicsResult,
        doctorsResult,
        finResult,
        docAppResult,
        clinicAppResult,
        invitesResult,
        contextsResult,
      ] = await Promise.allSettled([
        platformDashboard(),
        listPlatformClinics(),
        listPlatformDoctors(),
        getFinancialDashboardMetrics(finQuery),
        listDoctorApplications(),
        listClinicApplications(),
        listDoctorInvitations(),
        getAdminContexts(),
      ]);

      setError(null);

      if (dashResult.status === "fulfilled") {
        setPlatformStats(dashResult.value);
      }
      if (clinicsResult.status === "fulfilled") {
        setClinics(clinicsResult.value.items);
      }
      if (doctorsResult.status === "fulfilled") {
        setDoctors(doctorsResult.value.items);
      }
      if (finResult.status === "fulfilled") {
        setFinancialMetrics(finResult.value.metrics);
      }
      if (docAppResult.status === "fulfilled") {
        setDoctorApplications(docAppResult.value.items);
      }
      if (clinicAppResult.status === "fulfilled") {
        setClinicApplications(clinicAppResult.value.items);
      }
      if (invitesResult.status === "fulfilled") {
        setInvitations(invitesResult.value.items);
      }

      // Fetch appointments if tenant contexts exist
      if (contextsResult.status === "fulfilled" && contextsResult.value.items.length > 0) {
        const contexts = contextsResult.value.items;
        const targetContexts = selectedClinicId
          ? contexts.filter((c) => c.clinic?.id === selectedClinicId || c.tenantId === selectedClinicId)
          : contexts;

        const appointmentPromises = targetContexts.map(async (ctx) => {
          try {
            const apptQuery: { from?: string; to?: string; limit: number } = { limit: 100 };
            if (fromDate) apptQuery.from = fromDate;
            if (toDate) apptQuery.to = toDate;
            const res = await listAdminAppointments(ctx.tenantId, apptQuery);
            return res.items;
          } catch {
            return [];
          }
        });

        const apptResults = await Promise.allSettled(appointmentPromises);
        const collected: AdminAppointment[] = [];
        for (const res of apptResults) {
          if (res.status === "fulfilled") {
            collected.push(...res.value);
          }
        }
        setAppointments(collected);
      }
    } catch (err: unknown) {
      if (err instanceof PlatformApiError) {
        setError(err.message);
      } else {
        setError("Failed to fetch platform dashboard analytics.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fromDate, toDate, selectedClinicId]);

  useEffect(() => {
    let cancelled = false;

    async function fetchPlatformData() {
      try {
        const finQuery = fromDate && toDate ? { from: fromDate, to: toDate } : {};

        const [
          dashResult,
          clinicsResult,
          doctorsResult,
          finResult,
          docAppResult,
          clinicAppResult,
          invitesResult,
          contextsResult,
        ] = await Promise.allSettled([
          platformDashboard(),
          listPlatformClinics(),
          listPlatformDoctors(),
          getFinancialDashboardMetrics(finQuery),
          listDoctorApplications(),
          listClinicApplications(),
          listDoctorInvitations(),
          getAdminContexts(),
        ]);

        if (cancelled) return;
        setError(null);

        if (dashResult.status === "fulfilled") {
          setPlatformStats(dashResult.value);
        }
        if (clinicsResult.status === "fulfilled") {
          setClinics(clinicsResult.value.items);
        }
        if (doctorsResult.status === "fulfilled") {
          setDoctors(doctorsResult.value.items);
        }
        if (finResult.status === "fulfilled") {
          setFinancialMetrics(finResult.value.metrics);
        }
        if (docAppResult.status === "fulfilled") {
          setDoctorApplications(docAppResult.value.items);
        }
        if (clinicAppResult.status === "fulfilled") {
          setClinicApplications(clinicAppResult.value.items);
        }
        if (invitesResult.status === "fulfilled") {
          setInvitations(invitesResult.value.items);
        }

        if (contextsResult.status === "fulfilled" && contextsResult.value.items.length > 0) {
          const contexts = contextsResult.value.items;
          const targetContexts = selectedClinicId
            ? contexts.filter((c) => c.clinic?.id === selectedClinicId || c.tenantId === selectedClinicId)
            : contexts;

          const appointmentPromises = targetContexts.map(async (ctx) => {
            try {
              const apptQuery: { from?: string; to?: string; limit: number } = { limit: 100 };
              if (fromDate) apptQuery.from = fromDate;
              if (toDate) apptQuery.to = toDate;
              const res = await listAdminAppointments(ctx.tenantId, apptQuery);
              return res.items;
            } catch {
              return [];
            }
          });

          const apptResults = await Promise.allSettled(appointmentPromises);
          if (cancelled) return;
          const collected: AdminAppointment[] = [];
          for (const res of apptResults) {
            if (res.status === "fulfilled") {
              collected.push(...res.value);
            }
          }
          setAppointments(collected);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          if (err instanceof PlatformApiError) {
            setError(err.message);
          } else {
            setError("Failed to fetch platform dashboard analytics.");
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void fetchPlatformData();

    return () => {
      cancelled = true;
    };
  }, [fromDate, toDate, selectedClinicId]);

  const handleRefresh = () => {
    setRefreshing(true);
    void executeDataFetch();
  };

  const handleResetFilters = () => {
    setPreset("30d");
    const dates = calculatePresetDates("30d");
    setCustomFrom(dates.fromDate);
    setCustomTo(dates.toDate);
    setSelectedClinicId("");
    setSelectedServiceType("");
    setClinicSearch("");
    setClinicStatusFilter("");
    setDoctorSearch("");
    setDoctorVerificationFilter("");
  };

  // Filtered clinics based on table search & status
  const filteredClinics = useMemo(() => {
    return clinics.filter((c) => {
      const matchesSearch =
        clinicSearch.trim() === "" ||
        c.displayName.toLowerCase().includes(clinicSearch.toLowerCase()) ||
        c.legalName.toLowerCase().includes(clinicSearch.toLowerCase());
      const matchesStatus =
        clinicStatusFilter === "" ||
        c.clinicStatus === clinicStatusFilter ||
        c.tenantStatus === clinicStatusFilter;
      const matchesSelected =
        selectedClinicId === "" || c.id === selectedClinicId;
      return matchesSearch && matchesStatus && matchesSelected;
    }).sort((a, b) => {
      if (clinicSortBy === "doctors") return (b.doctors?.length ?? 0) - (a.doctors?.length ?? 0);
      if (clinicSortBy === "services") return (b.services?.length ?? 0) - (a.services?.length ?? 0);
      return a.displayName.localeCompare(b.displayName);
    });
  }, [clinics, clinicSearch, clinicStatusFilter, selectedClinicId, clinicSortBy]);

  // Filtered doctors for the platform leaderboard
  const filteredDoctors = useMemo(() => {
    return doctors.filter((d) => {
      const name = d.displayName ?? "Doctor";
      const specialty = d.specialization ?? "";
      const clinicMatch = d.clinicNames?.some((cn) => cn.toLowerCase().includes(doctorSearch.toLowerCase())) ?? false;
      const matchesSearch =
        doctorSearch.trim() === "" ||
        name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
        specialty.toLowerCase().includes(doctorSearch.toLowerCase()) ||
        clinicMatch;
      const matchesVerification =
        doctorVerificationFilter === "" ||
        d.professionalVerificationStatus === doctorVerificationFilter;
      const matchesClinic =
        selectedClinicId === "" ||
        d.clinics?.some((c) => c.id === selectedClinicId);
      return matchesSearch && matchesVerification && matchesClinic;
    });
  }, [doctors, doctorSearch, doctorVerificationFilter, selectedClinicId]);

  // Selected clinic detail for drill-down
  const drillDownClinic = useMemo(() => {
    if (!selectedClinicId) return null;
    return clinics.find((c) => c.id === selectedClinicId) ?? null;
  }, [clinics, selectedClinicId]);

  // Derived Ecosystem Analytics
  const ecosystemStats = useMemo(() => {
    const totalClinics = clinics.length;
    const activeClinics = clinics.filter((c) => c.clinicStatus === "ACTIVE" || c.tenantStatus === "ACTIVE").length;
    const inactiveClinics = totalClinics - activeClinics;

    const totalDoctors = doctors.length;
    const verifiedDoctors = doctors.filter((d) => d.professionalVerificationStatus === "VERIFIED").length;
    const pendingDoctors = doctors.filter((d) => d.professionalVerificationStatus === "PENDING").length;
    const activeDoctors = doctors.filter((d) => d.status === "ACTIVE").length;

    const totalPatients = platformStats?.patients ?? 0;
    const totalUsers = totalClinics + totalDoctors + totalPatients;

    // Period registrations (based on createdAt)
    const newClinicsInPeriod = clinics.filter((c) => {
      if (!fromDate || !toDate) return true;
      const created = c.createdAt.split("T")[0];
      return created >= fromDate && created <= toDate;
    }).length;

    const newDoctorsInPeriod = doctors.filter((d) => {
      if (!fromDate || !toDate) return true;
      const created = d.createdAt.split("T")[0];
      return created >= fromDate && created <= toDate;
    }).length;

    // Active users: Clinicians with active status/associations + active clinics
    const activeUsers = activeDoctors + activeClinics;

    return {
      totalClinics,
      activeClinics,
      inactiveClinics,
      totalDoctors,
      verifiedDoctors,
      pendingDoctors,
      activeDoctors,
      totalPatients,
      totalUsers,
      newClinicsInPeriod,
      newDoctorsInPeriod,
      activeUsers,
    };
  }, [clinics, doctors, platformStats, fromDate, toDate]);

  // Derived Appointment Analytics
  const appointmentStats = useMemo(() => {
    const total = appointments.length;
    const completed = appointments.filter((a) => a.status === "COMPLETED").length;
    const confirmed = appointments.filter((a) => a.status === "CONFIRMED" || a.status === "SCHEDULED").length;
    const pending = appointments.filter((a) => a.status === "PENDING" || a.status === "IN_PROGRESS").length;
    const cancelled = appointments.filter((a) => a.status === "CANCELLED").length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;

    // Channel breakdown from financial channels or appointment counts
    const onlineCount = financialMetrics?.channelBreakdown?.onlineAppointments?.count ?? 0;
    const opdCount = financialMetrics?.channelBreakdown?.offlineOpd?.count ?? 0;
    const subCount = financialMetrics?.channelBreakdown?.subscriptions?.activeCount ?? 0;

    return {
      total: total > 0 ? total : platformStats?.upcomingAppointments ?? 0,
      completed,
      confirmed,
      pending,
      cancelled,
      completionRate,
      cancellationRate,
      onlineCount,
      opdCount,
      subCount,
    };
  }, [appointments, financialMetrics, platformStats]);

  // Donut chart segment data for User Composition
  const userCompositionSegments = useMemo(() => [
    { label: "Patients", value: ecosystemStats.totalPatients, color: "#2e7fbd" },
    { label: "Verified Clinicians", value: ecosystemStats.verifiedDoctors, color: "#1b887c" },
    { label: "In-Review Doctors", value: ecosystemStats.pendingDoctors, color: "#f59e0b" },
    { label: "Active Clinics", value: ecosystemStats.activeClinics, color: "#6366f1" },
  ], [ecosystemStats]);

  // Donut chart segment data for Care Delivery Channels
  const channelSegments = useMemo(() => [
    { label: "Online Consultations", value: appointmentStats.onlineCount, color: "#0284c7" },
    { label: "Offline OPD Visits", value: appointmentStats.opdCount, color: "#0d9488" },
    { label: "Subscription Care", value: appointmentStats.subCount, color: "#8b5cf6" },
  ], [appointmentStats]);

  // Pipeline steps for Consultation Fulfillment
  const fulfillmentPipelineSteps = useMemo(() => [
    {
      label: "Total Registered Consultations",
      formatted: `${appointmentStats.total} appointments`,
      count: appointmentStats.total,
      color: "#2e7fbd",
      status: "completed" as const,
    },
    {
      label: "Confirmed & Scheduled",
      formatted: `${appointmentStats.confirmed} confirmed`,
      count: appointmentStats.confirmed,
      color: "#1b887c",
      status: "completed" as const,
    },
    {
      label: "Successfully Completed",
      formatted: `${appointmentStats.completed} completed (${appointmentStats.completionRate}%)`,
      count: appointmentStats.completed,
      color: "#16a34a",
      status: "active" as const,
    },
  ], [appointmentStats]);

  // Bar chart bars for Registration Pipeline
  const registrationBars = useMemo(() => {
    const pendingDocApps = doctorApplications.filter((a) => a.status === "PENDING").length;
    const pendingClinicApps = clinicApplications.filter((a) => a.status === "PENDING").length;
    const activeDoctorInvites = invitations.filter((i) => i.status === "PENDING" || !i.acceptedAt).length;

    return [
      {
        label: "New Clinicians (Period)",
        value: ecosystemStats.newDoctorsInPeriod,
        formatted: `${ecosystemStats.newDoctorsInPeriod} doctors`,
        color: "#1b887c",
        sublabel: "Registered in selected date window",
      },
      {
        label: "New Clinics (Period)",
        value: ecosystemStats.newClinicsInPeriod,
        formatted: `${ecosystemStats.newClinicsInPeriod} clinics`,
        color: "#2e7fbd",
        sublabel: "Created within reporting period",
      },
      {
        label: "Pending Doctor Applications",
        value: pendingDocApps,
        formatted: `${pendingDocApps} queued`,
        color: "#f59e0b",
        sublabel: "Awaiting platform medical review",
      },
      {
        label: "Active Doctor Invitations",
        value: activeDoctorInvites,
        formatted: `${activeDoctorInvites} pending acceptance`,
        color: "#8b5cf6",
        sublabel: "Invitations dispatched to doctors",
      },
    ];
  }, [ecosystemStats, doctorApplications, clinicApplications, invitations]);

  // Automated Operational Insights derived directly from actual data
  const operationalInsights = useMemo(() => {
    const insights: Array<{
      title: string;
      text: string;
      metric: string;
      variant: "info" | "alert" | "success";
    }> = [];

    // Highest capacity clinic
    if (clinics.length > 0) {
      const topClinic = [...clinics].sort((a, b) => (b.doctors?.length ?? 0) - (a.doctors?.length ?? 0))[0];
      if (topClinic && (topClinic.doctors?.length ?? 0) > 0) {
        insights.push({
          title: "Top Provider Capacity",
          text: `${topClinic.displayName} operates the largest clinical roster across the ecosystem with ${topClinic.doctors.length} affiliated doctors and ${topClinic.services.length} services.`,
          metric: `${topClinic.doctors.length} Affiliated Doctors`,
          variant: "success",
        });
      }
    }

    // Doctor applications backlog
    const pendingDocApps = doctorApplications.filter((a) => a.status === "PENDING").length;
    if (pendingDocApps > 0) {
      insights.push({
        title: "Medical Credentialing Queue",
        text: `There are ${pendingDocApps} clinician applications awaiting administrative review in the verification pipeline.`,
        metric: `${pendingDocApps} Applications Pending`,
        variant: "alert",
      });
    } else {
      insights.push({
        title: "Medical Verification Health",
        text: "The clinical credentialing queue is clear with zero pending backlogs across all jurisdictions.",
        metric: "100% Up to Date",
        variant: "info",
      });
    }

    // Care delivery channel dominance
    const online = appointmentStats.onlineCount;
    const opd = appointmentStats.opdCount;
    if (online > 0 || opd > 0) {
      const dominant = online >= opd ? "Online Consultations" : "In-Person OPD Consultations";
      insights.push({
        title: "Primary Consultation Channel",
        text: `${dominant} represents the primary volume driver across active tenant appointments in the current reporting period.`,
        metric: `${Math.max(online, opd)} Transactions`,
        variant: "info",
      });
    }

    // Settlement & payout health
    const payablesStr = financialMetrics?.providerPayablesOutstandingMinor ?? financialMetrics?.providerPayablesOutstanding?.amountMinor ?? "0";
    const payoutsStr = financialMetrics?.paidOutTotal?.amountMinor ?? financialMetrics?.payoutsCompletedMinor ?? "0";
    const payables = parseFloat(payablesStr.toString());
    const payouts = parseFloat(payoutsStr.toString());
    if (payables > 0 || payouts > 0) {
      insights.push({
        title: "Provider Settlement Status",
        text: `The platform has cleared ${formatCurrency(payouts)} in total provider settlements with ${formatCurrency(payables)} in current outstanding payables.`,
        metric: "Settlement Operations Active",
        variant: "info",
      });
    }

    return insights;
  }, [clinics, doctorApplications, appointmentStats, financialMetrics]);

  return (
    <div className={styles.intelligenceContainer}>
      <Breadcrumbs items={["Platform Admin", "Intelligence & Analytics"]} />

      <PageHeader
        eyebrow="The CliniQ Ecosystem"
        title="Platform Intelligence & Analytics Center"
        description="Comprehensive cross-tenant operational metrics, clinical delivery tracking, and enterprise financial intelligence."
        action={
          <div className="button-group">
            <Button
              type="button"
              variant="secondary"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        }
      />

      {error ? <ErrorState detail={error} /> : null}

      {/* Global Dashboard Control Bar */}
      <section className={styles.controlBar} aria-label="Global Dashboard Filters">
        <div className={styles.controlPresets}>
          <span className={styles.filterLabel}>Preset:</span>
          {(["today", "7d", "30d", "90d", "this_year", "all_time", "custom"] as DatePreset[]).map((p) => (
            <button
              key={p}
              type="button"
              className={`${styles.presetBtn} ${preset === p ? styles.presetBtnActive : ""}`}
              onClick={() => {
                setPreset(p);
                if (p !== "custom" && p !== "all_time") {
                  const dates = calculatePresetDates(p);
                  setCustomFrom(dates.fromDate);
                  setCustomTo(dates.toDate);
                }
              }}
            >
              {p === "today"
                ? "Today"
                : p === "7d"
                ? "7 Days"
                : p === "30d"
                ? "30 Days"
                : p === "90d"
                ? "90 Days"
                : p === "this_year"
                ? "This Year"
                : p === "all_time"
                ? "All Time"
                : "Custom"}
            </button>
          ))}
        </div>

        <div className={styles.controlFilters}>
          {preset === "custom" && (
            <>
              <div className={styles.filterItem}>
                <span className={styles.filterLabel}>From:</span>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </div>
              <div className={styles.filterItem}>
                <span className={styles.filterLabel}>To:</span>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </div>
            </>
          )}

          <div className={styles.filterItem}>
            <span className={styles.filterLabel}>Clinic:</span>
            <select
              className={styles.filterSelect}
              value={selectedClinicId}
              onChange={(e) => setSelectedClinicId(e.target.value)}
              aria-label="Filter by clinic"
            >
              <option value="">All Clinics ({clinics.length})</option>
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterItem}>
            <span className={styles.filterLabel}>Service:</span>
            <select
              className={styles.filterSelect}
              value={selectedServiceType}
              onChange={(e) => setSelectedServiceType(e.target.value)}
              aria-label="Filter by service type"
            >
              <option value="">All Service Types</option>
              <option value="DOCTOR_CONSULTATION">Doctor Consultations</option>
              <option value="PHYSIOTHERAPY">Physiotherapy</option>
              <option value="HOME_VISIT">Home Visits</option>
              <option value="OPD_PROCEDURE">OPD Procedures</option>
            </select>
          </div>
        </div>

        <div className={styles.controlActions}>
          <Button type="button" variant="quiet" onClick={handleResetFilters}>
            Reset Filters
          </Button>
        </div>
      </section>

      {/* Selected Period Status Banner */}
      <div className={styles.periodBanner}>
        <span className={styles.periodBannerText}>
          <strong>Active Reporting Scope:</strong>{" "}
          {preset === "all_time"
            ? "All Recorded Lifetime Data"
            : fromDate && toDate
            ? `${formatDate(fromDate)} to ${formatDate(toDate)}`
            : "Current Active Window"}
          {selectedClinicId ? ` · Filtered to Clinic: ${drillDownClinic?.displayName ?? selectedClinicId}` : " · All Clinics Included"}
          {selectedServiceType ? ` · Service: ${selectedServiceType}` : ""}
        </span>
        <span className={styles.periodBannerScope}>
          {preset.toUpperCase().replace("_", " ")}
        </span>
      </div>

      {loading ? (
        <LoadingState label="Computing ecosystem intelligence and metrics…" />
      ) : (
        <>
          {/* SECTION 1: PLATFORM OVERVIEW KPIS */}
          <section aria-labelledby="kpi-heading">
            <div className={styles.sectionHeader}>
              <p className={styles.sectionEyebrow}>Executive Overview</p>
              <h2 id="kpi-heading" className={styles.sectionTitle}>Platform Overview KPIs</h2>
              <p className={styles.sectionSubtitle}>
                Key operational volumes, user capacity, appointment delivery, and live financial metrics.
              </p>
            </div>

            <div className={styles.kpiGrid}>
              {/* User metrics */}
              <div className={`${styles.kpiCard} ${styles.kpiCardBlue}`}>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>Total Registered Users</span>
                  <span className={styles.kpiBadge}>Ecosystem</span>
                </div>
                <div className={styles.kpiValueRow}>
                  <span className={styles.kpiValue}>{ecosystemStats.totalUsers.toLocaleString()}</span>
                </div>
                <p className={styles.kpiSubtext}>
                  {ecosystemStats.totalPatients.toLocaleString()} Patients · {ecosystemStats.totalDoctors} Clinicians · {ecosystemStats.totalClinics} Clinics
                </p>
              </div>

              <div className={`${styles.kpiCard} ${styles.kpiCardTeal}`}>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>Total Registered Clinics</span>
                  <span className={styles.kpiBadge}>Organizations</span>
                </div>
                <div className={styles.kpiValueRow}>
                  <span className={styles.kpiValue}>{ecosystemStats.totalClinics}</span>
                </div>
                <p className={styles.kpiSubtext}>
                  <span className={styles.kpiHighlight}>{ecosystemStats.activeClinics} Active</span> · {ecosystemStats.inactiveClinics} Inactive / Setup
                </p>
              </div>

              <div className={`${styles.kpiCard} ${styles.kpiCardIndigo}`}>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>Registered Clinicians</span>
                  <span className={styles.kpiBadge}>Doctors</span>
                </div>
                <div className={styles.kpiValueRow}>
                  <span className={styles.kpiValue}>{ecosystemStats.totalDoctors}</span>
                </div>
                <p className={styles.kpiSubtext}>
                  <span className={styles.kpiHighlight}>{ecosystemStats.verifiedDoctors} Verified</span> · {ecosystemStats.pendingDoctors} Under Review
                </p>
              </div>

              <div className={`${styles.kpiCard} ${styles.kpiCardAmber}`}>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>Active Engaged Users</span>
                  <span className={styles.kpiBadge}>Activity</span>
                </div>
                <div className={styles.kpiValueRow}>
                  <span className={styles.kpiValue}>{ecosystemStats.activeUsers}</span>
                </div>
                <p className={styles.kpiSubtext}>
                  Active providers with appointments or active memberships in reporting window
                </p>
              </div>

              {/* Appointment metrics */}
              <div className={`${styles.kpiCard} ${styles.kpiCardGreen}`}>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>Consultation Volume</span>
                  <span className={styles.kpiBadge}>Appointments</span>
                </div>
                <div className={styles.kpiValueRow}>
                  <span className={styles.kpiValue}>{appointmentStats.total}</span>
                </div>
                <p className={styles.kpiSubtext}>
                  {appointmentStats.completed} Completed · {appointmentStats.completionRate}% Fulfillment Rate
                </p>
              </div>

              {/* Financial metrics */}
              <div className={`${styles.kpiCard} ${styles.kpiCardBlue}`}>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>Gross Collections</span>
                  <span className={styles.kpiBadge}>Volume</span>
                </div>
                <div className={styles.kpiValueRow}>
                  <span className={styles.kpiValue}>
                    {financialMetrics?.grossCollections?.formatted ??
                      formatCurrency(financialMetrics?.grossCollectionsMinor)}
                  </span>
                </div>
                <p className={styles.kpiSubtext}>
                  Total gross transaction collections across online & OPD billing
                </p>
              </div>

              <div className={`${styles.kpiCard} ${styles.kpiCardTeal}`}>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>Platform Revenue</span>
                  <span className={styles.kpiBadge}>Retained</span>
                </div>
                <div className={styles.kpiValueRow}>
                  <span className={styles.kpiValue}>
                    {financialMetrics?.platformRevenue?.formatted ??
                      formatCurrency(financialMetrics?.platformRevenueMinor)}
                  </span>
                </div>
                <p className={styles.kpiSubtext}>
                  Platform commissions, service fees & subscription earnings
                </p>
              </div>

              <div className={`${styles.kpiCard} ${styles.kpiCardRose}`}>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiLabel}>Provider Payables</span>
                  <span className={styles.kpiBadge}>Liability</span>
                </div>
                <div className={styles.kpiValueRow}>
                  <span className={styles.kpiValue}>
                    {financialMetrics?.providerPayablesOutstanding?.formatted ??
                      formatCurrency(financialMetrics?.providerPayablesOutstandingMinor)}
                  </span>
                </div>
                <p className={styles.kpiSubtext}>
                  Settlements currently payable to partner clinics and clinicians
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 2: USER ACQUISITION & ECOSYSTEM COMPOSITION */}
          <section aria-labelledby="acquisition-heading">
            <div className={styles.sectionHeader}>
              <p className={styles.sectionEyebrow}>Growth & Participation</p>
              <h2 id="acquisition-heading" className={styles.sectionTitle}>
                User Acquisition & Ecosystem Composition Analytics
              </h2>
              <p className={styles.sectionSubtitle}>
                Breakdown of ecosystem participants, registration queues, and credential verification pipelines.
              </p>
            </div>

            <div className={styles.analyticsRow}>
              <AnalyticsDonutChart
                title="Ecosystem User Distribution"
                segments={userCompositionSegments}
                size={190}
                strokeWidth={26}
              />
              <AnalyticsBarChart
                title="Registration Pipeline & Period Additions"
                bars={registrationBars}
              />
            </div>
          </section>

          {/* SECTION 3: APPOINTMENT INTELLIGENCE */}
          <section aria-labelledby="appointment-heading">
            <div className={styles.sectionHeader}>
              <p className={styles.sectionEyebrow}>Clinical Delivery</p>
              <h2 id="appointment-heading" className={styles.sectionTitle}>Appointment Intelligence</h2>
              <p className={styles.sectionSubtitle}>
                Fulfillment pipeline, consultation channels, and patient care delivery trends.
              </p>
            </div>

            <div className={styles.analyticsRow}>
              <AnalyticsProgressPipeline
                title="Consultation Fulfillment Pipeline"
                steps={fulfillmentPipelineSteps}
              />
              <AnalyticsDonutChart
                title="Care Delivery Channels Breakdown"
                segments={channelSegments}
                size={190}
                strokeWidth={26}
              />
            </div>
          </section>

          {/* SECTION 4: CONTEXTUAL CLINIC DRILL-DOWN (IF SELECTED) */}
          {drillDownClinic && (
            <section className={styles.drillDownContainer} aria-labelledby="drilldown-heading">
              <div className={styles.drillDownHeader}>
                <div>
                  <p className={styles.sectionEyebrow}>Contextual Drill-Down</p>
                  <h3 id="drilldown-heading" className={styles.drillDownTitle}>
                    {drillDownClinic.displayName} — Clinical Roster & Offerings
                  </h3>
                  <div className={styles.drillDownMeta}>
                    <span><strong>Legal:</strong> {drillDownClinic.legalName}</span>
                    <span><strong>Tenant ID:</strong> <code>{drillDownClinic.tenantId}</code></span>
                    <span><strong>Status:</strong> <StatusBadge value={drillDownClinic.clinicStatus} /></span>
                    <span><strong>Total Doctors:</strong> {drillDownClinic.doctors?.length ?? 0}</span>
                    <span><strong>Services:</strong> {drillDownClinic.services?.length ?? 0}</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="quiet"
                  onClick={() => setSelectedClinicId("")}
                  aria-label="Close clinic drill down"
                >
                  ✕ Close Drill-Down
                </Button>
              </div>

              {drillDownClinic.doctors && drillDownClinic.doctors.length > 0 ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Doctor ID</th>
                        <th>Name</th>
                        <th>Verification Status</th>
                        <th>Connection Status</th>
                        <th>Operational Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drillDownClinic.doctors.map((doc) => (
                        <tr key={doc.id}>
                          <td>
                            <code>{doc.id}</code>
                          </td>
                          <td>
                            <strong>{doc.displayName ?? "Doctor"}</strong>
                          </td>
                          <td>
                            <StatusBadge value={doc.professionalVerificationStatus} />
                          </td>
                          <td>
                            <Badge tone="neutral">{doc.connectionStatus}</Badge>
                          </td>
                          <td>
                            <StatusBadge value={doc.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="No doctors attached"
                  detail="This clinic does not have any affiliated doctors registered in the system yet."
                />
              )}
            </section>
          )}

          {/* SECTION 5: CLINIC PERFORMANCE INTELLIGENCE */}
          <section aria-labelledby="clinic-perf-heading">
            <div className={styles.sectionHeader}>
              <p className={styles.sectionEyebrow}>Organizations</p>
              <h2 id="clinic-perf-heading" className={styles.sectionTitle}>
                Clinic Performance Intelligence
              </h2>
              <p className={styles.sectionSubtitle}>
                Ranked operational comparison across clinics with clinician capacity and service offering counts.
              </p>
            </div>

            <Card>
              <div className={styles.tableHeaderBar}>
                <input
                  type="search"
                  placeholder="Search clinics by name or legal entity…"
                  className={styles.tableSearchInput}
                  value={clinicSearch}
                  onChange={(e) => setClinicSearch(e.target.value)}
                  aria-label="Search clinics"
                />

                <div className={styles.tableFilters}>
                  <select
                    className={styles.filterSelect}
                    value={clinicStatusFilter}
                    onChange={(e) => setClinicStatusFilter(e.target.value)}
                    aria-label="Filter by clinic status"
                  >
                    <option value="">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="DRAFT">Draft</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>

                  <select
                    className={styles.filterSelect}
                    value={clinicSortBy}
                    onChange={(e) => setClinicSortBy(e.target.value as "doctors" | "services" | "name")}
                    aria-label="Sort clinics"
                  >
                    <option value="doctors">Sort by Doctor Capacity</option>
                    <option value="services">Sort by Service Count</option>
                    <option value="name">Sort by Name</option>
                  </select>
                </div>
              </div>

              {filteredClinics.length > 0 ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: "60px" }}>Rank</th>
                        <th>Clinic Name</th>
                        <th>Doctor Roster</th>
                        <th>Services</th>
                        <th>Tenant Status</th>
                        <th>Created</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClinics.map((clinic, idx) => (
                        <tr key={clinic.id}>
                          <td>
                            <span
                              className={`${styles.rankPill} ${
                                idx === 0
                                  ? styles.rankPillTop1
                                  : idx === 1
                                  ? styles.rankPillTop2
                                  : idx === 2
                                  ? styles.rankPillTop3
                                  : ""
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </td>
                          <td>
                            <strong>{clinic.displayName}</strong>
                            <br />
                            <small className="muted">{clinic.legalName}</small>
                          </td>
                          <td>
                            <strong>{clinic.doctors?.length ?? 0} doctors</strong>
                            <br />
                            <small className="muted">
                              {clinic.doctors?.filter((d) => d.professionalVerificationStatus === "VERIFIED").length ?? 0} verified
                            </small>
                          </td>
                          <td>
                            <strong>{clinic.services?.length ?? 0} offerings</strong>
                          </td>
                          <td>
                            <StatusBadge value={clinic.clinicStatus ?? clinic.tenantStatus} />
                          </td>
                          <td>{formatDate(clinic.createdAt)}</td>
                          <td style={{ textAlign: "right" }}>
                            <div className="button-group" style={{ justifyContent: "flex-end" }}>
                              <Button
                                type="button"
                                variant="quiet"
                                onClick={() => setSelectedClinicId(clinic.id)}
                              >
                                Drill Down
                              </Button>
                              <Link
                                href={`/platform/clinics`}
                                className="button button--secondary"
                                style={{ textDecoration: "none" }}
                              >
                                Manage
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="No clinics matching filters"
                  detail="Try adjusting your search criteria or clearing selected filters."
                />
              )}
            </Card>
          </section>

          {/* SECTION 6: INDIVIDUAL DOCTOR PERFORMANCE LEADERBOARD */}
          <section aria-labelledby="doctor-perf-heading">
            <div className={styles.sectionHeader}>
              <p className={styles.sectionEyebrow}>Care Providers</p>
              <h2 id="doctor-perf-heading" className={styles.sectionTitle}>
                Doctor Performance Leaderboard
              </h2>
              <p className={styles.sectionSubtitle}>
                Platform-wide clinician roster with verification statuses, specializations, and affiliated clinical practices.
              </p>
            </div>

            <Card>
              <div className={styles.tableHeaderBar}>
                <input
                  type="search"
                  placeholder="Search doctors by name, specialty, or clinic…"
                  className={styles.tableSearchInput}
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  aria-label="Search doctors"
                />

                <div className={styles.tableFilters}>
                  <select
                    className={styles.filterSelect}
                    value={doctorVerificationFilter}
                    onChange={(e) => setDoctorVerificationFilter(e.target.value)}
                    aria-label="Filter by verification status"
                  >
                    <option value="">All Verification Statuses</option>
                    <option value="VERIFIED">Verified Only</option>
                    <option value="PENDING">Pending Review</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </div>

              {filteredDoctors.length > 0 ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: "60px" }}>Rank</th>
                        <th>Clinician</th>
                        <th>Specialization</th>
                        <th>Primary Clinic</th>
                        <th>Verification</th>
                        <th>Status</th>
                        <th>Services</th>
                        <th>Registered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDoctors.map((doc, idx) => {
                        const primaryClinic = doc.clinics?.[0]?.displayName ?? doc.clinicNames?.[0] ?? "Independent";
                        return (
                          <tr key={doc.id}>
                            <td>
                              <span
                                className={`${styles.rankPill} ${
                                  idx === 0
                                    ? styles.rankPillTop1
                                    : idx === 1
                                    ? styles.rankPillTop2
                                    : idx === 2
                                    ? styles.rankPillTop3
                                    : ""
                                }`}
                              >
                                {idx + 1}
                              </span>
                            </td>
                            <td>
                              <strong>{doc.displayName ?? "Doctor"}</strong>
                              {doc.professionalTitle ? (
                                <>
                                  <br />
                                  <small className="muted">{doc.professionalTitle}</small>
                                </>
                              ) : null}
                            </td>
                            <td>
                              <span>{doc.specialization ?? "General Practice"}</span>
                              {doc.yearsExperience ? (
                                <>
                                  <br />
                                  <small className="muted">{doc.yearsExperience} yrs exp</small>
                                </>
                              ) : null}
                            </td>
                            <td>
                              <span>{primaryClinic}</span>
                              {doc.clinics && doc.clinics.length > 1 ? (
                                <>
                                  <br />
                                  <small className="muted">+{doc.clinics.length - 1} more</small>
                                </>
                              ) : null}
                            </td>
                            <td>
                              <StatusBadge value={doc.professionalVerificationStatus} />
                            </td>
                            <td>
                              <StatusBadge value={doc.status} />
                            </td>
                            <td>
                              <strong>{doc.services?.length ?? 0} offerings</strong>
                            </td>
                            <td>{formatDate(doc.createdAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="No clinicians matching filters"
                  detail="Try adjusting your doctor search or verification filters."
                />
              )}
            </Card>
          </section>

          {/* SECTION 7: EVIDENCE-BASED OPERATIONAL INSIGHTS */}
          <section aria-labelledby="insights-heading">
            <div className={styles.sectionHeader}>
              <p className={styles.sectionEyebrow}>Automated Intelligence</p>
              <h2 id="insights-heading" className={styles.sectionTitle}>
                Evidence-Based Operational Insights
              </h2>
              <p className={styles.sectionSubtitle}>
                Key automated findings calculated from live tenant states, clinician capacity, and financial flows.
              </p>
            </div>

            <div className={styles.insightsGrid}>
              {operationalInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className={`${styles.insightCard} ${
                    insight.variant === "alert"
                      ? styles.insightCardAlert
                      : insight.variant === "success"
                      ? styles.insightCardSuccess
                      : styles.insightCardInfo
                  }`}
                >
                  <div className={styles.insightTitle}>
                    <span>•</span>
                    <span>{insight.title}</span>
                  </div>
                  <p className={styles.insightText}>{insight.text}</p>
                  <span className={styles.insightMetric}>{insight.metric}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
