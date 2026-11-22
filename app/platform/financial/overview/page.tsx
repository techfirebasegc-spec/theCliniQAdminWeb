"use client";

import { AdminShell } from "../../../../src/components/admin-shell";
import { FinancialDashboardView } from "../../../../src/components/financial-dashboard-view";
import { ProtectedRoute } from "../../../../src/components/protected-route";

export default function Page() {
  return (
    <ProtectedRoute>
      <AdminShell>
        <FinancialDashboardView />
      </AdminShell>
    </ProtectedRoute>
  );
}
