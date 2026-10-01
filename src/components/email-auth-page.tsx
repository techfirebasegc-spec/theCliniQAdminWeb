"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "../providers/auth-provider";
import { Alert, Button, Input, LoadingState } from "./ui";

export function EmailAuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const { loading, error, user, platformSessionEstablished, signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isSignUp = mode === "sign-up";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await (isSignUp ? signUp({ email, password }) : signIn({ email, password }));
      router.replace("/dashboard");
    } catch { /* The provider exposes a safe error. */ }
  }

  const title = isSignUp ? "Create your account" : "Sign in to continue";
  const description = isSignUp ? "Create a Firebase account with your work email." : "Use your approved CliniQ work email.";
  const submitLabel = isSignUp ? "Create account" : "Sign in";
  return <main className="login-page"><section className="login-brand"><div className="brand-mark" aria-hidden="true">+</div><p className="eyebrow">The CliniQ</p><h1>Operations, with a clearer view.</h1><p>Secure access for the teams coordinating care, services, and day-to-day operations.</p><div className="login-note"><strong>Private workspace</strong><span>Administrative access is validated by the Platform when the dedicated authorization endpoint is available.</span></div></section><section className="login-panel"><div className="login-card"><p className="eyebrow">Operations portal</p><h2>{title}</h2><p className="muted">{description}</p>{loading ? <LoadingState label="Checking your secure session…" /> : user && platformSessionEstablished ? <Button onClick={() => router.replace("/dashboard")}>Continue to operations</Button> : <form className="login-form" onSubmit={(event) => void submit(event)}><label>Email address<Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Password<Input type="password" autoComplete={isSignUp ? "new-password" : "current-password"} minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required /></label><Button type="submit" disabled={loading}>{submitLabel}</Button></form>}{error ? <Alert tone="error">{error}</Alert> : null}<p className="login-help">Authentication uses Firebase Email/Password, then establishes a Platform session. Passwords are handled by Firebase and are not stored by this application.</p><p className="login-switch">{isSignUp ? <>Already have an account? <Link href="/login">Sign in</Link></> : <>Need an account? <Link href="/sign-up">Create one</Link></>}</p></div></section></main>;
}
