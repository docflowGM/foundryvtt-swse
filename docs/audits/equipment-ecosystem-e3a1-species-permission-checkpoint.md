# Equipment Ecosystem — E3-A1 Checkpoint: Canonical Species Equipment Permission Projection

**Phase:** E3-A1 only. Generic grip/hand occupancy, item transitions, equipment persistence, Near-Human integration, encumbrance integration, E4+ and the droid refactor are **not** authorized or started.
**Branch / PR:** `audit/equipment-ecosystem-e0-e1` / draft PR #1056 · **Starting HEAD:** `d47d4b82379d948f30b2d814235236128ba04d4d` (clean tree; E2B-I3B CI run 39043549732 green; E2 acceptance review passed with defined limitations).
**Statuses:** `SOURCE_VERIFIED` (E2B-RD-01), `IMPLEMENTED`, `OFFLINE_TESTED` for the projection. Not `FOUNDRY_TESTED`. No rules decision was needed: the values are the already-certified published rule.

## 1. What was added
`scripts/engine/equipment/species-equipment-permissions.js` exports the pure function `resolveSpeciesEquipmentPermissions(effectiveSpeciesProfile)` and `SPECIES_PERMISSION_STATUS`. The input is the selected, effective publication profile (the output of `applySpeciesVariantProfile`) — not an actor, base species or display name. It reads only `selectedVariantId`, `selectedVariant.id`, `selectedVariant.sourceProfileId`, `selectedVariant.completeSnapshot` and the exact ids in `canonicalTraits`. It never parses prose, never looks at appendage counts, never looks up base species data, and never mutates or freezes the input. The result is deterministic, independently owned and deeply frozen.

## 2. The only positive entitlement — Codru-Ji Extra Arms
Legacy Era Campaign Guide, printed p. 13 (E2B-RD-01). Required together: complete snapshot, variant `codru-ji-leg-2c-03`, source profile `LEG-2C-03`, exact trait `extra-arms`, no conflicting variant-id evidence.
```json
{ "id": "codru-ji-extra-arms",
  "maxSimultaneouslyHeldItemsOrWeapons": 4,
  "maxSimultaneousTwoHandedWeapons": 2,
  "additionalAttacksGrantedByThisTrait": 0,
  "source": { "book": "Legacy Era Campaign Guide", "printedPage": 13, "reviewCase": "E2B-RD-01" },
  "provenance": { "variantId": "codru-ji-leg-2c-03", "sourceProfileId": "LEG-2C-03", "traitId": "extra-arms" } }
```
These values describe what this trait grants. They are not a global maximum for any character and do not override attacks granted by other authorities.

## 3. Result statuses
| `status` | Meaning |
|---|---|
| `verified-permission-present` | all identity requirements hold; `permissions` has the entitlement |
| `no-matching-entitlement` | nothing claims the recognized publication (ordinary species, name-only, trait-only, prose-only, Killik, Near-Human, other certified species, malformed input); implies **no** prohibition of ordinary wielding |
| `recognized-incomplete-evidence` | the profile claims the recognized variant id or source-profile id but evidence is missing or contradictory; no grant; blocking `issues` (`selected-variant-identity-conflict`, `selected-variant-id-missing`, `source-profile-id-missing` / `-mismatch`, `complete-snapshot-not-established`, `required-trait-missing`) |

Unknown evidence is never converted into a grant. Malformed input (non-object, array, bad field types) never throws and never grants (`species-profile-not-provided` warning for a non-object).

## 4. Tests (Node 22, in-repo shim; offline only)
- New `tests/equipment-e3a1-species-permissions.test.mjs`: 18 checks (all 18 directive cases), exit 0. The positive case uses the real Codru-Ji publication (pack → registry normalization → `applySpeciesVariantProfile`) and asserts the real anatomy is still four resolved arms; negative cases use synthetic profiles and the real Killik and other certified profiles.
- Exit 0: E2B-I3B (26), E2B-I3A (13), E2A resolver (21) and droid projection (14), schema v1 (11), profile certification (13), variant-atomic, snapshot-consumers, multi-publication, publication-selection, profile-invariants.
- All 393 `tests/*.test.mjs` files: 388 exit 0; 5 exit 1 — the documented pre-existing force-power failures (`force-power-final-integration`, `phase3-force-power-corrections`, `phase4-force-modifier-automation`, `phase5-force-healing-mitigation`, `phase6-force-direct-damage`), not repaired. `node --check` passes on the new module and test.

## 5. Explicit limits and unchanged systems
No permission is added for Killik, Ryn, Trianii, Dug, Krevaaki, Lugubraa, Near-Humans or droids; no generic four-arm / two-two-handed rule is inferred; the Ryn/Trianii holding-tail constraint is not implemented here. No hand is assigned, no attack authorized, no item changed. No pack, species data or trait text, anatomy schema, registry, snapshot pipeline, effective anatomy resolver, droid code, chargen, `InventoryEngine`, `ActorEngine`, `resolveWielding()`, combat, `EncumbranceEngine`, sheet/UI, modification or vehicle file changed. Nothing is wired into a gameplay consumer yet, and this does not certify that a Codru-Ji can equip or operate two two-handed weapons in Foundry.

## 6. Remaining E3 prerequisites
The pure, read-only grip-and-occupancy resolver that consumes the anatomy (`resolveEffectiveAnatomy`) and this projection; Ryn/Trianii tail-holding semantics (constraint evaluation with the encumbrance authority); Near-Human Additional Arms (chargen integration); independent certification of `krevaaki-jatm-2j-04`; durable equipment state, transitions and rollback tests; encumbrance integration; Foundry runtime certification; the droid refactor (DR-001…DR-010 remain `DEFERRED_DROID_REFACTOR`).
