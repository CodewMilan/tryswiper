import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ["@swiper/schema", "@swiper/db", "@swiper/ai", "@swiper/rendering"],
  serverExternalPackages: ["@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/api/v1/carousels/[id]/export": ["../../packages/rendering/fonts/**/*"],
  },
};

export default nextConfig;
