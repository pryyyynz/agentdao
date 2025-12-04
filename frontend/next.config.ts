import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Configure Turbopack to handle problematic packages
  turbopack: {
    resolveAlias: {
      // Replace the problematic magic-ext/oauth with a stub
      '@magic-ext/oauth': './src/lib/magic-stub.ts',
    },
  },
  // For webpack fallback (if not using turbopack)
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@magic-ext/oauth': './src/lib/magic-stub.ts',
    };
    return config;
  },
};

export default nextConfig;
