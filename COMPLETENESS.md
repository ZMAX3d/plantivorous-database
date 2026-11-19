# Genus completeness tracker

Authoritative taxonomy: [ICPS Carnivorous Plant Names Resource](https://cpnames.carnivorousplants.org/).
Snapshot refreshed and diffed on **17 November 2026**: **751 accepted species/hybrids**, **86 nested infraspecific taxa**, **21 genera**, **0 nomenclature changes** against the published baseline. Separately, the **164 ICPS-registered *Dionaea* cultivars** are now catalogued with registration facts and parent care.

Photo coverage counts real species-level photographs in `assets/img/species/`. Genus illustration plates are tracked separately and are not counted as species photos.

## Status legend

- **Complete** — every ICPS name is present, every record has a description, authority, native range, origin points and care path, and photo/illustration coverage has been checked.
- **In progress** — the genus has been started but still has photo or profile gaps.
- **Pending** — not yet audited in this pass.

`*` — no cross-genus care group fits this genus. Its species pages now fall back to the genus care sheet instead of linking to an empty care group.

## Per-genus status

| Genus | ICPS accepted (hybrids) | Infraspecific | Records | Photos | Missing photos | No species care group | Status | Last checked |
|---|---:|---:|---:|---:|---:|---:|---|---|
| Aldrovanda | 1 (0) | 1 | 1 | 1 | 0 | 0 | Complete | 2026-11-18 |
| Byblis | 8 (0) | 0 | 8 | 7 | 1 | 0 | Pending | — |
| Cephalotus | 1 (0) | 0 | 1 | 1 | 0 | 0 | Complete | 2026-11-18 |
| Craniolaria | 2 (0) | 0 | 2 | 2 | 0 | 0* | Complete | 2026-11-17 |
| Darlingtonia | 1 (0) | 0 | 1 | 1 | 0 | 0 | Complete | 2026-11-18 |
| **Dionaea** | **1 (0)** | **0** | **1 + 164 cultivars** | **1 + 164 cultivar images** | **0** | **0** | **Complete** | **2026-11-19** |
| Dioncophyllum | 1 (0) | 0 | 1 | 1 | 0 | 1* | Complete | 2026-11-18 |
| Drosera | 191 (4) | 42 | 191 | 134 | 57 | 0 | Pending | — |
| Drosophyllum | 1 (0) | 0 | 1 | 1 | 0 | 0 | Pending | — |
| Genlisea | 28 (0) | 0 | 28 | 24 | 4 | 28* | Complete | 2026-11-18 |
| Habropetalum | 1 (0) | 0 | 1 | 0 | 1 | 1 | Pending | — |
| Heliamphora | 20 (0) | 5 | 20 | 17 | 3 | 0 | Complete | 2026-11-18 |
| Ibicella | 2 (0) | 0 | 2 | 2 | 0 | 2 | Pending | — |
| Martynia | 1 (0) | 0 | 1 | 1 | 0 | 1 | Pending | — |
| Nepenthes | 127 (4) | 0 | 127 | 121 | 6 | 0 | Pending | 2026-11-19 |
| Pinguicula | 104 (1) | 9 | 104 | 47 | 57 | 0 | Pending | — |
| Proboscidea | 6 (0) | 5 | 6 | 3 | 3 | 6 | Pending | — |
| Roridula | 2 (0) | 0 | 2 | 2 | 0 | 0 | Pending | — |
| Sarracenia | 8 (0) | 24 | 8 | 8 | 0 | 0 | Pending | — |
| Triphyophyllum | 1 (0) | 0 | 1 | 1 | 0 | 1 | Pending | — |
| Utricularia | 244 (0) | 0 | 244 | 103 | 141 | 0 | Pending | — |

**Totals:** 751 accepted records, 478 photos, 273 missing photos. This table counts accepted ICPS names only; the nine provisional watchlist taxa are tracked separately and are not part of the ICPS total. Two provisional taxa also have photos, so the current wild-taxon bundle contains **480 image records**. Adding the 164 *Dionaea* cultivars brings the catalogue to **924 records**: 760 wild taxa plus 164 registered cultivars. Five cultivar-specific photos are stored alongside 159 labelled representative *D. muscipula* records, giving **485 image files on disk** (480 wild-taxon images + 5 cultivar-specific images).

## Completed genus notes

### Dionaea — checked 2026-11-19

- ICPS lists exactly one accepted species, *Dionaea muscipula* Soland. ex Ellis (1768), with no hybrids and no infraspecific taxa. The database contains that species record plus all **164 registered cultivars** from the ICPS cultivar register.
- Record audit: the species has description, etymology, discoverer narrative, authority, publication, type locality, native range, two origin points (North Carolina and South Carolina), conservation status, care group, care notes, genus profile and genus care guide. Each cultivar has its registration date, authority, originator, nominant, registrant, publication, standard, etymology/propagation where recorded, an original factual summary, parent care/range and source links.
- Aggregate rule: cultivar records are flagged `rank: "cultivar"` and excluded from species counts, country totals, map markers, family/trap aggregates and the species-photo total. The bundle reports 760 wild taxa + 164 cultivars = 924 records.
- Photo audit: `assets/img/species/dionaea-muscipula.jpg` is a valid 201 KB JPEG by Noah Elhardt, CC BY-SA 2.5. Five cultivars have verified cultivar-specific Commons photos: 'Akai Ryu' (CC BY-SA 3.0, Matthias Jauernig), 'Alien' (CC BY-SA 4.0, Gabriele Zoppoli), 'B52' (CC BY-SA 4.0, Maronesty), 'Bristle Tooth' (CC BY-SA 3.0, Mucrow) and 'Sonic' (CC BY-SA 4.0, Nano31). The remaining 159 records use the parent-species photo with a visible "representative image" badge and credit note.
- Genus plate: `assets/img/genera/dionaea.svg` present.
- **Result: complete — 1 species + 164/164 registered cultivars, 5 cultivar-specific photos and 159 documented representative images.**

### Aldrovanda — checked 2026-11-18

- ICPS lists one accepted species, *Aldrovanda vesiculosa* L., plus the nested variety *A. vesiculosa* var. *rubescens* A.T.Cross & Adamec. Both are present and the variety is shown on the species page.
- Record audit: description, authority, publication, type locality, native range, 39 origin points, aquatic care group, care notes and conservation note are present.
- Photo audit: `assets/img/species/aldrovanda-vesiculosa.jpg` is a valid CC BY-SA 3.0 Commons image with a visible credit.
- **Result: complete, 1/1 photo plus the nested variety.**

### Cephalotus — checked 2026-11-18

- ICPS lists one accepted species, *Cephalotus follicularis* Labill., with no hybrids or infraspecific taxa. The database contains that record.
- Record audit: description, etymology, discoverer narrative, authority, publication, type locality, native range, origin point, Mediterranean care group, care notes and conservation note are present.
- Photo audit: `assets/img/species/cephalotus-follicularis.jpg` is a valid CC BY-SA 3.0 Commons photograph by H. Zell with a visible credit.
- **Result: complete, 1/1 photo.**

### Darlingtonia — checked 2026-11-18

- ICPS lists one accepted species, *Darlingtonia californica* Torr., with no hybrids or infraspecific taxa. The database contains that record.
- Record audit: description, etymology, discoverer narrative, authority, publication, type locality, native range, two origin points (California and Oregon), temperate care group, care notes and conservation note are present.
- Photo audit: `assets/img/species/darlingtonia-californica.jpg` is a valid CC BY 2.5 Commons photograph by Noah Elhardt with a visible credit.
- **Result: complete, 1/1 photo.**

### Dioncophyllum — checked 2026-11-18

- ICPS lists one accepted species, *Dioncophyllum thollonii* Baill., with no hybrids or infraspecific taxa. The database contains that record.
- Record audit: description, authority, publication, type locality, native range, two origin points, care notes and genus care guide are present. No cross-genus care group fits, so the species page uses the genus care sheet.
- Photo audit: no living-plant photo exists on Commons or iNaturalist. A CC BY 4.0 Kew herbarium specimen (K0001971387, collected by Kami, M'Boungou & Koumbi, 2011) was imported from GBIF through the new strict last-resort pipeline and visually verified. The page now labels it as a herbarium specimen.
- **Result: complete, 1/1 image (herbarium specimen), with the limitation documented.**

### Genlisea — checked 2026-11-18

- ICPS lists 28 accepted species with no hybrids or infraspecific taxa. All 28 records are present.
- Record audit: every record has a description, authority, publication, type locality, native range and origin points. No cross-genus care group fits, so all species pages use the genus care sheet.
- Photo audit: 24/28 have a verified open-licensed image — 10 existing Commons photos, 6 research-grade CC BY 4.0 iNaturalist observations and 8 CC0/CC BY/CC BY-SA GBIF herbarium specimens, all visually checked. Specimen pages are labelled as herbarium specimens.
- Documented exceptions: *G. exhibitionista*, *G. multiflora*, *G. nebulicola* and *G. taylorii* have no commercial-friendly image on Commons, iNaturalist or GBIF. Their pages use the genus plate rather than an unlicensed photo.
- **Result: complete, 24/28 photos, with four documented exceptions.**

### Heliamphora — checked 2026-11-18

- ICPS lists 20 accepted species plus five nested infraspecific taxa. All 20 records are present and every record already had description, authority, native range, origin points and a care path.
- Photo audit: 17/20 now have a verified image. Six were added in this pass: one CC BY 4.0 Texas specimen for *H. exappendiculata* (original label *H. heterodoxa* var. *exappendiculata*), and five CC BY 4.0 NYBG sheets for *H. ciliata*, *H. collina*, *H. elongata*, *H. glabra* and *H. huberi*. Each NYBG sheet carries a clear Andreas Fleischmann determination, including isotypes/holotype, and was visually checked.
- Rejected during audit: a Commons "range of *H. elongata*" distribution map was caught as non-photographic and removed; the Commons fetcher now rejects range/distribution files. Three US sheets labelled *H. nutans* were also rejected as misidentified.
- Documented exceptions: *H. arenicola*, *H. sarracenioides* and *H. uncinata* have no commercial-friendly image on Commons, iNaturalist or GBIF. Their pages use the genus plate.
- **Result: complete, 17/20 photos, with three documented exceptions.**

### Craniolaria — checked 2026-11-17

- ICPS lists two accepted species, *Craniolaria annua* L. and *Craniolaria integrifolia* Cham., with no hybrids or infraspecific taxa. Both records are present.
- Record audit: authority, publication, type locality, native range, origin points, description and IUCN status are present for both.
- Photo audit: *C. annua* already had a CC BY 4.0 Commons photo. *C. integrifolia* had no usable Commons image, so a research-grade CC BY 4.0 observation by Nolan Exe was imported from iNaturalist through the new strict fallback pipeline and visually verified.
- **Care fix:** neither species belongs to a suitable cross-genus care group. The species page now falls back to the genus care sheet for light, water, substrate, temperature, dormancy and feeding, instead of rendering `#/care/undefined`. The credit panel now names iNaturalist correctly for non-Commons photos.
- **Result: complete, 2/2 photos.**
