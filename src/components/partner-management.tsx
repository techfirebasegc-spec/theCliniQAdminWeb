"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createPlatformPartner,
  deletePlatformPartner,
  listPlatformPartners,
  publishPlatformPartner,
  unpublishPlatformPartner,
  updatePlatformPartner,
  type PlatformPartner,
  type PlatformPartnerInput,
} from "../lib/platform-api/platform-admin";
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  PageHeader,
  Select,
  useToast,
} from "./ui";

export function PartnerManagement() {
  const [partners, setPartners] = useState<PlatformPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Create / Edit Modal State
  const [editingPartner, setEditingPartner] = useState<PlatformPartner | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Healthcare Partner");
  const [formLogoUrl, setFormLogoUrl] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formWebsiteUrl, setFormWebsiteUrl] = useState("");
  const [formDisplayOrder, setFormDisplayOrder] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const toast = useToast();

  const loadPartners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listPlatformPartners();
      setPartners(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load partners");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadPartners);
  }, [loadPartners]);

  const openCreateModal = () => {
    setEditingPartner(null);
    setFormName("");
    setFormCategory("Hospital & Healthcare Network");
    setFormLogoUrl("");
    setFormDescription("");
    setFormWebsiteUrl("");
    setFormDisplayOrder(partners.length + 1);
    setIsCreating(true);
  };

  const openEditModal = (p: PlatformPartner) => {
    setEditingPartner(p);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormLogoUrl(p.logoUrl ?? "");
    setFormDescription(p.description);
    setFormWebsiteUrl(p.websiteUrl ?? "");
    setFormDisplayOrder(p.displayOrder);
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formDescription.trim()) {
      toast.show("Partner Name and Description are required.");
      return;
    }
    setSubmitting(true);
    try {
      const input: PlatformPartnerInput = {
        name: formName.trim(),
        category: formCategory.trim(),
        logoUrl: formLogoUrl.trim() || null,
        description: formDescription.trim(),
        websiteUrl: formWebsiteUrl.trim() || null,
        displayOrder: Number(formDisplayOrder) || 0,
      };

      if (editingPartner) {
        await updatePlatformPartner(editingPartner.id, input);
        toast.show("Partner record updated.");
      } else {
        await createPlatformPartner(input);
        toast.show("New partner created.");
      }
      setIsCreating(false);
      void loadPartners();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to save partner");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (p: PlatformPartner) => {
    try {
      if (p.isPublished) {
        await unpublishPlatformPartner(p.id);
        toast.show(`Unpublished ${p.name}. It is no longer visible to the public.`);
      } else {
        await publishPlatformPartner(p.id);
        toast.show(`Published ${p.name}. It is now live in the Patient Web Partners Directory.`);
      }
      void loadPartners();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to toggle publication");
    }
  };

  const handleDelete = async (p: PlatformPartner) => {
    if (!confirm(`Are you sure you want to remove "${p.name}"?`)) return;
    try {
      await deletePlatformPartner(p.id);
      toast.show(`Removed partner ${p.name}.`);
      void loadPartners();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to remove partner");
    }
  };

  const filteredPartners = partners.filter((p) => {
    if (statusFilter !== "ALL") {
      if (statusFilter === "PUBLISHED" && !p.isPublished) return false;
      if (statusFilter === "DRAFT" && p.isPublished) return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  });

  const publishedCount = partners.filter((p) => p.isPublished).length;
  const draftCount = partners.length - publishedCount;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 48 }}>
      <PageHeader
        eyebrow="Business Development"
        title="Partner Management"
        description="Curate and govern accredited partner organisations, hospitals, and diagnostic centres published on the Patient Web."
        action={
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="secondary" onClick={loadPartners} disabled={loading}>
              Refresh
            </Button>
            <Button variant="primary" onClick={openCreateModal}>
              + Add Partner
            </Button>
          </div>
        }
      />

      {toast.message && (
        <div className="alert alert--info" role="status">
          {toast.message}
        </div>
      )}

      {/* Overview Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <Card>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted, #64748b)" }}>Total Partners</p>
          <h3 style={{ margin: "6px 0 0", fontSize: 28, fontWeight: 700 }}>{partners.length}</h3>
        </Card>
        <Card>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted, #64748b)" }}>Published Live</p>
          <h3 style={{ margin: "6px 0 0", fontSize: 28, fontWeight: 700, color: "var(--success, #16a34a)" }}>
            {publishedCount}
          </h3>
        </Card>
        <Card>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted, #64748b)" }}>Draft / Hidden</p>
          <h3 style={{ margin: "6px 0 0", fontSize: 28, fontWeight: 700, color: "var(--warning, #d97706)" }}>
            {draftCount}
          </h3>
        </Card>
      </div>

      {/* Filter and Table Card */}
      <Card>
        <div style={{ padding: 16, borderBottom: "1px solid var(--border-color, #e2e8f0)", display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", flex: 1 }}>
            <Input
              placeholder="Search by partner name, category, or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 360 }}
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: 160 }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published Only</option>
              <option value="DRAFT">Draft Only</option>
            </Select>
          </div>
          <span style={{ fontSize: 13, color: "var(--text-muted, #64748b)" }}>
            Showing {filteredPartners.length} of {partners.length} partners
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 48 }}>
            <LoadingState label="Loading partner directory…" />
          </div>
        ) : error ? (
          <div style={{ padding: 32 }}>
            <ErrorState detail={error} />
          </div>
        ) : filteredPartners.length === 0 ? (
          <div style={{ padding: 48 }}>
            <EmptyState
              title="No partners found"
              detail={
                search || statusFilter !== "ALL"
                  ? "No partner records match your active filters. Try resetting search."
                  : "No partners have been registered yet. Click '+ Add Partner' to create the first published partner."
              }
              action={
                search || statusFilter !== "ALL" ? (
                  <Button variant="secondary" onClick={() => { setSearch(""); setStatusFilter("ALL"); }}>
                    Reset Filters
                  </Button>
                ) : (
                  <Button variant="primary" onClick={openCreateModal}>
                    + Add Partner
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "var(--table-header-bg, #f8fafc)", borderBottom: "1px solid var(--border-color, #e2e8f0)" }}>
                  <th style={{ padding: "12px 16px" }}>Order</th>
                  <th style={{ padding: "12px 16px" }}>Partner</th>
                  <th style={{ padding: "12px 16px" }}>Category</th>
                  <th style={{ padding: "12px 16px" }}>Website</th>
                  <th style={{ padding: "12px 16px" }}>Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPartners.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--border-color, #f1f5f9)" }}>
                    <td style={{ padding: "12px 16px", color: "#64748b", fontWeight: 600 }}>
                      #{p.displayOrder}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {p.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.logoUrl}
                            alt=""
                            style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", border: "1px solid #e2e8f0" }}
                          />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: 6, background: "#e0f2fe", color: "#0369a1", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                            {p.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <strong style={{ display: "block" }}>{p.name}</strong>
                          <span style={{ fontSize: 12, color: "var(--text-muted, #64748b)", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden", maxWidth: 300 }}>
                            {p.description}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 12, background: "#f1f5f9", padding: "3px 8px", borderRadius: 4, color: "#334155" }}>
                        {p.category}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {p.websiteUrl ? (
                        <a
                          href={p.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "var(--primary, #0284c7)", textDecoration: "none", fontSize: 13 }}
                        >
                          Visit ↗
                        </a>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: 13 }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <Badge tone={p.isPublished ? "success" : "neutral"}>
                        {p.isPublished ? "PUBLISHED" : "DRAFT"}
                      </Badge>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <Button
                          variant="quiet"
                          onClick={() => handleTogglePublish(p)}
                        >
                          {p.isPublished ? "Unpublish" : "Publish"}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => openEditModal(p)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => handleDelete(p)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create / Edit Drawer */}
      <Drawer
        open={isCreating}
        onClose={() => setIsCreating(false)}
        title={editingPartner ? `Edit Partner — ${editingPartner.name}` : "Add Accredited Partner"}
        placement="right"
        size="md"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.15)", paddingBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#ffffff" }}>
              {editingPartner ? `Edit Partner: ${editingPartner.name}` : "Add New Partner"}
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#cbd5e1" }}>
              Provide organization profile information for public display in Patient Web.
            </p>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#ffffff" }}>
              Partner Name *
            </label>
            <Input
              placeholder="e.g. Apollo Hospitals Network"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#ffffff" }}>
              Category *
            </label>
            <Input
              placeholder="e.g. Hospital & Healthcare Network, Diagnostics & Pathology"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#ffffff" }}>
              Logo / Image URL
            </label>
            <Input
              placeholder="https://..."
              value={formLogoUrl}
              onChange={(e) => setFormLogoUrl(e.target.value)}
            />
            {formLogoUrl && (
              <div style={{ marginTop: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={formLogoUrl}
                  alt="Preview"
                  style={{ maxHeight: 60, borderRadius: 6, border: "1px solid #e2e8f0" }}
                  onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                />
              </div>
            )}
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#ffffff" }}>
              Website URL
            </label>
            <Input
              placeholder="https://www.example.com"
              value={formWebsiteUrl}
              onChange={(e) => setFormWebsiteUrl(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#ffffff" }}>
              Display Order Priority
            </label>
            <Input
              type="number"
              value={formDisplayOrder}
              onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
            />
            <span style={{ fontSize: 12, color: "#94a3b8", display: "block", marginTop: 4 }}>
              Lower numbers appear first on the public directory.
            </span>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#ffffff" }}>
              Description *
            </label>
            <textarea
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                fontSize: 13,
                minHeight: 100,
                fontFamily: "inherit",
                background: "#ffffff",
                color: "#0f172a",
              }}
              placeholder="Brief overview of partnership, multi-speciality offerings, and accredited care standards…"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <Button variant="primary" onClick={handleSave} disabled={submitting}>
              {submitting ? "Saving…" : editingPartner ? "Save Changes" : "Create Partner"}
            </Button>
            <Button variant="secondary" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
