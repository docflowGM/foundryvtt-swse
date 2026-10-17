# SWSE Vehicle Phase 2C — Checkpoint 2: Cross-Book Evidence and Runtime Research

**Status: RESEARCH ONLY. No policy approval, production mutation, strict certification or schema freeze is implied.**

Reference GitHub branch: `audit/vehicle-phase-0-1-canonical-foundation` at `eb49083a2947fb49d969609098a50b296930b00f`.

## Inventory

| Book | Reviewed ship claims | Attack groups | Discovery cases | Printed conflicts* |
|---|---:|---:|---:|---:|
| Starships of the Galaxy | 104 | 258 | 155 | not normalized |
| Clone Wars Campaign Guide | 41 | 79 | 44 | 1 |
| Legacy Era Campaign Guide | 39 | 92 | 74 | 5 |
| Rebellion Era Campaign Guide | 35 | 72 | 71 | 4 |
| Knights of the Old Republic Campaign Guide | 32 | 69 | 84 | 7 |
| Force Unleashed Campaign Guide | 19 | 41 | 39 | 5 |
| Unknown Regions | 12 | 22 | 35 | 2 |
| Scum and Villainy | 11 | 21 | 32 | 1 |
| Core Rulebook | 10 | 22 | 36 | 2 |
| Galaxy at War | 5 | 13 | 18 | 1 |
| Galaxy of Intrigue | 6 | 9 | 23 | 2 |
| Jedi Academy Training Manual | 1 | 1 | 4 | 0 |
| Scavenger's Guide to Droids | 0 | 0 | 0 | 0 |
| Threats of the Galaxy | 1 | 1 | 3 | 0 |
| **Total** | **316** | **700** | **618** | **30+** |

*30 is the count outside SotG. The SotG source review records conflicts in a different format. Thus 30+ is a lower bound, not a normalized project total.*

These are original source-specific claims; the newly noticed Hornet and Deep-X are not in the original denominator. The 618 discovery cases may duplicate themes and are not 618 independent production bugs. Only four SotG records have strict field-and-mount certificates.

## Static source-to-runtime risk evidence

### R01: Negative weapon bonuses clamped to zero
**File:** `scripts/engine/import/vehicle-weapon-import-normalizer.js`, lines 252–258.

Text parser converts the extracted attack bonus using `+${Math.max(0, bonus)}`; a printed -2 is converted to +0.

**Implication:** Must preserve signed published values, with no authority inferred from reparsed output.

### R02: Unknown weapon arc in targeting logic
**File:** `scripts/combat/systems/vehicle/vehicle-weapons.js`, lines 47–74.

inFireArc defaults `arc='forward'`; any unsupported arc falls through to `return true`.

**Implication:** Unknown/source-silent arc is not the same as forward or unrestricted firing; target eligibility needs an explicit policy and failure status.

### R03: Source-silent stats can become defaults
**File:** `scripts/engine/import/vehicle-import-normalizer.js`, lines 23–27.

safeNumber coerces invalid numeric inputs to a default 0; the broader normalizer is designed to coerce legacy values for rendering.

**Implication:** Authority ingest must have an evidence-aware strict stage before display/legacy normalization; do not modify current live Actor behavior based on this static observation alone.

### R04: Crew station resolution already distinguishes ambiguity
**File:** `scripts/sheets/v2/vehicle-sheet/weapon-station-mapping.js`, lines 26–65.

Explicit station keys win; missing role mapping becomes `unmapped`; multiple role matches become `ambiguous` rather than choosing a gunner.

**Implication:** Reuse this existing fail-closed station resolver when vehicle weapon mounts are reconciled.

### R05: Shipyard data uses default shields and weapon rows
**File:** `scripts/engine/vehicles/vehicle-factory.js`, lines 183–250.

Build logic reads a fallback 0 shield rating, derives shipyard weapons and preserves existing hyperdrive strings.

**Implication:** Separate canonical stock data certification from mutable shipyard build state; do not treat this as proof production currently ingests the new audit ledger.

### R06: Crew-scoped gunnery authority already exists
**File:** `scripts/engine/combat/vehicle-attack-math.js`, lines 1–55.

Vehicle attack math distinguishes resolved gunner BAB from vehicle Intelligence and separates abstract crew quality.

**Implication:** Reuse the attack-math authority rather than storing printed stock crew bonuses as intrinsic weapon bonuses.

## Decision requests (proposals, not resolutions)

### P2C-D01: Reconcile two omitted printed starships

**Recommended: APPROVE** — Approve a corrective, append-only supplemental census that raises publication-claim scope from 316 to 318 *after* independent source close-read and stable ID checks for Deep-X Explorer and Hornet-class Interceptor. Keep the historical 316 Phase 1 file immutable; do not add narrative-only configurations as ship identities.

**Reason:** Both have independent published CL statblocks and were omitted from the historical roster. Changing the frozen Phase 1 file would destroy provenance.

**User action:** Approve / Deny / Other (written correction). Current state: AWAITING_USER_APPROVAL.

### P2C-D02: Unknown mounts, arcs, and attack groups

**Recommended: APPROVE** — Approve two-stage certification: (a) source-complete fact/attack-group record where all printed fields are reconciled and explicit silence is documented, (b) operationally certified only when target/crew rules have sufficient evidence. Never invent physical mount counts or fire arcs; a missing arc blocks automatic arc-dependent eligibility, with a clearly logged GM override allowed at runtime.

**Reason:** 700 attack-group rows are not 700 physical mounts. The runtime currently has a forward-arc default and an unknown-arc permissive fallthrough; neither should decide canonical silence.

**User action:** Approve / Deny / Other (written correction). Current state: AWAITING_USER_APPROVAL.

### P2C-D03: Resolve contradictory printed rules

**Recommended: APPROVE** — Keep all conflicting literal printed values with page/field provenance and a PUBLISHED_CONFLICT flag. Do not choose a canonical numeric result without published errata or a separately approved adjudication. Permit a temporary, recorded GM choice for a game instance; it must not mutate the canonical claim.

**Reason:** At least 30 conflicts are documented outside the Starships of the Galaxy book, including bonus discrepancies and ambiguous hardware lines.

**User action:** Approve / Deny / Other (written correction). Current state: AWAITING_USER_APPROVAL.

## Proposed next engineering tasks after policy decisions

1. Implement only audit/schema tests for the selected evidence semantics; establish independent publication entry IDs for the two omitted ship claims after reviewing their complete statblocks.
2. Factor a typed weapon model with separately identifiable `attackGroup`, `physicalWeapon`, `battery`, `mount`, `operatorStation`, and `configurationState` objects; never equate their cardinalities without direct evidence.
3. Make import and combat adapters preserve negative bonuses, explicit source-silence, unresolved arcs and operator ambiguity; reuse existing authoritative attack math and crew-station resolver. Replace old competing paths atomically only after consumer inventory and tests.
4. Fix historical Phase0B fixture/schema-version and null semantics regression gate without fabricating missing source values. Only then design new strict operational certification and consider Phase3 hydration.

## QA boundaries

The included validator tests 9 local cumulative discovery JSON manifests, the Phase2C CP1 JSON state set, 316/700/618 arithmetic, and that no proposed user decision is marked approved. Three other books and SotG use source manifest counts and Git blob IDs verified from GitHub. It is not a full Foundry runtime test or independent recertification of the 316 statblocks.