import { defineConfig } from "@playwright/test";

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
      SWIPER_BUILD_DIR: process.env.E2E_PRODUCTION ? ".next" : ".next-e2e",
      APP_URL: "http://localhost:3101",
      NEXT_PUBLIC_APP_URL: "http://localhost:3101",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_Y2xlcmsuZXhhbXBsZS5jb20k",
      CLERK_SECRET_KEY: "sk_test_ciplaceholder",
      SWIPER_E2E: "1",
    },
  },
});
