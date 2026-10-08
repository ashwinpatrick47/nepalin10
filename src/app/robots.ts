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
    // - logo/rara.png: referenced as the apple-touch-icon in layout.tsx;
    //   blocking it risked breaking Google's favicon display entirely
    //   (it showed a blank circle instead of any icon after this file was
    //   first blocked, rather than just the old, stale one).
    rules: {
      userAgent: "*",
      allow: ["/", "/images/monastery-hero.png", "/images/logo/rara.png"],
      disallow: "/images/",
    },
    sitemap: "https://www.nepalin10.com/sitemap.xml",
  };
}
