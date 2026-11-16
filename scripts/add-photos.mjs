import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import sharp from "sharp";

/**
 * Robust Wikimedia Commons photo fetcher.
 *
 * Usage:
 *   node scripts/add-photos.mjs "Drosera amazonica" "Nepenthes bicalcarata" ...
 *   node scripts/add-photos.mjs --genus=Drosera amazonica androsacea ...
 *
 * Guarantees:
 *  - Only bitmap images (image/jpeg, image/png, image/webp) are accepted.
 *  - The 900px rendered thumbnail is downloaded, never the original file
 *    (original files are sometimes multi-megabyte PDFs or TIFFs).
 *  - The downloaded bytes are validated with sharp and re-encoded to
 *    JPEG quality 88 before being written to disk.
 *  - Anything that fails validation is discarded and reported.
 */

const pcPath = "data/photo-credits.json";
const pc = JSON.parse(await readFile(pcPath, "utf8"));
const existingCredits = new Map(pc.credits.map((c) => [c.species, c]));
const usedSources = new Set(pc.credits.map((c) => c.source).filter(Boolean));

const IMG_DIR = "assets/img/species";
await mkdir(IMG_DIR, { recursive: true });

const headers = {
  "User-Agent":
    "PlantivorousDatabase/1.0 (https://plantivorous.co.za; contact@plantivorous.co.za) educational-use",
  "Accept": "image/jpeg, image/png, image/webp, */*;q=0.5",
};

const slugify = (value) =>
  String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

// Titles that are clearly not photographs of the living plant.
// "map" is matched anywhere because Commons maps are often named
// things like "Arzinomap.png" or "Drosera androsaceaDistMap6.png".
const REJECT_TITLE = /(distmap|distribution|locator|envelope|herbarium|diagram|\bchart\b|\bgraph\b|\bmap\b|map(?=\.|$|\d)|(^|[^a-z])cf(?![a-z]))/i;

const normalizeWords = (value) =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * True when `text` contains the full binomial as consecutive words.
 * Underscores, punctuation and line breaks are treated as separators.
 */
function hasBinomial(text, genus, epithet) {
  const words = normalizeWords(text);
  const target = `${normalizeWords(genus)} ${normalizeWords(epithet)}`.trim();
  return Boolean(target) && ` ${words} `.includes(` ${target} `);
}

function sourceUrl(pageTitle) {
  return `https://commons.wikimedia.org/wiki/${pageTitle.replace(/ /g, "_")}`;
}

function cleanHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function searchCommons(genus, epithet, allowHybrid) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", `${genus} ${epithet} filetype:bitmap`);
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrlimit", "12");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|size|mime|extmetadata");
  url.searchParams.set("iiurlwidth", "900");

  const resp = await fetch(url.toString(), { headers });
  if (!resp.ok) throw new Error(`Commons search HTTP ${resp.status}`);
  const data = await resp.json();
  const pages = data.query?.pages;
  if (!pages) return [];

  const ordered = Object.values(pages).sort((a, b) => (a.index || 999) - (b.index || 999));

  const candidates = [];
  for (const page of ordered) {
    const ii = page.imageinfo?.[0];
    if (!ii) continue;
    const mime = ii.mime || "";
    if (!ALLOWED_MIME.has(mime)) continue; // reject PDF/SVG/TIFF/GIF
    if (REJECT_TITLE.test(page.title)) continue; // reject maps, envelopes, diagrams
    // Reject extreme aspect ratios (panoramas, banner-like scans).
    if (ii.width && ii.height && ii.width / ii.height > 4) continue;
    const license = cleanHtml(ii.extmetadata?.LicenseShortName?.value || "");
    if (!license || /unknown/i.test(license)) continue;
    const thumb = ii.thumburl;
    if (!thumb) continue;

    // Never reuse one Commons file for two different species.
    if (usedSources.has(sourceUrl(page.title))) continue;

    // Only accept a file we can tie to this exact binomial. The title is
    // the strongest signal; otherwise the description/categories must name
    // the full "Genus epithet" (not just the epithet, which could belong to
    // an unrelated plant mentioned in the same caption).
    const titleWords = normalizeWords(page.title);
    const epithetWords = normalizeWords(epithet);
    const metaText = `${cleanHtml(ii.extmetadata?.ImageDescription?.value || "")} ${cleanHtml(
      ii.extmetadata?.Categories?.value || ""
    )}`;

    // A hybrid photo cannot represent a pure species (and vice versa);
    // hybrid records themselves are allowed to use hybrid photos.
    if (!allowHybrid && /(×|\bx\b|hybrid)/i.test(page.title)) continue;

    const rank = ` ${titleWords} `.includes(` ${epithetWords} `)
      ? 0
      : hasBinomial(`${page.title} ${metaText}`, genus, epithet)
        ? 1
        : null;
    if (rank === null) continue;

    candidates.push({ page, ii, license, rank });
  }

  candidates.sort((a, b) => a.rank - b.rank);
  return candidates;
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
  if (arg.includes(" ")) {
    speciesList.push(arg.trim());
  } else if (bareGenus) {
    speciesList.push(`${bareGenus} ${arg.trim()}`);
  } else {
    console.error(`Cannot understand "${arg}" — pass "Genus epithet" or use --genus=Genus.`);
    process.exit(1);
  }
}

if (speciesList.length === 0) {
  console.error('Usage: node scripts/add-photos.mjs "Genus epithet" ...  (or --genus=Genus epithet ...)');
  process.exit(1);
}

let added = 0;
let skipped = 0;
let failed = 0;
const failures = [];

for (const fullName of speciesList) {
  const [genus, ...rest] = fullName.split(/\s+/);
  const epithet = rest.join(" ");

  if (existingCredits.has(fullName)) {
    skipped++;
    continue;
  }

  try {
    const candidates = await searchCommons(genus, epithet, /×/.test(fullName));
    if (candidates.length === 0) {
      failed++;
      failures.push(`${fullName}: no bitmap photo on Commons`);
      console.log(`  SKIP (no photo): ${fullName}`);
      continue;
    }

    let saved = null;
    let lastErr = null;

    for (const cand of candidates.slice(0, 5)) {
      try {
        const resp = await fetch(cand.ii.thumburl, { headers });
        if (!resp.ok) throw new Error(`thumb HTTP ${resp.status}`);
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
        if (!meta.width || meta.width < 200) throw new Error(`image too narrow (${meta.width}px)`);

        const jpeg = await sharp(buf)
          .rotate() // honour EXIF orientation
          .jpeg({ quality: 88, mozjpeg: true })
          .toBuffer();

        saved = { jpeg, meta, cand };
        break;
      } catch (err) {
        lastErr = err;
      }
    }

    if (!saved) {
      failed++;
      failures.push(`${fullName}: ${lastErr?.message || "no usable candidate"}`);
      console.log(`  FAIL: ${fullName} - ${lastErr?.message || "no usable candidate"}`);
      continue;
    }

    // Build a collision-free file name: genus-epithet.jpg
    const base = slugify(`${genus}-${epithet}`);
    let fname = `${base}.jpg`;
    let n = 2;
    while (existsSync(`${IMG_DIR}/${fname}`)) {
      const claimed = [...existingCredits.values()].some(
        (c) => c.file === `assets/img/species/${fname}`
      );
      if (!claimed) break; // orphan file, safe to reuse
      fname = `${base}-${n++}.jpg`;
    }

    await writeFile(`${IMG_DIR}/${fname}`, saved.jpeg);

    const { page, ii, license } = saved.cand;
    const artist = cleanHtml(ii.extmetadata?.Artist?.value) || "Wikimedia Commons";
    const description = cleanHtml(ii.extmetadata?.ImageDescription?.value);
    const source = sourceUrl(page.title);
    const credit = {
      species: fullName,
      file: `assets/img/species/${fname}`,
      source,
      original: page.title.replace(/^File:/, ""),
      artist,
      credit: artist,
      license,
      licenseUrl: ii.extmetadata?.LicenseUrl?.value || "",
      description: description.length > 220 ? description.slice(0, 217) + "…" : description,
      alt: `Photograph of ${fullName}`,
    };

    pc.credits.push(credit);
    existingCredits.set(fullName, credit);
    usedSources.add(source);
    added++;
    console.log(`  OK: ${fullName} (${license}, ${saved.meta.width}x${saved.meta.height}, ${Math.round(saved.jpeg.length / 1024)}KB)`);
  } catch (err) {
    failed++;
    failures.push(`${fullName}: ${err.message}`);
    console.log(`  FAIL: ${fullName} - ${err.message}`);
  }

  // Persist after every species so a timeout never loses completed work.
  await writeFile(pcPath, JSON.stringify(pc, null, 2), "utf8");
  await sleep(350);
}

await writeFile(pcPath, JSON.stringify(pc, null, 2), "utf8");

console.log(`\nDone: ${added} added, ${skipped} skipped, ${failed} failed. Total credits: ${pc.credits.length}`);
if (failures.length) {
  console.log("\nFailures:");
  failures.forEach((f) => console.log("  " + f));
}
