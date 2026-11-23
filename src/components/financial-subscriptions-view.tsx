"use client";

import { useCallback, useEffect, useState } from "react";
import { PlatformApiError } from "../lib/platform-api/client";
import {
  listAdminSubscriptions,
  getAdminSubscriptionDetail,
  type AdminSubscriptionItem,
  type AdminSubscriptionDetail,
} from "../lib/platform-api/financial";
import {
  Breadcrumbs,
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  FilterGroup,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  Pagination,
  Select,
  StatusBadge,
} from "./ui";
import styles from "./financial-management.module.css";

const PAGE_SIZE = 25;

function formatMoney(amountMinor: string | number | undefined | null, currency = "INR") {
  if (amountMinor === undefined || amountMinor === null) return "—";
  const num = Number(amountMinor) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(dateStr));
}

function formatDateTime(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateStr));
}

export function FinancialSubscriptionsView() {
  const [status, setStatus] = useState("");
  const [subscriberType, setSubscriberType] = useState("");
  const [productKey, setProductKey] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<AdminSubscriptionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  // Detail Modal state
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<AdminSubscriptionDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listAdminSubscriptions({
      limit: PAGE_SIZE,
      offset,
      status: status || undefined,
      subscriberType: subscriberType || undefined,
      productKey: productKey || undefined,
      search: search.trim() || undefined,
    })
      .then((res) => {
        if (active) {
          setItems(res.items);
          setTotal(res.total);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          if (err instanceof PlatformApiError) {
            setError(err.message || "Failed to load subscriptions.");
          } else {
            setError("Network error loading subscriptions.");
          }
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [status, subscriberType, productKey, search, offset, refresh]);

  const handleOpenDetail = useCallback((subId: string) => {
    setSelectedSubId(subId);
    setDetailLoading(true);
    setDetailError(null);
    setDetailData(null);

    getAdminSubscriptionDetail(subId)
      .then((res) => {
        setDetailData(res.subscription);
        setDetailLoading(false);
      })
      .catch((err) => {
        if (err instanceof PlatformApiError) {
          setDetailError(err.message || "Failed to load subscription details.");
        } else {
          setDetailError("Network error loading subscription details.");
        }
        setDetailLoading(false);
      });
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedSubId(null);
    setDetailData(null);
    setDetailError(null);
  }, []);

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className={styles.container}>
      <Breadcrumbs items={["Platform Admin", "Financial Operations", "Subscription Finance"]} />
      <PageHeader
        eyebrow="Financial Operations"
        title="Commercial Subscription Finance"
        description="Monitor commercial subscription plans, recurring billing revenue, and subscriber health across clinics and independent doctors."
      />

      {/* Modern Horizontal Filter Bar */}
      <FilterBar>
        <FilterGroup label="Search">
          <Input
            placeholder="Search clinic, doctor, sub ID, payment ref…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
            }}
            style={{ minWidth: 240 }}
          />
        </FilterGroup>

        <FilterGroup label="Subscriber">
          <Select
            value={subscriberType}
            onChange={(e) => {
              setSubscriberType(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">All Types</option>
            <option value="CLINIC">Clinics</option>
            <option value="DOCTOR">Independent Doctors</option>
          </Select>
        </FilterGroup>

        <FilterGroup label="Product">
          <Select
            value={productKey}
            onChange={(e) => {
              setProductKey(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">All Products</option>
            <option value="OFFLINE_OPD">Offline OPD Module</option>
            <option value="IPD_MANAGEMENT">IPD Management</option>
          </Select>
        </FilterGroup>

        <FilterGroup label="Status">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="GRACE">Grace Period</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </FilterGroup>

        <div className="filter-bar-actions">
          <Button variant="primary" onClick={() => setRefresh((r) => r + 1)}>
            Apply Filters
          </Button>
          {(status || subscriberType || productKey || search) && (
            <Button
              variant="quiet"
              onClick={() => {
                setStatus("");
                setSubscriberType("");
                setProductKey("");
                setSearch("");
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
        <LoadingState label="Loading subscription accounts…" />
      ) : !items.length ? (
        <EmptyState
          title="No subscription records found"
          detail="No subscription records match the selected filters or search criteria."
          action={
            (status || subscriberType || productKey || search) ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setStatus("");
                  setSubscriberType("");
                  setProductKey("");
                  setSearch("");
                  setOffset(0);
                }}
              >
                Clear Filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className={styles.tableSection}>
          <div className={styles.tableHeaderBar}>
            <h3 className={styles.tableTitle}>
              Subscriptions ({total.toLocaleString()} total)
            </h3>
            <Pagination current={currentPage} total={totalPages} />
          </div>

          <DataTable>
            <thead>
              <tr>
                <th>Subscription ID</th>
                <th>Subscriber</th>
                <th>Type</th>
                <th>Product & Plan</th>
                <th>Billing</th>
                <th>Base + GST = Total</th>
                <th>Payment Ref</th>
                <th>Invoice #</th>
                <th>Current Period</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((sub) => {
                const subId = sub.subscriptionId || sub.id;
                const baseMinor = sub.baseAmountMinor ?? sub.amountMinor;
                const gstMinor = sub.gstAmountMinor ?? "0";
                const totalMinor = sub.totalAmountMinor ?? sub.amountMinor;

                return (
                  <tr key={sub.id}>
                    <td>
                      <code
                        style={{ fontSize: "11px", cursor: "pointer", color: "#0ea5e9" }}
                        title={subId}
                        onClick={() => handleOpenDetail(subId)}
                      >
                        {subId.slice(0, 8)}…
                      </code>
                    </td>
                    <td>
                      <div>
                        <strong>{sub.subscriberName || sub.subscriberId.slice(0, 16)}</strong>
                        <div style={{ fontSize: "11px", color: "#64788b" }}>
                          ID: {sub.subscriberId.slice(0, 10)}…
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={sub.subscriberType === "CLINIC" ? styles.badgeInflow : styles.badgeOutflow}>
                        {sub.subscriberType === "CLINIC" ? "Clinic" : "Doctor"}
                      </span>
                    </td>
                    <td>
                      <div>
                        <strong>{sub.productName || sub.productKey || "OPD"}</strong>
                        <div style={{ fontSize: "11px", color: "#64788b" }}>
                          {sub.planName || sub.planCode} (v{sub.planVersion ?? 1})
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: "12px", textTransform: "capitalize" }}>
                      {sub.billingCadence?.toLowerCase() || sub.billingCycle?.toLowerCase() || "monthly"}
                    </td>
                    <td>
                      <div>
                        <strong style={{ fontVariantNumeric: "tabular-nums" }}>
                          {formatMoney(totalMinor, sub.currency)}
                        </strong>
                        <div style={{ fontSize: "11px", color: "#64788b" }}>
                          Base: {formatMoney(baseMinor, sub.currency)} + GST: {formatMoney(gstMinor, sub.currency)}
                        </div>
                      </div>
                    </td>
                    <td>
                      {sub.paymentReference ? (
                        <code style={{ fontSize: "11px" }}>{sub.paymentReference}</code>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "11px" }}>—</span>
                      )}
                    </td>
                    <td>
                      {sub.invoiceNumber ? (
                        <code style={{ fontSize: "11px" }}>{sub.invoiceNumber}</code>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "11px" }}>—</span>
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap", fontSize: "12px" }}>
                      {formatDate(sub.currentPeriodStart)} – {formatDate(sub.currentPeriodEnd)}
                    </td>
                    <td>
                      <StatusBadge value={sub.status} />
                    </td>
                    <td>
                      <Button
                        variant="secondary"
                        style={{ padding: "4px 8px", fontSize: "12px" }}
                        onClick={() => handleOpenDetail(subId)}
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderTop: "1px solid #e2e8f0" }}>
              <Button
                variant="secondary"
                disabled={offset === 0}
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              >
                Previous
              </Button>
              <span style={{ fontSize: "13px", color: "#64788b" }}>
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Subscription Detail Modal */}
      {selectedSubId && (
        <Modal
          open={true}
          title={`Subscription Details: ${selectedSubId}`}
          onClose={handleCloseDetail}
        >
          <div style={{ maxHeight: "75vh", overflowY: "auto", padding: "16px 0", display: "flex", flexDirection: "column", gap: "20px" }}>
            {detailLoading ? (
              <LoadingState label="Loading detailed subscription audit record…" />
            ) : detailError ? (
              <ErrorState detail={detailError} />
            ) : detailData ? (
              <>
                {/* Header Summary Box */}
                <div className={styles.statementHeaderBox}>
                  <div>
                    <div style={{ fontSize: "12px", color: "#64788b", textTransform: "uppercase", fontWeight: 700 }}>
                      Subscriber Overview
                    </div>
                    <h2 style={{ margin: "4px 0 8px", color: "#173654" }}>
                      {detailData.subscriberName || "Unknown Subscriber"}
                    </h2>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span className={detailData.subscriberType === "CLINIC" ? styles.badgeInflow : styles.badgeOutflow}>
                        {detailData.subscriberType === "CLINIC" ? "Clinic" : "Doctor"}
                      </span>
                      <StatusBadge value={detailData.status} />
                      <span style={{ fontSize: "12px", color: "#64788b" }}>
                        Source: <strong>{detailData.activationSource || "DIRECT_PURCHASE"}</strong>
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className={styles.statementMetaLabel}>Total Fee Paid</div>
                    <div className={styles.statementAmountBig}>
                      {formatMoney(detailData.totalAmountMinor ?? detailData.amountMinor, detailData.currency)}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64788b" }}>
                      Base: {formatMoney(detailData.baseAmountMinor ?? detailData.amountMinor, detailData.currency)} + GST: {formatMoney(detailData.gstAmountMinor ?? "0", detailData.currency)}
                    </div>
                  </div>
                </div>

                {/* Persisted Metadata Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div>
                    <div className={styles.statementMetaLabel}>Product</div>
                    <div style={{ fontWeight: 600 }}>{detailData.productName || detailData.productKey}</div>
                    <code style={{ fontSize: "11px" }}>{detailData.productKey}</code>
                  </div>
                  <div>
                    <div className={styles.statementMetaLabel}>Plan & Version</div>
                    <div style={{ fontWeight: 600 }}>{detailData.planName || detailData.planCode}</div>
                    <div style={{ fontSize: "12px", color: "#64788b" }}>Version {detailData.planVersion ?? 1} ({detailData.billingCadence || detailData.billingCycle})</div>
                  </div>
                  <div>
                    <div className={styles.statementMetaLabel}>Active Period</div>
                    <div style={{ fontSize: "13px", fontWeight: 600 }}>
                      {formatDate(detailData.currentPeriodStart)} – {formatDate(detailData.currentPeriodEnd)}
                    </div>
                    {detailData.graceEndsAt && (
                      <div style={{ fontSize: "11px", color: "#f59e0b" }}>
                        Grace until: {formatDate(detailData.graceEndsAt)}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className={styles.statementMetaLabel}>Payment & Invoice</div>
                    <div style={{ fontSize: "12px" }}>
                      Ref: <code>{detailData.paymentReference || "—"}</code>
                    </div>
                    <div style={{ fontSize: "12px" }}>
                      Invoice: <code>{detailData.invoiceNumber || "—"}</code>
                    </div>
                  </div>
                </div>

                {/* Section 1: Associated Purchases */}
                <div>
                  <h4 style={{ margin: "0 0 8px", color: "#173654" }}>Associated Purchase Records</h4>
                  {!detailData.purchases || detailData.purchases.length === 0 ? (
                    <p style={{ color: "#64788b", fontSize: "13px" }}>No purchase records linked to this subscription.</p>
                  ) : (
                    <DataTable>
                      <thead>
                        <tr>
                          <th>Purchase ID</th>
                          <th>Kind</th>
                          <th>Status</th>
                          <th>Amount</th>
                          <th>Created At</th>
                          <th>Payment ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailData.purchases.map((p) => (
                          <tr key={p.id}>
                            <td><code style={{ fontSize: "11px" }}>{p.id}</code></td>
                            <td>{p.purchaseKind}</td>
                            <td><StatusBadge value={p.status} /></td>
                            <td style={{ fontWeight: 600 }}>{formatMoney(p.amountMinor, p.currency)}</td>
                            <td>{formatDateTime(p.createdAt)}</td>
                            <td>{p.paymentId ? <code style={{ fontSize: "11px" }}>{p.paymentId}</code> : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </DataTable>
                  )}
                </div>

                {/* Section 2: Lifecycle Events */}
                <div>
                  <h4 style={{ margin: "0 0 8px", color: "#173654" }}>Lifecycle & Status History</h4>
                  {!detailData.lifecycleEvents || detailData.lifecycleEvents.length === 0 ? (
                    <p style={{ color: "#64788b", fontSize: "13px" }}>No lifecycle events recorded for this subscription.</p>
                  ) : (
                    <DataTable>
                      <thead>
                        <tr>
                          <th>Event ID</th>
                          <th>Event Type</th>
                          <th>Occurred At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailData.lifecycleEvents.map((e) => (
                          <tr key={e.id}>
                            <td><code style={{ fontSize: "11px" }}>{e.id}</code></td>
                            <td><strong>{e.eventType}</strong></td>
                            <td>{formatDateTime(e.occurredAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </DataTable>
                  )}
                </div>

                {/* Section 3: Ledger Transactions */}
                <div>
                  <h4 style={{ margin: "0 0 8px", color: "#173654" }}>Double-Entry Ledger Transactions</h4>
                  {!detailData.ledgerTransactions || detailData.ledgerTransactions.length === 0 ? (
                    <p style={{ color: "#64788b", fontSize: "13px" }}>No ledger transactions recorded.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {detailData.ledgerTransactions.map((tx) => (
                        <div key={tx.id} style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                            <div>
                              <strong style={{ fontSize: "13px" }}>Tx: </strong>
                              <code style={{ fontSize: "11px" }}>{tx.id}</code>
                              <span style={{ marginLeft: "8px", fontSize: "12px", color: "#64788b" }}>
                                {tx.description}
                              </span>
                            </div>
                            <div>
                              <StatusBadge value={tx.status} />
                              <span style={{ marginLeft: "8px", fontSize: "11px", color: "#64788b" }}>
                                {formatDateTime(tx.postedAt)}
                              </span>
                            </div>
                          </div>
                          {tx.entries && tx.entries.length > 0 && (
                            <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                              <thead>
                                <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                                  <th style={{ padding: "4px 8px" }}>Account Code</th>
                                  <th style={{ padding: "4px 8px" }}>Direction</th>
                                  <th style={{ padding: "4px 8px", textAlign: "right" }}>Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tx.entries.map((entry, idx) => (
                                  <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td style={{ padding: "4px 8px" }}><code>{entry.accountCode}</code></td>
                                    <td style={{ padding: "4px 8px" }}>
                                      <span style={{ fontWeight: 700, color: entry.direction === "DEBIT" ? "#0369a1" : "#059669" }}>
                                        {entry.direction}
                                      </span>
                                    </td>
                                    <td style={{ padding: "4px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                      {formatMoney(entry.amountMinor)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </Modal>
      )}
    </div>
  );
}
