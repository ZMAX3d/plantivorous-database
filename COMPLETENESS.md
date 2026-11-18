# Genus completeness tracker

Authoritative taxonomy: [ICPS Carnivorous Plant Names Resource](https://cpnames.carnivorousplants.org/).
Snapshot refreshed and diffed on **17 November 2026**: **751 accepted species/hybrids**, **86 nested infraspecific taxa**, **21 genera**, **0 nomenclature changes** against the published baseline.

Photo coverage counts real species-level photographs in `assets/img/species/`. Genus illustration plates are tracked separately and are not counted as species photos.

## Status legend

- **Complete** — every ICPS name is present, every record has a description, authority, native range, origin points and care path, and photo/illustration coverage has been checked.
- **In progress** — the genus has been started but still has photo or profile gaps.
- **Pending** — not yet audited in this pass.

`*` — no cross-genus care group fits this genus. Its species pages now fall back to the genus care sheet instead of linking to an empty care group.

## Per-genus status

| Genus | ICPS accepted (hybrids) | Infraspecific | Records | Photos | Missing photos | No species care group | Status | Last checked |
|---|---:|---:|---:|---:|---:|---:|---|---|
| Aldrovanda | 1 (0) | 1 | 1 | 1 | 0 | 0 | Pending | — |
| Byblis | 8 (0) | 0 | 8 | 7 | 1 | 0 | Pending | — |
| Cephalotus | 1 (0) | 0 | 1 | 1 | 0 | 0 | Pending | — |
| Craniolaria | 2 (0) | 0 | 2 | 2 | 0 | 0* | Complete | 2026-11-17 |
| Darlingtonia | 1 (0) | 0 | 1 | 1 | 0 | 0 | Pending | — |
| **Dionaea** | **1 (0)** | **0** | **1** | **1** | **0** | **0** | **Complete** | **2026-11-17** |
| Dioncophyllum | 1 (0) | 0 | 1 | 0 | 1 | 1 | Pending | — |
| Drosera | 191 (4) | 42 | 191 | 134 | 57 | 0 | Pending | — |
| Drosophyllum | 1 (0) | 0 | 1 | 1 | 0 | 0 | Pending | — |
| Genlisea | 28 (0) | 0 | 28 | 10 | 18 | 28 | Pending | — |
| Habropetalum | 1 (0) | 0 | 1 | 0 | 1 | 1 | Pending | — |
| Heliamphora | 20 (0) | 5 | 20 | 11 | 9 | 0 | Pending | — |
| Ibicella | 2 (0) | 0 | 2 | 2 | 0 | 2 | Pending | — |
| Martynia | 1 (0) | 0 | 1 | 1 | 0 | 1 | Pending | — |
| Nepenthes | 127 (4) | 0 | 127 | 119 | 8 | 0 | Pending | — |
| Pinguicula | 104 (1) | 9 | 104 | 47 | 57 | 0 | Pending | — |
| Proboscidea | 6 (0) | 5 | 6 | 3 | 3 | 6 | Pending | — |
| Roridula | 2 (0) | 0 | 2 | 2 | 0 | 0 | Pending | — |
| Sarracenia | 8 (0) | 24 | 8 | 8 | 0 | 0 | Pending | — |
| Triphyophyllum | 1 (0) | 0 | 1 | 1 | 0 | 1 | Pending | — |
| Utricularia | 244 (0) | 0 | 244 | 103 | 141 | 0 | Pending | — |

**Totals:** 751 records, 457 photos, 296 missing photos. This table counts accepted ICPS names only; the nine provisional watchlist taxa are tracked separately and are not part of the ICPS total.

## Completed genus notes

### Dionaea — checked 2026-11-17

- ICPS lists exactly one accepted species, *Dionaea muscipula* Soland. ex Ellis (1768), with no hybrids and no infraspecific taxa. The database contains exactly that one record.
- Record audit: description, etymology, discoverer narrative, authority, publication, type locality, native range, two origin points (North Carolina and South Carolina), conservation status, care group, care notes, genus profile and genus care guide all present.
- Photo audit: `assets/img/species/dionaea-muscipula.jpg` is a valid 201 KB JPEG by Noah Elhardt, CC BY-SA 2.5, sourced from Wikimedia Commons. Attribution is present in `data/photo-credits.json` and rendered on the species page.
- Genus plate: `assets/img/genera/dionaea.svg` present.
- **Result: complete. No data changes were required.**

### Craniolaria — checked 2026-11-17

- ICPS lists two accepted species, *Craniolaria annua* L. and *Craniolaria integrifolia* Cham., with no hybrids or infraspecific taxa. Both records are present.
- Record audit: authority, publication, type locality, native range, origin points, description and IUCN status are present for both.
- Photo audit: *C. annua* already had a CC BY 4.0 Commons photo. *C. integrifolia* had no usable Commons image, so a research-grade CC BY 4.0 observation by Nolan Exe was imported from iNaturalist through the new strict fallback pipeline and visually verified.
- **Care fix:** neither species belongs to a suitable cross-genus care group. The species page now falls back to the genus care sheet for light, water, substrate, temperature, dormancy and feeding, instead of rendering `#/care/undefined`. The credit panel now names iNaturalist correctly for non-Commons photos.
- **Result: complete, 2/2 photos.**
