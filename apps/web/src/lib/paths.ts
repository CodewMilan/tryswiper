const BLOCKED = ["/login", "/signup", "/sso-callback"];

/** Same-origin path only. Auth screens are never a post-login destination. */
export function safeNextPath(value: string | null | undefined, fallback = "/connect") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  const path = value.split("?")[0]?.split("#")[0] ?? value;
  if (BLOCKED.some((blocked) => path === blocked || path.startsWith(`${blocked}/`))) {
    return fallback;
  }
  return value;
}
