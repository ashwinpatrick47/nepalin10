import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

// Called when the shopper lands back on /shop?checkout=success&session_id=...
// — the URL alone proves nothing (anyone could type that query string by
// hand), so this looks the session up on Stripe's side before the page is
// allowed to show an "order confirmed" state.
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id." }, { status: 400 });
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return NextResponse.json({
      paid: session.payment_status === "paid",
      id: session.id,
      amountTotal: session.amount_total,
      customerEmail: session.customer_details?.email ?? null,
    });
  } catch (err) {
    console.error("Stripe session verification failed:", err);
    return NextResponse.json({ error: "Could not verify session." }, { status: 502 });
  }
}
