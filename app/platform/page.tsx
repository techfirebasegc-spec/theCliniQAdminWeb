"use client";
import { AdminShell } from "../../src/components/admin-shell";
import { PlatformDashboard } from "../../src/components/platform-console";
import { ProtectedRoute } from "../../src/components/protected-route";
export default function PlatformPage() { return <ProtectedRoute><AdminShell><PlatformDashboard /></AdminShell></ProtectedRoute>; }
