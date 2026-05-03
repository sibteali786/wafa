import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { OfflineSyncProvider } from "@/components/offline/sync-status-provider";
import { NavigationProgress } from "@/components/wafa/navigation-progress";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wafa",
  description: "Promise spaces for the people who matter most.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand/wafa-favicon-32.svg", type: "image/svg+xml" },
      { url: "/brand/wafa-favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/wafa-favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/brand/wafa-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Wafa",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#2f7a6b",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <NavigationProgress />
        <OfflineSyncProvider>{children}</OfflineSyncProvider>
      </body>
    </html>
  );
}