import Stripe from "stripe";

// Server-only — this file must never be imported from a "use client"
// component, since STRIPE_SECRET_KEY can create real charges, refunds, and
// read customer data on the account it belongs to.
//
// Guards against a live key specifically because the shop itself has no
// greenlight yet: this is meant to stay in Stripe's test mode (sk_test_...,
// free, no business verification, fake 4242... cards) until there's an
// actual decision to sell something for real. If that ever changes, delete
// this check along with the rest of the "still a preview" framing.
const secretKey = process.env.STRIPE_SECRET_KEY;

export function getStripe(): Stripe {
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env.local (a test-mode key, starting with sk_test_).",
    );
  }
  if (!secretKey.startsWith("sk_test_")) {
    throw new Error(
      "STRIPE_SECRET_KEY must be a test-mode key (sk_test_...) — this shop has no greenlight to charge anyone for real yet.",
    );
  }
  return new Stripe(secretKey);
}
