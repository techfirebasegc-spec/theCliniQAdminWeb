"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useAuth } from "../providers/auth-provider";
import { Button, Drawer, Dropdown } from "./ui";
import "./admin-shell.module.css";

type Navigation = { label: string; group: "Platform" | "Organizations" | "Doctors" | "Presentation" | "Financial Operations"; href: string };
const navigation: Navigation[] = [
  { label: "Dashboard", group: "Platform", href: "/platform" },
  { label: "Platform Admins", group: "Platform", href: "/platform/admins/new" },
  { label: "Clinical Catalogue", group: "Platform", href: "/platform/clinical-catalogue" },
  { label: "Prescription access", group: "Platform", href: "/platform/prescription-workflow" },
  { label: "Help Center", group: "Platform", href: "/platform/help" },
  { label: "Presentation", group: "Presentation", href: "/platform/presentation" },
  { label: "Clinics", group: "Organizations", href: "/platform/clinics" },
  { label: "Clinic Owners", group: "Organizations", href: "/platform/owners" },
  { label: "Clinic Applications", group: "Organizations", href: "/platform/clinic-applications" },
  { label: "Invitations", group: "Organizations", href: "/platform/invitations" },
  { label: "Doctors / Verification", group: "Doctors", href: "/platform/doctors" },
  { label: "Professional classifications", group: "Doctors", href: "/platform/professional-classifications" },
  { label: "Clinic-created Doctors", group: "Doctors", href: "/platform/clinic-created-doctors" },
  { label: "Doctor Applications", group: "Doctors", href: "/platform/doctor-applications" },
  { label: "Doctor Invitations", group: "Doctors", href: "/platform/doctors/invitations" },
  { label: "Eligibility", group: "Financial Operations", href: "/platform/financial/eligibility" },
  { label: "Manual Payouts", group: "Financial Operations", href: "/platform/financial/manual-payouts" },
  { label: "Reconciliation", group: "Financial Operations", href: "/platform/financial/reconciliation" },
  { label: "Commercial Rules", group: "Financial Operations", href: "/platform/commercial-rules" },
];

function NavigationList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const groups = ["Platform", "Organizations", "Doctors", "Presentation", "Financial Operations"] as const;
  return <nav className="sidebar-nav" aria-label="Primary navigation">{groups.map((group) => {
    const items = navigation.filter((item) => item.group === group);
    if (!items.length) return null;
    return <div key={group}><p className="nav-group">{group}</p>{items.map((item) => { const active = pathname === item.href || (item.href === "/platform/financial/manual-payouts" && pathname.startsWith(`${item.href}/`)); return <a key={item.label} href={item.href} onClick={onNavigate} className={active ? "nav-item nav-item--active" : "nav-item"}>{item.label}</a>; })}</div>;
  })}</nav>;
}
function Brand({ mobile = false }: { mobile?: boolean }) { return <a className={mobile ? "topbar-brand" : "brand"} href="/platform"><Image src="/brand/thecliniq-logo-compact.png" alt="The CliniQ" width={765} height={309} priority /><span>{mobile ? "Platform" : <><strong>Platform administration</strong><small>Operations workspace</small></>}</span></a>; }
function Sidebar({ drawer = false, onNavigate }: { drawer?: boolean; onNavigate?: () => void }) { return <aside className={drawer ? "sidebar sidebar--drawer" : "sidebar"}><Brand /><NavigationList onNavigate={onNavigate} /><div className="sidebar-footer"><span className="environment-dot" />Platform workspace</div></aside>; }
export function AdminShell({ children }: { children: ReactNode }) { const [menuOpen, setMenuOpen] = useState(false); const { user, logout } = useAuth(); return <div className="admin-shell"><Sidebar /><Drawer open={menuOpen} onClose={() => setMenuOpen(false)}><Sidebar drawer onNavigate={() => setMenuOpen(false)} /></Drawer><div className="workspace"><header className="topbar"><Button variant="quiet" className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><span className="menu-icon" aria-hidden="true" /><span className="sr-only">Open navigation</span></Button><Brand mobile /><div className="workspace-label"><span className="status-dot" />THE CLINIQ PLATFORM</div><div className="topbar-actions"><span className="platform-role">Platform Administrator</span><Dropdown label={user?.email ?? "Account"}><button className="menu-action" onClick={() => void logout()}>Sign out</button></Dropdown></div></header><main className="content">{children}</main></div></div>; }
