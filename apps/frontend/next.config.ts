import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@finances/shared'],
  devIndicators: false,
  experimental: {
    reactCompiler: false,
  },
};

export default nextConfig;
