"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useAuth } from "../providers/auth-provider";
import { Button, Drawer, Dropdown } from "./ui";

type Navigation = { label: string; group: "Platform" | "Organizations" | "Doctors" | "Presentation" | "Financial Operations"; href: string };
const navigation: Navigation[] = [
  { label: "Dashboard", group: "Platform", href: "/platform" },
  { label: "Platform Admins", group: "Platform", href: "/platform/admins/new" },
  { label: "Presentation", group: "Presentation", href: "/platform/presentation" },
  { label: "Clinics", group: "Organizations", href: "/platform/clinics" },
  { label: "Clinic Owners", group: "Organizations", href: "/platform/owners" },
  { label: "Clinic Applications", group: "Organizations", href: "/platform/clinic-applications" },
  { label: "Invitations", group: "Organizations", href: "/platform/invitations" },
  { label: "Doctors / Verification", group: "Doctors", href: "/platform/doctors" },
  { label: "Clinic-created Doctors", group: "Doctors", href: "/platform/clinic-created-doctors" },
  { label: "Doctor Applications", group: "Doctors", href: "/platform/doctor-applications" },
  { label: "Doctor Invitations", group: "Doctors", href: "/platform/doctors/invitations" },
  { label: "Eligibility", group: "Financial Operations", href: "/platform/financial/eligibility" },
  { label: "Manual Payouts", group: "Financial Operations", href: "/platform/financial/manual-payouts" },
  { label: "Reconciliation", group: "Financial Operations", href: "/platform/financial/reconciliation" },
];

function NavigationList() {
  const pathname = usePathname();
  const groups = ["Platform", "Organizations", "Doctors", "Presentation", "Financial Operations"] as const;
  return <nav className="sidebar-nav" aria-label="Primary navigation">{groups.map((group) => {
    const items = navigation.filter((item) => item.group === group);
    if (!items.length) return null;
    return <div key={group}><p className="nav-group">{group}</p>{items.map((item) => { const active = pathname === item.href || (item.href === "/platform/financial/manual-payouts" && pathname.startsWith(`${item.href}/`)); return <a key={item.label} href={item.href} className={active ? "nav-item nav-item--active" : "nav-item"}>{item.label}</a>; })}</div>;
  })}</nav>;
}
function Sidebar() { return <aside className="sidebar"><a className="brand" href="/platform"><span className="brand-mark" aria-hidden="true">+</span><span><strong>the CliniQ</strong><small>Platform administration</small></span></a><NavigationList /><div className="sidebar-footer"><span className="environment-dot" />Platform workspace</div></aside>; }
export function AdminShell({ children }: { children: ReactNode }) { const [menuOpen, setMenuOpen] = useState(false); const { user, logout } = useAuth(); return <div className="admin-shell"><Sidebar /><Drawer open={menuOpen} onClose={() => setMenuOpen(false)}><Sidebar /></Drawer><div className="workspace"><header className="topbar"><Button variant="quiet" className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation">Menu</Button><div className="workspace-label"><span className="status-dot" />THE CLINIQ PLATFORM</div><div className="topbar-actions"><span className="platform-role">Platform Administrator</span><Dropdown label={user?.email ?? "Account"}><button className="menu-action" onClick={() => void logout()}>Sign out</button></Dropdown></div></header><main className="content">{children}</main></div></div>; }
