import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // React compiler for automatic memoization (Next.js 15+)
    reactCompiler: false,
  },
};

export default nextConfig;
