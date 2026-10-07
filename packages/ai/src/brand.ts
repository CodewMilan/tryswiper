export type BrandContext = {
  name: string;
  description?: string | null;
  audience?: string | null;
  positioning?: string | null;
  tone?: string | null;
  wordsToUse?: string[];
  wordsToAvoid?: string[];
  cta?: string | null;
  proofPoints?: string[];
  website?: string | null;
  colors?: { background?: string; primary?: string; secondary?: string; accent?: string };
  fonts?: { heading?: string; body?: string };
  hasLogo?: boolean;
  guidelines?: string | null;
};

export function compactBrand(brand: BrandContext) {
  return [
    `Product: ${brand.name}`,
    brand.audience ? `Audience: ${brand.audience}` : null,
    brand.positioning ? `Positioning: ${brand.positioning}` : null,
    brand.description ? `Description: ${brand.description}` : null,
    brand.tone ? `Tone: ${brand.tone}` : null,
    brand.cta ? `CTA: ${brand.cta}` : null,
    brand.proofPoints?.length ? `Proof: ${brand.proofPoints.join("; ")}` : null,
    brand.wordsToAvoid?.length ? `Avoid: ${brand.wordsToAvoid.join(", ")}` : null,
    brand.wordsToUse?.length ? `Prefer: ${brand.wordsToUse.join(", ")}` : null,
    brand.guidelines ? `Guidelines: ${brand.guidelines}` : null,
    brand.colors
      ? `Colors: background ${brand.colors.background ?? ""}, text ${brand.colors.primary ?? ""}, body ${brand.colors.secondary ?? ""}, accent ${brand.colors.accent ?? ""}`
      : null,
    brand.fonts
      ? `Fonts: heading ${brand.fonts.heading ?? "Inter"}, body ${brand.fonts.body ?? "Inter"}`
      : null,
    brand.hasLogo ? "Logo: set" : null,
  ]
    .filter(Boolean)
    .join("\n");
}
