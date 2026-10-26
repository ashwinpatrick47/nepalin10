import { config } from "dotenv";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFile } from "node:fs/promises";

config({ path: ".env.local" });

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL } =
  process.env;

const client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const body = await readFile("public/images/logo/rara-pink-email.png");
await client.send(
  new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: "rara-pink-email.png",
    Body: body,
    ContentType: "image/png",
  }),
);
console.log(`${R2_PUBLIC_URL}/rara-pink-email.png`);
