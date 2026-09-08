import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // napi optional-dep requires can't be statically resolved by the bundler; load the native binary at runtime
  serverExternalPackages: ["@firecrawl/pdf-inspector"],
};

export default nextConfig;
