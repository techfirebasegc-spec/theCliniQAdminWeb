"use client";

import { AdminShell } from "../../../src/components/admin-shell";
import { PlatformSettings } from "../../../src/components/platform-settings";
import { ProtectedRoute } from "../../../src/components/protected-route";

export default function SettingsPage() {
  return <ProtectedRoute><AdminShell><PlatformSettings /></AdminShell></ProtectedRoute>;
}
