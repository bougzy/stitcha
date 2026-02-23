import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  fallbacks: { document: "/offline" },
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        // MediaPipe WASM runtime — cache aggressively (versioned CDN)
        urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/@mediapipe\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "mediapipe-wasm",
          expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      {
        // MediaPipe model files — cache aggressively
        urlPattern: /^https:\/\/storage\.googleapis\.com\/mediapipe-models\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "mediapipe-models",
          expiration: { maxEntries: 5, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-images",
          expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      {
        // Static JS/CSS chunks — cache aggressively (hashed filenames)
        urlPattern: /\/_next\/static\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "next-static",
          expiration: { maxEntries: 128, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      {
        // API: network-first with short cache for offline fallback
        urlPattern: /\/api\/(?!auth\/).*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-cache",
          expiration: { maxEntries: 32, maxAgeSeconds: 5 * 60 },
          networkTimeoutSeconds: 5,
        },
      },
      {
        // Dashboard pages: stale-while-revalidate for fast navigation
        urlPattern: /\/(dashboard|clients|orders|settings|scan|style-vault|heartbeat|rank|calendar).*$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "app-pages",
          expiration: { maxEntries: 32, maxAgeSeconds: 30 * 60 },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "https://stitcha.vercel.app",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "stitcha-app-secret-key-2024-production-ready",
  },
  turbopack: {},
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [360, 414, 512, 640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "date-fns",
      "recharts",
      "jspdf",
      "jspdf-autotable",
      "react-hook-form",
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
