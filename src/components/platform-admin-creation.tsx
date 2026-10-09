"use client";

import { sendPasswordResetEmail } from "firebase/auth";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { firebaseAuth } from "../lib/firebase";
import { createPlatformAdmin, recordPlatformAdminActivationEmail, requestPlatformAdminActivationEmail } from "../lib/platform-api/platform-admin";
import { Alert, Breadcrumbs, Button, Card, Input, PageHeader, StepIndicator } from "./ui";

export function PlatformAdminCreationPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);
  const [createdAccountId, setCreatedAccountId] = useState<string | null>(null);
  const [coolingDown, setCoolingDown] = useState(false);
  const [deliveryFailed, setDeliveryFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cooldownTimeout = useRef<number | null>(null);

  const beginCooldown = useCallback(() => {
    if (cooldownTimeout.current !== null) {
      window.clearTimeout(cooldownTimeout.current);
    }
    setCoolingDown(true);
    cooldownTimeout.current = window.setTimeout(() => {
      cooldownTimeout.current = null;
      setCoolingDown(false);
    }, 60_000);
  }, []);

  useEffect(
    () => () => {
      if (cooldownTimeout.current !== null) {
        window.clearTimeout(cooldownTimeout.current);
      }
    },
    [],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestedEmail = email.trim();
    setBusy(true);
    setError(null);
    setCreatedEmail(null);
    setCreatedAccountId(null);
    setDeliveryFailed(false);
    try {
      const created = await createPlatformAdmin(requestedEmail);
      setCreatedEmail(requestedEmail);
      setCreatedAccountId(created.accountId);
      await requestPlatformAdminActivationEmail(created.accountId);
      beginCooldown();
      try {
        await sendPasswordResetEmail(firebaseAuth(), requestedEmail);
        await recordPlatformAdminActivationEmail(created.accountId, "REQUESTED");
      } catch {
        setDeliveryFailed(true);
        try { await recordPlatformAdminActivationEmail(created.accountId, "FAILED"); } catch { /* The activation request remains server-audited. */ }
      }
    } catch {
      setError("The Platform Admin account could not be created. Check the email address and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!createdAccountId || !createdEmail || coolingDown) return;
    setBusy(true); setDeliveryFailed(false); setError(null);
    try {
      await requestPlatformAdminActivationEmail(createdAccountId);
      beginCooldown();
      try { await sendPasswordResetEmail(firebaseAuth(), createdEmail); await recordPlatformAdminActivationEmail(createdAccountId, "REQUESTED"); }
      catch { setDeliveryFailed(true); try { await recordPlatformAdminActivationEmail(createdAccountId, "FAILED"); } catch { /* The accepted request is already audited server-side. */ } }
    } catch { setError("The password-setup email could not be requested. Please wait before trying again."); }
    finally { setBusy(false); }
  }

  return <div><Breadcrumbs items={["Platform Admin", "Platform Admins", "Create"]} /><PageHeader eyebrow="Platform" title="Create Platform Admin" description="Create a Platform Admin account, then request its existing Firebase password-setup email." /><StepIndicator steps={["Email address", "Password setup"]} current={createdEmail ? 1 : 0} /><Card className="platform-form"><form className="login-form" onSubmit={(event) => void submit(event)}><label>Email address<Input type="email" autoComplete="email" disabled={busy} onChange={(event) => setEmail(event.target.value)} required value={email} /></label><p className="control-help">The account is created with the existing Platform Admin entitlement. Password setup continues through Firebase&apos;s password-reset email.</p><Button disabled={busy} type="submit">{busy ? "Creating…" : "Create Platform Admin"}</Button></form>{createdEmail && !deliveryFailed ? <Alert tone="info">The Platform Admin account for {createdEmail} was created and a password-setup email was requested.</Alert> : null}{createdEmail && deliveryFailed ? <Alert tone="error">The Platform Admin account for {createdEmail} was created, but Firebase could not send its password-setup email.</Alert> : null}{createdAccountId ? <><Button disabled={busy || coolingDown} onClick={() => void resend()} type="button">{coolingDown ? "Resend available shortly" : "Resend password-setup email"}</Button><p className="control-help">This requests Firebase to send an email; it does not confirm inbox delivery.</p></> : null}{error ? <Alert tone="error">{error}</Alert> : null}</Card></div>;
}
