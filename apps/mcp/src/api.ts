export class SwiperApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function apiBase() {
  return (process.env.SWIPER_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function apiKey() {
  const key = process.env.SWIPER_API_KEY;
  if (!key) {
    throw new SwiperApiError(
      "MISSING_API_KEY",
      "Set SWIPER_API_KEY to a key minted at /connect.",
    );
  }
  return key;
}

export async function swiperFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as T & {
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
  return body;
}
