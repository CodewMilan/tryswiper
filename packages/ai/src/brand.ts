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
  ]
    .filter(Boolean)
    .join("\n");
}
