import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/providers/auth-provider";
import { ToastProvider } from "@/providers/toast-provider";
import { InstallPrompt } from "@/components/common/install-prompt";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    template: "Stitcha | %s",
    default: "Stitcha | AI Body Measurement Platform",
  },
  description:
    "AI-powered body measurement platform for fashion designers. Precision measurements, client management, and order tracking in one place.",
  keywords: [
    "body measurement",
    "fashion designer",
    "AI scanning",
    "tailoring",
    "client management",
  ],
  authors: [{ name: "Stitcha" }],
  creator: "Stitcha",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://stitcha.vercel.app"),
  openGraph: {
    type: "website",
    locale: "en_NG",
    siteName: "Stitcha",
    title: "Stitcha | AI Body Measurement Platform",
    description:
      "AI-powered body measurement platform for fashion designers.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Stitcha",
    startupImage: ["/apple-touch-icon.png"],
  },
  // iOS uses apple-touch-icon for the Home Screen icon. Without these tags,
  // iOS falls back to a screenshot of the page, which looks broken.
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/apple-touch-icon-180.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/apple-touch-icon-167.png", sizes: "167x167", type: "image/png" },
      { url: "/icons/apple-touch-icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/apple-touch-icon-120.png", sizes: "120x120", type: "image/png" },
    ],
    other: [
      { rel: "apple-touch-icon-precomposed", url: "/apple-touch-icon-precomposed.png" },
    ],
    shortcut: [{ url: "/icons/icon-192x192.png", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Stitcha",
  },
};

export const viewport: Viewport = {
  themeColor: "#c75b39",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body className="font-sans antialiased">
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-[100] -translate-y-20 rounded-lg bg-[#C75B39] px-4 py-2 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <AuthProvider>
          {children}
          <ToastProvider />
          <InstallPrompt />
        </AuthProvider>
      </body>
    </html>
  );
}
