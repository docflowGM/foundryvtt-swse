# SWSE Class Phase 6D — Source-certified class unlock corrections (tranche 1; Enforcer addendum)

**Date:** 2026-11-02  
**Branch:** `fix/class-mechanics-core-skills`  
**Review:** Draft PR #1093 (unmerged)  
**Scope:** Seven class feature schedules, one feature label in the separate registry, typed Share Talent entitlement. **No talent-tree records modified.**

## Authority and production changes

| Class | Printed authority | Before | Now | Remaining runtime work |
|---|---|---|---|---|
| Officer | Core Rulebook pp. 221–222, Table 12-11 and Share Talent text | Normal `talent_choice` at even class levels; five separate Command Cover rows | Five distinct `share_talent_choice` selections on 2/4/6/8/10; ordinary talents only on 1/3/5/7/9; one Command Cover grant on 2 | **BLOCKED pending dedicated picker**: choose an already-owned talent from Influence, Inspiration, Commando or Military Tactics, one new eligible identity at each even Officer level, immutable once chosen. Add share-use action/once-per-day/ally limits separately. |
| Improviser | Rebellion Era p. 41, Table 2-2 | Bad comma split `Contraband (2` + `000 credits)`, including odd-level fragments | One `Contraband` scaling entry per even level 2/4/6/8/10 with typed value 2,000/4,000/6,000/8,000/10,000 credits | Upgrade the already-granted feature's displayed current value instead of silently keeping a stale 2k item; source text/effect not yet automated. |
| Enforcer | Force Unleashed p. 44, Table 3-2 and Resources | Ten separate Resources class-feature grants | Resources unlock at class level 1 with separate typed recurring equipment entitlement at every Enforcer level | Implement per-level equipment grant of heroic level × 2,000 credits, including carry-forward when deferred; level-up audit should verify resources without creating duplicate feats. |\n| Crime Lord | Core pp. 209–210 | Five separate Command Cover scaling item grants | One Command Cover unlock at 2 with typed level scaling | Implement adjacency-dependent cover bonus. Ensure no double-count with Officer Command Cover. |
| Force Disciple | Core p. 215 | Five separate Prophet class-feature entries | One Prophet grant at level 1; Force Secrets unchanged 2/3/4/5 | Per-level Destiny Point mechanics and GM vision remain separate from grant identity. |
| Infiltrator | Force Unleashed p. 49, Table 3-4 | `+1d_`, `+2d_`, `+3d_` placeholders | Printed labels `+1 die`, `+2 dice`, `+3 dice` at 2/6/10; typed count | Stun damage action integration/level advancement separate. |
| Master Privateer | Force Unleashed p. 52, Piracy | `Lure of Piracy` displayed | `Piracy` at level 1; separate feature-definition display name corrected | Existing historical catalog ID preserved. Dark-side ongoing level restriction not implemented in this tranche. |

The Core and Rebellion PDF tables were visually compared directly with the user's uploaded scans; the Force Unleashed Enforcer page was checked against the supplied source text, and the remaining corrections were checked against earlier PDF-certified Phase 6B claims and sourcebook text.

## Guard and entitlement boundary

- `packs/classes.db` is the operational class SSOT. No additional class pack was introduced.
- `levelup-entitlement-manifest.js` and `feature-dispatcher.js` now classify `share_talent_choice` separately from ordinary `talent_choice`.
- Current `levelup-finalization-audit.js` explicitly blocks Officer even-level finalization rather than permitting free, newly acquired talents. This is **a deliberate interim fail-closed behavior**, not a completed Share Talent interface; **do not deploy/merge until the picker and persisted choice path are implemented**.
- The `levelup-entitlement-manifest` auto-item path materializes class-feature and scaling-feature metadata, but a feature item existing on a sheet **does not certify its mechanical effect**. In particular, same-name scaling item deduplication may leave an Improviser Contraband amount stale. Address this before merging.
- No class feature runtime effect automation is claimed as completed.
- `data/audits/class-mechanics-protected-baseline.json` preserves all 37 original class identities/fields, with only the three previously approved skills/BAB fields exempt and **seven exact approved class-record fingerprints** for source-certified level-row replacements. No wildcard exemption for all class progression records.
- Older Phase 3D class-byte-frozen test now delegates to the same protected identity/field check; Phase 5C classification includes the three added audit files. No talent/weapon SSOT content was altered.

## Verification

- `tests/class-phase-6d-officer-improviser-unlocks.test.mjs` — Officer Share Talent class-level cadence and Improviser exact credit values.
- `tests/class-phase-6d-other-feature-unlocks.test.mjs` — Crime Lord, Force Disciple, Infiltrator and Master Privateer.
- `tests/class-phase-6d-share-talent-finalization.test.mjs` — invalid Officer extra talent cannot satisfy Share Talent; even-level finalization fails closed.
- `tests/class-pack-protected-guard.test.mjs` — protected data gate.
- Read-back: 37 class records retained; six allowed feature changes match exact frozen fingerprints, and all other class records preserve protected fields.
- Full GitHub CI and Foundry VTT v13 end-to-end remain outstanding at this checkpoint. Keep the PR draft/unmerged.

## Next implementation sequence

1. Officer Share Talent dedicated owned-talent selection UI, provenance, one-choice-per-even-level persistence and finalization legality; then ability use (once/day, scaling allies, action and duration).
2. Generic scaling-class-feature **upsert/current-value** authority for Contraband and other repeated scaling rows (single owned feature, level-derived value), with ActorEngine mutations and rollback.
3. Implement Crime Lord / Officer Command Cover active adjacency/cover calculations and Force Disciple Prophet Destiny Points in their appropriate subsystem.
4. Integrate the source-confirmed Enforcer Resources repeat-per-level **equipment allowance**, not duplicate feature-item grants. Audit remaining repeated grants individually; do not touch talent-tree membership.
5. Re-run all focused/rolling CI and Foundry v13 multiclass/level-up tests before merger.

**Status:** Source rows corrected; source/cadence regression tests added; not runtime-certifiable and **not merge-ready** while Officer choice UI and scaling updates remain unresolved.
