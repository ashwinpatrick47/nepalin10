#!/usr/bin/env node
// One-off setup: creates the Resend Audience that the newsletter signup
// form (/api/subscribe) adds people to, and that live-run-tracker's
// run-started broadcast sends to. Run once with: npm run create-audience
// Prints the Audience ID — paste it into RESEND_AUDIENCE_ID in both
// .env.local (this app) and live-run-tracker/.env.
import { config } from "dotenv";
import { Resend } from "resend";

config({ path: ".env.local" });

async function main() {
  if (!process.env.RESEND_API_KEY) {
    console.error(
      "Missing RESEND_API_KEY in .env.local.\n" +
        "Create a free account at resend.com, then an API key under API Keys.",
    );
    process.exit(1);
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.audiences.create({ name: "Nepal in 10 subscribers" });

  if (error) {
    console.error("Failed to create audience:", error.message);
    process.exit(1);
  }

  console.log(`Audience created: ${data.id}`);
  console.log("Add this as RESEND_AUDIENCE_ID in .env.local and live-run-tracker/.env.");
}

main();
