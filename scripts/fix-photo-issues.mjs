import { readFile, writeFile, rename, access } from "node:fs/promises";
import { constants } from "node:fs";

/**
 * One-off correction pass for photo credits that were verified as wrong.
 *
 *   node scripts/fix-photo-issues.mjs
 *
 * Safe to run multiple times. Only touches credits listed below.
 */

const REMOVE = new Map([
  ["Pinguicula poldinii", "Commons file is a distribution map (Arzinomap.png)"],
  ["Pinguicula macrophylla", "Shared P. vulgaris photo; no verified P. macrophylla photo exists"],
  ["Drosera hirtella", "Shared D. montana photo"],
  ["Drosera rosulata", "Shared D. bulbosa photo"],
  ["Drosera fimbriata", "Commons match is an unrelated Kaas Plateau wildflower"],
  ["Drosera hirsuta", "Commons match is an unrelated Kaas Plateau wildflower"],
  ["Drosera cendeensis", "Commons match is Siphocampylus, not a Drosera"],
  ["Proboscidea spicata", "Habitat photo names P. althaeifolia / Boerhavia spicata"],
  ["Nepenthes biak", "Photo is Nepenthes insignis; N. biak is a distinct species"],
  ["Heliamphora exappendiculata", "Commons file is an unidentified Heliamphora"],
  ["Nepenthes jamban", "Photo is the natural hybrid N. jamban × N. lingulata"],
  ["Nepenthes rhombicaulis", "Photo is a N. rhombicaulis × N. spectabilis hybrid"],
  ["Utricularia hydrocarpa", "Commons file is labelled 'cf. hydrocarpa' (uncertain identification)"],
  ["Pinguicula gracilis", "Commons only has P. gracilis × moctezumae hybrid photos"],
  ["Utricularia longeciliata", "Commons only has 'cf. longeciliata' photos (uncertain identification)"],
  ["Heliamphora elongata", "Commons only has a distribution map, not a plant photo"],
]);

const pc = JSON.parse(await readFile("data/photo-credits.json", "utf8"));
const before = pc.credits.length;

pc.credits = pc.credits.filter((credit) => {
  const reason = REMOVE.get(credit.species);
  if (!reason) return true;
  console.log(`Removed ${credit.species}: ${reason}`);
  return false;
});

// Nepenthes adnata was stored under a Drosera filename and described as
// "Drosera adnata"; the photo itself is correct.
const adnata = pc.credits.find((c) => c.species === "Nepenthes adnata");
if (adnata) {
  const oldPath = "assets/img/species/drosera-adnata.jpg";
  const newPath = "assets/img/species/nepenthes-adnata.jpg";
  if (adnata.file === oldPath) {
    const oldExists = await access(oldPath, constants.F_OK).then(
      () => true,
      () => false
    );
    if (oldExists) {
      const newExists = await access(newPath, constants.F_OK).then(
        () => true,
        () => false
      );
      if (newExists) throw new Error(`refusing to overwrite existing ${newPath}`);
      await rename(oldPath, newPath);
      console.log(`Renamed ${oldPath} -> ${newPath}`);
    }
    const newExists = await access(newPath, constants.F_OK).then(
      () => true,
      () => false
    );
    if (newExists) adnata.file = newPath;
  }
  if (adnata.description === "Drosera adnata" || !adnata.description) {
    adnata.description = "Nepenthes adnata";
  }
  adnata.alt = "Photograph of Nepenthes adnata";
  adnata.credit = adnata.artist ? `Photo by ${adnata.artist}` : adnata.credit;
}

await writeFile("data/photo-credits.json", JSON.stringify(pc, null, 2), "utf8");
console.log(`Credits: ${before} -> ${pc.credits.length}`);
