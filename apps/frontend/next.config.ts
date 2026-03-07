import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@finances/shared'],
  experimental: {
    // React compiler for automatic memoization (Next.js 15+)
    reactCompiler: false,
  },
};

export default nextConfig;
