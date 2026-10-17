import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dashboard pages read per-product state on every request, so we keep the
  // classic dynamic rendering model rather than Cache Components.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  serverExternalPackages: ["cheerio"],
};

export default nextConfig;
