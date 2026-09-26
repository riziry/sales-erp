import sharp from "sharp";
import { documentImageSchema } from "../domain/image";

export async function normalizeDocumentImage(bytes: Buffer, mime: string) {
  if (!bytes.length || bytes.length > 5 * 1024 * 1024)
    throw new Error("Choose an image smaller than 5 MB.");
  if (!["image/png", "image/jpeg", "image/webp"].includes(mime))
    throw new Error("Use a PNG, JPG, or WebP image.");
  const isPng = bytes
    .subarray(0, 8)
    .equals(Buffer.from("89504e470d0a1a0a", "hex"));
  const isJpeg = bytes.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex"));
  const isWebp =
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP";
  if (!isPng && !isJpeg && !isWebp)
    throw new Error("Use a valid PNG, JPG, or WebP image.");
  try {
    const image = sharp(bytes, {
      limitInputPixels: 25_000_000,
      animated: false,
    });
    const metadata = await image.metadata();
    if (
      !["png", "jpeg", "webp"].includes(metadata.format || "") ||
      (metadata.pages || 1) > 1
    )
      throw new Error("Unsupported image");
    const png = await image
      .rotate()
      .resize({
        width: 800,
        height: 320,
        fit: "inside",
        withoutEnlargement: true,
      })
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();
    return documentImageSchema.parse(
      `data:image/png;base64,${png.toString("base64")}`,
    );
  } catch {
    throw new Error(
      "This image could not be read. Upload a PNG, JPG, or WebP image.",
    );
  }
}
