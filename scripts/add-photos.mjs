import { readFile, writeFile } from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";

const pcPath = "data/photo-credits.json";
const pc = JSON.parse(await readFile(pcPath, "utf8"));
const existingCredits = new Set(pc.credits.map((c) => c.species));

const slugify = (value) =>
  String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const ROOT = process.cwd();
const IMG_DIR = `${ROOT}/assets/img/species`;

const headers = {
  "User-Agent":
    "PlantivorousDatabase/1.0 (https://plantivorous.co.za; contact@plantivorous.co.za) educational-use",
};

async function searchCommons(genus, species) {
  const searchTerm = `${genus} ${species}`;
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", searchTerm);
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrlimit", "5");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|size|extmetadata");
  url.searchParams.set("iiurlwidth", "800");

  const resp = await fetch(url.toString(), { headers });
  const data = await resp.json();
  const pages = data.query?.pages;
  if (!pages) return null;

  for (const [key, page] of Object.entries(pages)) {
    const ii = page.imageinfo?.[0];
    if (!ii) continue;
    const license = ii.extmetadata?.LicenseShortName?.value || "";
    const artist = ii.extmetadata?.Artist?.value || "";
    if (!license || license === "unknown") continue;
    return {
      species: `${genus} ${species}`,
      file: `assets/img/species/${slugify(species)}.jpg`,
      source: `https://commons.wikimedia.org/wiki/${page.title.replace(/ /g, "_")}`,
      original: page.title.replace(/^File:/, ""),
      artist: artist.replace(/<[^>]*>/g, "").trim() || "Wikimedia Commons",
      credit: artist.replace(/<[^>]*>/g, "").trim() || "Own work by Wikimedia Commons",
      license: license,
      licenseUrl: ii.extmetadata?.LicenseUrl?.value || "",
      description: `${species} photograph`,
      alt: `Photograph of ${species}`,
    };
  }
  return null;
}

async function downloadImage(url, filePath) {
  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const fileStream = createWriteStream(filePath);
  await pipeline(resp.body, fileStream);
}

const speciesList = process.argv.slice(2).map(s => s.startsWith("Drosera ") || s.startsWith("Nepenthes ") ? s : `Drosera ${s}`);
let added = 0;
let skipped = 0;
let failed = 0;

for (const species of speciesList) {
  if (existingCredits.has(species)) {
    skipped++;
    continue;
  }
  try {
    const credit = await searchCommons("Drosera", species.split(" ")[1]);
    if (!credit) {
      failed++;
      console.log(`  SKIP (no photo): ${species}`);
      continue;
    }
    const url2 = new URL("https://commons.wikimedia.org/w/api.php");
    url2.searchParams.set("action", "query");
    url2.searchParams.set("format", "json");
    url2.searchParams.set("titles", `File:${credit.original}`);
    url2.searchParams.set("prop", "imageinfo");
    url2.searchParams.set("iiprop", "url");
    const resp2 = await fetch(url2.toString(), { headers });
    const data2 = await resp2.json();
    const pages2 = data2.query?.pages;
    let imageUrl = null;
    for (const [k, p] of Object.entries(pages2 || {})) {
      if (p.imageinfo?.[0]) imageUrl = p.imageinfo[0].url;
    }
    if (!imageUrl) {
      failed++;
      console.log(`  FAIL (no image URL): ${species}`);
      continue;
    }
    await downloadImage(imageUrl, `${IMG_DIR}/${credit.file.split("/").pop()}`);
    pc.credits.push(credit);
    existingCredits.add(species);
    added++;
    console.log(`  OK: ${species} (${credit.license})`);
  } catch (err) {
    failed++;
    console.log(`  FAIL: ${species} - ${err.message}`);
  }
}

await writeFile(pcPath, JSON.stringify(pc, null, 2), "utf8");
console.log(
  `\nDone: ${added} added, ${skipped} skipped, ${failed} failed. Total credits: ${pc.credits.length}`
);