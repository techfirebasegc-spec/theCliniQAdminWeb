"use client";
import { AdminShell } from "../../../../src/components/admin-shell";
import { PlatformClinicOnboarding } from "../../../../src/components/tenant-owner-onboarding";
import { ProtectedRoute } from "../../../../src/components/protected-route";
export default function PlatformClinicPage() { return <ProtectedRoute><AdminShell><PlatformClinicOnboarding /></AdminShell></ProtectedRoute>; }
