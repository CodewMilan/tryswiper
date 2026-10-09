export const REFERENCE_FALLBACK_NOTICE = "Couldn’t read that post — generating from your brief.";
export const LOCAL_GENERATION_NOTICE =
  "This draft used a local template, not the AI model. Review every line before you export.";
export const THIN_BRAND_NOTICE =
  "Your brand kit is missing a product description or audience, so this draft is generic. Add those on Brand, then generate again.";

export type GenerationWarning = {
  code: "REFERENCE_UNAVAILABLE" | "LOCAL_GENERATION" | "THIN_BRAND";
  message: string;
};

export function localGenerationWarning(): GenerationWarning {
  return { code: "LOCAL_GENERATION", message: LOCAL_GENERATION_NOTICE };
}

export function thinBrandWarning(): GenerationWarning {
  return { code: "THIN_BRAND", message: THIN_BRAND_NOTICE };
}

export function isThinBrand(brand: {
  name?: string | null;
  description?: string | null;
  audience?: string | null;
} | null | undefined) {
  if (!brand) return true;
  return !brand.description?.trim() || !brand.audience?.trim();
}
