#!/usr/bin/env node
/**
 * Find Wikimedia Commons files that explicitly identify an ICPS cultivar.
 *
 * Matching is deliberately strict:
 *   - the cultivar epithet appears in quotes in the file title or description, or
 *   - the file title names the cultivar and also says "cultivar".
 * A plain word match is not enough (e.g. "winged tendril" is not Nepenthes
 * 'Winged'), so false positives are rejected.
 *
 * Writes .photo-test/cultivar-picks-v2.json (resumable).
 * Downloads nothing; run import-cultivar-photos.mjs afterwards.
 *
 * Usage: node scripts/find-cultivar-photos.mjs [--limit=20] [--delay=1200] [--genera=Cephalotus,Drosera]
 */

import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = {
  "User-Agent":
    "PlantivorousDatabaseBot/1.1 (https://github.com/ZMAX3d/plantivorous-database; educational carnivorous-plant catalogue) node",
  "Api-User-Agent":
    "PlantivorousDatabaseBot/1.1 (https://github.com/ZMAX3d/plantivorous-database; educational carnivorous-plant catalogue)",
};
const OUT = join(ROOT, ".photo-test/cultivar-picks-v2.json");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith("--limit="));
const delayArg = args.find((a) => a.startsWith("--delay="));
const generaArg = args.find((a) => a.startsWith("--genera="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
const DELAY = delayArg ? Number(delayArg.split("=")[1]) : 1200;
const GENERA = generaArg
  ? new Set(generaArg.split("=")[1].split(",").map((g) => g.trim()).filter(Boolean))
  : null;

const data = JSON.parse(fs.readFileSync(join(ROOT, "data/species.json"), "utf8"));
const cultivars = data.species.filter(
  (s) => s.cultivar && (!GENERA || GENERA.has(s.genus))
);

let candidates = {};
if (fs.existsSync(OUT)) {
  candidates = JSON.parse(fs.readFileSync(OUT, "utf8"));
}

const normalize = (s) =>
  String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const allowedLicense = (license) =>
  /^(cc0|cc by(?!-nc|-nd)|public domain|pd)/i.test(String(license || "").trim());

function epithetOf(name) {
  const m = name.match(/['‘’](.+?)['‘’]/);
  return m ? m[1] : name.replace(/^[A-Za-z]+\s+/, "");
}

function strictMatch(entry, genus, epithet, parentNames = []) {
  const e = normalize(epithet);
  const g = normalize(genus);
  const hay = normalize(
    [entry.title, entry.description].filter(Boolean).join(" | ")
  );
  const quoted =
    hay.includes(`'${e}'`) ||
    hay.includes(`"${e}"`) ||
    hay.includes(`‘${e}’`) ||
    hay.includes(`“${e}”`);
  if (!quoted) {
    const words = e.split(" ").filter(Boolean);
    const ordered = words.every((word, i) => {
      const from = i === 0 ? 0 : hay.indexOf(words[i - 1]);
      return from >= 0 && hay.indexOf(word, from) >= 0;
    });
    if (!ordered || !/cultivar|cultigen/.test(hay) || !hay.includes(g)) {
      return false;
    }
  }
  // Reject a file that names a different species before the cultivar, e.g.
  // "Drosera scorpioides 'Giant'" is not the Drosera binata cultivar 'Giant'.
  const parentEpithets = new Set(
    parentNames
      .map((name) => normalize(name).split(" ")[1])
      .filter(Boolean)
  );
  const title = normalize(entry.title);
  const afterGenus = title.slice(title.indexOf(g) + g.length).trim();
  const first = afterGenus.split(" ")[0] || "";
  const firstClean = first.replace(/^['"(]+|['"),.]+$/g, "");
  if (
    firstClean &&
    firstClean !== "x" &&
    firstClean !== e &&
    !e.startsWith(firstClean) &&
    !parentEpithets.has(firstClean) &&
    /^[a-z-]{4,}$/.test(firstClean)
  ) {
    return false;
  }
  return true;
}

async function searchCommons(query, attempt = 1) {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=" +
    encodeURIComponent(query) +
    "&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=1200&format=json&formatversion=2&maxlag=5";
  const r = await fetch(url, { headers: UA });
  if (r.status === 429 || r.status === 503) {
    const retryAfter = Number(r.headers.get("retry-after")) || attempt * 8;
    if (attempt <= 3) {
      console.log(`  rate limited; waiting ${retryAfter}s`);
      await sleep(retryAfter * 1000);
      return searchCommons(query, attempt + 1);
    }
    throw new Error(`HTTP ${r.status}`);
  }
  if (!r.ok) throw new Error("HTTP " + r.status);
  const j = await r.json();
  const pages = j.query?.pages ? Object.values(j.query.pages) : [];
  return pages.map((p) => {
    const info = p.imageinfo?.[0] || {};
    const meta = info.extmetadata || {};
    return {
      title: p.title,
      mime: info.mime || "",
      license: meta.LicenseShortName?.value || "",
      licenseUrl: meta.LicenseUrl?.value || "",
      artist: String(meta.Artist?.value || "")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim(),
      description: String(meta.ImageDescription?.value || "")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 300),
      url: (info.thumburl || info.url || "").split("?")[0],
      page:
        info.descriptionurl ||
        `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
    };
  });
}

const pending = cultivars
  .filter((c) => !candidates[c.name]?.pick)
  .slice(0, LIMIT === Infinity ? undefined : LIMIT);

console.log(
  `Searching ${pending.length} cultivars (${Object.keys(candidates).length} cached, delay ${DELAY}ms)…`
);

let i = 0;
for (const cultivar of pending) {
  i++;
  const genus = cultivar.genus;
  const epithet = epithetOf(cultivar.name);
  const query = `intitle:"${epithet}" ${genus}`;
  try {
    const results = await searchCommons(query);
    const verified = results.filter(
      (r) =>
        allowedLicense(r.license) &&
        /^image\/(jpeg|png|webp)/i.test(r.mime) &&
        strictMatch(
          r,
          genus,
          epithet,
          cultivar.parentFormula?.length
            ? cultivar.parentFormula
            : cultivar.parentSpecies
              ? [cultivar.parentSpecies]
              : []
        )
    );
    if (verified.length) {
      verified.sort((a, b) => {
        const aq = normalize(a.title).includes(`'${normalize(epithet)}'`) ? 0 : 1;
        const bq = normalize(b.title).includes(`'${normalize(epithet)}'`) ? 0 : 1;
        return aq - bq;
      });
      candidates[cultivar.name] = {
        query,
        pick: verified[0],
        alternates: verified.slice(1, 4),
        checked: new Date().toISOString(),
      };
      console.log(`OK   ${cultivar.name} -> ${verified[0].title} (${verified[0].license})`);
    } else {
      candidates[cultivar.name] = {
        query,
        pick: null,
        alternates: [],
        checked: new Date().toISOString(),
      };
      console.log(`none ${cultivar.name}`);
    }
  } catch (e) {
    console.log(`FAIL ${cultivar.name}: ${e.message}`);
    candidates[cultivar.name] = {
      query,
      pick: null,
      alternates: [],
      error: e.message,
    };
  }
  if (i % 5 === 0) {
    fs.writeFileSync(OUT, JSON.stringify(candidates, null, 2));
  }  await sleep(DELAY);
}

fs.writeFileSync(OUT, JSON.stringify(candidates, null, 2));
const found = Object.values(candidates).filter((c) => c.pick).length;
console.log(
  `\nDone. Candidates with a verified photo: ${found} of ${Object.keys(candidates).length} (file ${OUT})`
);
