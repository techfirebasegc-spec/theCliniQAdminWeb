"use client";

import { AdminShell } from "../../../../src/components/admin-shell";
import { FinancialReconciliationQueue } from "../../../../src/components/financial-operations";
import { ProtectedRoute } from "../../../../src/components/protected-route";

export default function FinancialReconciliationPage() {
  return <ProtectedRoute><AdminShell><FinancialReconciliationQueue /></AdminShell></ProtectedRoute>;
}
