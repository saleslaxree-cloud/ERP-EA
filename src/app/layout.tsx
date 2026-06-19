import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LAXREE — Enterprise Operating System",
  description: "Comprehensive enterprise workflow and approval management system",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LAXREE ERP',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
};

// Force no-cache for HTML pages to prevent stale JS from being served
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <meta name="app-version" content="2026-06-19-v13-push-notifications" />
        <meta name="theme-color" content="#8B6914" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="LAXREE ERP" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        className={`${cormorant.variable} ${dmSans.variable} ${dmMono.variable} antialiased`}
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
