import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/providers/auth-provider";
import { ToastProvider } from "@/providers/toast-provider";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
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
  },
  other: {
    "mobile-web-app-capable": "yes",
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
        <AuthProvider>
          {children}
          <ToastProvider />
        </AuthProvider>
      </body>
    </html>
  );
}
