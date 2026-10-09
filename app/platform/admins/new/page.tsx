"use client";

import { AdminShell } from "../../../../src/components/admin-shell";
import { PlatformAdminCreationPage } from "../../../../src/components/platform-admin-creation";
import { ProtectedRoute } from "../../../../src/components/protected-route";

export default function Page() {
  return <ProtectedRoute><AdminShell><PlatformAdminCreationPage /></AdminShell></ProtectedRoute>;
}
