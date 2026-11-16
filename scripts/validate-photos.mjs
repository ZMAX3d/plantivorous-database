import { readFile, writeFile, readdir, stat, unlink } from "node:fs/promises";
import sharp from "sharp";

/**
 * Validates every photo credit and image file.
 *
 *   node scripts/validate-photos.mjs [--fix]
 *
 * Checks:
 *  - credit.species exists in data/species.json
 *  - credit.file exists on disk and is a real JPEG (sharp-parseable, >= 200px wide)
 *  - reports credits without files and orphan files without credits
 *
 * With --fix:
 *  - deletes credits whose file is missing or invalid
 *  - deletes the corresponding broken image files
 */

const FIX = process.argv.includes("--fix");

const pc = JSON.parse(await readFile("data/photo-credits.json", "utf8"));
const data = JSON.parse(await readFile("data/species.json", "utf8"));
const speciesNames = new Set(data.species.map((s) => s.name));

const files = (await readdir("assets/img/species")).filter((f) => f.toLowerCase().endsWith(".jpg"));
const fileSet = new Set(files.map((f) => `assets/img/species/${f}`));

const problems = [];
const keep = [];

for (const credit of pc.credits) {
  const label = credit.species;
  if (!speciesNames.has(credit.species)) {
    problems.push({ credit, reason: `species not in dataset: ${credit.species}` });
    continue;
  }
  if (!fileSet.has(credit.file)) {
    problems.push({ credit, reason: `missing file: ${credit.file}` });
    continue;
  }
  try {
    const s = await stat(credit.file);
    if (s.size < 2048) throw new Error(`suspiciously small (${s.size} bytes)`);
    const meta = await sharp(credit.file).metadata();
    if (meta.format !== "jpeg") throw new Error(`not a JPEG (${meta.format})`);
    if (!meta.width || meta.width < 200) throw new Error(`too narrow (${meta.width}px)`);
    keep.push(credit);
  } catch (err) {
    problems.push({ credit, reason: `invalid image: ${err.message}` });
  }
}

const claimed = new Set(keep.map((c) => c.file));
const orphans = [...fileSet].filter((f) => !claimed.has(f));

console.log(`Credits: ${pc.credits.length}`);
console.log(`Valid: ${keep.length}`);
console.log(`Problems: ${problems.length}`);
console.log(`Orphan image files: ${orphans.length}`);

for (const p of problems) {
  console.log(`  PROBLEM: ${p.credit.species} -> ${p.reason}`);
}
for (const o of orphans) {
  console.log(`  ORPHAN: ${o}`);
}

if (FIX) {
  for (const p of problems) {
    if (p.reason.startsWith("invalid image") && fileSet.has(p.credit.file)) {
      try {
        await unlink(p.credit.file);
        console.log(`  Deleted invalid file: ${p.credit.file}`);
      } catch {}
    }
  }
  for (const o of orphans) {
    try {
      await unlink(o);
      console.log(`  Deleted orphan file: ${o}`);
    } catch {}
  }
  pc.credits = keep;
  await writeFile("data/photo-credits.json", JSON.stringify(pc, null, 2), "utf8");
  console.log(`\nFixed. Credits now: ${pc.credits.length}`);
}
