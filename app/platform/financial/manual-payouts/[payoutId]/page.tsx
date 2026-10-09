"use client";

import { useParams } from "next/navigation";
import { AdminShell } from "../../../../../src/components/admin-shell";
import { ManualPayoutDetails } from "../../../../../src/components/financial-operations";
import { ProtectedRoute } from "../../../../../src/components/protected-route";

export default function Page() { const params = useParams<{ payoutId: string }>(); return <ProtectedRoute><AdminShell><ManualPayoutDetails payoutId={params.payoutId} /></AdminShell></ProtectedRoute>; }
