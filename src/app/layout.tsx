import type { Metadata } from "next";
import "./globals.css";
import { ThemeScript, ThemeSync } from "@/app/theme";

export const metadata: Metadata = {
  title: "heyPal! | Private Event Albums",
  description: "One shared place for the photos, faces, and little details that make an event yours. Bawal Epal; use heyPal!.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Hanken+Grotesk:ital,wght@0,300..900;1,300..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-surface text-on-surface">
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
