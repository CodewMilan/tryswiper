export class SwiperApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export type SwiperCredentials = {
  key: string;
  base: string;
};

export function apiBase(credentials?: SwiperCredentials) {
  return (credentials?.base ?? process.env.SWIPER_API_URL ?? "http://localhost:3100").replace(
    /\/$/,
    "",
  );
}

export function apiKey(credentials?: SwiperCredentials) {
  const key = credentials?.key ?? process.env.SWIPER_API_KEY;
  if (!key) {
    throw new SwiperApiError(
      "MISSING_API_KEY",
      "Set SWIPER_API_KEY to a key minted at /connect.",
    );
  }
  return key;
}

export async function swiperFetch<T>(
  path: string,
  init?: RequestInit,
  credentials?: SwiperCredentials,
): Promise<T> {
  const response = await swiperResponse(path, init, credentials);
  return await response.json() as T;
}

/** Authenticated binary/JSON requests share the same timeout and error handling. */
export async function swiperResponse(path: string, init?: RequestInit, credentials?: SwiperCredentials): Promise<Response> {
  let response: Response;
  try { response = await fetch(`${apiBase(credentials)}${path}`, {
    ...init,
    signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(90000)]) : AbortSignal.timeout(90000),
    headers: {
      Authorization: `Bearer ${apiKey(credentials)}`,
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
  }); } catch {
    throw new SwiperApiError("REQUEST_INTERRUPTED", "The request timed out or the connection was interrupted. Retry with the same request ID, or check get_request_status before creating again.");
  }
  if (response.ok) return response;
  const body = (await response.json().catch(() => ({}))) as {
    code?: string;
    message?: string;
    details?: unknown;
  };
  if (!response.ok) {
    throw new SwiperApiError(
      body.code ?? "HTTP_ERROR",
      body.message ?? `Swiper API ${response.status}`,
      body.details,
    );
  }
  return response;
}
