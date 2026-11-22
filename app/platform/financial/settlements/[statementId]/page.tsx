"use client";

import { useParams } from "next/navigation";
import { AdminShell } from "../../../../../src/components/admin-shell";
import { FinancialSettlementDetailView } from "../../../../../src/components/financial-settlement-detail-view";
import { ProtectedRoute } from "../../../../../src/components/protected-route";

export default function Page() {
  const params = useParams<{ statementId: string }>();
  return (
    <ProtectedRoute>
      <AdminShell>
        <FinancialSettlementDetailView statementId={params.statementId} />
      </AdminShell>
    </ProtectedRoute>
  );
}
