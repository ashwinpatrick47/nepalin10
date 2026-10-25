#!/usr/bin/env node
// One-off migration: uploads the project's video assets to Cloudflare R2
// and prints the resulting public URLs to paste into the components that
// reference them. Run with: npm run upload-videos-r2
//
// Needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and
// R2_BUCKET_NAME in .env.local — create a bucket under R2 Object Storage
// on the Cloudflare dashboard, then an API token (R2 → Manage API Tokens)
// scoped to that bucket for the key/secret. Unlike Vercel Blob, R2 charges
// $0 for egress/bandwidth no matter how much traffic the videos get — see
// R2_PUBLIC_URL below for how the files are actually served publicly.
import { config } from "dotenv";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFile } from "node:fs/promises";

config({ path: ".env.local" });

const FILES = [
  "public/images/nepal1.mp4",
  "public/images/nepal.mp4",
  "public/images/socials.mp4",
];

async function main() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL } =
    process.env;

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.error(
      "Missing R2 credentials in .env.local.\n" +
        "Needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.\n" +
        "Create a bucket under R2 Object Storage on the Cloudflare dashboard, then an API\n" +
        "token (R2 → Manage API Tokens) scoped to it for the access key/secret.",
    );
    process.exit(1);
  }
  if (!R2_PUBLIC_URL) {
    console.error(
      "Missing R2_PUBLIC_URL in .env.local.\n" +
        "Either enable the bucket's free r2.dev public URL (Settings → Public access) and use\n" +
        "that, or connect a custom domain to the bucket — either way, paste the base URL here\n" +
        "(no trailing slash) so this script can print the final video URLs.",
    );
    process.exit(1);
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  for (const path of FILES) {
    const body = await readFile(path);
    const filename = path.split("/").pop();
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: filename,
        Body: body,
        ContentType: "video/mp4",
      }),
    );
    console.log(`${path} -> ${R2_PUBLIC_URL}/${filename}`);
  }
}

main();
