import { type ComponentPropsWithoutRef, createElement } from "react";

type ImgProps = ComponentPropsWithoutRef<"img">;

/**
 * Thin wrapper around the native `<img>` element used by library components
 * that must work outside Next.js. Consumers in Next.js apps can swap this
 * for `next/image` via the image-optimiser provider.
 */
function Img({
  alt = "",
  loading = "lazy",
  decoding = "async",
  ...props
}: ImgProps) {
  return createElement("img", { alt, decoding, loading, ...props });
}

export { Img, type ImgProps };
