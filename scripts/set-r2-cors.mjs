#!/usr/bin/env node
// One-off: sets the CORS policy on the R2 bucket so the browser is allowed
// to read video pixel data cross-origin — required specifically for
// VideoPerlinReveal's WebGL texture (video.crossOrigin = "anonymous"),
// not needed for plain <video> tags (Why Nepal, Socials), but harmless to
// have for those too. Run once with: node scripts/set-r2-cors.mjs
import { config } from "dotenv";
import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

config({ path: ".env.local" });

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error("Missing R2 credentials in .env.local.");
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

await client.send(
  new PutBucketCorsCommand({
    Bucket: R2_BUCKET_NAME,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: [
            "https://www.nepalin10.com",
            "https://nepalin10.com",
            "http://localhost:3000",
          ],
          AllowedMethods: ["GET", "HEAD"],
          AllowedHeaders: ["*"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }),
);

console.log("CORS policy set on bucket:", R2_BUCKET_NAME);
