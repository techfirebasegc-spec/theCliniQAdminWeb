"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { firebaseAuth } from "../lib/firebase";
import { useAuth } from "../providers/auth-provider";
import { Alert, Button, Input, LoadingState, PasswordInput } from "./ui";
import styles from "./email-auth-page.module.css";

export function EmailAuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const { loading, error, user, platformSessionEstablished, signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const isSignUp = mode === "sign-up";

  useEffect(() => {
    if (!loading && user && platformSessionEstablished) {
      router.replace("/platform");
    }
  }, [loading, user, platformSessionEstablished, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await (isSignUp ? signUp({ email, password }) : signIn({ email, password }));
      router.replace("/platform");
    } catch { /* The provider exposes a safe error. */ }
  }

  async function handlePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetEmail = email.trim();
    if (!targetEmail) {
      setResetError("Please enter your email address.");
      return;
    }
    setResetSending(true);
    setResetNotice(null);
    setResetError(null);
    try {
      await sendPasswordResetEmail(firebaseAuth(), targetEmail);
      setResetNotice("If an account exists with this email address, a password reset link has been sent. Please check your inbox.");
    } catch (err: unknown) {
      const code = typeof err === "object" && err !== null && "code" in err ? (err as { code: string }).code : "";
      if (code === "auth/invalid-email") {
        setResetError("Please enter a valid email address.");
      } else if (code === "auth/too-many-requests") {
        setResetError("Too many attempts. Please wait a few moments before requesting another reset email.");
      } else {
        // Safe feedback to prevent email enumeration
        setResetNotice("If an account exists with this email address, a password reset link has been sent. Please check your inbox.");
      }
    } finally {
      setResetSending(false);
    }
  }

  const title = isForgotPassword
    ? "Reset your password"
    : isSignUp
    ? "Create your account"
    : "Sign in to your account";
  const description = isForgotPassword
    ? "Enter your registered email address to receive password reset instructions."
    : isSignUp
    ? "Create a Firebase account with your work email."
    : "Use your approved CliniQ work email.";
  const submitLabel = isSignUp ? "Create account" : "Sign in";

  return (
    <main className={styles.authPage}>
      <section className={styles.brandPanel}>
        <div className={styles.brandContent}>
          <div className={styles.logoSurface}>
            <Image src="/brand/thecliniq-logo-compact.png" alt="theCliniQ" width={765} height={309} priority />
          </div>
          <p className="eyebrow">THE CLINIQ PLATFORM</p>
          <h1>Better coordination. Clearer operations.</h1>
          <p className={styles.brandIntro}>
            One platform to support the teams, services, and workflows that keep healthcare moving.
          </p>
          <div className={styles.workspaceNote}>
            <strong>CONNECTED CARE TEAMS</strong>
            <span>Secure tools for managing healthcare operations with confidence.</span>
          </div>
        </div>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.formCard}>
          <p className="eyebrow">Operations portal</p>
          <h2>{title}</h2>
          <p className={styles.formDescription}>{description}</p>

          {loading && !platformSessionEstablished ? (
            <LoadingState label="Checking your secure session…" />
          ) : user && platformSessionEstablished ? (
            <Button onClick={() => router.replace("/platform")}>Continue to operations</Button>
          ) : isForgotPassword ? (
            <div>
              <form className="login-form" onSubmit={(e) => void handlePasswordReset(e)}>
                <label>
                  Registered email address
                  <Input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@clinic.com"
                    required
                    disabled={resetSending}
                  />
                </label>
                <Button type="submit" disabled={resetSending}>
                  {resetSending ? "Sending reset link…" : "Send password reset email"}
                </Button>
              </form>
              {resetNotice ? <Alert tone="info">{resetNotice}</Alert> : null}
              {resetError ? <Alert tone="error">{resetError}</Alert> : null}
              <div style={{ marginTop: "18px" }}>
                <button
                  type="button"
                  className="button button--secondary"
                  style={{ width: "100%" }}
                  onClick={() => {
                    setIsForgotPassword(false);
                    setResetNotice(null);
                    setResetError(null);
                  }}
                >
                  ← Back to sign in
                </button>
              </div>
            </div>
          ) : (
            <div>
              <form className="login-form" onSubmit={(event) => void submit(event)}>
                <label>
                  Email address
                  <Input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </label>
                <label>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Password</span>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setResetNotice(null);
                          setResetError(null);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--navy)",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          padding: 0,
                          textDecoration: "underline",
                        }}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <PasswordInput
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </label>
                <Button type="submit" disabled={loading}>
                  {submitLabel}
                </Button>
              </form>
              {error ? <Alert tone="error">{error}</Alert> : null}
            </div>
          )}

          <div className={styles.authExplanation}>
            <p>
              Authentication uses Firebase Email/Password, then establishes a Platform session. Passwords are handled
              by Firebase and are not stored by this application.
            </p>
          </div>

          {!isForgotPassword && (
            <p className={styles.accountLink}>
              {isSignUp ? (
                <>
                  Already have an account? <Link href="/login">Sign in</Link>
                </>
              ) : (
                <>
                  Need an account? <Link href="/sign-up">Create one</Link>
                </>
              )}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
