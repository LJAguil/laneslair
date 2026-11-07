import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { ThemeSync } from "@/components/theme/theme-picker";
import { THEME_BOOTSTRAP } from "@/lib/themes";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Lane's Lair",
    template: "%s · Lane's Lair",
  },
  description: "Capture a thought. Choose your next move.",
  applicationName: "Lane's Lair",
  appleWebApp: { capable: true, title: "Lane's Lair", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#111216",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html suppressHydrationWarning lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-dvh bg-canvas font-sans text-fg">
        <Script id="lair-theme" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        <ThemeSync />
{children}</body>
    </html>
  );
}
