"use client";

import { AdminShell } from "../../src/components/admin-shell";
import { ServicesPageContent } from "../../src/components/admin-read-pages";
import { ProtectedRoute } from "../../src/components/protected-route";

export default function ServicesPage() {
  return <ProtectedRoute><AdminShell><ServicesPageContent /></AdminShell></ProtectedRoute>;
}
