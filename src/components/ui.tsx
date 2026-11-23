"use client";

import { useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "quiet" | "danger" }) { return <button className={`button button--${variant} ${className}`} {...props} />; }
export function Input(props: InputHTMLAttributes<HTMLInputElement>) { return <input className="input" {...props} />; }

export function PasswordInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-input-wrapper">
      <input
        className={`input password-input ${className}`}
        type={visible ? "text" : "password"}
        {...props}
      />
      <button
        type="button"
        className="password-toggle-btn"
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
      >
        {visible ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) { return <select className="input" {...props} />; }
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) { return <section className={`card ${className}`}>{children}</section>; }
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }) { return <span className={`badge badge--${tone}`}>{children}</span>; }
export function statusTone(status: string | null | undefined): "neutral" | "success" | "warning" | "danger" { if (!status) return "neutral"; if (["ACTIVE", "ACCEPTED", "APPROVED", "VERIFIED", "PUBLISHED", "COMPLETED"].includes(status)) return "success"; if (["REVOKED", "REJECTED", "EXPIRED", "REMOVED", "SUSPENDED", "DEACTIVATED", "CANCELLED"].includes(status)) return "danger"; if (["PENDING", "INVITED", "DRAFT", "NOT_READY", "NOT_SUBMITTED"].includes(status)) return "warning"; return "neutral"; }
export function StatusBadge({ value }: { value: string | null | undefined }) { return <Badge tone={statusTone(value)}>{value ?? "Not available"}</Badge>; }
export function Alert({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" }) { return <p className={`alert alert--${tone}`} role="alert">{children}</p>; }
export function LoadingState({ label = "Loading..." }: { label?: string }) { return <p className="loading" role="status"><span aria-hidden="true" />{label}</p>; }
export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) { return <div className="empty-state"><strong>{title}</strong><span>{detail}</span>{action ? <div>{action}</div> : null}</div>; }
export function ErrorState({ detail }: { detail: string }) { return <Alert tone="error">{detail}</Alert>; }
export function Breadcrumbs({ items }: { items: string[] }) { return <nav className="breadcrumbs" aria-label="Breadcrumb">{items.map((item, index) => <span key={`${item}-${index}`}>{index ? " / " : ""}{item}</span>)}</nav>; }
export function PageHeader({ eyebrow, title, description, action, children }: { eyebrow?: string; title: string; description: string; action?: ReactNode; children?: ReactNode }) { return <div className="page-header"><div><p className="eyebrow">{eyebrow ?? "Platform Admin"}</p><h1>{title}</h1><p>{description}</p></div>{action ? <div className="page-header-action">{action}</div> : null}{children ? <div className="page-header-controls">{children}</div> : null}</div>; }
export function Search({ label = "Search", ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) { return <label className="search"><span className="sr-only">{label}</span><Input placeholder={label} type="search" {...props} /></label>; }
export function Filters({ children }: { children: ReactNode }) { return <div className="filters">{children}</div>; }

export function FilterBar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`filter-bar-container ${className}`}>{children}</div>;
}

export function FilterGroup({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="filter-group">
      {label ? <span className="filter-group-label">{label}</span> : null}
      <div className="filter-group-controls">{children}</div>
    </div>
  );
}

export function FinancialKpiCard({
  label,
  value,
  subtext,
  variant = "default",
  trend,
  icon,
}: {
  label: string;
  value: string;
  subtext?: string;
  variant?: "default" | "revenue" | "payable" | "paid" | "info";
  trend?: { direction: "up" | "down" | "neutral"; label: string };
  icon?: ReactNode;
}) {
  return (
    <div className={`enterprise-kpi-card enterprise-kpi-card--${variant}`}>
      <div className="kpi-header">
        <span className="kpi-label">{label}</span>
        {icon ? <span className="kpi-icon-wrap">{icon}</span> : null}
      </div>
      <div className="kpi-value-row">
        <span className="kpi-main-value">{value}</span>
        {trend ? (
          <span className={`kpi-trend kpi-trend--${trend.direction}`}>
            {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "•"} {trend.label}
          </span>
        ) : null}
      </div>
      {subtext ? <p className="kpi-subtext">{subtext}</p> : null}
    </div>
  );
}

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
  formatted?: string;
}

export function AnalyticsDonutChart({
  title,
  segments,
  size = 180,
  strokeWidth = 24,
}: {
  title: string;
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const arcs = segments.reduce<Array<DonutSegment & { strokeDasharray: string; strokeDashoffset: number; fraction: number; index: number; accumulatedFraction: number }>>((acc, seg, idx) => {
    const val = Math.max(0, seg.value);
    const fraction = total > 0 ? val / total : 0;
    const prevAccumulated = acc.length > 0 ? acc[acc.length - 1].accumulatedFraction : 0;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -prevAccumulated * circumference;
    acc.push({
      ...seg,
      strokeDasharray,
      strokeDashoffset,
      fraction,
      index: idx,
      accumulatedFraction: prevAccumulated + fraction,
    });
    return acc;
  }, []);

  return (
    <div className="chart-card">
      <h3 className="chart-title">{title}</h3>
      <div className="donut-chart-layout">
        <div className="donut-svg-wrap" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={strokeWidth}
            />
            {total > 0 &&
              arcs.map((arc) => (
                <circle
                  key={arc.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={hoveredIndex === arc.index ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={arc.strokeDasharray}
                  strokeDashoffset={arc.strokeDashoffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  style={{ transition: "stroke-width 0.2s ease, opacity 0.2s ease", cursor: "pointer", opacity: hoveredIndex !== null && hoveredIndex !== arc.index ? 0.45 : 1 }}
                  onMouseEnter={() => setHoveredIndex(arc.index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              ))}
          </svg>
          <div className="donut-center-label">
            {hoveredIndex !== null ? (
              <>
                <strong style={{ fontSize: "14px", color: segments[hoveredIndex].color }}>
                  {Math.round(arcs[hoveredIndex].fraction * 100)}%
                </strong>
                <small style={{ fontSize: "11px", color: "#64748b" }}>{segments[hoveredIndex].label}</small>
              </>
            ) : (
              <>
                <strong style={{ fontSize: "15px", color: "#0f172a" }}>
                  {total > 0 ? "100%" : "No data"}
                </strong>
                <small style={{ fontSize: "11px", color: "#64748b" }}>Total</small>
              </>
            )}
          </div>
        </div>
        <div className="donut-legend">
          {segments.map((seg, idx) => (
            <div
              key={seg.label}
              className={`donut-legend-item ${hoveredIndex === idx ? "legend-hover" : ""}`}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <span className="donut-legend-dot" style={{ backgroundColor: seg.color }} />
              <div className="donut-legend-text">
                <span className="donut-legend-label">{seg.label}</span>
                <span className="donut-legend-val">
                  {seg.formatted ?? seg.value} {total > 0 ? `(${Math.round((Math.max(0, seg.value) / total) * 100)}%)` : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AnalyticsBarChart({
  title,
  bars,
}: {
  title: string;
  bars: { label: string; value: number; formatted: string; color: string; sublabel?: string }[];
}) {
  const maxValue = Math.max(...bars.map((b) => b.value), 1);

  return (
    <div className="chart-card">
      <h3 className="chart-title">{title}</h3>
      <div className="bar-chart-list">
        {bars.map((bar) => {
          const percentage = Math.min(100, Math.max(0, (bar.value / maxValue) * 100));
          return (
            <div key={bar.label} className="bar-chart-row">
              <div className="bar-chart-header">
                <span className="bar-chart-label">{bar.label}</span>
                <span className="bar-chart-val">{bar.formatted}</span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: bar.color,
                  }}
                />
              </div>
              {bar.sublabel ? <small className="bar-chart-sublabel">{bar.sublabel}</small> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AnalyticsProgressPipeline({
  title,
  steps,
}: {
  title: string;
  steps: { label: string; formatted: string; count?: number; color: string; status: "completed" | "active" | "pending" }[];
}) {
  return (
    <div className="pipeline-card">
      <h3 className="chart-title">{title}</h3>
      <div className="pipeline-steps">
        {steps.map((step, idx) => (
          <div key={step.label} className={`pipeline-step pipeline-step--${step.status}`}>
            <div className="pipeline-marker" style={{ backgroundColor: step.color }}>
              <span>{idx + 1}</span>
            </div>
            <div className="pipeline-info">
              <span className="pipeline-label">{step.label}</span>
              <strong className="pipeline-amount">{step.formatted}</strong>
              {step.count !== undefined ? <small className="pipeline-count">{step.count} items</small> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export function Pagination({ current = 1, total = 1 }: { current?: number; total?: number }) { return <p className="pagination">Page {current} of {total}</p>; }
export function DatePicker(props: InputHTMLAttributes<HTMLInputElement>) { return <Input type="date" {...props} />; }
export function Dropdown({ label, children }: { label: string; children: ReactNode }) { return <details className="dropdown"><summary>{label}</summary><div>{children}</div></details>; }
export function Tabs({ items, active, onChange }: { items: readonly { id: string; label: string }[]; active: string; onChange: (id: string) => void }) { return <div className="tabs" role="tablist">{items.map((item) => <button key={item.id} type="button" role="tab" aria-selected={active === item.id} className={active === item.id ? "tab tab--active" : "tab"} onClick={() => onChange(item.id)}>{item.label}</button>)}</div>; }
export function DataTable({ children, className = "" }: { children: ReactNode; className?: string }) { return <div className={`table-scroll ${className}`}><table>{children}</table></div>; }
export function StepIndicator({ steps, current }: { steps: readonly string[]; current: number }) { return <ol className="steps">{steps.map((step, index) => <li key={step} className={index === current ? "step step--active" : index < current ? "step step--complete" : "step"}><span>{index + 1}</span>{step}</li>)}</ol>; }
export function Modal({ open, title, children, onClose, className = "" }: { open: boolean; title: string; children: ReactNode; onClose: () => void; className?: string }) { return open ? <div className="modal-backdrop" role="presentation"><section className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title}><header><strong>{title}</strong><Button variant="quiet" onClick={onClose} aria-label="Close">Close</Button></header>{children}</section></div> : null; }
export type DrawerProps = {
  open: boolean;
  children: ReactNode;
  onClose: () => void;
  title?: string;
  placement?: "left" | "right";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

export function Drawer({
  open,
  children,
  onClose,
  title,
  placement = "right",
  size = "md",
  className = "",
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", closeOnEscape); };
  }, [onClose, open]);

  if (!open) return null;

  const headerTitle = title ?? (placement === "left" ? "Menu" : "Details");
  const isLeft = placement === "left";

  return (
    <div
      className={`drawer-backdrop ${isLeft ? "drawer-backdrop--left" : "drawer-backdrop--right"}`}
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <aside
        className={`drawer ${isLeft ? "drawer--left" : "drawer--right drawer--panel"} drawer--size-${size} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={headerTitle}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="drawer-header">
          <strong className="drawer-title">{headerTitle}</strong>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label={`Close ${headerTitle}`}
            autoFocus
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }} aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
            <span className="sr-only">Close</span>
          </button>
        </header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  );
}
export function Toast({ message }: { message: string | null }) { return message ? <p className="toast" role="status">{message}</p> : null; }
export function ConfirmationDialog({ open, onConfirm, onClose, children }: { open: boolean; onConfirm: () => void; onClose: () => void; children: ReactNode }) { return <Modal open={open} title="Confirm action" onClose={onClose}><p>{children}</p><div className="dialog-actions"><Button onClick={onConfirm}>Confirm</Button><Button variant="secondary" onClick={onClose}>Cancel</Button></div></Modal>; }
export function useToast() { const [message, setMessage] = useState<string | null>(null); useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(null), 3000); return () => window.clearTimeout(timer); }, [message]); return { message, show: setMessage }; }
