#!/usr/bin/env node
/**
 * Monthly ICPS monitor
 * --------------------
 * Refreshes the ICPS species and cultivar snapshots, diffs them against the
 * current build, records the result in data/icps-check.json, appends a
 * changelog entry when names are added or removed, and rebuilds the bundle.
 *
 * New names are added to the database automatically: the build reads the
 * refreshed snapshots, so any taxon ICPS lists appears in the next build.
 *
 * Usage:
 *   node scripts/check-icps.mjs              # fetch, diff, rebuild
 *   node scripts/check-icps.mjs --dry-run    # fetch, diff, report only
 *   node scripts/check-icps.mjs --skip-fetch # diff current snapshots only
 *   node scripts/check-icps.mjs --no-build   # do not rebuild
 *
 * Schedule: .github/workflows/icps-check.yml runs this on the first day of
 * every month, so the live site is checked at least once a month.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const skipFetch = args.includes("--skip-fetch");
const noBuild = args.includes("--no-build");

const today = () => new Date().toISOString().slice(0, 10);

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function run(script, label) {
  process.stdout.write(`\n▶ ${label}\n`);
  execFileSync("node", [join(ROOT, "scripts", script)], {
    stdio: "inherit",
    cwd: ROOT,
  });
}

function diff(currentNames, nextNames) {
  const current = new Set(currentNames);
  const next = new Set(nextNames);
  return {
    added: [...next].filter((name) => !current.has(name)).sort(),
    removed: [...current].filter((name) => !next.has(name)).sort(),
  };
}

async function main() {
  if (!skipFetch) {
    run("scrape-icps.mjs", "Refreshing ICPS species snapshot");
    run("scrape-icps-cultivars.mjs", "Refreshing ICPS cultivar snapshots");
    run("import-icps-cultivars.mjs", "Rebuilding cultivar dataset");
  }

  const speciesSnapshot = await readJson(join(DATA, "icps-species.json"));
  const cultivarSnapshot = await readJson(join(DATA, "icps-cultivars.json"));
  const baseline = await readJson(join(DATA, "species.json"));

  const baselineWild = baseline.species
    .filter((s) => !s.cultivar && !s.provisional)
    .map((s) => s.name);
  const baselineCultivars = baseline.species
    .filter((s) => s.cultivar)
    .map((s) => s.name);

  const nextWild = (speciesSnapshot.species || []).map((s) => s.name).filter(Boolean);
  const nextCultivars = (cultivarSnapshot.cultivars || [])
    .map((c) => c.name)
    .filter(Boolean);

  const wild = diff(baselineWild, nextWild);
  const cultivars = diff(baselineCultivars, nextCultivars);

  const changed =
    wild.added.length ||
    wild.removed.length ||
    cultivars.added.length ||
    cultivars.removed.length;

  const result = {
    lastChecked: new Date().toISOString(),
    snapshotGenerated: speciesSnapshot.generated || "",
    source: speciesSnapshot.source || "https://cpnames.carnivorousplants.org/",
    status: changed ? "changes-detected" : "unchanged",
    counts: {
      wildAccepted: nextWild.length,
      wildPrevious: baselineWild.length,
      cultivars: nextCultivars.length,
      cultivarsPrevious: baselineCultivars.length,
    },
    added: { wild: wild.added, cultivars: cultivars.added },
    removed: { wild: wild.removed, cultivars: cultivars.removed },
  };

  console.log("\nICPS check");
  console.log("----------");
  console.log(`Wild taxa:   ${baselineWild.length} → ${nextWild.length}`);
  console.log(`Cultivars:   ${baselineCultivars.length} → ${nextCultivars.length}`);
  console.log(
    `Added:       ${wild.added.length} wild, ${cultivars.added.length} cultivars`
  );
  console.log(
    `Removed:     ${wild.removed.length} wild, ${cultivars.removed.length} cultivars`
  );
  for (const name of wild.added) console.log(`  + ${name}`);
  for (const name of cultivars.added) console.log(`  + ${name}`);
  for (const name of wild.removed) console.log(`  - ${name}`);
  for (const name of cultivars.removed) console.log(`  - ${name}`);

  if (dryRun) {
    console.log("\n-- dry-run: nothing written.");
    return;
  }

  await mkdir(DATA, { recursive: true });
  await writeFile(
    join(DATA, "icps-check.json"),
    JSON.stringify(result, null, 2) + "\n",
    "utf8"
  );

  if (changed) {
    const changelogPath = join(DATA, "changelog.json");
    const changelog = existsSync(changelogPath)
      ? await readJson(changelogPath)
      : { entries: [] };
    const entries = changelog.entries || [];
    const parts = [];
    if (wild.added.length)
      parts.push(
        `${wild.added.length} new wild taxon${wild.added.length === 1 ? "" : "a"}`
      );
    if (cultivars.added.length)
      parts.push(
        `${cultivars.added.length} new cultivar${cultivars.added.length === 1 ? "" : "s"}`
      );
    if (wild.removed.length || cultivars.removed.length)
      parts.push(
        `${wild.removed.length + cultivars.removed.length} name${
          wild.removed.length + cultivars.removed.length === 1 ? "" : "s"
        } removed from the register`
      );

    entries.push({
      date: today(),
      type: "update",
      title: "Monthly ICPS check",
      summary: `Automated ICPS review detected ${parts.join(", ")}. New names were added to the catalogue with their registration facts; photographs and editorial care notes are queued for the next photo pass.`,
      snapshot: result.snapshotGenerated,
      added: [...wild.added, ...cultivars.added],
      removed: [...wild.removed, ...cultivars.removed],
    });
    changelog.entries = entries;
    changelog.generated = today();
    await writeFile(changelogPath, JSON.stringify(changelog, null, 2) + "\n", "utf8");
    console.log(`Changelog updated (${entries.length} entries).`);
  } else {
    console.log("No ICPS nomenclature changes detected.");
  }

  if (!noBuild) {
    run("build-data.mjs", "Rebuilding catalogue");
    run("validate-photos.mjs", "Validating photographs");
  }

  console.log(`\nWrote ${join(DATA, "icps-check.json")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
