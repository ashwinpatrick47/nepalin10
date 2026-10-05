import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    // Disallowing /images/ for every crawler (not just Google's noimageindex
    // meta tag) keeps images out of image search on Bing, Yandex, etc. too —
    // the page itself stays fully crawlable/indexable, this only blocks the
    // image files themselves. One exception: the og:image (layout.tsx's
    // OG_IMAGE) stays allowed so link-preview thumbnails on platforms that
    // respect robots.txt (some do, inconsistently) keep working — the more
    // specific /images/monastery-hero.png rule wins over the broader
    // /images/ disallow per the robots.txt spec.
    rules: { userAgent: "*", allow: ["/", "/images/monastery-hero.png"], disallow: "/images/" },
    sitemap: "https://www.nepalin10.com/sitemap.xml",
  };
}
