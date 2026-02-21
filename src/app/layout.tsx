import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

export const metadata: Metadata = {
  title: "整骨院予約システム",
  description: "かんたんにご予約いただけるオンライン予約システムです。",
  robots: "noindex, nofollow",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${notoSansJP.variable} font-sans antialiased bg-background text-foreground min-h-screen text-base`}
        style={{ fontSize: "16px" }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
