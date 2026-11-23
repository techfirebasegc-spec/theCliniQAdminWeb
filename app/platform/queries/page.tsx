"use client";

import { AdminShell } from "../../../src/components/admin-shell";
import { QueryCentre } from "../../../src/components/query-centre";
import { ProtectedRoute } from "../../../src/components/protected-route";

export default function Page() {
  return (
    <ProtectedRoute>
      <AdminShell>
        <QueryCentre />
      </AdminShell>
    </ProtectedRoute>
  );
}
