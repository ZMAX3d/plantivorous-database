#!/usr/bin/env node
/**
 * Build data/locations.json: country centroids, region centroids and continent
 * metadata used by the origin map and the continent filter.
 *
 * Country centroids come from the mledoze/countries dataset (ODbL).
 * The file is generated once and committed so the site has no build-time
 * dependency on a third-party API.
 *
 * Usage: node scripts/build-locations.mjs [path-to-countries.json]
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");
const countriesPath = process.argv[2];

const ALIASES = {
  "United States of America": "United States",
  "United Kingdom of Great Britain and Northern Ireland": "United Kingdom",
  "Russian Federation": "Russia",
  "Viet Nam": "Vietnam",
  "United Republic of Tanzania": "Tanzania",
  "Brunei Darussalam": "Brunei",
  "Lao People's Democratic Republic": "Laos",
  "Cote d'Ivoire": "Ivory Coast",
  "Swaziland": "Eswatini",
  Macedonia: "North Macedonia",
  Korea: "South Korea",
  Congo: "DR Congo",
  AN: "Curaçao",
  "Virgin Islands": "U.S. Virgin Islands",
  Turkey: "Türkiye",
  "United States of America)": "United States",
};

const REGIONS = {
  // Australia
  "N Australia": [-15.5, 133],
  "S Australia": [-35, 138.5],
  "E Australia": [-30, 150],
  "W Australia": [-25, 120],
  "SW Australia": [-33.5, 117],
  "NW Australia": [-20, 122],
  "NE Australia": [-20, 146],
  "SE Australia": [-36, 147],
  "N & E Australia": [-18, 140],
  // United States
  "N United States of America": [45, -100],
  "S United States of America": [32, -90],
  "E United States of America": [38, -78],
  "W United States of America": [40, -120],
  "NE United States of America": [43, -73],
  "NW United States of America": [45, -120],
  "SE United States of America": [33, -84],
  "W & N United States of America": [44, -113],
  "N & E United States of America": [43, -75],
  "W & C United States of America": [39, -100],
  // Russia / China / India
  "W Russian Federation": [58, 40],
  "W & C Russian Federation": [60, 80],
  "N China": [40, 110],
  "S China": [23, 110],
  "N India": [28, 78],
  "S India": [12, 78],
  "NE India": [26, 94],
  // Americas
  "N Brazil": [-3, -60],
  "S Canada": [45, -75],
  "SE Canada": [45, -65],
  "S Chile": [-45, -72],
  "S Argentina": [-45, -68],
  "N Philippines": [18, 121],
  "C Philippines": [12, 123],
  "S Philippines": [7, 124],
  // Europe / Asia / Africa
  "N Spain": [43, -4],
  "S Poland": [50, 20],
  "N Croatia": [46, 16],
  "N Myanmar": [25, 97],
  "NW Thailand": [18, 98],
  "E Kazakhstan": [49, 80],
  "N Zambia": [-10, 30],
  "NW Mozambique": [-12, 35],
};

const PROVINCES = {
  "Southwest Australia": [-33, 117],
  "North Australia": [-15, 134],
  "Guayana Highlands": [5.5, -61],
  "Central Brazilian Uplands": [-15, -48],
  "Mexican Highlands": [22, -102],
  Amazonia: [-5, -63],
  Borneo: [1, 114],
  Zambezi: [-15, 27],
  Sumatra: [0, 102],
  "Central America": [14, -86],
  Philippines: [12, 122],
  "West Indies": [18, -74],
  Queensland: [-22, 145],
  Parana: [-25, -51],
  "Atlantic and Gulf Coastal Plain": [32, -85],
  "Upper Guinea": [10, -5],
  Congo: [-2, 23],
  Moluccas: [-3, 128],
  "Southeast Australia": [-35, 148],
  "Nigeria-Cameroon": [7, 11],
  "Atlantic Brazil": [-15, -39],
  Malabar: [13, 75],
  "Eastern Madagascar": [-19, 49],
  Andamanes: [10, 94],
  "South Indochina": [10, 105],
  Malaya: [4, 102],
  Papua: [-6, 143],
  "Japan-Korea": [36, 138],
  "South Africa Cape": [-33, 20],
  Thailand: [15, 101],
  Deccan: [18, 77],
  Annam: [16, 107],
  Pampas: [-35, -62],
  Appalachians: [37, -82],
  Celebes: [-2, 121],
  "Northern Andes": [2, -76],
  "Central Andes": [-15, -70],
  "Canada incl. Great Lakes": [47, -84],
  "Central Europe": [49, 12],
  Sudan: [15, 30],
  "Ceylon/Sri Lanka": [7, 81],
  Tibet: [32, 88],
  "South China": [23, 112],
  "Atlantic Europe": [48, -3],
  Tasmania: [-42, 147],
  Taiwan: [23.7, 121],
  "Southeastern China": [26, 117],
  "Khasi-Manipur": [25, 93],
  "Tongoland-Pondoland": [-28, 31],
  Bengal: [23, 89],
  "South Malesia": [0, 115],
  "South Burma": [16, 96],
  "Eastern Himalaya": [27, 89],
  "North Indochina": [20, 102],
  "Central China": [30, 111],
  "Somalia-Ethiopia": [8, 42],
  Llanos: [7, -68],
  "Northern Europe": [58, 15],
  "Upper Gangetic Plain": [27, 80],
  Arctic: [70, 0],
  "Sakhalin-Hokkaido": [47, 143],
  "Sikang-Yunnan": [27, 100],
  Vancouver: [49.5, -123],
  "North American Prairies": [42, -100],
  Caatingas: [-8, -40],
  "Northern Burma": [24, 96],
  "Eastern Europe": [50, 30],
  "Altai-Sayan": [50, 90],
  "Central Siberia": [62, 100],
  Namaland: [-27, 18],
  Manchuria: [45, 128],
  "New Zealand North Is.": [-38, 175],
  Micronesia: [7, 150],
  "Illyria or Balkan": [44, 18],
  "Western Siberia": [58, 70],
  Transbaikalia: [52, 110],
  "Northeastern Siberia": [66, 150],
  "Okhotsk-Kamchatka": [58, 160],
  "Southwestern Mediterranean": [35, 0],
  Chaco: [-25, -60],
  "Pontus Euxinus": [43, 34],
  "New Zealand N South Is.": [-41, 173],
  "New Zealand S South Is.": [-45, 169],
  Iberia: [40, -4],
  "Liguria-Tyrrhenia": [43, 10],
  "East Mediterranean": [35, 30],
  "New Caledonia": [-21, 165],
  Sahel: [15, 0],
  "Northern China": [38, 110],
  "Rocky Mountains": [40, -108],
  Caucasus: [42, 44],
  Adriatic: [43, 16],
  "Zanzibar-Inhambane": [-8, 39],
  "Great Basin": [40, -117],
  Sindia: [26, 69],
  "South Mediterranean": [33, 10],
  California: [37, -120],
  Turkestan: [42, 68],
  "South Africa Cape (Cape)": [-33, 20],
  "Tongoland-Pondoland (Maputaland)": [-28, 31],
  "Amazônia": [-5, -63],
};

function normalise(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
}

async function main() {
  let countries;
  if (countriesPath) {
    countries = JSON.parse(await readFile(countriesPath, "utf8"));
  } else {
    const res = await fetch(
      "https://raw.githubusercontent.com/mledoze/countries/master/countries.json"
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    countries = await res.json();
  }

  const lookup = new Map();
  for (const c of countries) {
    for (const n of [c.name.common, c.name.official, ...(c.altSpellings || [])]) {
      lookup.set(normalise(n), c);
    }
  }

  const centroids = {};
  const meta = {};
  for (const [alias, target] of Object.entries(ALIASES)) {
    const c = lookup.get(normalise(target));
    if (c) {
      centroids[alias] = c.latlng;
      meta[alias] = { region: c.region, subregion: c.subregion, iso2: c.cca2, canonical: c.name.common };
    }
  }
  for (const c of countries) {
    centroids[c.name.common] = c.latlng;
    meta[c.name.common] = { region: c.region, subregion: c.subregion, iso2: c.cca2, canonical: c.name.common };
  }

  const out = {
    generated: new Date().toISOString(),
    source: "mledoze/countries (ODbL); centroids are approximate country centres",
    countries: centroids,
    countryMeta: meta,
    regions: REGIONS,
    provinces: PROVINCES,
  };
  await writeFile(join(DATA, "locations.json"), JSON.stringify(out, null, 2));
  console.log(
    `Wrote data/locations.json: ${Object.keys(centroids).length} country names, ${Object.keys(REGIONS).length} regions, ${Object.keys(PROVINCES).length} provinces`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
