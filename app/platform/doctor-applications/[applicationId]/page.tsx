"use client";

import { useParams } from "next/navigation";
import { AdminShell } from "../../../../src/components/admin-shell";
import { DoctorApplicationDetails } from "../../../../src/components/platform-console";
import { ProtectedRoute } from "../../../../src/components/protected-route";

export default function Page() { const params = useParams<{ applicationId: string }>(); return <ProtectedRoute><AdminShell><DoctorApplicationDetails applicationId={params.applicationId} /></AdminShell></ProtectedRoute>; }
