"use client";

import { useParams } from "next/navigation";
import { AdminShell } from "../../../../src/components/admin-shell";
import { ClinicApplicationDetails } from "../../../../src/components/platform-console";
import { ProtectedRoute } from "../../../../src/components/protected-route";

export default function Page() { const params = useParams<{ applicationId: string }>(); return <ProtectedRoute><AdminShell><ClinicApplicationDetails applicationId={params.applicationId} /></AdminShell></ProtectedRoute>; }
