#!/usr/bin/env node
/**
 * Scrape the ICPS registered-cultivar pages for every genus that has cultivars.
 * Writes HTML snapshots and a parsed JSON summary to .photo-test/.
 *
 * Usage: node scripts/scrape-icps-cultivars.mjs
 */

import { writeFile, mkdir } from "node:fs/promises";

const BASE = "https://cpnames.carnivorousplants.org/";
const GENERA = [
  "Byblis",
  "Cephalotus",
  "Darlingtonia",
  "Dionaea",
  "Drosera",
  "Heliamphora",
  "Nepenthes",
  "Pinguicula",
  "Sarracenia",
  "Utricularia",
];

function decode(text) {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&deg;/g, "°")
    .replace(/&times;/g, "×")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function parsePage(html, genus) {
  const blockRe = new RegExp(
    `<td valign="top" nowrap><b>(${genus}[^<]+)<\\/b><\\/td>\\s*<td valign="top" nowrap>([\\s\\S]*?)<\\/td><\\/tr>\\s*<tr><td colspan="2">([\\s\\S]*?)<\\/td><\\/tr>`,
    "g"
  );
  const cultivars = [];
  let match;
  while ((match = blockRe.exec(html))) {
    const name = decode(match[1]);
    const publication = decode(match[2].split(/<br\s*\/?>/i)[0]);
    const fields = {};
    const fieldRe = /<b>([^<]+):<\/b>([\s\S]*?)(?=<b>[^<]+:<\/b>|$)/g;
    let field;
    while ((field = fieldRe.exec(match[3]))) {
      const label = decode(field[1]).trim().replace(/:$/, "");
      const value = decode(field[2]);
      if (value) fields[label] = value;
    }
    cultivars.push({ name, publication, fields });
  }
  return cultivars;
}

await mkdir(".photo-test/icps-cultivars", { recursive: true });
const out = {};
for (const genus of GENERA) {
  const url = `${BASE}Cultivars.php?name=${encodeURIComponent(genus)}`;
  process.stdout.write(`Fetching ${genus}… `);
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "PlantivorousDatabaseBuilder/1.0 (+https://www.plantivorous.co.za; educational carnivorous plant database)",
      Accept: "text/html",
    },
  });
  if (!res.ok) throw new Error(`${genus}: HTTP ${res.status}`);
  const html = await res.text();
  await writeFile(`.photo-test/icps-cultivars/${genus}.html`, html, "utf8");
  const cultivars = parsePage(html, genus);
  out[genus] = { url, count: cultivars.length, cultivars };
  console.log(`${cultivars.length} cultivars`);
  await new Promise((r) => setTimeout(r, 400));
}

await writeFile(
  ".photo-test/icps-cultivars-parsed.json",
  JSON.stringify(out, null, 2),
  "utf8"
);
const total = Object.values(out).reduce((n, g) => n + g.count, 0);
console.log(`\nTotal cultivars across ${GENERA.length} genera: ${total}`);
