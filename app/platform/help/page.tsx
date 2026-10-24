"use client";
import { AdminShell } from "../../../src/components/admin-shell";
import { AdminHelpCenter } from "../../../src/components/admin-help-center";
import { ProtectedRoute } from "../../../src/components/protected-route";
export default function Page() { return <ProtectedRoute><AdminShell><AdminHelpCenter /></AdminShell></ProtectedRoute>; }
