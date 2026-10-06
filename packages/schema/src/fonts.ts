export const CAROUSEL_FONTS = ["Inter", "Lora", "IBM Plex Mono"] as const;

/** Older system-font choices now map to portable, bundled equivalents. */
export function carouselFontFamily(font: string | undefined): string {
  if (font === "Georgia" || font === "Times New Roman" || font === "Lora") return "Lora";
  if (font === "Courier New" || font === "IBM Plex Mono") return "IBM Plex Mono";
  return "Inter";
}
