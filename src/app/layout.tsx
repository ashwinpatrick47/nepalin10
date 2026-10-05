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
// Kept close to Google's ~155-char snippet cutoff, with the brand name
// ("Nepal in 10") leading so it's the first thing both Google and a reader see.
const SITE_DESCRIPTION =
  "Nepal in 10: a 1000km run across Nepal in 10 days. Follow live tracking, a cinematic documentary, and a cause-driven crossing of the country on foot.";
const OG_IMAGE = "/images/monastery-hero.png";
// South of Kathmandu — the same coordinates already shown in the site header
// (27.7172° N / 85.3240° E) — used below for the Event's location.
const EVENT_LAT = 27.7172;
const EVENT_LNG = 85.324;

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
    // Keeps the page itself indexed normally, but asks Google not to show
    // its images in Google Images search results.
    noimageindex: true,
    googleBot: { index: true, follow: true, noimageindex: true },
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
  "@graph": [
    {
      "@type": "WebSite",
      name: "Nepal in 10",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
    },
    {
      "@type": "SportsEvent",
      name: "Nepal in 10",
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      image: `${SITE_URL}${OG_IMAGE}`,
      location: {
        "@type": "Place",
        name: "Nepal",
        geo: { "@type": "GeoCoordinates", latitude: EVENT_LAT, longitude: EVENT_LNG },
      },
      // startDate intentionally left out — not decided yet. Google's
      // structured-data guidelines explicitly warn against fake/placeholder
      // event dates, so omitting it is safer than inventing one; add
      // startDate (and endDate/eventStatus) here once there's a real date.
    },
  ],
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
