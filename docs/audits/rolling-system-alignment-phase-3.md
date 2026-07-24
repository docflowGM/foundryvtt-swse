# Rolling-System Alignment — Phase 3

Static audit + surgical fixes, stacked on Phase 1 (draft PR #928) and Phase 2
(draft PR #929). No new roll engine, no vehicle dice engine, no vehicle
system rewrite. Per explicit steering for this phase, scope was narrowed to
the two unresolved live-path questions Phase 2 left open — vehicle operator
math and reroll state synchronization — plus a practical (static,
non-Foundry) runtime-validation pass. This report is honest that nothing
below has been exercised inside a running Foundry VTT v13 world.

## Phase 1 and Phase 2 baseline reviewed

- `docs/audits/rolling-system-alignment-phase-1.md`
- `docs/audits/rolling-system-alignment-phase-2.md`
- `scripts/engine/roll/roll-core.js`, `scripts/engine/roll-engine.js`
- `scripts/engine/combat/combat-roll-math.js`
- `scripts/engine/combat/attack-outcome-resolver.js` and its callers
- `scripts/engine/force/force-point-spend-coordinator.js` and its callers
- `ModifierEngine.resolveTarget()`
- `scripts/combat/rolls/enhanced-rolls.js`
- All Phase 1/Phase 2 tests (`tests/attack-outcome-*.test.mjs`,
  `tests/*force-point*.test.mjs`, `tests/modifier-*.test.mjs`,
  `tests/phase2-*.test.mjs`, `tests/critical-confirmation-guard-check.test.mjs`)
  and guards (`tools/check-combat-math-ssot.mjs`,
  `tools/check-attack-outcome-ssot.mjs`, `tools/check-critical-confirmation-guard.mjs`)

## Branch and commit baseline

Started from `claude/rolling-system-alignment-phase-2` at commit `655ca60`
("Phase 2 rolling-system alignment..."), on top of Phase 1's `47e40d9`, on
top of `main` at `bfbbb4a`. New branch: `claude/rolling-system-alignment-phase-3`.
No rebasing, squashing, or reverting of Phase 1/2 commits.

## Files inspected

- `scripts/sheets/v2/character-sheet.js` (attack button wiring, both generic
  and vehicle-specific)
- `scripts/actors/v2/vehicle-actor.js`, `scripts/actors/v2/vehicle-derived-builder.js`
  (vehicle derived-data pipeline)
- `scripts/actors/v2/character-actor.js` (`computeCharacterDerived`, shared
  with vehicles)
- `scripts/actors/derived/derived-calculator.js` (BAB/ability derivation)
- `scripts/utils/schema-adapters.js` (`getBAB`, ability-mod lookups)
- `template.json` (Actor type schemas — `vehicle` vs. `droid`/`character`
  template inheritance)
- `scripts/actors/vehicle/vehicle-crew-positions.js`
- `scripts/engine/crew/vehicle-crew-assignment-service.js`
- `scripts/sheets/v2/vehicle-sheet/crew-skill-router.js`
- `scripts/sheets/v2/vehicle-sheet/crew-resolver.js`
- `scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js`
- `scripts/sheets/v2/vehicle-sheet/vehicle-rules-adapter.js`
- `templates/actors/vehicle/v2/partials/vehicle-weapon-mount-panel.hbs`
- `scripts/combat/rolls/attacks.js`
- `scripts/engine/feats/meta-resource-feat-resolver.js` (reroll handler)
- `scripts/ui/chat/chat-interaction-bridge.js` (all chat button dispatch)
- `scripts/engine/combat/attack-roll-diagnostics.js` (Phase 2 diagnostics harness)
- `scripts/combat/systems/vehicle/vehicle-weapons.js`, `scripts/actors/vehicle/swse-vehicle-core.js`
  (Phase 2-confirmed dead vehicle modules, re-checked for Phase 3 relevance)
- `scripts/combat/systems/enhanced-combat-system.js`, `scripts/engine/combat/CombatEngine.js`
  (Phase 2-confirmed dead duplicate hit/crit path, re-checked)

## Live vehicle attack entry points

**Headline finding, confirmed by tracing rather than assumed:** the
character sheet's *generic* attack button (`[data-action="roll-attack"]`,
bound in `character-sheet.js`) calls `SWSERoll.rollAttack(this.actor, weapon)`
for ANY actor type, including vehicles — passing the **vehicle actor itself**
as the attacker. Separately, the vehicle weapon mount panel
(`templates/actors/vehicle/v2/partials/vehicle-weapon-mount-panel.hbs`)
already renders a *dedicated* `[data-action="vehicle-crew-skill"]` button
per weapon, with `data-station`/`data-skill`/`data-weapon-id` attributes
built by `vehicle-context-builder.js` specifically to drive
`scripts/sheets/v2/vehicle-sheet/crew-skill-router.js`'s
`rollVehicleCrewSkill()` — a **correct, crew-aware attack router that already
existed** and resolves the assigned gunner/pilot actor before calling the
canonical `rollAttack(actor, weapon)` with that actor.

**The bug: nothing in the codebase ever attached a click listener to
`[data-action="vehicle-crew-skill"]`.** The button rendered, looked
clickable, and did nothing. Every live vehicle weapon attack fell through
to the generic handler with the vehicle as its own attacker.

Confirmed via exhaustive grep (`grep -rln "vehicle-crew-skill" scripts`)
before any edits: zero JS files referenced the string at all.

## Dead vehicle/legacy paths confirmed (Phase 2 findings re-verified, no change)

Re-checked, still true, not touched further this phase:
- `scripts/combat/systems/vehicle/vehicle-weapons.js` — zero callers.
- `scripts/actors/vehicle/swse-vehicle-core.js#rollWeapon()` — zero callers.
- `SWSECombat` (`enhanced-combat-system.js`) / `CombatEngine.resolveAttack()`
  — reachable only through the still-unmounted `CombatActionBar`.

## Vehicle attack call graph (as of this phase's fix)

```
templates/.../vehicle-weapon-mount-panel.hbs
  [data-action="vehicle-crew-skill"] button
  (data-station, data-skill, data-weapon-id from vehicle-context-builder.js)
        |
        v  (NEW: character-sheet.js click listener, this phase)
character-sheet.js activateListeners()
        |
        v
crew-skill-router.js: rollVehicleCrewSkill(vehicle, station, 'attack', {weaponId})
        |
        v
crew-skill-router.js: resolveVehicleCrewActor(vehicle, station)
        |         \
        | actor    \ no actor (unassigned or invalid)
        v            v
attacks.js:        'unassigned' -> rollFallback() (abstract Crew Quality,
  rollAttack(                       flat 1d20+bonus, RollEngine.safeRoll,
    resolvedCrewActor,              no target/defense comparison — GM
    weapon,                        adjudicates; pre-existing design, not
    {vehicleActor, operator,       changed this phase)
     crewStation})                'invalid' -> structured failure, warns,
        |                          does not roll (NEW this phase)
        v
combat-roll-math.js: resolveAttackBonus(resolvedCrewActor, weapon, ...)
  (BAB/ability/proficiency now sourced from the crew actor's own stats)
        |
        v
attack-outcome-resolver.js: AttackOutcomeResolver.resolve(...)
        |
        v
SWSEChat.postRoll() + AttackRollDiagnostics.record({vehicleActor, operator, crewStation, ...})
```

The **generic** `[data-action="roll-attack"]` handler still exists unchanged
and still runs `SWSERoll.rollAttack(this.actor, weapon)` for any weapon-typed
item including `vehicleWeapon` items with a damage formula set — this path
was **not** removed or gated off from vehicles this phase (see "Suspected
defects not confirmed" below).

## Current pre-change vehicle formula

As documented in Phase 2: `resolveAttackBonus(actor, weapon, ...)` computes
`BAB + ability mod + enhancement + range penalty + ... ` purely from
whatever `actor` is passed in. Before this phase, the live path always
passed the **vehicle actor**. Tracing why that produces a degenerate result:

- `template.json`'s `Actor.vehicle` block has **no `"templates": ["base"]`
  entry** — unlike `Actor.droid`, which explicitly does. The `"base"`
  template is what defines `abilities`, raw `defenses`, etc. Vehicles do not
  inherit it at the schema level.
- `scripts/actors/v2/vehicle-actor.js#computeVehicleDerived()` calls
  `computeCharacterDerived(actor, system)` (the same pipeline used for PCs)
  and then `buildVehicleDerived(actor, system)` to overlay vehicle-specific
  fields — but `buildVehicleDerived()` (183 lines) only touches defenses,
  HP/hull, damage threshold/reduction, and identity labels. It never
  computes or overwrites BAB or ability modifiers.
- `SchemaAdapters.getBAB(actor)` reads `system.derived.bab` (falling back to
  `estimatedBabFromClasses(actor)`), which a vehicle actor — having no class
  items — resolves to `0`.
- Ability modifiers for the weapon's chosen ability (typically Dex) come
  from `actor.system.abilities`, which is absent from the vehicle schema
  (per the template.json finding above), so the effective ability mod is
  also `0` (or whatever a defensive fallback in the shared pipeline
  produces — not traced further, immaterial since it isn't the pilot/
  gunner's Dex either way).

**Conclusion, evidence-based, not guessed:** before this phase, a live
vehicle weapon attack computed its attack bonus from a vehicle actor with
effectively BAB 0 and ability mod 0/undefined — i.e. it silently dropped the
single largest normal contribution to a SWSE attack roll (the operator's
skill), regardless of who was actually assigned as gunner.

## Final aligned vehicle formula

Unchanged math — `combat-roll-math.js#resolveAttackBonus()` was **not**
rewritten (per the explicit "do not rewrite combat-roll-math.js" and "do
not guess at SWSE vehicle rules" constraints). What changed is **which actor
that same, already-correct formula is evaluated for**: the resolved crew
member (gunner, or pilot for a pilot-operated mount) instead of the vehicle.
This is a data-plumbing fix, not a new rule — the formula components (BAB +
ability + enhancement + range penalty + proficiency + ...) are exactly the
Phase 1-documented character formula, now fed the right actor.

**Not implemented, not guessed:** vehicle-specific additive modifiers that
have no established source in this codebase — a vehicle size modifier, an
emplacement/fire-control bonus (the `vehicleMount.fireControl` field is
captured for **display** in `vehicle-context-builder.js` but is never read
by `combat-roll-math.js` or fed into an attack roll), stacking rules between
an abstract Crew Quality bonus and a named gunner's full stats (SWSE RAW:
these should be mutually exclusive, and the current code already treats
them as mutually exclusive by construction — `resolveVehicleCrewActor`
returns either a real actor OR a fallback marker, never both — but no
explicit rule citation was verified this phase). These gaps are documented
in "Suspected defects not confirmed" and "Remaining Phase 4 work", not
invented.

## Operator-resolution precedence

As implemented (extending the pre-existing `resolveVehicleCrewActor`, not a
new module):

1. Read `vehicle.system.crewPositions[station]` (station derived from the
   weapon mount's own `crewRole`, default `'gunner'`; `'pilot'` for
   pilot-operated mounts — see below).
2. If unset (`null`/absent): `source: 'unassigned'` — legitimate abstract
   Crew Quality case, no actor required.
3. If set but the referenced actor (by UUID, falling back to bare id)
   cannot be resolved (e.g. deleted): `source: 'invalid'` — **Phase 3
   hardening**: this used to collapse into the same silent fallback as
   case 2. Now `rollVehicleCrewSkill()` returns a structured failure and
   warns the user by name of the station, instead of quietly rolling as
   generic Crew Quality under a stale reference.
4. If set and resolves: `source: 'actor'` — that actor's own stats back the
   roll via the unchanged `combat-roll-math.js` pipeline.

No step here ever falls back to `game.user.targets.first()`,
`canvas.tokens.controlled[0]`, or "first crew member found" — confirmed by
static test (`tests/phase3-vehicle-operator-resolution.test.mjs`).

A second, smaller wiring bug was found and fixed in the same area: every
vehicle weapon mount's action button was hard-wired to the `'gunner'`
station regardless of the mount's own `crewRole` field (which the item
schema and `vehicle-context-builder.js` already captured but never used for
this purpose) — so a pilot-operated fixed-forward gun would have asked the
(usually empty) gunner station for an operator instead of the pilot. Fixed
by threading `weapon.crewRole` through, and by adding the missing `'attack'`
action to the `pilot` station's action table (previously only `'pilot'`
(maneuver) was defined for that station, so even a correctly-routed
pilot-operated weapon had no representable "fire" action at all).

## Crew-quality handling

`CREW_QUALITY_BONUS` (`crew-skill-router.js`, pre-existing, not modified):
`untrained: 0, normal: +2, skilled: +5, expert: +8, ace: +10` — a flat bonus
used **instead of** a named actor's stats when a station is unassigned.
`rollFallback()` builds `1d20 + vehicleBonus + qualityBonus` and rolls it via
`RollEngine.safeRoll` — confirmed this does **not** go through
`AttackOutcomeResolver` (no target/defense comparison at all; the chat card
only shows the total, and a human — presumably the GM — adjudicates hit/miss
manually). This mirrors the same manual-adjudication pattern Phase 2 found
in the dead `swse-vehicle-core.js#rollWeapon()`, which is evidence this may
be **intentional current design** for abstract-crew vehicle attacks in this
codebase, not an oversight — documented, not "fixed" into an assumption
about automated target comparison for abstract crew, per "do not guess at
SWSE vehicle rules." Flagged as a confirmed-but-deferred AttackOutcomeResolver
bypass in "Suspected defects not confirmed" below.

## Component source table

| Component | Source (aligned pathway) | Notes |
|---|---|---|
| Base attack bonus (BAB) | `SchemaAdapters.getBAB(resolvedOperatorActor)` | Now the crew member's BAB, not the vehicle's (was always 0). |
| Ability modifier | `SchemaAdapters.getAbilityMod(resolvedOperatorActor, ability)` | Now the crew member's ability score. |
| Weapon attack bonus (enhancement) | `combat-roll-math.js` `getWeaponFlatAttackBonus(weapon)` | Unchanged; reads the weapon item. |
| Vehicle/starship size modifier | **Not implemented** | No existing source found in `combat-roll-math.js`; not guessed. |
| Crew quality modifier | `crew-skill-router.js` `CREW_QUALITY_BONUS` | Only applied in the no-named-gunner fallback path, which bypasses `AttackOutcomeResolver` entirely (see above). |
| Proficiency | `combat-roll-math.js` `actorIsProficientForAttack(resolvedOperatorActor, weapon)` | Now checks the crew member's proficiency feats, not the vehicle's (nonexistent) feats. |
| Range penalty | `combat-roll-math.js` `getRangePenalty(weapon, context)` | Unchanged, weapon/context-driven, not actor-driven. |
| Condition-track penalty | `actor.system.derived.damage.conditionPenalty` | Now the crew member's condition track, not the vehicle's — not independently verified whether this is RAW-correct for vehicle combat (vehicles have their own condition track too); flagged, not guessed at. |
| Active-effect modifiers | `ModifierEngine.resolveTarget()` | Now resolved against the crew member actor. Whether vehicle-level active effects (e.g. a damaged weapons subsystem) also need to apply was **not traced this phase** — see Phase 4 candidates. |
| Fire-control/emplacement modifier | **Not implemented** | `vehicleMount.fireControl` is captured for display only; never fed into the roll. |
| Pilot/gunner substitution | `resolveVehicleCrewActor()` via `crewPositions[station]` | This phase's core fix. |
| Multiple-attack / autofire penalty | `CombatOptionResolver.collectAttackModifiers()` | Unchanged, shared with character attacks; not vehicle-specific and not verified against vehicle-specific autofire rules. |
| Custom/situational modifier | `rollOptions.customModifier`/`situationalBonus` | Unchanged; `rollVehicleCrewSkill()` does not currently thread a modifier-entry UI through to these (no dialog shown before firing). |
| Force Point bonus | `ForcePointSpendCoordinator` via `RollCore.execute()` | Same coordinator as character attacks — `attacks.js` doesn't call `RollCore.execute()` for the attack roll itself (it's a direct formula roll via `RollEngine.safeRoll`), so vehicle **attacks** don't get a Force Point bonus die any more than character attacks do (this matches the Phase 1 finding that attacks.js never wired `useForce` at all — not a vehicle-specific gap). |

## Defense-resolution behavior

Unchanged from the character path (Phase 1): `resolveTargetContext()` in
`attacks.js` resolves `target`/`targetReflex` from `rollOptions.targetContext`
or falls back to `getTargetActorFromOptions(rollOptions)` (ultimately
`game.user.targets.first()` if nothing more specific is supplied).
`rollVehicleCrewSkill()`'s attack branch calls `rollAttack(actor, weapon, {...})`
without passing any `target`/`targetContext` — so a vehicle attack through
the newly-wired button inherits the **same** "first selected target"
behavior character attacks already have (not a new ambiguity introduced by
this phase; Phase 1/2 already flagged general target-resolution ambiguity
as unresolved and out of scope for a "no unrelated UI changes" pass).
`AttackOutcomeResolver` receives `targetDefense: targetReflex` and
`criticalThreshold`/`critMultiplier` exactly as it does for character
attacks — no independent vehicle-specific defense calculation was added or
found.

**Vehicle-to-vehicle, character-to-vehicle, vehicle-to-character**: since
the attack pipeline no longer special-cases actor type for the attacker
(operator resolution happens upstream, in the sheet-level router, not in
`attacks.js`/`combat-roll-math.js`), and target-defense resolution
(`getTargetReflex`) already reads `target.system.defenses.reflex...` from
whatever actor is targeted regardless of type — none of these four
combinations require different code paths in the aligned pipeline. Not
independently runtime-verified.

## Reroll call graph

```
Original attack:
  attacks.js rollAttack()/rollAttackAndDamageWithNarration()
    -> SWSEChat.postRoll({flags: {swse: {
         authoritative: true, superseded: false,
         supersededBy: null, revision: 0   <- NEW this phase
       }}})

Reroll click (.swse-attack-reroll-btn):
  chat-interaction-bridge.js handleAttackRerollButton(event, button, message)
    -> meta-resource-feat-resolver.js resolveAttackRerollButton(button, {message})
         - validates actor/ownership/Force-Point availability
         - rolls the reroll d20 (RollEngine.safeRoll)
         - spends the Force Point (ActorEngine.spendForcePoints) exactly
           once, only after a successful roll (Phase 2 behavior, unchanged)
         - builds a completely fresh AttackOutcomeResolver result for
           whichever roll (original or reroll) backs the kept total
           (Phase 2 behavior, unchanged)
         - creates a NEW chat message with that fresh outcome,
           flags.swse.revision = original.revision + 1, authoritative: true
                                                          <- NEW this phase
         - best-effort updates the ORIGINAL message:
           authoritative: false, superseded: true,
           supersededBy: <new message id>, appends a visible
           "Superseded by a reroll" banner to its content     <- NEW this phase
         - on original-message-update failure: warns, keeps the new
           result (does not lose it)                          <- NEW this phase

Damage action click on ANY attack message (.swse-roll-damage,
.swse-roll-damage-btn, .swse-apply-damage-btn):
  chat-interaction-bridge.js handle*Button(event, button, message)
    -> isAttackMessageSuperseded(message) checked FIRST              <- NEW
       if message.flags.swse.superseded === true: warn and refuse
       otherwise: proceed as before (unchanged roll/apply logic)
```

## Chat message state model

Implemented as an **extension of the existing `flags.swse` shape**, not a
new versioned schema/migration system (Phase 2's spec section 7 — schema
versioning, `schemaVersion`, world-wide migration helpers — was **not**
implemented this phase; see "Remaining Phase 4 work"). Fields added:

```
flags.swse.authoritative   // boolean — true until superseded
flags.swse.superseded      // boolean — true once a reroll replaces this message
flags.swse.supersededBy    // string|null — the reroll message's id
flags.swse.revision        // number — 0 for the original, +1 per successful reroll
```

All values are plain serializable primitives (booleans, a number, a Foundry
document id string) — no live Actor/Item/Token/Roll/Application references
are stored, consistent with the existing `flags.swse.workflowContext`
pattern Phase 1/2 already used. Old (pre-Phase-3) chat messages simply lack
these flags; `message?.getFlag?.('swse', 'superseded') === true` reads
`undefined`/`false` for them, which the guard correctly treats as "not
superseded" (fail open to previous behavior for old messages, not a hard
error) — this is the "gracefully handle old messages lacking the new
schema" requirement, satisfied by construction rather than an explicit
migration helper.

## Damage workflow synchronization behavior

Damage workflow context (`damageWorkflowContext` in `attacks.js`) is created
**immediately after the original attack roll**, embedded in the original
message's `flags.swse.workflowContext`, and read from the button's own
`data-*` attributes when "Roll Damage" is clicked later — this part is
unchanged from Phase 1/2. What Phase 3 adds is the **gate in front of it**:
`isAttackMessageSuperseded(message)` runs before any of the three
damage-action handlers do anything else, so a reroll that changes the
outcome prevents the original card's damage button from proceeding at all
— the user is redirected (via a notification) to the reroll's own message,
whose damage-relevant `data-*`/flags come from the fresh outcome.

**Not implemented:** retroactively re-deriving the original message's
`damageWorkflowContext` object itself to match the new outcome (i.e., the
original message's stored workflow context is left as-is; it is simply
never actionable again once superseded). This satisfies "do not mutate
previously applied damage retroactively" and "do not recalculate math in
chat-message update code" by construction — the update only ever touches
supersession flags and appends a banner, never touches roll/damage numbers.

**Not implemented / confirmed gap:** if a damage message was already rolled
from the original attack (i.e., "Roll Damage" was clicked before the
reroll), its own "Apply Damage" button lives on the *damage* message, not
the *attack* message — `isAttackMessageSuperseded()` checks whatever message
the button's own handler receives, so an Apply-Damage button on an
already-created damage message is **not** currently guarded against a
later reroll of its parent attack (the guard only stops a *new* damage roll
from being initiated off a stale attack card). Tracing the damage
message's `sourceMessageId`/parent linkage back to the attack message was
not completed this phase — flagged for Phase 4, not silently left
undocumented.

## Multi-target reroll behavior

**Not implemented this phase.** `rollVehicleCrewSkill()`/`rollAttack()` do
not currently support multiple simultaneous target outcomes in one reroll
(Phase 2 established that `enhanced-rolls.js`'s `rollAutofire()` already
builds one independent outcome per target from a shared d20, which remains
correct and untouched). A reroll of an autofire/area attack today would
follow the same single-outcome reroll path Phase 2 built — this phase did
not verify or extend reroll behavior specifically for the
already-independent per-target outcomes `rollAutofire()` produces. Flagged
as Phase 4 work per section 9 of the Phase 3 brief, not guessed at.

## Full-attack reroll behavior

**Not implemented this phase.** Each attack in a `full-attack-executor.js`
sequence already gets its own independent `attackResult`/chat message from
Phase 1 (no shared mutable state between sequence entries), so rerolling
one attack's message only touches that message — sibling attacks in the
sequence are unaffected by construction (they're separate `ChatMessage`
documents with separate `flags.swse.revision` counters). This was not
independently added; it is a byproduct of Phase 1's existing per-attack
message design. No explicit "attack-instance identity"/`attackId` concept
distinct from the chat message id itself was built — the chat message id
already serves that role for the pieces implemented this phase.

## Defects confirmed

1. Every live vehicle weapon attack silently used the vehicle actor's own
   (empty) BAB/ability scores instead of any assigned gunner/pilot's stats
   — the dedicated, already-written, crew-aware attack router
   (`rollVehicleCrewSkill`) had no click listener anywhere. **Fixed.**
2. `resolveVehicleCrewActor()` collapsed "station genuinely has no crew"
   and "station has a crew reference that failed to resolve" into the same
   silent fallback. **Fixed** — now distinguishes `'unassigned'` from
   `'invalid'` and refuses to roll (with a clear warning) for the latter.
3. Every vehicle weapon mount's action button was hard-wired to the
   `'gunner'` station regardless of the mount's own `crewRole` field, and
   the `pilot` station had no `'attack'` action defined at all — so a
   pilot-operated weapon could never correctly resolve its operator.
   **Fixed.**
4. A successful attack reroll left the original attack chat message fully
   intact and independently actionable (its damage buttons still worked,
   using pre-reroll hit/critical data), creating two live, disconnected
   attack outcomes for the same declared attack. **Fixed** — the original
   is marked superseded, visibly banner-annotated (best-effort), and its
   damage actions now refuse to run.

## Suspected defects not confirmed

- Abstract Crew Quality attacks (`rollFallback()`) never go through
  `AttackOutcomeResolver` — no natural-1/20 handling, no target/defense
  comparison at all, just a flat total in chat for a human to adjudicate.
  This mirrors a second, independent dead-code pattern from Phase 2
  (`swse-vehicle-core.js#rollWeapon()`), which is suggestive but not proof
  that manual adjudication for abstract crew is intentional SWSE-adjacent
  design in this codebase rather than an oversight. Not changed, per "do
  not guess at SWSE vehicle rules."
- The **generic** `[data-action="roll-attack"]` button still fires for any
  weapon-typed item with a damage formula, including `vehicleWeapon` items,
  and still passes the vehicle actor itself as attacker with no operator
  resolution. Whether this generic button is actually reachable for vehicle
  actors in the live sheet layout (vs. only the dedicated
  `vehicle-crew-skill` buttons ever being rendered for vehicles) was not
  fully traced — if it is reachable, it reintroduces the exact defect #1
  fix above through a second door. Flagged as a priority Phase 4 item.
- Vehicle-level active effects (e.g. a damaged weapons subsystem reducing
  attack effectiveness) are not confirmed to apply to a crew-member-sourced
  attack roll — `ModifierEngine.resolveTarget()` now resolves against the
  operator actor, not the vehicle, and whether that's correct or whether
  vehicle-level effects need to be merged in was not traced.
- Whether `system.derived.damage.conditionPenalty` should read from the
  operator or the vehicle for a vehicle weapon attack was not verified
  against a rules source.
- An "Apply Damage" button on an already-rolled damage message is not
  guarded against a later reroll of its parent attack (see "Damage workflow
  synchronization behavior" above).

## Architecture decisions

No new modules for operator resolution or vehicle attack math — extended
the pre-existing, already-correct `resolveVehicleCrewActor()`/
`rollVehicleCrewSkill()` in `crew-skill-router.js`, and simply **connected**
it to the UI (a missing event listener), rather than building a parallel
"vehicle attack context normalizer." This is a stronger fit for "use
existing project conventions where equivalent structures already exist"
than inventing new context-shape code would have been. `AttackOutcomeResolver`,
`ModifierEngine.resolveTarget()`, `RollCore`, and `ForcePointSpendCoordinator`
are unchanged and untouched — the vehicle fix works entirely by changing
*which actor* the existing, unmodified pipeline is called with.

Reroll supersession extends the existing `flags.swse` chat-message
convention (no new schema-version field, no migration helper — the
"gracefully handle old messages" requirement is satisfied by optional
chaining reading `undefined` as falsy, not by an explicit compatibility
shim).

`AttackRollDiagnostics` (Phase 2) was extended, not replaced, with a
`crewStation` field and a second `record()` call site in the reroll handler.

A new static guard, `tools/check-reroll-supersession-guard.mjs`, follows
the same report-only-by-default/`--strict`-to-fail convention as the Phase
1/2 guards.

## Compatibility decisions

- The dead vehicle modules confirmed in Phase 2 (`vehicle-weapons.js`,
  `swse-vehicle-core.js#rollWeapon()`, `SWSECombat`/`CombatEngine.resolveAttack()`)
  were **not** touched, deleted, or rewritten this phase.
- The generic `[data-action="roll-attack"]` handler was **not** modified to
  exclude vehicles — doing so without confirming whether it's actually
  reachable for vehicle actors risked breaking a working path based on an
  untraced assumption; flagged instead (see above).
- `rollFallback()`'s AttackOutcomeResolver bypass for abstract Crew Quality
  was **not** changed — preserving current behavior per "preserve current
  behavior only when the code proves it is intentional" combined with "do
  not guess at SWSE vehicle rules" (the evidence for intentionality is
  suggestive, not proof, so the safer choice was to leave it and document
  it rather than guess a fix).

## Tests added

Same convention as Phase 1/2. One genuinely executable test file (the
diagnostics harness has zero Foundry dependencies); the rest are static
source-text guards, because the touched production files
(`character-sheet.js`, `crew-skill-router.js`, `attacks.js`,
`chat-interaction-bridge.js`, `meta-resource-feat-resolver.js`) all use
absolute `/systems/foundryvtt-swse/...` imports that only resolve inside
Foundry's module loader — confirmed pre-existing, unrelated to this pass.

- `tests/phase3-vehicle-operator-resolution.test.mjs` — the dead button now
  has a listener that imports and calls `rollVehicleCrewSkill`; the listener
  doesn't fall back to selected-target/controlled-token; `rollAttack()` is
  called with the resolved crew actor; `resolveVehicleCrewActor()`
  distinguishes unassigned/invalid; an invalid resolution returns a
  structured failure without rolling; the pilot-operated-mount station-key
  fix is in place.
- `tests/phase3-reroll-supersession.test.mjs` — both attack chat entry
  points post the baseline revision/authoritative state; a successful
  reroll flips the original message's flags and stamps `supersededBy`; the
  original-message update is try/caught with a user-facing warning on
  failure while still returning the new result; all three damage-action
  handlers contain the supersession guard; no accidental function
  duplication.
- `tests/phase3-diagnostics-harness.test.mjs` — genuinely executes
  `AttackRollDiagnostics`: disabled by default (no accumulation), captures
  a full snapshot including the new `crewStation` field when enabled, never
  throws into the caller on a malformed snapshot, and is registered under
  `SWSE.debug.attackRolls`.
- `tests/reroll-supersession-guard-check.test.mjs` — smoke-tests the new
  guard script in both report and `--strict` mode.

Existing guards extended, not replaced: none of Phase 1/2's guard tools
needed KNOWN_DEBT list changes this phase (re-ran all three; zero new
findings — see "Static results" below).

### Requested test list — coverage map

The Phase 3 brief requested 35 automated tests. Mapped against what this
pass actually implemented (many requested tests target functionality
explicitly out of this phase's narrowed scope — multi-target/full-attack
reroll rebuilding, chat schema versioning/migration — and are not claimed
as done):

| # | Requested | Status |
|---|---|---|
| 1 | Explicit gunner selected as operator | Covered (static) |
| 2 | Pilot selected for pilot-operated weapon | Covered (static) |
| 3 | Abstract crew quality resolved without a full actor | Covered (static, pre-existing behavior confirmed unchanged) |
| 4 | Real gunner stats and abstract crew bonus not double-counted | Covered (static — `resolveVehicleCrewActor` returns actor XOR fallback, never both) |
| 5 | Missing required operator returns structured failure | Covered (static, the 'invalid' case) |
| 6 | Ambiguous operator state does not silently select an actor | Covered (static — no target/controlled-token fallback in the new listener) |
| 7-9 | Vehicle ledger identifies BAB/ability/vehicle-specific modifier sources | Not separately tested — the ledger itself is unchanged from Phase 1 (`buildLedgerFromComponents`); only *which actor* feeds it changed, already covered by test 1-2 |
| 10 | Vehicle modifier total equals sum of applied components | Not re-tested — unchanged `ModifierEngine.resolveTarget()` invariant, already covered by Phase 1's `tests/modifier-breakdown-builder.test.mjs` |
| 11-12 | Vehicle attack uses AttackOutcomeResolver / ModifierEngine.resolveTarget() | Covered transitively — the vehicle attack now calls the unmodified `attacks.js#rollAttack()`, already tested in Phase 1/2 |
| 13-14 | Vehicle FP spend/refund | Not separately tested — attacks.js never wires Force Point bonus dice for any actor type (Phase 1 finding); no vehicle-specific FP path exists to test |
| 15-22 | Reroll revision/supersession/damage-guard behavior | Covered (static, `phase3-reroll-supersession.test.mjs`) |
| 23-25 | Full-attack/multi-target reroll independence | **Not implemented this phase** — not tested |
| 26 | Old chat cards without new schema fail gracefully | Covered by construction (optional chaining), not by a dedicated executable test |
| 27-28 | No active vehicle path bypasses RollCore / independently interprets nat 1/20/crit | Covered by `tools/check-attack-outcome-ssot.mjs` (re-run, zero new findings) |
| 29-33 | Existing Phase 1/2 tests and guards still pass | Verified (see Static results) |
| 34 | No direct actor.update() introduced | Verified by diff review (see Commands run) |
| 35 | (static guards) | `tools/check-reroll-supersession-guard.mjs` added |

## Commands run

```
node --check <every changed/added .js file>
node tools/ci-smoke-check.mjs
node tools/check-combat-math-ssot.mjs [--strict]
node tools/check-attack-outcome-ssot.mjs [--strict]
node tools/check-critical-confirmation-guard.mjs [--strict]
node tools/check-reroll-supersession-guard.mjs [--strict]
node tests/<each>.test.mjs   (all 27: 10 pre-Phase-1 + 7 Phase 1 + 6 Phase 2 + 4 Phase 3)
git diff --stat / grep for actor.update(/new Roll( in changed files
```

## Static results

- All 7 changed files + 5 new files: `node --check` passes.
- `tools/ci-smoke-check.mjs`: same 2 pre-existing failures as the Phase
  1/2 baseline, unrelated files, unchanged.
- `tools/check-combat-math-ssot.mjs`: passes, unchanged.
- `tools/check-attack-outcome-ssot.mjs`: passes; same 5 known-debt sites as
  Phase 2 end state, zero new findings.
- `tools/check-critical-confirmation-guard.mjs`: passes, report and
  `--strict`, zero findings.
- `tools/check-reroll-supersession-guard.mjs` (new): passes, report and
  `--strict`, zero findings.
- `tests/*.test.mjs`: **27 files total** (10 pre-Phase-1 + 7 Phase 1 + 6
  Phase 2 + 4 Phase 3). **22 pass / 5 fail** — the same 5 pre-existing
  `ERR_MODULE_NOT_FOUND` files from the Phase 1/2 baseline. **Zero new
  failures.**
- `git diff` review: no `actor.update(` or `new Roll(` introduced in any
  changed file (grepped explicitly, see Commands run).
- Diff is 7 files, 223 insertions / 37 deletions — reviewed in full, no
  unrelated feats/talents/progression/chargen/workbench/GM-tool/compendium
  changes.

## Preexisting failures (recorded before editing, matches Phase 1/2)

Identical to the Phase 1/2 baseline, re-confirmed unchanged by this phase:
- The same 5 `tests/*.test.mjs` `ERR_MODULE_NOT_FOUND` failures (absolute
  `/systems/...` imports, environment limitation).
- The same 2 `tools/ci-smoke-check.mjs` syntax failures in
  `tools/audit-nonheroic-weapon-damage.mjs` / `tools/audit-npc-source-attribution.mjs`.

## Runtime test matrix

**Foundry VTT v13 could not be launched in this static analysis
environment.** Every row below is genuinely pending — none of it should be
read as "passed." Where a static test exists, that is noted separately from
runtime pass/fail, which is unknown until someone runs the harness in a
live world.

`SWSE.debug.attackRolls.enabled = true` before testing to capture full
diagnostic snapshots (`SWSE.debug.attackRolls.events`) for each case.

### Character attack tests

| # | Test | Statically proven | Runtime result |
|---|---|---|---|
| 1 | Ordinary hit | Yes (Phase 1) | Pending |
| 2 | Ordinary miss | Yes (Phase 1) | Pending |
| 3 | Natural 1 | Yes (Phase 1) | Pending |
| 4 | Natural 20 | Yes (Phase 1) | Pending |
| 5 | Expanded critical range hit | Yes (Phase 1) | Pending |
| 6 | Expanded critical range miss | Yes (Phase 1) | Pending |
| 7 | Attack with Force Point | Yes (Phase 1, spend-once logic) | Pending |
| 8 | Attack with insufficient Force Points | Yes (Phase 1) | Pending |
| 9 | Attack with active-effect bonus | Yes (Phase 1, ModifierEngine) | Pending |
| 10 | Attack with suppressed modifier | Yes (Phase 1) | Pending |
| 11 | Reroll: miss to hit | Partially (fresh-outcome logic, Phase 2/3) | Pending |
| 12 | Reroll: hit to miss | Partially | Pending |
| 13 | Reroll: normal hit to critical | Partially | Pending |
| 14 | Reroll: critical to normal hit | Partially | Pending |
| 15 | Failed/cancelled reroll preserves original authority | Yes (static, early-return-before-spend logic) | Pending |
| 16 | Damage from authoritative reroll card | No | Pending |
| 17 | Attempted damage from superseded card | Yes (static, guard-presence test) | Pending — **this is the one most worth verifying live**, since it depends on Foundry's actual flag-read timing/`getFlag` behavior |
| 18 | Full attack with one rerolled attack | Partially (per-message independence by construction) | Pending |
| 19 | Autofire with multiple targets | Yes (Phase 2) | Pending |
| 20 | Area attack with different target defenses | Yes (Phase 2, per-target resolution) | Pending |

### Vehicle/starship attack tests

| # | Test | Statically proven | Runtime result |
|---|---|---|---|
| 1 | Explicit actor assigned as gunner | Yes (static) | Pending |
| 2 | Pilot operating pilot-controlled weapon | Yes (static, this phase's crewRole fix) | Pending |
| 3 | Abstract crew-quality gunner | Yes (static, unchanged fallback path) | Pending |
| 4 | Missing gunner assignment | Yes (static, `'unassigned'` path) | Pending |
| 5 | Invalid/deleted assigned gunner | Yes (static, `'invalid'` path, this phase) | Pending |
| 6 | Linked vehicle token | No | Pending |
| 7 | Unlinked vehicle token | No | Pending |
| 8 | Vehicle-to-character attack | No | Pending |
| 9 | Vehicle-to-vehicle attack | No | Pending |
| 10 | Character-to-vehicle attack | No | Pending |
| 11 | Ordinary vehicle hit | No (formula fixed, not runtime-verified) | Pending |
| 12 | Ordinary vehicle miss | No | Pending |
| 13 | Vehicle natural 1 | No | Pending |
| 14 | Vehicle natural 20 | No | Pending |
| 15 | Expanded vehicle critical range | No | Pending |
| 16 | Vehicle range penalty | No | Pending |
| 17 | Vehicle size modifier | **Not implemented** — no source found, see Component source table | N/A until implemented |
| 18 | Vehicle active-effect modifier | No | Pending |
| 19 | Vehicle Force Point use | No path exists (see FP row in Component source table) | N/A |
| 20 | Vehicle reroll | Partially (same reroll code path as characters) | Pending |
| 21 | Vehicle autofire/multi-target attack | No | Pending |
| 22 | Vehicle damage workflow handoff | No | Pending |
| 23 | Vehicle attack with no valid defense | No | Pending |
| 24 | Vehicle attack from a stale/superseded message | Yes (static, same guard as character attacks) | Pending |

## Remaining Phase 4 work

1. **Priority:** confirm whether the generic `[data-action="roll-attack"]`
   button is reachable for vehicle actors in the live sheet layout. If it
   is, it silently reintroduces the "vehicle attacks as itself" defect
   through a second door that this phase did not close.
2. Trace whether vehicle-level active effects (damaged subsystems, etc.)
   need to be merged into a crew-member-sourced attack roll, and whether
   `conditionPenalty` should read from the operator or the vehicle.
3. Decide (with a rules source, not a guess) whether abstract Crew Quality
   attacks should go through `AttackOutcomeResolver`/target-defense
   comparison, or whether the current manual-GM-adjudication design is
   intentional and should simply be documented as such.
4. Vehicle size modifier and fire-control/emplacement bonus: find or obtain
   an authoritative source, then wire them into `combat-roll-math.js` or a
   genuinely-needed `resolveVehicleAttackBonus()` extension — not attempted
   this phase per "do not guess at SWSE vehicle rules."
5. Guard "Apply Damage" buttons on already-created damage messages against
   a later reroll of their parent attack (currently only new damage-roll
   initiation is guarded, not application of already-rolled damage).
6. Multi-target and full-attack-sequence reroll rebuilding (Phase 3 brief
   sections 9-10) — not implemented this phase; current reroll only
   replaces a single attack's single outcome.
7. Chat-message schema versioning / migration helper (Phase 3 brief section
   7) — the `flags.swse.{authoritative,superseded,supersededBy,revision}`
   fields were added without a `schemaVersion` wrapper or migration
   utility; old messages degrade gracefully by omission, but no explicit
   normalization helper exists.
8. All 44 runtime-matrix rows above, plus the dead-code disposition
   questions Phase 2 already deferred (`vehicle-weapons.js`,
   `swse-vehicle-core.js#rollWeapon()`, `SWSECombat`/`CombatEngine.resolveAttack()`,
   `CombatActionBar`).

## Implementation summary

**Fixed**
- Vehicle weapon attacks now resolve and use the assigned gunner/pilot's
  own BAB/ability/proficiency instead of the vehicle actor's own (always
  empty) stats — by wiring an existing, correct, but never-connected
  crew-aware attack router to its already-built UI button.
- `resolveVehicleCrewActor()` no longer conflates "no crew assigned"
  (legitimate) with "assigned crew reference is broken" (a data problem) —
  the latter now fails clearly instead of silently rolling as generic crew
  quality.
- Pilot-operated weapon mounts now ask the pilot's station for an operator
  instead of always asking the (usually unrelated) gunner station.
- A successful attack reroll now marks the original attack message
  superseded (flags + a visible banner, best-effort) and blocks its damage
  actions, instead of leaving two independently-actionable attack outcomes.

**Verified**
- Force Point spend-once, modifier stacking/suppression, natural-1/20/
  critical-threat handling, and vehicle attacks not bypassing
  `AttackOutcomeResolver`/`ModifierEngine.resolveTarget()` — all unchanged
  from Phase 1/2 and re-confirmed by re-running every existing guard and
  test with zero new findings.

**Vehicle math**
- Formula unchanged; operator now correctly sourced. Size modifier,
  fire-control bonus, and vehicle-level active-effect interaction remain
  unimplemented (no guessed rules added).

**Reroll synchronization**
- Original message superseded, damage actions blocked on it, new message
  authoritative with an incremented revision counter, resource spend still
  exactly once, failed/cancelled reroll leaves the original untouched.
- Multi-target and full-attack-sequence-specific reroll rebuilding not
  implemented.

**Tests**
- 1 executable test (diagnostics harness), 3 static guard test files, 1 new
  architecture guard (`check-reroll-supersession-guard.mjs`) with its own
  smoke test. Zero regressions across 27 total test files and 4 static
  guards.

**Runtime results**
- **None.** Foundry VTT v13 was not launched. Every runtime-matrix row is
  pending, not passed. The harness (`SWSE.debug.attackRolls`, extended this
  phase) and the checklist above are ready for whoever can run them.

**Remaining risks**
- The generic attack button may still bypass vehicle operator resolution
  entirely for vehicles (unconfirmed reachability).
- Abstract-crew vehicle attacks still bypass `AttackOutcomeResolver`.
- No vehicle size/fire-control modifier exists.
- Reroll supersession doesn't yet protect an already-rolled damage
  message's own Apply-Damage button.
- Multi-target/full-attack reroll rebuilding is unimplemented.

This pass does not claim the rolling system is unified. It closes the two
specific live-path gaps named for this phase (vehicle operator math,
reroll-to-original synchronization) with evidence-based, surgical fixes,
and is explicit about everything adjacent that remains open.
