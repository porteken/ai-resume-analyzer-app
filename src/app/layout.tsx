import "./globals.css";

import { SITE_DESCRIPTION, SITE_NAME, getSiteUrl } from "@/lib/site-url";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";

import type { Metadata } from "next";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  applicationName: SITE_NAME,
  description: SITE_DESCRIPTION,
  metadataBase: new URL(siteUrl),
  openGraph: {
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    title: SITE_NAME,
    type: "website",
    url: siteUrl,
  },
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  twitter: {
    card: "summary",
    description: SITE_DESCRIPTION,
    title: SITE_NAME,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
