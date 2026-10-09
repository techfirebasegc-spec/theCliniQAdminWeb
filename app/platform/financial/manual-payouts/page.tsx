"use client";

import { AdminShell } from "../../../../src/components/admin-shell";
import { ManualPayoutQueue } from "../../../../src/components/financial-operations";
import { ProtectedRoute } from "../../../../src/components/protected-route";

export default function Page() { return <ProtectedRoute><AdminShell><ManualPayoutQueue /></AdminShell></ProtectedRoute>; }
