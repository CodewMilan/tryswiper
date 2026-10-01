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
  /\b(\d{2,3}% of (all )?(users|customers|founders|companies)|used by \d{2,}k|\d+x (roi|growth|faster)|#1 (platform|tool|app))\b/i;

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
  return `${(lastSpace > 40 ? sliced.slice(0, lastSpace) : sliced).trim()}`;
}
