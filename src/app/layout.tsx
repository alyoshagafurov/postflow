import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

const fontSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
  display: "swap",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "PostFlow — загрузи видео один раз, опубликуй везде",
    template: "%s · PostFlow",
  },
  description:
    "PostFlow планирует и автоматически публикует ваши видео в TikTok, YouTube и Instagram. Загрузите один раз — оно само выйдет во всех соцсетях по расписанию.",
  keywords: [
    "автопубликация видео",
    "планировщик TikTok",
    "загрузка в YouTube",
    "Instagram Reels",
    "SMM автоматизация",
  ],
  openGraph: {
    type: "website",
    title: "PostFlow — загрузи видео один раз, опубликуй везде",
    description:
      "Планируйте и автоматически публикуйте видео в TikTok, YouTube и Instagram из одного места.",
    url: appUrl,
    siteName: "PostFlow",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ru"
      className={cn("dark", fontSans.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers>{children}</Providers>
        <Toaster theme="dark" richColors position="top-right" closeButton />
      </body>
    </html>
  );
}
