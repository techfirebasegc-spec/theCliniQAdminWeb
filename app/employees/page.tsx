"use client";

import { AdminShell } from "../../src/components/admin-shell";
import { EmployeesPageContent } from "../../src/components/admin-read-pages";
import { ProtectedRoute } from "../../src/components/protected-route";

export default function EmployeesPage() {
  return <ProtectedRoute><AdminShell><EmployeesPageContent /></AdminShell></ProtectedRoute>;
}
