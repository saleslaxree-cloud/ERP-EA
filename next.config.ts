import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    ".space-z.ai",
  ],
  webpack: (config, { isServer }) => {
    // Exclude examples and skills directories from being processed
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/examples/**', '**/skills/**', '**/node_modules/**'],
    };
    return config;
  },
};

export default nextConfig;
