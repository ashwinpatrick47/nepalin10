#!/usr/bin/env node
// One-time (and re-runnable) upload of everything under public/images to
// Cloudinary. Run with: npm run upload-images
//
// Needs CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET
// in .env.local (get them from https://console.cloudinary.com — Dashboard
// page, after signing up on the free plan). The API key/secret are only
// used here, to authenticate the upload; the deployed site never sees them,
// it only needs NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME (the cloud name is not
// secret — it's part of every public delivery URL) to build image/video
// URLs. See src/lib/cloudinary.ts.
//
// public_id mapping mirrors localPathToPublicId() in src/lib/cloudinary.ts:
// "public/images/flag-nepal.jpg" -> "nepal-in-10/images/flag-nepal". The two
// must stay in sync, or the site will build a URL for a public_id that was
// never uploaded.
//
// Safe to re-run: existing public_ids are skipped unless --force is passed.
import { config } from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

config({ path: ".env.local" });

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error(
    "Missing CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET in .env.local.\n" +
      "Get these from https://console.cloudinary.com (Dashboard page) after signing up — free plan is enough.",
  );
  process.exit(1);
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

const ROOT = fileURLToPath(new URL("../public/images", import.meta.url));
const FORCE = process.argv.includes("--force");

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]);
const VIDEO_EXT = new Set([".mp4", ".mov", ".webm"]);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function toPublicId(absPath) {
  const relFromPublic = path.relative(path.join(ROOT, ".."), absPath); // e.g. images/logo/rara.png
  const withoutExt = relFromPublic.slice(0, -path.extname(relFromPublic).length);
  return `nepal-in-10/${withoutExt.split(path.sep).join("/")}`;
}

async function main() {
  const files = walk(ROOT);
  console.log(`Found ${files.length} file(s) under public/images.\n`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const resourceType = VIDEO_EXT.has(ext) ? "video" : IMAGE_EXT.has(ext) ? "image" : null;
    if (!resourceType) {
      console.log(`skip (unrecognized type): ${file}`);
      continue;
    }

    const publicId = toPublicId(file);

    if (!FORCE) {
      try {
        await cloudinary.api.resource(publicId, { resource_type: resourceType });
        console.log(`already uploaded, skipping: ${publicId}`);
        skipped++;
        continue;
      } catch (err) {
        if (err?.http_code !== 404) {
          console.error(`could not check ${publicId}:`, err.message || err);
          failed++;
          continue;
        }
        // 404 => doesn't exist yet, fall through to upload it
      }
    }

    try {
      const result = await cloudinary.uploader.upload(file, {
        public_id: publicId,
        resource_type: resourceType,
        overwrite: true,
      });
      console.log(`uploaded: ${publicId}  ->  ${result.secure_url}`);
      uploaded++;
    } catch (err) {
      console.error(`FAILED to upload ${file}:`, err.message || err);
      failed++;
    }
  }

  console.log(`\nDone. ${uploaded} uploaded, ${skipped} already present, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

main();
