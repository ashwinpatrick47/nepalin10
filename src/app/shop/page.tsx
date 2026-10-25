"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import { PRODUCTS, type Product } from "./products";
import "./shop.css";

// Speculative — no greenlight for an actual shop yet. Cart and quick-view
// are local state only; checkout now genuinely goes through Stripe (test
// mode — see src/lib/stripe.ts, which refuses to run with anything but a
// sk_test_... key) via a real Checkout Session created server-side in
// api/checkout/route.ts. "Place order" redirects to Stripe's own hosted
// payment page; nothing here ever sees a real card number. Not linked from
// anywhere on the live site; only reachable by visiting /shop directly.
//
// Requires STRIPE_SECRET_KEY in .env.local (a test-mode key) — without it,
// the checkout API route returns an error instead of crashing the page.
//
// No real product photography exists yet, so there's nothing honest to show
// as a product "image" — reusing the site's documentary/expedition photos
// as fake merch shots would be more misleading than a placeholder. Instead
// each product gets 4 distinct placeholder "angle" tiles (reusing the same
// art treatment as the grid cards) so the quick-view gallery has something
// real to click between; swap ANGLE_LABELS' tiles for actual photos once
// there's real merch to shoot.
const ANGLE_LABELS = ["Front", "Back", "Detail", "Lifestyle"];

const formatPrice = (n: number) => `$${n.toFixed(2)}`;

// How long the CSS close animations run (shop.css's .is-closing rules) —
// kept in one place so the JS delay before actually unmounting always
// matches what's playing on screen.
const CLOSE_MS = 240;

const CART_STORAGE_KEY = "nepalin10-shop-cart-preview";

function ProductArt({
  name,
  angleIndex,
  large,
}: {
  name: string;
  angleIndex: number;
  large?: boolean;
}) {
  return (
    <div
      className={`shop-card-art shop-art-angle-${angleIndex}${large ? " shop-card-art-large" : ""}`}
      aria-hidden="true"
    >
      <span className="shop-card-art-mark" />
      <span className="shop-card-art-name">{name}</span>
      <span className="shop-card-art-angle">{ANGLE_LABELS[angleIndex]}</span>
    </div>
  );
}

type OrderStatus = "idle" | "redirecting" | "verifying" | "confirmed" | "error";

type CartLine = { productId: string; size: string | null; qty: number };

const sameLine = (a: CartLine, productId: string, size: string | null) =>
  a.productId === productId && a.size === size;

export default function ShopPage() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartHydrated, setCartHydrated] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartClosing, setCartClosing] = useState(false);

  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewClosing, setPreviewClosing] = useState(false);
  const [previewAngle, setPreviewAngle] = useState(0);
  const [previewQty, setPreviewQty] = useState(1);
  const [previewSize, setPreviewSize] = useState<string | null>(null);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutClosing, setCheckoutClosing] = useState(false);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("idle");
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Cart survives the round-trip to Stripe's hosted page and back — without
  // this, both a cancelled checkout and a page reload would silently empty
  // it, since a redirect to an external domain and back is a fresh page
  // load, not a client-side navigation React's state survives.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) setCart(JSON.parse(raw));
    } catch {
      // ignore — worst case the cart starts empty
    }
    setCartHydrated(true);
  }, []);
  useEffect(() => {
    if (!cartHydrated) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore — localStorage can be unavailable (private mode, quota, etc.)
    }
  }, [cart, cartHydrated]);

  // Landing back from Stripe: verify the session server-side before trusting
  // the URL (anyone could type ?checkout=success by hand) — see
  // api/checkout/verify/route.ts.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get("checkout");
    if (!outcome) return;

    const cleanUrl = () => window.history.replaceState(null, "", window.location.pathname);

    if (outcome === "cancelled") {
      cleanUrl();
      return;
    }

    if (outcome === "success") {
      const sessionId = params.get("session_id");
      cleanUrl();
      if (!sessionId) return;
      setCheckoutOpen(true);
      setOrderStatus("verifying");
      fetch(`/api/checkout/verify?session_id=${encodeURIComponent(sessionId)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.paid) {
            setOrderNumber(data.id);
            setOrderStatus("confirmed");
            setCart([]);
          } else {
            setCheckoutError("Stripe hasn’t marked this session as paid.");
            setOrderStatus("error");
          }
        })
        .catch(() => {
          setCheckoutError("Could not verify the payment with Stripe.");
          setOrderStatus("error");
        });
    }
  }, []);

  const addToCart = (productId: string, size: string | null, qty = 1) => {
    // Doesn't auto-open the cart drawer — it's a full-screen overlay, so
    // popping it open on every add would block clicking "Add to cart" on
    // anything else without closing it first. The badge count is enough
    // feedback; the shopper opens the cart when they're ready to.
    setCart((prev) => {
      const idx = prev.findIndex((l) => sameLine(l, productId, size));
      if (idx === -1) return [...prev, { productId, size, qty }];
      const next = [...prev];
      next[idx] = { ...next[idx], qty: next[idx].qty + qty };
      return next;
    });
  };

  const changeQty = (productId: string, size: string | null, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => (sameLine(l, productId, size) ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    );
  };

  const removeFromCart = (productId: string, size: string | null) => {
    setCart((prev) => prev.filter((l) => !sameLine(l, productId, size)));
  };

  const openPreview = (id: string) => {
    setPreviewId(id);
    setPreviewAngle(0);
    setPreviewQty(1);
    setPreviewSize(null);
  };

  const closePreview = () => {
    if (previewClosing) return;
    setPreviewClosing(true);
    setTimeout(() => {
      setPreviewId(null);
      setPreviewClosing(false);
    }, CLOSE_MS);
  };

  const previewProduct = PRODUCTS.find((p) => p.id === previewId) ?? null;
  const previewSizeRequired = Boolean(previewProduct?.sizes) && !previewSize;

  const cartEntries = cart
    .map((line) => ({ line, product: PRODUCTS.find((p) => p.id === line.productId) }))
    .filter((entry): entry is { line: CartLine; product: Product } => Boolean(entry.product));

  const itemCount = cartEntries.reduce((sum, e) => sum + e.line.qty, 0);
  const subtotal = cartEntries.reduce((sum, e) => sum + e.line.qty * e.product.price, 0);

  const closeCart = () => {
    if (cartClosing) return;
    setCartClosing(true);
    setTimeout(() => {
      setCartOpen(false);
      setCartClosing(false);
    }, CLOSE_MS);
  };

  const openCheckout = () => {
    // Replacing the cart drawer with the checkout modal, not dismissing
    // back to the shop — no close animation needed for this transition.
    setCartOpen(false);
    setOrderStatus("idle");
    setCheckoutError(null);
    setCheckoutOpen(true);
  };

  const closeCheckout = () => {
    if (checkoutClosing) return;
    setCheckoutClosing(true);
    setTimeout(() => {
      setCheckoutOpen(false);
      setCheckoutClosing(false);
      setOrderStatus("idle");
      setOrderNumber(null);
      setCheckoutError(null);
    }, CLOSE_MS);
  };

  const goToStripe = async () => {
    setOrderStatus("redirecting");
    setCheckoutError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: cartEntries.map(({ line }) => ({ productId: line.productId, size: line.size, qty: line.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setCheckoutError(data.error || "Could not start checkout.");
        setOrderStatus("error");
        return;
      }
      window.location.href = data.url; // full navigation to Stripe's hosted page
    } catch {
      setCheckoutError("Could not reach the checkout server.");
      setOrderStatus("error");
    }
  };

  return (
    <main className="shop-page">
      <div className="shop-wip-banner">
        Preview build — not linked anywhere on the live site. Checkout uses real Stripe test mode: no real cards, no
        real charges.
      </div>

      <header className="shop-header">
        <div className="shop-logo-mark" role="img" aria-label="Nepal in 10" />
        <button
          type="button"
          className="shop-cart-toggle"
          onClick={() => (cartOpen ? closeCart() : setCartOpen(true))}
          aria-label="Toggle cart"
        >
          Cart
          {itemCount > 0 && <span className="shop-cart-badge">{itemCount}</span>}
        </button>
      </header>

      <div className="shop-grid">
        {PRODUCTS.map((product) => (
          <div key={product.id} className="shop-card">
            <button
              type="button"
              className="shop-card-art-button"
              onClick={() => openPreview(product.id)}
              aria-label={`View ${product.name}`}
            >
              <ProductArt name={product.name} angleIndex={0} />
            </button>
            <div className="shop-card-info">
              <h3>
                <button type="button" className="shop-card-title-button" onClick={() => openPreview(product.id)}>
                  {product.name}
                </button>
              </h3>
              <p>{product.blurb}</p>
              <div className="shop-card-foot">
                <span className="shop-card-price">{formatPrice(product.price)}</span>
                {product.sizes ? (
                  <button type="button" onClick={() => openPreview(product.id)}>
                    Select size
                  </button>
                ) : (
                  <button type="button" onClick={() => addToCart(product.id, null)}>
                    Add to cart
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {previewProduct && (
        <div
          className={`shop-preview-overlay${previewClosing ? " is-closing" : ""}`}
          onClick={closePreview}
        >
          <div
            className={`shop-preview-modal${previewClosing ? " is-closing" : ""}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="shop-preview-close" onClick={closePreview} aria-label="Close preview">
              ×
            </button>

            <div className="shop-preview-gallery">
              <div key={previewAngle} className="shop-preview-main-image">
                <ProductArt name={previewProduct.name} angleIndex={previewAngle} large />
              </div>
              <div className="shop-preview-thumbs">
                {ANGLE_LABELS.map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    className={`shop-preview-thumb${index === previewAngle ? " is-active" : ""}`}
                    onClick={() => setPreviewAngle(index)}
                    aria-label={`Show ${label.toLowerCase()} view`}
                    aria-pressed={index === previewAngle}
                  >
                    <ProductArt name={previewProduct.name} angleIndex={index} />
                  </button>
                ))}
              </div>
            </div>

            <div className="shop-preview-info">
              <h2>{previewProduct.name}</h2>
              <p className="shop-preview-price">{formatPrice(previewProduct.price)}</p>
              <p className="shop-preview-blurb">{previewProduct.blurb}</p>

              {previewProduct.sizes && (
                <div className="shop-preview-size">
                  <span>Size</span>
                  <div className="shop-size-options">
                    {previewProduct.sizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        className={`shop-size-option${previewSize === size ? " is-active" : ""}`}
                        onClick={() => setPreviewSize(size)}
                        aria-pressed={previewSize === size}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="shop-preview-qty">
                <span>Quantity</span>
                <div className="shop-preview-qty-stepper">
                  <button
                    type="button"
                    onClick={() => setPreviewQty((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span>{previewQty}</span>
                  <button type="button" onClick={() => setPreviewQty((q) => q + 1)} aria-label="Increase quantity">
                    +
                  </button>
                </div>
              </div>

              <button
                type="button"
                className="shop-preview-add"
                disabled={previewSizeRequired}
                onClick={() => {
                  addToCart(previewProduct.id, previewSize, previewQty);
                  closePreview();
                  setCartOpen(true);
                }}
              >
                {previewSizeRequired
                  ? "Select a size"
                  : `Add ${previewQty > 1 ? `${previewQty} ` : ""}to cart — ${formatPrice(previewProduct.price * previewQty)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {cartOpen && (
        <div className={`shop-cart-overlay${cartClosing ? " is-closing" : ""}`} onClick={closeCart}>
          <aside
            className={`shop-cart-drawer${cartClosing ? " is-closing" : ""}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="shop-cart-drawer-head">
              <span>Your cart</span>
              <button type="button" onClick={closeCart} aria-label="Close cart">
                ×
              </button>
            </div>

            {cartEntries.length === 0 ? (
              <p className="shop-cart-empty">Your cart is empty.</p>
            ) : (
              <>
                <div className="shop-cart-items">
                  {cartEntries.map(({ line, product }) => (
                    <div key={`${product.id}::${line.size ?? ""}`} className="shop-cart-item">
                      <div className="shop-cart-item-mark" aria-hidden="true" />
                      <div className="shop-cart-item-info">
                        <span className="shop-cart-item-name">
                          {product.name}
                          {line.size ? ` · ${line.size}` : ""}
                        </span>
                        <span className="shop-cart-item-price">{formatPrice(product.price)}</span>
                      </div>
                      <div className="shop-cart-item-qty">
                        <button
                          type="button"
                          onClick={() => changeQty(product.id, line.size, -1)}
                          aria-label={`Decrease ${product.name} quantity`}
                        >
                          −
                        </button>
                        <span>{line.qty}</span>
                        <button
                          type="button"
                          onClick={() => changeQty(product.id, line.size, 1)}
                          aria-label={`Increase ${product.name} quantity`}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="shop-cart-item-remove"
                        onClick={() => removeFromCart(product.id, line.size)}
                        aria-label={`Remove ${product.name}`}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="shop-cart-subtotal">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>

                <button type="button" className="shop-checkout" onClick={openCheckout}>
                  Checkout
                </button>
              </>
            )}
          </aside>
        </div>
      )}

      {checkoutOpen && (
        <div
          className={`shop-checkout-overlay${checkoutClosing ? " is-closing" : ""}`}
          onClick={orderStatus !== "redirecting" && orderStatus !== "verifying" ? closeCheckout : undefined}
        >
          <div
            className={`shop-checkout-modal${checkoutClosing ? " is-closing" : ""}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="shop-preview-close"
              onClick={closeCheckout}
              aria-label="Close checkout"
            >
              ×
            </button>

            {orderStatus === "confirmed" ? (
              <div className="shop-order-confirmed">
                <span className="shop-order-check" aria-hidden="true">
                  ✓
                </span>
                <h2>Order confirmed</h2>
                <p className="shop-order-number">{orderNumber}</p>
                <p className="shop-order-note">
                  Real Stripe test-mode payment, verified server-side — but still test mode: no real card was
                  charged.
                </p>
                <button type="button" className="shop-preview-add" onClick={closeCheckout}>
                  Continue shopping
                </button>
              </div>
            ) : orderStatus === "verifying" ? (
              <div className="shop-order-confirmed">
                <h2>Verifying your payment…</h2>
                <p className="shop-order-note">Checking this session with Stripe before confirming the order.</p>
              </div>
            ) : (
              <div className="shop-checkout-layout shop-checkout-layout-single">
                <div className="shop-checkout-summary">
                  <h2>Order summary</h2>
                  <div className="shop-checkout-summary-items">
                    {cartEntries.map(({ line, product }) => (
                      <div key={`${product.id}::${line.size ?? ""}`} className="shop-checkout-summary-item">
                        <div className="shop-cart-item-mark" aria-hidden="true" />
                        <div className="shop-cart-item-info">
                          <span className="shop-cart-item-name">
                            {product.name}
                            {line.size ? ` · ${line.size}` : ""}
                          </span>
                          <span className="shop-cart-item-price">
                            Qty {line.qty} · {formatPrice(product.price)}
                          </span>
                        </div>
                        <span className="shop-checkout-summary-line-total">
                          {formatPrice(product.price * line.qty)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="shop-cart-subtotal">
                    <span>Total</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>

                  <div className="shop-checkout-payment-head">
                    <span className="shop-stripe-badge">Secured by Stripe</span>
                  </div>
                  <p className="shop-checkout-fake-note">
                    You’ll enter your email, shipping address, and card on Stripe’s own payment page — this site
                    never sees your card number. Test mode: use card 4242 4242 4242 4242, any future date, any CVC.
                  </p>
                  {checkoutError && <p className="shop-checkout-error">{checkoutError}</p>}

                  <button
                    type="button"
                    className="shop-preview-add"
                    disabled={orderStatus === "redirecting" || cartEntries.length === 0}
                    onClick={goToStripe}
                  >
                    {orderStatus === "redirecting"
                      ? "Redirecting to Stripe…"
                      : `Continue to Stripe — ${formatPrice(subtotal)}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --scene-t/--dusk-t drive the main site's light<->dark scroll
          transitions (himalayanParallax.tsx) and are never set on this page
          — forced to their "final" values here so Footer renders in its
          intended dark end-of-page look instead of defaulting to 0 (its
          lightest state). */}
      <div style={{ ["--scene-t" as string]: 1, ["--dusk-t" as string]: 1 }}>
        <Footer />
      </div>
    </main>
  );
}
