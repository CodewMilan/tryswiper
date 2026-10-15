import type { Slide, Theme } from "@swiper/schema";

export type FormatOption = {
  id: string;
  name: string;
  description: string;
  slideCount: { min: number; max: number };
  roles: string[];
  source: "official" | "workspace";
  can_generate?: boolean;
  preview?: { slide: Slide; theme: Theme };
};
