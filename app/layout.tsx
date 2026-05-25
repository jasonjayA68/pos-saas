import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
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
  // `template` is applied whenever a page sets its own metadata.title —
  // so a page with `title: "Settings"` becomes "Settings · Vendora" in
  // the browser tab. `default` is the bare title used when none is set.
  title: {
    default: "Vendora",
    template: "%s · Vendora",
  },
  description: "Vendora — Point of sale for Philippine small businesses",
  applicationName: "Vendora",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value;
  const isDark = theme === "dark";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased${isDark ? " dark" : ""}`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
