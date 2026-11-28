"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createSubscriptionCoupon,
  disableSubscriptionCoupon,
  enableSubscriptionCoupon,
  listSubscriptionCoupons,
  updateSubscriptionCoupon,
  type SubscriptionCoupon,
  type SubscriptionPlan,
} from "../lib/platform-api/platform-admin";
import { Alert, Button, Card, DataTable, EmptyState, ErrorState, Input, LoadingState, Modal, Select, StatusBadge } from "./ui";

function formatMinor(value: string, currency = "INR") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(BigInt(value)) / 100);
  } catch {
    return value;
  }
}

export function SubscriptionCouponManagement({
  plans,
  onToast,
}: {
  plans: SubscriptionPlan[];
  onToast: (msg: string) => void;
}) {
  const [coupons, setCoupons] = useState<SubscriptionCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionCoupon | null>(null);

  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState("20");
  const [subjectKindScope, setSubjectKindScope] = useState<"BOTH" | "CLINIC" | "DOCTOR">("BOTH");
  const [minPurchaseInr, setMinPurchaseInr] = useState("0");
  const [maxTotalRedemptions, setMaxTotalRedemptions] = useState("");
  const [maxRedemptionsPerProvider, setMaxRedemptionsPerProvider] = useState("1");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listSubscriptionCoupons();
      setCoupons(res.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load subscription coupons.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setCode("");
    setDescription("");
    setDiscountType("PERCENTAGE");
    setDiscountValue("20");
    setSubjectKindScope("BOTH");
    setMinPurchaseInr("0");
    setMaxTotalRedemptions("");
    setMaxRedemptionsPerProvider("1");
    setValidFrom(new Date().toISOString().slice(0, 16));
    setValidUntil("");
    setSelectedPlanIds([]);
    setModalOpen(true);
  };

  const openEdit = (c: SubscriptionCoupon) => {
    setEditing(c);
    setCode(c.code);
    setDescription(c.description ?? "");
    setDiscountType(c.discountType);
    setDiscountValue(
      String(Number(BigInt(c.discountValue)) / 100),
    );
    setSubjectKindScope(c.subjectKindScope);
    setMinPurchaseInr(String(Number(BigInt(c.minPurchaseAmountMinor)) / 100));
    setMaxTotalRedemptions(c.maxTotalRedemptions !== null ? String(c.maxTotalRedemptions) : "");
    setMaxRedemptionsPerProvider(c.maxRedemptionsPerProvider !== null ? String(c.maxRedemptionsPerProvider) : "");
    setValidFrom(c.validFrom ? c.validFrom.slice(0, 16) : "");
    setValidUntil(c.validUntil ? c.validUntil.slice(0, 16) : "");
    setSelectedPlanIds(c.appliesToAllPlans ? [] : c.planIds ?? []);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setError(null);
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode || trimmedCode.length < 3) {
      setError("Coupon code must be at least 3 characters.");
      return;
    }
    const rawDiscount = Number(discountValue);
    if (!Number.isFinite(rawDiscount) || rawDiscount <= 0 || (discountType === "PERCENTAGE" && rawDiscount > 100)) {
      setError(
        discountType === "PERCENTAGE"
          ? "Percentage discount must be between 1 and 100."
          : "Discount amount must be greater than zero.",
      );
      return;
    }
    const discountPayload = Math.round(rawDiscount * 100).toString();
    const minMinor = Math.max(0, Math.round((Number(minPurchaseInr) || 0) * 100)).toString();
    const effectiveValidFrom = validFrom ? new Date(validFrom).toISOString() : new Date().toISOString();

    setBusyId(editing ? editing.id : "new");
    try {
      const payload = {
        description: description.trim() || null,
        discountType,
        discountValue: discountPayload,
        currency: "INR",
        subjectKindScope,
        appliesToAllPlans: selectedPlanIds.length === 0,
        planIds: selectedPlanIds,
        minPurchaseAmountMinor: minMinor,
        maxTotalRedemptions: maxTotalRedemptions.trim() ? Number(maxTotalRedemptions) : null,
        maxRedemptionsPerProvider: maxRedemptionsPerProvider.trim() ? Number(maxRedemptionsPerProvider) : null,
        validFrom: effectiveValidFrom,
        validUntil: validUntil ? new Date(validUntil).toISOString() : null,
      };
      if (editing) {
        await updateSubscriptionCoupon(editing.id, payload);
        onToast(`Coupon ${trimmedCode} updated.`);
      } else {
        await createSubscriptionCoupon({ code: trimmedCode, ...payload, enabled: true });
        onToast(`Coupon ${trimmedCode} created.`);
      }
      setModalOpen(false);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save coupon.");
    } finally {
      setBusyId(null);
    }
  };

  const toggleEnabled = async (c: SubscriptionCoupon) => {
    setBusyId(c.id);
    setError(null);
    try {
      if (c.enabled) {
        await disableSubscriptionCoupon(c.id);
        onToast(`Coupon ${c.code} disabled.`);
      } else {
        await enableSubscriptionCoupon(c.id);
        onToast(`Coupon ${c.code} enabled.`);
      }
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not toggle coupon.");
    } finally {
      setBusyId(null);
    }
  };

  const togglePlan = (planId: string) => {
    setSelectedPlanIds((prev) =>
      prev.includes(planId) ? prev.filter((id) => id !== planId) : [...prev, planId],
    );
  };

  if (loading) return <LoadingState label="Loading subscription coupons…" />;

  return (
    <div className="stack">
      {error ? <ErrorState detail={error} /> : null}
      <Card>
        <div className="card-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
          <div>
            <h2>Subscription coupons &amp; promotional waivers</h2>
            <p>
              Server-validated discounts applied before Razorpay checkout. Supports percentage (including 100% zero-payment waivers without creating a Razorpay order) or fixed INR discounts, total/per-provider limits, minimum order rules, and plan or Clinic/Doctor scope restrictions.
            </p>
          </div>
          <Button onClick={openCreate}>Create coupon</Button>
        </div>

        {coupons.length === 0 ? (
          <EmptyState
            title="No subscription coupons"
            detail="Create promotional or 100% onboarding waiver coupons for Clinics or Doctors."
            action={<Button onClick={openCreate}>Create coupon</Button>}
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Audience &amp; Plans</th>
                <th>Min Purchase</th>
                <th>Usage</th>
                <th>Validity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td>
                    <code><strong>{c.code}</strong></code>
                    {c.description ? <div style={{ fontSize: "12px", color: "#64748b" }}>{c.description}</div> : null}
                  </td>
                  <td>
                    {c.discountType === "PERCENTAGE"
                      ? `${Number(c.discountValue) / 100}% off${Number(c.discountValue) === 10000 ? " (Free / No Gateway)" : ""}`
                      : `${formatMinor(c.discountValue, c.currency || "INR")} off`}
                  </td>
                  <td>
                    <div>{c.subjectKindScope === "BOTH" ? "Clinics & Doctors" : c.subjectKindScope === "CLINIC" ? "Clinics only" : "Doctors only"}</div>
                    <small style={{ color: "#64748b" }}>
                      {c.appliesToAllPlans || c.planIds.length === 0 ? "All matching plans" : `${c.planIds.length} plan(s)`}
                    </small>
                  </td>
                  <td>{formatMinor(c.minPurchaseAmountMinor, c.currency || "INR")}</td>
                  <td>
                    {c.totalApplied} applied ({c.totalReservedOrApplied} reserved/applied) / {c.maxTotalRedemptions ?? "∞"}
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      Per provider: {c.maxRedemptionsPerProvider ?? "∞"}
                    </div>
                  </td>
                  <td style={{ fontSize: "12px" }}>
                    {new Date(c.validFrom).toLocaleDateString()} –{" "}
                    {c.validUntil ? new Date(c.validUntil).toLocaleDateString() : "No expiry"}
                  </td>
                  <td>
                    <StatusBadge value={c.enabled ? "ACTIVE" : "DISABLED"} />
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <Button variant="secondary" onClick={() => openEdit(c)} disabled={busyId === c.id}>
                        Edit
                      </Button>
                      <Button variant="secondary" onClick={() => void toggleEnabled(c)} disabled={busyId === c.id}>
                        {c.enabled ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? `Edit coupon ${editing.code}` : "Create subscription coupon"}
        onClose={() => !busyId && setModalOpen(false)}
      >
        <div className="form-grid">
          <label>
            Coupon Code
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="LAUNCH100"
              disabled={Boolean(editing) || Boolean(busyId)}
            />
          </label>
          <label>
            Description
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Launch 100% onboarding waiver"
              disabled={Boolean(busyId)}
            />
          </label>
          <label>
            Discount Type
            <Select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as "PERCENTAGE" | "FIXED")}
              disabled={Boolean(busyId)}
            >
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED">Fixed Amount (INR)</option>
            </Select>
          </label>
          <label>
            {discountType === "PERCENTAGE" ? "Percentage (1 – 100)" : "Fixed Discount (INR)"}
            <Input
              type="number"
              min={1}
              max={discountType === "PERCENTAGE" ? 100 : undefined}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              disabled={Boolean(busyId)}
            />
          </label>
          <label>
            Applicable Provider Type
            <Select
              value={subjectKindScope}
              onChange={(e) => setSubjectKindScope(e.target.value as "BOTH" | "CLINIC" | "DOCTOR")}
              disabled={Boolean(busyId)}
            >
              <option value="BOTH">Both Clinics &amp; Doctors</option>
              <option value="CLINIC">Clinics only</option>
              <option value="DOCTOR">Individual Doctors only</option>
            </Select>
          </label>
          <label>
            Minimum Purchase (INR)
            <Input
              type="number"
              min={0}
              value={minPurchaseInr}
              onChange={(e) => setMinPurchaseInr(e.target.value)}
              disabled={Boolean(busyId)}
            />
          </label>
          <label>
            Total Redemption Limit (blank = unlimited)
            <Input
              type="number"
              min={1}
              value={maxTotalRedemptions}
              onChange={(e) => setMaxTotalRedemptions(e.target.value)}
              placeholder="Unlimited"
              disabled={Boolean(busyId)}
            />
          </label>
          <label>
            Per-Provider Limit (blank = unlimited)
            <Input
              type="number"
              min={1}
              value={maxRedemptionsPerProvider}
              onChange={(e) => setMaxRedemptionsPerProvider(e.target.value)}
              placeholder="1"
              disabled={Boolean(busyId)}
            />
          </label>
          <label>
            Valid From
            <Input
              type="datetime-local"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              disabled={Boolean(busyId)}
            />
          </label>
          <label>
            Valid Until (optional)
            <Input
              type="datetime-local"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              disabled={Boolean(busyId)}
            />
          </label>
        </div>

        <div style={{ marginTop: "12px" }}>
          <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>
            Restrict to Specific Plans (leave unchecked for all applicable plans):
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {plans
              .filter((p) => subjectKindScope === "BOTH" || (p.subjectKind ?? "CLINIC") === subjectKindScope)
              .map((p) => (
                <label
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 8px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedPlanIds.includes(p.id)}
                    onChange={() => togglePlan(p.id)}
                    disabled={Boolean(busyId)}
                  />
                  {p.displayName} ({p.subjectKind ?? "CLINIC"})
                </label>
              ))}
          </div>
        </div>

        {discountType === "PERCENTAGE" && Number(discountValue) === 100 ? (
          <Alert>100% discount coupons activate paid subscriptions immediately without creating a Razorpay order.</Alert>
        ) : null}

        <div className="dialog-actions" style={{ marginTop: "16px" }}>
          <Button onClick={() => void handleSave()} disabled={Boolean(busyId)}>
            {busyId ? "Saving…" : editing ? "Save changes" : "Create coupon"}
          </Button>
          <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={Boolean(busyId)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
