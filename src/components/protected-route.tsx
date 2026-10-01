"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../providers/auth-provider";
import { LoadingState, ErrorState } from "./ui";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const { user, loading, error, platformSessionEstablished } = useAuth();
  useEffect(() => { if (!loading && (!user || !platformSessionEstablished)) router.replace("/login"); }, [loading, user, platformSessionEstablished, router]);
  if (loading) return <main className="guard"><LoadingState label="Checking your secure session…" /></main>;
  if (!user || !platformSessionEstablished) return <main className="guard">{error ? <ErrorState detail={error} /> : <LoadingState label="Redirecting to sign in…" />}</main>;
  return <>{children}</>;
}
