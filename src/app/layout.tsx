import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import PWAInstallPrompt from "@/components/mesjid/PWAInstallPrompt";
import PushSetup from '@/components/mesjid/PushSetup';
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Amharic:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
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