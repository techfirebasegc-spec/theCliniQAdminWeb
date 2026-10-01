"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useAuth } from "../providers/auth-provider";
import { Button, Drawer, Dropdown } from "./ui";

type Navigation = { label: string; icon: string; group?: string; href?: string };
const navigation: Navigation[] = [
  { label: "Dashboard", icon: "▦", href: "/platform" }, { label: "Clinics", icon: "⌂", group: "Organizations", href: "/platform/clinics" }, { label: "Clinic Applications", icon: "□", group: "Organizations", href: "/platform/clinic-applications" }, { label: "Clinic Owners", icon: "♧", group: "Organizations", href: "/platform/owners" }, { label: "Invitations", icon: "✉", group: "Organizations", href: "/platform/invitations" }, { label: "Doctors / Verification", icon: "♙", group: "Doctors", href: "/platform/doctors" }, { label: "Doctor Applications", icon: "□", group: "Doctors", href: "/platform/doctor-applications" }, { label: "Doctor Invitations", icon: "✉", group: "Doctors", href: "/platform/doctors/invitations" },
];

function NavigationList() {
  const pathname = usePathname();
  const groups = [undefined, "Organizations", "Doctors"] as const;
  return <nav className="sidebar-nav" aria-label="Primary navigation">{groups.map((group) => {
    const items = navigation.filter((item) => item.group === group);
    if (!items.length) return null;
    return <div key={group ?? "root"}>{group ? <p className="nav-group">{group}</p> : null}{items.map((item) => item.href ? <a key={item.label} href={item.href} className={pathname === item.href ? "nav-item nav-item--active" : "nav-item"}><span aria-hidden="true">{item.icon}</span>{item.label}</a> : <span key={item.label} className="nav-item nav-item--disabled" aria-disabled="true"><span aria-hidden="true">{item.icon}</span>{item.label}</span>)}</div>;
  })}</nav>;
}
function Sidebar() { return <aside className="sidebar"><a className="brand" href="/platform"><span className="brand-mark" aria-hidden="true">+</span><span><strong>the CliniQ</strong><small>Platform Admin</small></span></a><NavigationList /><div className="sidebar-footer"><span className="environment-dot" />Platform administrator</div></aside>; }
export function AdminShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false); const { user, logout } = useAuth();
  return <div className="admin-shell"><Sidebar /><Drawer open={menuOpen} onClose={() => setMenuOpen(false)}><Sidebar /></Drawer><div className="workspace"><header className="topbar"><Button variant="quiet" className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation">☰</Button><div className="workspace-label"><span className="status-dot" />THE CLINIQ PLATFORM</div><div className="topbar-actions"><span className="platform-role">Platform Administrator</span><Dropdown label={user?.email ?? "Account"}><button className="menu-action" onClick={() => void logout()}>Sign out</button></Dropdown></div></header><main className="content">{children}</main></div></div>;
}
