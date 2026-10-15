import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  distDir: process.env.SWIPER_BUILD_DIR ?? ".next",
  poweredByHeader: false,
  outputFileTracingRoot: path.join(__dirname, "../.."),
  env: {
    NEXT_PUBLIC_MAX_ASSET_MIB: process.env.VERCEL ? "4" : "8",
  },
  transpilePackages: ["@swiper/schema", "@swiper/db", "@swiper/ai", "@swiper/rendering", "@swiper/mcp"],
  serverExternalPackages: ["@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/api/v1/carousels{,/**}": ["../../packages/rendering/fonts/**/*"],
  },
};

export default nextConfig;
