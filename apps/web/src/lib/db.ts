import { createDb, schema, type Database } from "@swiper/db";

const globalForDb = globalThis as unknown as { __swiperDb?: Database };

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

export const db = globalForDb.__swiperDb ?? createDb(databaseUrl());
if (process.env.NODE_ENV !== "production") {
  globalForDb.__swiperDb = db;
}

export { schema };
