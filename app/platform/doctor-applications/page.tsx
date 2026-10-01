"use client";

import { AdminShell } from "../../../src/components/admin-shell";
import { DoctorApplicationsPage } from "../../../src/components/platform-console";
import { ProtectedRoute } from "../../../src/components/protected-route";

export default function Page() { return <ProtectedRoute><AdminShell><DoctorApplicationsPage /></AdminShell></ProtectedRoute>; }
