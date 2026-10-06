export const E2E_COOKIE = "swiper_e2e_session";

export function clerkConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

export function e2eEnabled(host: string | null) {
  if (process.env.SWIPER_E2E !== "1") return false;
  const hostname = host?.split(":")[0] ?? "";
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function isE2eUserId(value: string | undefined): value is string {
  return !!value && /^usr_[a-f0-9]{20}$/.test(value);
}
