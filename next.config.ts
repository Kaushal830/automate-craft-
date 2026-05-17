import type { NextConfig } from "next";
import path from "node:path";

const projectRoot = process.cwd().includes(`${path.sep}.claude${path.sep}worktrees${path.sep}`)
  ? path.resolve(process.cwd(), "..", "..", "..")
  : process.cwd();

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
    {
      source: "/(.*)\\.(woff2|png|jpg|svg|ico|avif|webp)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
  ],
  poweredByHeader: false,
};

export default nextConfig;
