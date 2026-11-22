"use client";

import { AdminShell } from "../../../../src/components/admin-shell";
import { FinancialTransactionsView } from "../../../../src/components/financial-transactions-view";
import { ProtectedRoute } from "../../../../src/components/protected-route";

export default function Page() {
  return (
    <ProtectedRoute>
      <AdminShell>
        <FinancialTransactionsView />
      </AdminShell>
    </ProtectedRoute>
  );
}
