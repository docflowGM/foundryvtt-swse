# B-NPC — NPCs, nonheroic, followers, minions, allies, beasts (domain contract)

**Audited commit:** `f734b4d` (census at HEAD `2beb7cb`). **Domain id:** `npc-followers`. **Census size:** 28 runtime modules / 9,761 SLOC (23 static, 5 orphan). Follower slot services classified `vehicles` by directory (`scripts/engine/crew/{follower-slot-service,ally-assignment-service,follower-talent-config}.js`) and the six `scripts/patches/follower-*.js` hotfixes (compat-patches) are contracted here by responsibility. Sidecar: `data/audits/architecture-census/contracts/domains/npc-followers.json`. Level A by ID; OSI (`A-OPEN-01`). Nothing here is `FOUNDRY_TESTED` (A-13).

## 1. Purpose and boundaries

Owns: follower/minion/ally/beast relationships and slots on an owner actor; talent-granted follower entitlements and their reconciliation; follower derivation from owner level; minion talent bookkeeping; NPC template import and NPC statblock legal review; faction/relationship registry; the NPC sheet's NPC-specific context.

Must NOT own: progression steps/finalization (A-15 → follower progression shell in B-PRG), defense/ability calculations (actor-core), actor mutation (A-02), class legality. APPROVED (OSI/A-18): Nonheroic is not normally a player class; follower/beast leveling is granted by talents/features, not free choice.

## 2. Responsibility ownership

| ID | Responsibility | Owner (path · symbol) | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-NPC-01 | Canonical follower slots (`flags.foundryvtt-swse.followerSlots`) | `scripts/engine/crew/follower-slot-service.js` · `FollowerSlotService` (self-declared canonical) | OBSERVED · CONFLICT (6 writers, F-NPC-001) | behavior-code-verified | `scripts/engine/crew/follower-slot-service.js:4`, `scripts/engine/crew/follower-slot-service.js:173` |
| R-NPC-02 | Talent → follower entitlement config | `scripts/engine/crew/follower-talent-config.js` · `getFollowerTalentConfig` (15 consumers) | OBSERVED · APPROVED (A-18 talent-granted) | source-inspected | `scripts/infrastructure/hooks/follower-hooks.js:326` |
| R-NPC-03 | Slot creation/detach on talent create/delete | `scripts/infrastructure/hooks/follower-hooks.js` · `initializeFollowerHooks` | OBSERVED | behavior-code-verified | `scripts/infrastructure/hooks/follower-hooks.js:307`, `scripts/infrastructure/hooks/follower-hooks.js:51` |
| R-NPC-04 | Follower creation/derivation from owner level | `scripts/apps/follower-creator.js` · `FollowerCreator` (16 consumers; app module holding domain logic) | OBSERVED · CONFLICT (A-07 placement, F-NPC-004) | dependency-traced | `scripts/apps/follower-creator.js:55`, `scripts/engine/crew/ally-assignment-service.js:793` |
| R-NPC-05 | Follower enhancements (owner bonuses) | `scripts/apps/follower-manager.js` · `FollowerManager` (ActorEngine-routed) | OBSERVED | source-inspected | `scripts/apps/follower-manager.js:19` |
| R-NPC-06 | Minion creation and minion talent bookkeeping | `scripts/apps/minion-creator.js` · `MinionCreator`; `scripts/apps/minion-manager.js` · `MinionManager` | OBSERVED · CONFLICT (A-02, F-NPC-002) | behavior-code-verified | `scripts/apps/minion-creator.js:408`, `scripts/apps/minion-manager.js:86` |
| R-NPC-07 | Ally assignment / conversion to follower | `scripts/engine/crew/ally-assignment-service.js` · `AllyAssignmentService` | OBSERVED | source-inspected | `scripts/engine/crew/ally-assignment-service.js:894` |
| R-NPC-08 | Follower defenses | DefenseCalculator (actor-core) monkey-patched by `follower-npc-sheet-parity-hotfix.js`; display recompute in `npc-sheet-helpers.js` | OBSERVED · CONFLICT (three computations, F-NPC-003) · DEFERRED_RULES_REVIEW | behavior-code-verified | `scripts/patches/follower-npc-sheet-parity-hotfix.js:286`, `scripts/sheets/v2/npc/npc-sheet-helpers.js:238` |
| R-NPC-09 | NPC template import | `scripts/engine/import/npc-template-importer-engine.js` (world Actor create) | OBSERVED (A-02 world-document exception) | source-inspected | `scripts/engine/import/npc-template-importer-engine.js:203`, `scripts/engine/import/npc-template-importer-engine.js:364` |
| R-NPC-10 | NPC damage profile hydration | `scripts/engine/import/npc-damage-hydration-hooks.js` | OBSERVED · CONFLICT (A-02, hook-driven world scan; F-NPC-005) | behavior-code-verified | `scripts/engine/import/npc-damage-hydration-hooks.js:152`, `scripts/engine/import/npc-damage-hydration-hooks.js:227` |
| R-NPC-11 | Faction/relationship registry | `scripts/allies/faction-registry-service.js` · `FactionRegistryService` (24 consumers) | OBSERVED · CONFLICT (direct setFlag, F-NPC-006) | source-inspected | `scripts/allies/faction-registry-service.js:318`, `scripts/allies/faction-registry-service.js:995` |
| R-NPC-12 | NPC sheet subclass/context | `scripts/sheets/v2/npc-actor-sheet.js` · `SWSEV2NpcSheet`; `scripts/sheets/v2/npc/npc-sheet-helpers.js` | OBSERVED (A-14 conforms; see B-UIS) | dependency-traced | `scripts/sheets/v2/npc-actor-sheet.js:30` |
| R-NPC-13 | Nonheroic offered only in nonheroic sessions | `scripts/apps/progression-framework/steps/class-step.js` (B-PRG owner) | OBSERVED (A-18 conforms) | source-inspected | `scripts/apps/progression-framework/steps/class-step.js:73` |

## 3. Authorities

- **Canonical data:** owner flags `followerSlots`, `followers`, `minions`, `beasts`, `assignedAllies` (OBSERVED); FollowerSlotService declares itself canonical for slots (APPROVED by `docs/audits/follower-mutation-transaction-authority-phase-6-addendum.md` scope) — CONFLICT with six observed writers.
- **Rules:** talent-granted entitlements via `follower-talent-config.js`; minion talent text in `MinionManager.MINION_TALENTS` is a hand-written paraphrase with no source citation (DEFERRED_RULES_REVIEW for any mechanical use; currently write-only, F-NPC-002). Beast creation/readiness: `GP-RD-010`, `GP-RD-011`. Nonheroic: `RECON-002`, `RECON-003`.
- **Mutation:** ActorEngine in follower-creator/manager/hooks; direct `setFlag` in minion modules, faction registry and two hotfixes.

## 4. Public interfaces

| Symbol | path:line | Consumers | Contract |
|---|---|---|---|
| `FactionRegistryService` | `scripts/allies/faction-registry-service.js:318` | 24 | faction/relationship records |
| `FollowerCreator` | `scripts/apps/follower-creator.js:55` | 16 | create/derive/update follower |
| `isFollowerSlotOccupied` / `resolveFollowerSlotActorId` | `scripts/domain/followers/follower-slot-occupancy.js` | 16 | pure occupancy |
| `getFollowerTalentConfig` | `scripts/engine/crew/follower-talent-config.js` | 15 | talent → entitlement |
| `FollowerSlotService` | `scripts/engine/crew/follower-slot-service.js:173` | 6 | canonical slot writes |
| `AllyAssignmentService` | `scripts/engine/crew/ally-assignment-service.js:894` | 6 | ally assign/convert |

## 5. Dependencies

Allowed (PROPOSED): actor-core, progression adapters (follower deriver/advancer), infrastructure, store (owner wallet). Prohibited: engine → apps (A-07). Observed: `scripts/engine/crew/ally-assignment-service.js:793` dynamically imports `apps/follower-creator.js`; `follower-progression-live-state-hotfix.js` imports `follower-hooks.js` and patches progression step prototypes.

## 6. Integration points and lifecycle

Hooks (live): `scripts/infrastructure/hooks/follower-hooks.js:307` createItem, `scripts/infrastructure/hooks/follower-hooks.js:346` deleteItem, `scripts/infrastructure/hooks/follower-hooks.js:421` `swse:progression:completed`, `scripts/infrastructure/hooks/follower-hooks.js:434` updateActor; `scripts/allies/faction-registry-service.js:310` ready; `scripts/engine/import/npc-damage-hydration-hooks.js:220` createActor, `scripts/engine/import/npc-damage-hydration-hooks.js:227` ready. Hotfix hooks: `scripts/patches/follower-repeatable-entitlement-hotfix.js:239-260` (createItem/updateItem/deleteItem/createActor/progression/renderApplicationV2), `scripts/patches/follower-orphan-transfer-hotfix.js:411-429`, `scripts/patches/follower-species-repair-hook.js:95`, `scripts/patches/follower-npc-sheet-parity-hotfix.js:506`. Registered through `scripts/patches/runtime-bugfix-hotfixes-init.js:12-15`. Ordering between `follower-hooks` createItem and the repeatable-entitlement createItem repair is not defined.

## 7. Failure behavior and domain invariants

Follower finalization uses a reverse-order compensating coordinator (`follower-mutation-transaction.js`, phase-6 addendum). NPC-I1 one slot writer (PROPOSED; violated). NPC-I2 one follower defense computation (PROPOSED; violated). NPC-I3 no follower behavior installed by prototype patches (A-09; violated by four hotfixes). A-18 Nonheroic/talent-granted leveling conform in the paths read.

## 8. Level C subsystem contracts

- **C-NPC-1 Follower entitlement** — talent item → `getFollowerTalentConfig` → slot (FollowerSlotService) → follower actor (FollowerCreator via progression follower shell) → reconcile on progression completed. OBSERVED, with competing writers.

## 9. Tests and certification

29 follower/NPC tests in `tests/`. Offline here: `tests/follower-hooks-governed-cleanup.test.mjs` pass, `tests/follower-slot-reservation.test.mjs` pass, `tests/npc-v2-convergence.test.mjs` 35/35 pass; `node tools/check-follower-mutation-authority.mjs` reports no violations but scans only 7 files and is not wired into CI. `minion-manager.js`, hotfixes, `npc-sheet-helpers.js`, `npc-damage-hydration-hooks.js` have 0 direct tests. No Foundry acceptance.

## 10. Reconciliation with existing contracts

Agreement: phase-6 addendum's transaction coordinator exists and is ActorEngine-governed for follower creator/manager.

| ID | Existing source | Claim | Observed |
|---|---|---|---|
| CR-NPC-01 | `docs/audits/follower-mutation-transaction-authority-phase-6-addendum.md:282` | "No direct setFlag() remains in normal follower mutation paths" | True only for the 7 files the checker scans (`tools/check-follower-mutation-authority.mjs:87`). Direct `setFlag` on `followerSlots`/`minions` remains in `scripts/apps/minion-creator.js:408`, `scripts/apps/minion-creator.js:419`, `scripts/apps/minion-manager.js:86-142`, `scripts/patches/follower-repeatable-entitlement-hotfix.js:170`, `scripts/patches/follower-orphan-transfer-hotfix.js:99`, `scripts/patches/follower-orphan-transfer-hotfix.js:225` |
| CR-NPC-02 | `scripts/engine/crew/follower-slot-service.js:4` | single canonical followerSlots writer | Six modules write the array |

## 11. Phase 2 conformance summary

| ID | Sev | Title |
|---|---|---|
| F-NPC-001 | high | Six writers of `followerSlots`, two hotfixes via direct setFlag, unordered createItem hooks |
| F-NPC-002 | medium | Minion modules write owner/minion flags directly from a createItem hook; minion talent flags are write-only, uncited rule text |
| F-NPC-003 | high | Three follower defense computations disagree (Fortitude ability), one installed by monkey-patching DefenseCalculator |
| F-NPC-004 | medium | Follower domain authority lives in `apps/follower-creator.js`; engine imports it |
| F-NPC-005 | medium | NPC damage hydration mutates owned items from createActor/ready hooks without ActorEngine |
| F-NPC-006 | low | Faction registry direct setFlag on actors (A-02) |
| F-NPC-007 | medium | Six follower hotfix modules (1,977 lines) with prototype patches and global render listeners |
| F-NPC-008 | low | Orphan NPC panel modules and nonheroic units browser |
| F-NPC-009 | info | NPC template import and world actor creation: legitimate world-document exceptions |

## 12. Unimplemented, deferred and acceptance-required

- DEFERRED_RULES_REVIEW (new, unregistered): (a) which ability modifier drives a follower's Fortitude Defense — the hotfix uses CON, the NPC sheet display uses max(STR, CON); (b) whether `MinionManager.MINION_TALENTS` descriptions match the printed talents (no source/page recorded). Existing: `GP-RD-010`, `GP-RD-011`, `RECON-002`, `RECON-003`.
- FOUNDRY_ACCEPTANCE_REQUIRED: add/remove a recruiting talent (slot created once), follower creation from slot, owner level-up derivation, follower defenses shown vs used in rolls, orphan transfer on owner deletion, NPC import + damage hydration.
