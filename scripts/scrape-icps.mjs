#!/usr/bin/env node
/**
 * Plantivorous species database builder
 * -------------------------------------
 * Pulls the public ICPS Carnivorous Plant Names Resource (cpnames.carnivorousplants.org)
 * for every carnivorous-plant genus and keeps every accepted name: species,
 * natural hybrids and infraspecific taxa (the latter nested under their species).
 *
 * Outputs:
 *   data/icps-species.json        accepted species + hybrids + nested infraspecific taxa
 *   data/icps-summary.json        per-genus counts and the snapshot timestamp
 *
 * ICPS marks accepted names in bold in the search-result accordion. That is the
 * authoritative signal used here (the Status field is absent on some accepted
 * natural hybrids, e.g. Sarracenia catesbaei).
 *
 * Usage: node scripts/scrape-icps.mjs
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");
const BASE = "https://cpnames.carnivorousplants.org/";

const GENERA = [
  "Aldrovanda",
  "Byblis",
  "Cephalotus",
  "Craniolaria",
  "Darlingtonia",
  "Dionaea",
  "Dioncophyllum",
  "Drosera",
  "Drosophyllum",
  "Genlisea",
  "Habropetalum",
  "Heliamphora",
  "Ibicella",
  "Martynia",
  "Nepenthes",
  "Pinguicula",
  "Proboscidea",
  "Roridula",
  "Sarracenia",
  "Triphyophyllum",
  "Utricularia",
];

const ENTITIES = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&quot;": '"',
  "&#039;": "'",
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&times;": "×",
  "&ndash;": "–",
  "&mdash;": "—",
  "&eacute;": "é",
  "&egrave;": "è",
  "&aacute;": "á",
  "&oacute;": "ó",
  "&iacute;": "í",
  "&uacute;": "ú",
  "&ntilde;": "ñ",
  "&uuml;": "ü",
  "&ouml;": "ö",
  "&auml;": "ä",
};

function decode(s) {
  return s.replace(/&[a-zA-Z#0-9]+;/g, (m) => ENTITIES[m] ?? m);
}

function stripTags(s) {
  return decode(
    s
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h\d)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  ).trim();
}

function parseFields(block) {
  const text = stripTags(block);
  const fields = {};
  let key = null;
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z][A-Za-z /()-]{1,30}):\s*(.*)$/);
    if (m && !/^https?:/i.test(line)) {
      key = m[1].toLowerCase().replace(/\s+/g, "_");
      fields[key] = m[2].trim();
    } else if (key) {
      fields[key] = `${fields[key]} ${line}`.trim();
    }
  }
  return fields;
}

/**
 * Split "Drosera aliciae Raym.-Hamet" into genus / epithet / authors / rank.
 */
function parseTaxon(raw, genus) {
  let s = raw.replace(/\s+/g, " ").trim();
  let hybrid = false;
  if (/(^|\s)[×x]\s+/i.test(s)) {
    hybrid = true;
    s = s.replace(/\s+[×x]\s+/gi, " × ");
  }

  let rank = "species";
  let rankLabel = "";
  let base = s;
  let infraspecific = "";
  const rankMatch = s.match(/\s+(subsp\.|var\.|f\.|forma|subvar\.|nothosubsp\.|nothovar\.)\s+/i);
  if (rankMatch) {
    const idx = rankMatch.index;
    base = s.slice(0, idx).trim();
    infraspecific = s.slice(idx + rankMatch[0].length).trim();
    rank = rankMatch[1].toLowerCase().replace(".", "");
    rankLabel = rankMatch[1];
  }

  const tokens = base.split(" ");
  let nameTokens;
  if (tokens[1] === "×") nameTokens = tokens.slice(0, 3);
  else nameTokens = tokens.slice(0, 2);
  const name = nameTokens.join(" ");
  const authors = base.slice(name.length).trim();

  return {
    genus,
    name,
    epithet: nameTokens.slice(tokens[1] === "×" ? 2 : 1).join(" "),
    authors,
    rank,
    rankLabel,
    infraspecific,
    hybrid,
    fullName: raw.trim(),
  };
}

function parsePublication(pub) {
  if (!pub) return { publication: "", year: null };
  const years = [...pub.matchAll(/\((\d{4})\)/g)].map((m) => Number(m[1]));
  return {
    publication: pub,
    year: years.length ? years[years.length - 1] : null,
  };
}

function splitList(value) {
  if (!value) return [];
  const out = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      if (current.trim()) out.push(current.trim());
      current = "";
    } else current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

function familyFromClassification(classification) {
  const m = classification?.match(/Family\s+([A-Za-z]+)/i);
  return m ? m[1] : "";
}

/** Parse one accordion panel: bold heading = accepted. */
function parsePage(html, genus) {
  const chunks = html.split('<div class="panel panel-default">').slice(1);
  const records = [];
  for (const chunk of chunks) {
    const heading = chunk.match(
      /<div class="panel-heading"[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/
    );
    const code = chunk.match(/<code>([\s\S]*?)<\/code>/i);
    if (!heading || !code) continue;
    const accepted = /<b[\s>]/i.test(heading[1]);
    const fields = parseFields(code[1]);
    const rawName = fields.species || fields.name || "";
    if (!rawName) continue;
    const taxon = parseTaxon(rawName, genus);
    if (!accepted) continue;
    const status = (fields.status || "").toLowerCase();
    if (status && !status.startsWith("accepted")) continue;
    const pub = parsePublication(fields.publication);
    const synonym = fields.synonym || "";
    const comment = fields.comment || "";
    const parentFormula = /=\??\s*([A-Z][A-Za-z.×x -]+?)\s+\*\s+([A-Z][A-Za-z.×x -]+)/.exec(
      synonym
    );
    const isHybrid =
      taxon.hybrid ||
      /parentage|hybrid/i.test(comment) ||
      /^=\??\s*[A-Z][A-Za-z.]+.*\s\*\s+[A-Z]/i.test(synonym);
    const record = {
      ...taxon,
      hybrid: isHybrid,
      status: fields.status || (isHybrid ? "Accepted (natural hybrid)" : "Accepted"),
      publication: pub.publication,
      year: pub.year,
      typeLocality: fields.type || fields.lectotype || fields.neotype || "",
      countries: splitList(fields.countries),
      provinces: splitList(fields.floristic_provinces),
      redList: fields.red_list || "",
      classification: fields.classification || "",
      family: familyFromClassification(fields.classification),
      synonym,
      basionym: fields.basionym || "",
      comment,
      parentFormula: parentFormula
        ? [parentFormula[1].trim(), parentFormula[2].trim()]
        : [],
      source: `${BASE}?name=${encodeURIComponent(genus)}`,
    };
    records.push(record);
  }
  return records;
}

async function fetchGenus(genus) {
  const url = `${BASE}?name=${encodeURIComponent(genus)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "PlantivorousDatabaseBuilder/1.0 (+https://www.plantivorous.co.za; educational carnivorous plant database)",
      Accept: "text/html",
    },
  });
  if (!res.ok) throw new Error(`${genus}: HTTP ${res.status}`);
  return { html: await res.text(), url };
}

async function main() {
  await mkdir(DATA, { recursive: true });
  const accepted = [];
  const summary = [];

  for (const genus of GENERA) {
    process.stdout.write(`Fetching ${genus}… `);
    const { html, url } = await fetchGenus(genus);
    const records = parsePage(html, genus);
    let speciesCount = 0;
    let hybridCount = 0;
    let infraCount = 0;
    for (const record of records) {
      if (record.rank !== "species") {
        const parent = accepted.find(
          (x) => x.genus === genus && x.name === record.name && x.rank === "species"
        );
        if (parent) {
          parent.infraspecificTaxa = parent.infraspecificTaxa || [];
          parent.infraspecificTaxa.push({
            rank: record.rank,
            rankLabel: record.rankLabel,
            name: record.infraspecific.split(" ")[0],
            authors: record.infraspecific.split(" ").slice(1).join(" "),
            fullName: record.fullName,
            publication: record.publication,
            year: record.year,
            typeLocality: record.typeLocality,
            countries: record.countries,
          });
          infraCount++;
        }
        continue;
      }
      accepted.push(record);
      speciesCount++;
      if (record.hybrid) hybridCount++;
    }
    summary.push({
      genus,
      accepted: speciesCount,
      hybrids: hybridCount,
      infraspecific: infraCount,
      url,
    });
    console.log(`${speciesCount} species/hybrids (${hybridCount} hybrid), ${infraCount} infraspecific`);
    await new Promise((r) => setTimeout(r, 300));
  }

  const byKey = new Map();
  for (const r of accepted) {
    const key = `${r.genus}|${r.name}`;
    if (!byKey.has(key)) byKey.set(key, r);
    else {
      const prev = byKey.get(key);
      prev.countries = [...new Set([...prev.countries, ...r.countries])];
      prev.provinces = [...new Set([...prev.provinces, ...r.provinces])];
      prev.infraspecificTaxa = [
        ...(prev.infraspecificTaxa || []),
        ...(r.infraspecificTaxa || []),
      ];
    }
  }
  const species = [...byKey.values()]
    .map((r) => ({
      ...r,
      infraspecificTaxa: r.infraspecificTaxa
        ? [...new Map(r.infraspecificTaxa.map((t) => [t.fullName, t])).values()]
        : [],
    }))
    .sort((a, b) =>
      a.genus === b.genus ? a.name.localeCompare(b.name) : a.genus.localeCompare(b.genus)
    );

  const generated = new Date().toISOString();
  await writeFile(
    join(DATA, "icps-species.json"),
    JSON.stringify({ generated, source: BASE, count: species.length, species }, null, 2)
  );
  await writeFile(
    join(DATA, "icps-summary.json"),
    JSON.stringify({ generated, total: species.length, summary }, null, 2)
  );
  const hybrids = species.filter((s) => s.hybrid).length;
  console.log(`\nWrote ${species.length} accepted species/hybrids (${hybrids} hybrids) to data/icps-species.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
