import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    // Disallowing /images/ for every crawler (not just Google's noimageindex
    // meta tag) keeps images out of image search on Bing, Yandex, etc. too —
    // the page itself stays fully crawlable/indexable, this only blocks the
    // image files themselves. Two exceptions, both more specific rules that
    // win over the broader /images/ disallow per the robots.txt spec:
    // - monastery-hero.png: the og:image, so link-preview thumbnails on
    //   platforms that respect robots.txt keep working.
    // - logo/rara.png: no longer referenced in any metadata (the
    //   apple-touch-icon now points at /apple-touch-icon.png, outside
    //   /images/ entirely — see layout.tsx), but left allowed here anyway.
    //   Blocking it once already broke Google's favicon display outright
    //   (a blank circle instead of any icon, not just a stale one) —
    //   Google had apparently cached rara.png itself as an icon candidate
    //   from an earlier crawl, independent of what layout.tsx currently
    //   declares. Re-blocking it risks the same regression while that
    //   cached reference clears, for a nearly-nonexistent SEO upside.
    rules: {
      userAgent: "*",
      allow: ["/", "/images/monastery-hero.png", "/images/logo/rara.png"],
      disallow: "/images/",
    },
    sitemap: "https://www.nepalin10.com/sitemap.xml",
  };
}
