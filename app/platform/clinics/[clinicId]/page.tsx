"use client";
import { useParams } from "next/navigation";
import { AdminShell } from "../../../../src/components/admin-shell";
import { ClinicDetails } from "../../../../src/components/platform-console";
import { ProtectedRoute } from "../../../../src/components/protected-route";
export default function Page() { const params = useParams<{ clinicId: string }>(); return <ProtectedRoute><AdminShell><ClinicDetails clinicId={params.clinicId} /></AdminShell></ProtectedRoute>; }
