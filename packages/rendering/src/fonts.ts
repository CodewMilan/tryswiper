import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GlobalFonts } from "@napi-rs/canvas";

const FACES = [
  { max: 449, family: "Inter", file: "Inter-Regular.ttf" },
  { max: 549, family: "Inter Medium", file: "Inter-Medium.ttf" },
  { max: 649, family: "Inter SemiBold", file: "Inter-SemiBold.ttf" },
  { max: 749, family: "Inter Bold", file: "Inter-Bold.ttf" },
  { max: 900, family: "Inter ExtraBold", file: "Inter-ExtraBold.ttf" },
] as const;

let registered = false;

function fontFile(file: string) {
  const here = join(dirname(fileURLToPath(import.meta.url)), "../fonts", file);
  const fromWeb = join(process.cwd(), "../../packages/rendering/fonts", file);
  const fromRoot = join(process.cwd(), "packages/rendering/fonts", file);
  const found = [here, fromWeb, fromRoot].find((path) => existsSync(path));
  if (!found) {
    throw new Error(`Missing font file ${file}. Expected it in packages/rendering/fonts.`);
  }
  return found;
}

export function registerFonts() {
  if (registered) return;
  for (const face of FACES) {
    GlobalFonts.registerFromPath(fontFile(face.file), face.family);
  }
  registered = true;
}

export function familyForWeight(weight: number) {
  const face = FACES.find((item) => weight <= item.max);
  return face?.family ?? "Inter ExtraBold";
}
