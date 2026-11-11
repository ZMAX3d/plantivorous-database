#!/usr/bin/env node
/**
 * Fetch a lead photograph and its licence metadata for flagship species from
 * Wikipedia / Wikimedia Commons. Images remain the property of their authors
 * and are used under the licence recorded in data/photo-credits.json.
 *
 * Usage: node scripts/fetch-photos.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets", "img", "species");
const DATA = join(ROOT, "data");
const UA = "PlantivorousDatabase/1.0 (+https://www.plantivorous.co.za; educational carnivorous plant database)";

const SPECIES = [
  ["Dionaea muscipula", "Venus flytrap"],
  ["Drosera capensis"],
  ["Drosera regia"],
  ["Drosera aliciae"],
  ["Drosera binata"],
  ["Drosera rotundifolia"],
  ["Drosera cistiflora"],
  ["Drosera burmanni", "Drosera burmannii"],
  ["Drosera paradoxa"],
  ["Nepenthes rajah"],
  ["Nepenthes attenboroughii"],
  ["Nepenthes lowii"],
  ["Nepenthes ampullaria"],
  ["Nepenthes truncata"],
  ["Nepenthes veitchii"],
  ["Nepenthes villosa"],
  ["Sarracenia purpurea"],
  ["Sarracenia flava"],
  ["Sarracenia leucophylla"],
  ["Sarracenia psittacina"],
  ["Sarracenia minor"],
  ["Cephalotus follicularis", "Cephalotus"],
  ["Darlingtonia californica"],
  ["Heliamphora nutans"],
  ["Heliamphora chimantensis"],
  ["Pinguicula gigantea"],
  ["Pinguicula grandiflora"],
  ["Utricularia sandersonii"],
  ["Utricularia vulgaris"],
  ["Aldrovanda vesiculosa"],
  ["Byblis gigantea"],
  ["Byblis liniflora"],
  ["Drosophyllum lusitanicum"],
  ["Roridula gorgonias"],
  ["Triphyophyllum peltatum"],
  ["Genlisea violacea"],
  ["Proboscidea louisianica"],
  ["Ibicella lutea"],
  ["Martynia annua"],
];

function slug(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/×/g, "x")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function stripHtml(s) {
  return (s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const credits = [];
  const titles = SPECIES.map(([name, title]) => title || name);

  // Wikipedia allows up to 50 titles per request.
  const wikiUrl =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages" +
    "&pithumbsize=1400&redirects=1&titles=" +
    encodeURIComponent(titles.join("|"));
  const wiki = await getJson(wikiUrl);
  const byTitle = new Map();
  for (const page of Object.values(wiki.query.pages)) byTitle.set(page.title, page);
  // Map redirects back to the requested title.
  const redirects = new Map((wiki.query.redirects || []).map((r) => [r.to, r.from]));

  for (const [name, title] of SPECIES) {
    const requested = title || name;
    const page =
      byTitle.get(requested) ||
      Object.values(wiki.query.pages).find(
        (p) => p.title.toLowerCase() === requested.toLowerCase()
      );
    if (!page || !page.pageimage) {
      console.log(`skip ${name}: no lead image`);
      continue;
    }
    const fileName = page.pageimage;
    const commonsUrl =
      "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo" +
      "&iiprop=url|extmetadata&iiurlwidth=1400&titles=" +
      encodeURIComponent("File:" + fileName);
    let info;
    try {
      const commons = await getJson(commonsUrl);
      const p = Object.values(commons.query.pages)[0];
      info = p?.imageinfo?.[0];
    } catch (e) {
      console.log(`skip ${name}: ${e.message}`);
      continue;
    }
    if (!info) {
      console.log(`skip ${name}: no Commons info`);
      continue;
    }
    const meta = info.extmetadata || {};
    const license = stripHtml(meta.LicenseShortName?.value || "See file page");
    const artist = stripHtml(meta.Artist?.value || "");
    const credit = stripHtml(meta.Credit?.value || "");
    const description = stripHtml(meta.ImageDescription?.value || "");
    const downloadUrl = info.thumburl || info.url;
    const ext = (downloadUrl.split("?")[0].match(/\.(jpe?g|png|webp)$/i) || [".jpg"])[0].toLowerCase();
    const fileSlug = slug(name);
    const localFile = `${fileSlug}${ext === ".jpeg" ? ".jpg" : ext}`;
    try {
      const img = await fetch(downloadUrl, { headers: { "User-Agent": UA } });
      if (!img.ok) throw new Error(`HTTP ${img.status}`);
      const buf = Buffer.from(await img.arrayBuffer());
      if (buf.length > 8 * 1024 * 1024) throw new Error("file too large");
      await writeFile(join(OUT, localFile), buf);
      credits.push({
        species: name,
        file: `assets/img/species/${localFile}`,
        source: info.descriptionurl,
        original: fileName,
        artist,
        credit,
        license,
        licenseUrl: meta.LicenseUrl?.value || "",
        description,
      });
      console.log(`ok ${name} -> ${localFile} (${Math.round(buf.length / 1024)} KB, ${license})`);
    } catch (e) {
      console.log(`skip ${name}: download ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  await writeFile(
    join(DATA, "photo-credits.json"),
    JSON.stringify({ generated: new Date().toISOString(), source: "Wikimedia Commons", credits }, null, 2)
  );
  console.log(`\nWrote ${credits.length} photos and data/photo-credits.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
