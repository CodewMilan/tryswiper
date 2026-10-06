import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function appUrl() {
  const url = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (url) return url.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_URL is not set");
  }
  return "http://localhost:3100";
}

export function editorUrl(carouselId: string) {
  return `${appUrl()}/c/${carouselId}`;
}
