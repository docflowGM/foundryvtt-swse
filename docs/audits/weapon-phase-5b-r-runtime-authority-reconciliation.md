# Phase 5B-R — Runtime Authority Reconciliation

**Governing rule:** the schema structure is frozen; the system adapts to it. A source-verified omission in canonical *data* may be corrected; the schema is never redesigned or flattened for runtime convenience.

Generated/verified by `node tools/build-weapon-phase-5b-r-reconciliation.mjs [--check]` →
`data/audits/weapon-phase-5b-r-mode-reconciliation.json`, `data/audits/weapon-phase-5b-r-condition-policy-census.json`.
Amendments are code (`tools/lib/item-weapons-phase-3b-amendments.mjs`, applied by the deterministic Phase 3B builder; never hand-edited JSON). `verify-item-weapons-authority.mjs` re-applies them to the certified Phase 2 claims and requires the committed 3B to equal that exactly.

## 1. Result

| Measure | Value |
|---|---|
| Identities / Phase 4 category records | 203 / 204 (unchanged) |
| Phase 3B content-completeness amendments | **6 enumerated** (below) |
| Schema-shape changes | **0** (identity, `canonicalStats`, `attackProfile`, `schemaFamily`, `configurationStates`-element key sets pinned to the `605e170` values by test) |
| Semantic tag / category changes | **0** (sha256 of all `[identityKey, categories, semantic]` pinned to the `605e170` value) |
| Selector changes in Phase 4H | 0 (only Electropole’s `proficiency.alternateRoutesPhase3B[0]` gained the structured `species:"Gungan"` carried from 3B) |
| 4H modes typed | 34 (ATTACK_PROFILE 15 · CONFIGURATION 7 · OPERATING_MODE 10 · SPECIAL_ACTION 1 · PROFICIENCY_ROUTE 1) |
| Unresolved modes | **0** |
| Previously “incomplete” seven identities / 13 modes | all typed and executable-in-data (table §3) |
| Executable canonical conditions with policy UNSUPPORTED | **0** (98 AUTO / 11 PROMPT distinct values; 3 activation-requirement types registered) |
| Orphan certified field paths | **0** (2,187 paths: 1,504 3B + 683 4H) |

## 2. Three concepts (planner ruling 1)

```
ATTACK PROFILE   what attack is physically made
CONFIGURATION    what form/state the weapon is in (changes which profiles/proficiency rules apply)
OPERATING MODE   how an otherwise-same attack is resolved (modeProfiles)
SPECIAL ACTION   an attack of kind special/utility (e.g. venom spit, once per 24 h)
```
Reconciliation evidence order (pure, deterministic, no names): explicit configuration id → explicit `modeProfiles` id → explicit profile id → unique explicit branch → strict 1:1 cardinality. A mode with none of those is `UNRESOLVED` and fails the verifier. The previous “selector-only / profileDefinitionIncomplete / executable:false” diagnostic is removed.

`PROFICIENCY_ROUTE` is a fifth value I had to add: the Electropole’s fourth 4H “mode” (`gungan-alternate-proficiency`) is a proficiency-route descriptor filed under `modes`, not an attack, configuration or mode. It is resolved by a structured species route (below), so nothing is left unexecutable.

## 3. Findings per identity (proved against the actual 3B records)

| Identity | Ruling | What the records showed | Action |
|---|---|---|---|
| **Amphistaff** | correct data | 3B had one placeholder profile with prose-only forms | **Amended:** 3 `configurationStates` (quarterstaff default / spear / whip, swift to change); 8 profiles gated by `activationRequirements{type:configuration}`: `quarterstaff-end1/-end2` and `spear-melee`/`spear-thrown` (damage/type/qualities deterministically inherited at build time from certified Quarterstaff/Spear, drift-guarded by test; thrown range = global thrown-weapons table), `whip-melee` (1d4 piercing, reach 2), `whip-pin` and `whip-trip` (special; require a proficient wielder, not the feats), `venom-spit` (special, 10 sq, standard, 1/24 h, hits both defenses → −1 persistent CT); `modeProfiles` both-ends −10; poison condition-track `triggeredEffects`; `conditionalQualities[].when.configurationId` added beside the prose |
| **Atlatl** | correct data | only melee `primary` | **Amended:** `launcher` profile (ranged, simple-weapons range, damage `varies-by-payload`), `payloadProfiles[energy-ball]` copied programmatically from certified `weapon-energy-ball` (2d8 energy), `ammo` scoped to `launcher`. Melee 2d4 stays on `primary`; Gungan route preserved |
| **Cesta** | correct data | only melee `primary` (reach) | Same as Atlatl; launcher profile `Accurate` per the Energy Ball cesta rule; staff melee unchanged |
| **Electropole** | verify first | **melee + thrown profiles already existed**; only the Gungan route was prose (`condition`) | **Amended:** `proficiencyRules[0].species = "Gungan"` (existing key used by other rules). Resolver now treats a structured Phase 3B alternate route with `species` + `classifications` as a species route |
| **Shock Stick** | configuration, not profile | one native-stun profile; `operation.bayonetMount…Waives…` already structured | **Amended:** `configurationStates` `handheld` (default) / `mounted-bayonet`. No second profile. Resolver: waiver applies only while `mounted-bayonet`; host-rifle proficiency is a **PROMPT** (or `context.hostRifleProficient`) |
| **Vibrobayonet** | configuration-driven | one mounted 2d6 profile; `detachedTreatAs:"Vibrodagger"` was a bare string | **Amended:** configurations `mounted-on-rifle` (default) / `detached`; `wieldingRules` (two hands; unavailable with folded stock); `primary` gated to `mounted-on-rifle`; `operation.mountedOnRifle` gains threat/AoO flags; `operation.configurationResolution.detached → {weapon-vibrodagger, primary}`. Resolver **delegates** `detached` to the certified Vibrodagger attack; identity stays Vibrobayonet; no stats duplicated |
| **PLX-2M** | operating modes | 3B **already** had `modeProfiles direct/heat-seeking/gravity-activated → area-missile` with conditional modifiers | **No data change.** 5B’s reconciliation ignored `modeProfiles`; fixed in the reconciler. One profile, three operating modes (`modeId`, validated; unknown → error) |

No new schema field was introduced. New values live only in open-vocabulary containers (`operation.*` keys, `activationRequirements[].type` values `configuration`/`proficiency`/`usage-limit` with keys `uses`/`per`, `conditionalQualities[].when.configurationId`); the consumption map classifies them with zero orphans.

## 4. Runtime reconciliation (unwired)

* `ResolvedWeapon.profiles[].availableIn` (configuration gating), `delegatedFrom` (configuration delegation), `operatingModes`, `selection.{configurationId, modeId}`.
* Default profile = first profile available in the default configuration (`operatingModes.default` preferred). Explicit unknown profile/payload/configuration/mode → error; explicit profile unavailable in the current configuration → `profile-unavailable-in-configuration`.
* Payload-owned launcher damage proven for Atlatl/Cesta (`2d8` energy payload vs `2d4` melee).
* Proficiency: Gungan route on Electropole (melee+thrown), Atlatl/Cesta (melee+launcher); exact Exotic identity across every Amphistaff profile; mounted-bayonet waiver with prompt.

## 5. Hybrid condition policy (planner ruling 3)

`scripts/items/weapon-runtime/condition-policy.js` — **AUTO** (structured game state, no prompt), **PROMPT** (real condition the runtime cannot observe; answer stored once in the `AttackWorkflowContext`), **UNSUPPORTED** (temporary only; 5J requires 0). Every canonical condition value is registered by *exact value* with a structured predicate; natural-language text is never parsed (a paraphrase evaluates to UNSUPPORTED, tested). AUTO nodes whose context key is absent degrade to a pending PROMPT instead of a silent true/false.

Census (`weapon-phase-5b-r-condition-policy-census.json`): 109 distinct condition values in executable paths → 98 AUTO, 11 PROMPT, 0 UNSUPPORTED; activation-requirement types all registered. Honest limits: the evaluator exists and is tested but **no combat consumer calls it yet** (5C+), and several AUTO predicates need context the live workflow does not yet produce (e.g. `braced`, `mounted`, `aimedBeforeAttack`, `blockChecksThisRound`); those become PROMPTs until the workflow supplies them.

## 6. Item-sheet contract for 5G (planner ruling 2 — recorded, not implemented)

* Canonical-linked Item: **mutable state only** — equipped, quantity, current ammo, loaded payload, configuration, selected mode, one/two-handed where permitted, installed upgrades, custom nickname. Everything else (identity/name, group, proficiency, damage, dice, die size, damage types, range, ROF, capacity, weight, cost, availability, qualities, reach, critical/area rules, selectors, tags, special mechanics, source/page) is rendered read-only from `ResolvedWeapon`.
* GM-only **Create Custom Copy / Detach From Canonical Authority** produces an editable Item that loses the canonical link and uses the legacy/custom adapter. No silent canonical divergence.

## 7. Open items for the planner

1. `PROFICIENCY_ROUTE` as a fifth typed value (alternative: move the Electropole descriptor out of the 4H `modes` list in a 4H amendment).
2. 20 identities carry `alternateRoutesPhase3B` entries with no `species` (condition-only, e.g. Sith Sword). They are not auto-applied; each needs a structured predicate or an explicit PROMPT policy before 5C proficiency migration.
3. The AUTO context vocabulary (§5) is a contract for the 5C/5D attack workflow to produce.

## 8. Planner-supplied source authority (applied)

The planner's per-weapon source ruling was applied on top of §3. Differences resolved by *proving against the certified records*:

| Planner point | Outcome |
|---|---|
| Amphistaff quarterstaff/spear forms should inherit canonical mechanics, not duplicate | Inherited **deterministically at build time** (programmatic copy of damage/type/qualities from certified Quarterstaff/Spear; each profile note names its source; `tests/weapon-runtime-5br-reconciliation.test.mjs` fails if they ever diverge). Runtime configuration delegation (Vibrobayonet → Vibrodagger) is generic (`operation.configurationResolution`), not name-based; extending it to multi-profile inheritance would need a new overlay structure, so it was not done |
| Whip Pin and Trip are separate alternatives | Split into `whip-pin` and `whip-trip` special profiles (previously one `whip-pin-trip`) |
| Spear-thrown / Electropole-thrown use global thrown rules | `thrown-weapons` global range profile; no weapon-specific table |
| **Persistent wording** | Planner text says “−1 step” for whip and venom spit; the certified Phase 1/2 text says “−1 persistent step” (spear) and “the same poison condition-track effect” (whip, venom). Certified wording kept (`persistent:true`) — **planner to confirm** |
| Amphistaff Yuuzhan Vong familiarity “where applicable” | Not present in the certified Amphistaff proficiency authority (`proficiencyRules` empty; only the exact Exotic feat) — nothing invented. Planner to supply it as structured data if wanted |
| Vibrobayonet “Core double-weapon interaction for a rifle with a mounted bayonet” | No certified 3B/4H record carries that interaction (no identity text/operation mentions it); not invented. Candidate planner data item |
| Atlatl `melee`/`energy-ball-launcher`, Cesta `staff-melee`/`energy-ball-launcher`, Shock Stick `rifle-mounted`, Amphistaff `whip-melee` | Conceptual names; repo ids kept to match the 4H selector ids the reconciler joins on (`primary`+`launcher`, `mounted-bayonet`, …). Energy Ball range = `simple-weapons` global table, Accurate only for Cesta |
| PLX-2M, Electropole | Already complete in 3B (modeProfiles with −2 Reflex by target category; melee+thrown profiles, 2d8 stun, energy-cell resource, microrepulsorlift encumbrance exception); no data change beyond the Electropole structured Gungan route |
| The 52 repo-missing weapons | Untouched; their canonical data is already in the registry for the production-convergence phase |
