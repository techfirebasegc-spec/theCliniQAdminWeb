"use client";

import { User, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { firebaseAuth } from "../lib/firebase";
import { PlatformApiError, establishPlatformSession, establishTenantPlatformSession, logoutPlatformSession } from "../lib/platform-api/auth";

type EmailPasswordCredentials = { email: string; password: string };
type AuthContextValue = {
  user: User | null;
  loading: boolean;
  error: string | null;
  platformSessionEstablished: boolean;
  signIn: (credentials: EmailPasswordCredentials) => Promise<void>;
  signUp: (credentials: EmailPasswordCredentials) => Promise<void>;
  logout: () => Promise<void>;
  markPlatformSessionEstablished: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function firebaseErrorMessage(cause: unknown, fallback: string) {
  const code = typeof cause === "object" && cause !== null && "code" in cause ? cause.code : undefined;
  switch (code) {
    case "auth/email-already-in-use": return "An account already exists for this email address.";
    case "auth/invalid-email": return "Enter a valid email address.";
    case "auth/weak-password": return "Use a stronger password of at least six characters.";
    case "auth/invalid-credential": return "The email address or password is incorrect.";
    case "auth/user-disabled": return "This Firebase account has been disabled.";
    case "auth/too-many-requests": return "Too many attempts were made. Please wait before trying again.";
    case "auth/operation-not-allowed": return "Email/Password sign-in is not enabled for this Firebase project.";
    case "auth/network-request-failed": return "Firebase could not be reached. Check your connection and try again.";
    default: return fallback;
  }
}

function platformErrorMessage(cause: unknown) {
  if (!(cause instanceof PlatformApiError)) return "Unable to establish the Platform session.";
  if (cause.status === 401) return "Firebase sign-in succeeded, but the Platform does not yet accept Email/Password sessions.";
  if (cause.status === 403) return "The Platform denied this session.";
  return "Unable to establish the Platform session.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [platformSessionEstablished, setPlatformSessionEstablished] = useState(false);
  const exchange = useRef<Promise<void> | null>(null);

  const establish = useCallback(async (nextUser: User) => {
    if (exchange.current) return exchange.current;
    const establishSession = nextUser.providerData.some((provider) => provider.providerId === "google.com") ? establishTenantPlatformSession : establishPlatformSession;
    const request = establishSession(await nextUser.getIdToken())
      .then(() => { setPlatformSessionEstablished(true); setError(null); })
      .catch((cause: unknown) => {
        setPlatformSessionEstablished(false);
        setError(platformErrorMessage(cause));
        throw cause;
      })
      .finally(() => { exchange.current = null; });
    exchange.current = request;
    return request;
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = onAuthStateChanged(firebaseAuth(), async (nextUser) => {
        if (!active) return;
        setUser(nextUser);
        if (!nextUser) { setPlatformSessionEstablished(false); setLoading(false); return; }
        if (pathname === "/accept-invitation") { setPlatformSessionEstablished(false); setLoading(false); return; }
        try { await establish(nextUser); } catch { /* The state exposes a safe error. */ } finally { if (active) setLoading(false); }
      });
    } catch (cause) {
      queueMicrotask(() => { if (active) { setError(cause instanceof Error ? cause.message : "Unable to initialize Firebase authentication."); setLoading(false); } });
    }
    return () => { active = false; unsubscribe?.(); };
  }, [establish, pathname]);

  const authenticate = useCallback(async (operation: () => Promise<{ user: User }>, fallback: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await operation();
      setUser(result.user);
      await establish(result.user);
    } catch (cause) {
      setError(cause instanceof PlatformApiError ? platformErrorMessage(cause) : firebaseErrorMessage(cause, fallback));
      throw cause;
    } finally {
      setLoading(false);
    }
  }, [establish]);

  const signIn = useCallback((credentials: EmailPasswordCredentials) => authenticate(() => signInWithEmailAndPassword(firebaseAuth(), credentials.email, credentials.password), "Unable to sign in with email and password."), [authenticate]);
  const signUp = useCallback((credentials: EmailPasswordCredentials) => authenticate(() => createUserWithEmailAndPassword(firebaseAuth(), credentials.email, credentials.password), "Unable to create the Firebase account."), [authenticate]);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    let platformFailure: unknown;
    try { await logoutPlatformSession(); } catch (cause) { platformFailure = cause; } finally {
      await signOut(firebaseAuth());
      setUser(null);
      setPlatformSessionEstablished(false);
      setLoading(false);
    }
    if (platformFailure) { setError("Firebase was signed out, but the Platform logout request could not be completed."); throw platformFailure; }
  }, []);

  const markPlatformSessionEstablished = useCallback(() => { setPlatformSessionEstablished(true); setError(null); setLoading(false); }, []);

  return <AuthContext.Provider value={{ user, loading, error, platformSessionEstablished, signIn, signUp, logout, markPlatformSessionEstablished }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider.");
  return value;
}
