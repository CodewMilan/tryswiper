export const COLOR_KEYS = ["background", "primary", "secondary", "accent"] as const;

export type BrandColorKey = (typeof COLOR_KEYS)[number];

export type BrandColors = Record<BrandColorKey, string>;

export type BrandFonts = { heading: string; body: string };

export const FONT_CHOICES = [
  "Inter",
  "Georgia",
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Courier New",
] as const;

export const DEFAULT_BRAND_COLORS: BrandColors = {
  background: "#FAFAF8",
  primary: "#171717",
  secondary: "#525252",
  accent: "#C2410C",
};

export const DEFAULT_BRAND_FONTS: BrandFonts = {
  heading: "Inter",
  body: "Inter",
};

export function normalizeHex(value: string): string | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const hex = match[1]!;
  const full = hex.length === 3 ? hex.split("").map((char) => char + char).join("") : hex;
  return `#${full.toUpperCase()}`;
}

export function isFontChoice(value: string) {
  return (FONT_CHOICES as readonly string[]).includes(value);
}
