# Mentor Survey V2 — Shared Architecture Contract

Applies to all three surveys. Requirement IDs (`SV-nn`) are tracked in `05-TRACEABILITY-MATRIX.md`.

## 1. Clean-cutover mandate (SV-01)

No existing player population. Therefore: no migrations, no compatibility shims, no dual read/write, no legacy fallback questionnaires, no conversion of historical survey responses, no shadow scorers.

The legacy surfaces replaced by this cutover (all deleted when their replacement is live):

| Legacy surface | Replaced by |
|---|---|
| `scripts/mentor/mentor-survey/{engine,registry,definition-builder,base-class-survey-definitions,prestige-survey-profiles}.js`, `definitions/**` | `scripts/mentor/mentor-survey/` V2 modules (§3) |
| `l1-survey-step.js`, `base-class-survey-step.js`, `prestige-survey-step.js` | One `MentorSurveyStep` per survey kind driven by the shared runner |
| `system.swse.surveyResponses`, `system.swse.classSurveyIntentBiases`, `system.swse.prestigeSurveyResponses`, `flags.foundryvtt-swse.progression.{classSurveys,prestigeSurveys}`, `flags.foundryvtt-swse.l1SurveyDrafts`, `system.swse.mentorBuildIntentBiases` (written by surveys) | The single survey event ledger (§6) |
| `mergePrestigeBias`, `pruneWeight`, `oldIdentityRetention`, `prestigeWeight` | Nothing (retired; identity-erasing arithmetic is not approved) |

Downstream readers of the retired fields (Suggestion Engine, Identity Engine, forecast adapters) already default to `{}`; they continue to work unchanged and simply receive no survey-derived bias until the later answer-to-tag integration (§9).

## 2. Four authority lanes (SV-02)

`declared_future_goal ≠ inferred_current_identity ≠ verified_mechanical_eligibility ≠ finalized_acquisition`

| Lane | Owner (single source) | Survey may |
|---|---|---|
| Declared future goal | Survey event ledger, typed event `goal_declaration` | create (explicit affirmative player choice only), supersede (explicit revision only) |
| Inferred current identity | Existing Identity Engine / canonical `ArchetypeRegistry`; Q6 snapshots stored as ledger events | read, snapshot a reading, record player correction of the *reading* |
| Verified mechanical eligibility | V2 prerequisite / class authorities | **read only** |
| Finalized acquisition | Actor state written by the progression finalizer | **read only** |

Rules: no lane is derived from another. A declared "Jedi Master" does not create identity, eligibility or ownership. No survey code writes to eligibility or acquisition. Browsing, previewing, paging, declining, "I'm not sure" and skipping record no intent and no negative inference (SV-03).

## 3. Module layout (SV-04)

All under `scripts/mentor/mentor-survey-v2/` (legacy `scripts/mentor/mentor-survey/` is deleted at cutover):

| Module | Responsibility |
|---|---|
| `contract.js` | Constants and typed vocabularies: survey kinds, question IDs, depth IDs, Q6 band IDs, lanes, event types, content/approval statuses |
| `content-store.js` | Loads and validates content packs under `data/mentor-survey/`; resolves stable IDs; applies the release gate |
| `survey-session.js` | Pure draft state machine: answer, back, skip, cancel, revisit, context revision, downstream invalidation |
| `actor-evidence.js` | Read-only, provenance-backed projection of finalized actor strengths |
| `reflection.js` | Shared Q6 reflection/correction engine (Multiclass + Prestige; reusable by Talk to Mentor later) |
| `intent-ledger.js` | Pure builders/reducers for ledger events, idempotency, supersession; the only writer of the ledger shape |
| `survey-influence.js` | Event-based decay, bounded reinforcement, channel cap, saturation, diagnostics, Q6 calibration authority |
| `tag-boundary.js` | Typed future answer-to-intent mapping boundary (inert) |
| `resolvers/{l1,multiclass,prestige}.js` | Per-survey question selection (pure functions of context + content) |
| `index.js` | Public surface |

Progression steps (`steps/mentor-survey-step.js` + thin per-kind subclasses) only render, forward actions to `survey-session.js`, and stage the committed payload on the progression session. They contain no selection or scoring logic.

## 4. Content model and stable IDs (SV-05, SV-06)

Content is data, in `data/mentor-survey/*.json`, produced by `tools/mentor-survey/build-content.mjs` from the upstream design documents at recorded source commits. Runtime never reconstructs content from display labels.

* **IDs** (all stable, lowercase, dot-delimited): survey `l1 | multiclass | prestige`; question `q1`…`q6`; response `<survey>.<scope>.<question>.<slug|NN>`; scenario `q4.<destination>.<family>.seedNN` (multiclass, as authored); parent/child career IDs are canonical `ArchetypeRegistry` IDs and are *validated against it*, never redefined.
* Every record carries `editorialStatus` (`owner_approved_text | draft_text`), `mechanicsStatus` (`certified_mechanic | unverified_mechanic | none`), `sourceRef {commit, file, anchor}`.
* Player-selectable `text` is first person. A content validator rejects non-first-person options (SV-07).
* Internal labels (`developerRoute`, `editorialFocus`, `editorialIntent`, tag-like strings) are stored under `internal` and are **never** serialized into the render view-model (SV-08). Render view-models are built by an allow-list, not a deny-list.

## 5. Release gate (SV-09)

`data/mentor-survey/release-manifest.json` is the single switch. Per survey and per scope (L1 class, multiclass destination, prestige class) it names `releaseState: "withheld" | "released"` plus the reason and the owner sign-off reference.

* A scope is playable only if it is `released` **and** every record it would present has `editorialStatus: owner_approved_text`.
* `withheld` scopes skip silently (the step reports "not available"; the survey is optional so progression is unaffected). There is **no** fallback to a legacy questionnaire.
* GM-only world setting `swse.mentorSurveyEditorialPreview` (default **off**) lets a GM play withheld/draft content in a visibly marked "Editorial preview" mode for approval playtesting. Preview events are written with `provenance.preview = true` and are excluded from every downstream reader. The setting does not change the stored content statuses.

## 6. Persistence: one owner (SV-10, SV-11, SV-12)

* **Draft/in-flight state** lives only in `ProgressionSession.draftSelections['mentor-survey:<kind>:<scope>']`. Never on the actor, never in flags.
* **Committed state** is an append-only event ledger at `flags.foundryvtt-swse.mentorSurvey.events` (array), written **only** by the progression finalizer's atomic `set` map, i.e. in the same transaction as the advancement. There is no other writer.
* Event types: `survey_completed`, `survey_skipped`, `goal_declaration`, `goal_revision`, `reflection_snapshot`, `reflection_correction`.
* Every event: `eventId` (deterministic: hash of `surveyKind|scope|transactionId|type|sequence`), `transactionId`, `surveyDefinitionVersion`, `contentVersion`, `actorLevel`, `contextRevision`, `completedAt`, `provenance`, `supersedes?`, payload.
* **Idempotency:** the finalizer skips events whose `eventId` already exists (duplicate submit/finalize is a no-op).
* **History is immutable:** a retake appends new events (`supersedes` points at the prior event of the same lane). Prior events are never edited or removed. "Current" values are derived by a pure reducer (latest non-superseded per lane), so retakes cannot multiply evidence; nothing is summed.
* **Atomic with progression:** nothing is written until the finalizer runs. Cancel/fail ⇒ the session is discarded ⇒ no ledger change, no goal change, no accumulated bias (SV-12).

## 7. Survey lifecycle (SV-13)

Optional; skip creates no intent. Cancel discards the draft. Revisit shows prior draft answers. Back is always allowed. Deterministic: same context + same content ⇒ same question/option order (stable canonical-ID tiebreaks; no `Math.random`). Each question stores a `contextRevision` (hash of the inputs that selected it). If an upstream answer or context input changes, dependent answers are marked `invalidated: { reason, previousOptionId }` and **not** silently replaced: the player is shown the new question and may re-confirm the previous option if it is still offered (retention by stable `optionId`). Duplicate-submit protection: each action carries a monotonically increasing `actionSeq`; replays are ignored.

## 8. Actor evidence projection (SV-14, SV-15)

`actor-evidence.js` is a pure, read-only projection over **finalized** actor state: owned class levels, feats, talents, trained skills (and Force-capability facts when present on the actor). Each fact: `{ kind, canonicalId, label, source: { itemId, path }, acquiredAtLevel? }`. It never reads survey responses, pending selections, class eligibility or recommendations. Any past-tense claim in Q2/Q6 text must be rendered from a fact in this projection. It reuses existing canonical identity (`ArchetypeRegistry`, Identity Engine reading) and introduces no scorer.

## 9. Typed tag-mapping boundary (SV-16)

`tag-boundary.js` exports `mapResponseToIntent(responseRecord, context) → { status: "unmapped" }`. Responses persist stable `responseId`s only. No ontology tags, weights, or mechanical signals are emitted. The boundary is typed so a later project can supply a certified crosswalk without changing survey definitions or ledger events. Until then every consumer sees no survey-derived tags. Surveys complete, skip and revisit without producing any mechanical signal (SV-17).

## 10. Shared Q6 Mentor Reflection (SV-18…SV-27)

One engine for Multiclass and Prestige (and later on-demand Talk to Mentor). Pipeline:

1. **Reading** (frozen, deterministic): current identity (exact canonical parent/specialization ID + `kind`, or `unresolved`), up to 3 real evidence facts (fewer if thin), previous declared goal quoted separately (or honest absence), optional relationship clause only if both sides are grounded, verified goal fulfillment only when a typed goal equals finalized class state.
2. **Calibration A–E** (fixed bands, hidden; midpoints illustrative, not coded as weights): A none; B targeted correction (≈1–2 shown interpretations); C soft (≈1–3); D two-stage NOT then AM; E two-stage NOT then AM. NOT = reject inferences **shown in the frozen reading** (never an owned fact); AM = affirmative first-person self-identification statements. Counts are caps: sparse evidence shows fewer real options.
3. **Outputs:** `reflection_snapshot` (the exact shown claims + actor revision) and `reflection_correction` (which claim IDs were rejected/affirmed). Corrections amend the *inference record* only. They cannot alter owned mechanics, declared goals, or prerequisite legality (SV-23). A no-op A, or declining an identity, records nothing negative (SV-24).
4. Retakes snapshot again and supersede; they never re-apply earlier calibration weight (SV-25).

Player-facing A–E text is first person with no percentages or labels (SV-26). The engine takes a Mentor profile (text bundle) as a parameter and contains no Mentor voice.

## 11. Mentor routing (SV-28)

Mentor for a survey is resolved from the canonical class→Mentor map (`data/dialogue/mentor_registry.json` + the class-to-Mentor table) and **fails closed** for unknown classes (no substitution of another Mentor). Shared Mentors (Miraj: Jedi Knight/Jedi Master; Delta: Infiltrator/Assassin; Lead: Scout/Pathfinder; Breach: Soldier/Elite Trooper) key their text by `(mentor, class)`.

## 12. Performance (SV-29)

Survey navigation is UI-only state: no actor writes, no document updates, no full-sheet render per answer. View-models and option rankings are cached keyed by `contextRevision`; the cache is bounded and has no authority over game state.

## 13. Survey influence (addendum; SV-30…SV-42)

One event-based calculator, `survey-influence.js`, replaces the legacy `IdentityEngine.computeSurveyBias` (shared level decay with a 0.175 floor). Each completed survey event decays on its own half-life (`D=2^-(L-Ls)/H`, `W=A·D`); a tag contribution is `C = E · R(n) · A · D` with `R(n)=1+0.15·min(n-1,3)` applied once per distinct question; contributions are summed per tag keeping per-event provenance, bounded by a survey-channel cap, and saturated with `F(E)=1-e^{-E/k}`. All coefficients live in one frozen config (provisional; owner hierarchy: initial influence Prestige > Multiclass > L1, persistence L1 > Multiclass > Prestige). Evidence channels stay separate: acquired mechanics (never read), declared goals (never decay), survey development preferences (decay), inferred identity, Q6 calibration (separate authority, coefficients unapproved). Only certified, ontology-registered tag evidence counts, so with no certified mapping the channel is empty. The result reaches the Suggestion Engine only as `identityBias.surveyTagAffinity` merged by `tag-signal-engine` under a hard ceiling; it is a ranking signal and cannot create eligibility. See `07-SURVEY-INFLUENCE-CALIBRATION.md`.

## 14. Explicit non-goals

Answer→tag mapping, new weights, new ontology tags, archetype-scoring changes, a Talk-to-Mentor redesign, developer analytics, migrations.
