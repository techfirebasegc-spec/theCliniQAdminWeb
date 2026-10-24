"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../providers/auth-provider";
import { Alert, Breadcrumbs, Button, Card, PageHeader } from "./ui";
import styles from "./platform-settings.module.css";

type Section = "account" | "notifications" | "security" | "defaults" | "about";

const sections: Array<{ id: Section; label: string; detail: string }> = [
  { id: "account", label: "My Account", detail: "Identity and workspace access" },
  { id: "notifications", label: "Notifications", detail: "Delivery preferences" },
  { id: "security", label: "Security & Sessions", detail: "Session safeguards" },
  { id: "defaults", label: "Platform Defaults", detail: "Established platform policy" },
  { id: "about", label: "About the Platform", detail: "Support and product information" },
];

function Unavailable({ title, detail }: { title: string; detail: string }) {
  return <div className={styles.unavailable}><span aria-hidden="true">—</span><div><h3>{title}</h3><p>{detail}</p></div></div>;
}

export function PlatformSettings() {
  const { user, logout } = useAuth();
  const [section, setSection] = useState<Section>("account");
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = sections.find((item) => item.id === section)!;

  async function signOut() {
    setSigningOut(true);
    setError(null);
    try { await logout(); }
    catch { setError("You were signed out of Firebase, but the Platform session could not be closed cleanly."); }
    finally { setSigningOut(false); }
  }

  return <div className={styles.settingsPage}>
    <Breadcrumbs items={["Platform Admin", "Settings"]} />
    <PageHeader eyebrow="Platform administration" title="Settings" description="Manage your administrator preferences and review the supported Platform configuration available to this workspace." />
    <section className={styles.settingsLayout} aria-label="Platform settings">
      <nav className={styles.sectionNav} aria-label="Settings categories">
        {sections.map((item) => <button key={item.id} type="button" aria-current={section === item.id ? "page" : undefined} className={section === item.id ? styles.sectionButtonActive : styles.sectionButton} onClick={() => { setSection(item.id); setError(null); }}><strong>{item.label}</strong><span>{item.detail}</span></button>)}
      </nav>
      <Card className={styles.settingsPanel}>
        <header className={styles.panelHeader}><p className="eyebrow">{selected.label}</p><h2>{selected.label}</h2></header>
        {section === "account" ? <section className={styles.contentSection} aria-labelledby="account-details-title"><div className={styles.summary}><span className={styles.avatar} aria-hidden="true">{user?.email?.slice(0, 1).toUpperCase() ?? "A"}</span><div><h3 id="account-details-title">Administrator account</h3><p>Your account identity is supplied by the active Firebase session.</p></div></div><dl className={styles.details}><dt>Email address</dt><dd>{user?.email ?? "Not available"}</dd><dt>Workspace access</dt><dd>Platform Administrator</dd><dt>Authentication state</dt><dd>{user ? "Signed in" : "Not available"}</dd></dl><div className={styles.actions}><div><h3>Sign out of this workspace</h3><p>Ends this browser’s existing Firebase and Platform session.</p></div><Button type="button" variant="secondary" onClick={() => void signOut()} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</Button></div></section> : null}
        {section === "notifications" ? <section className={styles.contentSection}><Unavailable title="Notification preferences are not configured" detail="This workspace does not currently expose an authorized notification-preference source or persistence API. No delivery controls are available here." /><p className={styles.note}>The notification indicator in the header remains unavailable until a supported notification capability is connected.</p></section> : null}
        {section === "security" ? <section className={styles.contentSection}><div className={styles.summary}><span className={styles.shield} aria-hidden="true">✓</span><div><h3>Protected session</h3><p>Platform access is established from the current Firebase-authenticated account.</p></div></div><dl className={styles.details}><dt>Current account</dt><dd>{user?.email ?? "Not available"}</dd><dt>Session management</dt><dd>Sign out is supported for this browser session.</dd><dt>Other active sessions</dt><dd>Not available in the current Platform API.</dd><dt>Login history</dt><dd>Not available in the current Platform API.</dd></dl><div className={styles.actions}><div><h3>End this session</h3><p>Use the existing sign-out flow to clear your Firebase and Platform session.</p></div><Button type="button" variant="secondary" onClick={() => void signOut()} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</Button></div></section> : null}
        {section === "defaults" ? <section className={styles.contentSection}><Unavailable title="Global defaults are managed in Presentation" detail="The only supported platform-wide defaults in this workspace are presentation capabilities and explicit entitlements. They retain their existing authorization, validation, and persistence controls." /><Link className="button button--secondary" href="/platform/presentation">Open Presentation management</Link></section> : null}
        {section === "about" ? <section className={styles.contentSection}><div className={styles.summary}><span className={styles.info} aria-hidden="true">i</span><div><h3>theCliniQ Platform Admin</h3><p>Use the Help Center for operational guidance and established platform workflows.</p></div></div><dl className={styles.details}><dt>Application version</dt><dd>Not exposed by the current trusted runtime configuration.</dd><dt>Build revision</dt><dd>Not exposed by the current trusted runtime configuration.</dd><dt>Environment</dt><dd>Not exposed in this administrator workspace.</dd></dl><Link className="button button--secondary" href="/platform/help">Open Help Center</Link></section> : null}
        {error ? <Alert tone="error">{error}</Alert> : null}
      </Card>
    </section>
  </div>;
}
