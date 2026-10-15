import { defineConfig } from "@playwright/test";
import { testDatabaseUrl } from "./e2e/test-data";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90000,
  expect: { timeout: 15000 },
  workers: 1,
  use: { baseURL: "http://localhost:3101", viewport: { width: 1440, height: 1000 }, trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: {
    command: process.env.E2E_PRODUCTION ? "pnpm exec next start --port 3101" : "pnpm exec next dev --webpack --port 3101",
    url: "http://localhost:3101/api/health",
    timeout: 120000,
    env: {
      DATABASE_URL: testDatabaseUrl,
      SWIPER_BUILD_DIR: process.env.E2E_PRODUCTION ? ".next" : ".next-e2e",
      APP_URL: "http://localhost:3101",
      NEXT_PUBLIC_APP_URL: "http://localhost:3101",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_Y2xlcmsuZXhhbXBsZS5jb20k",
      CLERK_SECRET_KEY: "sk_test_ciplaceholder",
      SWIPER_E2E: "1",
      ANTHROPIC_API_KEY: "",
      OPENAI_API_KEY: "",
      OPENROUTER_API_KEY: "",
      DODO_PAYMENTS_API_KEY: "fixture_checkout_never_charge",
      DODO_PAYMENTS_PRODUCT_ID: "fixture_pro",
      DODO_PAYMENTS_PRO_PRODUCT_ID: "fixture_pro",
      DODO_PAYMENTS_STUDIO_PRODUCT_ID: "fixture_studio",
      DODO_PAYMENTS_WEBHOOK_SECRET: "fixture_signing_only",
      DODO_PAYMENTS_ENVIRONMENT: "test_mode",
    },
  },
});
