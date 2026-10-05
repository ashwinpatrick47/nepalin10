import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    // Disallowing /images/ for every crawler (not just Google's noimageindex
    // meta tag) keeps images out of image search on Bing, Yandex, etc. too —
    // the page itself stays fully crawlable/indexable, this only blocks the
    // image files themselves.
    rules: { userAgent: "*", allow: "/", disallow: "/images/" },
    sitemap: "https://www.nepalin10.com/sitemap.xml",
  };
}
