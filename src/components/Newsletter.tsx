"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { CinematicTextReveal } from "@/components/CinematicImageScroll";
import TextStagger from "@/components/TextStagger";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  return (
    <div className="newsletter-section">
      <div className="newsletter-backdrop" aria-hidden="true">
        <Image
          src="/images/himalayan-valley.png"
          alt=""
          fill
          sizes="(max-width: 900px) 90vw, 1200px"
          className="newsletter-backdrop-image"
        />
      </div>

      <div className="newsletter-content">
        <TextStagger as="span" className="narrative-kicker" text="Follow the attempt" />
        <TextStagger as="h2" text="Get updates before they hit the road." startDelay={0.15} />
        <CinematicTextReveal className="newsletter-copy" delay={0.3}>
          <p>
            Route changes, training milestones and the countdown to day one
            &mdash; straight to your inbox, nothing else.
          </p>

          {submitted ? (
            <p className="newsletter-confirm">
              You&apos;re on the list &mdash; thank you.
            </p>
          ) : (
            <form className="newsletter-form" onSubmit={handleSubmit}>
              <input
                type="email"
                required
                placeholder="you@email.com"
                value={email}
                onChange={event => setEmail(event.target.value)}
                aria-label="Email address"
              />
              <button type="submit">Subscribe</button>
            </form>
          )}
        </CinematicTextReveal>
      </div>
    </div>
  );
}
