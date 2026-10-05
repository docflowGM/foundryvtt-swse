# SWSE Item Rehabilitation — Phase 0: Architecture / SSOT Census

Status: PHASE 0 COMPLETE (census frozen; zero semantic decisions made)
Updated: 2026-10-05
Machine-readable companion: `data/audits/item-phase-0-ssot-census.json`
Reproduce / verify: `node tools/census-item-ssot-phase-0.mjs` · `node tools/census-item-ssot-phase-0.mjs --check`

Scope: weapons, armor, equipment, upgrades/modifications, lightsaber parts, implants, vehicle weapons (the last two only *identified*, not claimed).
Nothing in `packs/`, `data/` content, schemas, or runtime code was changed. The only additions are this document, the JSON census, and the census tool.

## 1. Headline findings

1. **There is no generator.** No `package.json`, no pack build step. `packs/*.db` (NDJSON) are hand-/script-edited source *and* compiled output at once. The `tools/fix-*-data.js` scripts are historical one-shot rebuilders that write the aggregate `.db` files directly.
2. **Weapons and armor each exist twice and the two copies are not equal.** Aggregate pack (`weapons`, `armor`) vs the union of its subtype packs. Same `_id`s, same names, different `system` shapes (table 3). Equipment is the exception: aggregate and subpacks are byte-identical.
3. **Runtime is split-brain on which copy it reads.** The store reads the **subpacks** (the aggregates are deliberately demoted to priority 20 in `store/index.js`). Chargen, template engines, and the sentinel read the **aggregates**. So the same weapon can appear with different shape (and, for 3 lightsabers, different cost) depending on the caller.
4. **The legacy JSON loader points at nothing.** `WorldDataLoader.loadWeapons/Armor/Equipment` fetch `data/weapons.json`, `data/armor.json`, `data/equipment.json`; none exist. `autoLoad()` has `loadAll()` commented out, so it is inert today. It is a dead authority, not a live one.
5. **Several `data/` layers have zero code consumers.** `data/upgrades/*.json` (71 records), `data/armor/{light,medium,heavy}.json` (53), `data/gear-templates.json`, `data/vehicle-weapons.json`. They are reference/archaeology material, not runtime authority.
6. **Upgrades/modifications live in five parallel layers and none is a pack.** Runtime authority is JS-resident catalogs; the shipped `weaponUpgrade` packs hold only lightsaber crystals/accessories (39 unique records).
7. **Provenance is nearly absent on weapons.** 0 of 186 weapon records carry `source`/`sourcebook`/`page`. Armor and equipment carry `sourcebook` (100%) but **no page** on any record.
8. **Only TXT sourcebooks are in the repo** (14 `_djvu.txt` files). No sourcebook PDFs. Phase 4 table verification (the handoff's "PDF is final authority") will need PDFs supplied.

## 2. Authority map (canonical source → fixed layers → build → compiled pack → runtime consumer)

| Family | Edit target today | Derived / mirror layers | Build | Compiled pack(s) | Runtime consumers |
|---|---|---|---|---|---|
| Weapons (186) | `packs/weapons.db` (rich, v2) **and** `packs/weapons-*.db` (older shape) — no declared master | `data/store/weapon-store-descriptions.json` (186, id-joined to pack) | none | 7 subpacks + `weapons` aggregate | Store → subpacks; chargen/templates/finalizer/sentinel → aggregate; `weapon-data-resolver`, `weapons-engine` read `system.*` |
| Armor (70) | `packs/armor.db` (rich, v2) **and** `packs/armor-{light,medium,heavy,shields}.db` | `data/store/armor-store-descriptions.json` (70) | none | 4 subpacks + `armor` aggregate | Store → subpacks; chargen/templates/sentinel → aggregate |
| Equipment (142) | `packs/equipment.db` ≡ union of 7 subpacks (identical) | `data/store/equipment-store-descriptions.json` (134) | none | 7 subpacks + `equipment` aggregate | Store → subpacks; chargen/templates → aggregate |
| Lightsaber parts (38 + 15) | `packs/lightsaber-{crystals,accessories}.db`, `packs/weapons-lightsabers.db` | `data/lightsaber-components.json` (6), `data/lightsaber-items-import.ndjson` (6) | none | as named; 4 crystal/accessory records are also in `weapons.db` (3 duplicate an existing `_id`) | `lightsaber-construction-engine`, `combat-stat-rules` |
| Upgrades / mods | JS catalogs (see §4) | `data/upgrades/*.json` (71, no consumers), `data/store/modification-store-descriptions.json` (263) | none | only lightsaber `weaponUpgrade` packs | `upgrade-slot-engine`, `safety-engine`, `item-customization-workbench`, `upgrade-catalog` |
| Implants | `packs/equipment-tech.db` (8 `isImplant` records) | `data/implants/*` (8 + policy), `data/store/implant-store-descriptions.json` (8) | none | inside equipment aggregate + `equipment-tech` | dev audit scripts only (no runtime reader of `data/implants/*`) |
| Vehicle weapons (64) — **not claimed** | `packs/vehicle-weapons.db` | `data/vehicle-weapons.json` (64, no consumers) | none | `vehicle-weapons` | `vehicle-weapon-*`; separate track recommended |
| Droid / vehicle modifications — **not claimed** | `scripts/data/droid-modifications.js`, `data/vehicle-modifications/*.json` (187) | — | none | none | `vehicle-modification-manager` reads the JSON |

## 3. Aggregate vs subpack parity (measured)

| Family | Aggregate | Subpack union | Only in aggregate | Identical records | Records whose `system` differs |
|---|---:|---:|---|---:|---:|
| weapons | 190 | 186 | 4 `weaponUpgrade` (Blade Lock, Barab Ingot, Ilum Crystal, Synthetic Crystal) | 15 (the lightsabers) | 171 |
| armor | 70 | 70 | — | 0 | 70 |
| equipment | 142 | 142 | — | 142 | 0 |

- **Weapons:** aggregate adds `combat`, `economics`, `equippable`, `rangeProfile`, `traits`, `weaponType`, `schemaVersion: 2` on 171 records. Value conflicts on shared keys: `system.category` ×171 (subpack e.g. `exotic`/`simple`, aggregate `weapon`) and `system.cost` ×3 — Lightsaber 12000 vs 3000, Double-Bladed Lightsaber 24000 vs 7000, Lightfoil 10000 vs 4500 (subpack vs aggregate).
- **Armor:** aggregate adds `category`, `defense`, `limits`, `damageReduction`, `economics`, `equippable`, `traits`, `schemaVersion: 2` on all 70; no value conflicts on shared keys.
- **Equipment:** `Subelectronic Converter` appears twice by name within the pack (distinct `_id`s); one copy is flagged `isImplant` (8 `isImplant` records total). Those 8 are exactly the records without store descriptions (142 vs 134).
- Both `_id` sets are identical across layers (no ID drift), so a deterministic join is possible.

## 4. Upgrade / modification layers

| Layer | Records | Runtime consumer |
|---|---:|---|
| `scripts/engine/customization/upgrade-catalog.js` (`UPGRADE_CATALOG`) | 71 | yes (customization engines) |
| `scripts/data/{armor-upgrades,blaster-upgrades,melee-upgrades,gear-mods}.js` | 10 / 4 / 8 / 8 | yes (workbench, slot engine, safety engine) |
| `data/upgrades/{armor,universal,weapon}-upgrades.json` | 29 / 19 / 23 | **none** |
| `weaponUpgrade` packs (crystals 28, accessories 10, + 4 stragglers in `weapons.db`) | 42 records / 39 unique `_id` (3 stragglers duplicate a crystal/accessory `_id`; Synthetic Crystal exists only in `weapons.db`) | construction engine |
| `data/store/modification-store-descriptions.json` | 263 | store description resolver |

None of the 70 `data/upgrades/*.json` names matches a `weaponUpgrade` pack record. The relationship between the JSON, the JS catalogs, and the 263 store descriptions is **not established** by Phase 0 and is a Phase 1 identity question.

## 5. Other layers

- `data/store/*-store-descriptions.json`: 100% id-joined to the aggregate packs for weapons (186) and armor (70); equipment 134/142 (missing: 7 implants + one of the two same-name Subelectronic Converter records, which is itself flagged `isImplant`); the 4 straggler `weaponUpgrade` records have none. Read by `store-description-resolver.js`.
- `data/armor/*.json` (53 records, snake_case schema): 46 names matched the armor subpacks at census time, 7 did not (Blast Vest, Clone Trooper Armor, Jedi Robes, Mandalorian Light Armor, Energy Shields Light/Medium/Heavy). After the Phase 0-2 armor renames (2026-10-05) only 25 match, because this evidence file carries the old display names; the census JSON was regenerated. No consumers. Evidence only.
- Tags today: equipment carries `system.tags` + `system.traits` (142/142); weapons carry `system.traits` (178/190) and `system.properties` (176); armor, lightsaber parts, and vehicle weapons carry none. **No record anywhere carries `metadata.tags` / `tagProvenance`.** The 190-tag ontology is not yet applied to this corpus.
- Item type declarations (`template.json`): `weapon`, `armor`, `equipment`, `weaponUpgrade`, `vehicleWeapon`, `vehicleWeaponRange`. `weaponUpgrade` and `equipment` templates are near-empty — every upgrade field lives in free-form `system.*`.
- Source text available: Core, Clone Wars, Force Unleashed, Galaxy at War, Galaxy of Intrigue, Jedi Academy, KOTOR, Legacy Era, Rebellion Era, Scavenger's Guide, Scum and Villainy, Starships, Threats, Unknown Regions (all `_djvu.txt`; ~10.3 MB total).

## 6. Provenance field coverage (input to Phase 1)

| Pack | Records | `source`/`sourcebook` | `page` |
|---|---:|---:|---:|
| weapons (all 7 subpacks + aggregate) | 186 (+4) | 0 (4 upgrades have `source`) | 0 |
| armor (aggregate) | 70 | 70 | 0 |
| equipment (aggregate) | 142 | 142 | 0 |
| lightsaber crystals / accessories | 28 / 10 | 0 | 0 |
| vehicle-weapons | 64 | has `source` field | — |

## 7. Owner decisions required before Phase 1 mutations (structural policy only)

- **O-1 Edit target.** Phase 1+ must have exactly one layer where content is edited. Candidates: (a) aggregate is master, subpacks regenerated; (b) subpacks are master, aggregate regenerated; (c) retire one layer. Facts: the aggregates are the richer v2 shape and the chargen/template path; the store deliberately prefers subpacks. Whichever is chosen, we should add a parity gate (`--check` style) so the layers cannot drift again. *Recommendation: (a) with a generated-subpack step and a parity check, but this changes store behaviour and is yours to rule on.*
- **O-2 Scope of "item".** Confirm implants (inside equipment), vehicle weapons (64), and droid/vehicle modifications are handled as separate tracks, and whether the lightsaber crystal/accessory packs are in the same corpus.
- **O-3 Dead layers.** `WorldDataLoader` weapon/armor/equipment loaders, `data/upgrades/*.json`, `data/armor/*.json`, `data/gear-templates.json` have no consumers. Keep as evidence through Phase 5, then classify (category C/D) for removal — not now.
- **O-4 PDFs.** Phase 1 can begin on TXT, but page certification and Phase 4 tables need the Core Rulebook PDF (and later books) supplied.

### 7a. Owner rulings (PR #1005 comment, 2026-10-05) — resolves O-1 to O-4

- **O-1 Edit target:** the aggregate v2 packs (`weapons`, `armor`, `equipment`) are the future item SSOT for character-scale items. Subpacks become derived/generated mirrors. Store behaviour is **not** changed yet; first build a deterministic generation + parity path so the store can move without data loss.
- **O-2 Scope:** one umbrella item-rehabilitation project with separate mechanical tracks. Primary track: character-scale weapons/armor/equipment. Distinct subfamilies: implants (equipment), lightsaber crystals/accessories (upgrades). Separate subtrack: general upgrades/modifications (runtime authority is JS catalogs). Vehicle weapons and droid/vehicle modifications are later, separate tracks and must not enter the character-item census.
- **O-3 Dead layers:** keep the inert loader and unused data layers as evidence through identity/schema reconciliation. No deletion or repurposing. Classify for retirement only after canonical authority and migration path exist.
- **O-4 PDFs:** held by the research owner outside the repo and not committed. Claude executes from the certified rolling MD/JSON authority and does not independently reconstruct canonical rules.
- **Process:** Phase 1+ maintains single cumulative rolling authorities (Markdown + JSON). Per-book/phase files are temporary checkpoints and must not become competing permanent authorities.
- **No production content mutation is authorized by these rulings.**

## 8. Phase 1 entry gates (Core Rulebook first)

1. O-1 to O-4 ruled (see 7a). Remaining gate: the certified rolling Phase 1 authority (MD + JSON) supplied by the research owner.
2. Canonical enumeration seed for Core weapons/armor/equipment (from TXT; PDF where OCR is ambiguous), keyed independently of the repo.
3. Join key defined: repo `_id` ↔ canonical identity, with `Subelectronic Converter` and the 4 straggler upgrade records handled explicitly (including the 3 `_id`-duplicate upgrade stragglers).
4. Per-book checkpoint commit, as in the feat/talent work.

## 9. Validation run for this phase

- `node --check tools/census-item-ssot-phase-0.mjs` — ok
- `node tools/census-item-ssot-phase-0.mjs --check` — census current
- No pack, schema, or runtime file modified.

Not changed intentionally: all pack content, store resolver priority, `WorldDataLoader`, upgrade catalogs, schemas.
