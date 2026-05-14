# Species Canonical Diff and Phase 1 Sanitization Report

Compared the uploaded canonical species text against `packs/species.db`, `data/species-traits.json`, and `data/species-traits-migrated.json`.

## Applied in this patch

- Added 3-5 sentence canonical descriptions to matching species pack entries where canonical prose was available.
- Added `data/species-canonical-descriptions.json` as a parsed catalog of 131 canonical species descriptions.
- Added `system.variants` support data for canonical alternate species trait packages where the base species exists in the pack.
- Collapsed parenthetical pack variants into base species records as `system.variants`, instead of rendering them as separate species rows.
- Mirrored canonical description/variant metadata into the species trait JSON files where names matched.

## Collapsed pack entries

- `Devaronian (Female)` -> variant option on `Devaronian (Female)`
- `Nautolan (Variant)` -> variant option on `Nautolan (Variant)`
- `Pau'an (Variant)` -> variant option on `Pau'an (Variant)`
- `Quarren (Variant)` -> variant option on `Quarren (Variant)`

## Canonical alternate species trait packages

- `Noghri`: present on base species
- `Jawa`: present on base species
- `Kaminoan`: present on base species
- `Yuuzhan Vong`: canonical data parsed, but base species is not currently in pack
- `Bith`: canonical data parsed, but base species is not currently in pack
- `Neimoidian`: canonical data parsed, but base species is not currently in pack
- `Umbaran`: present on base species
- `Chadra-Fan`: present on base species
- `Krevaaki`: canonical data parsed, but base species is not currently in pack

## Canonical species missing from species.db

- Gamorrean
- Hutt
- Chistori
- Mantellian Savrip
- Replica Droid
- Utai
- Draethos
- Khil
- Kissai
- Massassi
- Aleena
- Caamasi
- Felucian
- Nosaurian
- Blood Carver
- Wroonian
- Dug
- Gen'Dai
- Geonosian
- Kerkoiden
- Nelvaanian
- Republic Clone
- Klatooinian
- Vahla
- Yuuzhan Vong
- Celegian
- Shard
- Vultan
- Taung
- Trianii
- Yevetha
- Zygerrian
- Bith
- Mrlssi
- Neimoidian
- Nyriaanan
- Pa'lowick
- Altiri
- Anzati
- Anarrian
- Ebruchi
- Krevaaki
- Lugubraa
- O'reenian
- Sluissi
- Sorcerer of Rhand
- Squib
- Ssi-Ruuk
- Tof
- Vagaari
- Amani
- Nazren
- Phindian
- Polis Massan
- Skakoan
- Stereb
- Tusken Raider

## Pack species not confidently matched to canonical txt

- Aing-Tii
- Anomid
- Anx
- Bardottan
- Besalisk
- Chevin
- Chiss
- Drall
- Dressellian
- Gree
- Gundark
- Hapan
- Hiss'sssi
- Jenet
- Kal-Dexar
- Kessurian
- Kiffar
- Koorivar
- Kubaz
- Mirialan
- Mustafarian
- Muun
- Near-Human
- Nerf (Uplifted)
- Ortolan
- Quermian
- Sith (Pureblood)
- Theelin
- Vaathkree

## Close matches / likely data cleanup candidates

- `Mirialan` may correspond to: Miraluka
- `Sith (Pureblood)` may correspond to: Bith

## Phased follow-up notes

- Primitive is now tagged when detected from canonical text, but class proficiency suppression still needs a progression-engine rule pass.
- Shard and Replica Droid are tagged in canonical description data when present, but their droid-builder constraint flow should be implemented as a separate droid-builder integration pass.
- Missing canonical species should be added as real pack entries only after deciding image/source defaults and whether they are player-facing or GM/NPC-only.
