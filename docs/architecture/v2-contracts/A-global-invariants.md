# Level A — System-wide invariants (reconciled)

**Contract level:** A (global). **Audited commit:** `f734b4d`. **Status of this document:** each invariant carries its own label. An `APPROVED` invariant is restated from an existing authoritative source and is the single home for that rule; domain contracts reference it by ID instead of restating it. `PROPOSED` items are recommendations awaiting the project owner.

**Measured by:** `tools/architecture-census/probe-invariants.mjs` → `data/audits/architecture-census/contracts/invariant-probes.json`. A probe *hit* is a candidate, and probe counts are **lower bounds**: the domain audits found more by reading code (e.g. 108 live monkey-patch sites in 41 modules versus 20 from `P-A09`; 74 chat bypasses versus 43 from `P-A05`, because `createChatMessage` helpers were not probed). Authoritative per-site classification is in the domain sidecars; Phase 2 (`findings/`) classifies each hit as violation, legitimate exception or false positive.

## Sources of authority (precedence)

1. Published SWSE rules and errata — canonical tabletop mechanics (`CLAUDE.md` §1). Not interpreted here.
2. Explicit project-owner decisions:
   - `CLAUDE.md` (committed; rules-adjudication boundary, certification statuses).
   - **Owner standing instructions (OSI)** given to Claude for this project: ActorEngine mutation authority, TransactionEngine credit authority with atomic trades, customization/workbench authorities, progression shell authority, unified V2 actor shell, Holopad-first UI, caching discipline, legacy classification. *These are authoritative but are not committed in the repository;* see `A-OPEN-01`.
   - Owner decisions recorded in documents (e.g. `docs/architecture/equipment-ecosystem-e3a4-clean-break-posture-contract.md` OA-1, `equipment-ecosystem-e4c0-ssot-persistence-contract.md` E4-P1…P5).
3. Existing architecture contracts presented as authoritative: `docs/architecture/ARCHITECTURE.md` ("constitution"), `ENGINE-ARCHITECTURE.md`, `progression-architecture.md`, `combat-authority-map.md`, `campaign-domain-contracts.md`, `swse-automation-authority.md`, `action-authority-v1.md` (groundwork), `force-power-resolution-v1.md`.
4. Observed implementation (census) — evidence of behavior, never of correctness.

Where a source in (3) contradicts current code or another source, the contradiction is recorded in [`contradiction-register.md`](contradiction-register.md) and **not** resolved here.

## Invariants

| ID | Invariant | Source | Status | Probe | Observed (live runtime) |
|---|---|---|---|---|---|
| **A-01** | **Single source of truth.** One fact has one canonical owner; others reference, cache presentation, or derive — never co-own. | ARCHITECTURE §I; campaign-domain-contracts §1; OSI | APPROVED | (domain contracts) | Multi-domain mechanical definitions found for 14 responsibilities (`mechanical-authority-census.json`) — Phase 2 |
| **A-02** | **Mutation gate.** Actor state and owned-item state change only through `ActorEngine` (`scripts/governance/actor-engine/actor-engine.js`). Exceptions: world documents not owned by an actor, Foundry-only operations, each with a code comment. | ARCHITECTURE §II/§VI; ENGINE-ARCH §2; progression-architecture; OSI | APPROVED · **CONFLICT** | `P-A02` | **331** direct document-write sites in **120** live modules (155 `setFlag`, 48 `unsetFlag`, 35 `update`, 19 `create`, 19 `delete`, …). Highest: talents 72, combat 25, equipment 24, mentor 24, npc-followers 23, force 23 |
| **A-03** | **Derived state ownership.** `actor.system.derived` is computed by the V2 actor classes / derived calculators and read-only elsewhere. | ARCHITECTURE §II | APPROVED · **CONFLICT** (path) | `P-A03` | 4 assignments outside `scripts/actors/**` (`scripts/engine/progression/xp-engine.js` ×2, `actor-engine.js` ×2) |
| **A-04** | **Presentation separation.** Sheets, apps and templates render prepared data and emit intents; they do not compute rules or mutate documents. | ARCHITECTURE §II/§VI; OSI | APPROVED · **CONFLICT** | `P-A04` | 54 direct writes in 26 live presentation modules (largest: `scripts/items/swse-item-sheet.js` 19, `scripts/apps/minion-manager.js` 8) |
| **A-05** | **Gameplay chat output** goes through `scripts/chat/swse-chat.js`. | ARCHITECTURE §II/§VI | APPROVED · **CONFLICT** | `P-A05` | 43 `ChatMessage.create` sites in 23 live modules |
| **A-06** | **Settings rule.** House-rule reads in engines go through `HouseRuleService`. | ENGINE-ARCH §3 | APPROVED · **CONFLICT** | `P-A06` | 8 live `game.settings.get` sites in 6 engine modules |
| **A-07** | **Dependency direction.** Engines do not import UI; dependencies flow downward; no cycles. | ENGINE-ARCH §4/§5 | APPROVED · **CONFLICT** | `P-A07-*` | 45 engine→UI import edges in 36 live engine modules; 9 static cycles (52 files); 31 domains in one SCC |
| **A-08** | **No mutation during render** or in read-only/prepare phases; no recursive engine invocation; deterministic order. | ARCHITECTURE §III | APPROVED · **CONFLICT** | `P-A08` | 1 lexical site: `scripts/apps/store/store-main.js:1437` `_onRender → this.actor.setFlag` |
| **A-09** | **Clean cutover.** Legacy V1 systems stay retired; no compatibility shims, runtime monkey-patches, crosswalks or parallel authorities; old paths are rerouted then removed. | ARCHITECTURE §VIII; progression-architecture ("no runtime patching"); E3-A4 OA-1; OSI | APPROVED · **CONFLICT** | `P-A09` | 17 live hotfix modules (`scripts/patches/**`, 3,939 SLOC); **20 prototype monkey-patches** (e.g. `TalentStep.prototype.*` in `telekinetic-prodigy-runtime-patches.js` and `custom-talent-tree-progression-overlay.js`; `SWSEItemSheet.prototype._onRender`); 64 live modules marked deprecated |
| **A-10** | **Credits.** `TransactionEngine` (`scripts/engine/store/transaction-engine.js`) is the single source of truth for credit movement; no parallel ledgers; a trade is atomic — any failure fails the whole trade. | OSI; combat-authority-map ("Credits, purchases → TransactionEngine") | APPROVED · **CONFLICT** (candidate) | `P-A10` | 15 credit-payload sites in 11 live modules outside TransactionEngine, incl. `scripts/engine/store/ledger-service.js:149,211`, `summary-step.js:1786`, `character-like-sheet.js:6087`, `progression-event-processor.js:409` |
| **A-11** | **Rules authority.** Claude implements; it does not adjudicate ambiguous rules. Unresolved mechanics are `DEFERRED_RULES_REVIEW` in `docs/audits/swse-rules-decisions-pending.md`. | CLAUDE.md | APPROVED | — | Not probed; contracts cite the register |
| **A-12** | **Automation authority.** The system executes rules from verified state and supplied context; unknown is not false; GM adjudicates circumstances. | swse-automation-authority | APPROVED | — | Not probed statically |
| **A-13** | **Certification separation.** `FOUNDRY_TESTED` only from a live Foundry V13 run; offline tests and CI are not runtime acceptance. | CLAUDE.md §6; step1 runbook | APPROVED | — | Phases 0–2 make no live claim; step1 runbook is **NOT EXECUTED** |
| **A-14** | **Unified actor shell.** character, droid, npc and vehicle actors use the unified V2 shell (`SWSEV2CharacterSheet` direction); no new standalone actor sheets; Holopad/Shell Host replaces older floating UIs. | OSI | APPROVED · **CONFLICT** (candidate) | `P-A14` | `index.js:175-199` registers `SWSEV2NpcSheet`, `SWSEV2DroidSheet`, `SWSEV2VehicleSheet` separately; whether they are thin subclasses of the shared shell is checked in Phase 2 |
| **A-15** | **Progression authority.** Chargen/level-up route through `ProgressionShell` / `ChargenShell` / `LevelupShell`; temporary choices live in session/draft state; finalization commits once through `ProgressionFinalizer` → `ActorEngine.applyMutationPlan`. | OSI; progression-architecture | APPROVED | `P-A15-A17` | All named authorities exist and are reachable |
| **A-16** | **Caching discipline.** Cache display/derived work only, each with an explicit invalidation key; never cache permissions, credits, HP truth, roll/damage results or live documents. | OSI | APPROVED | `P-A16` | 19 cache-holding live modules; 2 with no visible invalidation (`talent-step.js`, `sentinel-source-mapper.js`) |
| **A-17** | **Customization authority.** `ItemCustomizationWorkbench`, `CustomizationWorkflow`, `UpgradeSlotEngine`, `UpgradeService`, `CustomizationBayApp`, droid/vehicle customization engines, lightsaber workbench. Old per-item modification apps stay retired. | OSI | APPROVED | `P-A15-A17` | All named authorities exist and are reachable |
| **A-18** | **Rules exclusions** the implementation must respect (no D&D crit confirmation; lightsabers ignore DR by default; weapon damage adds ½ heroic level unless excluded; Force powers do not add ½ level by default; droids cannot benefit from organic resting; Nonheroic is not a player class). | OSI | APPROVED | — | Verified per domain in Phase 2 where code paths exist |

### Proposed additions (not approved)

| ID | Proposal | Rationale |
|---|---|---|
| A-P1 | **Layering**: `infrastructure` → `data-registries` → mechanical domains → orchestrators (progression, combat flows) → presentation. Mechanical domains may depend on lower layers and on declared peers only (see [`dependency-matrix.md`](dependency-matrix.md)). | Today 31 domains form one strongly connected component, so no domain can be reasoned about or tested in isolation. |
| A-P2 | **Single home per rule**: every Level-A rule lives here; ARCHITECTURE.md and ENGINE-ARCHITECTURE.md would reference these IDs once their stale details are corrected. | Several rules are stated in three places with diverging details (see contradiction register). |
| A-P3 | **Census as a gate**: run `build-census.mjs --check` and `probe-invariants.mjs` in CI, initially non-blocking, then ratcheted (no new probe hits). | Prevents regrowth during Phase 4 cleanup. |

### Open owner items

| ID | Item |
|---|---|
| A-OPEN-01 | Commit the owner standing instructions (OSI) to the repository (for example as a section of `CLAUDE.md`) so that APPROVED status for A-02, A-10, A-14…A-18 has a durable, versioned source. |
| A-OPEN-02 | Decide which existing documents remain constitutional (ARCHITECTURE.md / ENGINE-ARCHITECTURE.md) once their stale paths and missing references are corrected (see `CR-01`…`CR-05`). |
