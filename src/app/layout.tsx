import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SmoothScroll from "@/components/smoothScroll";
import Preloader from "@/components/Preloader";
import "lenis/dist/lenis.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// www, not the bare domain — nepalin10.com 308-redirects to this, so this is
// the address pages actually render at and what canonical/OG tags must match.
const SITE_URL = "https://www.nepalin10.com";
const SITE_TITLE = "Nepal in 10 — A 1000km Run Across Nepal in 10 Days";
const SITE_DESCRIPTION =
  "Follow an ultrarunner's 1000km journey across Nepal in 10 days on the Mahendra Highway — a cinematic documentary project, live run tracking, and a cause-driven crossing of the country on foot.";
const OG_IMAGE = "/images/monastery-hero.png";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s — Nepal in 10",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "Nepal in 10",
    "Nepal ultramarathon",
    "1000km run Nepal",
    "Mahendra Highway run",
    "ultrarunning Nepal",
    "Nepal documentary",
    "live run tracker",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "Nepal in 10",
    images: [{ url: OG_IMAGE, width: 3024, height: 1634, alt: "A monastery and prayer flags against the Himalayas" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/images/logo/rara.png",
  },
};

// Helps Google understand this as a single coherent site/event rather than
// just inferring it from body text.
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Nepal in 10",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased hima-intro`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body>
        <SmoothScroll />
        <Preloader />
        {children}
      </body>
    </html>
  );
}
