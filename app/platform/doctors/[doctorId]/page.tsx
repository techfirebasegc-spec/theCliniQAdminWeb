"use client";
import { useParams } from "next/navigation";
import { AdminShell } from "../../../../src/components/admin-shell";
import { DoctorDetails } from "../../../../src/components/platform-console";
import { ProtectedRoute } from "../../../../src/components/protected-route";
export default function Page() { const params = useParams<{ doctorId: string }>(); return <ProtectedRoute><AdminShell><DoctorDetails doctorId={params.doctorId} /></AdminShell></ProtectedRoute>; }
