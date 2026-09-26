import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pg reads sslrootcert at runtime; it cannot be discovered from an env URL.
  outputFileTracingIncludes: { "/*": ["./certs/**/*.crt"] },
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};

export default nextConfig;
