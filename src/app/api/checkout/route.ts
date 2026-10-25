import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { PRODUCTS } from "@/app/shop/products";

type CartLineInput = { productId: string; size: string | null; qty: number };

export async function POST(request: NextRequest) {
  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    // Missing/invalid key — a config problem, not something the shopper did.
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as { lines?: CartLineInput[] } | null;
  const lines = body?.lines;
  if (!Array.isArray(lines) || lines.length === 0) {
    return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
  }

  // Re-derive everything from PRODUCTS (server-side, trusted) rather than
  // the client's cart — a shopper's browser could send any price/qty it
  // wants, so nothing from the request body goes straight into the charge.
  const line_items: Array<{
    price_data: {
      currency: string;
      product_data: { name: string };
      unit_amount: number;
    };
    quantity: number;
  }> = [];

  for (const line of lines) {
    const product = PRODUCTS.find((p) => p.id === line.productId);
    if (!product) {
      return NextResponse.json({ error: `Unknown product: ${line.productId}` }, { status: 400 });
    }
    if (product.sizes && !product.sizes.includes(line.size ?? "")) {
      return NextResponse.json({ error: `Invalid size for ${product.name}.` }, { status: 400 });
    }
    const qty = Math.max(1, Math.min(99, Math.floor(line.qty)));
    line_items.push({
      price_data: {
        currency: "usd",
        product_data: { name: line.size ? `${product.name} — ${line.size}` : product.name },
        unit_amount: Math.round(product.price * 100),
      },
      quantity: qty,
    });
  }

  const origin = request.nextUrl.origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${origin}/shop?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop?checkout=cancelled`,
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "AU", "NP", "IN", "DE", "FR"],
      },
    });
    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
    }
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout session creation failed:", err);
    return NextResponse.json({ error: "Could not start checkout." }, { status: 502 });
  }
}
