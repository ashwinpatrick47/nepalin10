"use client";

import { useState, type FormEvent } from "react";
import { CinematicTextReveal } from "@/components/CinematicImageScroll";
import TextStagger from "@/components/TextStagger";

export default function ContactUs() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name || !email || !message || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong, please try again.");
      }
      setSubmitted(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contact-section">
      <TextStagger as="span" className="narrative-kicker" text="Get in touch" />
      <TextStagger
        as="h2"
        className="contact-heading"
        startDelay={0.15}
        lines={["Questions, press,", <em key="em">partnerships.</em>]}
      />
      <CinematicTextReveal className="contact-body" delay={0.3}>
        <p>
          Whether it&rsquo;s about the route, the foundation, or something
          else entirely, drop us a line and we&rsquo;ll get back to you.
        </p>
      </CinematicTextReveal>

      {submitted ? (
        <div className="contact-confirm">
          <p>Thank you, we&rsquo;ll be in touch.</p>
          <button
            type="button"
            className="contact-reset"
            onClick={() => {
              setName("");
              setEmail("");
              setMessage("");
              setSubmitted(false);
            }}
          >
            Send another message
          </button>
        </div>
      ) : (
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="contact-form-row">
            <input
              type="text"
              required
              placeholder="Your name"
              value={name}
              onChange={event => setName(event.target.value)}
              aria-label="Your name"
              disabled={submitting}
            />
            <input
              type="email"
              required
              placeholder="you@email.com"
              value={email}
              onChange={event => setEmail(event.target.value)}
              aria-label="Email address"
              disabled={submitting}
            />
          </div>
          <textarea
            required
            placeholder="Your message"
            value={message}
            onChange={event => setMessage(event.target.value)}
            aria-label="Message"
            disabled={submitting}
            rows={4}
          />
          <button type="submit" className="contact-submit" disabled={submitting}>
            <span className="contact-submit-fill" aria-hidden="true" />
            <span className="contact-submit-label">
              {submitting ? "Sending…" : "Send message"}
            </span>
            <span className="contact-submit-circle" aria-hidden="true">
              <span className="contact-submit-arrow">&#8594;</span>
            </span>
          </button>
        </form>
      )}
      {error && <p className="contact-error">{error}</p>}
    </div>
  );
}
