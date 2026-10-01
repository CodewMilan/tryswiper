import {
  CANVAS_HEIGHT,
  CANVAS_PADDING,
  CANVAS_WIDTH,
  SCHEMA_VERSION,
} from "./canvas.ts";
import type {
  Carousel,
  CarouselElement,
  CarouselPlan,
  Slide,
  SlidePlan,
  Theme,
} from "./carousel.ts";

function el(
  partial: Omit<CarouselElement, "id"> & { id?: string },
  index: number,
): CarouselElement {
  return {
    id: partial.id ?? `el_${index}`,
    ...partial,
  };
}

function baseText(
  role: CarouselElement["role"],
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  style: NonNullable<CarouselElement["style"]>,
): Omit<CarouselElement, "id"> {
  return {
    type: "text",
    role,
    text,
    x,
    y,
    width,
    height,
    style,
  };
}

export function renderSlide(plan: SlidePlan, theme: Theme, index: number): Slide {
  const bg = { type: "solid" as const, value: theme.background };
  const contentWidth = CANVAS_WIDTH - CANVAS_PADDING * 2;
  const elements: CarouselElement[] = [];
  let i = 0;

  const push = (item: Omit<CarouselElement, "id">) => {
    elements.push(el(item, i));
    i += 1;
  };

  if (plan.kicker) {
    push(
      baseText("kicker", plan.kicker, CANVAS_PADDING, 96, contentWidth, 48, {
        fontSize: 18,
        fontWeight: 600,
        align: "left",
        color: theme.accent,
        letterSpacing: 1.4,
      }),
    );
  }

  if (plan.layout === "hero" || plan.layout === "centered") {
    const align = plan.layout === "centered" ? "center" : "left";
    push(
      baseText(
        "headline",
        plan.headline,
        CANVAS_PADDING,
        plan.kicker ? 180 : 220,
        contentWidth,
        420,
        {
          fontSize: 72,
          fontWeight: 800,
          align,
          color: theme.primary,
          lineHeight: 1.05,
        },
      ),
    );
    if (plan.body) {
      push(
        baseText(
          "body",
          plan.body,
          CANVAS_PADDING,
          700,
          contentWidth,
          280,
          {
            fontSize: 28,
            fontWeight: 500,
            align,
            color: theme.secondary,
            lineHeight: 1.35,
          },
        ),
      );
    }
  } else if (plan.layout === "quote") {
    push(
      baseText("headline", plan.headline, CANVAS_PADDING, 280, contentWidth, 520, {
        fontSize: 56,
        fontWeight: 700,
        align: "left",
        color: theme.primary,
        lineHeight: 1.15,
      }),
    );
    if (plan.body || plan.proof) {
      push(
        baseText(
          "proof",
          plan.proof ?? plan.body ?? "",
          CANVAS_PADDING,
          860,
          contentWidth,
          200,
          {
            fontSize: 24,
            fontWeight: 500,
            align: "left",
            color: theme.secondary,
            lineHeight: 1.4,
          },
        ),
      );
    }
  } else if (plan.layout === "cta") {
    push(
      baseText("headline", plan.headline, CANVAS_PADDING, 360, contentWidth, 280, {
        fontSize: 64,
        fontWeight: 800,
        align: "center",
        color: theme.primary,
        lineHeight: 1.08,
      }),
    );
    if (plan.body) {
      push(
        baseText("body", plan.body, CANVAS_PADDING, 680, contentWidth, 160, {
          fontSize: 26,
          fontWeight: 500,
          align: "center",
          color: theme.secondary,
          lineHeight: 1.35,
        }),
      );
    }
    push(
      baseText(
        "cta",
        plan.cta ?? "Try it",
        CANVAS_PADDING,
        980,
        contentWidth,
        80,
        {
          fontSize: 28,
          fontWeight: 700,
          align: "center",
          color: theme.accent,
        },
      ),
    );
  } else {
    push(
      baseText(
        "headline",
        plan.headline,
        CANVAS_PADDING,
        plan.kicker ? 170 : 140,
        contentWidth,
        280,
        {
          fontSize: 56,
          fontWeight: 800,
          align: "left",
          color: theme.primary,
          lineHeight: 1.08,
        },
      ),
    );
    if (plan.body) {
      push(
        baseText("body", plan.body, CANVAS_PADDING, 480, contentWidth, 360, {
          fontSize: 30,
          fontWeight: 500,
          align: "left",
          color: theme.secondary,
          lineHeight: 1.35,
        }),
      );
    }
    if (plan.proof) {
      push(
        baseText("proof", plan.proof, CANVAS_PADDING, 900, contentWidth, 160, {
          fontSize: 24,
          fontWeight: 600,
          align: "left",
          color: theme.primary,
          lineHeight: 1.35,
        }),
      );
    }
    if (plan.cta && plan.layout !== "list") {
      push(
        baseText("cta", plan.cta, CANVAS_PADDING, 1120, contentWidth, 72, {
          fontSize: 24,
          fontWeight: 700,
          align: "left",
          color: theme.accent,
        }),
      );
    }
  }

  return {
    id: `slide_${index + 1}`,
    layout: plan.layout,
    role: plan.role,
    background: bg,
    elements,
  };
}

export function renderPlanToCarousel(plan: CarouselPlan, theme: Theme): Carousel {
  return {
    schemaVersion: SCHEMA_VERSION,
    metadata: {
      title: plan.title,
      formatId: plan.formatId,
      aspectRatio: "4:5",
      platforms: ["instagram", "linkedin"],
    },
    theme,
    slides: plan.slides.map((slide, index) => renderSlide(slide, theme, index)),
  };
}

export function maxY(slide: Slide) {
  return Math.max(
    ...slide.elements.map((element) => element.y + element.height),
    0,
  );
}

export { CANVAS_HEIGHT, CANVAS_WIDTH };
