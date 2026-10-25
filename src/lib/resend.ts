import { Resend } from "resend";

// Server-only — used by /api/subscribe to add newsletter signups to the
// Resend Audience that live-run-tracker's run-started email broadcasts to.
const apiKey = process.env.RESEND_API_KEY;

export function getResend(): Resend {
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it to .env.local (create a free account at resend.com, then an API key under API Keys).",
    );
  }
  return new Resend(apiKey);
}
