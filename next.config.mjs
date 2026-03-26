/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow local alternate hostnames used by Playwright/dev browser.
  allowedDevOrigins: ["localhost", "127.0.0.1"],

  // === Performance & Scalability ===

  // Compress responses for faster delivery
  compress: true,

  // Aggressive static generation — serve from CDN edge
  output: "standalone",

  // Image optimization via Vercel CDN
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // cache images for 30 days
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
    ],
  },

  // CDN cache headers for all static assets
  async headers() {
    return [
      {
        // All static assets — long cache with immutable
        source: "/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif|woff|woff2|ttf|mp4|webm)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // JS/CSS bundles — fingerprinted, cache forever
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Service worker — always revalidate
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        // HTML pages — short cache with revalidation (allows instant updates)
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },

  // Production optimizations
  reactStrictMode: true,
  poweredByHeader: false, // Don't expose "X-Powered-By: Next.js"

  // Minimize JavaScript bundles
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },

  // Experimental performance features
  experimental: {
    optimizeCss: false, // disabled to avoid critters dependency
  },
};

export default nextConfig;
