# Character item compendium SSOT — production convergence

**Source of truth**
- Weapons: `data/canonical/weapons.json` → `tools/build-weapon-production.mjs` → aggregate and 7 subtype packs.
- Armor: `data/canonical/armor.json` → `tools/build-canonical-item-packs.mjs` → aggregate and 4 subtype packs.
- Equipment: `data/canonical/equipment.json` → `tools/build-canonical-item-packs.mjs` → aggregate and 7 subtype packs.

The armor/equipment JSON contains complete, ID-stable Foundry Item documents and an explicit destination subtype pack for each record. It was initialized from the richer V2 aggregate packs (70 armor, 142 equipment). The previous armor subtype pack contents are superseded; the store and other consumers now receive identical documents for the same ID. No canonical item prices were guessed or changed. Historical Phase 0 census and unused archive JSON remain evidence, not production inputs.

**Change policy:** edit canonical JSON, regenerate with `node tools/build-canonical-item-packs.mjs`. Run `node tools/build-canonical-item-packs.mjs --check` and `node tools/build-weapon-production.mjs --check`. The parity test under `tests/canonical-item-pack-parity.test.mjs` checks both and prevents handwritten pack drift.

**Packaging:** The release pack builder uses the committed `packs/*.db` to compile Foundry V13 LevelDB directories. Regenerate before packaging. A live Foundry install still needs smoke testing.

**Scope:** this consolidates the existing refactored Item data, not a fresh printed-rule verification of all 212 records. Price correctness is inherited from the source data; it is not independently sourcebook-recertified by this change. No actor migration or blanket GM authorization is introduced.
