#!/usr/bin/env node
/**
 * Build the Plantivorous database bundle.
 *
 * Inputs
 *   data/icps-species.json     accepted ICPS snapshot (751 taxa)
 *   data/genera.json           editorial genus profiles + genus care
 *   data/species-notes.json    flagship species notes
 *   data/locations.json        country / region / province centroids
 *   data/photo-credits.json    Wikimedia Commons photo credits
 *   data/care-groups.json      cross-genus care group reference
 *   data/watchlist.json        recent taxa not yet in the ICPS snapshot
 *   data/changelog.json        monitoring timeline
 *
 * Outputs
 *   data/species.json          full merged dataset (human readable)
 *   assets/js/data.js          window.PLANTIVOROUS bundle for the static app
 *
 * Usage: node scripts/build-data.mjs
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");

async function readJson(name) {
  return JSON.parse(await readFile(join(DATA, name), "utf8"));
}

const icps = await readJson("icps-species.json");
const generaDoc = await readJson("genera.json");
const notesDoc = await readJson("species-notes.json");
const locations = await readJson("locations.json");
const photoDoc = await readJson("photo-credits.json");
const careDoc = await readJson("care-groups.json");
const watchDoc = await readJson("watchlist.json");
const changelog = await readJson("changelog.json");

const GENERA = new Map(generaDoc.genera.map((g) => [g.genus, g]));
const NOTES = notesDoc.species || {};
const CREDITS = new Map((photoDoc.credits || []).map((c) => [c.species, c]));
const CARE_GROUPS = careDoc.groups || {};
const WATCH = new Map((watchDoc.taxa || []).map((t) => [t.name, t]));

/* ------------------------------------------------------------------ */
/* Small utilities                                                     */
/* ------------------------------------------------------------------ */

const stripDiacritics = (value) =>
  String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

const normKey = (value) =>
  stripDiacritics(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const compactKey = (value) => normKey(value).replace(/\s+/g, "");

const slugify = (value) =>
  stripDiacritics(value)
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const titleCase = (value) =>
  String(value)
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");

const cleanText = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/^[\s,;:.-]+|[\s,;:.-]+$/g, "")
    .trim();

const unique = (values) => [...new Set(values.filter(Boolean))];

const round = (value) => Math.round(value * 1000) / 1000;

/* ------------------------------------------------------------------ */
/* Continent helpers                                                   */
/* ------------------------------------------------------------------ */

function continentForCountry(countryKey) {
  const meta = locations.countryMeta?.[countryKey];
  if (!meta) return null;
  if (meta.region === "Americas") {
    if (meta.subregion === "South America") return "South America";
    return "North America";
  }
  if (meta.region === "Antarctic") return "Antarctica";
  return meta.region || null;
}

const REGION_CONTINENT_HINTS = [
  ["australia", "Oceania"],
  ["new zealand", "Oceania"],
  ["papua", "Oceania"],
  ["united states", "North America"],
  ["canada", "North America"],
  ["mexico", "North America"],
  ["brazil", "South America"],
  ["chile", "South America"],
  ["argentina", "South America"],
  ["colombia", "South America"],
  ["venezuela", "South America"],
  ["guyana", "South America"],
  ["ecuador", "South America"],
  ["peru", "South America"],
  ["bolivia", "South America"],
  ["russian federation", "Asia"],
  ["china", "Asia"],
  ["india", "Asia"],
  ["japan", "Asia"],
  ["korea", "Asia"],
  ["philippines", "Asia"],
  ["myanmar", "Asia"],
  ["thailand", "Asia"],
  ["kazakhstan", "Asia"],
  ["indonesia", "Asia"],
  ["malaysia", "Asia"],
  ["spain", "Europe"],
  ["poland", "Europe"],
  ["croatia", "Europe"],
  ["czech", "Europe"],
  ["hungary", "Europe"],
  ["romania", "Europe"],
  ["bulgaria", "Europe"],
  ["greece", "Europe"],
  ["italy", "Europe"],
  ["france", "Europe"],
  ["germany", "Europe"],
  ["austria", "Europe"],
  ["switzerland", "Europe"],
  ["ukraine", "Europe"],
  ["belarus", "Europe"],
  ["estonia", "Europe"],
  ["latvia", "Europe"],
  ["lithuania", "Europe"],
  ["zambia", "Africa"],
  ["mozambique", "Africa"],
  ["south africa", "Africa"],
  ["madagascar", "Africa"],
  ["tanzania", "Africa"],
  ["kenya", "Africa"],
  ["nigeria", "Africa"],
  ["congo", "Africa"],
  ["ghana", "Africa"],
  ["botswana", "Africa"],
  ["chad", "Africa"],
  ["sudan", "Africa"],
  ["rwanda", "Africa"],
  ["uganda", "Africa"],
  ["zimbabwe", "Africa"],
  ["namibia", "Africa"],
  ["senegal", "Africa"],
  ["mali", "Africa"],
  ["niger", "Africa"],
  ["ethiopia", "Africa"],
  ["eritrea", "Africa"],
  ["somalia", "Africa"],
  ["cameroon", "Africa"],
  ["gabon", "Africa"],
  ["angola", "Africa"],
  ["guinea", "Africa"],
  ["liberia", "Africa"],
  ["sierra leone", "Africa"],
  ["togo", "Africa"],
  ["benin", "Africa"],
  ["burkina", "Africa"],
  ["mauritania", "Africa"],
  ["morocco", "Africa"],
  ["algeria", "Africa"],
  ["egypt", "Africa"],
  ["tunisia", "Africa"],
  ["libya", "Africa"],
];

function continentForRegion(name) {
  const lower = name.toLowerCase();
  for (const [needle, continent] of REGION_CONTINENT_HINTS) {
    if (lower.includes(needle)) return continent;
  }
  return null;
}

// Some ICPS country fields use named regions ("S Australia", "W Russian
// Federation") instead of a country. Infer the country where the region name
// contains an unambiguous country name; leave genuinely multinational regions
// (West Indies, Central America, Guiana Highlands) alone.
const COUNTRY_NAME_INDEX = Object.entries(locations.countryMeta || {})
  .map(([key, meta]) => ({
    key,
    canonical: meta?.canonical || key,
    needle: normKey(meta?.canonical || key),
  }))
  .filter((entry) => entry.needle.length >= 4)
  .sort((a, b) => b.needle.length - a.needle.length);

function countryFromRegion(regionName) {
  const lower = normKey(regionName);
  if (!lower || lower.includes("new guinea") || lower.includes("upper guinea")) {
    return null;
  }
  const padded = ` ${lower} `;
  for (const entry of COUNTRY_NAME_INDEX) {
    if (padded.includes(` ${entry.needle} `)) return entry;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Country / origin resolution                                         */
/* ------------------------------------------------------------------ */

const COUNTRY_ALIASES = {
  "United States of America)": "United States of America",
  "United States": "United States of America",
  USA: "United States of America",
  "U.S.A.": "United States of America",
  "United Kingdom": "United Kingdom of Great Britain and Northern Ireland",
  UK: "United Kingdom of Great Britain and Northern Ireland",
  "Great Britain": "United Kingdom of Great Britain and Northern Ireland",
  Russia: "Russian Federation",
  Vietnam: "Viet Nam",
  Laos: "Lao People's Democratic Republic",
  "Lao PDR": "Lao People's Democratic Republic",
  "Syrian Arab Republic": "Syria",
  Iran: "Iran",
  "South Korea": "Korea",
  "North Korea": "Korea",
  Tanzania: "United Republic of Tanzania",
  Eswatini: "Swaziland",
  "North Macedonia": "Macedonia",
  "Ivory Coast": "Cote d'Ivoire",
  "Côte d'Ivoire": "Cote d'Ivoire",
  "São Tomé and Príncipe": "São Tomé and Príncipe",
  "Sao Tome and Principe": "São Tomé and Príncipe",
  "Virgin Islands": "United States Virgin Islands",
  "British Virgin Islands": "British Virgin Islands",
  "Netherlands Antilles": "AN",
  "Curaçao": "AN",
  Curacao: "AN",
  "Czech Republic": "Czechia",
  "Republic of the Congo": "Congo",
  "Democratic Republic of the Congo": "DR Congo",
  "DRC": "DR Congo",
  "Burma": "Myanmar",
  "Cape Verde": "Cape Verde",
  "East Timor": "Timor-Leste",
  "Swaziland": "Swaziland",
};

const countryLookup = new Map();
for (const [key, value] of Object.entries(locations.countries || {})) {
  countryLookup.set(normKey(key), key);
  countryLookup.set(compactKey(key), key);
  const meta = locations.countryMeta?.[key];
  if (meta?.canonical) {
    countryLookup.set(normKey(meta.canonical), key);
    countryLookup.set(compactKey(meta.canonical), key);
  }
  if (meta?.iso2) countryLookup.set(normKey(meta.iso2), key);
}
for (const [alias, canonical] of Object.entries(COUNTRY_ALIASES)) {
  countryLookup.set(normKey(alias), canonical);
  countryLookup.set(compactKey(alias), canonical);
}

const regionLookup = new Map(
  Object.keys(locations.regions || {}).map((key) => [normKey(key), key])
);

const provinceLookup = new Map(
  Object.keys(locations.provinces || {}).map((key) => [normKey(key), key])
);

// Extra locality centroids used in ICPS country annotations. These are
// approximate island / state / province centres, used only for the map.
const EXTRA_POINTS = {
  // Southeast Asia and Malesia
  borneo: [1.0, 114.0],
  sumatra: [0.0, 102.0],
  java: [-7.5, 110.0],
  sulawesi: [-2.0, 121.0],
  celebes: [-2.0, 121.0],
  "new guinea": [-6.0, 143.0],
  nguin: [-6.0, 143.0],
  "lesser sunda": [-8.5, 121.0],
  "lesser sunda is": [-8.5, 121.0],
  maluku: [-3.0, 128.0],
  moluccas: [-3.0, 128.0],
  "aru is": [-6.0, 134.0],
  waigeo: [-0.2, 130.8],
  "waigeo is": [-0.2, 130.8],
  flores: [-8.6, 121.0],
  sumba: [-9.7, 120.0],
  palawan: [9.8, 118.7],
  mindanao: [7.5, 125.0],
  luzon: [16.0, 121.0],
  negros: [10.3, 123.0],
  panay: [11.4, 122.4],
  sibuyan: [12.4, 122.6],
  dinagat: [10.1, 125.6],
  samar: [12.0, 125.0],
  leyte: [10.9, 124.9],
  cebu: [10.3, 123.9],
  bohol: [9.8, 124.1],
  palawan: [9.8, 118.7],
  hainan: [19.2, 109.5],
  taiwan: [23.7, 121.0],
  "sri lanka": [7.8, 80.7],
  ceylon: [7.8, 80.7],
  "andaman is": [12.5, 92.8],
  "nicobar is": [7.0, 93.8],
  "andamanes": [12.5, 92.8],
  "malay peninsula": [4.0, 102.0],
  malaya: [4.0, 102.0],
  "south indochina": [10.0, 105.0],
  annam: [16.0, 107.0],
  "khasi manipur": [25.0, 93.0],
  "deccan": [18.0, 77.0],
  "west indies": [18.0, -74.0],
  "greater antilles": [19.0, -76.0],
  "lesser antilles": [15.0, -61.0],
  "galapagos": [-0.7, -90.3],
  "galapagos is": [-0.7, -90.3],
  "new caledonia": [-21.3, 165.5],
  fiji: [-18.0, 178.0],
  "society is": [-17.6, -149.4],
  "hawaiian is": [20.8, -156.3],
  hawaii: [20.8, -156.3],
  "cape verde": [16.0, -24.0],
  "canary is": [28.3, -15.8],
  azores: [38.5, -28.0],
  madeira: [32.8, -17.0],
  corsica: [42.1, 9.1],
  sardinia: [40.1, 9.1],
  sicily: [37.5, 14.0],
  crete: [35.2, 24.9],
  cyprus: [35.0, 33.0],
  "mount athos": [40.2, 24.3],
  "transvaal": [-25.0, 29.0],
  natal: [-29.0, 30.5],
  "cape province": [-33.0, 22.0],
  "south africa cape": [-33.0, 20.0],
  "eastern cape": [-32.5, 26.0],
  "western cape": [-33.5, 21.0],
  "northern cape": [-29.0, 21.0],
  "free state": [-28.0, 26.0],
  "kwazulu natal": [-28.5, 30.5],
  "madagascar": [-19.0, 47.0],
  "mauritius": [-20.2, 57.5],
  "réunion": [-21.1, 55.5],
  reunion: [-21.1, 55.5],
  "socotra": [12.5, 54.0],
  // China / East Asia
  heilongjiang: [47.5, 128.0],
  guangdong: [23.3, 113.5],
  guangxi: [23.0, 108.5],
  hunan: [27.5, 111.7],
  yunnan: [25.0, 101.5],
  tibet: [30.0, 88.0],
  sichuan: [30.5, 102.5],
  anhui: [31.8, 117.2],
  chongqing: [29.8, 107.5],
  fujian: [26.0, 118.0],
  jiangsu: [33.0, 120.0],
  jiangxi: [27.5, 115.8],
  zhejiang: [29.2, 120.2],
  manchuria: [45.0, 127.0],
  "nei mongol": [42.0, 112.0],
  "mongol zizhiqu": [42.0, 112.0],
  "se tibet": [29.0, 91.0],
  "w yunnan": [25.5, 99.5],
  "nw yunnan": [27.5, 99.5],
  // Russia
  siberia: [60.0, 100.0],
  "e siberia": [62.0, 125.0],
  "w siberia": [58.0, 75.0],
  "c siberia": [60.0, 100.0],
  "se siberia": [55.0, 110.0],
  kamchatka: [56.0, 159.0],
  kamtchatka: [56.0, 159.0],
  kuriles: [46.5, 151.0],
  "kurile is": [46.5, 151.0],
  carelia: [62.0, 33.0],
  "stanovoy mts": [56.0, 126.0],
  // South Asia
  assam: [26.2, 92.9],
  kerala: [10.5, 76.3],
  "tamil nadu": [11.1, 78.7],
  karnataka: [15.3, 75.7],
  maharashtra: [19.8, 75.5],
  "madhya pradesh": [23.5, 78.5],
  "west bengal": [22.9, 87.9],
  // Brazil
  bahia: [-12.5, -41.7],
  "minas gerais": [-18.5, -44.0],
  "espirito santo": [-19.5, -40.7],
  roraima: [2.0, -61.0],
  "s paulo": [-22.0, -48.0],
  "sao paulo": [-22.0, -48.0],
  "rio de janeiro": [-22.5, -42.5],
  parana: [-24.0, -51.0],
  "santa catarina": [-27.0, -50.0],
  "rio grande do sul": [-30.0, -53.0],
  goias: [-15.0, -49.0],
  mato: [-12.0, -56.0],
  "mato grosso": [-12.0, -56.0],
  para: [-4.0, -53.0],
  amazonas: [-5.0, -63.0],
  // North America
  "nova scotia": [45.0, -63.0],
  "new brunswick": [46.5, -66.0],
  quebec: [52.0, -72.0],
  ontario: [50.0, -85.0],
  alberta: [55.0, -115.0],
  manitoba: [53.0, -98.0],
  saskatchewan: [54.0, -106.0],
  "british columbia": [53.0, -124.0],
  yukon: [64.0, -135.0],
  "northwest territories": [65.0, -118.0],
  mackenzie: [65.0, -118.0],
  nunavut: [70.0, -90.0],
  newfoundland: [49.0, -56.0],
  labrador: [54.0, -61.0],
  "prince edward island": [46.5, -63.0],
  "new hampshire": [43.9, -71.5],
  vermont: [44.0, -72.7],
  maine: [45.3, -69.0],
  massachusetts: [42.3, -71.8],
  "rhode island": [41.7, -71.5],
  connecticut: [41.6, -72.7],
  "new york": [43.0, -75.0],
  "new jersey": [40.2, -74.7],
  pennsylvania: [41.0, -77.8],
  maryland: [39.0, -76.7],
  delaware: [39.0, -75.5],
  virginia: [37.5, -78.5],
  "west virginia": [38.6, -80.6],
  "north carolina": [35.5, -79.0],
  "south carolina": [33.8, -81.0],
  georgia: [32.6, -83.4],
  florida: [28.5, -82.0],
  alabama: [32.8, -86.8],
  mississippi: [32.7, -89.7],
  louisiana: [30.9, -91.9],
  tennessee: [35.8, -86.3],
  kentucky: [37.5, -85.3],
  ohio: [40.3, -82.8],
  indiana: [39.8, -86.2],
  illinois: [40.0, -89.2],
  michigan: [44.3, -85.4],
  wisconsin: [44.5, -89.7],
  minnesota: [46.0, -94.0],
  iowa: [42.0, -93.5],
  missouri: [38.5, -92.5],
  arkansas: [34.8, -92.2],
  oklahoma: [35.5, -97.5],
  texas: [31.0, -100.0],
  kansas: [38.5, -98.0],
  nebraska: [41.5, -99.8],
  "south dakota": [44.5, -100.0],
  "north dakota": [47.5, -100.0],
  montana: [47.0, -110.0],
  wyoming: [43.0, -107.5],
  colorado: [39.0, -105.5],
  "new mexico": [34.5, -106.0],
  arizona: [34.2, -111.7],
  utah: [39.3, -111.7],
  nevada: [39.3, -116.6],
  idaho: [44.5, -114.5],
  oregon: [44.0, -120.5],
  washington: [47.4, -120.5],
  california: [37.0, -120.0],
  alaska: [64.0, -150.0],
  // Mexico / Central America
  chiapas: [16.5, -92.5],
  oaxaca: [17.0, -96.5],
  veracruz: [19.0, -96.5],
  guerrero: [17.5, -99.5],
  michoacan: [19.2, -101.8],
  jalisco: [20.5, -103.5],
  "mexico city": [19.4, -99.1],
  "baja california": [30.0, -115.0],
  sonora: [29.0, -110.0],
  // South America
  "buenos aires": [-36.0, -60.0],
  "rio negro": [-40.0, -67.0],
  "santa cruz": [-48.0, -70.0],
  "tierra del fuego": [-54.0, -68.5],
  "misiones": [-27.0, -55.0],
  "corrientes": [-29.0, -58.0],
  "entre rios": [-32.0, -59.0],
  "rio grande do sul": [-30.0, -53.0],
  "cerro de la neblina": [0.8, -66.0],
  "gran sabana": [5.0, -61.0],
  "serra do sol": [5.0, -60.5],
  "mount roraima": [5.1, -60.8],
  "mt roraima": [5.1, -60.8],
  "guayana highlands": [5.5, -61.0],
  "guiana highlands": [5.5, -61.0],
  // Africa
  "upper guinea": [10.0, -5.0],
  "congo": [-2.0, 23.0],
  "zambezi": [-15.0, 27.0],
  "sahel": [15.0, 0.0],
  "sudan": [15.0, 30.0],
  "east africa": [-2.0, 35.0],
  "west africa": [8.0, -2.0],
  "southern africa": [-25.0, 25.0],
  // Europe
  "central europe": [49.0, 12.0],
  "atlantic europe": [48.0, -3.0],
  "mediterranean": [40.0, 10.0],
  "pontus euxinus": [44.0, 34.0],
  "caucasus": [42.0, 44.0],
  "liguria tyrrhenia": [44.0, 10.0],
  "adriatic": [43.0, 15.0],
  "east mediterranean": [36.0, 28.0],
  "turania or aralo caspia": [44.0, 60.0],
  "eastern europe": [52.0, 30.0],
  "northern europe": [62.0, 15.0],
};

const DETAIL_POINTS = new Map();
const addPoint = (names, point) => {
  for (const name of names) {
    DETAIL_POINTS.set(compactKey(name), point);
  }
};
addPoint(["Borneo"], [1.0, 114.0]);
addPoint(["Sumatra"], [0.0, 102.0]);
addPoint(["Java"], [-7.5, 110.0]);
addPoint(["Sulawesi", "Celebes"], [-2.0, 121.0]);
addPoint(["New Guinea", "N.Guin.", "NGuin"], [-6.0, 143.0]);
addPoint(["Lesser Sunda Is.", "Lesser Sunda"], [-8.5, 121.0]);
addPoint(["Maluku", "Moluccas"], [-3.0, 128.0]);
addPoint(["Aru Is."], [-6.0, 134.0]);
addPoint(["Waigeo Is."], [-0.2, 130.8]);
addPoint(["Flores"], [-8.6, 121.0]);
addPoint(["Sumba"], [-9.7, 120.0]);
addPoint(["Palawan"], [9.8, 118.7]);
addPoint(["Mindanao"], [7.5, 125.0]);
addPoint(["Luzon"], [16.0, 121.0]);
addPoint(["Negros"], [10.3, 123.0]);
addPoint(["Panay"], [11.4, 122.4]);
addPoint(["Sibuyan"], [12.4, 122.6]);
addPoint(["Dinagat"], [10.1, 125.6]);
addPoint(["Samar"], [12.0, 125.0]);
addPoint(["Leyte"], [10.9, 124.9]);
addPoint(["Cebu"], [10.3, 123.9]);
addPoint(["Bohol"], [9.8, 124.1]);
addPoint(["Hainan"], [19.2, 109.5]);
addPoint(["Taiwan"], [23.7, 121.0]);
addPoint(["Sri Lanka", "Ceylon"], [7.8, 80.7]);
addPoint(["Andaman Is.", "Andamanes"], [12.5, 92.8]);
addPoint(["Nicobar Is."], [7.0, 93.8]);
addPoint(["Malaya", "Malay Peninsula"], [4.0, 102.0]);
addPoint(["South Indochina"], [10.0, 105.0]);
addPoint(["Annam"], [16.0, 107.0]);
addPoint(["Khasi-Manipur"], [25.0, 93.0]);
addPoint(["Deccan"], [18.0, 77.0]);
addPoint(["West Indies"], [18.0, -74.0]);
addPoint(["Greater Antilles"], [19.0, -76.0]);
addPoint(["Lesser Antilles"], [15.0, -61.0]);
addPoint(["Galapagos Is.", "Galapagos"], [-0.7, -90.3]);
addPoint(["New Caledonia"], [-21.3, 165.5]);
addPoint(["Fiji"], [-18.0, 178.0]);
addPoint(["Society Is."], [-17.6, -149.4]);
addPoint(["Hawaiian Is.", "Hawaii"], [20.8, -156.3]);
addPoint(["Cape Verde"], [16.0, -24.0]);
addPoint(["Canary Is."], [28.3, -15.8]);
addPoint(["Azores"], [38.5, -28.0]);
addPoint(["Madeira"], [32.8, -17.0]);
addPoint(["Corsica"], [42.1, 9.1]);
addPoint(["Sardinia"], [40.1, 9.1]);
addPoint(["Sicily"], [37.5, 14.0]);
addPoint(["Crete"], [35.2, 24.9]);
addPoint(["Cyprus"], [35.0, 33.0]);
addPoint(["Transvaal"], [-25.0, 29.0]);
addPoint(["Natal"], [-29.0, 30.5]);
addPoint(["Cape Province"], [-33.0, 22.0]);
addPoint(["Eastern Cape"], [-32.5, 26.0]);
addPoint(["Western Cape"], [-33.5, 21.0]);
addPoint(["Northern Cape"], [-29.0, 21.0]);
addPoint(["Free State"], [-28.0, 26.0]);
addPoint(["KwaZulu Natal"], [-28.5, 30.5]);
addPoint(["Madagascar"], [-19.0, 47.0]);
addPoint(["Mauritius"], [-20.2, 57.5]);
addPoint(["Reunion", "Réunion"], [-21.1, 55.5]);
addPoint(["Socotra"], [12.5, 54.0]);
addPoint(["Heilongjiang"], [47.5, 128.0]);
addPoint(["Guangdong"], [23.3, 113.5]);
addPoint(["Guangxi"], [23.0, 108.5]);
addPoint(["Hunan"], [27.5, 111.7]);
addPoint(["Yunnan", "W Yunnan", "NW Yunnan"], [25.0, 101.5]);
addPoint(["Tibet", "SE Tibet"], [30.0, 88.0]);
addPoint(["Sichuan"], [30.5, 102.5]);
addPoint(["Anhui"], [31.8, 117.2]);
addPoint(["Chongqing"], [29.8, 107.5]);
addPoint(["Fujian"], [26.0, 118.0]);
addPoint(["Jiangsu"], [33.0, 120.0]);
addPoint(["Jiangxi"], [27.5, 115.8]);
addPoint(["Zhejiang"], [29.2, 120.2]);
addPoint(["Manchuria"], [45.0, 127.0]);
addPoint(["Nei Mongol", "Mongol Zizhiqu"], [42.0, 112.0]);
addPoint(["Siberia", "E Siberia", "W Siberia", "C Siberia", "SE Siberia"], [60.0, 100.0]);
addPoint(["Kamchatka", "Kamtchatka"], [56.0, 159.0]);
addPoint(["Kuriles", "Kurile Is."], [46.5, 151.0]);
addPoint(["Carelia"], [62.0, 33.0]);
addPoint(["Stanovoy Mts."], [56.0, 126.0]);
addPoint(["Assam"], [26.2, 92.9]);
addPoint(["Kerala"], [10.5, 76.3]);
addPoint(["Tamil Nadu"], [11.1, 78.7]);
addPoint(["Karnataka"], [15.3, 75.7]);
addPoint(["Maharashtra"], [19.8, 75.5]);
addPoint(["Madhya Pradesh"], [23.5, 78.5]);
addPoint(["West Bengal"], [22.9, 87.9]);
addPoint(["Bahia", "N Bahia", "S Bahia"], [-12.5, -41.7]);
addPoint(["Minas Gerais"], [-18.5, -44.0]);
addPoint(["Espirito Santo"], [-19.5, -40.7]);
addPoint(["Roraima"], [2.0, -61.0]);
addPoint(["S.Paulo", "Sao Paulo"], [-22.0, -48.0]);
addPoint(["Rio de Janeiro"], [-22.5, -42.5]);
addPoint(["Parana"], [-24.0, -51.0]);
addPoint(["Santa Catarina"], [-27.0, -50.0]);
addPoint(["Rio Grande do Sul"], [-30.0, -53.0]);
addPoint(["Goias"], [-15.0, -49.0]);
addPoint(["Mato Grosso"], [-12.0, -56.0]);
addPoint(["Para"], [-4.0, -53.0]);
addPoint(["Amazonas"], [-5.0, -63.0]);
addPoint(["Nova Scotia"], [45.0, -63.0]);
addPoint(["New Brunswick"], [46.5, -66.0]);
addPoint(["Quebec"], [52.0, -72.0]);
addPoint(["Ontario"], [50.0, -85.0]);
addPoint(["Alberta"], [55.0, -115.0]);
addPoint(["Manitoba"], [53.0, -98.0]);
addPoint(["Saskatchewan"], [54.0, -106.0]);
addPoint(["British Columbia"], [53.0, -124.0]);
addPoint(["Yukon"], [64.0, -135.0]);
addPoint(["Northwest Territories", "Mackenzie"], [65.0, -118.0]);
addPoint(["Nunavut"], [70.0, -90.0]);
addPoint(["Newfoundland"], [49.0, -56.0]);
addPoint(["Labrador"], [54.0, -61.0]);
addPoint(["Prince Edward Island"], [46.5, -63.0]);
addPoint(["New Hampshire"], [43.9, -71.5]);
addPoint(["Vermont"], [44.0, -72.7]);
addPoint(["Maine"], [45.3, -69.0]);
addPoint(["Massachusetts", "Mass."], [42.3, -71.8]);
addPoint(["Rhode Island", "Rhode Is."], [41.7, -71.5]);
addPoint(["Connecticut"], [41.6, -72.7]);
addPoint(["New York", "NY."], [43.0, -75.0]);
addPoint(["New Jersey", "NJ."], [40.2, -74.7]);
addPoint(["Pennsylvania"], [41.0, -77.8]);
addPoint(["Maryland"], [39.0, -76.7]);
addPoint(["Delaware"], [39.0, -75.5]);
addPoint(["Virginia", "Va."], [37.5, -78.5]);
addPoint(["West Virginia", "WVa."], [38.6, -80.6]);
addPoint(["North Carolina", "NC."], [35.5, -79.0]);
addPoint(["South Carolina", "SC."], [33.8, -81.0]);
addPoint(["Georgia", "Ga."], [32.6, -83.4]);
addPoint(["Florida", "Fla."], [28.5, -82.0]);
addPoint(["Alabama", "Ala."], [32.8, -86.8]);
addPoint(["Mississippi", "Miss."], [32.7, -89.7]);
addPoint(["Louisiana", "La."], [30.9, -91.9]);
addPoint(["Tennessee", "Tenn."], [35.8, -86.3]);
addPoint(["Kentucky", "Ky."], [37.5, -85.3]);
addPoint(["Ohio"], [40.3, -82.8]);
addPoint(["Indiana", "Ind."], [39.8, -86.2]);
addPoint(["Illinois", "Ill."], [40.0, -89.2]);
addPoint(["Michigan", "Mich."], [44.3, -85.4]);
addPoint(["Wisconsin", "Wis."], [44.5, -89.7]);
addPoint(["Minnesota", "Minn."], [46.0, -94.0]);
addPoint(["Iowa"], [42.0, -93.5]);
addPoint(["Missouri", "Mo."], [38.5, -92.5]);
addPoint(["Arkansas", "Ark."], [34.8, -92.2]);
addPoint(["Oklahoma", "Okla."], [35.5, -97.5]);
addPoint(["Texas", "Tex."], [31.0, -100.0]);
addPoint(["Kansas", "Kans."], [38.5, -98.0]);
addPoint(["Nebraska", "Nebr."], [41.5, -99.8]);
addPoint(["South Dakota", "SD."], [44.5, -100.0]);
addPoint(["North Dakota", "ND."], [47.5, -100.0]);
addPoint(["Montana"], [47.0, -110.0]);
addPoint(["Wyoming", "Wyo."], [43.0, -107.5]);
addPoint(["Colorado", "Colo."], [39.0, -105.5]);
addPoint(["New Mexico", "NM."], [34.5, -106.0]);
addPoint(["Arizona", "Ariz."], [34.2, -111.7]);
addPoint(["Utah"], [39.3, -111.7]);
addPoint(["Nevada", "Nev."], [39.3, -116.6]);
addPoint(["Idaho"], [44.5, -114.5]);
addPoint(["Oregon", "Ore."], [44.0, -120.5]);
addPoint(["Washington", "Wash."], [47.4, -120.5]);
addPoint(["California", "Ca.", "Calif."], [37.0, -120.0]);
addPoint(["Alaska"], [64.0, -150.0]);
addPoint(["Chiapas"], [16.5, -92.5]);
addPoint(["Oaxaca"], [17.0, -96.5]);
addPoint(["Veracruz"], [19.0, -96.5]);
addPoint(["Guerrero"], [17.5, -99.5]);
addPoint(["Michoacan"], [19.2, -101.8]);
addPoint(["Jalisco"], [20.5, -103.5]);
addPoint(["Baja California"], [30.0, -115.0]);
addPoint(["Sonora"], [29.0, -110.0]);
addPoint(["Buenos Aires"], [-36.0, -60.0]);
addPoint(["Rio Negro"], [-40.0, -67.0]);
addPoint(["Santa Cruz"], [-48.0, -70.0]);
addPoint(["Tierra del Fuego"], [-54.0, -68.5]);
addPoint(["Misiones"], [-27.0, -55.0]);
addPoint(["Corrientes"], [-29.0, -58.0]);
addPoint(["Entre Rios"], [-32.0, -59.0]);
addPoint(["Cerro de la Neblina"], [0.8, -66.0]);
addPoint(["Gran Sabana"], [5.0, -61.0]);
addPoint(["Serra do Sol"], [5.0, -60.5]);
addPoint(["Mount Roraima", "Mt. Roraima", "Mt.Roraima"], [5.1, -60.8]);
addPoint(["Guayana Highlands", "Guiana Highlands"], [5.5, -61.0]);
addPoint(["Upper Guinea"], [10.0, -5.0]);
addPoint(["Congo"], [-2.0, 23.0]);
addPoint(["Zambezi"], [-15.0, 27.0]);
addPoint(["Sahel"], [15.0, 0.0]);
addPoint(["Sudan"], [15.0, 30.0]);
addPoint(["Central Europe"], [49.0, 12.0]);
addPoint(["Atlantic Europe"], [48.0, -3.0]);
addPoint(["Mediterranean"], [40.0, 10.0]);
addPoint(["Pontus Euxinus"], [44.0, 34.0]);
addPoint(["Caucasus"], [42.0, 44.0]);
addPoint(["Liguria-Tyrrhenia"], [44.0, 10.0]);
addPoint(["Adriatic"], [43.0, 15.0]);
addPoint(["East Mediterranean"], [36.0, 28.0]);
addPoint(["Turania or Aralo-Caspia"], [44.0, 60.0]);
addPoint(["Eastern Europe"], [52.0, 30.0]);
addPoint(["Northern Europe"], [62.0, 15.0]);

function stripDirection(value) {
  return String(value)
    .replace(/^\s*\?+\s*/, "")
    .replace(/^(N\s*&\s*E|W\s*&\s*C|W\s*&\s*N|N\s*&\s*W|N\s*&\s*C|E\s*&\s*N|NE|NW|SE|SW|N|S|E|W|C)\s+/i, "")
    .replace(/^N\.\s*/i, "")
    .replace(/^S\.\s*/i, "")
    .replace(/^E\.\s*/i, "")
    .replace(/^W\.\s*/i, "")
    .replace(/^C\.\s*/i, "")
    .trim();
}

function matchCountry(value) {
  if (!value) return null;
  const clean = String(value).replace(/\)+$/g, "").trim();
  for (const candidate of [clean, stripDirection(clean)]) {
    const key =
      countryLookup.get(normKey(candidate)) ||
      countryLookup.get(compactKey(candidate));
    if (key) return key;
  }
  return null;
}

function makeCountryPoint(countryKey, extra = {}) {
  const coords = locations.countries?.[countryKey];
  if (!coords) return null;
  const meta = locations.countryMeta?.[countryKey];
  return {
    lat: round(coords[0]),
    lon: round(coords[1]),
    label: meta?.canonical || countryKey,
    kind: "country",
    country: meta?.canonical || countryKey,
    continent: continentForCountry(countryKey),
    ...extra,
  };
}

function makeRegionPoint(regionKey) {
  const coords = locations.regions?.[regionKey];
  if (!coords) return null;
  return {
    lat: round(coords[0]),
    lon: round(coords[1]),
    label: regionKey,
    kind: "region",
    continent: continentForRegion(regionKey),
  };
}

function makeDetailPoint(label, coords, parentCountry, extra = {}) {
  const fixedLabel = cleanDetailLabel(label);
  return {
    lat: round(coords[0]),
    lon: round(coords[1]),
    label: fixedLabel,
    kind: "locality",
    country: parentCountry,
    continent: continentForCountry(parentCountry),
    ...extra,
  };
}

const DETAIL_LABEL_FIXES = {
  "nguin": "New Guinea",
  "n guin": "New Guinea",
  "guin": "New Guinea",
  "new guinea": "New Guinea",
  "spaulo": "São Paulo",
  "s paulo": "São Paulo",
  "sao paulo": "São Paulo",
  "minas gerais": "Minas Gerais",
  "espirito santo": "Espírito Santo",
  "mato grosso": "Mato Grosso",
  "rio grande do sul": "Rio Grande do Sul",
  "santa catarina": "Santa Catarina",
  "siberia": "Siberia",
  "e siberia": "Eastern Siberia",
  "w siberia": "Western Siberia",
  "c siberia": "Central Siberia",
  "se siberia": "South-eastern Siberia",
  "kamchatka": "Kamchatka",
  "kamtchatka": "Kamchatka",
  "kuriles": "Kuril Islands",
  "kurile is": "Kuril Islands",
  "galapagos": "Galápagos Islands",
  "galapagos is": "Galápagos Islands",
  "hawaiian is": "Hawaiian Islands",
  "canary is": "Canary Islands",
  "society is": "Society Islands",
  "aru is": "Aru Islands",
  "waigeo is": "Waigeo Island",
  "andaman is": "Andaman Islands",
  "andamanes": "Andaman Islands",
  "nicobar is": "Nicobar Islands",
  "lesser sunda is": "Lesser Sunda Islands",
  "lesser sunda": "Lesser Sunda Islands",
  "new caledonia": "New Caledonia",
  "northwest territories": "Northwest Territories",
  "prince edward island": "Prince Edward Island",
  "british columbia": "British Columbia",
  "new hampshire": "New Hampshire",
  "new jersey": "New Jersey",
  "new mexico": "New Mexico",
  "new york": "New York",
  "north carolina": "North Carolina",
  "north dakota": "North Dakota",
  "rhode island": "Rhode Island",
  "south carolina": "South Carolina",
  "south dakota": "South Dakota",
  "west virginia": "West Virginia",
  "baja california": "Baja California",
  "tierra del fuego": "Tierra del Fuego",
  "entre rios": "Entre Ríos",
  "cerro de la neblina": "Cerro de la Neblina",
  "serra do sol": "Serra do Sol",
  "mount roraima": "Mount Roraima",
  "mt roraima": "Mount Roraima",
  "guayana highlands": "Guayana Highlands",
  "guiana highlands": "Guiana Highlands",
  "upper guinea": "Upper Guinea",
  "central europe": "Central Europe",
  "atlantic europe": "Atlantic Europe",
  "pontus euxinus": "Pontus Euxinus",
  "liguria tyrrhenia": "Liguria-Tyrrhenia",
  "east mediterranean": "East Mediterranean",
  "turania or aralo caspia": "Turania or Aralo-Caspia",
  "eastern europe": "Eastern Europe",
  "northern europe": "Northern Europe",
};

function cleanDetailLabel(label) {
  const key = compactKey(label);
  if (DETAIL_LABEL_FIXES[key]) return DETAIL_LABEL_FIXES[key];
  let value = String(label)
    .replace(/\s+/g, " ")
    .replace(/^Mt\.?\s*/i, "Mount ")
    .replace(/^N\.\s*/i, "New ")
    .trim();
  if (/^[a-z]/.test(value)) value = titleCase(value);
  return value;
}

function parseCountryEntry(raw) {
  const original = String(raw || "").trim();
  if (!original) return null;

  const introduced = /introd/i.test(original);
  const uncertain = original.startsWith("?") || /\?/.test(original);

  if (/introd\.\s*in\s*LK/i.test(original)) {
    return {
      country: "Sri Lanka",
      countryKey: matchCountry("Sri Lanka"),
      points: [makeCountryPoint(matchCountry("Sri Lanka"), { introduced, uncertain })].filter(Boolean),
      region: null,
      introduced,
      uncertain,
    };
  }

  // Exact region matches (for example "NW Australia", "N United States of America")
  const cleanedOriginal = original
    .replace(/^\?+/, "")
    .replace(/\(\|\)/g, "")
    .replace(/\|/g, "")
    .trim();
  const regionKey = regionLookup.get(normKey(cleanedOriginal));
  if (regionKey) {
    const inferred = countryFromRegion(regionKey);
    return {
      country: inferred?.canonical || null,
      countryKey: inferred?.key || null,
      region: regionKey,
      points: [makeRegionPoint(regionKey)].filter(Boolean),
      introduced,
      uncertain,
    };
  }

  // Separate a parenthetical detail list from the base country.
  let working = original
    .replace(/^\?+/, "")
    .replace(/\(\|\)/g, "")
    .replace(/\|/g, "")
    .replace(/\((?:introd\.?[^)]*)\)/gi, "")
    .trim();
  let details = [];
  const open = working.indexOf("(");
  if (open !== -1) {
    const close = working.lastIndexOf(")");
    if (close > open) {
      details = working
        .slice(open + 1, close)
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
      working = `${working.slice(0, open)} ${working.slice(close + 1)}`.trim();
    }
  }

  const baseRegionKey = regionLookup.get(normKey(working));
  if (baseRegionKey) {
    const inferred = countryFromRegion(baseRegionKey);
    return {
      country: inferred?.canonical || null,
      countryKey: inferred?.key || null,
      region: baseRegionKey,
      points: [makeRegionPoint(baseRegionKey)].filter(Boolean),
      introduced,
      uncertain,
    };
  }

  const countryKey =
    matchCountry(working) ||
    matchCountry(stripDirection(working)) ||
    matchCountry(baseRegionKey || "");

  if (!countryKey) {
    return {
      country: null,
      countryKey: null,
      region: null,
      points: [],
      introduced,
      uncertain,
      unmatched: original,
    };
  }

  const meta = locations.countryMeta?.[countryKey];
  const countryName = meta?.canonical || countryKey;
  const points = [];

  // Try to resolve parenthetical details to islands, states or provinces.
  for (const rawDetail of details) {
    const detail = stripDirection(rawDetail.replace(/^\?+/, "").trim());
    const keys = [compactKey(detail), compactKey(rawDetail)];
    for (const key of keys) {
      if (DETAIL_POINTS.has(key)) {
        const point = DETAIL_POINTS.get(key);
        points.push(makeDetailPoint(detail, point, countryKey));
        break;
      }
      const provinceKey = provinceLookup.get(normKey(detail));
      if (provinceKey) {
        const coords = locations.provinces[provinceKey];
        points.push(makeDetailPoint(provinceKey, coords, countryKey));
        break;
      }
    }
  }

  if (!points.length) {
    const point = makeCountryPoint(countryKey);
    if (point) points.push(point);
  }

  return {
    country: countryName,
    countryKey,
    region: null,
    points,
    introduced,
    uncertain,
    details,
  };
}

/* ------------------------------------------------------------------ */
/* Care group inference                                                */
/* ------------------------------------------------------------------ */

const BYBLIS_GROUPS = {
  "Byblis aquatica": "annual",
  "Byblis filifolia": "annual",
  "Byblis guehoi": "annual",
  "Byblis liniflora": "annual",
  "Byblis pilbarana": "annual",
  "Byblis rorida": "annual",
  "Byblis gigantea": "perennial",
  "Byblis lamellata": "perennial",
};

const DROSERA_TEMPERATE = new Set([
  "Drosera anglica",
  "Drosera arcturi",
  "Drosera communis",
  "Drosera filiformis",
  "Drosera intermedia",
  "Drosera linearis",
  "Drosera rotundifolia",
  "Drosera tracyi",
  "Drosera stenopetala",
  "Drosera uniflora",
]);

const DROSERA_CAPE = new Set([
  "Drosera acaulis",
  "Drosera afra",
  "Drosera alba",
  "Drosera cistiflora",
  "Drosera cuneifolia",
  "Drosera hilaris",
  "Drosera pauciflora",
  "Drosera trinervia",
]);

const DROSERA_ANNUAL_SECTIONS = new Set([
  "Arachnopus",
  "Coelophylla",
  "Thelocalyx",
]);

const NEPENTHES_LOWLAND = new Set([
  "Nepenthes adnata",
  "Nepenthes albomarginata",
  "Nepenthes ampullaria",
  "Nepenthes bicalcarata",
  "Nepenthes gracilis",
  "Nepenthes hirsuta",
  "Nepenthes krabiensis",
  "Nepenthes madagascariensis",
  "Nepenthes mirabilis",
  "Nepenthes northiana",
  "Nepenthes parvula",
  "Nepenthes pervillei",
  "Nepenthes rafflesiana",
  "Nepenthes reinwardtiana",
  "Nepenthes rowaniae",
  "Nepenthes tenax",
  "Nepenthes thorelii",
  "Nepenthes tomoriana",
  "Nepenthes vieillardii",
]);

const NEPENTHES_HIGHLAND = new Set([
  "Nepenthes aristolochioides",
  "Nepenthes attenboroughii",
  "Nepenthes boschiana",
  "Nepenthes burbidgeae",
  "Nepenthes clipeata",
  "Nepenthes diabolica",
  "Nepenthes dubia",
  "Nepenthes edwardsiana",
  "Nepenthes fusca",
  "Nepenthes glabrata",
  "Nepenthes hamata",
  "Nepenthes inermis",
  "Nepenthes jamban",
  "Nepenthes kampalili",
  "Nepenthes lamii",
  "Nepenthes lowii",
  "Nepenthes macrophylla",
  "Nepenthes maagnawense",
  "Nepenthes monticola",
  "Nepenthes nebularum",
  "Nepenthes rajah",
  "Nepenthes sanguinea",
  "Nepenthes singalana",
  "Nepenthes spathulata",
  "Nepenthes spectabilis",
  "Nepenthes veitchii",
  "Nepenthes villosa",
  "Nepenthes candalaga",
]);

const UTRICULARIA_AQUATIC = new Set([
  "Utricularia aurea",
  "Utricularia australis",
  "Utricularia benjaminiana",
  "Utricularia biloba",
  "Utricularia foliosa",
  "Utricularia gibba",
  "Utricularia hydrocarpa",
  "Utricularia inflata",
  "Utricularia intermedia",
  "Utricularia macrorhiza",
  "Utricularia minor",
  "Utricularia myriocista",
  "Utricularia naviculata",
  "Utricularia olivacea",
  "Utricularia purpurea",
  "Utricularia radiata",
  "Utricularia reflexa",
  "Utricularia resupinata",
  "Utricularia stellaris",
  "Utricularia vulgaris",
]);

const UTRICULARIA_EPIPHYTIC = new Set([
  "Utricularia alpina",
  "Utricularia buntingiana",
  "Utricularia campbelliana",
  "Utricularia humboldtii",
  "Utricularia jamesoniana",
  "Utricularia nelumbifolia",
  "Utricularia praetermissa",
  "Utricularia quelchii",
  "Utricularia unifolia",
]);

function inferCareGroup(record, genus, note) {
  if (note?.careGroup && CARE_GROUPS[note.careGroup]) return note.careGroup;
  if (record.provisional && record.careGroup && CARE_GROUPS[record.careGroup]) {
    return record.careGroup;
  }

  const name = record.name;
  const classification = record.classification || "";
  const countries = record.countries || [];

  switch (record.genus) {
    case "Dionaea":
    case "Sarracenia":
    case "Darlingtonia":
      return "temperate";
    case "Aldrovanda":
      return "aquatic";
    case "Cephalotus":
    case "Drosophyllum":
    case "Roridula":
      return "mediterranean";
    case "Heliamphora":
      return "highland";
    case "Byblis":
      return BYBLIS_GROUPS[name] || null;
    case "Drosera": {
      if (
        /Subgenus Bryastrum|Section Bryastrum|Section Lamprolepis|Section Oosperma/i.test(
          classification
        )
      ) {
        return "pygmy";
      }
      if (/Subgenus Ergaleium/i.test(classification)) return "tuberous";
      if (/Subgenus Lasiocephala|Section Lasiocephala/i.test(classification)) {
        return "petiolaris";
      }
      const section = /Section ([^ -].*)$/i.exec(classification)?.[1]?.trim();
      if (section && DROSERA_ANNUAL_SECTIONS.has(section)) return "annual";
      if (DROSERA_TEMPERATE.has(name)) return "temperate";
      if (DROSERA_CAPE.has(name)) return "cape";
      return "subtropical";
    }
    case "Pinguicula": {
      if (
        countries.some((c) =>
          /Mexico|Guatemala|Belize|Honduras|El Salvador|Nicaragua|Costa Rica|Panama/i.test(c)
        )
      ) {
        return "mexican";
      }
      if (
        countries.some((c) =>
          /Colombia|Venezuela|Ecuador|Peru|Bolivia|Brazil|Guyana|Suriname|French Guiana|Cuba|Jamaica|Dominican|Haiti|Puerto Rico|Trinidad/i.test(
            c
          )
        )
      ) {
        return "tropical";
      }
      return "temperate";
    }
    case "Nepenthes": {
      if (NEPENTHES_LOWLAND.has(name)) return "lowland";
      if (NEPENTHES_HIGHLAND.has(name)) return "highland";
      return "intermediate";
    }
    case "Utricularia": {
      if (UTRICULARIA_AQUATIC.has(name)) return "aquatic";
      if (UTRICULARIA_EPIPHYTIC.has(name)) return "epiphytic";
      const section = /Section ([^ -].*)$/i.exec(classification)?.[1]?.trim();
      if (section && /Orchidioides|Iperua/i.test(section)) return "epiphytic";
      return "terrestrial";
    }
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* IUCN normalization                                                  */
/* ------------------------------------------------------------------ */

function normalizeRedList(raw) {
  const value = cleanText(raw).toUpperCase();
  if (!value) {
    return { code: "NE", label: "Not assessed", tone: "ne", raw: "" };
  }
  const legacy = value.match(/^LR\s*\(([^)]+)\)/);
  if (legacy) {
    const category = legacy[1].toLowerCase();
    if (category === "lc") {
      return { code: "LC", label: "Lower Risk (least concern)", tone: "lc", raw };
    }
    if (category === "nt") {
      return { code: "NT", label: "Lower Risk (near threatened)", tone: "nt", raw };
    }
    if (category === "cd") {
      return { code: "LR cd", label: "Lower Risk (conservation dependent)", tone: "nt", raw };
    }
    return { code: "LR", label: "Lower Risk", tone: "lc", raw };
  }
  if (value.startsWith("CR")) {
    return { code: "CR", label: "Critically Endangered", tone: "cr", raw };
  }
  if (value.startsWith("EN")) {
    return { code: "EN", label: "Endangered", tone: "en", raw };
  }
  if (value.startsWith("VU")) {
    return { code: "VU", label: "Vulnerable", tone: "vu", raw };
  }
  if (value.startsWith("NT")) {
    return { code: "NT", label: "Near Threatened", tone: "nt", raw };
  }
  if (value.startsWith("LC")) {
    return { code: "LC", label: "Least Concern", tone: "lc", raw };
  }
  if (value.startsWith("DD")) {
    return { code: "DD", label: "Data Deficient", tone: "dd", raw };
  }
  if (value.startsWith("EW")) {
    return { code: "EW", label: "Extinct in the Wild", tone: "cr", raw };
  }
  if (value.startsWith("EX")) {
    return { code: "EX", label: "Extinct", tone: "cr", raw };
  }
  return { code: value.slice(0, 8), label: raw, tone: "ne", raw };
}

/* ------------------------------------------------------------------ */
/* Taxonomy helpers                                                    */
/* ------------------------------------------------------------------ */

function parseTaxonomy(classification) {
  const parts = String(classification || "")
    .split(" - ")
    .map((p) => p.trim())
    .filter(Boolean);
  const find = (prefix) => {
    const part = parts.find((p) => p.toLowerCase().startsWith(prefix.toLowerCase()));
    return part ? part.slice(prefix.length).trim() : "";
  };
  return {
    subgenus: find("Subgenus "),
    section: find("Section "),
    order: find("Order "),
    subclass: find("Subclass "),
    parts,
  };
}

function cleanTypeLocality(value) {
  const text = cleanText(value);
  if (!text) return "";
  return text.length > 260 ? `${text.slice(0, 257)}…` : text;
}

function deriveEpithet(name) {
  const parts = String(name).split(" ");
  if (parts[1] === "×") return parts.slice(2).join(" ");
  return parts.slice(1).join(" ");
}

function makeProvisionalRecord(taxon) {
  const genus = GENERA.get(taxon.genus);
  return {
    genus: taxon.genus,
    name: taxon.name,
    epithet: deriveEpithet(taxon.name),
    authors: taxon.authors || "",
    rank: "species",
    rankLabel: "",
    infraspecific: "",
    hybrid: false,
    fullName: `${taxon.name} ${taxon.authors || ""}`.trim(),
    status: taxon.status || "Published, pending ICPS inclusion",
    publication: taxon.publication || "",
    year: taxon.year || null,
    typeLocality: taxon.typeLocality || "",
    countries: taxon.countries || [],
    provinces: taxon.provinces || [],
    redList: taxon.redList || "",
    classification: taxon.classification || "",
    family: taxon.family || genus?.family || "",
    synonym: "",
    basionym: "",
    comment: "",
    parentFormula: [],
    source: taxon.sourceLinks?.[0]?.url || "",
    infraspecificTaxa: [],
    provisional: true,
    careGroup: taxon.careGroup || null,
    watchlist: taxon,
  };
}

/* ------------------------------------------------------------------ */
/* Merge records                                                       */
/* ------------------------------------------------------------------ */

const allRecords = [
  ...icps.species.map((record) => ({ ...record, provisional: false })),
  ...(watchDoc.taxa || []).map(makeProvisionalRecord),
];

const idCounts = new Map();
const species = [];

for (const record of allRecords) {
  const genus = GENERA.get(record.genus);
  if (!genus) {
    console.warn(`Skipping ${record.name}: no genus profile`);
    continue;
  }

  const note = NOTES[record.name] || null;
  const watch = record.watchlist || WATCH.get(record.name) || null;
  const credit = CREDITS.get(record.name) || null;
  const taxonomy = parseTaxonomy(record.classification);
  const careGroupKey = inferCareGroup(record, genus, note);
  const careGroup = careGroupKey ? CARE_GROUPS[careGroupKey] : null;

  const countryEntries = (record.countries || [])
    .map(parseCountryEntry)
    .filter(Boolean);

  const nativeEntries = countryEntries.filter((entry) => !entry.introduced);
  const rangeEntries = nativeEntries.length ? nativeEntries : countryEntries;

  const nativeCountries = unique(
    rangeEntries.map((entry) => entry.country).filter(Boolean)
  ).sort((a, b) => a.localeCompare(b));
  const nativeRegions = unique(
    rangeEntries.map((entry) => entry.region).filter(Boolean)
  ).sort((a, b) => a.localeCompare(b));
  const introducedCountries = unique(
    countryEntries
      .filter((entry) => entry.introduced && entry.country)
      .map((entry) => entry.country)
  ).sort((a, b) => a.localeCompare(b));

  const primaryCountry =
    rangeEntries.find((entry) => entry.country)?.country || nativeCountries[0] || "";

  const points = [];
  const pointSeen = new Set();
  for (const entry of countryEntries) {
    for (const point of entry.points) {
      const key = `${point.lat}|${point.lon}|${point.label}`;
      if (pointSeen.has(key)) continue;
      pointSeen.add(key);
      points.push({
        ...point,
        introduced: entry.introduced || undefined,
        uncertain: entry.uncertain || undefined,
      });
    }
  }

  // Keep the map readable: prefer detail points, then regions, then countries.
  const orderedPoints = points
    .sort((a, b) => {
      const rank = { locality: 0, region: 1, country: 2 };
      return (rank[a.kind] ?? 3) - (rank[b.kind] ?? 3);
    })
    .slice(0, 60);

  const continents = unique(
    [
      ...nativeCountries.map((country) => {
        const key = matchCountry(country);
        return key ? continentForCountry(key) : null;
      }),
      ...nativeRegions.map(continentForRegion),
      ...orderedPoints
        .filter((point) => !point.introduced || !rangeEntries.length)
        .map((point) => point.continent),
    ].filter(Boolean)
  ).sort((a, b) => a.localeCompare(b));

  const displayRegions = nativeRegions.filter((region) => {
    const inferred = countryFromRegion(region);
    return !inferred || !nativeCountries.includes(inferred.canonical);
  });

  const nativeRange = (() => {
    const parts = [];
    if (nativeCountries.length > 8) {
      parts.push(
        `Widespread across ${continents.join(", ")} (${nativeCountries.length} countries/territories)`
      );
    } else if (nativeCountries.length) {
      parts.push(nativeCountries.join(", "));
    }
    if (displayRegions.length) {
      const shown = displayRegions.slice(0, 4);
      parts.push(
        shown.join(", ") +
          (displayRegions.length > shown.length
            ? ` and ${displayRegions.length - shown.length} more regions`
            : "")
      );
    }
    return parts.length ? parts.join("; ") : "";
  })();

  const nativeShort =
    nativeCountries.length === 1
      ? nativeCountries[0]
      : nativeCountries.length > 1 && nativeCountries.length <= 4
        ? nativeCountries.join(", ")
        : nativeCountries.length > 4
          ? `${continents.slice(0, 4).join(", ")}${
              continents.length > 4
                ? ` and ${continents.length - 4} more`
                : nativeCountries.length > 4
                  ? " (widespread)"
                  : ""
            }`
          : displayRegions.length
            ? displayRegions[0]
            : genus.nativeShort;

  const iucn = normalizeRedList(record.redList || watch?.redList || "");
  const commonName = note?.commonName || watch?.commonName || null;

  const summary =
    note?.summary ||
    watch?.summary ||
    `${record.name} is a ${genus.trapType.toLowerCase()} carnivore from ${
      nativeShort || genus.nativeShort
    }, described by ${record.authors || "its author"} in ${
      record.year || "the taxonomic literature"
    }.`;

  const genusDescription = cleanText(genus.description)
    .split(". ")
    .slice(0, 2)
    .join(". ");
  const generatedDescription = [
    `${record.name} is a member of the ${genus.commonName.toLowerCase()} genus ${record.genus} (family ${record.family}).`,
    genusDescription
      ? `${genusDescription}${genusDescription.endsWith(".") ? "" : "."}`
      : "",
    record.authors
      ? `It was described by ${record.authors}${record.year ? ` in ${record.year}` : ""}.`
      : "",
    nativeRange
      ? `The ICPS snapshot records it from ${nativeRange}.`
      : "Its native range is not recorded in the ICPS snapshot.",
    record.typeLocality
      ? `The type locality is ${cleanTypeLocality(record.typeLocality)}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const description = note?.description || watch?.description || generatedDescription;
  const careNotes =
    note?.careNotes ||
    watch?.careNotes ||
    (careGroup
      ? `This species is placed in the ${careGroup.label} care group. ${careGroup.tagline} See the care sheet below for the full routine.`
      : `No specialist care group is assigned. Follow the ${record.genus} genus care sheet and adjust for the species' native climate.`);

  const tags = unique([
    ...(note?.tags || watch?.tags || []),
    record.hybrid ? "natural hybrid" : "",
    record.provisional ? "watchlist" : "",
  ]).slice(0, 7);

  const sourceLinks = [];
  const addLink = (label, url) => {
    if (!url) return;
    if (sourceLinks.some((link) => link.url === url)) return;
    sourceLinks.push({ label, url });
  };
  if (watch?.sourceLinks) {
    for (const link of watch.sourceLinks) addLink(link.label, link.url);
  }
  if (note?.sourceLinks) {
    for (const link of note.sourceLinks) addLink(link.label, link.url);
  }
  addLink("ICPS record", record.source || `https://cpnames.carnivorousplants.org/?name=${encodeURIComponent(record.name)}`);

  const idBase = slugify(record.name);
  const idCount = idCounts.get(idBase) || 0;
  idCounts.set(idBase, idCount + 1);
  const id = idCount ? `${idBase}-${idCount + 1}` : idBase;

  const featured = Boolean(note?.featured);
  const photo = credit
    ? {
        path: credit.file,
        artist: credit.artist,
        credit: credit.credit,
        license: credit.license,
        licenseUrl: credit.licenseUrl,
        source: credit.source,
        original: credit.original,
        description: credit.description,
        alt: credit.description || `Photograph of ${record.name}`,
      }
    : null;

  const publications = record.publication || "";
  const taxonomyParts = taxonomy.parts;
  const infraspecificTaxa = (record.infraspecificTaxa || []).map((taxon) => ({
    ...taxon,
    fullName: taxon.fullName || taxon.name,
  }));

  const searchText = [
    record.name,
    commonName,
    record.fullName,
    record.authors,
    record.year,
    record.family,
    record.genus,
    genus.commonName,
    genus.trapType,
    record.status,
    nativeCountries.join(" "),
    nativeRegions.join(" "),
    tags.join(" "),
    summary,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  species.push({
    id,
    genus: record.genus,
    name: record.name,
    epithet: record.epithet || deriveEpithet(record.name),
    authors: record.authors || "",
    year: record.year || null,
    fullName: record.fullName || `${record.name} ${record.authors || ""}`.trim(),
    rank: record.rank || "species",
    rankLabel: record.rankLabel || "",
    hybrid: Boolean(record.hybrid),
    status: record.status || "Accepted",
    provisional: Boolean(record.provisional),
    watchlist: Boolean(record.provisional),
    family: record.family || genus.family,
    classification: record.classification || "",
    taxonomy: taxonomyParts,
    subgenus: taxonomy.subgenus,
    section: taxonomy.section,
    publication: publications,
    typeLocality: cleanTypeLocality(record.typeLocality),
    commonName,
    commonNameIsGenus: !commonName,
    genusCommonName: genus.commonName,
    summary,
    description,
    etymology: note?.etymology || watch?.etymology || "",
    discoveredBy: note?.discoveredBy || watch?.discoveredBy || "",
    careGroup: careGroupKey,
    careGroupLabel: careGroup?.label || "",
    careGroupTagline: careGroup?.tagline || "",
    careNotes,
    careDifficulty: careGroup?.difficulty || genus.difficulty,
    careDifficultyLevel: careGroup?.difficultyLevel || genus.difficultyLevel,
    difficulty: genus.difficulty,
    difficultyLevel: genus.difficultyLevel,
    trapType: genus.trapType,
    trapGroup: genus.trapGroup,
    carnivory: genus.carnivory,
    featured,
    hasPhoto: Boolean(photo),
    hasEditorialNote: Boolean(note),
    photo,
    illustration: genus.illustration,
    image: photo?.path || genus.illustration,
    imageType: photo ? "photo" : "illustration",
    iucn,
    conservationNote: note?.conservationNote || watch?.conservationNote || "",
    nativeCountries,
    nativeRegions,
    primaryCountry,
    introducedCountries,
    nativeRange:
      nativeRange ||
      `No country-level distribution is recorded in the ICPS snapshot; see the genus profile for the broader range.`,
    nativeShort,
    continents,
    originPoints: orderedPoints,
    tags,
    infraspecificTaxa,
    infraspecificCount: infraspecificTaxa.length,
    sourceLinks,
    icpsUrl: record.source || "",
    searchText,
    accent: genus.accent,
    added: record.provisional ? "2026-11-09" : "2026-11-09",
    sortYear: record.year || 0,
  });
}

species.sort((a, b) =>
  a.name.localeCompare(b.name, "en", { sensitivity: "base" })
);

/* ------------------------------------------------------------------ */
/* Genus and global aggregates                                         */
/* ------------------------------------------------------------------ */

const genera = generaDoc.genera.map((genus) => {
  const members = species.filter((s) => s.genus === genus.genus);
  const accepted = members.filter((s) => !s.provisional);
  const featured = members.filter((s) => s.featured);
  const photos = members.filter((s) => s.hasPhoto);
  const watch = members.filter((s) => s.provisional);
  const continents = unique(members.flatMap((s) => s.continents));
  const careGroups = unique(
    members.map((s) => s.careGroup).filter(Boolean)
  );
  return {
    ...genus,
    speciesCount: members.length,
    acceptedCount: accepted.length,
    hybridCount: members.filter((s) => s.hybrid).length,
    featuredCount: featured.length,
    photoCount: photos.length,
    watchlistCount: watch.length,
    infraspecificCount: members.reduce(
      (total, s) => total + s.infraspecificCount,
      0
    ),
    continents,
    careGroupKeys: careGroups,
    exampleSpecies: featured.slice(0, 4).map((s) => s.id),
  };
});

const generaByName = new Map(genera.map((g) => [g.genus, g]));

const careGroups = Object.entries(CARE_GROUPS).map(([key, group]) => {
  const members = species.filter((s) => s.careGroup === key);
  return {
    key,
    ...group,
    speciesCount: members.length,
    genera: unique(members.map((s) => s.genus)),
    examples: members
      .filter((s) => s.featured || s.hasPhoto)
      .slice(0, 6)
      .map((s) => s.id),
  };
});
const careGroupsByKey = new Map(careGroups.map((g) => [g.key, g]));

const familyCounts = Object.entries(
  species.reduce((acc, s) => {
    acc[s.family] = (acc[s.family] || 0) + 1;
    return acc;
  }, {})
)
  .map(([family, count]) => ({ family, count }))
  .sort((a, b) => b.count - a.count);

const continentCounts = Object.entries(
  species.reduce((acc, s) => {
    for (const continent of s.continents) {
      acc[continent] = (acc[continent] || 0) + 1;
    }
    return acc;
  }, {})
)
  .map(([continent, count]) => ({ continent, count }))
  .sort((a, b) => b.count - a.count);

const trapCounts = Object.entries(
  species.reduce((acc, s) => {
    const key = s.trapGroup || "other";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})
)
  .map(([trap, count]) => ({ trap, count }))
  .sort((a, b) => b.count - a.count);

const difficultyCounts = Object.entries(
  species.reduce((acc, s) => {
    acc[s.careDifficulty] = (acc[s.careDifficulty] || 0) + 1;
    return acc;
  }, {})
)
  .map(([difficulty, count]) => ({ difficulty, count }))
  .sort((a, b) => b.count - a.count);

const recentSpecies = species
  .filter((s) => s.year && s.year >= 2015)
  .sort((a, b) => b.year - a.year || a.name.localeCompare(b.name));

const featuredSpecies = species.filter((s) => s.featured);
const photoSpecies = species.filter((s) => s.hasPhoto && s.photo);
const watchlistSpecies = species.filter((s) => s.provisional);

const meta = {
  generated: new Date().toISOString(),
  icpsSnapshot: icps.generated,
  icpsSource: icps.source,
  icpsCount: icps.count,
  provisionalCount: watchlistSpecies.length,
  totalSpecies: species.length,
  genusCount: genera.length,
  familyCount: familyCounts.length,
  photoCount: photoSpecies.length,
  featuredCount: featuredSpecies.length,
  editorialNoteCount: species.filter((s) => s.hasEditorialNote).length,
  hybridCount: species.filter((s) => s.hybrid).length,
  infraspecificCount: species.reduce((total, s) => total + s.infraspecificCount, 0),
  countryCount: unique(species.flatMap((s) => s.nativeCountries)).length,
  recentCount: recentSpecies.length,
  mapPointCount: species.reduce((total, s) => total + s.originPoints.length, 0),
  watchlistUpdated: watchDoc.updated,
  changelogDate: changelog.generated,
  version: "1.0.0",
  title: "Plantivorous Carnivorous Plant Database",
};

const bundle = {
  meta,
  species,
  genera,
  careGroups,
  families: familyCounts,
  continents: continentCounts,
  traps: trapCounts,
  difficulties: difficultyCounts,
  featuredSpecies: featuredSpecies.map((s) => s.id),
  recentSpecies: recentSpecies.map((s) => s.id),
  watchlistSpecies: watchlistSpecies.map((s) => s.id),
  photoCredits: photoDoc.credits || [],
  changelog,
  watchlist: watchDoc,
  sources: {
    icps: "https://cpnames.carnivorousplants.org/",
    icpsAbout: "https://www.carnivorousplants.org/",
    powo: "https://powo.science.kew.org/",
    wikipedia: "https://www.wikipedia.org/",
    wikimedia: "https://commons.wikimedia.org/",
    naturalEarth: "https://www.naturalearthdata.com/",
  },
};

/* ------------------------------------------------------------------ */
/* Write outputs                                                       */
/* ------------------------------------------------------------------ */

await writeFile(
  join(DATA, "species.json"),
  JSON.stringify(bundle, null, 2),
  "utf8"
);

const js = `/* Generated by scripts/build-data.mjs — do not edit by hand. */\nwindow.PLANTIVOROUS = ${JSON.stringify(bundle)};\n`;
await writeFile(join(ROOT, "assets", "js", "data.js"), js, "utf8");

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

const unmatched = [];
for (const record of allRecords) {
  for (const raw of record.countries || []) {
    const entry = parseCountryEntry(raw);
    if (entry?.unmatched) unmatched.push(raw);
  }
}

console.log(`Species: ${species.length} (${icps.count} ICPS + ${watchlistSpecies.length} provisional)`);
console.log(`Genera: ${genera.length}; families: ${familyCounts.length}; photos: ${photoSpecies.length}`);
console.log(`Origin points: ${meta.mapPointCount}; countries: ${meta.countryCount}`);
console.log(`Featured: ${featuredSpecies.length}; editorial notes: ${meta.editorialNoteCount}`);
console.log(`Care groups assigned: ${species.filter((s) => s.careGroup).length}/${species.length}`);
console.log(`Unmatched country strings: ${unique(unmatched).length}`);
if (unmatched.length) {
  console.log(unique(unmatched).slice(0, 30).join("\n"));
}
console.log(`Wrote data/species.json and assets/js/data.js (${(Buffer.byteLength(js) / 1024 / 1024).toFixed(2)} MB)`);
