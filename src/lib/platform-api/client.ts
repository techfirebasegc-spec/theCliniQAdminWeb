export class PlatformApiError extends Error {
  constructor(public readonly status: number, public readonly code?: string, public readonly requestId?: string, message = "Unable to complete the Platform request.") { super(message); }
}

type ErrorBody = { error?: { code?: unknown; message?: unknown; requestId?: unknown } };

function url(path: string) { return `${process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL?.replace(/\/$/, "") ?? ""}${path}`; }

type SessionRenewCallback = () => Promise<boolean>;
let sessionRenewalCallback: SessionRenewCallback | null = null;
let renewalPromise: Promise<boolean> | null = null;

export function registerSessionRenewCallback(callback: SessionRenewCallback | null) {
  sessionRenewalCallback = callback;
}

export async function platformRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response = await fetch(url(path), { ...init, credentials: "include" });

  // If 401 and not an authentication endpoint, attempt silent token refresh and session renewal once
  if (response.status === 401 && !path.startsWith("/v1/auth/") && sessionRenewalCallback) {
    if (!renewalPromise) {
      renewalPromise = sessionRenewalCallback().finally(() => { renewalPromise = null; });
    }
    const renewed = await renewalPromise;
    if (renewed) {
      response = await fetch(url(path), { ...init, credentials: "include" });
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null) as ErrorBody | null;
    const error = body?.error;
    throw new PlatformApiError(response.status, typeof error?.code === "string" ? error.code : undefined, typeof error?.requestId === "string" ? error.requestId : undefined, typeof error?.message === "string" ? error.message : undefined);
  }
  const body = await response.text();
  return body.trim() ? JSON.parse(body) as T : undefined as T;
}

export function platformPost<T>(path: string, body?: unknown): Promise<T> {
  return platformRequest<T>(path, { method: "POST", headers: body === undefined ? undefined : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
}

export function platformPatch<T>(path: string, body: unknown): Promise<T> {
  return platformRequest<T>(path, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

export function platformPut<T>(path: string, body: unknown): Promise<T> {
  return platformRequest<T>(path, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

export function platformDelete<T>(path: string): Promise<T> { return platformRequest<T>(path, { method: "DELETE" }); }

export async function platformDownload(path: string): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(url(path), { credentials: "include" });
  } catch (err) {
    throw new PlatformApiError(0, "NETWORK_ERROR", undefined, err instanceof Error ? err.message : "Network request failed");
  }

  if (response.status === 401 && !path.startsWith("/v1/auth/") && sessionRenewalCallback) {
    if (!renewalPromise) {
      renewalPromise = sessionRenewalCallback().finally(() => { renewalPromise = null; });
    }
    const renewed = await renewalPromise;
    if (renewed) {
      try {
        response = await fetch(url(path), { credentials: "include" });
      } catch (err) {
        throw new PlatformApiError(0, "NETWORK_ERROR", undefined, err instanceof Error ? err.message : "Network request failed");
      }
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null) as ErrorBody | null;
    const error = body?.error;
    throw new PlatformApiError(response.status, typeof error?.code === "string" ? error.code : undefined, typeof error?.requestId === "string" ? error.requestId : undefined, typeof error?.message === "string" ? error.message : undefined);
  }
  return response.blob();
}
