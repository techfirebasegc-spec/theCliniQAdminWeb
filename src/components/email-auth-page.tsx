"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "../providers/auth-provider";
import { Alert, Button, Input, LoadingState } from "./ui";
import styles from "./email-auth-page.module.css";

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

  const title = isSignUp ? "Create your account" : "Sign in to your account";
  const description = isSignUp ? "Create a Firebase account with your work email." : "Use your approved CliniQ work email.";
  const submitLabel = isSignUp ? "Create account" : "Sign in";
  return <main className={styles.authPage}><section className={styles.brandPanel}><div className={styles.brandContent}><div className={styles.logoSurface}><Image src="/brand/thecliniq-logo-compact.png" alt="theCliniQ" width={765} height={309} priority /></div><p className="eyebrow">THE CLINIQ PLATFORM</p><h1>Better coordination. Clearer operations.</h1><p className={styles.brandIntro}>One platform to support the teams, services, and workflows that keep healthcare moving.</p><div className={styles.workspaceNote}><strong>CONNECTED CARE TEAMS</strong><span>Secure tools for managing healthcare operations with confidence.</span></div></div></section><section className={styles.formPanel}><div className={styles.formCard}><p className="eyebrow">Operations portal</p><h2>{title}</h2><p className={styles.formDescription}>{description}</p>{loading ? <LoadingState label="Checking your secure session…" /> : user && platformSessionEstablished ? <Button onClick={() => router.replace("/dashboard")}>Continue to operations</Button> : <form className="login-form" onSubmit={(event) => void submit(event)}><label>Email address<Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Password<Input type="password" autoComplete={isSignUp ? "new-password" : "current-password"} minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required /></label><Button type="submit" disabled={loading}>{submitLabel}</Button></form>}{error ? <Alert tone="error">{error}</Alert> : null}<div className={styles.authExplanation}><p>Authentication uses Firebase Email/Password, then establishes a Platform session. Passwords are handled by Firebase and are not stored by this application.</p></div><p className={styles.accountLink}>{isSignUp ? <>Already have an account? <Link href="/login">Sign in</Link></> : <>Need an account? <Link href="/sign-up">Create one</Link></>}</p></div></section></main>;
}
