import { carouselSchema, parseOperations, type Carousel, type CarouselOperation } from "@swiper/schema";

export type DraftBatch = { id: string; operations: CarouselOperation[]; version?: number };
export type RecoveryBackup = {
  format: "swiper-recovery";
  version: 1;
  carouselId: string;
  baseVersion: number;
  base: Carousel;
  carousel: Carousel;
  batches: DraftBatch[];
};

export function readDraftBatches(input: unknown): DraftBatch[] {
  if (!Array.isArray(input)) throw new Error("The recovery backup has no edit history.");
  return input.map((item) => {
    if (!item || typeof item.id !== "string" || !item.id ||
      (item.version !== undefined && (!Number.isInteger(item.version) || item.version < 1))) {
      throw new Error("The recovery backup contains an invalid edit.");
    }
    const operations = parseOperations(item.operations);
    if (!operations?.length) throw new Error("The recovery backup contains an invalid edit.");
    return { id: item.id, operations, ...(item.version !== undefined ? { version: item.version } : {}) };
  });
}

export function readRecoveryBackup(input: unknown, carouselId: string): RecoveryBackup {
  if (!input || typeof input !== "object") throw new Error("Choose a Swiper recovery JSON file.");
  const record = input as Record<string, unknown>;
  if (record.format !== "swiper-recovery" || record.version !== 1 || record.carouselId !== carouselId ||
    !Number.isInteger(record.baseVersion) || Number(record.baseVersion) < 1) {
    throw new Error("This recovery backup belongs to another carousel or uses an unsupported format.");
  }
  return {
    format: "swiper-recovery", version: 1, carouselId, baseVersion: Number(record.baseVersion),
    base: carouselSchema.parse(record.base), carousel: carouselSchema.parse(record.carousel),
    batches: readDraftBatches(record.batches),
  };
}

export function importedRecoveryDocument(input: unknown, carouselId: string): Carousel {
  if (input && typeof input === "object" && "format" in input) return readRecoveryBackup(input, carouselId).carousel;
  // Accept canonical documents downloaded by the previous recovery implementation.
  const parsed = carouselSchema.safeParse(input);
  if (!parsed.success) throw new Error("Choose a valid Swiper recovery JSON file.");
  return parsed.data;
}
