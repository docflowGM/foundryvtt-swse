# Rolling-System Alignment — Phase 4

Stacked on: PR #930 (Phase 3) ← PR #929 (Phase 2) ← PR #928 (Phase 1). None
of the prior three PRs are merged, squashed, or rebased by this phase.
Branch: `claude/rolling-system-alignment-phase-4`, based on
`claude/rolling-system-alignment-phase-3` at commit `c8c0b6f` (the vehicle
attack formula correction addendum).

Phase 4's brief named six focus areas: abstract-crew vehicle attacks;
generic attack-entry-point guarding; multi-target and full-attack reroll
authority; vehicle size/fire-control modifiers; runtime verification
support; stacked-PR integration review. This report documents what was
found, what was fixed, what was deliberately left unresolved (and why),
and — per the brief's own explicit instruction — does **not** claim the
rolling system is fully unified or that the runtime matrix has been
executed.

## Phase 1-3 baselines reviewed

- `docs/audits/rolling-system-alignment-phase-1.md` — established
  `AttackOutcomeResolver`, `ForcePointSpendCoordinator`,
  `ModifierEngine.resolveTarget()`, and the roll-component-ledger shape as
  single authorities.
- `docs/audits/rolling-system-alignment-phase-2.md` — removed the
  independent critical-confirmation roll, fixed reroll outcome integrity,
  confirmed most "vehicle attack" and "legacy roll facade" modules are dead
  code with zero live callers.
- `docs/audits/rolling-system-alignment-phase-3.md` — fixed vehicle
  operator resolution (dead click listener; `resolveVehicleCrewActor`
  unassigned-vs-invalid distinction; pilot-operated-mount station routing);
  implemented reroll-to-original supersession
  (`flags.swse.{authoritative,superseded,supersededBy,revision}`); and, in
  a same-PR addendum (commit `c8c0b6f`), corrected the actual vehicle
  attack **formula** — `resolveVehicleAttackBonus()` in
  `scripts/engine/combat/vehicle-attack-math.js` implements
  `1d20 + Gunner BAB + Vehicle INT modifier + Range modifier + individually-
  labeled misc components`, reusing every other gunner-scoped component
  from `combat-roll-math.js#resolveAttackBonus()` verbatim.
- `docs/systems/COMBAT_MATH_SSOT.md` — confirms `combat-roll-math.js` as
  the canonical attack/damage math seam; Phase 4 does not modify this
  document's stated architecture, only extends who calls into it.

## Branch and commit baseline

```
claude/rolling-system-alignment-phase-4  (this phase, new)
  based on
claude/rolling-system-alignment-phase-3 @ c8c0b6f  (Phase 3 + formula addendum)
  based on
claude/rolling-system-alignment-phase-2 @ 655ca60
  based on
claude/rolling-system-alignment-phase-1 @ 47e40d9
```

## Files inspected

Read in full or in relevant part before editing: `combat-roll-math.js`,
`vehicle-attack-math.js`, `attacks.js`, `attack-outcome-resolver.js` and
its callers, `ModifierEngine.js` (`resolveTarget`/`_resolveFromModifierList`),
`force-point-spend-coordinator.js`, `meta-resource-feat-resolver.js`
(reroll handler), `chat-interaction-bridge.js` (damage handlers),
`crew-skill-router.js`, `vehicle-context-builder.js`,
`combat-stat-rules.js`, `schema-adapters.js`, `full-attack-executor.js`,
`combat-feature-handlers.js`, `multi-attack.js`, `enhanced-rolls.js`,
`enhanced-combat-system.js`, `swse-vehicle-core.js`,
`combat/systems/vehicle/vehicle-weapons.js`, `template.json` (vehicle Actor
schema), compendium samples (`packs/vehicles-starfighters.db`,
`packs/vehicles-capital-ships.db`), and all Phase 1-3 test/guard files.
Four parallel research passes (documented inline below by section) covered
abstract-crew data, generic entry points, vehicle size/fire-control data,
and multi-target/full-attack workflows before any code was written.

## Abstract-crew attack call graph

```
vehicle-weapon-mount-panel.hbs "Fire" button (data-action="vehicle-crew-skill")
  → character-sheet.js:6671 listener (actor.type !== 'vehicle' guarded)
    → crew-skill-router.js#rollVehicleCrewSkill(vehicle, stationKey, 'attack', {weaponId})
      → resolveVehicleCrewActor(vehicle, stationKey)
        ├─ source: 'actor'       → rollAttack(actor, weapon, {vehicleActor, operator, crewStation})   [named gunner, Phase 3]
        ├─ source: 'invalid'     → structured failure, no roll                                        [Phase 3]
        └─ source: 'unassigned'  → rollAttack(vehicle, weapon, {abstractCrewQuality, crewStation})    [Phase 4, this pass — was rollFallback()]
```

Non-attack skill checks (pilot maneuver, mechanics, etc.) for an
`'unassigned'` station still use the pre-existing standalone `rollFallback()`
— unchanged, out of scope (they aren't attack rolls, and the brief's
`AttackOutcomeResolver`/`ModifierEngine` requirements are attack-specific).

Confirmed dead (zero live callers, unchanged from Phase 2/3 findings,
re-verified this phase): `scripts/actors/vehicle/swse-vehicle-core.js#rollWeapon()`,
`scripts/combat/systems/vehicle/vehicle-weapons.js` (`fireMissile`/
`fireWeaponBattery`/`missileSecondAttack` — these also call an undefined
`getDefaultGunner()`, i.e. broken even if it were reachable).

## Abstract-crew data model

`vehicle.system.crewQuality` is a **free-text tier string**
(`untrained`/`normal`/`skilled`/`expert`/`ace`), not declared in
`template.json`'s vehicle Actor schema at all — read defensively
(`?? 'normal'`) everywhere it's used, editable via a plain text input in
`vehicle-sheet-content.hbs`. `CREW_QUALITY_BONUS` maps each tier to one
flat number (`untrained:0, normal:+2, skilled:+5, expert:+8, ace:+10`).
There is **no separate BAB/ability/proficiency field anywhere in this data
model** — a vehicle's abstract crew is represented by exactly one number.
A one-time migration tool (`tools/migrate-vehicles-db.js`) derives this tier
from a legacy `crew_size` string; not relevant to the live attack pipeline.

Before this phase, the table was declared **twice** — once in
`crew-skill-router.js` (used by the old `rollFallback()`), and implicitly
would need a second copy in any new formula-aligned resolver. This phase
made `vehicle-attack-math.js` the canonical owner (`export const
CREW_QUALITY_BONUS`) and had `crew-skill-router.js` import it instead of
keeping its own copy — closing a duplicate-table drift risk found during
the stacked-PR integration review (see below) before it could ever
diverge.

## Abstract-crew pre-change formula

`rollFallback()`'s `buildFallbackFormula()`, for the `'attack'` skill:

```
totalBonus = weapon's own flat attack bonus (options.attackBonus, i.e.
             weapon.system.attackBonus ?? weapon.system.bonus)
           + CREW_QUALITY_BONUS[vehicle.system.crewQuality ?? 'normal']
formula = `1d20 + ${totalBonus}`
```

Rolled via `RollEngine.safeRoll(formula)` (or `new Roll(formula).evaluate()`
as a fallback) and posted with `SWSEChat.postRoll({..., actor: vehicle,
context: {type: 'vehicle-crew', ...}})` — **no target-defense comparison,
no `AttackOutcomeResolver` call, no `ModifierEngine` resolution, no
component ledger, no `flags.swse.{authoritative,superseded,revision}`
schema, and — critically — no Range modifier and no Vehicle INT modifier
at all.** This is a materially different (and materially less correct)
formula than even the pre-Phase-3-formula-fix named-gunner path had; it
was never touched by Phase 3's audit because Phase 3 explicitly scoped
around it ("Suspected defects not confirmed: abstract Crew Quality attacks
never go through AttackOutcomeResolver... not changed, per 'do not guess
at SWSE vehicle rules'").

## Abstract-crew formula authority (this phase)

**Required formula, as given:** `1d20 + Gunner BAB + Vehicle INT modifier +
Range modifier + miscellaneous modifiers`. Abstract crew has no gunner
Actor, so the question is which of these four terms abstract crew data can
actually supply.

**Evidence reviewed:**
- `crewQuality` is a single flat number per tier, not decomposable into
  separate BAB/ability/proficiency values — there is nothing in the schema,
  helper code, or any comment suggesting it was ever meant to represent a
  fully-loaded combined attack total.
- Its value range (0, +2, +5, +8, +10) tracks a character BAB progression
  (a mid-tier PC might have BAB +8-10 around character level 13-15) far
  more closely than a combined "BAB + ability + proficiency" total, which
  would run meaningfully higher.
- Vehicle Intelligence and Range are properties of the **vehicle/weapon**,
  not the operator — nothing in the data model suggests they should
  disappear just because the operator is abstract rather than named.

**Formula chosen (option A from the brief's own menu):**

```
Abstract Crew Attack Total = 1d20 + Crew Quality tier value (as a
                              Gunner-BAB-equivalent substitute)
                              + Vehicle INT modifier + Range modifier
                              + applicable miscellaneous modifiers
```

Implemented in `resolveAbstractCrewAttackBonus(vehicleActor, weapon,
crewQualityKey, context)` (`vehicle-attack-math.js`). Ledger components:
`crew-quality-bab` (category `gunner`, the tier substitute), `vehicle-int`
(category `vehicle`, `SchemaAdapters.getAbilityMod(vehicleActor, 'int')`,
same source as the named-gunner formula), `range` (category `range`, same
`getRangePenalty` helper), `misc-enhancement` (the weapon's own flat
attack bonus, when nonzero), and any registered `vehicle.attack`-domain
modifiers resolved via `ModifierEngine.resolveTarget()` — against
`vehicleActor` specifically, since there is no gunner Actor to resolve
against (a documented deviation from the named-gunner path, not a silent
choice).

**Why this is supported, not guessed:** every component traces to an
existing, already-verified source — `CREW_QUALITY_BONUS` (pre-existing
table, now single-sourced), `SchemaAdapters.getAbilityMod` (same adapter
Phase 3 already validated for the named-gunner path), `getRangePenalty`
(same helper). No new numeric constant or table was invented.

**Which components are replacements vs. additions:** Crew Quality
*replaces* Gunner BAB (same formula slot, different source). Vehicle INT
and Range are *additions* relative to the old `rollFallback()` formula,
which omitted both entirely — this phase's biggest single correctness
change for abstract crew, not a refinement of something that already
worked.

**What remains unresolved:** this is "the closest supported equivalent,"
explicitly not a verified SWSE rule citation for "Crew Quality equals Gunner
BAB." No SWSE sourcebook text was supplied or consulted (per "do not guess
SWSE rules," the absence of a citation is stated plainly rather than
invented). If a future phase finds an authoritative rule that abstract
crew should use a different formula (e.g., option B, a single combined
value with no separate INT term), this component table exists specifically
so that correction is a two-line, evidence-traceable change, not a
`total = X` rewrite that hides its own sourcing.

**Compatibility:** `rollFallback()`/`buildFallbackFormula()` are unchanged
for every non-attack skill check. Only the `'attack'` skill's `!actor`
branch changed call target (`rollFallback` → `rollAttack` with
`abstractCrewQuality`). An unrecognized/legacy `crewQuality` string still
defaults to `'normal'` (matching prior behavior) but now with a warning
logged, rather than a silent default.

## Generic attack entry-point map

Full live-caller inventory of `rollAttack(` (research pass, confirmed via
grep, not assumed):

| Caller | Actor passed | Live? |
|---|---|---|
| `character-sheet.js:8654,9215` (`SWSERoll.rollAttack`) | `this.actor` (character/NPC) | Live |
| `crew-skill-router.js:220,~232` | resolved gunner actor OR vehicle (Phase 4) | Live |
| `combat-ui-behavior-hotfix.js:606,665` | sheet/token-resolved actor | Live |
| `reaction-registry.js:662,719` | reacting actor | Live |
| `grapple-feat-actions.js:369` | grappling actor | Live |
| `force-adept-talent-actions.js:567` | Force Adept actor | Live |
| `combat-feature-handlers.js:269,331` | declaring actor | Live |
| `full-attack-executor.js:359` | declaring actor | Live |
| `CombatEngine.js:595` (`CombatEngine.rollAttack`) | n/a | **Dead** — reached only via `CombatExecutor.executeAttack`, which has zero callers |
| `action-economy-bindings.js:266` (via `SWSERoll.rollAttack`) | bound actor | Live |
| `combat/systems/vehicle/vehicle-weapons.js:85,134,240,272` | n/a | **Dead**, file has zero importers |
| `combat-panel-manager.js`, `components/combat-action-bar.js` | n/a | **Dead**, zero importers |

**Can a vehicle actor reach `rollAttack()` as `actor` outside the crew
router?** No live path found. This safety was **template-gated, not
enforced in code**: `character-sheet.js`'s generic `[data-action="roll-attack"]`
handler (line 6634) has no `actor.type` guard at all, but vehicle sheet
templates never emit that data-action (they only emit
`data-action="vehicle-crew-skill"`), so the two never meet in practice.
`combat-ui-behavior-hotfix.js`'s document-wide click delegate resolves an
actor via `sheetFromElement`/controlled-token fallback with no type check
either — currently unreachable for the same template-segregation reason,
but this is an *implicit* invariant (true because nothing currently emits
the matching selector for a vehicle), not a *defended* one.

## Attack-domain routing rules (this phase)

New module: `scripts/engine/combat/attack-domain-router.js`, exporting
`resolveAttackDomain({actor, item, operator, vehicle, sourceContext})` →
`{ok, domain, resolver, normalizedContext, reason, warnings}` per the
brief's own suggested contract. `rollAttack()` now calls this **once**,
unconditionally, before resolving any attack bonus, and dispatches on
`.domain` instead of independently re-deriving vehicle-ness from
`rollOptions.vehicleActor` truthiness (the Phase 3 approach). This closes
the "template-gated, not defended" gap above: any future caller that
passes a vehicle actor into `rollAttack()` with no operator/vehicle context
now gets a structured failure from inside `rollAttack()` itself, regardless
of which button or macro invoked it.

Decision table (see the module's own comments for the full reasoning):

| Condition | Domain | Notes |
|---|---|---|
| `actor.type === 'vehicle'` and `abstractCrewQuality` present | `vehicle-abstract-crew` | Phase 4 |
| `actor.type === 'vehicle'` and no crew signal | **ok:false** | The exact pre-Phase-3 defect; hard-blocked |
| `vehicleActor`/`vehicle` context present, valid | `vehicle-actor-gunner` | Phase 3 |
| `vehicleActor`/`vehicle` context present, not actually vehicle-typed | **ok:false** | Invalid context |
| Item is vehicle-flagged (`isVehicleWeapon`), no vehicle context | `character` (warning only) | See below — deliberately NOT a hard block |
| Otherwise | `character` | Ordinary attack |

**Why a vehicle-flagged weapon with no vehicle context is a warning, not a
block:** `combat-roll-math.js#actorIsProficientForAttack()` already has an
intentional, pre-existing mechanic — the **Spacehound** talent grants
proficiency for a character personally wielding a vehicle-classified
weapon (`actorHasTalentNamed(actor, 'Spacehound') && isVehicleWeapon(weapon)`),
with no vehicle actor involved at all. A hard block on "vehicle-flagged
item + no vehicle context" would have broken that existing mechanic. The
router only warns (for diagnostic visibility) and routes to the character
formula, which already checks Spacehound correctly. This distinction —
found by tracing the Spacehound check before writing the router, not
assumed — is the reason the router does not simply gate on
`isVehicleWeapon(item)`.

**What the router does NOT do:** it contains no BAB/ability/range
arithmetic and executes no roll — it only names which existing resolver
(`resolveAttackBonus` / `resolveVehicleAttackBonus` /
`resolveAbstractCrewAttackBonus`) should run, matching the brief's "must
only select an existing math authority" constraint. Verified by a static
guard (`tests/phase4-abstract-crew-and-routing.test.mjs`) that the router
file contains no `getBAB(`/`getAbilityMod(`/`getRangePenalty(` and no
`new Roll(`/`RollEngine.`/`RollCore.` references.

**Diagnostics:** `AttackRollDiagnostics` now records `resolverSelected`,
`domainReason`, and `domainWarnings` from every routing decision (not just
a coarse vehicle/character guess), and `rollAttack()` logs routing
warnings to console for development visibility — satisfying "Add
development diagnostics showing which resolver was selected and why"
without adding a permanent UI element.

## Vehicle size rule conclusion

**No vehicle attack-roll size modifier exists anywhere in this codebase,
wired or unwired, beyond an unused display field.** Evidence (research
pass, negative-search results included, not just positive findings):

- `system.size` is carried on real vehicle actors and in shipped compendium
  data (`packs/vehicles-starfighters.db`: `"size":"gargantuan"`;
  `packs/vehicles-capital-ships.db`: `"size":"colossal (frigate)"`) but is
  **not declared in `template.json`'s vehicle schema** and is read only for
  display/classification purposes (`vehicle-context-builder.js:280,383`),
  never for attack math.
- Multiple size-modifier tables exist in the codebase
  (`REFLEX_SIZE_MODIFIERS`, `DAMAGE_THRESHOLD_SIZE_BONUSES`,
  `_getVehicleSizeModifier` in `swse-combat.js` for Initiative only, a
  generic character `SIZE_MODIFIERS`) — **none of them are imported by
  `combat-roll-math.js` or `vehicle-attack-math.js`** (confirmed: grep for
  `size` in both files returns zero modifier-table hits). They govern
  Reflex Defense, Damage Threshold, and Initiative respectively — not
  attack rolls, for vehicles or characters.
- No comment, TODO, disabled code, or test references a vehicle
  attack-roll size modifier.

**Conclusion:** Phase 3's finding holds. No size modifier was added to
`vehicle-attack-math.js` this phase — doing so would require inventing a
size→attack-bonus table with no rules citation. A regression test
(`tests/phase4-vehicle-size-fire-control-regression.test.mjs`) asserts
`vehicle-attack-math.js` contains no `/size/i` reference at all, so a
future change cannot silently fold one in without deliberately updating
this conclusion and the test together.

## Fire-control rule/data conclusion

**No fire-control attack modifier exists, and the one related field that
does exist carries no real values yet.** `vehicleMount.fireControl`/
`itemSystem.fireControl` is captured by `vehicle-context-builder.js`
(`buildVehicleWeaponMountPanel`, `normalizeVehicleWeaponEntry`) purely for
**display** in `vehicle-weapon-mount-panel.hbs`; grep confirms zero reads
of `.fireControl` in `combat-roll-math.js` or `vehicle-attack-math.js`.
Shipped compendium data confirms the field is present but **always
`null`** — `packs/vehicles-capital-ships.db` has 42 occurrences of
`"fireControl":null` and zero non-null values. `vehicle-weapon-import-normalizer.js`
parses a `fireControl` string out of imported text but only populates the
display field, never feeds math. Emplacement Points (EP) in
`vehicle-modification-manager.js`/`vehicle-factory.js` are a modification
cost/budget stat, unrelated to attack-roll bonuses.

**Conclusion:** not implemented, and — unlike vehicle size — there isn't
even categorical data to key a future table off of yet (every shipped
value is null). Per the brief's own guidance ("If the rules support it but
the system lacks schema/data support, create a narrowly scoped Phase 5
recommendation instead of expanding Phase 4"), this is deferred rather than
implemented. **Phase 5 candidate:** if/when real `fireControl` values are
populated in vehicle weapon data (currently none are), add it as its own
ledger component (category `weapon`, not folded into "Enhancement") —
until then there is nothing to wire up. Covered by the same regression
test as vehicle size (`/firecontrol/i` absence check).

## Multi-target reroll behavior

**No live "one roll → multiple target outcomes" attack workflow exists in
this codebase.** This materially narrows Phase 4 item 6's scope, and is
stated plainly rather than papered over with new UI built only to have
something to align:

- `SWSERoll.rollAutofire()` and `SWSERoll.rollBulkAttack()`
  (`scripts/combat/rolls/enhanced-rolls.js`) are the only code that rolls
  one d20 and loops multiple targets through independent
  `AttackOutcomeResolver.resolve()` calls — the exact shape a reroll-rebuild
  feature would need. **Both have zero callers anywhere in `scripts/`**
  (confirmed by grep), and `rollAutofire` additionally references
  `attackRerollOptions` without defining it in scope — a live bug in dead
  code, left untouched per "do not delete dead compatibility files solely
  because they are dead" and "keep changes surgical."
- The live "autofire"/"burst-fire" combat-feature entries
  (`combat-feature-handlers.js`, `executeCombatFeatureAttackOption`) are
  **single-target, single-roll** — an attack-option modifier only, not an
  area/multi-target resolution. There is currently no live UI or macro path
  that produces a genuine one-roll-many-targets attack.
- Vehicle weapon-battery/multi-weapon-fire code
  (`combat/systems/vehicle/vehicle-weapons.js`) is confirmed dead, no
  importers.

**Conclusion:** items 6's required behaviors (rebuild each target's
outcome independently on reroll, mark the original set superseded, etc.)
have no live target to apply to. No new multi-target attack feature was
built this phase to create one — that would be "broadening into a general
combat rewrite," explicitly out of scope. If/when a live multi-target
attack workflow is built (autofire, burst, area templates), it should
reuse `AttackOutcomeResolver` per target from day one and adopt the
`sequenceId`/`attackInstanceId` pattern this phase added for full-attack
sequences (below) rather than inventing a third identity scheme.

## Full-attack reroll behavior

Two live, independent full-attack orchestrators exist (a third,
`SWSECombat.rollFullAttack()` in `enhanced-combat-system.js`, is dead —
its only caller, `combat-action-bar.js`, is never mounted anywhere).
Neither had any shared sequence identity before this phase:

**`executeCombatFeatureMultiattack()`** (`combat-feature-handlers.js`,
live — Double/Triple Attack combat-feature buttons): loops
`buildFullAttackSequence()`'s plan, calling `rollAttack()` per attack
**without** `suppressChat` — each attack already gets its own fully
Phase-3-flagged, independently rerollable chat message. It had **no id
linking the N messages together** (only in-memory `actionData` fields, not
persisted to any message flag). **This phase:** generates one `sequenceId`
(`foundry.utils.randomID()`) per multiattack declaration, one
`attackInstanceId` (`${sequenceId}-${index}`) per attack, threads both
through `rollAttack()`'s `rollOptions`, and `rollAttack()` now persists
`sequenceId`/`attackInstanceId`/`sequenceIndex`/`sequenceLength` onto the
posted chat message's `flags.swse` (alongside the existing
authoritative/superseded/revision fields) and onto the returned
`attackResult`.

Since each attack in this path already posts an independent message, and
Phase 3's reroll handler already operates strictly per-message, **sibling
isolation on reroll was already true by construction** — this phase's
identity tagging makes that provable (and testable) rather than merely
incidental, and gives a future feature a real id to key off of instead of
array-index matching. Sequence penalties are unaffected (`step.finalPenalty`
is computed once in the plan before the loop, passed as a literal number,
and — per Phase 3's existing reroll-formula-capture design — a reroll
re-executes the captured `1d20 + <bonus>` string rather than recomputing
anything). The shared action-economy spend (`ActionEconomyConsumption.spend`)
is guarded by `if (!spend)` inside the loop, so it fires at most once per
declared sequence regardless of how many attacks follow — unaffected by
this phase, confirmed by a new test.

**`FullAttackExecutor.execute()`** (`full-attack-executor.js`, live — the
Full Attack dialog path): calls `rollAttack()` per attack with
`suppressChat: true`, then posts **one combined card** at the end
(`_postCombinedCard`) with no per-attack Phase 3 state at all (previously
`flags: {swse: {fullAttack: true, packageType}}` only). **This phase:**
same `sequenceId`/`attackInstanceId` generation, threaded through each
suppressed `rollAttack()` call and into `_postCombinedCard`, which now
writes `flags.swse.sequenceId` and `flags.swse.attacks: [{attackInstanceId,
sequenceIndex, activeRevision, authoritative, superseded, weaponId,
naturalD20, finalTotal, isHit, isCritical, critMultiplier}, ...]` — the
`attacks: [{attackInstanceId, activeRevision, revisions}]` shape the brief's
own suggested message-state schema calls for (simplified: no per-attack
`revisions[]` array yet, since there is no reroll UI on this card to
produce a second revision).

**What is explicitly NOT implemented this phase, and why:** interactive
per-attack reroll on the *combined-card* path. The existing reroll button/
handler (`meta-resource-feat-resolver.js#resolveAttackRerollButton`)
operates on one `ChatMessage`'s own flags; retrofitting a reroll control
for one row inside a shared combined-card message would need new chat
template markup and a new button-dispatch path, which is a real feature
build, not a surgical identity-tagging pass. The identity/schema
foundation added this phase (`sequenceId`, per-attack `attackInstanceId`,
the `attacks[]` array) is exactly what that future work would need to
build on — **Phase 5 candidate**, scoped narrowly rather than attempted
under time/architecture-risk pressure this phase.

## Damage-action routing behavior

Phase 3's `isAttackMessageSuperseded()` guard (present on
`handleCombatDamageRollButton`, `handleLegacyDamageRollButton`,
`handleApplyDamageButton`) is unchanged and re-verified passing. **New this
phase:** `handleApplyDamageButton` had no idempotency protection at all —
a double-click, or a second person clicking the same "Apply Damage"
button, applied the same packet to the same actor's HP twice with no
record. Added a message-flag receipt
(`flags.swse.damageApplications: [{key, targetId, amount, appliedAt}, ...]`,
keyed by `weapon:targetId` so applying to two *different* targets from one
message is still allowed) — checked before `DamageSystem` is invoked (after
the existing superseded check, which still runs first) and written after a
successful apply. The write is best-effort (try/catch): a failed flag
write never undoes damage that was already applied, matching the existing
Phase 3 convention for non-critical message-state writes. Attack totals,
hit state, and critical status are still never recalculated in a damage
handler — they continue to read from the authoritative stored outcome via
`combatContext`/button data attributes, unchanged.

## Message-state schema

The brief's suggested versioned shape was **not adopted as a full rewrite**
(migrating every historical message is explicitly out of scope, and Phase 1-3
already established a working, narrower schema). What exists after Phase 4,
concretely:

- **Single-attack messages** (`attacks.js#rollAttack()`, both the
  named-gunner/abstract-crew vehicle paths and the character path):
  `flags.swse = {attackRoll, weaponId, attackRerollOptions, workflowContext,
  actionOptionSpend, authoritative, superseded, supersededBy, revision,
  sequenceId, attackInstanceId, sequenceIndex, sequenceLength,
  damageApplications}` — the last field is written lazily by the damage
  handler, not at roll time. `sequenceId`/`attackInstanceId`/etc. are
  `null` for an ordinary (non-sequence) attack.
- **Full-attack combined-card messages**
  (`full-attack-executor.js#_postCombinedCard`): `flags.swse =
  {fullAttack: true, packageType, sequenceId, attacks: [{attackInstanceId,
  sequenceIndex, activeRevision, authoritative, superseded, weaponId,
  naturalD20, finalTotal, isHit, isCritical, critMultiplier}, ...]}`.
- **Old messages** (pre-Phase-3 or pre-Phase-4): every new field is read
  via optional chaining with a falsy/null default throughout (unchanged
  Phase 3 convention) — an old message without `sequenceId` behaves exactly
  like a non-sequence attack, and without `damageApplications` behaves
  exactly like a message that has never had damage applied. No migration
  helper was added; none was needed, because nothing requires the new
  fields to be present.
- **Serialization:** every field added this phase is a primitive, string,
  or plain-object/array of primitives — no Actor/Item/Token/Roll/
  Application/HTMLElement references are stored in any flag (verified by
  code review of every new flag-write site).

This is a real hardening pass, not the brief's full unified schema — that
remains a **Phase 5 candidate** if a future phase needs `revisions[]`
history arrays or cross-message damage-application aggregation.

## Stacked PR integration findings

Reviewed PRs #928-#930 (and this phase's own diff) together, specifically
hunting for duplicate helpers, shape drift, and inconsistent failure
handling:

- **Found and fixed:** `CREW_QUALITY_BONUS` was declared independently in
  `crew-skill-router.js` with no relationship to the (not-yet-existing, at
  the time) vehicle formula module. This phase made
  `vehicle-attack-math.js` the single source and had the router import it
  — closing a drift risk before it could ever manifest as a bug (both
  copies happened to still match at review time, but nothing enforced
  that).
- **Verified consistent:** the ledger shape
  (`{id, label, value, category, sourceId, sourceName, domain, applied,
  reason}`) is identical across `resolveVehicleAttackBonus`,
  `resolveAbstractCrewAttackBonus`, and the character path's
  `buildLedgerFromComponents` adapter — no drift.
- **Verified consistent:** failure-handling shape
  (`{total: 0, ledger: [], warnings, error: 'invalid-...'}`) matches
  between both vehicle resolvers.
- **Verified no import cycles:** `attack-domain-router.js` imports only
  `combat-stat-rules.js`; neither `combat-roll-math.js`,
  `attack-outcome-resolver.js`, nor `force-point-spend-coordinator.js`
  import anything from Phase 4's new files (checked directly, not
  assumed) — the dependency direction stays one-way (Phase 4 → Phase 1-3
  authorities, never the reverse).
- **Verified no accidental integration-behavior masking:** the reroll
  handler (`meta-resource-feat-resolver.js`) contains no reference to
  `resolveVehicleAttackBonus`, `resolveAbstractCrewAttackBonus`, or
  `resolveAttackDomain` — confirming rerolls still work purely by
  re-executing a captured formula string, not by re-running any Phase 3/4
  resolver (which would risk re-deriving a *different* bonus if a modifier
  changed between roll and reroll — explicitly not desired per Phase 3's
  "reroll preserves resolved formula components" design).
- **No dead imports, no circular imports, no conflicting doc/comment
  claims** found in the files this phase touched.

**Merge order:** unchanged from Phase 3's guidance — #928 first, then
#929, then #930, then this Phase 4 PR. Each PR's base branch already
targets its predecessor, so GitHub will merge them in that order naturally;
no manual reordering is required.

**Expected conflicts:** none anticipated at merge time — this phase's
changes are additive to files Phase 3 already modified
(`attacks.js`, `crew-skill-router.js`, `vehicle-attack-math.js`) in
non-overlapping regions (new imports, new branches, new fields appended to
existing objects), and to files no prior phase touched
(`combat-feature-handlers.js`, `full-attack-executor.js`,
`chat-interaction-bridge.js`'s damage-application section is new code
appended near, not inside, Phase 3's supersession-guard code).

## Defects confirmed

1. Abstract-crew vehicle attacks used a standalone formula that omitted
   Range and Vehicle INT entirely and bypassed `AttackOutcomeResolver`,
   `ModifierEngine`, and the entire Phase 1-3 chat-state schema. **Fixed**
   — routed through the shared `rollAttack()` pipeline with a
   formula-aligned resolver.
2. `CREW_QUALITY_BONUS` existed as an un-synchronized duplicate ready to
   drift between two files. **Fixed** — single-sourced.
3. Attack-domain selection depended entirely on template segregation (which
   UI emits which `data-action`), not on any check inside the shared
   `rollAttack()` pipeline — a vehicle actor reaching `rollAttack()` through
   any future/alternate entry point would have silently used its own empty
   BAB/ability schema again. **Fixed** — `attack-domain-router.js` is now
   consulted by `rollAttack()` itself and hard-fails that specific case.
4. Two live full-attack sequences (`executeCombatFeatureMultiattack`,
   `FullAttackExecutor.execute`) had zero shared identifier linking their
   constituent attacks, making "reroll one, leave siblings alone" true only
   by accident of implementation rather than by design. **Fixed** — stable
   `sequenceId`/`attackInstanceId` now threaded and persisted on both paths.
5. "Apply Damage" had no duplicate-application protection — a repeat click
   silently applied the same damage packet twice. **Fixed** — message-flag
   receipt, keyed by weapon+target.

## Suspected defects not confirmed

- The generic `[data-action="roll-attack"]` handler and
  `combat-ui-behavior-hotfix.js`'s document-wide click delegate still have
  no `actor.type` guard of their own — they are safe today only because no
  vehicle template emits a matching selector (an implicit, not defended,
  invariant at the DOM-wiring layer, even though `rollAttack()` itself is
  now defended at the domain-router layer). Not changed this phase, since
  `resolveAttackDomain()` inside `rollAttack()` already closes the actual
  risk (a vehicle actor reaching the math with no context); adding a
  redundant second guard at the DOM layer was judged lower priority than
  the other Phase 4 work, not skipped by oversight.
- Whether `system.derived.damage.conditionPenalty` should read from the
  operator or the vehicle for a vehicle weapon attack (Phase 3's open
  question) remains unverified against a rules source; unchanged.
- Whether abstract crew's `CREW_QUALITY_BONUS`-as-Gunner-BAB-equivalent
  formula choice is the SWSE-RAW-correct model (vs. option B, a single
  combined value with no separate INT term) is not settled by a rules
  citation — see "Abstract-crew formula authority" above.

## Exact files changed

**Modified:**
- `scripts/combat/rolls/attacks.js` — `attack-domain-router.js`
  integration in `rollAttack()`; abstract-crew resolver branch;
  sequenceId/attackInstanceId persisted to chat flags and `attackResult`;
  diagnostics fields extended.
- `scripts/engine/combat/vehicle-attack-math.js` —
  `resolveAbstractCrewAttackBonus()` added; `CREW_QUALITY_BONUS` exported
  as the canonical table.
- `scripts/engine/combat/attack-roll-diagnostics.js` — `resolverSelected`/
  `domainReason`/`domainWarnings`/message-state fields added to `record()`;
  new `report()` GM-facing formatter.
- `scripts/sheets/v2/vehicle-sheet/crew-skill-router.js` — imports
  `CREW_QUALITY_BONUS` instead of declaring it; abstract-crew `'attack'`
  branch now calls `rollAttack()` instead of `rollFallback()`.
- `scripts/engine/combat/features/combat-feature-handlers.js` —
  sequenceId/attackInstanceId generation and threading in
  `executeCombatFeatureMultiattack()`.
- `scripts/engine/combat/full-attack-executor.js` — same identity
  threading in `execute()`; `_postCombinedCard()` writes the
  `attacks[]` schema array.
- `scripts/ui/chat/chat-interaction-bridge.js` — damage-application
  receipt helpers and `handleApplyDamageButton()` guard.
- `tests/phase3-vehicle-attack-formula.test.mjs` — updated for this
  phase's `attacks.js` restructuring (router dispatch, abstract-crew
  branch); no invariant was weakened, only re-anchored to the new code
  shape (see inline diff comments in the file).

**New:**
- `scripts/engine/combat/attack-domain-router.js`
- `tests/phase4-abstract-crew-and-routing.test.mjs`
- `tests/phase4-vehicle-size-fire-control-regression.test.mjs`
- `tests/phase4-full-attack-sequence-identity.test.mjs`
- `tests/phase4-damage-application-receipt.test.mjs`
- `tests/phase4-stacked-integration.test.mjs`
- `tests/vehicle-attack-routing-guard-check.test.mjs`
- `tools/check-vehicle-attack-routing-guard.mjs`
- `docs/audits/rolling-system-alignment-phase-4.md` (this file)

No feat, talent, progression, character-generation, workbench, GM-tool, or
compendium file was touched.

## Tests added

7 new test files (6 static-guard, following the established convention —
production files use absolute `/systems/foundryvtt-swse/...` imports that
only resolve inside Foundry's module loader — plus 1 guard-tool smoke
test), summarized by what each proves:

- `phase4-abstract-crew-and-routing.test.mjs` — abstract-crew formula
  sourcing (RollCore-pipeline reuse, ModifierEngine domain resolution, no
  gunner/abstract-crew stacking, invalid-data warnings, single-sourced
  `CREW_QUALITY_BONUS`) and the domain router's four decision branches,
  its "select only, never compute/roll" constraint, and its wiring into
  `rollAttack()`.
- `phase4-vehicle-size-fire-control-regression.test.mjs` — asserts
  `vehicle-attack-math.js` contains no size or fire-control reference at
  all, locking in this phase's non-implementation conclusion.
- `phase4-full-attack-sequence-identity.test.mjs` — sequenceId generated
  once per declaration (not per attack) on both live full-attack paths;
  distinct attackInstanceId per attack; persistence onto chat flags and
  the combined-card schema; sequence-penalty and cost-spend invariants
  unaffected.
- `phase4-damage-application-receipt.test.mjs` — receipt check precedes
  `DamageSystem` invocation, receipt write follows a successful apply,
  best-effort try/catch, ordered after (not instead of) the superseded
  check.
- `phase4-stacked-integration.test.mjs` — the combined cross-phase
  integration test required by item 10: vehicle context selection feeding
  formula resolution, shared roll-formula construction, shared
  `ModifierEngine`/`AttackOutcomeResolver` call sites, Force-Point-path
  correctness (present for character/named-gunner rerolls, absent — not
  fabricated — for abstract crew), unified chat-state writes, reroll
  handler non-interference with Phase 4's resolvers, and damage-routing
  guard ordering; plus one-way dependency-direction checks between
  phases' files.
- `vehicle-attack-routing-guard-check.test.mjs` — smoke test for the new
  guard tool, report and `--strict` modes.
- `phase3-vehicle-attack-formula.test.mjs` (existing file, updated) — all
  20 originally-required formula-validation properties re-verified against
  this phase's restructured `attacks.js`/`crew-skill-router.js`, plus one
  new assertion (#21) that resolver dispatch is driven by
  `resolveAttackDomain()`.

## Guards added or updated

- `tools/check-vehicle-attack-routing-guard.mjs` (new) — four invariants:
  `rollAttack()` dispatches via `resolveAttackDomain()`; no file outside
  `vehicle-attack-math.js` reads a vehicle actor's own BAB; no file outside
  `vehicle-attack-math.js` computes a gunner's own ability modifier for a
  vehicle-domain ledger entry; abstract crew's `'attack'` skill branch
  routes through `rollAttack()`, not a standalone roll. Report-only by
  default, `--strict` to fail, same convention as Phase 1-3 guards.
- Phase 1-3 guards (`check-combat-math-ssot.mjs`,
  `check-attack-outcome-ssot.mjs`, `check-critical-confirmation-guard.mjs`,
  `check-reroll-supersession-guard.mjs`) — unmodified, re-run, zero new
  findings.

## Commands run

```
node --check <every changed/added .js file>
node tools/ci-smoke-check.mjs
node tools/check-combat-math-ssot.mjs [--strict]
node tools/check-attack-outcome-ssot.mjs [--strict]
node tools/check-critical-confirmation-guard.mjs [--strict]
node tools/check-reroll-supersession-guard.mjs [--strict]
node tools/check-vehicle-attack-routing-guard.mjs [--strict]
node tests/<each>.test.mjs   (all 34: 10 pre-Phase-1 + 7 Phase 1 + 6 Phase 2 + 5 Phase 3 + 6 Phase 4)
git diff --stat / grep for actor.update(/new Roll( in changed files
```

## Test results

- All changed/added `.js` files: `node --check` passes.
- `tools/ci-smoke-check.mjs`: same 2 pre-existing failures as the
  Phase 1-3 baseline (`audit-nonheroic-weapon-damage.mjs`,
  `audit-npc-source-attribution.mjs`), unrelated files, unchanged.
- All 5 static guards: pass, report and `--strict`, zero new findings.
- `tests/*.test.mjs`: **34 files total** (10 pre-Phase-1 + 7 Phase 1 + 6
  Phase 2 + 5 Phase 3 + 6 Phase 4). **29 pass / 5 fail** — the same 5
  pre-existing `ERR_MODULE_NOT_FOUND` files from the Phase 1-3 baseline
  (`force-power-final-integration`, `phase3-force-power-corrections`,
  `phase4-force-modifier-automation`, `phase5-force-healing-mitigation`,
  `phase6-force-direct-damage` — these are Force-power-track tests,
  unrelated to the rolling-system track, and fail for the same
  environment-only reason documented since Phase 1). **Zero new failures.**
- `git diff` review: no `actor.update(` or `new Roll(` introduced anywhere
  in this phase's diff.

## Preexisting failures (recorded before editing, matches Phase 1-3)

Identical to the Phase 1-3 baseline, re-confirmed unchanged by this phase:
the same 5 `tests/*.test.mjs` `ERR_MODULE_NOT_FOUND` failures (absolute
`/systems/...` imports, environment limitation, not a code defect), and the
same 2 `tools/ci-smoke-check.mjs` syntax failures in
`tools/audit-nonheroic-weapon-damage.mjs` /
`tools/audit-npc-source-attribution.mjs`.

## Runtime harness instructions

`AttackRollDiagnostics` (`scripts/engine/combat/attack-roll-diagnostics.js`,
registered at `globalThis.SWSE.debug.attackRolls`) is opt-in and disabled
by default — unchanged posture from Phase 2/3, extended this phase with a
GM-facing `report()` formatter:

```js
// In a GM macro or the console, in a running Foundry v13 world:
globalThis.SWSE.debug.attackRolls.enabled = true;
// ...perform an attack (character, named-gunner vehicle, or abstract crew)...
globalThis.SWSE.debug.attackRolls.report();
// Prints: domain, resolver selected + why, actor/vehicle/operator,
// weapon, target, formula, raw d20, final total, full component ledger
// (applied and suppressed), outcome, Force Point receipt (if any),
// transaction receipts, and chat message id/revision/authoritative/
// superseded state.

// Cleanup when done verifying:
globalThis.SWSE.debug.attackRolls.enabled = false;
globalThis.SWSE.debug.attackRolls.clear();
```

No permanent UI element was added; nothing is logged while disabled;
`report()` itself never throws (it prints a clear "disabled" or
"no attacks recorded" message instead) and never mutates any actor —
running it is always safe.

## Runtime matrix

**Foundry VTT v13 could not be launched in this static-analysis
environment** (same constraint as Phase 1-3; no display/Electron/Node
Foundry install available here). Every row below is genuinely pending —
none should be read as "passed." The 44-row Phase 3 matrix is carried
forward unchanged (see `rolling-system-alignment-phase-3.md`) plus the
following Phase 4 additions:

### Abstract crew (10 rows)

| # | Test | Statically proven | Runtime result |
|---|---|---|---|
| 1 | Valid abstract-crew attack | Yes (static, formula + routing tested) | Pending |
| 2 | Abstract crew natural 1 | Partially (unconditional shared `AttackOutcomeResolver.resolve()` call — see phase3-vehicle-attack-formula.test.mjs #18/21) | Pending |
| 3 | Abstract crew natural 20 | Partially (same) | Pending |
| 4 | Abstract crew expanded critical range | No | Pending |
| 5 | Abstract crew range penalty | Yes (static, `getRangePenalty` sourced once) | Pending |
| 6 | Abstract crew miscellaneous modifier | Yes (static, weapon enhancement + ModifierEngine ledger entries) | Pending |
| 7 | Invalid crew-quality data | Yes (static, warning + default-to-normal) | Pending |
| 8 | Abstract crew with no Force Point support | Yes (static, no ForcePoint reference anywhere in vehicle-attack-math.js; vehicleActor has no FP pool) | Pending |
| 9 | Abstract crew attack chat-to-damage handoff | No (depends on live chat rendering) | Pending |
| 10 | Abstract crew reroll | Partially (reuses the same unmodified reroll handler as any other attack — see stacked-integration test) | Pending |

### Generic routing (7 rows)

| # | Test | Statically proven | Runtime result |
|---|---|---|---|
| 11 | Character weapon routes to character resolver | Yes (static) | Pending |
| 12 | Vehicle-mounted weapon routes to vehicle actor-gunner resolver | Yes (static) | Pending |
| 13 | Abstract-crew weapon routes to abstract-crew resolver | Yes (static) | Pending |
| 14 | Vehicle weapon invoked from an item-sheet button | N/A — no such button exists (research pass confirmed) | N/A |
| 15 | Vehicle weapon invoked from a macro | No | Pending |
| 16 | Invalid vehicle weapon context fails clearly | Yes (static, `ok:false` structured failure) | Pending |
| 17 | No vehicle weapon falls back to vehicle BAB or gunner Dex/Str | Yes (static, guard tool + tests assert absence) | Pending |

### Multi-target rerolls (6 rows)

| # | Test | Statically proven | Runtime result |
|---|---|---|---|
| 18-23 | Autofire/shared-roll reroll rebuild scenarios | **N/A — no live shared-roll multi-target attack workflow exists** (confirmed dead code; see "Multi-target reroll behavior" above) | N/A |

### Full attack (9 rows)

| # | Test | Statically proven | Runtime result |
|---|---|---|---|
| 24 | Reroll first attack only | Partially (sibling isolation provable via distinct attackInstanceId + per-message reroll; interactive reroll UI for the combined-card path not implemented) | Pending |
| 25 | Reroll middle attack only | Partially (same) | Pending |
| 26 | Reroll final attack only | Partially (same) | Pending |
| 27 | Sibling attacks remain unchanged | Yes (static, per-message independence + distinct ids) | Pending |
| 28 | Sequence cost is not spent twice | Yes (static, `if (!spend)` guard / pre-loop spend) | Pending |
| 29 | Ammunition remains correct | Partially (unchanged from Phase 1-3 ammo transaction logic, not re-verified this phase) | Pending |
| 30 | Critical multiplier remains isolated | Yes (static, per-call-independent variable) | Pending |
| 31 | Superseded attack card cannot apply stale damage | Yes (static, same guard as single attacks) | Pending |
| 32 | Damage applies from the correct attack instance | Partially (attackInstanceId now present on messages; damage handlers don't yet cross-reference it explicitly since one-message-per-attack already isolates correctly on the live per-message path) | Pending |

### Vehicle modifiers (4 rows)

| # | Test | Statically proven | Runtime result |
|---|---|---|---|
| 33 | Verify vehicle size behavior per confirmed rule | Yes (static — confirmed non-implementation, regression-tested) | N/A (no modifier to verify) |
| 34 | Verify fire-control behavior per confirmed implementation | Yes (static — confirmed non-implementation, regression-tested) | N/A (no modifier to verify) |
| 35 | No double-counting with weapon attack bonuses | Yes (static, weapon enhancement appears exactly once per resolver) | Pending |
| 36 | Each implemented modifier appears once in the ledger | Yes (static, per-function call-count assertions) | Pending |

### Message state (8 rows)

| # | Test | Statically proven | Runtime result |
|---|---|---|---|
| 37 | New schema single attack | Yes (static) | Pending |
| 38 | New schema multi-target attack | N/A (no live multi-target workflow) | N/A |
| 39 | New schema full attack | Yes (static, both live paths) | Pending |
| 40 | Old aligned message compatibility | Yes (static, optional-chaining default-null pattern) | Pending |
| 41 | Legacy message graceful failure | Yes (static, same pattern) | Pending |
| 42 | Duplicate damage action protection | Yes (static, receipt guard) | Pending |
| 43 | Reroll history retained | Partially (revision counter increments; no full `revisions[]` history array) | Pending |
| 44 | Latest revision remains authoritative after page reload | Yes by construction (flags persist on the ChatMessage document; no in-memory-only state) | Pending |

## Remaining Phase 5 candidates

1. Interactive per-attack reroll UI for `FullAttackExecutor`'s
   combined-card path (identity/schema foundation laid this phase; the
   button/template wiring itself was judged too large for a surgical pass).
2. If/when real `fireControl` data is ever populated (currently always
   null in shipped compendiums), wire it into `vehicle-attack-math.js` as
   its own ledger component.
3. Obtain or confirm an authoritative SWSE source for vehicle attack-roll
   size modifiers (if one exists) before implementing anything.
4. Settle, with a rules citation, whether abstract crew's Crew-Quality-as-
   Gunner-BAB-equivalent model is correct, or whether option B (a single
   combined value with no separate Vehicle INT term) is intended instead.
5. Add a defense-in-depth `actor.type` guard at the DOM-wiring layer
   (generic `[data-action="roll-attack"]` handler,
   `combat-ui-behavior-hotfix.js`'s click delegate) — currently safe only
   because no vehicle template emits a matching selector, now backed by
   `resolveAttackDomain()`'s own hard-fail inside `rollAttack()`, but a
   second layer would remove even the implicit dependency on template
   segregation.
6. Whether `system.derived.damage.conditionPenalty` should read from the
   operator or the vehicle for a vehicle weapon attack (open since Phase 3).
7. A live multi-target attack workflow does not currently exist to reroll —
   if Phase 5 or later builds one (reviving/fixing `rollAutofire` or a new
   implementation), it should adopt this phase's `sequenceId`/
   `attackInstanceId` identity pattern and resolve each target through
   `AttackOutcomeResolver` independently from day one.
8. Full `revisions[]` history arrays and cross-message damage-application
   aggregation, if a future phase needs richer audit trail than the current
   revision counter + damage-application receipt list provide.
9. All pending runtime-matrix rows above and the full Phase 3 44-row matrix,
   plus the still-dead code disposition questions carried since Phase 2
   (`vehicle-weapons.js`, `swse-vehicle-core.js#rollWeapon()`,
   `SWSECombat`/`CombatEngine.resolveAttack()`, `CombatActionBar`,
   `SWSERoll.rollAutofire()`/`rollBulkAttack()`).

## Final summary

**Fixed**
- Abstract-crew vehicle attacks now use the authoritative formula (Crew
  Quality as a Gunner-BAB-equivalent + Vehicle INT + Range + individually-
  labeled misc components) and flow through `AttackOutcomeResolver`,
  `ModifierEngine.resolveTarget()`, and the full Phase 1-3 chat/ledger
  pipeline instead of a standalone unflagged roll.
- Attack-domain selection is now enforced inside `rollAttack()` itself
  (`attack-domain-router.js`), not merely implied by which UI button fired
  — a vehicle actor with no operator/crew context now gets a structured
  failure from any caller, not just the ones written so far.
- Two live full-attack sequences now carry a stable `sequenceId`/
  `attackInstanceId` per attack, proving (not merely assuming) sibling
  reroll isolation.
- "Apply Damage" can no longer silently double-apply the same packet.
- A duplicate `CREW_QUALITY_BONUS` table was consolidated to one source.

**Abstract crew**
- Formula corrected and documented with full sourcing; Force Points
  correctly absent (not fabricated); mutually exclusive with named-gunner
  attacks by construction (unchanged from Phase 3).

**Routing**
- New `attack-domain-router.js`, wired into the one live entry point that
  matters (`rollAttack()`), selecting existing authorities only — no new
  math, no new dice execution.

**Rerolls**
- Full-attack sequence identity added on both live paths. Multi-target
  reroll rebuilding has no live target to apply to (dead code only) —
  explicitly not built to avoid inventing a feature just to align it.
  Interactive per-attack reroll for the combined-card path is a scoped
  Phase 5 candidate.

**Vehicle modifiers**
- Size and fire-control: confirmed unimplemented, confirmed unsupported by
  current data, regression-tested against accidental future addition
  without evidence.

**Message state**
- Sequence identity and damage-application receipts added to the existing
  Phase 3 schema; no full rewrite, no historical-message migration.

**Tests**
- 6 new test files + 1 guard-tool smoke test + 1 new static guard tool;
  1 existing Phase 3 test file updated for this phase's restructuring.
  Zero regressions across 34 total test files and 5 static guards.

**Runtime results**
- **None.** Foundry VTT v13 was not launched. Every runtime-matrix row is
  pending. The extended diagnostics harness (`report()`) is ready for
  whoever runs it.

**Integration findings**
- One real duplicate-table drift risk found and fixed
  (`CREW_QUALITY_BONUS`). No circular imports, no ledger-shape drift, no
  reroll-handler interference with this phase's new resolvers. Merge order
  and expected conflicts documented above (none anticipated).

**Remaining risks**
- Interactive combined-card full-attack reroll is unimplemented.
- No live multi-target attack workflow exists to verify reroll rebuilding
  against — a gap in coverage, not a gap in correctness, but worth noting
  if Phase 5 revives autofire.
- Generic attack-button DOM wiring still has no defense-in-depth
  `actor.type` guard of its own (relies on `attack-domain-router.js`
  inside `rollAttack()`, plus template segregation).
- Abstract crew's formula choice (Crew Quality = Gunner-BAB-equivalent) is
  the closest supported model, not a verified rule citation.
- Vehicle size/fire-control remain unimplemented — by design, pending
  either a rules citation or real data.

This pass does not claim the rolling system is fully unified, and does not
claim the remaining live bypasses are proven closed by anything other than
static analysis — the runtime matrix above must be executed in a live
Foundry VTT v13 world before that claim could be made.
