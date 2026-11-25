# Implementation progress ledger — V2 architectural realignment (Phases 3A–3P)

**Resume here.** Read this file, then `data/audits/architecture-census/implementation/tracker.json` (authoritative per-finding status; `node tools/architecture-census/tracker.mjs summary`). Never re-run a subphase marked `done`; never mark `done` without the evidence listed.

- Implementation branch: `refactor/v2-architectural-realignment` (stacked on `audit/v2-systemwide-architecture-census`, PR [#1185](https://github.com/docflowGM/foundryvtt-swse/pull/1185); neither is merged).
- Immutable baseline: audited commit `f734b4d33f0e7603856b262f06dd705cc02ab5b8` (census outputs under `data/audits/architecture-census/`; regenerate only with the pinned baseline mode).
- Current-code comparison: `node tools/architecture-census/check-architecture.mjs` (ratchet) / `build-census.mjs --current --out <dir>`.
- Decisions: `docs/architecture/v2-contracts/DECISIONS.md`. Acceptance procedures: `docs/architecture/v2-contracts/ACCEPTANCE.md`.
- Foundry V13 is not available in the implementation environment: nothing here is `FOUNDRY_TESTED`.

## Corrections to audit figures
- E-1: A-02 direct writes are 295 in reachable modules (97 files), not 331 (331 includes 36 sites in unreachable modules). See Phase 2 report errata.

## Subphase status

| Subphase | State | Evidence / notes |
|---|---|---|
| 3A.1 audit integration | done | #1185 and #1184 unmerged; `main` unchanged at `f734b4d`; implementation stacked on the audit branch |
| 3A.2 tracker | done | `implementation/tracker.json` (274 findings, validator `tracker.mjs check`) |
| 3A.3 authority reconciliation | done | `DECISIONS.md` AD-001…AD-010; `docs/governance/owner-standing-instructions.md` |
| 3A.4 regression guards | done (CI run pending) | `check-architecture.mjs`, `ratchet-baseline.json`, CI step added |
| 3A.5 acceptance framework | done | `ACCEPTANCE.md` |
| 3B Force Point integrity | core done; 6 non-integrity findings still open | F-TAL-007, F-FRC-003 `OFFLINE_TESTED` (commit 15ea0c7cc, `tests/force-point-bonus-pool-single-authority.test.mjs`); F-FRC-002, F-INF-005, F-PAT-005 `OWNER_DECISION_REQUIRED`; F-FRC-001 verified. Open (planned 3B, not integrity): F-FRC-004, -006, -007, -008, -011, -012 |
| 3C Transaction integrity | correctness fixes done; remaining items await owner decisions | F-STO-001 `OFFLINE_TESTED` (store rollback removes created actors; `tests/store-purchase-created-actor-rollback.test.mjs`); F-STO-004 `PARTIALLY_COMPLETE_BLOCKED` (GRANT_CREDITS idempotent; `tests/progression-credit-grant-idempotency.test.mjs`; TE-routing is a decision). `OWNER_DECISION_REQUIRED`: F-HOL-002, F-VEH-006, F-FRC-005, F-STO-003, F-UIS-001, F-STO-005, F-ABL-002. Open: F-PRG-003 (chargen credit staging, belongs with 3G), F-STO-002, F-STO-006/-008/-009 |
| 3D Actor mutation boundary | in progress | 3D.1: governed flag API gained `recalc:false` (`tests/actor-engine-flag-governance.test.mjs`). 3D.2: 95 actor flag writes rerouted so far (65 talents, 30 force/feat/combat/crafting) via AST codemod, old semantics preserved; live direct writes 295 -> 200. F-TAL-001, F-FRC-006 `PARTIALLY_COMPLETE_BLOCKED`. Remaining flag sites: infrastructure wrappers (mutation-safety, document-api-v13, hardening: likely sanctioned wrappers, review), minion-manager, faction/location registries, lightsaber sync/router, damage-resolution-engine (runs inside ActorEngine.applyDamage; review), item-sheet (item flags, not actor), session-storage, SuggestionStateService. Non-flag writes (update/create/delete) need per-site ActorEngine equivalents and tests |
| 3D (cont.) | 3D.2 reroutes 295 -> ~188 live direct writes; 3D.3 F-GOV-001 `OFFLINE_TESTED` (MutationInterceptor context stack); 3D.4 athletics house-rule reads via HouseRuleService; remaining flag sites reviewed: mutation-safety/hardening are the lock/snapshot wrappers (retained), encounter-use-tracker/meta-resource-feat-resolver stay direct because ActorEngine imports them (an import back adds cycles) | |
| 3F.2 | F-FEA-001 `OFFLINE_TESTED`: 45 feat normalization listener modules (90 listeners) gated to the originating client | `tests/feat-normalization-hooks-originating-client.test.mjs` |
| 3M (chat) | 20 `ChatMessage.create` sites routed through `SWSEChat.postHTML` (bypass count 42 -> 9); full rolling suite 801/801 passed on that commit | commit `3ad63f612` |
| 3D/3F multi-client gates | `deleteCombat` cleanups (force-executor F-FRC-006, threshold-engine, Sith) and the four `HPRecomputeHooks` listeners now act only on the originating client (and owned actors); tests `force-encounter-cleanup-originating-client`, `hp-recompute-hooks-originating-client` (fail before, pass after) | see git log |
| 3O (partial) | 25 dead modules + stale badge guide deleted (4,933 non-blank lines); legacy static ProgressionEngine stack (10 modules) and dead critical-confirmation roll removed (F-PRG-005, F-ROL-002). `progression-event-processor.js` is now test-only: the 3C Lineage idempotency fix guards code with no live caller | see tracker |
| 3N-PRQ | contract recorded (`docs/architecture/v2-contracts/PRQ-canonical-prerequisite-registry.md`); PRQ.0A census done (`docs/audits/architecture-census/prq-0a-corpus-census.md`, `tools/prq-corpus-census.mjs`). **Production integration (PRQ.1D/E) is gated on the ActorEngine and DerivedCalculator refactors.** | Findings below |
| 3N-AE / 3N-TE / 3N-DC / 3N-PRQ / 3N-PRG | **roadmap recorded** (`docs/architecture/v2-contracts/PHASE-3N-structural-roadmap.md`); not started by design. Order: AE -> TE -> DC (hard certification gate) -> PRQ -> PRG, after domain phases stabilize consumers | |
| other 3E–3P | not started | |

## Owner decisions currently blocking work (all in the tracker as `requiredDecision`)
`node -e` helper: `node tools/architecture-census/tracker.mjs summary`; the full text of each question is in `tracker.json` under the finding.
1. AD-008: canonical flag namespace + one-time migration approval (F-INF-005, F-PAT-005).
2. F-FRC-002: Force Point maximum formula / `dailyForcePoints` house rule (rules-sensitive).
3. Credit authority exceptions: Party Fund (F-VEH-006), Force Alchemy (F-FRC-005, F-STO-003), sheet credit edits (F-UIS-001, F-STO-005), Lineage awards (F-STO-004, F-ABL-002).
4. F-HOL-002: Holonet trade/payout settlement approach (needs live Foundry acceptance either way).
5. F-CMB-004: retire vs route the old Combat Action Browser.

## Next executable subphases (no owner decision needed)
- 3D.1/3D.2: reroute direct flag writes to `ActorEngine.updateActorFlags` / `unsetActorFlag`, grouped by owning subsystem (talents: 72 sites in 11 files first), each group its own test + ratchet lowering.
- 3E: damage-threshold discrepancy is a rules question; combat patch folding (F-CMB-007) is not.
- 3F.2: gate and consolidate the 36 feat metadata listeners (F-FEA-001).
- 3O (after reroutes): delete statically confirmed dead modules directory by directory with the deletion checklist (Part XVII).

## Measured effect so far (ratchet, current code vs baseline)
- Live direct document writes (A-02, reachable modules): 295 -> 200; exact runtime function-clone groups: 33 -> 31; no new violations in any probe; no new cycles.
- Rolling test suite: 798 passed, 0 failed (794 baseline + 4 new: Force Point pool, store created-actor rollback, credit grant idempotency, ActorEngine flag governance).
- Tracker: 3 findings OFFLINE_TESTED, 1 PARTIALLY_COMPLETE_BLOCKED, 2 IMPLEMENTED, 11 OWNER_DECISION_REQUIRED, 1 VERIFIED_NO_CHANGE_NEEDED, 256 OPEN.
- Nothing is FOUNDRY_TESTED.

## PRQ.0A findings (current packs, read-only)
- Feats: 353 records (matches the certified manifest), 1 same-name group. Only 96 carry `prerequisitesStructured`; 61 are text-`None` with no structure; **196 have prerequisite text with no structured form** and 1 structured `feat` condition (no UUID). So runtime still has to parse feat prose for ~55% of feats; the compiler cannot treat the production structure as complete.
- Talents: 1,187 records, 21 same-name groups. 327 structured (311 `talent` conditions, all UUIDs resolve inside `talents.db`), 572 text-`None`, **288 text prerequisites without structure**.
- Structured grammar in production today: `all` groups of `skillTrained`, `attribute`, `bab`, `species`, `feat`, `talent`. No `any`/OR group, class-level, Force power/technique/secret, Dark Side, droid-system or scoped-feat condition exists in the packs yet; those must come from the certified authority tables / source evidence (PRQ.0B/0C) rather than invention.
- Next read-only steps: PRQ.0B source/schema compatibility report (the 20 defect classes) and a same-name collision map; neither edits packs.

## 3D.2 residual direct-write classification (live probe, ~188 sites in ~60 files)
Each remaining site was classified; none is an unreviewed bypass of a *mechanical-state* actor flag.
- **Legitimate Foundry exception / unowned documents** (kept): owned items route through `ActorEngine.updateOwnedItems`, with `weapon.update(...)` only as the fallback for unowned world/compendium items (`ammo-system.js`, `UpgradeService.js`, `fire-state-store.js`, `poison-engine.js` coating); world-collection creation/deletion helpers (`document-api-v13.js`, `world-data-loader.js`, `feat-pack-seeder.js`); token documents (`lightsaber-light-sync.js`, `swse-item-sheet.js` token updates, `progression-shell.js` token delete); item-sheet writes to the sheet's own item (`swse-item-sheet.js`).
- **Internal implementation of an authoritative service** (kept): `core/mutation-safety.js` (mutation lock/snapshot flags), `utils/hardening.js` (statblock mode snapshot), `damage-resolution-engine.js` (runs inside `ActorEngine.applyDamage`), `encounter-use-tracker.js` and `meta-resource-feat-resolver.js` (ActorEngine imports them; importing back would add static cycles), `utils/flags/swse-flags.js` (the governed flag shim itself).
- **Rerouted this program** (~107 actor-flag sites): talents, force, feats, combat, crafting, suggestion/mentor state, registries (faction/location), session storage, minion manager, store cart, holonet presence/intel, chargen checkpoints, sheet settings, lightsaber router, combat status and action-economy persistence (all `recalc:false`, preserving previous semantics; none of these flags feeds `DerivedCalculator`).
- **Owner/rules-sensitive or needing per-site tests, deferred**: actor creation/deletion sites (`faction-registry-service.js`, `gm-contact-actorizer-service.js`, `npc-template-importer-engine.js`, `follower-orphan-transfer-hotfix.js`, `follower-creator.js`, `ally-assignment-modal.js` — follower/NPC lifecycle, 3H), `actor-utils.js` atomic update helper (shim over `actor.update`, 3N-AE), `character-like-sheet.js`/`swse-actor-base.js` document writes (3M sheet pass), `deleteCombat` cleanup in `force-executor.js` (F-FRC-006, needs responsible-GM gating test), `store-droid-construction.js` token delete (3J).

## Continuation handoff (latest checkpoint)
- Branch `refactor/v2-architectural-realignment`; PR #1186 (draft). Verify HEAD with `git log -1`; CI for earlier heads green except one transient failure fixed in `b8a71816b` (misplaced import).
- Done this session: 3D.2 reroutes + residual classification; 3D.3 (F-GOV-001); 3D.4; 3F.2 (F-FEA-001); 3M chat routing; 3O partial deletions (29 dead modules + guide, ~7k lines); F-ROL-002; F-FRC-006; HP-recompute and deleteCombat multi-client gates; PRQ contract + PRQ.0A census; Phase 3N structural roadmap recorded.
- Not started (by dependency): 3N-AE, 3N-TE, 3N-DC, 3N-PRQ (data work: feats 196 / talents 288 text-only prerequisites), 3N-PRG, 3P docs/report.
- Next exact tasks (independent, no owner decision): (1) responsible-GM gating of the ungated `combatTurn` listeners (`combat-automation.js`, `active-effects-manager.js`, Sith/Jedi-prestige/lightsaber talent actions) with a test; (2) 3E combat patch folding (F-CMB-007); (3) 3G progression items and the mannequin contract preparation (audit `summary-step.js` projections, add baseline summary tests); (4) 3H follower lifecycle writes; (5) 3I/3J item/vehicle writes; (6) 3O second pass: dead modules still blocked by CSS/templates/tests; (7) PRQ.0B compatibility report (read-only).
- Blocked on owner: the 11 `OWNER_DECISION_REQUIRED` findings in `tracker.json`; `feature-dispatcher.js` test question (F-PRG-005); `progression-event-processor.js` wiring (F-ABL-002/F-STO-004).
- Nothing is FOUNDRY_TESTED. Re-run `node tools/run-rolling-tests.mjs`, `NODE_TOOLS=/opt/node-tools node tools/architecture-census/check-architecture.mjs`, `node tools/architecture-census/tracker.mjs check` before each commit.
