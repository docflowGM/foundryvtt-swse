# B-MEN — Mentor, surveys, suggestion and build analysis (domain contract)

**Contract level:** B (domain) with embedded C. **Audited commit:** `f734b4d`. **Census domain:** `mentor-suggestion` (239 runtime modules, 51.8k SLOC; 69 unreachable modules / ~10.7k SLOC).
**Scope:** `scripts/engine/suggestion/**`, `scripts/engine/mentor/**`, `scripts/engine/analysis/**`, `scripts/engine/archetype/**`, `scripts/mentor/**` (incl. `mentor-survey-v2/**`), `scripts/dialogue/**`, `scripts/apps/mentor/**`, mentor data under `data/dialogue/**` and `data/mentor-survey/**`.
Machine-readable sidecar: `data/audits/architecture-census/contracts/domains/mentor-suggestion.json`. Level A IDs refer to [`A-global-invariants.md`](A-global-invariants.md).

## 1. Purpose and boundaries

The domain is **advisory**. It (a) ranks and explains candidate feats, talents, classes, skills, attributes, Force options and equipment for a player; (b) voices those explanations through Mentors; (c) runs the Mentor Survey V2 (L1, Multiclass, Prestige) and records completed survey events; (d) owns the canonical archetype registry used for identity reading.

It must **not** own: rules legality or prerequisites (progression/prerequisite authorities), derived numbers (ability modifiers, skill totals, BAB, HP — actor-core/derived calculators), credits or prices (store-economy / TransactionEngine), finalized acquisitions (progression finalizer → ActorEngine), or chat output (A-05). Suggestion output never changes what a player may legally choose (`01-SHARED-ARCHITECTURE-CONTRACT.md` §2 "four authority lanes", APPROVED).

## 2. Responsibility ownership

| ID | Responsibility | Owner (path · symbol) | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-MEN-01 | Suggestion request façade, caching, DTO validation | `scripts/engine/suggestion/SuggestionService.js` · `SuggestionService` (27 consumers) | OBSERVED | behavior-code-verified | `scripts/engine/suggestion/SuggestionService.js:149`, `:315`, `:375-396` |
| R-MEN-02 | Engine coordination / build-intent analysis | `SuggestionEngineCoordinator.js` · `SuggestionEngineCoordinator` | OBSERVED · CONFLICT (init never called, F-MEN-002) | dependency-traced | `scripts/engine/suggestion/SuggestionEngineCoordinator.js:68`, `:142`, `:300` |
| R-MEN-03 | Feat/talent/class/force/attribute scoring | `SuggestionEngine.js`, `ClassSuggestionEngine.js`, `SuggestionScorer.js`, `attribute-planner.js` | OBSERVED | source-inspected | largest modules (2,204 / 1,359 / 802 / 665 SLOC) |
| R-MEN-04 | Reason/explanation packets | `ReasonFactory.js` · `ReasonFactory.create` | OBSERVED | behavior-code-verified | `scripts/engine/suggestion/ReasonFactory.js:30` |
| R-MEN-05 | Suggestion analytics persistence (shown/accepted history, anchors, pivot, metadata) | split across `SelectionRecorder`, `AnchorRepository`, `SuggestionStateService`, `SuggestionService._setSuggestionState` | OBSERVED · CONFLICT (4 writers, 2 flag scopes, F-MEN-001/003) | behavior-code-verified | `scripts/engine/suggestion/SelectionRecorder.js:40`, `scripts/engine/suggestion/AnchorRepository.js:136`, `scripts/engine/suggestion/SuggestionStateService.js:27-28`, `scripts/engine/suggestion/SuggestionService.js:621` |
| R-MEN-06 | Mentor identity, class→Mentor routing, greetings | `scripts/engine/mentor/mentor-dialogues.js` · `getMentorForClass`, `getActiveMentor`, `MENTORS` | OBSERVED | source-inspected | `scripts/engine/mentor/mentor-dialogues.js:212`, `:417`, `:13` |
| R-MEN-07 | Mentor relationship memory (commitments, decay) | `scripts/engine/mentor/mentor-memory.js` | OBSERVED · CONFLICT (multi-client writes, F-MEN-004) | behavior-code-verified | `scripts/engine/mentor/mentor-memory.js:107`, `:297`; `scripts/infrastructure/hooks/mentor-sheet-hooks.js:93` |
| R-MEN-08 | Survey V2 vocabulary/contract constants | `scripts/mentor/mentor-survey-v2/contract.js` (17 consumers) | OBSERVED · APPROVED (`01-…CONTRACT` §3) | test-verified (`tests/mentor-survey-contract.test.mjs`) | `scripts/mentor/mentor-survey-v2/contract.js:56-60` |
| R-MEN-09 | Survey draft state machine (no actor writes) | `survey-session.js`, `survey-controller.js`, `scripts/apps/progression-framework/steps/mentor-survey-step.js` | OBSERVED · APPROVED (SV-10, SV-29) | test-verified (`tests/mentor-survey-session.test.mjs`) | `scripts/mentor/mentor-survey-v2/survey-controller.js:24` |
| R-MEN-10 | Survey event ledger shape + atomic commit | `intent-ledger.js` · `buildLedgerSetPatch`; `finalization.js` · `buildSurveyLedgerPatch`; called once by `progression-finalizer.js` | OBSERVED · APPROVED (SV-11/12) | behavior-code-verified; test-verified (`tests/mentor-survey-ledger.test.mjs`, passed offline) | `scripts/mentor/mentor-survey-v2/intent-ledger.js:136`, `scripts/mentor/mentor-survey-v2/finalization.js:19`, `scripts/apps/progression-framework/shell/progression-finalizer.js:1457` |
| R-MEN-11 | Survey influence on identity (inert tag boundary) | `survey-influence.js`, `tag-boundary.js` · `mapResponseToIntent`; read by `identity-engine.js` | OBSERVED · APPROVED (SV-16/17) | dependency-traced | `scripts/mentor/mentor-survey-v2/tag-boundary.js:17`, `scripts/engine/prestige/identity-engine.js:23` |
| R-MEN-12 | Read-only actor evidence projection | `actor-evidence.js` | OBSERVED · APPROVED (SV-14) | source-inspected | `scripts/mentor/mentor-survey-v2/actor-evidence.js:17` |
| R-MEN-13 | Canonical archetype registry | `scripts/engine/archetype/archetype-registry.js` · `ArchetypeRegistry` | OBSERVED · APPROVED (archetype phase 12a SSOT) | test-verified (`tests/archetype-registry-ssot-lane.test.mjs`) | `scripts/engine/archetype/archetype-registry.js:33` |
| R-MEN-14 | Equipment loadout profile for advisory scoring | `equipment-loadout-profile.js` · `buildEquipmentLoadoutProfile` | OBSERVED | source-inspected | `scripts/engine/suggestion/equipment-loadout-profile.js:240` |
| R-MEN-15 | Mentor translation (Aurebesh) preference | `scripts/mentor/mentor-translation-integration.js` (writes **user** flag) | OBSERVED (legitimate: User doc, not actor) | source-inspected | `scripts/mentor/mentor-translation-integration.js:251` |

## 3. Authorities

- **Canonical data:** archetypes → `ArchetypeRegistry` (APPROVED); Mentor roster → `data/dialogue/mentor_registry.json` + `data/mentor-survey/class-mentor-routes.json` (APPROVED, SV-28); survey content → `data/mentor-survey/*.json` behind `release-manifest.json` (APPROVED, SV-09).
- **Rules:** none owned. Legality is read from V2 prerequisite/class authorities (APPROVED, SV-02). Unresolved survey mechanics are `DEFERRED_RULES_REVIEW` as `MSV-RD-001…009` (register).
- **Calculation:** advisory scores only. Ability modifiers / skill totals must be read from the canonical reader (`SchemaAdapters.getAbilityMod`, `scripts/utils/schema-adapters.js:337`) — PROPOSED as the only allowed source; OBSERVED · CONFLICT (local reimplementations, F-MEN-005).
- **Mutation/persistence:** survey ledger → progression finalizer only (APPROVED, OBSERVED). Suggestion analytics/mentor memory → direct actor `setFlag` with `@mutation-exception: metadata` (OBSERVED · CONFLICT with A-02/OSI; exception class not in `docs/repo-structure.md:164-167`; owner decision F-MEN-001).

## 4. Public interfaces

| Symbol | path:line | Consumers | Contract |
|---|---|---|---|
| `SuggestionService.getSuggestions(actor, context, options)` | `scripts/engine/suggestion/SuggestionService.js:315` | 27 | returns sorted, validated suggestion DTOs; caches by snapshot revision; **side effect**: records "shown" history for `levelup/chargen/mentor/decision-step` contexts (`:469`, `:638`) |
| `SuggestionEngineCoordinator.analyzeBuildIntent` | `scripts/engine/suggestion/SuggestionEngineCoordinator.js:300` | 5 | pure analysis, cached in `_buildIntentCache` (`:159`) |
| `ArchetypeRegistry` | `scripts/engine/archetype/archetype-registry.js:33` | 10 | canonical archetype ids |
| `getMentorForClass` / `getActiveMentor` | `scripts/engine/mentor/mentor-dialogues.js:212` / `:417` | 18 (module) | Mentor routing; fails closed per SV-28 |
| `buildSurveyLedgerPatch` | `scripts/mentor/mentor-survey-v2/finalization.js:19` | 1 (finalizer) | returns `set` patch or `{}`; never writes |
| `readLedger` / `reduceLedger` | `scripts/mentor/mentor-survey-v2/intent-ledger.js:22` / `:34` | 10 (module) | pure readers; preview events excluded by default |
| `mapResponseToIntent` | `scripts/mentor/mentor-survey-v2/tag-boundary.js:17` | — | always `{status:"unmapped"}` until a certified crosswalk exists |
| `buildEquipmentLoadoutProfile` | `scripts/engine/suggestion/equipment-loadout-profile.js:240` | 12 | read-only loadout projection |
| `game.swse.suggestions` | `scripts/engine/suggestion/SuggestionEngineCoordinator.js:90` | `scripts/utils/reason-inspector.js:30` | **never assigned at runtime** (F-MEN-002) |

## 5. Dependencies

- **Allowed:** infrastructure (logger, schema adapters), data-registries, progression read APIs (pending selections, prerequisite results), archetype/identity, HouseRuleService (A-06).
- **Prohibited:** UI imports from engines (A-07); ActorEngine/direct writes from evaluators (ENGINE-ARCH §10); store pricing/credit authority; chat creation.
- **Observed violations (A-07):** `scripts/engine/suggestion/SuggestionService.js:15` → `scripts/ui/shell/ShellMutationGuard.js`; `scripts/engine/suggestion/BackgroundSuggestionEngine.js:14` → `scripts/apps/progression-framework/utils/skill-display.js`; `scripts/engine/mentor/aurebesh-translator.js:10` re-exports `scripts/ui/dialogue/aurebesh-translator.js` (F-MEN-007).
- Edge volume: depends on infrastructure 119, progression 33, classes 13, ui-shell 11; depended on by progression 66 (census).

## 6. Integration points and lifecycle

- Survey: progression node definitions (`scripts/engine/progression/registries/progression-node-definitions.js:249`) → `mentor-survey-step.js` → session draft → `scripts/apps/progression-framework/shell/progression-finalizer.js:1457` commit. Matches SV-10/11/12.
- Hooks registered by `SuggestionEngineHooks.initialize()` (`scripts/engine/suggestion/SuggestionEngineHooks.js:31-35`) — reached only from `SuggestionEngineCoordinator.initialize()` (`:142`), which **no runtime code calls** (F-MEN-002). Of its five hooks, only `swse:level-up-complete` has an emitter (`scripts/apps/progression-framework/shell/progression-finalizer.js:543`).
- `updateActor` listener `swse-mentor-decay` (`scripts/infrastructure/hooks/mentor-sheet-hooks.js:93`) — runs on every client, no originating-user guard (F-MEN-004).
- Mentor chat: `mentor-chat-dialog.js` (from character sheet and `MentorSurfaceService`) and `scripts/sheets/v2/actor-sheet-base.js:1218` write mentor memory.

## 7. Failure behavior and domain invariants

- D-MEN-1 (APPROVED, SV-12 / A-15): survey state reaches the actor only through the finalizer's atomic patch; cancel ⇒ no ledger change. OBSERVED.
- D-MEN-2 (APPROVED, ENGINE-ARCH §10): evaluators are pure; persistence is a separate service. OBSERVED · CONFLICT (`getSuggestions` persists history).
- D-MEN-3 (PROPOSED): advisory metadata writes are fail-soft (never block progression) and are performed by exactly one client. Fail-soft OBSERVED (`scripts/engine/suggestion/SuggestionService.js:628-633`); single-client CONFLICT (F-MEN-004).
- D-MEN-4 (APPROVED, SV-08): internal labels never in render view-models. Test-verified (`tests/mentor-survey-contract.test.mjs`).
- A-02, A-04, A-05, A-06, A-07, A-11, A-16 apply; see §11.

## 8. Level C subsystem contracts

- **C-MEN-1 Survey V2 ↔ Progression finalizer.** Interface: `buildSurveyLedgerPatch({actor, selection, transactionId, level, completedAt}) → set-patch`. Status: APPROVED · OBSERVED. Single writer of `flags.foundryvtt-swse.mentorSurvey.events`.
- **C-MEN-2 Survey V2 ↔ Identity/Suggestion readers.** Interface: `readLedger/reduceLedger` + `computeSurveyInfluence`; tag boundary inert. Status: APPROVED · OBSERVED.
- **C-MEN-3 Suggestion evaluation ↔ Suggestion analytics persistence.** PROPOSED: one `SuggestionStateService` owning every suggestion-analytics flag under scope `foundryvtt-swse`, called by UI/orchestration after evaluation, never inside `getSuggestions`. Today: CONFLICT (four writers).

## 9. Tests and certification

34 domain tests (census). Run offline at HEAD: `tests/mentor-survey-ledger.test.mjs` and `tests/mentor-survey-clean-break.test.mjs` pass. Other survey tests (`mentor-survey-{contract,session,influence,traceability,canonical-authority}.test.mjs`) protect R-MEN-08…12. No test covers R-MEN-05 persistence, F-MEN-002 initialization, or F-MEN-004 multi-client decay.
Foundry acceptance: `docs/design/mentor-survey-v2/20-FOUNDRY-ACCEPTANCE-CHECKLIST.md:3` — **NOT PERFORMED**. FOUNDRY_ACCEPTANCE_REQUIRED for every survey and suggestion surface.

## 10. Reconciliation with existing contracts

Agreements: Survey V2 implementation matches `01-SHARED-ARCHITECTURE-CONTRACT.md` §1 (legacy `scripts/mentor/mentor-survey/` and legacy steps absent), §3 module layout, §6 single writer, §9 inert tag boundary; `00-AUTHORITY-INDEX.md` §3 legacy prestige survey retired (no `prestigeMeaning…` readers found).

| ID | Existing source | Claim | Observed |
|---|---|---|---|
| CR-MEN-01 | `docs/architecture/ENGINE-ARCHITECTURE.md:322` (§10) | `actor.system.suggestionEngine.state = value` is forbidden | `scripts/engine/suggestion/PlayerHistoryTracker.js:149`, `scripts/engine/suggestion/AnchorRepository.js:36`, `scripts/engine/suggestion/PivotStateManager.js:36`, `scripts/engine/suggestion/MentorProfile.js:71` assign into live `actor.system.suggestionEngine` |
| CR-MEN-02 | `docs/architecture/ENGINE-ARCHITECTURE.md:340` | modifier math forbidden in suggestion engines | ≥7 local `Math.floor((score-10)/2)` sites (F-MEN-005) |
| CR-MEN-03 | `docs/architecture/ENGINE-ARCHITECTURE.md:343`, `:386`, `:427` | analytics tracking forbidden in engines; persistence via `SuggestionStateService` called by UI | `SuggestionService.getSuggestions` records history (`:469`); `SelectionRecorder`, `AnchorRepository`, `SuggestionService._setSuggestionState` persist independently |
| CR-MEN-04 | `docs/architecture/ENGINE-ARCHITECTURE.md:429` | `PlayerAnalytics` service required | does not exist; `PlayerHistoryTracker`/`SelectionRecorder` fill the role |
| CR-MEN-05 | `scripts/governance/PHASE-5A-SUGGESTION-MENTOR-AUDIT.md:85` | survey biases merged from `actor.system.swse.mentorBuildIntentBiases` | retired by `01-…CONTRACT` §1; no runtime reader. Stale doc |
| CR-MEN-06 | `docs/repo-structure.md:164-167` | exception tags are `legacy-disabled-*` / `world-item` | 15 live sites use `@mutation-exception: metadata`, a class recognized only by tooling (`scripts/tools/mutation-lint.js:166`, `:217` "metadata-approved"), not by any owner-approved document |

## 11. Phase 2 conformance summary

| ID | Sev | Status | Title |
|---|---|---|---|
| F-MEN-001 | medium | confirmed | Advisory analytics written straight to actor flags (16 real sites; 8 probe hits are `ReasonFactory.create` false positives) |
| F-MEN-002 | high | confirmed | `SuggestionEngineCoordinator.initialize()` never called: hooks, `game.swse.suggestions` and the anchor/pivot pipeline never start |
| F-MEN-003 | medium | confirmed | `SuggestionStateService` uses flag scope `'swse'` (system id is `foundryvtt-swse`) |
| F-MEN-004 | medium | confirmed | Mentor commitment decay runs in an `updateActor` hook on every client (double decay / permission errors) |
| F-MEN-005 | medium | confirmed | Ability-modifier and skill-reading logic reimplemented in ≥7 suggestion modules instead of `SchemaAdapters` |
| F-MEN-006 | medium | confirmed | `getSuggestions` (a read path) performs up to 8 sequential actor flag writes |
| F-MEN-007 | low | confirmed | Three engine→UI imports (A-07) |
| F-MEN-008 | low | confirmed | `normalizeTextTokens` copied into six analyzers |
| F-MEN-009 | medium | confirmed | 69 unreachable modules (~10.7k SLOC) in seven clusters |
| F-MEN-010 | low | confirmed | Survey routing test uses an unreachable module as its authority |
| F-MEN-011 | low | suspected | `_buildIntentCache` grows without bound (revision-keyed, no eviction) |
| F-MEN-012 | low | confirmed | Dead mutators in live module `mentor-dialogues.js` (`setLevel1Class`, `setMentorOverride`, `clearMentorOverride`) |
| F-MEN-013 | info | confirmed | Survey V2 ledger conforms to A-02/A-15 (single atomic writer) — no action |
| F-MEN-014 | low | confirmed | Documentation consolidation: stale PHASE-5A audit; ENGINE-ARCH §10 out of date |
| F-MEN-015 | low | suspected | Legacy stylesheet `l1-survey-step.css` still loaded by `system.json:103` |

Multi-domain leads: `price-computation` (`scripts/engine/suggestion/equipment/store-suggestion-context.js:89 getStoreItemCost`) reads stored price fields with a fallback chain — reads, does not compute; `OpportunityCostAnalyzer.computeCost` is an advisory "opportunity cost", not a price (not a duplicate). `skill-total` (`scripts/engine/suggestion/shared-suggestion-utilities.js:128`) reads stored totals (not a duplicate, but a second key normalizer). `xp-level` (`scripts/mentor/mentor-suggestion-voice.js:414`) is text selection (false lead). `ability-modifier` → F-MEN-005.

## 12. Unimplemented, deferred and acceptance-required

- U-MEN-01 UNIMPLEMENTED: certified answer→tag crosswalk (SV-16; non-goal of this cutover).
- U-MEN-02 UNIMPLEMENTED: `PlayerAnalytics` / single analytics persistence service (ENGINE-ARCH §10).
- U-MEN-03 UNIMPLEMENTED: Prestige Q6 dialogue package — not in Git (`06-CONTENT-STATUS-AND-BLOCKERS.md` §3); owner to supply.
- DEFERRED_RULES_REVIEW: `MSV-RD-001…009` (`docs/audits/swse-rules-decisions-pending.md:3186-3340`), incl. MSV-RD-006 talent-tree access. No new rules questions raised by this audit.
- FOUNDRY_ACCEPTANCE_REQUIRED: whole `20-FOUNDRY-ACCEPTANCE-CHECKLIST.md`; F-MEN-003/004 behavior (Foundry flag-scope validation, multi-client hook delivery) must be confirmed live.
