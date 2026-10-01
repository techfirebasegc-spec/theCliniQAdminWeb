"use client";
import { AdminShell } from "../../../src/components/admin-shell";
import { DoctorsPage } from "../../../src/components/platform-console";
import { ProtectedRoute } from "../../../src/components/protected-route";
export default function Page() { return <ProtectedRoute><AdminShell><DoctorsPage /></AdminShell></ProtectedRoute>; }
