"use client";

import { useState, type FormEvent } from "react";
import { CinematicTextReveal } from "@/components/CinematicImageScroll";
import TextStagger from "@/components/TextStagger";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong, try again.");
      }
      setSubmitted(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="newsletter-section">
      <TextStagger as="span" className="narrative-kicker" text="Follow the attempt" />
      <TextStagger
        as="h2"
        className="newsletter-heading"
        startDelay={0.15}
        lines={["Get updates before", <em key="em">they hit the road.</em>]}
      />
      <CinematicTextReveal className="newsletter-body" delay={0.3}>
        <p>
          Route changes, training milestones and the countdown to day one,
          straight to your inbox, nothing else.
        </p>
      </CinematicTextReveal>

      {submitted ? (
        <div className="newsletter-confirm">
          <p>You&apos;re on the list, thank you.</p>
          <button
            type="button"
            className="newsletter-reset"
            onClick={() => {
              setEmail("");
              setSubmitted(false);
            }}
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form className="newsletter-form" onSubmit={handleSubmit}>
          <input
            type="email"
            required
            placeholder="you@email.com"
            value={email}
            onChange={event => setEmail(event.target.value)}
            aria-label="Email address"
            disabled={submitting}
          />
          <button type="submit" className="newsletter-submit" disabled={submitting}>
            <span className="newsletter-submit-fill" aria-hidden="true" />
            <span className="newsletter-submit-label">
              {submitting ? "Subscribing…" : "Subscribe"}
            </span>
            <span className="newsletter-submit-circle" aria-hidden="true">
              <span className="newsletter-submit-arrow">&#8594;</span>
            </span>
          </button>
        </form>
      )}
      {error && <p className="newsletter-error">{error}</p>}
    </div>
  );
}
