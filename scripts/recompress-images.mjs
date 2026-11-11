import sharp from "sharp";
import { readdir, stat, unlink, writeFile, readFile } from "node:fs/promises";

const IMG_DIR = "assets/img/species";
const QUALITY = 88;

const files = (await readdir(IMG_DIR)).filter((f) => f.toLowerCase().endsWith(".jpg"));

let totalOriginal = 0;
let totalNew = 0;
let processed = 0;
let deleted = 0;
let skipped = 0;
let errors = [];

for (const fname of files) {
  const path = `${IMG_DIR}/${fname}`;
  let s;
  try {
    s = await stat(path);
  } catch (e) {
    continue;
  }
  totalOriginal += s.size;

  try {
    const buf = await readFile(path);
    let meta;
    try {
      meta = await sharp(buf).metadata();
    } catch (e) {
      // Not a valid image at all — delete it
      await unlink(path);
      deleted++;
      console.log(`DELETED (invalid image): ${fname} (${Math.round(s.size / 1024 / 1024)}MB)`);
      continue;
    }

    if (meta.format !== "jpeg") {
      await unlink(path);
      deleted++;
      console.log(`DELETED (format=${meta.format}): ${fname} (${Math.round(s.size / 1024 / 1024)}MB)`);
      continue;
    }

    // Recompress at same dimensions, quality 88
    const compressed = await sharp(buf)
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer();

    if (compressed.length < s.size) {
      await writeFile(path, compressed);
      totalNew += compressed.length;
      processed++;
      const saved = ((s.size - compressed.length) / s.size * 100).toFixed(1);
      console.log(`OK: ${fname} ${Math.round(s.size / 1024)}KB -> ${Math.round(compressed.length / 1024)}KB (saved ${saved}%)`);
    } else {
      totalNew += s.size;
      skipped++;
      console.log(`SKIP (not smaller): ${fname} ${Math.round(s.size / 1024)}KB`);
    }
  } catch (err) {
    errors.push(`${fname}: ${err.message}`);
    console.log(`ERROR: ${fname} - ${err.message}`);
  }
}

console.log(`\n=== Summary ===`);
console.log(`Processed (recompressed): ${processed}`);
console.log(`Deleted (invalid/non-JPEG): ${deleted}`);
console.log(`Skipped (not smaller): ${skipped}`);
console.log(`Errors: ${errors.length}`);
console.log(`Original total: ${Math.round(totalOriginal / 1024 / 1024)}MB`);
console.log(`New total: ${Math.round(totalNew / 1024 / 1024)}MB`);
console.log(`Saved: ${Math.round((totalOriginal - totalNew) / 1024 / 1024)}MB`);

if (errors.length > 0) {
  console.log(`\nErrors:`);
  errors.forEach((e) => console.log(`  ${e}`));
}
