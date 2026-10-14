import type { CarouselElement, LayoutType, Slide } from "./carousel";

type Box = Pick<CarouselElement, "x" | "y" | "width" | "height">;
const box = (x: number, y: number, width: number, height: number): Box => ({ x, y, width, height });

/** Reflow the first semantic slot of each kind; preserve copy, assets, IDs and typography. */
export function arrangeSlide(slide: Slide, layout: LayoutType): Slide {
  const slots: Partial<Record<string, Box>> = {
    kicker: box(80, 96, 920, 48), headline: box(80, 180, 920, 380),
    body: box(80, 620, 920, 340), proof: box(80, 980, 920, 160), cta: box(80, 1180, 920, 80),
  };
  let image = box(80, 690, 920, 450);
  if (layout === "split") {
    slots.headline = box(80, 220, 420, 750);
    slots.body = box(580, 220, 420, 650);
    slots.proof = box(580, 910, 420, 220);
    image = box(580, 880, 420, 260);
  } else if (layout === "image-left" || layout === "image-right") {
    const textX = layout === "image-left" ? 590 : 80;
    image = box(layout === "image-left" ? 80 : 590, 200, 410, 900);
    slots.headline = box(textX, 220, 410, 450);
    slots.body = box(textX, 700, 410, 310);
    slots.proof = box(textX, 1040, 410, 120);
  } else if (layout === "list") {
    slots.headline = box(80, 180, 920, 220);
    slots.body = box(120, 450, 880, 650);
    slots.proof = box(120, 1120, 880, 120);
  } else if (layout === "comparison") {
    slots.headline = box(80, 180, 920, 280);
    slots.body = box(80, 560, 420, 560);
    slots.proof = box(580, 560, 420, 560);
    image = box(580, 560, 420, 560);
  } else if (layout === "quote") {
    slots.headline = box(120, 280, 840, 520);
    slots.body = box(120, 850, 840, 180);
    slots.proof = box(120, 1060, 840, 140);
  } else if (layout === "cta") {
    slots.headline = box(80, 360, 920, 280);
    slots.body = box(80, 680, 920, 240);
    slots.cta = box(80, 980, 920, 100);
  } else if (layout === "centered") {
    slots.headline = box(140, 260, 800, 420);
    slots.body = box(140, 740, 800, 280);
  }
  const moved = new Set<string>();
  return { ...slide, layout, elements: slide.elements.map((element) => {
    const key = element.type === "image" ? "image" : element.type === "text" ? element.role : undefined;
    if (!key || moved.has(key)) return element;
    const target = key === "image" ? image : slots[key];
    if (!target) return element;
    moved.add(key);
    return { ...element, ...target, ...(element.style ? { style: { ...element.style, align: layout === "centered" || layout === "cta" ? "center" as const : "left" as const } } : {}) };
  }) };
}
