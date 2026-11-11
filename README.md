# Plantivorous Carnivorous Plant Database

A portable, static, hash-routed single-page catalogue of the world's carnivorous plants, built to attach to the existing [Plantivorous](https://www.plantivorous.co.za) site. The theme matches Plantivorous: white base, IBM Plex Sans / Noto Sans, green accent `#2BA84A`, deep green `#467C45`, lime `#AACC44`, dark footer `#171717`, and a photo hero.

> **Status:** v1.0.0 — complete and browser-verified. No build step is required at runtime; the entire app is static HTML/CSS/JS and works from `file://` or any web host.

---

## What's inside

| Item | Count |
|------|-------|
| Accepted ICPS species & natural hybrids | 751 |
| Provisional watchlist taxa (primary literature, not yet in ICPS) | 9 |
| **Total catalogue records** | **760** |
| Genera | 21 |
| Families | 10 |
| Countries / territories mapped | 172 |
| Origin map points (approx. centroids) | 2,743 |
| Flagship species with Wikimedia Commons photos | 35 |
| Editorial species notes | ~39 |
| Cross-genus care groups | 17 |
| Infraspecific taxa | 86 |
| Natural hybrids | 9 |

Every record shows: discovery location, approximate native-range map, naming authority & year, description, photos / botanical plate, ICPS source link, and planting/care details (difficulty, light, water, soil, temperature, dormancy, feeding, propagation, problems, tips).

---

## Project structure

```
plantivorous-database/
├── index.html                    # Static SPA shell (header, footer, search modal)
├── assets/
│   ├── css/
│   │   ├── styles.css            # Base tokens, header, footer, buttons, search modal
│   │   ├── home.css              # Home page
│   │   ├── pages.css             # Database, species detail, lightbox, care, map
│   │   ├── more.css              # Genera, what's-new, about, favourites
│   │   └── responsive.css        # Breakpoints, mobile filters, print
│   ├── js/
│   │   ├── app.js                # SPA: router, views, search, lightbox, map, events
│   │   ├── data.js               # Browser-global bundle: 760 taxa, genera, care, map meta
│   │   └── world-map.js          # Custom SVG world map (Natural Earth 110m, 177 paths)
│   ├── fonts/                    # IBM Plex Sans & Noto Sans (variable, self-hosted)
│   └── img/                      # Species photos, genus plates, hero
├── data/
│   ├── species.json              # Merged dataset (build output)
│   ├── icps-species.json         # ICPS accepted snapshot (scrape-icps.mjs output)
│   ├── genera.json               # Editorial genus profiles
│   ├── species-notes.json        # Flagship species notes
│   ├── locations.json            # Country / region / province centroids
│   ├── photo-credits.json        # Wikimedia Commons photo credits & licences
│   ├── care-groups.json          # 17 cross-genus care guides
│   ├── watchlist.json            # 9 provisional taxa
│   └── changelog.json            # Monitoring timeline
└── scripts/
    ├── serve.mjs                 # Zero-dependency static preview server
    ├── build-data.mjs            # Merges all data into species.json + data.js
    ├── update-database.mjs       # Diffs ICPS snapshots, updates changelog, rebuilds
    ├── scrape-icps.mjs           # Captures the ICPS accepted-names snapshot
    ├── build-locations.mjs       # Origin centroids
    ├── build-map.mjs             # SVG world map geometry
    ├── fetch-photos.mjs          # Wikimedia Commons photos
    ├── generate-illustrations.mjs# Genus SVG plates
    └── diagnose.mjs              # Data sanity checks
```

---

## Local preview

No install step is needed beyond Node.js (for the preview server; the app itself has no dependencies).

```bash
# from the plantivorous-database folder
node scripts/serve.mjs 8123
```

Then open <http://localhost:8123/>. The server serves the project root with `no-cache`, so edits to CSS/JS take effect immediately on refresh.

The app is fully static, so you can also open `index.html` directly in a browser (`file://`). All asset references are relative and there are no `fetch()` or XHR calls; `history.replaceState` failures are silently ignored, which is the normal behaviour on `file://` in some browsers.

> Note: localStorage-based favourites work in normal `file://` browsing but may be cleared in private/incognito modes depending on the browser.

---

## Hash routes

| Route | What it shows |
|-------|---------------|
| `#/` | Home hero + featured genera |
| `#/database` | Searchable, filterable species browser (760 taxa) |
| `#/species/<id>` | Species detail: photo, map, authority, care, sources |
| `#/genera` | All 21 genus profiles |
| `#/genus/<name>` | Genus detail: member taxa, care, illustration plate |
| `#/map?genus=X&trap=Y&continent=Z&introduced=1` | Interactive SVG range map |
| `#/care` | 17 care-group index |
| `#/care/<key>` | Single care guide (e.g. `#/care/highland`) |
| `#/new` | What's new: watchlist, recent names, changelog, monitoring |
| `#/about` | About, sources & licences |
| `#/favourites` | Your saved taxa (localStorage only) |

Keyboard: `/` opens global search, `Esc` closes modals/panels, `Enter` activates map bubbles and search results.

---

## Data sources & licences

| Source | Use | Licence |
|--------|-----|---------|
| ICPS Carnivorous Plant Names Resource (`cpnames.carnivorousplants.org`) | Accepted names, authors, publication, countries | ICPS / public factual data |
| International Carnivorous Plant Society (`carnivorousplants.org`) | Society reference | — |
| Plants of the World Online (`powo.science.kew.org`) | Cross-reference | Kew / POWO terms |
| Wikipedia | Background reading & flagship context | CC BY-SA |
| Wikimedia Commons (`commons.wikimedia.org`) | 35 flagship species photos | CC BY-SA / CC BY / public domain (per-photo; attribution retained in-app) |
| Natural Earth | Country boundaries for the SVG map | Public domain |

Photos carry visible attribution (artist, licence, source link) on each species detail page and in search results. Original editorial descriptions and care profiles are Plantivorous content.

Taxa on the watchlist (e.g. *Drosera magnifica*) are accepted in the primary literature but not yet present in the ICPS snapshot; they are clearly marked "Provisional" and excluded from the 751-taxon ICPS count. They are promoted automatically when ICPS lists them.

> `plantivorous.co.za` is behind a bot challenge; the bundled assets are captured/local copies and are not re-fetched at runtime.

---

## Deployment & attachment to the existing site

The database is designed to be dropped into the Plantivorous site as a standalone section later:

1. Copy the whole `plantivorous-database/` folder (or just `index.html`, `assets/`, and `data/` if you prefer) into the Plantivorous web root, e.g. `site/plantivorous-database/`.
2. Link to it from the site navigation: `<a href="/plantivorous-database/">Carnivorous plant database</a>`.
3. Because it's a self-contained hash-routed SPA, no server-side routing, build step, or backend is required. Any static host (GitHub Pages, Netlify, Apache, Nginx, etc.) works.
4. If serving from a sub-path, all relative asset links in `index.html` resolve correctly; the only absolute URLs are external source links (ICPS, POWO, Wikimedia), which are user-clicked anchors, not loaded assets.

To rebrand the colours or fonts, edit `assets/css/styles.css` (CSS custom properties at the top of the file).

---

## Monitoring workflow (new species & hybrids)

The catalogue is anchored to an ICPS snapshot. Monitoring is **build-time only**: when a new ICPS snapshot is available, diff it against the current build, record changes in the changelog, and rebuild.

### Step 1 — Refresh the ICPS snapshot

```bash
node scripts/scrape-icps.mjs
```

This writes `data/icps-species.json` (accepted species, hybrids & infraspecific taxa from cpnames.carnivorousplants.org).

### Step 2 — Diff, changelog, rebuild

```bash
node scripts/update-database.mjs
```

What it does:
1. Reads the new snapshot and the current `data/species.json` baseline.
2. Compares accepted (non-provisional) taxon names.
3. If there are additions or removals, appends a dated entry to `data/changelog.json` (with the added/removed taxon lists).
4. Re-runs `scripts/build-data.mjs` to regenerate `data/species.json` and `assets/js/data.js`.

Dry-run to preview changes without writing anything:

```bash
node scripts/update-database.mjs --dry-run
```

The changelog is displayed on the `#/new` ("What's new") page, and the snapshot date / watchlist count appear in the site footer.

---

## Screenshots & visual QA

The site is browser-verified across all routes (home, database, species detail, genera, map, care, what's-new, about, favourites) including the search modal, lightbox, favourites/localStorage, hash-router URL sync, keyboard navigation, mobile layout (390 px), and horizontal-overflow checks. Some `browser.screenshot` captures were blocked in this environment because the desktop tab wasn't visible; run the preview server and open the routes above for final visual QA.

---

## Maintenance notes

- `data/species.json` and `assets/js/data.js` are **generated** — do not edit by hand. Regenerate with `node scripts/build-data.mjs`.
- `app.js` passes `node --check`; the bundle has no external dependencies.
- `Drosera burmanni` is spelled with one "i" in ICPS. `Drosera magnifica` is a provisional watchlist entry absent from ICPS.
- Some Wikimedia Commons artist fields contain cleanup text (e.g. "No machine-readable author provided…"); these are normalised to "Wikimedia Commons" in-app where the artist is blank.

---

## Licence

- Code (HTML/CSS/JS): MIT
- Data (taxonomy from ICPS): factual nomenclature; redistributed per ICPS terms
- Photos: per-photo licence shown in-app (CC BY-SA / CC BY / public domain); attribution must be retained
- Map geometry: Natural Earth (public domain)
- Fonts: IBM Plex Sans (SIL Open Font License), Noto Sans (SIL Open Font License)
