"use client";
import { AdminShell } from "../../../src/components/admin-shell";
import { ClinicsPage } from "../../../src/components/platform-console";
import { ProtectedRoute } from "../../../src/components/protected-route";
export default function Page() { return <ProtectedRoute><AdminShell><ClinicsPage /></AdminShell></ProtectedRoute>; }
