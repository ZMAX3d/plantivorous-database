#!/usr/bin/env node
/**
 * Import verified cultivar-specific photographs found by find-cultivar-photos.mjs.
 *
 * Reads  .photo-test/cultivar-picks-v2.json
 * Writes assets/img/species/<slug>.jpg and appends to data/photo-credits.json
 *
 * A pick is only imported when its licence is CC0, CC BY, CC BY-SA or public
 * domain, the file is a real bitmap, and the species has no existing credit.
 * Existing credits and image files are never overwritten.
 *
 * Usage: node scripts/import-cultivar-photos.mjs [--dry-run]
 */

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PICKS = join(ROOT, ".photo-test/cultivar-picks-v2.json");
const CREDITS = join(ROOT, "data/photo-credits.json");
const DRY = process.argv.includes("--dry-run");

const UA = {
  "User-Agent":
    "PlantivorousDatabaseBot/1.1 (https://github.com/ZMAX3d/plantivorous-database; educational carnivorous-plant catalogue) node",
};

const slugify = (value) =>
  String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const clean = (value) =>
  String(value || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const allowedLicense = (license) =>
  /^(cc0|cc by(?!-nc|-nd)|public domain|pd)/i.test(String(license || "").trim());

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const picksDoc = JSON.parse(await readFile(PICKS, "utf8"));
const creditDoc = JSON.parse(await readFile(CREDITS, "utf8"));
const credits = creditDoc.credits || [];
const bySpecies = new Map(credits.map((credit) => [credit.species, credit]));

const queue = Object.entries(picksDoc).filter(
  ([name, entry]) => entry.pick && !bySpecies.has(name)
);
console.log(`Picks with a photo: ${Object.values(picksDoc).filter((e) => e.pick).length}`);
console.log(
  `Already credited:  ${Object.entries(picksDoc).filter(([name, e]) => e.pick && bySpecies.has(name)).length}`
);
console.log(`To import:         ${queue.length}`);

await mkdir(join(ROOT, "assets/img/species"), { recursive: true });

let imported = 0;
let skipped = 0;

for (const [name, entry] of queue) {
  const pick = entry.pick;
  const license = clean(pick.license);
  if (!allowedLicense(license)) {
    console.log(`SKIP ${name}: licence ${license}`);
    skipped++;
    continue;
  }
  if (!/^image\/(jpeg|png|webp)/i.test(pick.mime || "image/jpeg")) {
    console.log(`SKIP ${name}: ${pick.mime}`);
    skipped++;
    continue;
  }
  const file = `assets/img/species/${slugify(name)}.jpg`;
  const target = join(ROOT, file);
  if (await exists(target)) {
    console.log(`SKIP ${name}: ${file} already exists`);
    skipped++;
    continue;
  }

  const record = {
    species: name,
    file,
    source: pick.page,
    original: clean(pick.title).replace(/^File:/, ""),
    artist: clean(pick.artist) || "Wikimedia Commons",
    credit: clean(pick.credit) || "Wikimedia Commons",
    license,
    licenseUrl: pick.licenseUrl || "",
    description: clean(pick.description).slice(0, 300),
    cultivarSpecific: true,
  };

  if (DRY) {
    console.log(`DRY  ${name} -> ${file} (${license})`);
    imported++;
    continue;
  }

  try {
    const res = await fetch(pick.url, { headers: UA });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    await sharp(buffer)
      .rotate()
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 88, mozjpeg: true })
      .toFile(target);
    credits.push(record);
    bySpecies.set(name, record);
    imported++;
    console.log(`OK   ${name} -> ${file} (${license})`);
  } catch (err) {
    console.log(`FAIL ${name}: ${err.message}`);
    skipped++;
  }
  await new Promise((r) => setTimeout(r, 400));
}

if (!DRY && imported) {
  creditDoc.credits = credits;
  await writeFile(CREDITS, JSON.stringify(creditDoc, null, 2) + "\n", "utf8");
}

console.log(`\nImported ${imported}; skipped ${skipped}; credits now ${credits.length}.`);
