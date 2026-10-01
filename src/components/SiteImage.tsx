import Image, { type ImageProps } from "next/image";
import { cldImageUrl } from "@/lib/cloudinary";

// Drop-in replacement for next/image: same props, `src` stays a plain local
// path like "/images/flag-nepal.jpg" at every call site. Resolves to the
// Cloudinary URL when configured (see src/lib/cloudinary.ts), and sets
// `unoptimized` in that case — Cloudinary's own f_auto/q_auto transformation
// already does the format/quality work Next's image optimizer would
// otherwise redundantly repeat on top of an already-optimized file.
type SiteImageProps = Omit<ImageProps, "src"> & { src: string };

export default function SiteImage({ src, unoptimized, ...rest }: SiteImageProps) {
  const resolved = cldImageUrl(src);
  // alt is required by SiteImageProps (inherited from ImageProps) and every
  // call site is typechecked accordingly — eslint's static check just can't
  // see it through the ...rest spread.
  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image src={resolved} unoptimized={unoptimized ?? resolved !== src} {...rest} />;
}
