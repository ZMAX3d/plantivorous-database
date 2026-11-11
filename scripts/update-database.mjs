#!/usr/bin/env node
/**
 * Plantivorous database update / monitoring script
 * -------------------------------------------------
 * Compares a refreshed ICPS snapshot against the current build baseline,
 * appends changelog entries for any additions or removals, and rebuilds
 * `data/species.json` and `assets/js/data.js` via scripts/build-data.mjs.
 *
 * Intended workflow (build-time monitoring, not live):
 *
 *   1. Refresh the ICPS snapshot:
 *        node scripts/scrape-icps.mjs          # writes data/icps-species.json
 *   2. Run this updater:
 *        node scripts/update-database.mjs
 *
 * Options:
 *   --snapshot <path>   New ICPS snapshot (default: data/icps-species.json)
 *   --baseline  <path>  Current build bundle (default: data/species.json)
 *   --dry-run           Diff only; do not write changelog or rebuild
 *
 * The ICPS Carnivorous Plant Names Resource is the authoritative nomenclature
 * source: https://cpnames.carnivorousplants.org/
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");

const args = process.argv.slice(2);
let snapshotPath = join(DATA, "icps-species.json");
let baselinePath = join(DATA, "species.json");
let dryRun = false;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--snapshot") snapshotPath = args[++i];
  else if (a === "--baseline") baselinePath = args[++i];
  else if (a === "--dry-run") dryRun = true;
  else {
    console.error(`Unknown argument: ${a}`);
    process.exit(1);
  }
}

const slugify = (value) =>
  String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const today = () => new Date().toISOString().slice(0, 10);

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function main() {
  if (!existsSync(snapshotPath)) {
    console.error(`Snapshot not found: ${snapshotPath}`);
    console.error("Run `node scripts/scrape-icps.mjs` first to capture the ICPS snapshot.");
    process.exit(1);
  }
  if (!existsSync(baselinePath)) {
    console.error(`Baseline not found: ${baselinePath}`);
    process.exit(1);
  }

  const snapshot = await readJson(snapshotPath);
  const baseline = await readJson(baselinePath);

  const snapshotDate = snapshot.generated || snapshot.date || new Date().toISOString();
  const snapshotSource = snapshot.source || "ICPS Carnivorous Plant Names Resource";
  const snapshotCount = snapshot.count ?? snapshot.species?.length ?? 0;

  const newNames = new Set(
    (snapshot.species || [])
      .map((s) => s.name)
      .filter(Boolean)
      .map(slugify)
  );

  // Baseline ICPS taxa are those that are not provisional.
  const baselineIcpsNames = new Set(
    (baseline.species || [])
      .filter((s) => !s.provisional)
      .map((s) => s.name)
      .filter(Boolean)
      .map(slugify)
  );

  const baselineMeta = baseline.meta || {};
  const baselineCount = baselineMeta.icpsCount ?? baselineIcpsNames.size;

  const added = [...newNames].filter((slug) => !baselineIcpsNames.has(slug));
  const removed = [...baselineIcpsNames].filter((slug) => !newNames.has(slug));

  const change = added.length || removed.length || snapshotCount !== baselineCount;

  console.log(`ICPS snapshot: ${snapshotDate}`);
  console.log(`Source: ${snapshotSource}`);
  console.log(`New snapshot count: ${snapshotCount}`);
  console.log(`Baseline ICPS count: ${baselineCount}`);
  console.log(`Added: ${added.length}  Removed: ${removed.length}`);

  if (!change) {
    console.log("No nomenclature changes detected. Nothing to update.");
    return;
  }

  if (dryRun) {
    console.log("\n-- dry-run: would add --");
    added.forEach((s) => console.log(`  + ${s}`));
    console.log("\n-- dry-run: would remove --");
    removed.forEach((s) => console.log(`  - ${s}`));
    return;
  }

  // ------------------------------------------------------------------
  // Append changelog entries
  // ------------------------------------------------------------------
  const changelogPath = join(DATA, "changelog.json");
  const changelog = existsSync(changelogPath) ? await readJson(changelogPath) : { entries: [], generated: today() };
  changelog.generated = today();

  const entries = changelog.entries || [];
  const date = today();

  if (added.length || removed.length) {
    const addedDetail = added.map((slug) => {
      const rec = (snapshot.species || []).find((s) => slugify(s.name) === slug);
      return { name: rec?.name || slug, authors: rec?.authors || "", year: rec?.year || null };
    });
    const removedDetail = removed.map((slug) => {
      const rec = (baseline.species || []).find((s) => !s.provisional && slugify(s.name) === slug);
      return { name: rec?.name || slug, authors: rec?.authors || "", year: rec?.year || null };
    });

    const parts = [];
    if (addedDetail.length) parts.push(`${addedDetail.length} newly accepted taxon${addedDetail.length === 1 ? "" : "s"}`);
    if (removedDetail.length) parts.push(`${removedDetail.length} removed taxon${removedDetail.length === 1 ? "" : "s"}`);
    if (snapshotCount !== baselineCount) parts.push(`total now ${snapshotCount}`);

    entries.push({
      date,
      type: "update",
      title: "ICPS nomenclature refreshed",
      summary: `ICPS snapshot of ${snapshotDate} reviewed against the build baseline. ${parts.join(", ")}. Provisional watchlist taxa are unaffected and are promoted automatically once ICPS lists them.`,
      snapshot: snapshotDate,
      icpsCount: snapshotCount,
      previousCount: baselineCount,
      added: addedDetail,
      removed: removedDetail,
    });
  } else if (snapshotCount !== baselineCount) {
    entries.push({
      date,
      type: "note",
      title: "ICPS snapshot re-captured",
      summary: `Snapshot re-captured on ${snapshotDate}; taxon count unchanged at ${snapshotCount}. No additions or removals detected.`,
      snapshot: snapshotDate,
      icpsCount: snapshotCount,
      previousCount: baselineCount,
    });
  }

  changelog.entries = entries;

  await writeFile(changelogPath, JSON.stringify(changelog, null, 2), "utf8");
  console.log(`Appended changelog entry to data/changelog.json (${entries.length} total entries).`);

  // ------------------------------------------------------------------
  // Rebuild the bundle
  // ------------------------------------------------------------------
  const buildScript = join(ROOT, "scripts", "build-data.mjs");
  if (!existsSync(buildScript)) {
    console.error(`Build script not found: ${buildScript}`);
    process.exit(1);
  }

  try {
    execFileSync("node", [buildScript], { stdio: "inherit", cwd: ROOT });
    console.log("Rebuilt data/species.json and assets/js/data.js.");
  } catch (err) {
    console.error("Build failed:", err.message);
    process.exit(1);
  }

  const rebuilt = await readJson(baselinePath);
  console.log(`Final: ${rebuilt.meta.totalSpecies} taxa (${rebuilt.meta.icpsCount} ICPS + ${rebuilt.meta.provisionalCount} provisional) across ${rebuilt.meta.genusCount} genera.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
