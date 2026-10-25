// Shared between the client page (page.tsx) and the server-side checkout API
// route (api/checkout/route.ts). Prices/names for the real Stripe Checkout
// Session must come from here, not from whatever the browser POSTs — never
// trust a client-submitted price for anything that actually charges money.
export type Product = {
  id: string;
  name: string;
  price: number;
  blurb: string;
  sizes?: readonly string[];
};

const SIZES = ["S", "M", "L", "XL"] as const;

export const PRODUCTS: Product[] = [
  { id: "tee", name: "“Nepal in 10” Tee", price: 35, blurb: "100% cotton, event wordmark front and back.", sizes: SIZES },
  { id: "cap", name: "Trail Running Cap", price: 28, blurb: "Lightweight, adjustable, built for the highway." },
  { id: "hoodie", name: "Finisher Hoodie", price: 62, blurb: "Heavyweight fleece, for after the last kilometre.", sizes: SIZES },
  { id: "buff", name: "Prayer Flag Buff", price: 18, blurb: "Multi-use neck gaiter, printed with the five colours." },
  { id: "poster", name: "Expedition Poster", price: 24, blurb: "18″ × 24″, the full Mahendra Highway route." },
  { id: "stickers", name: "Sticker Pack", price: 8, blurb: "Five stickers from the documentary’s key art." },
];
