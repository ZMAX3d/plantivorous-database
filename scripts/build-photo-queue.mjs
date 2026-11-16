import { readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync("data/species.json", "utf8"));
const pc = JSON.parse(readFileSync("data/photo-credits.json", "utf8"));

const credited = new Set(pc.credits.map((c) => c.species));

const missing = data.species
  .filter((s) => !credited.has(s.name))
  .map((s) => s.name);

// Group by genus, biggest genera last so quick wins land first.
const byGenus = {};
for (const name of missing) {
  const genus = name.split(" ")[0];
  (byGenus[genus] ||= []).push(name);
}

const ordered = Object.entries(byGenus)
  .sort((a, b) => a[1].length - b[1].length)
  .flatMap(([, names]) => names);

writeFileSync(
  ".photo-queue-all.txt",
  ordered.map((n) => `"${n}"`).join(" ") + "\n",
  "utf8"
);

console.log("Total missing:", ordered.length);
for (const [genus, names] of Object.entries(byGenus).sort((a, b) => a[1].length - b[1].length)) {
  console.log(`  ${genus}: ${names.length}`);
}
console.log("Wrote .photo-queue-all.txt");
