import path from 'path';
import type { NextConfig } from 'next';

const monorepoRoot = path.join(__dirname, '../..');

const nextConfig: NextConfig = {
  transpilePackages: ['@seoro/shared'],
  // 상위(C:\Users\cns83) package-lock 때문에 루트가 잘못 잡히는 것 방지
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/DumpStack.log.tmp',
          '**/pagefile.sys',
          '**/swapfile.sys',
          '**/hiberfil.sys',
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
