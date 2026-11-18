#!/usr/bin/env node
/**
 * Last-resort GBIF photo/specimen fallback.
 *
 * Usage:
 *   node scripts/add-gbif-photos.mjs "Dioncophyllum thollonii" ...
 *   node scripts/add-gbif-photos.mjs --genus=Dioncophyllum thollonii ...
 *   node scripts/add-gbif-photos.mjs --queue=.photo-queue-all.txt
 *
 * Use only after Commons and iNaturalist have failed. GBIF media often means
 * a pressed herbarium sheet, which is acceptable for very rare species that
 * have no living-plant photograph under an open licence, but it is never
 * preferred over a real plant photo.
 *
 * Standards:
 *  - exact GBIF species match
 *  - commercial-friendly media licences only: CC0, CC BY, CC BY-SA
 *  - no NC or ND media, no unknown licences
 *  - real bitmap, at least 500 px wide, re-encoded to JPEG q88
 *  - credit links back to the GBIF occurrence and names the collection
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

const headers = { "User-Agent": "PlantivorousDatabase/1.0 (educational)" };

const LICENSE_MAP = [
  [/publicdomain\/zero/i, { label: "CC0", url: "https://creativecommons.org/publicdomain/zero/1.0/" }],
  [/licenses\/by-sa\/4/i, { label: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" }],
  [/licenses\/by-sa\/3/i, { label: "CC BY-SA 3.0", url: "https://creativecommons.org/licenses/by-sa/3.0/" }],
  [/licenses\/by\/4/i, { label: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" }],
  [/licenses\/by\/3/i, { label: "CC BY 3.0", url: "https://creativecommons.org/licenses/by/3.0/" }],
  [/licenses\/by\/2\.5/i, { label: "CC BY 2.5", url: "https://creativecommons.org/licenses/by/2.5/" }],
];

const slugify = (value) =>
  String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function licenseFor(url) {
  if (!url) return null;
  for (const [pattern, value] of LICENSE_MAP) if (pattern.test(url)) return value;
  return null;
}

async function gbifMatch(fullName) {
  const url = new URL("https://api.gbif.org/v1/species/match");
  url.searchParams.set("name", fullName);
  const data = await fetch(url.toString(), { headers }).then((r) => r.json());
  if (data.matchType !== "EXACT" || !data.speciesKey) return null;
  return data;
}

async function mediaCandidates(speciesKey, fullName) {
  const candidates = [];
  for (let offset = 0; offset < 300; offset += 100) {
    const url = new URL("https://api.gbif.org/v1/occurrence/search");
    url.searchParams.set("taxonKey", String(speciesKey));
    url.searchParams.set("mediaType", "StillImage");
    url.searchParams.set("limit", "100");
    url.searchParams.set("offset", String(offset));
    const data = await fetch(url.toString(), { headers }).then((r) => r.json());
    const results = data.results || [];
    for (const occ of results) {
      for (const media of occ.media || []) {
        const license = licenseFor(media.license);
        if (!license) continue;
        if (!media.identifier) continue;
        if (!/^https?:/i.test(media.identifier)) continue;
        if (/\.(pdf|svg|tif|tiff)(\?|$)/i.test(media.identifier)) continue;
        const source = `https://www.gbif.org/occurrence/${occ.key}`;
        if (usedSources.has(source)) continue;
        const living = /HUMAN_OBSERVATION|MACHINE_OBSERVATION|OBSERVATION/i.test(
          occ.basisOfRecord || ""
        );
        const longSide = Math.max(media.width || 0, media.height || 0);
        candidates.push({
          occ,
          media,
          license,
          source,
          living,
          score: (living ? 100000000 : 0) + (longSide || 0),
        });
      }
    }
    if (offset + 100 >= (data.count || 0)) break;
  }
  const seen = new Set();
  return candidates
    .filter((c) => {
      if (seen.has(c.media.identifier)) return false;
      seen.add(c.media.identifier);
      return true;
    })
    .sort((a, b) => b.score - a.score);
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
    'Usage: node scripts/add-gbif-photos.mjs "Genus epithet" ...  (or --genus=Genus epithet ...)'
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
    const match = await gbifMatch(fullName);
    if (!match) throw new Error("no exact GBIF species match");

    const candidates = await mediaCandidates(match.speciesKey, fullName);
    if (candidates.length === 0) throw new Error("no commercial-friendly GBIF image");

    let saved = null;
    let lastErr = null;
    for (const cand of candidates.slice(0, 12)) {
      try {
        const resp = await fetch(cand.media.identifier, { headers });
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
          .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 88, mozjpeg: true })
          .toBuffer();
        saved = { jpeg, meta, cand };
        break;
      } catch (err) {
        lastErr = err;
      }
    }

    if (!saved) throw lastErr || new Error("no usable candidate");

    const base = slugify(fullName);
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

    const { occ, media, license, source, living } = saved.cand;
    const holder = media.rightsHolder || occ.institutionCode || occ.publisher || "GBIF publisher";
    const collector = occ.recordedBy ? ` collected by ${occ.recordedBy}` : "";
    const isSpecimen = !living;
    const description = [
      isSpecimen ? `Herbarium specimen ${occ.catalogNumber || ""}`.trim() : "GBIF occurrence",
      occ.country,
      occ.eventDate,
      holder,
    ]
      .filter(Boolean)
      .join(" · ");

    const credit = {
      species: fullName,
      file: `assets/img/species/${fname}`,
      source,
      original: isSpecimen
        ? `${occ.catalogNumber || "Specimen"} (${holder})`
        : `GBIF occurrence ${occ.key}`,
      artist: isSpecimen ? `${holder}${collector}` : occ.recordedBy || holder,
      credit: isSpecimen
        ? `Herbarium specimen${collector} · ${holder} · ${license.label}`
        : `${occ.recordedBy || holder} · ${license.label}`,
      license: license.label,
      licenseUrl: license.url,
      description: description.length > 220 ? description.slice(0, 217) + "…" : description,
      alt: isSpecimen
        ? `Herbarium specimen of ${fullName}`
        : `Photograph of ${fullName}`,
      sourceType: "GBIF",
      specimen: isSpecimen,
    };

    pc.credits.push(credit);
    existingCredits.set(fullName, credit);
    usedSources.add(source);
    added++;
    console.log(
      `  OK: ${fullName} (${license.label}, ${saved.meta.width}x${saved.meta.height}, ${Math.round(
        saved.jpeg.length / 1024
      )}KB, ${isSpecimen ? "specimen" : "photo"}, ${holder})`
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
