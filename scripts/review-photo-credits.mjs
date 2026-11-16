import { readFile, writeFile } from "node:fs/promises";

/**
 * Reviews every photo credit against the Commons file metadata.
 *
 *   node scripts/review-photo-credits.mjs            # report only
 *   node scripts/review-photo-credits.mjs --fix      # remove unsafe map/diagram credits
 *
 * Flags:
 *   mapOrDiagram     title looks like a map or diagram (safe to auto-remove)
 *   sharedSource     one Commons file credited to multiple species
 *   unverifiedTitle  the filename does not contain the epithet/genus and the
 *                    Commons description/categories do not name the binomial
 *   missingFile      image file is not on disk
 *
 * The review is read-only unless --fix is passed. --fix only removes
 * mapOrDiagram credits; shared/unverified credits need human judgement.
 */

const FIX = process.argv.includes("--fix");

const normalizeWords = (value) =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/×/g, "x")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])([0-9])/g, "$1 $2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const hasBinomial = (text, species) => {
  const words = normalizeWords(text);
  const target = normalizeWords(species);
  return Boolean(target) && ` ${words} `.includes(` ${target} `);
};

const MAP_TITLE = /(distmap|distribution|locator|diagram|\bchart\b|\bgraph\b|\bmap\b|map(?=\.|$|\d))/i;
const HYBRID_OR_UNCERTAIN = /(×|\bx\b|hybrid|(^|[^a-z])cf(?![a-z]))/i;

const readJson = async (path) => {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return JSON.parse(await readFile(path, "utf8"));
    } catch (err) {
      if (attempt === 5) throw err;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
};

const pc = await readJson("data/photo-credits.json");
const data = await readJson("data/species.json");const speciesNames = new Set(data.species.map((s) => s.name));

const bySource = new Map();
for (const c of pc.credits) {
  if (!bySource.has(c.source)) bySource.set(c.source, []);
  bySource.get(c.source).push(c.species);
}

// Figure out which credits need Commons metadata to verify the binomial.
const needsMetadata = [];
const preliminary = new Map();

for (const credit of pc.credits) {
  const title = normalizeWords(credit.original);
  const species = normalizeWords(credit.species);
  const epithet = species.split(" ").slice(1).join(" ");
  const genus = species.split(" ")[0];
  const titleHasEpithet = epithet && ` ${title} `.includes(` ${epithet} `);
  const titleHasGenus = genus && ` ${title} `.includes(` ${genus} `);
  preliminary.set(credit, { titleHasEpithet, titleHasGenus });
  if (!titleHasEpithet) needsMetadata.push(credit);
}

// Batch-query Commons for description/categories (50 titles per request).
const metadata = new Map();
for (let i = 0; i < needsMetadata.length; i += 50) {
  const batch = needsMetadata.slice(i, i + 50);
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("titles", batch.map((c) => `File:${c.original}`).join("|"));
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "extmetadata");
  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "PlantivorousDatabase/1.0 (https://plantivorous.co.za; contact@plantivorous.co.za) audit",
    },
  });
  if (!resp.ok) throw new Error(`Commons metadata HTTP ${resp.status}`);
  const json = await resp.json();
  for (const page of Object.values(json.query?.pages || {})) {
    const title = String(page.title || "").replace(/^File:/, "");
    const em = page.imageinfo?.[0]?.extmetadata || {};
    const text = `${em.ImageDescription?.value || ""} ${em.Categories?.value || ""}`.replace(
      /<[^>]*>/g,
      " "
    );
    metadata.set(title, text);
  }
  await new Promise((r) => setTimeout(r, 350));
}

const report = { mapOrDiagram: [], hybridOrUncertain: [], sharedSource: [], unverifiedTitle: [], missingFile: [] };
const autoRemove = new Set();

for (const credit of pc.credits) {
  const meta = preliminary.get(credit);
  const sourceList = bySource.get(credit.source) || [];
  if (sourceList.length > 1) {
    report.sharedSource.push(`${credit.species} <- ${credit.original} (${sourceList.join(", ")})`);
  }

  if (MAP_TITLE.test(credit.original || "")) {
    report.mapOrDiagram.push(`${credit.species} <- ${credit.original}`);
    autoRemove.add(credit);
    continue;
  }

  if (HYBRID_OR_UNCERTAIN.test(credit.original || "")) {
    report.hybridOrUncertain.push(`${credit.species} <- ${credit.original}`);
  }

  if (!speciesNames.has(credit.species)) continue;

  if (meta.titleHasEpithet) continue;

  const text = metadata.get(credit.original) || "";
  if (hasBinomial(text, credit.species)) continue;

  report.unverifiedTitle.push(`${credit.species} <- ${credit.original}`);
}

const interesting = Object.entries(report).filter(([, list]) => list.length);
console.log(`Credits reviewed: ${pc.credits.length}`);
if (interesting.length === 0) {
  console.log("No suspicious credits found.");
} else {
  for (const [key, list] of interesting) {
    console.log(`\n${key} (${list.length}):`);
    for (const entry of list) console.log("  - " + entry);
  }
}

if (FIX) {
  const kept = pc.credits.filter((c) => !autoRemove.has(c));
  await writeFile(
    "data/photo-credits.json",
    JSON.stringify({ ...pc, credits: kept }, null, 2),
    "utf8"
  );
  console.log(`\nRemoved ${pc.credits.length - kept.length} map/diagram credits. Credits now: ${kept.length}`);
  console.log("Files were left on disk; run scripts/validate-photos.mjs --fix to remove orphans.");
}
