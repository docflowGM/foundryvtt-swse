# SWSE Class Phase 6D — Source-certified class unlock corrections (tranche 1; Enforcer addendum)

**Date:** 2026-11-02  
**Branch:** `fix/class-mechanics-core-skills`  
**Review:** Draft PR #1093 (unmerged)  
**Scope:** Seven class feature schedules, one feature label in the separate registry, typed Share Talent entitlement. **No talent-tree records modified.**

## Authority and production changes

| Class | Printed authority | Before | Now | Remaining runtime work |
|---|---|---|---|---|
| Officer | Core Rulebook pp. 221–222, Table 12-11 and Share Talent text | Normal `talent_choice` at even class levels; five separate Command Cover rows | Five distinct `share_talent_choice` selections on 2/4/6/8/10; ordinary talents only on 1/3/5/7/9; one Command Cover grant on 2 | Dedicated Share Talent picker, session selection schema and canonical finalizer validation/persistence now implemented. **Not yet live-certified.** Add share-use action/once-per-day/ally limits separately. |
| Improviser | Rebellion Era p. 41, Table 2-2 | Bad comma split `Contraband (2` + `000 credits)`, including odd-level fragments | One `Contraband` scaling entry per even level 2/4/6/8/10 with typed value 2,000/4,000/6,000/8,000/10,000 credits | Canonical scaling feature upsert now updates existing class-feature Item through ActorEngine transactional update.items; legacy malformed actor items require a separate migration. Actual goods acquisition is not automated. |
| Enforcer | Force Unleashed p. 44, Table 3-2 and Resources | Ten separate Resources class-feature grants | Resources unlock at class level 1 with separate typed recurring equipment entitlement at every Enforcer level | Implement per-level equipment grant of heroic level × 2,000 credits, including carry-forward when deferred; level-up audit should verify resources without creating duplicate feats. |\n| Crime Lord | Core pp. 209–210 | Five separate Command Cover scaling item grants | One Command Cover unlock at 2 with typed level scaling | Implement adjacency-dependent cover bonus. Ensure no double-count with Officer Command Cover. |
| Force Disciple | Core p. 215 | Five separate Prophet class-feature entries | One Prophet grant at level 1; Force Secrets unchanged 2/3/4/5 | Per-level Destiny Point mechanics and GM vision remain separate from grant identity. |
| Infiltrator | Force Unleashed p. 49, Table 3-4 | `+1d_`, `+2d_`, `+3d_` placeholders | Printed labels `+1 die`, `+2 dice`, `+3 dice` at 2/6/10; typed count | Stun damage action integration/level advancement separate. |
| Master Privateer | Force Unleashed p. 52, Piracy | `Lure of Piracy` displayed | `Piracy` at level 1; separate feature-definition display name corrected | Existing historical catalog ID preserved. Dark-side ongoing level restriction not implemented in this tranche. |

The Core and Rebellion PDF tables were visually compared directly with the user's uploaded scans; the Force Unleashed Enforcer page was checked against the supplied source text, and the remaining corrections were checked against earlier PDF-certified Phase 6B claims and sourcebook text.

## Bonus-feat source correction — Wicked Strike

The supplemental **Scum & Villainy clarifications, printed p. 21**, explicitly add **Wicked Strike** to the **Jedi** and **Noble** class bonus-feat lists (not Scoundrel, Scout or Soldier). The existing production feat is canonical ID `5bef5e65e532ba7c`; the class-owned `featNames` already included the feat for Jedi and Noble, but both `featIds` arrays omitted its identity. Inserted that same ID exactly once into those two canonical pools, without editing the feat itself. The two list sizes are now Jedi 80 and Noble 56. `tests/class-bonus-feat-wicked-strike-authority.test.mjs` verifies printed eligibility, full ID integrity and no accidental eligibility in the other three classes.

**Separate outstanding issue:** A generic Weapon Proficiency or Weapon Focus feat ID covers several class-specific named group choices. `FeatSlotValidator` checks the feat ID, not the chosen weapon group. A targeted specialization restriction audit is still required.

## Guard and entitlement boundary

- `packs/classes.db` is the operational class SSOT. No additional class pack was introduced.
- `levelup-entitlement-manifest.js` and `feature-dispatcher.js` now classify `share_talent_choice` separately from ordinary `talent_choice`.
- `share-talent-step.js` is registered as an even-Officer-level conditional step with its own UI, session array, and source-verified owned-talent picker. `levelup-finalization-audit.js` requires precisely one selection at the current Officer level; `ProgressionFinalizer` independently revalidates ownership, permitted tree and uniqueness, then writes a permanent `flags.swse.classFeatures.officer.sharedTalents` entry through the ActorEngine mutation plan. A new talent Item is NEVER granted. The in-combat sharing action itself remains unimplemented and live certification remains required.
- The `levelup-entitlement-manifest` now threads `featureKey` and unit metadata. `class-scaling-feature-upsert.js` plans monotonic replacement of canonically keyed class-feature Items with `update.items`; `ProgressionFinalizer` uses ActorEngine transactionally to perform the update. This resolves newly materialized Contraband and Unarmed Stun item value progression. Legacy malformed actor items require explicit separate migration, not a guessed name rewrite. Item existence still **does not certify the feature's active mechanical effect**.
- No class feature runtime effect automation is claimed as completed.
- `data/audits/class-mechanics-protected-baseline.json` preserves all 37 original class identities/fields, with only the three previously approved skills/BAB fields exempt and **seven exact approved class-record fingerprints** for source-certified level-row replacements. No wildcard exemption for all class progression records.
- Older Phase 3D class-byte-frozen test now delegates to the same protected identity/field check; Phase 5C classification includes the three added audit files. No talent/weapon SSOT content was altered.

## Phase 6E follow-on checkpoint — Resources, Command Cover, Share Talent action preflight

### Enforcer Resources: recurring EQUIPMENT entitlement accounting (implemented)

- Printed authority: *The Force Unleashed Campaign Guide* p. 44. At **each** Enforcer class level the actor has access to restricted or military equipment worth **2,000 × new heroic level** credits, delivered to a civilized accessible location. A player may elect to defer the equipment allotment so its value combines with the next Enforcer-level allotment.
- `scripts/engine/progression/utils/enforcer-resources-entitlement.js` creates an exact-once resource entitlement entry per Enforcer class level, and carries forward **only explicitly deferred** value from the preceding Enforcer level. It records amount, heroic level, restriction, source session, and pending delivery status.
- `ProgressionFinalizer` uses the existing `getLevelSplit` authority to increment heroic (not total) level, failing closed when the pre-level class ledger cannot reconcile to the entering character level and saves the entries in `flags.swse.classFeatures.enforcer.resources` through the transaction. The post-finalization audit refuses a missing or malformed entitlement.
- **Not yet implemented:** class resource equipment chooser, restricted/military price and eligibility checks, GM approval/delivery workflow, and a player deferral control that changes the ledger status to `deferred-to-next-level`. The pending record is **NOT actor credits** and **NOT automatically issued equipment**. Previously leveled Enforcers need migration decisions.

### Crime Lord / Officer Command Cover: contextual cover defense (implemented, live check pending)

- Printed authority: Core Rulebook Command Cover text for Crime Lord and Officer. Each adjacent ally supplies a **+1 cover bonus** to **Reflex Defense**, up to **floor(class level/2)** (maximum +5). Two prestige classes granting Command Cover do not stack the same cover type.
- `scripts/engine/combat/class-command-cover.js` checks actual source-tagged class-feature ownership, current class levels and allied token adjacency on square-grid scenes. It fails closed with no unambiguous token, invalid/neutral disposition, or unsupported grid.
- `scripts/combat/rolls/attacks.js` applies the contextual Command Cover value through the existing target-defense authority, rather than modifying the actor's permanent derived Reflex. Ordinary cover and Command Cover combine by the higher cover bonus **within this resolver**; attack context-specific suppression, unusual token topology and alternate combat resolution paths need a live Foundry review.
- **Not yet certified:** Foundry v13 scene/elevation tests, tactical ally/disposition rules for multiple factions, hex-grid adjacency, cover-suppression attack options, and every alternate combat caller. Do not claim full runtime coverage from pure tests.

### Officer Share Talent combat use: strict planner (implemented as rules-only preflight)

- Core Rulebook p. 222: each permanently selected talent can be shared **once per day as a standard action**, with up to half Officer class level allies within 10 squares who can see and hear the Officer. The talent remains effective through encounter end, and recipients need not meet its prerequisites.
- `scripts/engine/combat/officer-share-talent-action-rules.js` validates the action budget, exact selected talent, daily-use history, encounter identity, recipient count, range and eligibility. `tests/officer-share-talent-action-rules.test.mjs` probes success and refusal scenarios.
- **Not yet implemented:** scene-measured sight/range/hearing proof, an action button/controller, transaction-safe daily-use spending, temporary talent benefits through the canonical talent-effects owner, encounter-end cleanup and UI readout. The planner does not mutate actors or give them abilities. **Do not present this as a usable Share Talent combat action.**

**Test files**: `tests/enforcer-resources-entitlement.test.mjs`, `tests/class-command-cover.test.mjs`, `tests/officer-share-talent-action-rules.test.mjs`. Exact-head CI and Foundry scene testing required before merge.

## Verification

- `tests/class-phase-6d-officer-improviser-unlocks.test.mjs` — Officer Share Talent class-level cadence and Improviser exact credit values.
- `tests/class-phase-6d-other-feature-unlocks.test.mjs` — Crime Lord, Force Disciple, Infiltrator and Master Privateer.
- `tests/class-phase-6d-share-talent-finalization.test.mjs` — invalid Officer extra talent cannot satisfy Share Talent; even-level finalization fails closed.
- `tests/class-pack-protected-guard.test.mjs` — protected data gate.
- `tests/officer-share-talent-authority.test.mjs`, `tests/officer-share-talent-step-wiring.test.mjs` — canonical ownership/tree/uniqueness rules and step/session/finalizer routing.
- `tests/class-scaling-feature-upsert.test.mjs` — canonical keyed scaling, monotonic values, ActorEngine update path.
- Read-back: 37 class records retained; six allowed feature changes match exact frozen fingerprints, and all other class records preserve protected fields.
- Full GitHub CI and Foundry VTT v13 end-to-end remain outstanding at this checkpoint. Keep the PR draft/unmerged.

## Next implementation sequence

1. Officer Share Talent UI, provenance, and persistent finalization path are implemented; **verify in live Foundry**. Implement gameplay ability use (once/day, standard action, up to half Officer level allies within 10 squares that can see/hear the Officer, duration end of encounter).
2. Canonically keyed scaling class-feature upsert is implemented through ActorEngine; verify transaction/rollback and existing-character migration for previously malformed names.
3. Implement Crime Lord / Officer Command Cover active adjacency/cover calculations and Force Disciple Prophet Destiny Points in their appropriate subsystem.
4. Integrate the source-confirmed Enforcer Resources repeat-per-level **equipment allowance**, not duplicate feature-item grants. Audit remaining repeated grants individually; do not touch talent-tree membership.
5. Re-run all focused/rolling CI and Foundry v13 multiclass/level-up tests before merger.

**Status:** Source rows, dedicated Officer choice flow, persistent immutable selection validation, and canonical scaling Item upsert implemented. **Not merge-ready** until new CI passes, full Foundry v13 end-to-end testing, Enforcer Resources implementation, gameplay effects, and existing-character migration decisions are resolved.
