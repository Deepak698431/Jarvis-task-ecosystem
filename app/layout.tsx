import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// Defines the native app viewport behavior
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Disables double-tap to zoom for a native feel
  themeColor: "#0a0a0c",
};

// Defines the PWA and iOS Safari configuration
export const metadata: Metadata = {
  title: "Todo AI",
  description: "AI-powered task management",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", // Blends the iPhone status bar into the app
    title: "Todo AI",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}