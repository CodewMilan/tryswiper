export const FORBIDDEN_PHRASES = [
  "game-changing",
  "game changer",
  "revolutionary",
  "unlock your potential",
  "in today's fast-paced",
  "delve",
  "leverage synergy",
  "next-level",
  "cutting-edge solution",
  "in the digital age",
];

export const TEXT_LIMITS: Record<string, number> = {
  headline: 90,
  kicker: 42,
  body: 220,
  proof: 160,
  cta: 42,
  subhead: 120,
  caption: 140,
  label: 32,
  annotation: 80,
};

const FAKE_PROOF =
  /(?:\b\d+(?:[.,]\d+)?\s*(?:%|percent|x\s+(?:roi|growth|faster))|\b(?:trusted|used|loved|chosen)\s+by\s+[\d,]+(?:k|m)?\b|\bguarantee(?:d|s)?\b|\b(?:double|triple)\s+(?:your\s+)?(?:revenue|sales|income|growth|profit)|#1\s+(?:platform|tool|app))/i;

export function unsupportedClaimClauses(text: string, allowedProof: string[] = []) {
  const normalize = (value: string) => value.toLowerCase().trim().replace(/[.!?]+$/, "").replace(/\s+/g, " ");
  const allowed = new Set(allowedProof.filter((item) => item.trim()).map(normalize));
  return text.split(/(?<=[.!?])\s+|[;\n]+/).filter((clause) => looksLikeUnsupportedClaim(clause) && !allowed.has(normalize(clause)));
}

export function findForbiddenPhrases(text: string) {
  const lower = text.toLowerCase();
  return FORBIDDEN_PHRASES.filter((phrase) => lower.includes(phrase));
}

export function looksLikeUnsupportedClaim(text: string) {
  return FAKE_PROOF.test(text);
}

export function clip(text: string, max: number) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const sliced = trimmed.slice(0, max - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  return `${(lastSpace > Math.min(24, max / 2) ? sliced.slice(0, lastSpace) : sliced).trim()}`;
}
