import { readFile, readdir, stat, unlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";

/**
 * Read-only photo audit with optional safe fixes.
 *
 *   node scripts/audit-photos.mjs          # report only
 *   node scripts/audit-photos.mjs --fix    # remove duplicates, broken credits, orphan/invalid files
 */

const FIX = process.argv.includes("--fix");

async function readJsonWithRetry(path, attempts = 5) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return JSON.parse(await readFile(path, "utf8"));
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 600));
    }
  }
  throw lastErr;
}

const pc = await readJsonWithRetry("data/photo-credits.json");
const data = await readJsonWithRetry("data/species.json");

const speciesNames = new Set(data.species.map((s) => s.name));
const files = (await readdir("assets/img/species")).filter((f) => f.toLowerCase().endsWith(".jpg"));

const issues = {
  duplicateSpecies: [],
  duplicateFile: [],
  unknownSpecies: [],
  missingFile: [],
  invalidImage: [],
  oversized: [],
  shortNameFile: [],
  orphanFiles: [],
  badExtension: [],
  identicalFiles: [],
};

const seenSpecies = new Map();
const seenFile = new Map();
const keep = [];

for (const credit of pc.credits) {
  const normalizedSpecies = String(credit.species || "").trim();
  const file = String(credit.file || "");

  if (seenSpecies.has(normalizedSpecies)) {
    issues.duplicateSpecies.push(normalizedSpecies);
    continue;
  }
  seenSpecies.set(normalizedSpecies, credit);

  if (seenFile.has(file)) {
    issues.duplicateFile.push(`${file} (${seenFile.get(file)} + ${normalizedSpecies})`);
    continue;
  }
  seenFile.set(file, normalizedSpecies);

  if (!speciesNames.has(normalizedSpecies)) {
    issues.unknownSpecies.push(normalizedSpecies);
    continue;
  }

  if (!files.includes(file.replace("assets/img/species/", ""))) {
    issues.missingFile.push(`${normalizedSpecies} -> ${file}`);
    continue;
  }

  try {
    const s = await stat(file);
    const meta = await sharp(file).metadata();
    if (meta.format !== "jpeg") {
      issues.invalidImage.push(`${normalizedSpecies}: format=${meta.format}`);
      continue;
    }
    if (!meta.width || meta.width < 200) {
      issues.invalidImage.push(`${normalizedSpecies}: width=${meta.width}`);
      continue;
    }
    if (s.size > 400 * 1024) issues.oversized.push(`${normalizedSpecies}: ${Math.round(s.size / 1024)}KB`);
    keep.push(credit);
  } catch (err) {
    issues.invalidImage.push(`${normalizedSpecies}: ${err.message}`);
  }
}

// Detect legacy short-name files that could collide across genera (e.g. alata.jpg).
for (const credit of keep) {
  const name = credit.file.split("/").pop();
  if (!name.startsWith(credit.species.split(" ")[0].toLowerCase() + "-")) {
    issues.shortNameFile.push(`${credit.species} -> ${name}`);
  }
}

const claimed = new Set(keep.map((c) => c.file.replace("assets/img/species/", "")));
issues.orphanFiles = files.filter((f) => !claimed.has(f));

// Byte-identical files under different names usually mean one photo was
// credited to two species (e.g. a shared legacy download).
const byHash = new Map();
for (const f of files) {
  const digest = createHash("sha256")
    .update(await readFile(`assets/img/species/${f}`))
    .digest("hex");
  if (!byHash.has(digest)) byHash.set(digest, []);
  byHash.get(digest).push(f);
}
issues.identicalFiles = [...byHash.values()]
  .filter((group) => group.length > 1)
  .map((group) => group.join("  <=>  "));

const report = Object.entries(issues).filter(([, v]) => v.length > 0);
console.log(`Credits: ${pc.credits.length}; valid: ${keep.length}; files on disk: ${files.length}`);
if (report.length === 0) {
  console.log("No issues found.");
} else {
  for (const [key, list] of report) {
    console.log(`\n${key} (${list.length}):`);
    for (const item of list.slice(0, 40)) console.log("  - " + item);
    if (list.length > 40) console.log(`  … and ${list.length - 40} more`);
  }
}

if (FIX) {
  const { writeFile } = await import("node:fs/promises");
  let removedCredits = 0;
  const finalCredits = [];

  for (const credit of pc.credits) {
    const normalizedSpecies = String(credit.species || "").trim();
    const file = String(credit.file || "");
    if (!speciesNames.has(normalizedSpecies)) continue;
    if (!keep.some((k) => k.species === normalizedSpecies && k.file === file)) continue;
    if (finalCredits.some((c) => c.species === normalizedSpecies)) continue;
    finalCredits.push({ ...credit, species: normalizedSpecies });
    removedCredits++;
  }
  removedCredits = pc.credits.length - finalCredits.length;

  const keepSet = new Set(finalCredits.map((c) => c.file.replace("assets/img/species/", "")));
  let deletedFiles = 0;
  for (const f of files) {
    if (!keepSet.has(f)) {
      // Only delete files that are clearly ours and unreferenced.
      try {
        await unlink(`assets/img/species/${f}`);
        deletedFiles++;
      } catch {}
    }
  }

  await writeFile("data/photo-credits.json", JSON.stringify({ ...pc, credits: finalCredits }, null, 2), "utf8");
  console.log(`\nFixed: removed ${removedCredits} credits, deleted ${deletedFiles} unreferenced files. Credits now: ${finalCredits.length}`);
}
