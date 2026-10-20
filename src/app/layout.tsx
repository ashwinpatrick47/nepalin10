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
// No trailing slash: Next's metadata resolver normalizes alternates.canonical
// and openGraph.url back to this form regardless of what's passed in (tested
// — a trailing-slash value still rendered without one), so CANONICAL_URL just
// aliases SITE_URL rather than fighting that and ending up with canonical/
// og:url and the JSON-LD url fields disagreeing with each other.
const SITE_URL = "https://www.nepalin10.com";
const CANONICAL_URL = SITE_URL;
// Short — matches the JSON-LD/og:site_name "Nepal in 10" exactly. Used for
// og:title/twitter:title/JSON-LD names; kept separate from the longer
// <title> tag below (PAGE_TITLE) since Google treats "site name" and "page
// title" as different signals — og:site_name and the title tag disagreeing
// on length isn't a conflict, it's two different fields doing two different
// jobs.
const BRAND_NAME = "Nepal in 10";
const PAGE_TITLE = "Nepal in 10 | Rahul Sharma's 1,027km Run Across Nepal";
// Kept close to Google's ~155-char snippet cutoff, with the brand name
// ("Nepal in 10") leading so it's the first thing both Google and a reader see.
const SITE_DESCRIPTION =
  "Nepal in 10 — a 1027km run across Nepal in 10 days. Follow live tracking, a cinematic documentary, and a cause-driven crossing of the country on foot.";
// Dedicated 1200x630 crop of monastery-hero.png for link previews —
// og:image/twitter:image want a specific aspect ratio and a small file
// size, neither of which the full 3024x1634 hero PNG (3.4MB) is optimized for.
const OG_IMAGE_SOCIAL = "/images/og-image.jpg";
// South of Kathmandu — the same coordinates already shown in the site header
// (27.7172° N / 85.3240° E) — used below for the Event's location.
const EVENT_LAT = 27.7172;
const EVENT_LNG = 85.324;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: PAGE_TITLE,
    template: "%s — Nepal in 10",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "Nepal in 10",
    "Nepal ultramarathon",
    "1027km run Nepal",
    "Mahendra Highway run",
    "ultrarunning Nepal",
    "Nepal documentary",
    "live run tracker",
  ],
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    title: BRAND_NAME,
    description: SITE_DESCRIPTION,
    url: CANONICAL_URL,
    siteName: BRAND_NAME,
    images: [{ url: OG_IMAGE_SOCIAL, width: 1200, height: 630, alt: "A monastery and prayer flags against the Himalayas" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_NAME,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE_SOCIAL],
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
    // Was the raw rara.png — white line art on a transparent background,
    // invisible once composited onto a white page (exactly the bug
    // favicon.ico itself used to have, fixed separately). Google's search
    // favicon appears to prefer this higher-res declared icon over
    // favicon.ico, so the same fix (composite onto the site's dark bg)
    // had to be applied here too — see public/apple-touch-icon.png.
    apple: "/apple-touch-icon.png",
  },
};

// Helps Google understand this as a single coherent site/event rather than
// just inferring it from body text.
const RAHUL_ID = `${CANONICAL_URL}/#rahul`;
const ORG_ID = `${CANONICAL_URL}/#organization`;

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${CANONICAL_URL}/#website`,
      name: "Nepal in 10",
      // Google's site-names guidelines recommend this explicitly: giving it
      // sanctioned alternates is how you offer backups, instead of Google
      // falling back to inventing one itself (which is what's currently
      // showing in search results instead of the real name — see
      // https://developers.google.com/search/docs/appearance/site-names).
      alternateName: ["Nepal in 10 Run", "NepalIn10"],
      url: CANONICAL_URL,
      description: SITE_DESCRIPTION,
    },
    {
      // Real-person entity for Rahul so the SportsEvent's `performer` below
      // can reference someone concrete rather than the project name again.
      "@type": "Person",
      "@id": RAHUL_ID,
      name: "Rahul Sharma",
      jobTitle: "Ultra-endurance runner",
      sameAs: [
        "https://www.instagram.com/rahuljsharma_/",
        "https://www.youtube.com/@ebbnflofilm",
        "https://linktr.ee/rahuljsharma",
      ],
    },
    {
      "@type": "SportsEvent",
      name: "Nepal in 10",
      description:
        "Rahul Sharma attempts a 1,027km run across Nepal via the Mahendra Highway in 10 days, raising support for Nepal Heart Foundation.",
      url: CANONICAL_URL,
      image: `${SITE_URL}${OG_IMAGE_SOCIAL}`,
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      startDate: "2027-01-16",
      endDate: "2027-01-26",
      performer: { "@id": RAHUL_ID },
      organizer: { "@id": ORG_ID },
      location: {
        "@type": "Place",
        name: "Mahendra Highway, Nepal",
        address: { "@type": "PostalAddress", addressCountry: "NP" },
        geo: { "@type": "GeoCoordinates", latitude: EVENT_LAT, longitude: EVENT_LNG },
      },
    },
    {
      // Ebb&Flo is the production entity behind the run (see Footer's
      // "An Ebb&Flo project" credit and the @ebbnflofilm YouTube channel) —
      // distinct from "Nepal in 10", which is the event/project name above,
      // not an organization. Referenced as the SportsEvent's organizer via
      // @id rather than duplicated inline.
      "@type": "Organization",
      "@id": ORG_ID,
      name: "Ebb&Flo",
      url: CANONICAL_URL,
      logo: `${SITE_URL}/images/logo/rara.png`,
      sameAs: [
        "https://www.instagram.com/rahuljsharma_/",
        "https://www.youtube.com/@ebbnflofilm",
        "https://linktr.ee/rahuljsharma",
      ],
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
