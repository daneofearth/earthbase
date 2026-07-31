import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // drei ships ESM that Next will not parse on its own. Without this the build
  // fails with "Cannot use import statement outside a module" pointing at a
  // drei file, which does not name the real problem.
  transpilePackages: ["three"],
};

export default nextConfig;
