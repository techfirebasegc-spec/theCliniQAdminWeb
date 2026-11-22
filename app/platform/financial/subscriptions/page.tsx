"use client";

import { AdminShell } from "../../../../src/components/admin-shell";
import { FinancialSubscriptionsView } from "../../../../src/components/financial-subscriptions-view";
import { ProtectedRoute } from "../../../../src/components/protected-route";

export default function Page() {
  return (
    <ProtectedRoute>
      <AdminShell>
        <FinancialSubscriptionsView />
      </AdminShell>
    </ProtectedRoute>
  );
}
