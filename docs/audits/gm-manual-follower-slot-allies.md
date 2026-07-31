# GM Manual Follower Slot — Allies Companions Tab

**Branch:** `fix/droid-authority-consolidation-phase-2`
**PR:** #937 (draft)
**Scope:** a new GM-only "Add Follower Slot" control on the Allies surface's
Companions tab, and the canonical service backing it.

## Summary

A GM can now grant a character (or playable droid) one empty follower slot
directly from the Allies app, without a follower-granting talent. This is
**not a fake talent grant** — it is a real entry in the SAME canonical
`flags.foundryvtt-swse.followerSlots` array that talent grants already
populate (see `scripts/infrastructure/hooks/follower-hooks.js`), carrying
honest provenance (`sourceType: 'gm-grant'`, `talentItemId: null`) instead
of a borrowed talent identity. It goes through the exact same chargen
launch, session seeding, and finalization pipeline as a talent-derived
slot, with zero special-casing in any of those paths.

## The model

`flags.foundryvtt-swse.followerSlots` remains the single canonical follower
slot registry. A slot's provenance is distinguished by two mutually
exclusive shapes:

| Field | Talent-derived slot | GM-manual slot |
|---|---|---|
| `sourceType` | not present | `'gm-grant'` |
| `talentName` / `talentItemId` / `talentTreeId` | set to the granting talent | always `null` |
| `dependentKind` | from the talent's config (usually `'follower'`) | always `'follower'` |
| `templateChoices` | from the talent's config | `['aggressive', 'defensive', 'utility']` |
| `createdActorId` | `null` until filled | `null` until filled |
| `grantedByUserId` / `grantedByUserName` / `grantedAt` | not present | the granting GM's identity and timestamp |

Nothing downstream (session seeding, chargen launch, finalization, level
sync, dismissal) branches on `sourceType`. The only two places that care
about it are the GM-permission boundary (grant/revoke) and slot-source
display (`sourceTalentLabel`) — everything else treats a manual slot as an
ordinary open follower slot.

## GM permission boundary

`game.user.isGM === true` is the sole criterion — never Actor ownership
level, never an "assistant GM" approximation. It is enforced in two places,
by design:

1. **UI** — the "+ Add Follower Slot" button/control only renders when
   `vm.canGrantManualFollowerSlot` is true (`AlliesSurfaceService.buildViewModel`),
   and `AlliesSurfaceController._addFollowerSlot`/`_removeFollowerSlot`
   re-check `game.user.isGM` before calling the service — this is
   defense-in-depth for a hidden/removed button, nothing more.
2. **Service** — `FollowerSlotService.grantManualFollowerSlot` and
   `.revokeManualFollowerSlot` independently call
   `validateManualFollowerSlotGrant`/`validateManualFollowerSlotRevocation`
   with `isGM: game.user?.isGM === true` computed fresh inside the service.
   A forged direct call (`FollowerSlotService.grantManualFollowerSlot(actor)`
   from a non-GM client's console) is rejected with a thrown `Error`
   regardless of what any UI layer did or didn't check. Test 17/25 in
   `tests/gm-manual-follower-slot.test.mjs` exercises this directly.

Owner eligibility is a separate, second check: only `character` and
`droid` actor types (`isEligibleFollowerSlotOwnerType`) can receive a
manual slot — the same two types
`follower-hooks.js#_isFollowerOwnerActor` already recognizes as legitimate
follower-slot owners for talent grants.

## Canonical service: `scripts/engine/crew/follower-slot-service.js`

New file. Exports:

- `buildManualFollowerSlot(options)` — pure builder for the exact slot
  shape above (fresh id, `sourceType: 'gm-grant'`, all talent-provenance
  fields explicitly `null`).
- `isEligibleFollowerSlotOwnerType(actorType)` / `isEligibleFollowerSlotOwner(actor)`
  — pure eligibility predicates.
- `validateManualFollowerSlotGrant({isGM, ownerExists, ownerType})` /
  `validateManualFollowerSlotRevocation({isGM, slot})` — pure validators
  taking plain values (not live Foundry objects), directly unit-testable.
- `appendFollowerSlot(currentSlots, slot)` / `removeFollowerSlotById(currentSlots, slotId)`
  — pure, non-mutating array helpers.
- `FollowerSlotService.grantManualFollowerSlot(ownerActor, options)` /
  `.revokeManualFollowerSlot(ownerActor, slotId, options)` — the governed
  orchestration: validate → read current slots via `getFlag` → build/apply
  the pure helper → persist via
  `ActorEngine.updateActor(ownerActor, {'flags.foundryvtt-swse.followerSlots': nextSlots}, {source})`.
  **Never** `actor.setFlag()`/`actor.update()`.

This mirrors the pure-function-extraction lesson from the immediately
preceding mutation-governance phase (`follower-mutation-planning.js`):
validation/building logic is Foundry-independent and directly testable;
the class methods are thin, governed wrappers around it.

### Concurrency / idempotency

`FollowerSlotService._inFlightGrants` is a runtime-only `Map` keyed by
owner Actor id holding the in-flight grant `Promise`. A second concurrent
call for the SAME owner (a double-fired click event) awaits and returns the
FIRST call's result instead of starting a second one — one persisted slot.
The map entry is cleared once that promise settles, so a genuinely
sequential second GM click (after the first has completed) proceeds
normally and creates its own, second slot. Per-owner keying also means
concurrent grants for two *different* owners are never coalesced with each
other. This exact contract — "one click/request = one slot; two
intentional completed clicks = two slots; one double-fired event = one
slot" — is tests 21-23 in the suite below.

## Allies surface wiring

**`scripts/ui/shell/AlliesSurfaceService.js`**:
- `buildViewModel()` now returns `canGrantManualFollowerSlot` (`game.user?.isGM === true && isEligibleFollowerSlotOwner(actor)`),
  `manualFollowerSlotLabel` (`'Add Follower Slot'`), and `manualFollowerSlotHelp`
  (`'Grant this character one follower slot without requiring a talent.'`)
  at the top level.
- `addManualFollowerSlot(ownerActor)` / `removeManualFollowerSlot(ownerActor, slotId)`
  delegate entirely to `FollowerSlotService` — this service does **not**
  construct or persist a slot itself.
- `sourceTalentLabel(record)` now checks `record.sourceType === 'gm-grant'`
  first and returns `record.sourceLabel || 'GM Granted'`, instead of
  falling through to `'Unknown source'`.
- `mapPendingSlot(slot, {isGM})` now passes through `sourceType` and adds
  `canRemoveManualSlot` (`isManualSlot && !staleActorId && isGM === true`) —
  true only for an empty, GM-granted slot viewed by a GM.
- `_buildCompanions` computes `isGM` once and threads it into every
  `mapPendingSlot` call.

**`scripts/ui/shell/AlliesSurfaceController.js`**:
- `case 'add-follower-slot'` → `_addFollowerSlot()`: defense-in-depth
  `game.user.isGM` check, then `AlliesSurfaceService.addManualFollowerSlot(this._actor)`,
  notify, re-render.
- `case 'remove-follower-slot'` → `_removeFollowerSlot(slotId)`:
  defense-in-depth GM check, a `Dialog.confirm` (matching the existing
  fire/remove-record confirmation pattern used elsewhere in this file),
  then `AlliesSurfaceService.removeManualFollowerSlot(this._actor, slotId)`.

**Templates** (`templates/shell/partials/surface-allies.hbs`,
`surface-allies-lane.hbs`): the button sits in a
`swse-allies-section-actions` div (the same wrapper class `add-faction`/
`add-base`/`add-organization` already use) placed BEFORE the
`{{#if vm.companions.hasAny}}` gate, so it is visible even for a character
with zero existing companions/slots — gated only on
`{{#if vm.canGrantManualFollowerSlot}}`. The per-card remove control reuses
the existing `.swse-allies-card-actions button.is-danger` styling (the same
class the existing "Fire" button uses), gated on `this.canRemoveManualSlot`.
No new CSS, no new visual system.

## Reconciliation (`follower-hooks.js#reconcileFollowerSlotsForActor`)

The reconciliation filter now explicitly checks
`if (slot.sourceType === 'gm-grant') return true;` before the talent-based
checks, with a comment documenting why: a manual slot has no talent
provenance at all (`talentItemId` is always `null`) and must never be
removed, capped by `maxCount`, assigned fake talent provenance, or modified
by talent deletion — it is out of scope for the talent-reconciliation loop
entirely, independent of whether any follower-granting talent currently
exists on the owner. This was already incidentally true (the loop's
`if (!slot.talentItemId) return true;` fallback already preserved these
slots), but is now explicit and independently guarded (static guard check
4, below) rather than relying on that incidental correctness.

While auditing this file for the feature, one pre-existing governance gap
was found and fixed: `_setSlots(actor, slots)` called `actor.setFlag()`
directly. It now routes through `ActorEngine.updateActor(actor, {'flags.foundryvtt-swse.followerSlots': slots}, {source: 'FollowerHooks.setSlots'})` —
the same authority `FollowerSlotService` uses, so every write to this flag
in the codebase is now governed. No other `setFlag()` calls in this file
were changed (e.g. the `followers`/`minions`/`pendingFollowerDetachment`
flags) — out of scope for this feature, which targets `followerSlots`
specifically, not a repository-wide flag-write ban.

## Chargen / session seeding (`follower-session-seeder.js`) — verified, no code change

Traced by direct code inspection (this file cannot be loaded through the
Foundry-shim harness for a live test — see "Coverage tiers" below):

- `_isFollowerSlot(slot)` → `!slot?.dependentKind || slot.dependentKind === 'follower'`.
  A manual slot's `dependentKind: 'follower'` satisfies this unconditionally.
- `_applyFollowerTalentDefaults(choices, cfg)` returns `choices` unchanged
  when `cfg` is falsy.
- `getFollowerTalentConfig(name, context)` (in
  `scripts/engine/crew/follower-talent-config.js`) is null-safe for
  `name === undefined`/`null`, returning `null` without throwing.
- `validateFollowerEntitlement`/`getAvailableFollowerSlots`/`seedFollowerSession`
  all key exclusively on `slot.id`, never on talent identity.

A manual slot's `slotId` validates normally, `dependentKind` is `'follower'`,
`templateChoices` default to aggressive/defensive/utility,
`slotTalentName`/`slotTalentItemId`/`slotTalentTreeId` resolve to `null`,
no fixed follower profile is inferred, and the ordinary follower chargen
flow launches — with **zero code changes** to this file. Verified as
direct production-path behavior end-to-end through
`AlliesSurfaceService.buildViewModel`/`mapPendingSlot`
(`canBuildFollower: true` for a manual slot — test 30).

## Filled-slot finalization — verified, no code change

`FollowerCreator._linkFollowerToOwner` (`scripts/apps/follower-creator.js`)
computes `nextSlots = options.slotId ? buildFollowerSlotUpdate(currentSlots, options.slotId, follower.id) : currentSlots`
and commits it inside the SAME `owner-relationship-commit` transaction step
used for every follower, via `runFollowerMutationTransaction`.
`buildFollowerSlotUpdate` (`follower-mutation-transaction.js`) matches
purely on `slot.id === slotId` — it has no branch for `sourceType`. The
progression-driven finalization call site (`follower-creator.js:1390`)
already passes `grantingTalent: null` for every ordinary chargen-driven
follower — a manual slot's fill goes through this exact same code, same
idempotency token, same owner-relationship transaction, same level sync,
same dismissal behavior, same Allies display. No special-casing exists or
was added for manual slots in this path.

## Manual slot removal

`FollowerSlotService.revokeManualFollowerSlot(ownerActor, slotId, options)`
is scoped narrowly: `validateManualFollowerSlotRevocation` rejects (a) a
non-GM caller, (b) a missing slot, (c) any slot whose `sourceType !== 'gm-grant'`
(a talent-derived slot is never removable this way), and (d) any slot with
a non-empty `createdActorId` (an occupied slot must go through the
existing detach/fire/delete workflow). The Allies UI exposes this only for
an empty, GM-granted slot viewed by a GM (`canRemoveManualSlot`), with a
confirmation dialog matching the existing remove-record pattern
(`_removeFaction`/`_removeBase`/`_removeOrganization`).

## Coverage tiers

Per this session's coverage-tier honesty convention:

- **(a) Direct production-path** — `tests/gm-manual-follower-slot.test.mjs`
  loads and executes the REAL `scripts/engine/crew/follower-slot-service.js`
  and the REAL `scripts/ui/shell/AlliesSurfaceService.js` through the
  Foundry-shim harness (`registerFoundryPathLoader()` +
  `installFoundryShimGlobals()`). Neither file transitively requires
  `SWSEDialogV2`/`foundry.applications.api` at module scope —
  `AlliesSurfaceService.js` only reaches `follower-creator.js` through a
  `try/catch`-guarded dynamic import (`loadFollowerCreator()`) used for the
  ACTIVE follower/minion actor lists, which this suite's assertions do not
  depend on (the guard logs a caught warning and returns `null`, exactly as
  it does in this repo's existing Node test runs of any Allies-adjacent
  code). `ActorEngine` is substituted by the shim's fake
  (`tests/helpers/foundry-shim/fakes/actor-engine.fake.mjs`), the same
  documented, narrow, line-by-line-verified stand-in every other
  Foundry-shim test in this repo already relies on. Tests 1-30 in that file
  are this tier, including a full end-to-end AlliesSurfaceService round
  trip (grant → view model → GM-only display fields → remove) in test 30.
- **(b) Coordinator/builder via mocks** — not used in this feature; the
  file loads for real, so tier (a) covers what would otherwise need this
  tier.
- **(c) Source-inspection only** — `follower-session-seeder.js` (chargen
  session seeding), `follower-creator.js`'s finalization commit path
  (`_linkFollowerToOwner`/`createFollowerFromMutation`), and
  `AlliesSurfaceController.js`'s two new action cases
  (`add-follower-slot`/`remove-follower-slot`) are verified by direct code
  reading only — traced above under their respective headings — because
  they transitively require `SWSEDialogV2`/`progression-entry.js`/
  `ShellRouter.js`, which are not proven loadable through this repo's
  Foundry-shim harness (see the Phase 4/6 audits' documented "un-loadable
  through the shim" wall). No claim of "tested" is made for these paths
  beyond inspection.

## Tests (30 required cases) — `tests/gm-manual-follower-slot.test.mjs`

1. `buildManualFollowerSlot` produces the exact documented shape (all
   fields, including `talentName`/`talentItemId`/`talentTreeId: null`).
2. Two builder calls produce distinct ids.
3. `isEligibleFollowerSlotOwnerType`: `character`/`droid` eligible.
4. `isEligibleFollowerSlotOwnerType`: other types/`undefined` ineligible.
5. `isEligibleFollowerSlotOwner`: false for `null`/`undefined`.
6. Grant validator: rejects non-GM.
7. Grant validator: rejects missing owner.
8. Grant validator: rejects ineligible type; accepts a fully valid request.
9. Revoke validator: rejects non-GM.
10. Revoke validator: rejects missing slot.
11. Revoke validator: rejects a talent-derived slot.
12. Revoke validator: rejects an occupied manual slot.
13. Revoke validator: accepts an empty manual slot.
14. `appendFollowerSlot`: non-mutating append; leaves talent slots untouched.
15. `removeFollowerSlotById`: non-mutating removal; leaves other slots intact.
16. `grantManualFollowerSlot`: GM happy path persists via ActorEngine only
    (fake actor's `setFlag`/`update` throw if called — never triggered).
17. `grantManualFollowerSlot`: rejects a forged non-GM call; ActorEngine
    never invoked.
18. `grantManualFollowerSlot`: rejects a missing owner.
19. `grantManualFollowerSlot`: rejects an ineligible owner type.
20. `grantManualFollowerSlot`: appends to, never disturbs, an existing
    talent-derived slot.
21. `grantManualFollowerSlot`: two sequential awaited GM calls produce two
    distinct slots.
22. `grantManualFollowerSlot`: two concurrent calls for the SAME owner
    coalesce into one persisted slot.
23. `grantManualFollowerSlot`: concurrent calls for DIFFERENT owners are
    never coalesced.
24. `revokeManualFollowerSlot`: GM happy path removes an empty manual slot
    via ActorEngine only.
25. `revokeManualFollowerSlot`: rejects a forged non-GM call; slot survives.
26. `revokeManualFollowerSlot`: cannot remove a talent-derived slot.
27. `revokeManualFollowerSlot`: cannot remove an occupied manual slot.
28. `revokeManualFollowerSlot`: throws for missing owner/slot id/unknown slot id.
29. `FollowerSlotService` loads through the shim importing the REAL
    `actor-engine.js` specifier (a standing, re-checkable guarantee this
    service's only Foundry-heavy dependency is ActorEngine).
30. `AlliesSurfaceService` end-to-end: capability/label/help fields, a
    granted slot appears in `companions.pending` with `sourceTalent: 'GM Granted'`,
    `canBuildFollower: true`, `canRemoveManualSlot: true`; removal clears
    it; a non-GM sees the capability and `canRemoveManualSlot` both `false`.

Run: `node tests/gm-manual-follower-slot.test.mjs` → `GM manual follower
slot tests passed.` (exit 0). Also auto-discovered and passing under
`node tools/run-rolling-tests.mjs`.

## Static guard: `tools/check-follower-slot-authority.mjs`

Scoped to four files (`follower-slot-service.js`, `AlliesSurfaceService.js`,
`AlliesSurfaceController.js`, `follower-hooks.js`) — explicitly **not** a
repository-wide flag-write ban. Six checks:

1. No direct `.setFlag(`/`.unsetFlag(` call touching `followerSlots`.
2. `AlliesSurfaceController.js` must not construct a slot object literal
   itself (no `sourceType:`/`dependentKind:` field) — must delegate to the
   service chain.
3. Any literal assigning `sourceType: 'gm-grant'` must also assign
   `talentItemId: null` in the same literal.
4. `follower-hooks.js`'s reconciliation filter must explicitly check
   `slot.sourceType === 'gm-grant'`.
5. `FollowerSlotService`'s grant AND revoke methods must each independently
   pass `isGM: game.user?.isGM === true` into their validator.
6. `FollowerSlotService`'s revocation validator must reject both a
   non-manual (`sourceType !== 'gm-grant'`) slot and an occupied
   (`createdActorId` set) slot.

**Verification ritual performed** (inject → detect → revert → clean pass)
for every check, on the actual repo files (not synthetic fixtures):
- Check 1: added a dead `if (false) { ownerActor.setFlag('foundryvtt-swse', 'followerSlots', []); }`
  line to `follower-slot-service.js` → detected → reverted → clean.
- Checks 2 & 3: added `const fakeSlot = { sourceType: 'gm-grant', dependentKind: 'follower' };`
  to `AlliesSurfaceController.js` → both detected → reverted → clean.
- Check 4: removed the `slot.sourceType === 'gm-grant'` line from
  `follower-hooks.js` → detected → reverted → clean.
- Check 5: replaced `isGM: game.user?.isGM === true` with `isGM: true` in
  both `grantManualFollowerSlot` and `revokeManualFollowerSlot` (two
  separate injections) → both detected → reverted → clean.
- Check 6: removed the `sourceType`/`createdActorId` rejections from
  `validateManualFollowerSlotRevocation` → both sub-checks detected →
  reverted → clean.
- Final diff against pre-injection backups of all three touched files:
  byte-identical.

Report-only by default; `--strict` exits non-zero on any violation.

## Validation performed (exact counts)

```
node tools/check-progression-integrity.mjs      → 44 violations (documented baseline, unchanged)
node tools/check-architecture-boundaries.mjs    → 37 violations (documented baseline, unchanged)
node tools/check-follower-mutation-authority.mjs → 0 violations
node tools/check-follower-slot-authority.mjs     → 0 violations (new guard)
node tools/check-follower-droid-chassis-authority.mjs → 0 violations
node tools/run-rolling-tests.mjs                 → 52 passed, 0 failed (of 52 run; 5 excluded as documented pre-existing Force-power-track failures); 57 test files discovered (up from 56 — this feature's new test file)
```

## Runtime status

No live Foundry VTT v13 environment is available in this session (per the
standing, previously-confirmed limitation — see the Phase 5 audit). All
verification here is either (a) direct production-path Node execution
through the Foundry-shim harness, or (c) source inspection, as broken down
above. This has NOT been clicked through in a live Foundry world.

## Merge readiness

CONDITIONALLY READY, same posture as prior phases on this branch: static
guards clean, baselines unchanged, full required test suite passing as
real production-path code wherever the shim allows it, and the
follower-creator/session-seeder/controller paths are inspection-verified
against the exact same code that ships. A live-Foundry click-through of
the Allies "Add Follower Slot" button, chargen launch, and finalization is
the one outstanding verification this session cannot perform.
