import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@swiper/schema", "@swiper/db", "@swiper/ai"],
};

export default nextConfig;
