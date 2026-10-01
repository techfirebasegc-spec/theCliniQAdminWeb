import { PlatformApiError, platformPost } from "./client";

export { PlatformApiError } from "./client";

export function establishPlatformSession(idToken: string) { return platformPost<void>("/v1/auth/admin/firebase/session", { idToken }); }
export function establishTenantPlatformSession(idToken: string) { return platformPost<void>("/v1/auth/tenant/firebase/session", { idToken }); }
export async function logoutPlatformSession() {
  try { await platformPost<void>("/v1/auth/session/logout"); }
  catch (cause) { if (cause instanceof PlatformApiError && cause.status === 401) return; throw cause; }
}
