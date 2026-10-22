# Equipment Ecosystem — E2B-I2 Checkpoint: Source-Verified Species Anatomy Migration

**Phase:** E2B-I2 only. E2B-I3, the E2A pre-E3 corrections, E3, Near-Human and encumbrance integration are **not** authorized or started.
**Branch / PR:** `audit/equipment-ecosystem-e0-e1` / draft PR #1056 · **Starting HEAD:** `e9d1bdd8e41fd28bc3521589088bd94e6d4cd0ae` (clean tree).
**Authority:** `docs/audits/equipment-ecosystem-e2b-s1-species-anatomy-source-review.md` (cases E2B-RD-01…08), the E2B-S2 contract §15, the E2B-I1 checkpoint.
**Certification statuses:** `SOURCE_VERIFIED` (E2B-S1, unchanged), `DATA_RECONCILED` for the seven profiles below, `OFFLINE_TESTED`. **Not** `FOUNDRY_TESTED`. Not equipment allocation, not encumbrance, not gameplay.

## 1. Migrated publication profiles (variant ids verified against `packs/species.db`)

| Species | Record `_id` | Variant id | Source profile | Review case | Appendages |
|---|---|---|---|---|---|
| Codru-Ji | `species-codru-ji` | `codru-ji-leg-2c-03` | LEG-2C-03 | E2B-RD-01 (Legacy Era CG p. 13) | 4 × `arm` (`arm-1`…`arm-4`), all capabilities `true` |
| Ryn | `species-ryn` | `ryn-sv-2f-06` | SV-2F-06 | E2B-RD-02 (Scum and Villainy p. 11) | 2 × `arm` + `tail-1` (`prehensile-tail`: hold `true`, wield `false`, manipulate `null`, `held-item-load-floor` constraint) |
| Trianii | `species-trianii` | `trianii-gaw-2i-06` | GAW-2I-06 | E2B-RD-03 (Galaxy at War p. 16) | same pattern as Ryn, stored independently |
| Krevaaki | `species-krevaaki` | `krevaaki-ur-2b-04` | UR-2B-04 | E2B-RD-04 (Unknown Regions p. 13) | 2 × `dominant-tentacle`, all capabilities `true` |
| Killik | `species-killik` | `killik-ur-2b-12` | UR-2B-12 | E2B-RD-05 (Unknown Regions p. 131) | 4 × `arm`, all capabilities `true` (typical Medium Killik) |
| Dug | `species-dug` | `dug-cw-2h-01` | CW-2H-01 | E2B-RD-07 (Clone Wars CG p. 10) | 2 × `lower-limb`: hold `true`, wield `null`, manipulate `true` |
| Lugubraa | `species-lugubraa` | `lugubraa-ur-2b-13` | UR-2B-13 | E2B-RD-08 (Unknown Regions pp. 134–135) | 2 × `grasping-tentacle`: hold `true`, wield `null`, manipulate `null` |

All seven: `schemaVersion: 1`, `topologyStatus: "complete"`. The declaration sits on the existing complete-snapshot variant only. Not touched: `krevaaki-jatm-2j-04` (independent source certification outstanding), the legacy Krevaaki variant, every base species entry, every other variant.

## 2. Data-integrity evidence
- Pack edited by a one-off script (not committed, not the hydration script) that re-serialized **only the seven affected lines** after confirming all 161 lines round-trip identically through `JSON.stringify`. 7 lines changed (Krevaaki holds two variants on one line), the rest are byte-identical; line count and trailing newline preserved.
- A structural diff confirmed that on each changed line the sole difference is the added `anatomy` key on the intended variant; no `_id`, variant id, order, trait, skill, feat, language, natural weapon, speed, size or ability changed.
- The certification test embeds the sha256 of the pre-migration pack; removing the seven `anatomy` keys must reproduce it byte-for-byte.

## 3. Tests (offline, Node 22, in-repo Foundry shim)
- **New** `tests/species-anatomy-profile-certification.test.mjs` (13 checks; real pack, real validator, real registry normalizer, real `applySpeciesVariantProfile`; test-local manifest, no rules-text parsing). Covers all 20 directive checks, including publication isolation and immutability.
- **Updated** `tests/species-anatomy-schema-v1.test.mjs` (11 checks): the "zero production anatomy" assertion became "exactly the seven authorized variants declare anatomy and validate"; all synthetic and malformed-input cases unchanged.
- **Updated** `tests/equipment-e2a-anatomy-resolver.test.mjs` (21 checks): only the two pack-backed Codru-Ji and Ryn assertions changed; the synthetic fail-closed guard tests are untouched.
- Full run of all 390 `tests/*.test.mjs` files: 384 exit 0; 6 non-zero. The five force-power files (`force-power-final-integration`, `phase3-force-power-corrections`, `phase4-force-modifier-automation`, `phase5-force-healing-mitigation`, `phase6-force-direct-damage`) are the documented pre-existing failures and also exit 1 on the starting commit. `rolling-ci-support-check` timed out (124) under 8-way parallel load and passed (exit 0, about 2 min 17 s) when run alone. Species, E2A and original 31-file baseline files all exit 0.

## 4. Known uncertainties and limitations
- Capability `null` values are deliberate and preserved: Ryn/Trianii tail manipulate; Dug wield (conservative classification, not a claim that Dug cannot wield); Lugubraa wield and manipulate.
- The Killik record covers the typical Medium body plan only; it is not generalized to other sizes or castes.
- The current E2A resolver predates schema v1 completeness: it does not enforce `topologyStatus`, drops `constraints`, and reports Codru-Ji as `resolved` from structured anatomy while the Extra Arms entitlements (four held, two two-handed wielded, no extra attacks) remain only in the existing trait. Ryn reports `partial` (tail manipulation unknown). This is **not** E2B-I3 integration.
- Trianii and Ryn still rely on the temporary trait guard only where structured anatomy is absent; the guard stands down for these profiles.
- Dug and Lugubraa are not covered by any temporary guard and were `complete`-declared here; Krevaaki `krevaaki-jatm-2j-04` has no anatomy and falls to the ordinary default.
- Not Foundry-tested.

## 5. Remaining dependencies
E2B-I3: connect schema v1 to the resolver (topology, constraints), complete profile-keyed exception coverage, unresolved physical appendage records and duplicate physical identities, the Codru-Ji permission projection, independent certification of `krevaaki-jatm-2j-04`, Near-Human (`_buildNearHumanContext`, additional arms), encumbrance integration, Foundry certification. DR-001…DR-010 remain `DEFERRED_DROID_REFACTOR`.

## 6. Changed files
`packs/species.db`, `tests/species-anatomy-profile-certification.test.mjs` (new), `tests/species-anatomy-schema-v1.test.mjs`, `tests/equipment-e2a-anatomy-resolver.test.mjs`, this document (new).
