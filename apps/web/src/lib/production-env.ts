export function productionEnvErrors(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV !== "production") return [];
  if (env.NEXT_PHASE === "phase-production-build") return [];

  const origin = env.APP_URL ?? env.NEXT_PUBLIC_APP_URL ?? "";
  const database = env.DATABASE_URL ?? "";
  const problems: string[] = [];
  const e2e = env.SWIPER_E2E === "1";

  if (!database) {
    problems.push("DATABASE_URL is not set.");
  }
  if (e2e) {
    if (!localhostOrigin(origin)) {
      problems.push("SWIPER_E2E cannot be enabled on a public origin.");
    }
    return problems;
  }
  if (!env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_")) {
    problems.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set.");
  }
  if (!env.CLERK_SECRET_KEY?.startsWith("sk_")) {
    problems.push("CLERK_SECRET_KEY is not set.");
  }
  if (!publicOriginOk(origin)) {
    problems.push("APP_URL must be the public https origin of this app.");
  }
  return problems;
}

function localhostOrigin(value: string) {
  try {
    const url = new URL(value);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function publicOriginOk(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

export function assertProductionEnv() {
  const problems = productionEnvErrors();
  if (problems.length === 0) return;
  throw new Error(`Refusing to start:\n${problems.map((problem) => `- ${problem}`).join("\n")}`);
}
