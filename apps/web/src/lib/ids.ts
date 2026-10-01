import { createHash, randomBytes } from "node:crypto";

export function sid(prefix: string) {
  return `${prefix}_${randomBytes(10).toString("hex")}`;
}

export function createMcpKey() {
  const secret = randomBytes(24).toString("hex");
  const key = `sk_swiper_${secret}`;
  return {
    key,
    keyHash: hashMcpKey(key),
    keyPrefix: key.slice(0, 16),
  };
}

export function hashMcpKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}
