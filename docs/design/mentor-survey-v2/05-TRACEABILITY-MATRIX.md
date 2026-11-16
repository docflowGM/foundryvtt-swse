# Traceability Matrix

Status vocabulary: `Planned` · `Implemented` · `Tested (offline)` · `Blocked` · `Deferred` (rules register). **No row is `Foundry tested`**: no live Foundry runtime is available in this environment (see the manual acceptance procedure in `06`). "Tested (offline)" means Node tests of the pure logic and file wiring, not a Foundry session.
Tests are `tests/mentor-survey-*.test.mjs` (run with `node --test`). Each test title starts with its requirement ID so this table can be machine-checked by `tests/mentor-survey-traceability.test.mjs`.

## Shared (`SV`)

| ID | Requirement | Source | Implementation | Directive acceptance # | Status |
|---|---|---|---|---|---|
| SV-01 | Clean cutover; no migrations/shims/fallbacks/dual schemas | Directive §1; §39.4-C | deleted legacy modules; cutover test | 19 | Tested (offline) |
| SV-02 | Four authority lanes never conflated | v0.9 §13; Q6 handoff §3.4 | `contract.js`, `intent-ledger.js` | 13,15 | Tested (offline) |
| SV-03 | Browsing/declining/skipping records no intent or negative inference | v0.9 §13; L1 v0.19 §12.4 | `survey-session.js` | 7,8 | Tested (offline) |
| SV-04 | Single module layout, no parallel authority | Directive §3 | `scripts/mentor/mentor-survey/*` | 19 | Planned |
| SV-05 | Stable IDs for surveys/questions/responses/scenarios/branches | Directive §C | `contract.js`, packs | 3 | Tested (offline) |
| SV-06 | Runtime content from approved definitions + canonical refs (IDs validated vs ArchetypeRegistry) | Directive §C | `content-store.js` | 1,2,3 | Planned |
| SV-07 | All player-selectable text first person | Directive §2; display contract | content validator | 5 | Tested (offline) |
| SV-08 | No tag IDs/scores/internal metadata in view-models (allow-list) | Directive §2 | `content-store.js` view builder | 6 | Tested (offline) |
| SV-09 | Release gate: draft/withheld content never ships by default; no legacy fallback | Prompt "do not promote draft" | `release-manifest.json` | 1 | Tested (offline) |
| SV-10 | One persistence owner: finalizer-written ledger; drafts only in session | Directive §C | `intent-ledger.js`, finalizer | 16 | Tested (offline) |
| SV-11 | Duplicate submit idempotent (deterministic eventId; actionSeq) | Directive §C | ledger, session | 20 | Tested (offline) |
| SV-12 | Cancel/fail leaves no completed event, goal change or bias | Directive §C | finalizer integration | 16 | Tested (offline) |
| SV-13 | Optional, skippable, cancelable, revisitable, back-navigable, deterministic | Directive §C | `survey-session.js` | 7,9,10 | Tested (offline) |
| SV-14 | Read-only provenance-backed actor evidence projection | Directive §C | `actor-evidence.js` | 14 | Tested (offline) |
| SV-15 | No inferred ownership from responses/pending/eligibility/recommendations | Directive §C | `actor-evidence.js` | 14 | Tested (offline) |
| SV-16 | Typed inert tag boundary | Directive §7 | `tag-boundary.js` | 18 | Tested (offline) |
| SV-17 | All surveys finish/skip/revisit with zero mechanical signal | Directive §7 | tests | 18 | Tested (offline) |
| SV-18 | Shared reflection engine (Multiclass + Prestige, reusable) | Directive §C | `reflection.js` | 14 | Tested (offline) |
| SV-19 | ≤3 real observations; honest thin evidence | Q6 handoff §3.1 | `reflection.js` | 14 | Tested (offline) |
| SV-20 | Declared ambition quoted separately; honest absence | Q6 handoff §3.1 | `reflection.js` | 13 | Tested (offline) |
| SV-21 | A–E responses; B/C targeted; D/E mandatory NOT and AM; A no-op | Q6 handoff §3.2 | `reflection.js` | 14,15 | Tested (offline) |
| SV-22 | Counts are caps; no fabricated options | Q6 handoff §3.2 | `reflection.js` | 14 | Tested (offline) |
| SV-23 | Correction cannot change owned mechanics, goals or legality | Q6 handoff §3.2 | `reflection.js` | 15 | Tested (offline) |
| SV-24 | Declining an identity is not a negative inference | Directive §C | `reflection.js` | 17 | Tested (offline) |
| SV-25 | Retakes supersede; never multiply bias or erase goals | Directive §C | `intent-ledger.js` reducer | 17 | Tested (offline) |
| SV-26 | A–E text first person; no percentages/labels | Q6 handoff §3.2 | content validator | 5,6 | Planned |
| SV-27 | Goal fulfillment only when typed goal equals finalized class state | Q6 handoff §3.1 | `reflection.js` | 13,14 | Tested (offline) |
| SV-28 | Mentor routing from canonical registry; fail closed | Directive §B | `data/mentor-survey/class-mentor-routes.json`, registry (Kharjo added) | 4 | Tested (offline) — `mentor-survey-canonical-authority.test.mjs` |
| SV-29 | Navigation is UI-only; bounded caches keyed by contextRevision | Prefs "Performance" | `survey-session.js` | 20 | Planned |

## Level 1 (`L1`)

| ID | Requirement | Source | Implementation | Acc. | Status |
|---|---|---|---|---|---|
| L1-01 | Optional; never restricts legal chargen | v0.19 §1; handoff A | `l1.js` resolver | 7 | Tested (offline) |
| L1-02 | Exactly five questions; no sixth | v0.19 | `l1.js` | 1 | Tested (offline) |
| L1-03 | Class→Mentor: Jedi Miraj, Noble J0-N1, Scoundrel Ol' Salty, Scout Lead, Soldier Breach | v0.19 §A | routes JSON | 4 | Tested (offline) |
| L1-04 | Reads pending session context | handoff §E | `l1.js` | 20 | Tested (offline) |
| L1-05 | Fixed Mentor intros, not generated | v0.10 §1.4 | content | 4 | Tested (offline) |
| L1-06 | Q2: 97 parents, all reachable; IDs validated vs registry | v0.12 §12 | `l1.js` | 8 | Tested (offline) |
| L1-07 | Q2 A/B anchors (20), C/D/E next three, F pages never repeat | v0.12 §12.1–.3 | `l1.js` | 8 | Tested (offline) |
| L1-08 | Browse/F/skip create zero intent | v0.12 §12.3–.4 | session | 7,8 | Tested (offline) |
| L1-09 | Q2 ranking coefficients | v0.19 §12 | **Deferred** MSV-RD-001 | — | Deferred |
| L1-10 | Q2 preserves unusual careers | Directive §3 | `l1.js` | 8 | Tested (offline) |
| L1-11 | Q3 keyed by class+Q1 `responseId` (+undecided route) | v0.13 §13 | `l1.js` | 9 | Tested (offline) |
| L1-12 | Q4 keyed only by exact Q2 parent; Q3 never changes Q4 | v0.18 | `resolvers/l1.js`, `l1-controller.js` | 9,10 | Tested (offline) |
| L1-13 | Q4 composition 0 / 1–4 / 5 / >5 children, no repeats, species restriction only | v0.18 | `l1.js` | 9 | Tested (offline) |
| L1-14 | Q4 personalization by Q3 tags | v0.18 P0 | **Blocked** MSV-RD-002 | — | Blocked |
| L1-15 | Lifecycle (skip/cancel/back/revisit/invalidate) | handoff G6 | session | 7,10 | Tested (offline) |
| L1-16 | Q5 long-term ambition, 25 answers; no grants | v0.19 | `l1.js` | 1 | Tested (offline) |

## Multiclass (`MC`)

| ID | Requirement | Source | Implementation | Acc. | Status |
|---|---|---|---|---|---|
| MC-01 | Trigger on first acquisition of a new foundation class only | v0.9/v0.11 | `multiclass.js` trigger | 2 | Tested (offline) |
| MC-02 | Destination Mentor narrates | v0.11 | routes JSON + resolver | 4 | Tested (offline, routing only) |
| MC-03 | 20 directed transitions route correctly | v0.11 | resolver | 2 | Tested (offline) |
| MC-04 | Two or more prior foundation classes: the player chooses the origin lens (q0) among owned classes; destination Mentor narrates; others stay in Q2/Q6 evidence | owner ruling MSV-RD-004 | `effectiveOrigin`, q0 | 4 | Tested (offline) |
| MC-05 | Fixed intros, not generated | v0.11 | content | 4 | Tested (offline) |
| MC-06 | Q3 four fixed answers, same everywhere | v0.11 Q3 | resolver | 11 | Tested (offline) |
| MC-07 | Depth never a level lock; undecided infers nothing | v0.11 Q3 §4,§1 | ledger | 11 | Tested (offline) |
| MC-08 | Bridge separate from depth | v0.11 Q3 §3 | resolver/ledger | 12 | Tested (offline) |
| MC-09 | Dive/Swim never demote/erase/prune | v0.11 Q3 §5 | ledger | 17 | Tested (offline) |
| MC-10 | Q4 scene by exact Q1 id → family; Q3/Q2 never change scene | v0.11 Q4 | resolver | 9 | Tested (offline) |
| MC-11 | Q5 career change → `exploring_change` only | v0.11 Q5 §9 | no authored answer declares a change; career-continuity template withheld (MSV-RD-009) | 13 | Deferred |
| MC-12 | Q2: A-D only for strengths with actor provenance (owned item or trained skill); E and F always; neutral focus; no new scorer | v0.11; owner ruling MSV-RD-007 | `resolveQ2`, `computeObservedBehaviorBiasProvenance` | 14 | Tested (offline); phrases are draft (approval pending) |
| MC-13 | Commit only on finalizer success | Directive §C | finalizer | 16 | Tested (offline) |
| MC-14 | Q6 via shared engine | v0.11 | Pass A (170 clauses) and Pass B imported; five Mentor frames; mandatory NOT/AM; answer B withheld (MSV-RD-011) | 14 | Implemented, Tested (offline); calibration offer blocked on approval pending |

## Prestige (`PR`)

| ID | Requirement | Source | Implementation | Acc. | Status |
|---|---|---|---|---|---|
| PR-01 | Prestige is an earned milestone; no forced next goal | Q6 handoff §2 | resolver | 13 | Tested (offline) |
| PR-02 | 32 classes resolve to exact Mentors; fail closed | handoff §6 | routes JSON | 3,4 | Tested (offline) |
| PR-03 | Pending vs finalized tense | handoff §8.1 | resolver | 16 | Tested (offline) |
| PR-04 | Evidence only from finalized state | handoff §8.7 | evidence | 14 | Tested (offline) |
| PR-05 | Q1 stores answer + snapshot pointer; no grants/goals | §39.4-D | Q1 not imported (slate policy unapproved, MSV-RD-005) | 18 | Blocked (Q1) |
| PR-06 | Q4 depth no weighting/pruning; Bridge separate | v0.26 §39 | ledger | 11,12 | Tested (offline) |
| PR-07 | Q5 purposes; secondary has no weight; goal only on affirm | Q5 editorial | `resolvers/prestige.js`; goal conversation deferred (MSV-RD-010) | 13 | Tested (offline): purposes and optional second purpose only; the goal-affirmation conversation is deferred (MSV-RD-010) |
| PR-08 | Multiple prestige acquisitions independent | handoff §8.5 | ledger | 13 | Tested (offline) |
| PR-09 | Level-20 / low budget: no implied advancement | handoff §8.6 | resolver | 13 | Tested (offline) |
| PR-10 | Quarantined mechanics never enabled | §39.3 | content gate; `q1Offerable` | 1 | Tested (offline): 35 marker-flagged Q1 rows are never offered, even in preview; per-route flags beyond the markers live in an uncommitted JSON (see 10 report) |
| PR-11 | Prestige Q6 per-class Mentor dialogue | handoff (NEXT) | Editorial enhancement: source package not in Git (never reconstructed); the shared reflection runs with a neutral frame meanwhile | — | Deferred (editorial dependency) |
| SV-18 | ONE Mentor's Reflection for Multiclass and Prestige: same engine, A-E, B/C, NOT/AM, authority, ledger; identical evidence gives identical assessment | owner direction 2026-11-16 | `reflection-q6.js`, `reflection-q6.json` | 14,15 | Tested (offline) |

## Survey influence (addendum; `SV-30`…`SV-42`)

| ID | Requirement | Source | Implementation | Status |
|---|---|---|---|---|
| SV-30 | One typed config; initial authority Prestige 1.20 > Multiclass 0.90 > L1 0.65; half-life L1 8 > Multiclass 4 > Prestige 3; provisional | Addendum §2; v0.9 §7 (illustrative A values superseded by owner) | `SURVEY_INFLUENCE_CONFIG` | Tested (offline) |
| SV-31 | `D=2^-(L-Ls)/H`, `W=A·D`; exactly half at own half-life; age never negative | Addendum §1; v0.9 §7.2 | `survey-influence.js` | Tested (offline) |
| SV-32 | Each completed survey is an independent clock; a new survey never resets an older one | Addendum §1 | per-event `eventContributions` | Tested (offline) |
| SV-33 | Different surveys reinforce the same tag with separate provenance | Addendum §3; v0.9 §7.3 | `computeSurveyInfluence` | Tested (offline) |
| SV-34 | `R(n)=1+0.15·min(n-1,3)` once; duplicate aliases count once per question | Addendum §3 | `certifiedEvidenceByTag` | Tested (offline) |
| SV-35 | Retake/reopen/cancel/duplicate finalize never multiply influence; preview excluded | Addendum §9 | ledger supersession + `activeSurveyEvents` | Tested (offline) |
| SV-36 | Uncertified, unmapped, neutral, skipped, typed answers contribute nothing; empty ontology fails closed | Addendum §5 | `registerOntologyTags` gate | Tested (offline) |
| SV-37 | Survey-channel cap: event count cannot exceed the bound | Addendum §3 | `channel` policy | Tested (offline) |
| SV-38 | Declared goals do not decay; owned mechanics are never read or decayed by survey math | Addendum §4 | `declaredGoals` | Tested (offline) |
| SV-39 | Q6 calibration is a separate authority, inferred-only, coefficients unapproved (no-op) | Addendum §7 | `applyCalibration` | Tested (offline) |
| SV-40 | `F(E)=1-e^{-E/k}` configurable, bounded, never a probability; deterministic at levels 1/2/5/10/12/15/20 | Addendum §8, §9 | `saturate` | Tested (offline) |
| SV-41 | Integration: legacy shared-decay path removed; golden-build identity bias unchanged without certified evidence; bounded channel reaches `tag-signal-engine`; diagnostic breakdown | Addendum §6, §10 | `IdentityEngine.computeSurveyTagAffinity`, `tag-signal-engine` | Tested (offline) |
| SV-42 | Completed events freeze original answer text, approval status and evidence channel | Addendum §1 | `buildCompletionEvents` | Tested (offline) |

## Multiclass additions

| ID | Requirement | Source | Implementation | Status |
|---|---|---|---|---|
| MC-15 | Q2 and Q6 are blocked at the source (no `q1_focus` phrases, no Q2 E/F, no Q6 import); skipped, never invented | `MSV-RD-007`; 06 | `resolveMulticlassQuestion` | Tested (offline) |
| MC-16 | Undecided Q1 selects no specialization: Q4 uses a curated low-assumption family; Q5 uses the authored undecided banks | owner ruling MSV-RD-008; v0.11 Q4/Q5 | resolver, `q4Neutral`, `q5Fallback` | Tested (offline) |
| MC-17 | Q5 career continuity: declared goal fills the slot with a reviewed pointer phrase, no goal uses the authored replacement; no placeholder reaches a player | owner ruling MSV-RD-009 | `q5Records` | Tested (offline) |
| MC-18 | 25 undecided-Q1 Q5 responses and 5 no-goal replacements imported with source lines; filled answers recorded as seen | v0.11 lines 7142-7194 | builder, pack | Tested (offline) |

## Prestige additions

| ID | Requirement | Source | Implementation | Status |
|---|---|---|---|---|
| PR-12 | Q2 and Q6 are source-blocked and skipped; Q6 package is not in Git and is never reconstructed; Q1 browses in source order (no slate, no ranking) and Q3 follows the exact Q1 route | 06; `MSV-RD-005` | `resolvePrestigeQuestion` | Tested (offline) |
| PR-13 | Prestige Q1 (32 banks, 1,293 answers) and Q3 (160 scenes, 800 answers) imported; all 1,293 route assignments validated class-scoped | Rolling design v0.26; Q3 library v0.1 | `build-prestige-q1q3-content.mjs`, `prestige-q1q3.json`, `10-*` reports | Tested (offline) |
| PR-14 | Authoritative source ids preserved; runtime ids class-namespaced; 23 cross-class id reuses scoped | same | importer | Tested (offline) |
| PR-15 | Q3 keeps the class Mentor voice; no tag, bias key or developer note imported | Q3 library; directive tag exclusion | importer, tests | Tested (offline) |
| PR-17 | Prestige Q2: shared stems + class connective, evidence-backed A-D, E/F, draft only, no owned-thing claims | owner ruling MSV-RD-014; Q2 Character Synthesis v0.8 | `build-prestige-q2-content.mjs`, `resolvePrestigeQuestion` q2 | Tested (offline); wording approval pending |
| MC-19 | Actor-evidence provenance fails closed: exact item/skill ids, always-active specific rules only, no default mappings, no ability-only claims | owner hardening 2026-11-16 | `computeObservedBehaviorBiasProvenance` | 14 | Tested (offline) with real registries |
| PR-18 | Prestige Q2 Q1 context lens: player's own Q1 words quoted, no ownership claim; Q1 change invalidates Q2; neutral/skipped Q1 general | owner hardening 2026-11-16 | `resolvePrestigeQuestion` q2, flow `after: q1` | Tested (offline) |
| PR-16 | Release gate and honest coverage: draft text only in preview; incomplete survey (Q2/Q6 unavailable) recorded as incomplete | directive release gate | `survey-controller._coverage`, ledger | Tested (offline) |
