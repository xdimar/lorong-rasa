import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
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
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
