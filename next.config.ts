import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Allow any HTTPS domain for user-pasted custom poster URLs
      { protocol: 'https', hostname: '**' },
    ],
  },
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Cache-Control', value: 'private, no-store' },
      ],
    },
  ],
};

export default nextConfig;
