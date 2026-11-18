#!/usr/bin/env node
/**
 * Strict iNaturalist photo fallback for species with no usable Commons image.
 *
 * Usage:
 *   node scripts/add-inat-photos.mjs "Craniolaria integrifolia" ...
 *   node scripts/add-inat-photos.mjs --genus=Craniolaria integrifolia ...
 *   node scripts/add-inat-photos.mjs --queue=.photo-queue-all.txt
 *
 * Standards (kept deliberately tighter than the Commons fetcher):
 *  - exact iNaturalist taxon match, research-grade observations only
 *  - commercial-friendly photo licences only: CC0, CC BY, CC BY-SA
 *  - no NC or ND images, no "all rights reserved" images
 *  - image must be a real bitmap, at least 500 px wide, sensible aspect ratio
 *  - re-encoded to JPEG quality 88 before writing
 *  - full attribution stored in data/photo-credits.json
 *
 * Commons remains the primary source. This script only fills gaps where no
 * valid Commons file exists, and never overwrites an existing credit.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import sharp from "sharp";

const pcPath = "data/photo-credits.json";
const pc = JSON.parse(await readFile(pcPath, "utf8"));
const existingCredits = new Map(pc.credits.map((c) => [c.species, c]));
const usedSources = new Set(pc.credits.map((c) => c.source).filter(Boolean));

const IMG_DIR = "assets/img/species";
await mkdir(IMG_DIR, { recursive: true });

const headers = {
  "User-Agent":
    "PlantivorousDatabase/1.0 (https://plantivorous.co.za; contact@plantivorous.co.za) educational-use",
  "Accept": "application/json",
};

const ALLOWED_LICENSES = new Map([
  ["cc0", { label: "CC0", url: "https://creativecommons.org/publicdomain/zero/1.0/" }],
  ["cc-by", { label: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" }],
  [
    "cc-by-sa",
    { label: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" },
  ],
]);

const slugify = (value) =>
  String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const cleanHtml = (value) =>
  String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function artistFromAttribution(attribution) {
  const text = cleanHtml(attribution);
  if (/^no rights reserved/i.test(text)) return "iNaturalist contributor";
  return (
    text
      .replace(/^\(c\)\s*/i, "")
      .replace(/,\s*some rights reserved.*$/i, "")
      .replace(/,\s*all rights reserved.*$/i, "")
      .trim() || "iNaturalist contributor"
  );
}

async function findTaxon(fullName) {
  const url = new URL("https://api.inaturalist.org/v1/taxa");
  url.searchParams.set("q", fullName);
  url.searchParams.set("per_page", "10");
  const resp = await fetch(url.toString(), { headers });
  if (!resp.ok) throw new Error(`iNaturalist taxa HTTP ${resp.status}`);
  const data = await resp.json();
  const results = data.results || [];
  return (
    results.find((t) => t.name === fullName && t.rank === "species") ||
    results.find((t) => t.name === fullName) ||
    null
  );
}

async function observationsFor(taxonId) {
  const url = new URL("https://api.inaturalist.org/v1/observations");
  url.searchParams.set("taxon_id", String(taxonId));
  url.searchParams.set("photo_license", "cc0,cc-by,cc-by-sa");
  url.searchParams.set("quality_grade", "research");
  url.searchParams.set("per_page", "30");
  url.searchParams.set("order_by", "votes");
  const resp = await fetch(url.toString(), { headers });
  if (!resp.ok) throw new Error(`iNaturalist observations HTTP ${resp.status}`);
  return resp.json();
}

function candidatesFrom(data, fullName) {
  const candidates = [];
  for (const obs of data.results || []) {
    if (obs.quality_grade !== "research") continue;
    if (obs.taxon?.name !== fullName) continue;
    for (const photo of obs.photos || []) {
      const license = ALLOWED_LICENSES.get(photo.license_code);
      if (!license) continue;
      if (!photo.id) continue;
      const source = `https://www.inaturalist.org/observations/${obs.id}`;
      if (usedSources.has(source)) continue;
      const dims = photo.original_dimensions || {};
      const longSide = Math.max(dims.width || 0, dims.height || 0);
      const shortSide = Math.min(dims.width || 0, dims.height || 0);
      if (longSide < 800 || shortSide < 500) continue;
      candidates.push({ obs, photo, license, source, area: (dims.width || 0) * (dims.height || 0) });
    }
  }
  return candidates.sort((a, b) => b.area - a.area);
}

function largeUrl(photo) {
  // The API returns the square rendition; the stable S3 pattern also exposes
  // a 1024 px "large" rendition used here.
  return String(photo.url).replace(/\/(square|thumb|small|medium)\./, "/large.");
}

const speciesList = [];
const genusFlag = process.argv.find((a) => a.startsWith("--genus="));
const bareGenus = genusFlag ? genusFlag.split("=")[1] : null;
const queueFlag = process.argv.find((a) => a.startsWith("--queue="));

if (queueFlag) {
  const raw = await readFile(queueFlag.split("=")[1], "utf8");
  const names = [...raw.matchAll(/"([^"]+)"/g)].map((m) => m[1].trim());
  for (const name of names) if (name) speciesList.push(name);
}

for (const arg of process.argv.slice(2)) {
  if (arg.startsWith("--")) continue;
  if (arg.includes(" ")) speciesList.push(arg.trim());
  else if (bareGenus) speciesList.push(`${bareGenus} ${arg.trim()}`);
  else {
    console.error(`Cannot understand "${arg}" - pass "Genus epithet" or use --genus=Genus.`);
    process.exit(1);
  }
}

if (speciesList.length === 0) {
  console.error(
    'Usage: node scripts/add-inat-photos.mjs "Genus epithet" ...  (or --genus=Genus epithet ...)'
  );
  process.exit(1);
}

let added = 0;
let skipped = 0;
let failed = 0;
const failures = [];

for (const fullName of speciesList) {
  if (existingCredits.has(fullName)) {
    skipped++;
    continue;
  }

  try {
    const taxon = await findTaxon(fullName);
    if (!taxon) throw new Error("no exact iNaturalist taxon match");

    const data = await observationsFor(taxon.id);
    const candidates = candidatesFrom(data, fullName);
    if (candidates.length === 0) throw new Error("no research-grade CC0/BY/SA photo");

    let saved = null;
    let lastErr = null;
    for (const cand of candidates.slice(0, 8)) {
      try {
        const resp = await fetch(largeUrl(cand.photo), { headers });
        if (!resp.ok) throw new Error(`image HTTP ${resp.status}`);
        const contentType = resp.headers.get("content-type") || "";
        if (!contentType.startsWith("image/")) {
          throw new Error(`unexpected content-type ${contentType}`);
        }
        const buf = Buffer.from(await resp.arrayBuffer());
        if (buf.length < 4096) throw new Error("file too small to be a photo");
        const meta = await sharp(buf).metadata();
        if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format)) {
          throw new Error(`unexpected image format ${meta.format}`);
        }
        if (!meta.width || meta.width < 500) throw new Error(`image too narrow (${meta.width}px)`);
        if (!meta.height || meta.width / meta.height > 3 || meta.height / meta.width > 3) {
          throw new Error(`extreme aspect ratio (${meta.width}x${meta.height})`);
        }
        const jpeg = await sharp(buf)
          .rotate()
          .jpeg({ quality: 88, mozjpeg: true })
          .toBuffer();
        saved = { jpeg, meta, cand };
        break;
      } catch (err) {
        lastErr = err;
      }
    }

    if (!saved) throw lastErr || new Error("no usable candidate");

    const base = slugify(`${fullName}`);
    let fname = `${base}.jpg`;
    let n = 2;
    while (existsSync(`${IMG_DIR}/${fname}`)) {
      const claimed = [...existingCredits.values()].some(
        (c) => c.file === `assets/img/species/${fname}`
      );
      if (!claimed) break;
      fname = `${base}-${n++}.jpg`;
    }
    await writeFile(`${IMG_DIR}/${fname}`, saved.jpeg);

    const { obs, photo, license, source } = saved.cand;
    const artist = artistFromAttribution(photo.attribution);
    const description = [
      `iNaturalist research-grade observation ${obs.id}`,
      obs.place_guess,
      obs.observed_on,
    ]
      .filter(Boolean)
      .join(" · ");

    const credit = {
      species: fullName,
      file: `assets/img/species/${fname}`,
      source,
      original: `iNaturalist photo ${photo.id}`,
      artist,
      credit: cleanHtml(photo.attribution) || artist,
      license: license.label,
      licenseUrl: license.url,
      description: description.length > 220 ? description.slice(0, 217) + "…" : description,
      alt: `Photograph of ${fullName}`,
      sourceType: "iNaturalist",
    };

    pc.credits.push(credit);
    existingCredits.set(fullName, credit);
    usedSources.add(source);
    added++;
    console.log(
      `  OK: ${fullName} (${license.label}, ${saved.meta.width}x${saved.meta.height}, ${Math.round(
        saved.jpeg.length / 1024
      )}KB, obs ${obs.id})`
    );
  } catch (err) {
    failed++;
    failures.push(`${fullName}: ${err.message}`);
    console.log(`  FAIL: ${fullName} - ${err.message}`);
  }

  await writeFile(pcPath, JSON.stringify(pc, null, 2), "utf8");
  await sleep(700);
}

await writeFile(pcPath, JSON.stringify(pc, null, 2), "utf8");
console.log(`\nDone: ${added} added, ${skipped} skipped, ${failed} failed. Total credits: ${pc.credits.length}`);
if (failures.length) {
  console.log("\nFailures:");
  failures.forEach((f) => console.log("  " + f));
}
