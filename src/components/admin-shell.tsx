"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type RefObject } from "react";
import { useAuth } from "../providers/auth-provider";
import { Button, Drawer } from "./ui";
import "./admin-shell.module.css";

type NavigationGroup = "Overview" | "Platform Administration" | "Organizations" | "Doctors & Verification" | "Financial Operations" | "Platform Configuration";
type IconName = "dashboard" | "admins" | "catalogue" | "prescription" | "help" | "clinic" | "owners" | "application" | "invitation" | "doctor" | "classification" | "finance" | "payout" | "reconcile" | "rules" | "presentation" | "settings";
type Navigation = { label: string; group: NavigationGroup; href: string; icon: IconName };

const navigation: Navigation[] = [
  { label: "Dashboard", group: "Overview", href: "/platform", icon: "dashboard" }, { label: "Help Center", group: "Overview", href: "/platform/help", icon: "help" },
  { label: "Platform Admins", group: "Platform Administration", href: "/platform/admins/new", icon: "admins" }, { label: "Clinical Catalogue", group: "Platform Administration", href: "/platform/clinical-catalogue", icon: "catalogue" }, { label: "Prescription access", group: "Platform Administration", href: "/platform/prescription-workflow", icon: "prescription" },
  { label: "Clinics", group: "Organizations", href: "/platform/clinics", icon: "clinic" }, { label: "Clinic Owners", group: "Organizations", href: "/platform/owners", icon: "owners" }, { label: "Clinic Applications", group: "Organizations", href: "/platform/clinic-applications", icon: "application" }, { label: "Invitations", group: "Organizations", href: "/platform/invitations", icon: "invitation" },
  { label: "Doctors / Verification", group: "Doctors & Verification", href: "/platform/doctors", icon: "doctor" }, { label: "Professional classifications", group: "Doctors & Verification", href: "/platform/professional-classifications", icon: "classification" }, { label: "Clinic-created Doctors", group: "Doctors & Verification", href: "/platform/clinic-created-doctors", icon: "owners" }, { label: "Doctor Applications", group: "Doctors & Verification", href: "/platform/doctor-applications", icon: "application" }, { label: "Doctor Invitations", group: "Doctors & Verification", href: "/platform/doctors/invitations", icon: "invitation" },
  { label: "Eligibility", group: "Financial Operations", href: "/platform/financial/eligibility", icon: "finance" }, { label: "Manual Payouts", group: "Financial Operations", href: "/platform/financial/manual-payouts", icon: "payout" }, { label: "Reconciliation", group: "Financial Operations", href: "/platform/financial/reconciliation", icon: "reconcile" }, { label: "Commercial Rules", group: "Financial Operations", href: "/platform/commercial-rules", icon: "rules" },
  { label: "Presentation", group: "Platform Configuration", href: "/platform/presentation", icon: "presentation" }, { label: "Settings", group: "Platform Configuration", href: "/platform/settings", icon: "settings" },
];

const groups: NavigationGroup[] = ["Overview", "Platform Administration", "Organizations", "Doctors & Verification", "Financial Operations", "Platform Configuration"];
const primaryGroups: NavigationGroup[] = ["Overview", "Organizations", "Doctors & Verification", "Financial Operations"];
const primaryNavigation = primaryGroups.map((group) => navigation.find((item) => item.group === group)!);
const secondaryNavigation = groups.map((group) => ({ group, items: navigation.filter((item) => item.group === group && !primaryNavigation.includes(item)) })).filter(({ items }) => items.length);

function isActive(pathname: string, href: string) { return pathname === href || (href !== "/platform" && pathname.startsWith(`${href}/`)); }

function NavIcon({ name }: { name: IconName }) {
  const icons: Record<IconName, ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    admins: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20c.5-3.2 2.4-5 5.5-5s5 1.8 5.5 5M16 8h5M18.5 5.5v5" /></>, catalogue: <><path d="M5 4.5h11a3 3 0 0 1 3 3V20H8a3 3 0 0 0-3 3zM5 4.5V20" /><path d="M9 9h6M9 13h6" /></>,
    prescription: <><path d="M7 3h8l3 3v15H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M9 12h6M12 9v6" /></>, help: <><circle cx="12" cy="12" r="9" /><path d="M9.8 9.3a2.4 2.4 0 1 1 3.8 2c-1.2.9-1.6 1.4-1.6 2.7M12 17h.01" /></>,
    clinic: <><path d="M4 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16M2 21h20" /><path d="M9 8h4M11 6v4M8 15h1M12 15h1M16 15h1" /></>, owners: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21c.6-4 3-6 7-6s6.4 2 7 6" /></>,
    application: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h4" /></>, invitation: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
    doctor: <><path d="M12 3v18M7.5 7.5h9M8 21h8" /><circle cx="12" cy="7.5" r="4.5" /></>, classification: <><path d="m12 3 2.8 5.7L21 9.6l-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" /></>,
    finance: <><path d="M4 20V8l8-5 8 5v12" /><path d="M8 12h8M8 16h8M6 20h12" /></>, payout: <><circle cx="12" cy="12" r="9" /><path d="M15 8.5c-.7-.6-1.6-.9-3-.9-1.7 0-3 .8-3 2.1 0 3.3 6 1.5 6 4.7 0 1.3-1.3 2.1-3 2.1-1.4 0-2.6-.4-3.4-1.1M12 6v12" /></>,
    reconcile: <><path d="M7 7h11v11" /><path d="m18 7-3-3M18 7l-3 3M17 17H6V6" /><path d="m6 17 3 3M6 17l3-3" /></>, rules: <><path d="M5 4h14M5 10h14M5 16h14M5 20h10" /><circle cx="8" cy="4" r="1.5" /><circle cx="15" cy="10" r="1.5" /><circle cx="10" cy="16" r="1.5" /></>,
    presentation: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="m8 21 4-5 4 5M9 9h6" /></>, settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06A1.7 1.7 0 0 0 15.74 18a1.7 1.7 0 0 0-1.04 1.56v.09h-3v-.09A1.7 1.7 0 0 0 10.66 18a1.7 1.7 0 0 0-1.88 1l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.56-1.04h-.09v-3h.09A1.7 1.7 0 0 0 7 9.92a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.12-2.12.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 11.7 4.7v-.09h3v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06A1.7 1.7 0 0 0 19.4 9.92 1.7 1.7 0 0 0 20.96 11h.09v3h-.09A1.7 1.7 0 0 0 19.4 15Z" /></>,
  };
  return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>;
}

function MoreNavigation({ inDrawer = false, onNavigate }: { inDrawer?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(inDrawer);
  const menuId = useId();
  const containerRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open || inDrawer) return;
    const closeOnOutsidePointer = (event: PointerEvent) => { if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); setOpen(false); summaryRef.current?.focus(); } };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("pointerdown", closeOnOutsidePointer); document.removeEventListener("keydown", closeOnEscape); };
  }, [inDrawer, open]);
  const closeForNavigation = () => { setOpen(false); onNavigate?.(); };
  return <details ref={containerRef} className={inDrawer ? "more-navigation more-navigation--drawer" : "more-navigation"} open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary ref={summaryRef} aria-controls={menuId} aria-expanded={open}>{inDrawer ? "More navigation" : "More"}<span className="more-chevron" aria-hidden="true" /></summary>
    <div className="more-menu" id={menuId}>{secondaryNavigation.map(({ group, items }) => <section key={group}><p>{group}</p>{items.map((item) => <Link key={item.href} href={item.href} onClick={closeForNavigation} aria-current={isActive(pathname, item.href) ? "page" : undefined} className={isActive(pathname, item.href) ? "more-menu-item more-menu-item--active" : "more-menu-item"}><NavIcon name={item.icon} /><span>{item.label}</span></Link>)}</section>)}</div>
  </details>;
}

function SearchIcon() { return <svg className="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>; }
function GlobalSearch({ open, onClose, triggerRef }: { open: boolean; onClose: () => void; triggerRef: RefObject<HTMLButtonElement | null> }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const results = normalizedQuery ? navigation.filter((item) => `${item.label} ${item.group}`.toLocaleLowerCase().includes(normalizedQuery)) : navigation;
  const closeAndRestoreFocus = useCallback(() => { onClose(); triggerRef.current?.focus(); }, [onClose, triggerRef]);
  const select = (item: Navigation) => { onClose(); router.push(item.href); };
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); closeAndRestoreFocus(); } };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, closeAndRestoreFocus]);
  if (!open) return null;
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && results.length) { event.preventDefault(); setActiveIndex((index) => (index + 1) % results.length); }
    if (event.key === "ArrowUp" && results.length) { event.preventDefault(); setActiveIndex((index) => (index - 1 + results.length) % results.length); }
    if (event.key === "Enter" && results[activeIndex]) { event.preventDefault(); select(results[activeIndex]); }
  };
  return <div className="global-search-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) closeAndRestoreFocus(); }}>
    <section className="global-search-panel" role="dialog" aria-modal="true" aria-label="Search platform navigation">
      <div className="global-search-input-row"><SearchIcon /><input ref={inputRef} className="global-search-input" value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={handleKeyDown} placeholder="Search platform navigation" aria-label="Search platform navigation" aria-controls="global-search-results" aria-activedescendant={results[activeIndex] ? `global-search-result-${results[activeIndex].href.replaceAll("/", "-")}` : undefined} /><kbd>Esc</kbd></div>
      <div className="global-search-results" id="global-search-results" role="listbox" aria-label="Navigation destinations">{results.length ? results.map((item, index) => <button type="button" key={item.href} id={`global-search-result-${item.href.replaceAll("/", "-")}`} role="option" aria-selected={index === activeIndex} className={index === activeIndex ? "global-search-result global-search-result--active" : "global-search-result"} onMouseEnter={() => setActiveIndex(index)} onClick={() => select(item)}><NavIcon name={item.icon} /><span><strong>{item.label}</strong><small>{item.group}</small></span></button>) : <p className="global-search-empty">No navigation destinations match “{query.trim()}”.</p>}</div>
      <p className="global-search-hint"><kbd>↑↓</kbd> Navigate <kbd>↵</kbd> Open</p>
    </section>
  </div>;
}

function BellIcon() { return <svg className="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 10a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 22h4" /></svg>; }
function NotificationPlaceholder() { return <button type="button" className="header-icon-button" disabled aria-label="Notifications are not available in this workspace" title="Notifications are not available in this workspace"><BellIcon /></button>; }

function ProfileMenu({ email, onLogout }: { email: string; onLogout: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => { if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); setOpen(false); summaryRef.current?.focus(); } };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("pointerdown", closeOnOutsidePointer); document.removeEventListener("keydown", closeOnEscape); };
  }, [open]);
  return <details ref={containerRef} className="profile-menu" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary ref={summaryRef} aria-controls={menuId} aria-expanded={open}><span className="profile-email">{email}</span><span className="profile-chevron" aria-hidden="true" /></summary>
    <div id={menuId} className="profile-menu-panel"><p>Signed in as</p><strong>{email}</strong><span className="profile-role">Platform Administrator</span><button className="menu-action" onClick={() => { setOpen(false); void onLogout(); }}>Sign out</button></div>
  </details>;
}

function SidebarNavigation({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return <nav className={collapsed ? "sidebar-nav sidebar-nav--collapsed" : "sidebar-nav"} aria-label="Primary shortcuts">{!collapsed && <p className="sidebar-section-label">Shortcuts</p>}{primaryNavigation.map((item) => <Link key={item.href} href={item.href} onClick={onNavigate} aria-label={item.label} aria-current={isActive(pathname, item.href) ? "page" : undefined} data-tooltip={item.label} title={item.label} className={isActive(pathname, item.href) ? "nav-item nav-item--active" : "nav-item"}><NavIcon name={item.icon} /><span>{item.label}</span></Link>)}</nav>;
}

function Brand({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) { return <Link className={collapsed ? "brand brand--collapsed" : "brand"} href="/platform" onClick={onNavigate} aria-label="theCliniQ Platform Admin home"><span className="brand-logo"><Image src="/brand/thecliniq-logo-compact.png" alt="theCliniQ" width={765} height={309} priority /></span></Link>; }
function Sidebar({ drawer = false, collapsed = false, onNavigate, onToggle }: { drawer?: boolean; collapsed?: boolean; onNavigate?: () => void; onToggle?: () => void }) { return <aside className={`${drawer ? "sidebar sidebar--drawer" : "sidebar"}${collapsed ? " sidebar--collapsed" : ""}`}><div className="sidebar-brand-row"><Brand collapsed={collapsed} onNavigate={onNavigate} />{!drawer && <button type="button" className="sidebar-toggle" onClick={onToggle} aria-label={collapsed ? "Expand navigation sidebar" : "Collapse navigation sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}><span className="sidebar-toggle-icon" aria-hidden="true" /></button>}</div><SidebarNavigation collapsed={collapsed} onNavigate={onNavigate} />{drawer && <MoreNavigation inDrawer onNavigate={onNavigate} />}<div className="sidebar-footer"><span className="environment-dot" /><span>Platform workspace</span></div></aside>; }

function TopNavigation() { const pathname = usePathname(); return <nav className="top-navigation" aria-label="Platform sections">{primaryNavigation.map((item) => { const active = navigation.some((candidate) => candidate.group === item.group && isActive(pathname, candidate.href)); return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={active ? "top-navigation-item top-navigation-item--active" : "top-navigation-item"}>{item.group === "Overview" ? item.label : item.group}</Link>; })}<MoreNavigation /></nav>; }

export function AdminShell({ children }: { children: ReactNode }) { const [menuOpen, setMenuOpen] = useState(false); const [sidebarCollapsed, setSidebarCollapsed] = useState(false); const [searchOpen, setSearchOpen] = useState(false); const searchTriggerRef = useRef<HTMLButtonElement>(null); const { user, logout } = useAuth(); const email = user?.email ?? "Account"; useEffect(() => { const openWithShortcut = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); } }; document.addEventListener("keydown", openWithShortcut); return () => document.removeEventListener("keydown", openWithShortcut); }, []); return <div className={`admin-shell${sidebarCollapsed ? " admin-shell--sidebar-collapsed" : ""}`}><Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((collapsed) => !collapsed)} /><Drawer open={menuOpen} onClose={() => setMenuOpen(false)}><Sidebar drawer onNavigate={() => setMenuOpen(false)} /></Drawer><div className="workspace"><header className="topbar"><Button variant="quiet" className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><span className="menu-icon" aria-hidden="true" /><span className="sr-only">Open navigation</span></Button><button ref={searchTriggerRef} type="button" className="global-search-trigger" onClick={() => setSearchOpen(true)} aria-label="Search platform navigation"><SearchIcon /><span>Search</span><kbd>⌘K</kbd></button><TopNavigation /><div className="topbar-actions"><span className="platform-role">Platform Administrator</span><NotificationPlaceholder /><ProfileMenu email={email} onLogout={logout} /></div></header><main className="content">{children}</main></div><GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} triggerRef={searchTriggerRef} /></div>; }
