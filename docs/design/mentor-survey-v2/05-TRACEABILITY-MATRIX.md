# Traceability Matrix

Status vocabulary: `Planned` · `Implemented` · `Tested (offline)` · `Blocked` · `Deferred` (rules register). **No row is `Foundry tested`**: no live Foundry runtime is available in this environment (see manual procedures in `06`).
Tests are `tests/mentor-survey-*.test.mjs` (run with `node --test`). Each test title starts with its requirement ID so this table can be machine-checked by `tests/mentor-survey-traceability.test.mjs`.

## Shared (`SV`)

| ID | Requirement | Source | Implementation | Directive acceptance # | Status |
|---|---|---|---|---|---|
| SV-01 | Clean cutover; no migrations/shims/fallbacks/dual schemas | Directive §1; §39.4-C | deleted legacy modules; cutover test | 19 | Planned |
| SV-02 | Four authority lanes never conflated | v0.9 §13; Q6 handoff §3.4 | `contract.js`, `intent-ledger.js` | 13,15 | Planned |
| SV-03 | Browsing/declining/skipping records no intent or negative inference | v0.9 §13; L1 v0.19 §12.4 | `survey-session.js` | 7,8 | Planned |
| SV-04 | Single module layout, no parallel authority | Directive §3 | `scripts/mentor/mentor-survey/*` | 19 | Planned |
| SV-05 | Stable IDs for surveys/questions/responses/scenarios/branches | Directive §C | `contract.js`, packs | 3 | Planned |
| SV-06 | Runtime content from approved definitions + canonical refs (IDs validated vs ArchetypeRegistry) | Directive §C | `content-store.js` | 1,2,3 | Planned |
| SV-07 | All player-selectable text first person | Directive §2; display contract | content validator | 5 | Planned |
| SV-08 | No tag IDs/scores/internal metadata in view-models (allow-list) | Directive §2 | `content-store.js` view builder | 6 | Planned |
| SV-09 | Release gate: draft/withheld content never ships by default; no legacy fallback | Prompt "do not promote draft" | `release-manifest.json` | 1 | Planned |
| SV-10 | One persistence owner: finalizer-written ledger; drafts only in session | Directive §C | `intent-ledger.js`, finalizer | 16 | Planned |
| SV-11 | Duplicate submit idempotent (deterministic eventId; actionSeq) | Directive §C | ledger, session | 20 | Planned |
| SV-12 | Cancel/fail leaves no completed event, goal change or bias | Directive §C | finalizer integration | 16 | Planned |
| SV-13 | Optional, skippable, cancelable, revisitable, back-navigable, deterministic | Directive §C | `survey-session.js` | 7,9,10 | Planned |
| SV-14 | Read-only provenance-backed actor evidence projection | Directive §C | `actor-evidence.js` | 14 | Planned |
| SV-15 | No inferred ownership from responses/pending/eligibility/recommendations | Directive §C | `actor-evidence.js` | 14 | Planned |
| SV-16 | Typed inert tag boundary | Directive §7 | `tag-boundary.js` | 18 | Planned |
| SV-17 | All surveys finish/skip/revisit with zero mechanical signal | Directive §7 | tests | 18 | Planned |
| SV-18 | Shared reflection engine (Multiclass + Prestige, reusable) | Directive §C | `reflection.js` | 14 | Planned |
| SV-19 | ≤3 real observations; honest thin evidence | Q6 handoff §3.1 | `reflection.js` | 14 | Planned |
| SV-20 | Declared ambition quoted separately; honest absence | Q6 handoff §3.1 | `reflection.js` | 13 | Planned |
| SV-21 | A–E responses; B/C targeted; D/E mandatory NOT and AM; A no-op | Q6 handoff §3.2 | `reflection.js` | 14,15 | Planned |
| SV-22 | Counts are caps; no fabricated options | Q6 handoff §3.2 | `reflection.js` | 14 | Planned |
| SV-23 | Correction cannot change owned mechanics, goals or legality | Q6 handoff §3.2 | `reflection.js` | 15 | Planned |
| SV-24 | Declining an identity is not a negative inference | Directive §C | `reflection.js` | 17 | Planned |
| SV-25 | Retakes supersede; never multiply bias or erase goals | Directive §C | `intent-ledger.js` reducer | 17 | Planned |
| SV-26 | A–E text first person; no percentages/labels | Q6 handoff §3.2 | content validator | 5,6 | Planned |
| SV-27 | Goal fulfillment only when typed goal equals finalized class state | Q6 handoff §3.1 | `reflection.js` | 13,14 | Planned |
| SV-28 | Mentor routing from canonical registry; fail closed | Directive §B | `resolvers/*`, registry | 4 | Planned |
| SV-29 | Navigation is UI-only; bounded caches keyed by contextRevision | Prefs "Performance" | `survey-session.js` | 20 | Planned |

## Level 1 (`L1`)

| ID | Requirement | Source | Implementation | Acc. | Status |
|---|---|---|---|---|---|
| L1-01 | Optional; never restricts legal chargen | v0.19 §1; handoff A | `l1.js` resolver | 7 | Planned |
| L1-02 | Exactly five questions; no sixth | v0.19 | `l1.js` | 1 | Planned |
| L1-03 | Class→Mentor: Jedi Miraj, Noble J0-N1, Scoundrel Ol' Salty, Scout Lead, Soldier Breach | v0.19 §A | `l1.js` | 4 | Planned |
| L1-04 | Reads pending session context | handoff §E | `l1.js` | 20 | Planned |
| L1-05 | Fixed Mentor intros, not generated | v0.10 §1.4 | content | 4 | Planned |
| L1-06 | Q2: 97 parents, all reachable; IDs validated vs registry | v0.12 §12 | `l1.js` | 8 | Planned |
| L1-07 | Q2 A/B anchors (20), C/D/E next three, F pages never repeat | v0.12 §12.1–.3 | `l1.js` | 8 | Planned |
| L1-08 | Browse/F/skip create zero intent | v0.12 §12.3–.4 | session | 7,8 | Planned |
| L1-09 | Q2 ranking coefficients | v0.19 §12 | **Deferred** MSV-RD-001 | — | Deferred |
| L1-10 | Q2 preserves unusual careers | Directive §3 | `l1.js` | 8 | Planned |
| L1-11 | Q3 keyed by class+Q1 `responseId` (+undecided route) | v0.13 §13 | `l1.js` | 9 | Planned |
| L1-12 | Q4 keyed only by exact Q2 parent; Q3 never changes Q4 | v0.18 | `l1.js` | 9,10 | Planned |
| L1-13 | Q4 composition 0 / 1–4 / 5 / >5 children, no repeats, species restriction only | v0.18 | `l1.js` | 9 | Planned |
| L1-14 | Q4 personalization by Q3 tags | v0.18 P0 | **Blocked** MSV-RD-002 | — | Blocked |
| L1-15 | Lifecycle (skip/cancel/back/revisit/invalidate) | handoff G6 | session | 7,10 | Planned |
| L1-16 | Q5 long-term ambition, 25 answers; no grants | v0.19 | `l1.js` | 1 | Planned |

## Multiclass (`MC`)

| ID | Requirement | Source | Implementation | Acc. | Status |
|---|---|---|---|---|---|
| MC-01 | Trigger on first acquisition of a new foundation class only | v0.9/v0.11 | `multiclass.js` trigger | 2 | Planned |
| MC-02 | Destination Mentor narrates | v0.11 | resolver | 4 | Planned |
| MC-03 | 20 directed transitions route correctly | v0.11 | resolver | 2 | Planned |
| MC-04 | Origin keying with ≥2 prior foundation classes | — | **Deferred** MSV-RD-004 (fail closed) | 2 | Deferred |
| MC-05 | Fixed intros, not generated | v0.11 | content | 4 | Planned |
| MC-06 | Q3 four fixed answers, same everywhere | v0.11 Q3 | resolver | 11 | Planned |
| MC-07 | Depth never a level lock; undecided infers nothing | v0.11 Q3 §4,§1 | ledger | 11 | Planned |
| MC-08 | Bridge separate from depth | v0.11 Q3 §3 | resolver/ledger | 12 | Planned |
| MC-09 | Dive/Swim never demote/erase/prune | v0.11 Q3 §5 | ledger | 17 | Planned |
| MC-10 | Q4 scene by exact Q1 id → family; Q3/Q2 never change scene | v0.11 Q4 | resolver | 9 | Planned |
| MC-11 | Q5 career change → `exploring_change` only | v0.11 Q5 §9 | resolver | 13 | Planned |
| MC-12 | Observations only from finalized evidence; new class pending | v0.11 | evidence | 14 | Planned |
| MC-13 | Commit only on finalizer success | Directive §C | finalizer | 16 | Planned |
| MC-14 | Q6 via shared engine | v0.11 | reflection | 14 | Planned |

## Prestige (`PR`)

| ID | Requirement | Source | Implementation | Acc. | Status |
|---|---|---|---|---|---|
| PR-01 | Prestige is an earned milestone; no forced next goal | Q6 handoff §2 | resolver | 13 | Planned |
| PR-02 | 32 classes resolve to exact Mentors; fail closed | handoff §6 | resolver | 3,4 | Planned |
| PR-03 | Pending vs finalized tense | handoff §8.1 | resolver | 16 | Planned |
| PR-04 | Evidence only from finalized state | handoff §8.7 | evidence | 14 | Planned |
| PR-05 | Q1 stores answer + snapshot pointer; no grants/goals | §39.4-D | resolver | 18 | Planned |
| PR-06 | Q4 depth no weighting/pruning; Bridge separate | v0.26 §39 | ledger | 11,12 | Planned |
| PR-07 | Q5 purposes; secondary has no weight; goal only on affirm | Q5 editorial | resolver | 13 | Planned |
| PR-08 | Multiple prestige acquisitions independent | handoff §8.5 | ledger | 13 | Planned |
| PR-09 | Level-20 / low budget: no implied advancement | handoff §8.6 | resolver | 13 | Planned |
| PR-10 | Quarantined mechanics never enabled | §39.3 | content gate | 1 | Planned |
| PR-11 | Prestige Q6 per-class dialogue | handoff (NEXT) | **Blocked** missing artifact | — | Blocked |
