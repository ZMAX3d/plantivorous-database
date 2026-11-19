#!/usr/bin/env node
/**
 * Import the ICPS registered Dionaea cultivar list into a static dataset.
 *
 * Source: https://cpnames.carnivorousplants.org/Cultivars.php?name=Dionaea
 * The importer stores registration facts and a short original summary. It does
 * not copy the ICPS/CPN descriptive paragraphs; every record links back to the
 * ICPS register for the full registration text.
 */

import { readFile, writeFile } from "node:fs/promises";

const SOURCE = "https://cpnames.carnivorousplants.org/Cultivars.php?name=Dionaea";
const SNAPSHOT = ".photo-test/icps-dionaea-cultivars.html";
const OUT = "data/dionaea-cultivars.json";

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

const html = await readFile(SNAPSHOT, "utf8");
const blockRe =
  /<td valign="top" nowrap><b>(Dionaea[^<]+)<\/b><\/td>\s*<td valign="top" nowrap>([\s\S]*?)<\/td><\/tr>\s*<tr><td colspan="2">([\s\S]*?)<\/td><\/tr>/g;

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

  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const authorityMatch = (fields.Cultivar || "").match(
    new RegExp("^" + escapedName + "\\s+(.+)$")
  );
  const authority = authorityMatch ? authorityMatch[1].trim() : "";
  const registrantRaw = fields.Registrant || "";
  const dateMatch =
    registrantRaw.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/) ||
    (fields["Horicultural comment"] || "").match(
      /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/
    );
  let registrationDate = "";
  if (dateMatch) {
    const [, d, m, y] = dateMatch;
    registrationDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const publicationYear = (publication.match(/\((\d{4})\)/) || [])[1] || "";
  const year = registrationDate
    ? Number(registrationDate.slice(0, 4))
    : publicationYear
      ? Number(publicationYear)
      : 0;
  const registrant = registrantRaw
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

  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const bits = [`${name} is an ICPS-registered cultivar of Dionaea muscipula.`];
  if (authority) bits.push(`The cultivar authority is ${authority}.`);
  if (fields.Originator) bits.push(`It was originated by ${fields.Originator}.`);
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
      ? `Its registration standard is ${sentence(fields.Standard)}`
      : "Its registration standard is recorded in the ICPS register."
  );
  bits.push(
    "Cultivar characteristics are defined by that registration; consult the ICPS register entry for the full description."
  );

  cultivars.push({
    name,
    slug,
    authority,
    year,
    registrationDate,
    publication,
    originator: fields.Originator || "",
    nominant: fields.Nominant || "",
    registrant,
    horticulturalComment: fields["Horicultural comment"] || "",
    standard: fields.Standard || "",
    etymology,
    propagation: fields.Propagation || "",
    synonym: fields.Synonym || "",
    webPublication: fields["Web Publication"] || "",
    comment: fields.Comment || "",
    awards: fields["Awards/patents"] || "",
    summary: `ICPS-registered Venus flytrap cultivar${year ? ` (${year})` : ""}.`,
    description: bits.join(" "),
    source: SOURCE,
    photoFinder:
      `http://cpphotofinder.com/find.php?species=` +
      encodeURIComponent(name),
  });
}

cultivars.sort((a, b) =>
  a.name.localeCompare(b.name, "en", { sensitivity: "base" })
);

const doc = {
  source: SOURCE,
  retrieved: new Date().toISOString().slice(0, 10),
  count: cultivars.length,
  note:
    "Names and registration facts from the ICPS Carnivorous Plant Names Resource registered-cultivar list. Summaries are original editorial text; the ICPS register remains the authority for the full description.",
  cultivars,
};

await writeFile(OUT, JSON.stringify(doc, null, 2) + "\n", "utf8");
console.log(`Wrote ${OUT}: ${cultivars.length} cultivars`);
