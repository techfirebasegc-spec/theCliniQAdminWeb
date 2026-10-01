"use client";

import { AdminShell } from "../../src/components/admin-shell";
import { AppointmentsPageContent } from "../../src/components/admin-read-pages";
import { ProtectedRoute } from "../../src/components/protected-route";

export default function AppointmentsPage() {
  return <ProtectedRoute><AdminShell><AppointmentsPageContent /></AdminShell></ProtectedRoute>;
}
