"use client";

import { createUserWithEmailAndPassword, GoogleAuthProvider, sendEmailVerification, signInWithEmailAndPassword, signInWithPopup, type User } from "firebase/auth";
import { FormEvent, useCallback, useState } from "react";
import { useAuth } from "../providers/auth-provider";
import { firebaseAuth } from "../lib/firebase";
import { PlatformApiError, platformPost } from "../lib/platform-api/client";
import { Alert, Breadcrumbs, Button, Card, Input, PageHeader, StepIndicator, Toast, useToast } from "./ui";
import { resendOwnerInvitation, revokeOwnerInvitation } from "../lib/platform-api/platform-admin";
import "./tenant-owner-onboarding.css";

type InviteResult = { invitation: { id: string; email: string | null; expiresAt: string }; invitationUrl: string };

export function PlatformClinicOnboarding() {
  const [legalName, setLegalName] = useState(""); const [clinicName, setClinicName] = useState(""); const [ownerEmail, setOwnerEmail] = useState(""); const [result, setResult] = useState<InviteResult | null>(null); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false); const toast = useToast();
  async function submit(event: FormEvent) { event.preventDefault(); setError(null); setResult(null); try { setResult(await platformPost<InviteResult>("/v1/platform/clinics", { legalName, clinicName, ownerEmail })); } catch (cause) { setError(cause instanceof PlatformApiError ? cause.message : "Unable to create the clinic invitation."); } }
  async function regenerate() { if (!result) return; setBusy(true); setError(null); try { const next = await resendOwnerInvitation(result.invitation.id); setResult({ invitation: next.invitation, invitationUrl: next.invitationUrl }); toast.show("New invitation link generated. The previous link is no longer usable."); } catch (cause) { setError(cause instanceof PlatformApiError ? cause.message : "Unable to generate a new invitation link."); } finally { setBusy(false); } }
  async function revoke() { if (!result) return; setBusy(true); setError(null); try { await revokeOwnerInvitation(result.invitation.id); setResult(null); toast.show("Invitation revoked. The link is no longer usable."); } catch (cause) { setError(cause instanceof PlatformApiError ? cause.message : "Unable to revoke the invitation."); } finally { setBusy(false); } }
  return <><Breadcrumbs items={["Platform Admin", "Clinics", "Create clinic"]} /><PageHeader eyebrow="Organizations" title="Create Clinic" description="Create the existing tenant, clinic, and clinic-owner invitation in one controlled onboarding flow." /><StepIndicator steps={["Clinic and owner", "Review invitation"]} current={result ? 1 : 0} /><Card className="platform-form"><form className="login-form" onSubmit={(event) => void submit(event)}><label>Legal name<Input value={legalName} onChange={(event) => setLegalName(event.target.value)} required /></label><label>Clinic name<Input value={clinicName} onChange={(event) => setClinicName(event.target.value)} required /></label><label>Owner email<Input type="email" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} required /></label><Button type="submit">Create clinic and send invitation</Button></form>{error ? <Alert tone="error">{error}</Alert> : null}{result ? <section className="auth-success"><h2>Clinic created</h2><p><strong>Owner invitation created</strong> for {result.invitation.email}.</p><p>Status: INVITED · Expires {new Date(result.invitation.expiresAt).toLocaleString()}</p><Input aria-label="One-time invitation link" value={result.invitationUrl} readOnly /><span className="row-actions"><Button type="button" onClick={() => void navigator.clipboard.writeText(result.invitationUrl).then(() => toast.show("Invitation link copied."))}>Copy invitation link</Button><a className="button button--secondary" href={result.invitationUrl} target="_blank" rel="noreferrer">Open invitation</a></span><span className="row-actions"><Button type="button" variant="secondary" disabled={busy} onClick={() => void regenerate()}>Generate new link</Button><Button type="button" variant="secondary" disabled={busy} onClick={() => void revoke()}>Revoke invitation</Button></span><small>Generating a new link invalidates the previous link.</small></section> : null}</Card><Toast message={toast.message} /></>;
}

export function TenantOwnerInvitationAcceptance({ invitationId, secret, type = "owner" }: { invitationId: string; secret: string; type?: "owner" | "doctor" }) {
  const { markPlatformSessionEstablished } = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in"); const [message, setMessage] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  const accept = useCallback(async (user: User) => {
    await user.reload();
    if (!user.emailVerified) { setMessage("Verify your email, then sign in again to accept this invitation."); return; }
    await platformPost<void>(type === "doctor" ? `/v1/doctor-invitations/${encodeURIComponent(invitationId)}/accept` : `/v1/tenant-owner-invitations/${encodeURIComponent(invitationId)}/accept`, { idToken: await user.getIdToken(true), secret });
    if (type === "owner") { markPlatformSessionEstablished(); setMessage("Your clinic owner access is active. You can now continue to the clinic dashboard."); }
    else setMessage("Your doctor invitation is accepted. You can now sign in to the Provider application.");
  }, [invitationId, markPlatformSessionEstablished, secret, type]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null); setMessage(null);
    try {
      const credential = mode === "sign-in" ? await signInWithEmailAndPassword(firebaseAuth(), email, password) : await createUserWithEmailAndPassword(firebaseAuth(), email, password);
      if (mode === "sign-up" && !credential.user.emailVerified) { await sendEmailVerification(credential.user); setMessage("Verify your email, then sign in again to accept this invitation."); return; }
      await accept(credential.user);
    } catch (cause) { setError(cause instanceof PlatformApiError ? cause.message : "Unable to accept this invitation."); }
  }
  async function signInWithGoogle() {
    setError(null); setMessage(null);
    try {
      const credential = await signInWithPopup(firebaseAuth(), new GoogleAuthProvider());
      await accept(credential.user);
    } catch (cause) { setError(cause instanceof PlatformApiError ? cause.message : "Unable to accept this invitation with Google."); }
  }
  if (!invitationId || !secret) return <main className="login-page invitation-page"><p className="error">This invitation link is incomplete.</p></main>;
  return <main className="login-page invitation-page"><aside className="login-brand invitation-brand"><div className="invitation-brand__glow" aria-hidden="true" /><div className="invitation-brand__content"><div className="brand-mark" aria-hidden="true">+</div><p className="eyebrow">The CliniQ</p><h1>Welcome to your clinic workspace.</h1><p className="invitation-brand__intro">Complete this secure step to activate your clinic owner access and begin managing your services.</p><div className="invitation-steps" aria-label="Onboarding steps"><div className="invitation-step invitation-step--complete"><span aria-hidden="true">1</span><div><strong>Invitation received</strong><small>Your access was securely created by The CliniQ.</small></div></div><div className="invitation-step invitation-step--active"><span aria-hidden="true">2</span><div><strong>Verify your identity</strong><small>Sign in with the email address the invitation was sent to.</small></div></div><div className="invitation-step"><span aria-hidden="true">3</span><div><strong>Start managing your clinic</strong><small>Your owner access becomes active immediately after verification.</small></div></div></div></div></aside><section className="login-panel invitation-panel"><div className="login-card invitation-card"><p className="eyebrow">Secure invitation</p><h2>Complete clinic owner onboarding</h2><p className="invitation-card__intro">Use the email address that received this invitation to securely activate your access.</p><form className="login-form invitation-form" onSubmit={(event) => void submit(event)}><label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Password<input type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required /></label><button className="invitation-primary-action" type="submit">{mode === "sign-in" ? "Sign in and accept invitation" : "Create account"}</button></form><div className="invitation-divider"><span>or continue with</span></div><button className="invitation-google-action" type="button" onClick={() => void signInWithGoogle()}><span className="invitation-google-mark" aria-hidden="true">G</span>Google</button><p className="invitation-switch"><button type="button" onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}>{mode === "sign-in" ? "New to The CliniQ? Create an account" : "Already have an account? Sign in"}</button></p>{message ? <p className="invitation-message invitation-message--success">{message}</p> : null}{error ? <p className="invitation-message invitation-message--error" role="alert">{error}</p> : null}<p className="invitation-security-note"><span aria-hidden="true">•</span> Your sign-in is protected through Firebase authentication.</p></div></section></main>;
}
