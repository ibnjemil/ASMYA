import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import PWAInstallPrompt
import PushSetup from '@/components/mesjid/PushSetup' from "@/components/mesjid/PWAInstallPrompt";
import UrgentPlanBanner from "@/components/mesjid/UrgentPlanBanner";
import OfflineIndicator from "@/components/mesjid/OfflineIndicator";

export const metadata: Metadata = {
  title: "ASMYA - Abubeker Siddiq Masjid Youth Association",
  description: "Organization management platform for ASMYA",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ASMYA",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#d97706",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icon-192-new.png" />
      </head>
      <body className="antialiased bg-background text-foreground overflow-hidden">
        <OfflineIndicator />
        <PushSetup />
        <UrgentPlanBanner />
        {children}
        <PWAInstallPrompt />
        <Toaster />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(){});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}