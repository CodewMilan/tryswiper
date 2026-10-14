import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.SWIPER_BUILD_DIR ?? ".next",
  poweredByHeader: false,
  transpilePackages: ["@swiper/schema", "@swiper/db", "@swiper/ai", "@swiper/rendering", "@swiper/mcp"],
  serverExternalPackages: ["@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/api/v1/carousels{,/**}": ["../../packages/rendering/fonts/**/*"],
  },
};

export default nextConfig;
