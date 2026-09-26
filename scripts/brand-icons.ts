import sharp from "sharp";
import { writeFile } from "node:fs/promises";
async function main() {
  // Frame the supplied square artwork for small browser tabs (remove outer whitespace).
  const icon = sharp("public/logo.png").extract({
    left: 260,
    top: 260,
    width: 740,
    height: 740,
  });
  await icon.clone().resize(180, 180).png().toFile("app/apple-icon.png");
  const png = await icon.resize(64, 64).ensureAlpha().png().toBuffer();
  // ICO directory containing a standard PNG image.
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header[6] = 64;
  header[7] = 64;
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  await writeFile("app/favicon.ico", Buffer.concat([header, png]));
}
main().catch(() => {
  console.error("Unable to generate icons from public/logo.png");
  process.exitCode = 1;
});
