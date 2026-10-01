// Resolves a local /public path (e.g. "/images/flag-nepal.jpg") to its
// Cloudinary-hosted equivalent. Falls back to the local path unchanged
// whenever NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME isn't set — same pattern as the
// terrain map's Mapbox-token fallback (src/components/terrain/TopographicMap.tsx):
// the site works with plain local files until Cloudinary is actually
// configured, rather than breaking.
//
// The Cloudinary side of this mapping is `scripts/upload-to-cloudinary.mjs`,
// which uploads every file under public/images to a public_id built the same
// way localPathToPublicId() builds one here — the two must stay in sync, or
// this resolves to a URL for an asset that was never uploaded.
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

// "/images/logo/rara.png" -> "nepal-in-10/images/logo/rara" (no extension —
// Cloudinary identifies a resource by public_id, format is negotiated
// separately via f_auto).
function localPathToPublicId(localPath: string): string {
  const withoutLeadingSlash = localPath.replace(/^\/+/, "");
  const withoutExtension = withoutLeadingSlash.replace(/\.[^./]+$/, "");
  return `nepal-in-10/${withoutExtension}`;
}

function buildUrl(localPath: string, resourceType: "image" | "video", transformation: string): string {
  if (!CLOUD_NAME) return localPath;
  const publicId = localPathToPublicId(localPath);
  return `https://res.cloudinary.com/${CLOUD_NAME}/${resourceType}/upload/${transformation}/${publicId}`;
}

// f_auto: serve WebP/AVIF to browsers that support it, original format otherwise.
// q_auto: Cloudinary picks the lowest quality that doesn't visibly degrade the image.
// c_limit,w_<n>: never upscale, only shrink — a plain cap on delivered width.
export function cldImageUrl(localPath: string, maxWidth?: number): string {
  const sizing = maxWidth ? `,c_limit,w_${maxWidth}` : "";
  return buildUrl(localPath, "image", `f_auto,q_auto${sizing}`);
}

// vc_auto: Cloudinary picks a modern codec (e.g. VP9/AV1) when the browser
// supports it, same idea as f_auto for images.
export function cldVideoUrl(localPath: string): string {
  return buildUrl(localPath, "video", "f_auto,q_auto,vc_auto");
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUD_NAME);
}
