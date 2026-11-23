"use client";

import { useCallback, useEffect, useState } from "react";
import { PlatformApiError } from "../lib/platform-api/client";
import {
  listUnifiedTransactions,
  type UnifiedTransactionItem,
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
  PageHeader,
  Select,
  StatusBadge,
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
    timeStyle: "short",
  }).format(new Date(dateStr));
}

function channelLabel(channel: string) {
  switch (channel) {
    case "ONLINE_APPOINTMENT":
      return "Online Appointment";
    case "OFFLINE_OPD":
      return "Offline OPD Bill";
    case "SUBSCRIPTION":
      return "Subscription";
    case "MANUAL_PAYOUT":
      return "Payout / Settlement";
    case "REFUND":
      return "Refund";
    default:
      return channel;
  }
}

export function FinancialTransactionsView() {
  const [channel, setChannel] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<UnifiedTransactionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    listUnifiedTransactions({
      limit: PAGE_SIZE,
      offset,
      channel: channel || undefined,
      search: search.trim() || undefined,
      from: from || undefined,
      to: to || undefined,
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
            setError(err.message || "Failed to load transactions.");
          } else {
            setError("Network error loading transactions.");
          }
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [channel, search, from, to, offset, refresh]);

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className={styles.container}>
      <Breadcrumbs items={["Platform Admin", "Financial Operations", "Transactions"]} />
      <PageHeader
        eyebrow="Financial Operations"
        title="Unified Financial Transactions Ledger"
        description="Every financial transaction across online appointments, offline consultations, subscriptions, and provider payouts."
      />

      {/* Modern Horizontal Filter Bar */}
      <FilterBar>
        <FilterGroup label="Search">
          <Input
            placeholder="Search reference, patient, doctor…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
            }}
            style={{ minWidth: 200 }}
          />
        </FilterGroup>

        <FilterGroup label="Channel">
          <Select
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">All Channels</option>
            <option value="ONLINE_APPOINTMENT">Online Appointments</option>
            <option value="OFFLINE_OPD">Offline OPD Consultations</option>
            <option value="SUBSCRIPTION">Subscriptions</option>
            <option value="MANUAL_PAYOUT">Payouts / Settlements</option>
            <option value="REFUND">Refunds</option>
          </Select>
        </FilterGroup>

        <FilterGroup label="Date Range">
          <DatePicker
            aria-label="From date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setOffset(0);
            }}
          />
          <span style={{ color: "#94a3b8", fontSize: 13 }}>to</span>
          <DatePicker
            aria-label="To date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setOffset(0);
            }}
          />
        </FilterGroup>

        <div className="filter-bar-actions">
          <Button variant="primary" onClick={() => setRefresh((r) => r + 1)}>
            Apply Filters
          </Button>
          {(search || channel || from || to) && (
            <Button
              variant="quiet"
              onClick={() => {
                setSearch("");
                setChannel("");
                setFrom("");
                setTo("");
                setOffset(0);
                setRefresh((r) => r + 1);
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </FilterBar>

      {error ? (
        <div>
          <ErrorState detail={error} />
          <Button variant="secondary" onClick={() => setRefresh((r) => r + 1)} style={{ marginTop: 12 }}>
            Retry
          </Button>
        </div>
      ) : loading && !items.length ? (
        <LoadingState label="Loading transactions ledger…" />
      ) : !items.length ? (
        <EmptyState
          title="No transactions found"
          detail="No financial transactions match the selected filters or date range."
        />
      ) : (
        <div className={styles.tableSection}>
          <div className={styles.tableHeaderBar}>
            <h3 className={styles.tableTitle}>
              Transactions ({total.toLocaleString()} total)
            </h3>
            <span style={{ fontSize: 13, color: "#64788b" }}>
              Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
            </span>
          </div>

          <DataTable>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Reference #</th>
                <th>Channel</th>
                <th>Flow</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Beneficiary / Counterparty</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDate(item.timestamp)}</td>
                  <td>
                    <code>{item.referenceNumber || item.id.slice(0, 12)}</code>
                  </td>
                  <td>{channelLabel(item.channel)}</td>
                  <td>
                    <span
                      className={
                        item.direction === "INFLOW"
                          ? styles.badgeInflow
                          : styles.badgeOutflow
                      }
                    >
                      {item.direction === "INFLOW" ? "↓ Inflow" : "↑ Outflow"}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    {formatMoney(item.amountMinor, item.currency)}
                  </td>
                  <td>{item.paymentMethod || "—"}</td>
                  <td>
                    {item.patientName && (
                      <div>
                        <small style={{ color: "#64788b" }}>Patient: </small>
                        <strong>{item.patientName}</strong>
                      </div>
                    )}
                    {item.doctorName && (
                      <div>
                        <small style={{ color: "#64788b" }}>Doctor: </small>
                        {item.doctorName}
                      </div>
                    )}
                    {!item.patientName && !item.doctorName && (item.counterparty || item.clinicId || "—")}
                  </td>
                  <td>
                    <StatusBadge value={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 20px",
              borderTop: "1px solid #e2e8f0",
              background: "#f8fafc",
            }}
          >
            <span style={{ fontSize: 13, color: "#64788b" }}>
              Page {currentPage} of {totalPages}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <Button
                variant="secondary"
                disabled={offset === 0}
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
