#!/usr/bin/env node
/**
 * Import every ICPS-registered cultivar into one static dataset.
 *
 * Source: https://cpnames.carnivorousplants.org/Cultivars.php?name=<Genus>
 * Snapshot: .photo-test/icps-cultivars-parsed.json (from scrape-icps-cultivars.mjs)
 * Output:   data/icps-cultivars.json
 *
 * Registration facts come from the ICPS register. Summaries are original
 * editorial text; the register remains authoritative for full descriptions.
 */

import { readFile, writeFile } from "node:fs/promises";

const SNAPSHOT = ".photo-test/icps-cultivars-parsed.json";
const SPECIES = "data/icps-species.json";
const OUT = "data/icps-cultivars.json";

function decode(text) {
  return String(text || "")
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

function cleanNote(text) {
  return decode(text)
    .split(/\n\s*\n/)[0]
    .replace(/\bIMAGE:.*$/gim, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

function sentence(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

const slugify = (value) =>
  String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const parsed = JSON.parse(await readFile(SNAPSHOT, "utf8"));
const speciesDoc = JSON.parse(await readFile(SPECIES, "utf8"));

/* Build a longest-first list of resolvable parent names. */
const knownNames = [];
for (const s of speciesDoc.species) {
  knownNames.push(s.name);
  for (const t of s.infraspecificTaxa || []) {
    if (t.fullName) knownNames.push(t.fullName);
  }
}
knownNames.sort((a, b) => b.length - a.length);

function resolveParent(raw) {
  let value = decode(raw)
    .replace(/^=?\??\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!value || value === "?" || value.endsWith(" ?")) return null;
  for (const candidate of knownNames) {
    if (value === candidate || value.startsWith(candidate + " ")) {
      return candidate;
    }
  }
  // Fall back to the first two words (genus + epithet), or three for hybrids.
  const tokens = value.split(" ");
  if (tokens[1] === "×" && tokens[2]) return `${tokens[0]} × ${tokens[2]}`;
  if (tokens[1]) return `${tokens[0]} ${tokens[1]}`;
  return null;
}

function parseParents(synonym) {
  if (!synonym) return [];
  return synonym
    .split(/\s+\*\s+/)
    .map((part) => resolveParent(part))
    .filter(Boolean);
}

function parseRegistrationDate(fields) {
  const registrantRaw = fields.Registrant || "";
  const dateMatch =
    registrantRaw.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/) ||
    (fields["Horicultural comment"] || "").match(
      /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/
    );
  if (!dateMatch) return "";
  const [, d, m, y] = dateMatch;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

const cultivars = [];
for (const genus of Object.keys(parsed)) {
  for (const entry of parsed[genus].cultivars) {
    const name = decode(entry.name);
    const publication = decode(entry.publication);
    const fields = entry.fields;

    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const authorityMatch = (fields.Cultivar || "").match(
      new RegExp("^" + escapedName + "\\s+(.+)$")
    );
    const authority = authorityMatch ? authorityMatch[1].trim() : "";

    const registrationDate = parseRegistrationDate(fields);
    const publicationYear = (publication.match(/\((\d{4})\)/) || [])[1] || "";
    const year = registrationDate
      ? Number(registrationDate.slice(0, 4))
      : publicationYear
        ? Number(publicationYear)
        : 0;

    const registrant = (fields.Registrant || "")
      .replace(/,\s*\d{1,2}\.\s*\d{1,2}\.\s*\d{4}.*$/, "")
      .trim();
    const registrationDateLabel = registrationDate
      ? new Date(`${registrationDate}T00:00:00Z`).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })
      : "";

    const etymology = cleanNote(fields.Etymology || "");
    const parentFormula = parseParents(fields.Synonym || "");

    const bits = [
      `${name} is an ICPS-registered cultivar of ${parentFormula[0] || genus}.`,
    ];
    if (parentFormula.length > 1) {
      bits.push(`Its registered parentage is ${parentFormula.join(" × ")}.`);
    }
    if (authority) bits.push(`The cultivar authority is ${authority}.`);
    if (fields.Originator) bits.push(`It was originated by ${decode(fields.Originator)}.`);
    if (registrant) {
      bits.push(
        `The registration was submitted by ${registrant}${
          registrationDateLabel ? ` on ${registrationDateLabel}` : ""
        }.`
      );
    }
    if (publication) bits.push(`It was published in ${sentence(publication)}`);
    if (etymology) bits.push(`The registered etymology is: ${sentence(etymology)}`);
    bits.push(
      fields.Standard
        ? `Its registration standard is ${sentence(decode(fields.Standard))}`
        : "Its registration standard is recorded in the ICPS register."
    );
    bits.push(
      "Cultivar characteristics are defined by that registration; consult the ICPS register entry for the full description."
    );

    cultivars.push({
      name,
      slug: slugify(name),
      genus,
      authority,
      year,
      registrationDate,
      publication,
      originator: decode(fields.Originator || ""),
      nominant: decode(fields.Nominant || ""),
      registrant,
      horticulturalComment: decode(fields["Horicultural comment"] || ""),
      standard: decode(fields.Standard || ""),
      etymology,
      propagation: decode(fields.Propagation || ""),
      synonym: decode(fields.Synonym || ""),
      parentFormula,
      webPublication: decode(fields["Web Publication"] || ""),
      comment: decode(fields.Comment || ""),
      awards: decode(fields["Awards/patents"] || ""),
      summary: `ICPS-registered ${genus} cultivar${year ? ` (${year})` : ""}.`,
      description: bits.join(" "),
      source: parsed[genus].url,
      photoFinder:
        "http://cpphotofinder.com/find.php?species=" + encodeURIComponent(name),
    });
  }
}

cultivars.sort((a, b) =>
  a.name.localeCompare(b.name, "en", { sensitivity: "base" })
);

const doc = {
  source: "https://cpnames.carnivorousplants.org/Cultivars.php",
  retrieved: new Date().toISOString().slice(0, 10),
  count: cultivars.length,
  genera: Object.fromEntries(
    Object.keys(parsed).map((g) => [g, parsed[g].cultivars.length])
  ),
  note:
    "Names and registration facts from the ICPS Carnivorous Plant Names Resource registered-cultivar list. Summaries are original editorial text; the ICPS register remains the authority for the full description.",
  cultivars,
};

await writeFile(OUT, JSON.stringify(doc, null, 2) + "\n", "utf8");
console.log(`Wrote ${OUT}: ${cultivars.length} cultivars`);
console.log(doc.genera);
