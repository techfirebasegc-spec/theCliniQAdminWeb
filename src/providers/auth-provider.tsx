"use client";

import { User, createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { firebaseAuth } from "../lib/firebase";
import { PlatformApiError, establishPlatformSession, establishTenantPlatformSession, logoutPlatformSession } from "../lib/platform-api/auth";
import { registerSessionRenewCallback } from "../lib/platform-api/client";

type EmailPasswordCredentials = { email: string; password: string };
type AuthContextValue = {
  user: User | null;
  loading: boolean;
  error: string | null;
  platformSessionEstablished: boolean;
  signIn: (credentials: EmailPasswordCredentials) => Promise<void>;
  signUp: (credentials: EmailPasswordCredentials) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== "undefined") {
      return firebaseAuth().currentUser;
    }
    return null;
  });
  const [platformSessionEstablished, setPlatformSessionEstablished] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("cliniq_admin_session_active") === "true";
    }
    return false;
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("cliniq_admin_session_active") !== "true";
    }
    return true;
  });
  const [error, setError] = useState<string | null>(null);
  const exchange = useRef<Promise<void> | null>(null);
  const pathnameRef = useRef(pathname);

  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  const establish = useCallback(async (nextUser: User, forceRefresh = false) => {
    if (exchange.current) return exchange.current;
    const establishSession = nextUser.providerData.some((provider) => provider.providerId === "google.com") ? establishTenantPlatformSession : establishPlatformSession;
    const request = establishSession(await nextUser.getIdToken(forceRefresh))
      .then(() => {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("cliniq_admin_session_active", "true");
        }
        setPlatformSessionEstablished(true);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (typeof window !== "undefined" && sessionStorage.getItem("cliniq_admin_session_active") !== "true") {
          setPlatformSessionEstablished(false);
        }
        setError(platformErrorMessage(cause));
        throw cause;
      })
      .finally(() => { exchange.current = null; });
    exchange.current = request;
    return request;
  }, []);

  const renewSession = useCallback(async (): Promise<boolean> => {
    try {
      const auth = firebaseAuth();
      if (typeof auth.authStateReady === "function") {
        await auth.authStateReady();
      }
      let current = auth.currentUser;
      if (!current) {
        current = await new Promise<User | null>((resolve) => {
          const timeout = setTimeout(() => { unsub(); resolve(null); }, 2500);
          const unsub = onAuthStateChanged(auth, (u) => {
            clearTimeout(timeout);
            unsub();
            resolve(u);
          });
        });
      }
      if (!current) return false;
      await establish(current, true);
      return true;
    } catch {
      return false;
    }
  }, [establish]);

  useEffect(() => {
    registerSessionRenewCallback(renewSession);
    return () => { registerSessionRenewCallback(null); };
  }, [renewSession]);

  // Proactive keep-alive: periodic touch every 10 min and on tab focus to prevent 30-minute idle expiration
  useEffect(() => {
    if (!platformSessionEstablished) return;
    let lastKeepAlive = Date.now();
    const KEEP_ALIVE_INTERVAL = 10 * 60 * 1000; // 10 minutes

    const touchSession = async () => {
      const now = Date.now();
      if (now - lastKeepAlive < 60 * 1000) return;
      lastKeepAlive = now;
      try {
        const auth = firebaseAuth();
        const current = auth.currentUser;
        if (current) {
          await establish(current, false);
        }
      } catch {
        // Ignored; transparent retry on next API call handles if needed
      }
    };

    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        void touchSession();
      }
    }, KEEP_ALIVE_INTERVAL);

    const onVisibilityOrFocus = () => {
      if (typeof document !== "undefined" && !document.hidden && Date.now() - lastKeepAlive >= KEEP_ALIVE_INTERVAL) {
        void touchSession();
      }
    };

    window.addEventListener("focus", onVisibilityOrFocus);
    document.addEventListener("visibilitychange", onVisibilityOrFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", onVisibilityOrFocus);
      document.removeEventListener("visibilitychange", onVisibilityOrFocus);
    };
  }, [platformSessionEstablished, establish]);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = onAuthStateChanged(firebaseAuth(), async (nextUser) => {
        if (!active) return;
        setUser(nextUser);
        if (!nextUser) {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("cliniq_admin_session_active");
          }
          setPlatformSessionEstablished(false);
          setLoading(false);
          return;
        }
        if (pathnameRef.current === "/accept-invitation") {
          setPlatformSessionEstablished(false);
          setLoading(false);
          return;
        }
        try {
          await establish(nextUser);
        } catch {
          // If establish fails and we had no previous active session
          if (typeof window !== "undefined" && sessionStorage.getItem("cliniq_admin_session_active") !== "true") {
            setPlatformSessionEstablished(false);
          }
        } finally {
          if (active) setLoading(false);
        }
      });
    } catch (cause) {
      queueMicrotask(() => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Unable to initialize Firebase authentication.");
          setLoading(false);
        }
      });
    }
    return () => { active = false; unsubscribe?.(); };
  }, [establish]);

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

  const resetPassword = useCallback(async (emailAddress: string) => {
    const normalized = emailAddress.trim();
    if (!normalized) throw new Error("Please enter your registered email address.");
    try {
      await sendPasswordResetEmail(firebaseAuth(), normalized);
    } catch (cause) {
      throw new Error(firebaseErrorMessage(cause, "Failed to send password reset email."));
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    let platformFailure: unknown;
    try { await logoutPlatformSession(); } catch (cause) { platformFailure = cause; } finally {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("cliniq_admin_session_active");
      }
      await signOut(firebaseAuth());
      setUser(null);
      setPlatformSessionEstablished(false);
      setLoading(false);
    }
    if (platformFailure) { setError("Firebase was signed out, but the Platform logout request could not be completed."); throw platformFailure; }
  }, []);

  const markPlatformSessionEstablished = useCallback(() => { setPlatformSessionEstablished(true); setError(null); setLoading(false); }, []);

  return <AuthContext.Provider value={{ user, loading, error, platformSessionEstablished, signIn, signUp, resetPassword, logout, markPlatformSessionEstablished }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider.");
  return value;
}
