import type { ImgHTMLAttributes } from "react";

/** Uploaded images are already normalized, embedded PNGs (or local blob previews).
 * They need no Next.js image optimizer; native intrinsic sizing preserves their
 * actual proportions instead of treating a preview box as source dimensions.
 */
export default function DocumentImage({
  style,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- embedded images never use the optimizer
    <img {...props} style={{ width: "auto", height: "auto", ...style }} />
  );
}
