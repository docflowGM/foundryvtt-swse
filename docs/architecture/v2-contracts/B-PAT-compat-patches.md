# B-PAT — compat-patches (hotfix layer and runtime monkey-patches)

**Level:** B. **Audited commit:** `f734b4d` (code identical at HEAD). **Sidecar:** `data/audits/architecture-census/contracts/domains/compat-patches.json`. **Facts:** `scripts/patches/**` — 17 live modules, 3,939 SLOC, all reachable. This contract also inventories **every runtime monkey-patch found anywhere** (probe `P-A09` plus a wider static scan done for this audit), each attributed to its owner domain.

## 1. Purpose and boundaries

A-09 (APPROVED: ARCHITECTURE §VIII, progression-architecture "no runtime patching", E3-A4 OA-1, OSI) says there should be no hotfix layer, no runtime monkey-patches and no parallel authorities. This domain therefore has **no target-state responsibilities**: its only legitimate content is a time-boxed list of patches awaiting fold-back into their owner modules. Everything here is legacy class **D** (compatibility wrapper — delete after rerouting) or **F** (runtime-risk feature that needs runtime validation before folding), unless noted.

## 2. Responsibility ownership (observed, transitional)

| ID | Responsibility | Owner | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-PAT-01 | Load all hotfixes at module evaluation (side-effect import) | `scripts/patches/runtime-bugfix-hotfixes-init.js` | OBSERVED · CONFLICT (A-09) | dependency-traced | `scripts/patches/runtime-bugfix-hotfixes-init.js:21-38`; imported by `scripts/talents/squad-actions-init.js:6`, itself a side-effect import at `index.js:91` |
| R-PAT-02 | Progression step behaviour overrides (language choice, feat chain, follower steps) | `progression-choice-language-hotfix.js`, `progression-feat-chain-hotfix.js`, `follower-progression-live-state-hotfix.js` | OBSERVED · CONFLICT (A-09, A-15) | source-inspected | `scripts/patches/progression-choice-language-hotfix.js:85`, `scripts/patches/progression-feat-chain-hotfix.js:63`, `scripts/patches/follower-progression-live-state-hotfix.js:85` |
| R-PAT-03 | Combat/attack corrections (attack options, roll attack, chat payload) | `attack-dialog-combat-corrections-hotfix.js`, `combat-ui-behavior-hotfix.js` | OBSERVED · CONFLICT | source-inspected | `scripts/patches/attack-dialog-combat-corrections-hotfix.js:121`, `scripts/patches/combat-ui-behavior-hotfix.js:282` |
| R-PAT-04 | Follower lifecycle repairs (orphan transfer, entitlement, species materialization, NPC sheet parity) | `follower-*-hotfix.js`, `follower-species-repair-hook.js` | OBSERVED · CONFLICT (A-02, A-09) | behavior-code-verified | `scripts/patches/follower-orphan-transfer-hotfix.js:99`, `scripts/patches/follower-repeatable-entitlement-hotfix.js:170` |
| R-PAT-05 | Sheet/defense hydration overrides | `armor-hydration-defense-hotfix.js`, `follower-npc-sheet-parity-hotfix.js` | OBSERVED · CONFLICT | source-inspected | `scripts/patches/armor-hydration-defense-hotfix.js:80`, `scripts/patches/follower-npc-sheet-parity-hotfix.js:276` |
| R-PAT-06 | Data-shape coherence guards (weapon branch, class-level ledger, ability prereq) | `weapon-branch-coherence-hotfix.js`, `progression-ledger-reconciliation-hotfix.js`, `canonical-ability-prerequisite-hotfix.js` | OBSERVED · CONFLICT | source-inspected | `scripts/patches/weapon-branch-coherence-hotfix.js:101`, `scripts/patches/canonical-ability-prerequisite-hotfix.js:140` |

## 3. Authorities

None. Every patch overrides an authority owned elsewhere (named in §11 and the sidecar). APPROVED target (A-09): zero.

## 4. Public interfaces

Only `register*Hotfix()` functions (one per module, called from `runtime-bugfix-hotfixes-init.js:21-38`) plus a few exported helpers reused elsewhere (`orphanFollowersForOwner`, `transferOrphanFollower` in `follower-orphan-transfer-hotfix.js`; `repairRepeatableFollowerEntitlements`). Consumer counts 1–3 each (registry).

## 5. Dependencies

Patches import their targets (combat 13, progression 13, actor-core 10, npc-followers 8 …). Prohibited by A-09: any new patch. Observed: `combat-ui-behavior-hotfix.js:493` contains an exact clone of `scripts/engine/combat/features/combat-feature-handlers.js:182` `applyForcedAttackOption` (176 tokens).

## 6. Integration points and lifecycle

Order: `index.js:91` evaluates `squad-actions-init.js` at import time (before `init`), which evaluates `runtime-bugfix-hotfixes-init.js`, which immediately calls 17 register functions; most defer work to `Hooks.once('ready')` (fact pack lists 11 `ready` sites) or wrap prototypes immediately. Load order therefore depends on ES-module evaluation order of `index.js`'s imports, not on an explicit composition step (F-PAT-003).

## 7. Failure behavior and invariants

Patches generally guard double-install with a flag (e.g. `SWSEChat[CHAT_OUTCOME_PATCH]`, `combat-ui-behavior-hotfix.js:285`) and swallow errors with `console.warn`. A patch whose target method is renamed silently stops applying (no test asserts installation). A-09 violated by design; A-02 violated at F-PAT-002.

## 8. Level C subsystem contracts

None — no real internal boundary.

## 9. Tests and certification

`tests/ti4c0-g11-caller-outcomes.test.mjs`, `tests/ti4c0-g34-progression-ledger-sync-authority.test.mjs`. No test verifies that each patch is still needed or still installs. Foundry acceptance: none; FOUNDRY_ACCEPTANCE_REQUIRED before removing any class-F patch.

## 10. Reconciliation

| ID | Source | Claim | Observed |
|---|---|---|---|
| CR-PAT-01 | `docs/architecture/progression-architecture.md` (= global CR-07) | No runtime patching | 30 live monkey-patch sites target progression steps/finalizer/resolvers (`TalentStep`, `ForcePowerStep`, `ProgressionFinalizer`, `FeatChoiceResolver`, `PrerequisiteChecker`, `AbilityEngine`) |
| CR-PAT-02 | ARCHITECTURE.md §VIII clean cutover; A-09 probe counts "20 prototype monkey-patches" | Probe pattern only matched `X.prototype.y =`; this audit's wider scan (static-method reassignment, `proto.y =`, `Document.prototype`) finds **108 live sites in 41 live files** (158 sites / 70 files incl. unreachable) — A-09's observed figure under-counts |
| CR-PAT-03 | `scripts/governance/mutation/MutationInterceptor.js:99` "PERMANENT FIX: Does NOT patch Actor.prototype.update anymore" | True for Actor.update, but `scripts/utils/flags/swse-flags.js:48-66` patches `foundry.abstract.Document.prototype.getFlag/setFlag/unsetFlag` for every document type, installed first in `init` (`index.js:101`) |

## 11. Phase 2 conformance summary

| ID | Sev | Status | Title |
|---|---|---|---|
| F-PAT-001 | high | confirmed | 108 live runtime monkey-patch sites in 41 live modules across 9 domains (full inventory in sidecar) |
| F-PAT-002 | high | confirmed | Follower hotfixes write owner-actor flags directly, non-atomically (`setFlag` ×2) |
| F-PAT-003 | medium | confirmed | Hotfix layer is composed by a side-effect import chain hidden in `squad-actions-init.js` |
| F-PAT-004 | high | confirmed | Wrapper chains: `CombatOptionResolver.collectAttackModifiers` wrapped by 8 live modules, `ForceExecutor.executeForcePower` by 4 — behavior depends on import order |
| F-PAT-005 | medium | confirmed | `Document.prototype` flag-scope patch (INF-owned) affects every document type |
| F-PAT-006 | low | confirmed | Probe false positives (`Set.delete`) and exact clone in combat-ui-behavior-hotfix |
| F-PAT-007 | low | confirmed | 29 unreachable monkey-patch modules (feat riders, combat adapters, sentinel hooks layers) |

## 12. Unimplemented, deferred, acceptance-required

- Every class-F patch (combat attack options, follower lifecycle, progression steps) is FOUNDRY_ACCEPTANCE_REQUIRED before fold-back: the patch exists because a live defect was observed, and the fold must reproduce behaviour exactly.
- DEFERRED_RULES_REVIEW: none raised here. Patches that encode stacking/feat behaviour (e.g. Skill Focus non-stacking, F-ACT-015) are moved, not re-ruled.
- Owner decision (A-09): approve a fold-back order and a "no new patch" ratchet (A-P3).
