import { schema } from "@swiper/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";
import { ensureWorkspace } from "./workspace";

const baseURL = process.env.BETTER_AUTH_URL ?? process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL,
  trustedOrigins: baseURL ? [baseURL] : undefined,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (created) => {
          await ensureWorkspace(created.id, created.name);
        },
      },
    },
  },
  plugins: [nextCookies()],
});
