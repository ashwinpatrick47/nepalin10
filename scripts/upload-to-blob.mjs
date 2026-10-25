#!/usr/bin/env node
// One-off migration: uploads the project's video assets to Vercel Blob and
// prints the resulting URLs to paste into the components that reference
// them. Run with: npm run upload-videos
//
// Needs BLOB_READ_WRITE_TOKEN in .env.local — create a Blob store under the
// project's Storage tab on vercel.com, which generates this token; copy it
// in from there (Vercel also adds it to the deployed project's own env vars
// automatically, so production doesn't need any extra setup).
import { config } from "dotenv";
import { put } from "@vercel/blob";
import { readFile } from "node:fs/promises";

config({ path: ".env.local" });

// mountain-drive.mp4 (since deleted from Blob and replaced by nepal1.mp4),
// socials.mp4, nepal.mp4, and nepal1.mp4 already migrated and removed
// locally — re-add them here (with their files restored) if they ever need
// re-upload.
const FILES = [];

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error(
      "Missing BLOB_READ_WRITE_TOKEN in .env.local.\n" +
        "Create a Blob store under Storage on vercel.com, then copy its token in.",
    );
    process.exit(1);
  }

  for (const path of FILES) {
    const body = await readFile(path);
    const filename = path.split("/").pop();
    const blob = await put(filename, body, {
      access: "public",
      addRandomSuffix: false,
    });
    console.log(`${path} -> ${blob.url}`);
  }
}

main();
