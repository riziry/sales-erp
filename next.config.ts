import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Development warning tests must not share a lock/cache with the local app.
  distDir: process.env.E2E_DEV === "1" ? ".cache/next-e2e" : ".next",
  // pg reads sslrootcert at runtime; it cannot be discovered from an env URL.
  outputFileTracingIncludes: { "/*": ["./certs/**/*.crt"] },
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};

export default nextConfig;
