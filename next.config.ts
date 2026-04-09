// import type { NextConfig } from "next";
// import withPWAInit from "@ducanh2912/next-pwa";

// const withPWA = withPWAInit({
//   dest: "public",
//   cacheOnFrontEndNav: true,
//   aggressiveFrontEndNavCaching: true,
//   reloadOnOnline: true,
//   fallbacks: { document: "/offline" },
//   disable: process.env.NODE_ENV === "development",
//   workboxOptions: {
//     disableDevLogs: true,
//     runtimeCaching: [
//       {
//         urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/@mediapipe\/.*/i,
//         handler: "CacheFirst",
//         options: {
//           cacheName: "mediapipe-wasm",
//           expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
//         },
//       },
//       {
//         urlPattern: /^https:\/\/storage\.googleapis\.com\/mediapipe-models\/.*/i,
//         handler: "CacheFirst",
//         options: {
//           cacheName: "mediapipe-models",
//           expiration: { maxEntries: 5, maxAgeSeconds: 365 * 24 * 60 * 60 },
//         },
//       },
//       {
//         urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
//         handler: "CacheFirst",
//         options: {
//           cacheName: "google-fonts",
//           expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
//         },
//       },
//       {
//         urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
//         handler: "StaleWhileRevalidate",
//         options: {
//           cacheName: "static-images",
//           expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
//         },
//       },
//       {
//         urlPattern: /\/_next\/static\/.*/i,
//         handler: "CacheFirst",
//         options: {
//           cacheName: "next-static",
//           expiration: { maxEntries: 128, maxAgeSeconds: 365 * 24 * 60 * 60 },
//         },
//       },
//       {
//         urlPattern: /\/api\/(?!auth\/).*/i,
//         handler: "NetworkFirst",
//         options: {
//           cacheName: "api-cache",
//           expiration: { maxEntries: 32, maxAgeSeconds: 5 * 60 },
//           networkTimeoutSeconds: 5,
//         },
//       },
//       {
//         urlPattern:
//           /\/(dashboard|clients|orders|settings|scan|style-vault|heartbeat|rank|calendar).*$/i,
//         handler: "StaleWhileRevalidate",
//         options: {
//           cacheName: "app-pages",
//           expiration: { maxEntries: 32, maxAgeSeconds: 30 * 60 },
//         },
//       },
//     ],
//   },
// });

// const nextConfig: NextConfig = {
//   env: {
//     NEXTAUTH_URL: process.env.NEXTAUTH_URL || "https://stitcha.com.ng",
//     NEXTAUTH_SECRET:
//       process.env.NEXTAUTH_SECRET ||
//       "stitcha-app-secret-key-2024-production-ready",
//   },
//   // NO turbopack key here — Turbopack causes panics with @mediapipe + PWA
//   // in Next.js 16. Webpack is stable for this project.
//   webpack: (config, { isServer }) => {
//     // Required for @mediapipe/tasks-vision WASM files
//     config.resolve.fallback = {
//       ...config.resolve.fallback,
//       fs: false,
//       path: false,
//       crypto: false,
//     };

//     // Handle WASM files from mediapipe
//     config.module.rules.push({
//       test: /\.wasm$/,
//       type: "asset/resource",
//     });

//     // Suppress mediapipe canvas warning on server
//     if (isServer) {
//       config.externals = [
//         ...(Array.isArray(config.externals) ? config.externals : []),
//         "canvas",
//       ];
//     }

//     return config;
//   },
//   images: {
//     formats: ["image/webp", "image/avif"],
//     deviceSizes: [360, 414, 512, 640, 750, 828, 1080, 1200],
//     imageSizes: [16, 32, 48, 64, 96, 128, 256],
//   },
//   experimental: {
//     optimizePackageImports: [
//       "lucide-react",
//       "framer-motion",
//       "date-fns",
//       "recharts",
//       "jspdf",
//       "jspdf-autotable",
//       "react-hook-form",
//     ],
//   },
//   async headers() {
//     return [
//       {
//         source: "/(.*)",
//         headers: [
//           { key: "X-Content-Type-Options", value: "nosniff" },
//           { key: "X-Frame-Options", value: "DENY" },
//           { key: "X-XSS-Protection", value: "1; mode=block" },
//           {
//             key: "Referrer-Policy",
//             value: "strict-origin-when-cross-origin",
//           },
//         ],
//       },
//     ];
//   },
// };

// export default withPWA(nextConfig);



import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  fallbacks: { document: "/offline" },
  // PWA fully disabled in dev — avoids service worker interference
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/@mediapipe\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "mediapipe-wasm",
          expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      {
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
        urlPattern: /\/_next\/static\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "next-static",
          expiration: { maxEntries: 128, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\/api\/(?!auth\/).*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-cache",
          expiration: { maxEntries: 32, maxAgeSeconds: 5 * 60 },
          networkTimeoutSeconds: 5,
        },
      },
      {
        urlPattern:
          /\/(dashboard|clients|orders|settings|scan|style-vault|heartbeat|rank|calendar).*$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "app-pages",
          expiration: { maxEntries: 32, maxAgeSeconds: 30 * 60 },
        },
      },
    ],
  },
});

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "https://stitcha.com.ng",
    NEXTAUTH_SECRET:
      process.env.NEXTAUTH_SECRET ||
      "stitcha-app-secret-key-2024-production-ready",
  },

  webpack: (config, { isServer, dev }) => {
    // Handle WASM files from @mediapipe/tasks-vision
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });

    // Suppress canvas warning from mediapipe on server side
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "canvas",
      ];
    }

    // Speed up dev builds — skip minimisation and use faster source maps
    if (dev) {
      config.devtool = "eval-cheap-module-source-map";
      config.optimization = {
        ...config.optimization,
        minimize: false,
        // Split chunks for faster incremental rebuilds
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            // Keep heavy packages in their own chunk so they don't
            // get recompiled on every page change
            mediapipe: {
              test: /[\\/]node_modules[\\/]@mediapipe[\\/]/,
              name: "mediapipe",
              chunks: "all",
              priority: 30,
              enforce: true,
            },
            framerMotion: {
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              name: "framer-motion",
              chunks: "all",
              priority: 20,
              enforce: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendor",
              chunks: "all",
              priority: 10,
            },
          },
        },
      };
    }

    return config;
  },

  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [360, 414, 512, 640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // optimizePackageImports only works with Turbopack — remove in webpack mode
  // to avoid it conflicting and slowing down compilation
  experimental: isDev
    ? {}
    : {
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
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);