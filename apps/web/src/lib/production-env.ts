const PLACEHOLDER_SECRET = "replace-with-a-long-random-secret";

export function productionEnvErrors(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV !== "production") return [];
  if (env.NEXT_PHASE === "phase-production-build") return [];

  const secret = env.BETTER_AUTH_SECRET ?? "";
  const origin = env.BETTER_AUTH_URL ?? env.APP_URL ?? env.NEXT_PUBLIC_APP_URL ?? "";
  const database = env.DATABASE_URL ?? "";
  const problems: string[] = [];

  if (secret.length < 32 || secret === PLACEHOLDER_SECRET) {
    problems.push("BETTER_AUTH_SECRET must be a random string of at least 32 characters.");
  }
  if (!database) {
    problems.push("DATABASE_URL is not set.");
  }
  if (!publicOriginOk(origin)) {
    problems.push("BETTER_AUTH_URL must be the public https origin of this app.");
  }
  return problems;
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
