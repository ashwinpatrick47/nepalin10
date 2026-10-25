import type { Metadata } from "next";

// Metadata exports need a Server Component, so this thin layout carries it —
// page.tsx itself is "use client" for the cart state. Not linked from
// anywhere on the live site; this just makes sure a stray crawl of the bare
// URL can't get it indexed while there's no greenlight for a real shop.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
