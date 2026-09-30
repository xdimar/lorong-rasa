import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/privacy-policy',
        destination: '/kebijakan-privasi',
        permanent: true,
      },
      {
        source: '/privacy',
        destination: '/kebijakan-privasi',
        permanent: true,
      },
      {
        source: '/terms',
        destination: '/syarat-ketentuan',
        permanent: true,
      },
      {
        source: '/terms-of-service',
        destination: '/syarat-ketentuan',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
