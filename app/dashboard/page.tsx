"use client";

import { AdminShell } from "../../src/components/admin-shell";
import { Dashboard } from "../../src/components/dashboard";
import { ProtectedRoute } from "../../src/components/protected-route";

export default function DashboardPage() {
  return <ProtectedRoute><AdminShell><Dashboard /></AdminShell></ProtectedRoute>;
}
