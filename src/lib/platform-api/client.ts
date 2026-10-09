export class PlatformApiError extends Error {
  constructor(public readonly status: number, public readonly code?: string, public readonly requestId?: string, message = "Unable to complete the Platform request.") { super(message); }
}

type ErrorBody = { error?: { code?: unknown; message?: unknown; requestId?: unknown } };

function url(path: string) { return `${process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL?.replace(/\/$/, "") ?? ""}${path}`; }

export async function platformRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url(path), { ...init, credentials: "include" });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as ErrorBody | null;
    const error = body?.error;
    throw new PlatformApiError(response.status, typeof error?.code === "string" ? error.code : undefined, typeof error?.requestId === "string" ? error.requestId : undefined, typeof error?.message === "string" ? error.message : undefined);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function platformPost<T>(path: string, body?: unknown): Promise<T> {
  return platformRequest<T>(path, { method: "POST", headers: body === undefined ? undefined : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
}

export function platformPatch<T>(path: string, body: unknown): Promise<T> {
  return platformRequest<T>(path, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

export function platformDelete<T>(path: string): Promise<T> { return platformRequest<T>(path, { method: "DELETE" }); }

export async function platformDownload(path: string): Promise<Blob> {
  const response = await fetch(url(path), { credentials: "include" });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as ErrorBody | null;
    const error = body?.error;
    throw new PlatformApiError(response.status, typeof error?.code === "string" ? error.code : undefined, typeof error?.requestId === "string" ? error.requestId : undefined, typeof error?.message === "string" ? error.message : undefined);
  }
  return response.blob();
}
