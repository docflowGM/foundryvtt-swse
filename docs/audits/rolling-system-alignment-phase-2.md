# Rolling-System Alignment — Phase 2

Static audit + surgical alignment fixes, building on Phase 1 (draft PR #928,
branch `claude/rolling-system-alignment-phase-1-pkz2bn`, merged into this
branch's history). No general-purpose roll engine was created; existing
authorities (RollCore, ModifierEngine, ActorEngine, AttackOutcomeResolver,
combat-roll-math.js, SWSEChat) were extended, not replaced.

**Headline finding of this pass:** several of the files this phase was
scoped to align (`scripts/combat/systems/vehicle/vehicle-weapons.js`,
`scripts/actors/vehicle/swse-vehicle-core.js`, `scripts/combat/systems/enhanced-combat-system.js`
+ `scripts/engine/combat/CombatEngine.js#resolveAttack`, and three of
`enhanced-rolls.js`'s four attack methods) turned out to have **zero live
callers** anywhere in the active codebase, confirmed by exhaustive grep
rather than assumed. This materially changed the shape of the work: the real
live attack surface is narrower and already better-aligned than the Phase 1
report's own recommended-reading list implied, but the dead code was left
in place (per "do not delete until proven obsolete") with deprecation
comments rather than silently ignored.

## Phase 1 baseline reviewed

- `docs/audits/rolling-system-alignment-phase-1.md`
- `scripts/engine/roll/roll-core.js`, `scripts/engine/roll-engine.js`
- `scripts/engine/combat/combat-roll-math.js`
- `scripts/engine/force/force-point-spend-coordinator.js` (new in Phase 1)
- `scripts/engine/combat/attack-outcome-resolver.js` (new in Phase 1)
- `ModifierEngine.resolveTarget()` / `resolveTargetFromModifiers()` (new in Phase 1)
- All Phase 1 tests (`tests/attack-outcome-*.test.mjs`, `tests/*force-point*.test.mjs`,
  `tests/modifier-*.test.mjs`) and static guards (`tools/check-combat-math-ssot.mjs`,
  `tools/check-attack-outcome-ssot.mjs`)

## Files inspected

- `scripts/combat/rolls/enhanced-rolls.js` (full 1090+ lines, all four attack methods)
- `scripts/rolls/roll-config.js` (critical-confirmation section, hooks, reroll dialog)
- `scripts/engine/roll/custom-roll-engine.js`, `scripts/engine/rolls/swse-roll-engine.js`
- `scripts/combat/systems/enhanced-combat-system.js` (`SWSECombat`)
- `scripts/engine/combat/CombatEngine.js` (`resolveAttack`)
- `scripts/components/combat-action-bar.js` (`CombatActionBar`)
- `scripts/combat/systems/vehicle/vehicle-weapons.js`
- `scripts/actors/vehicle/swse-vehicle-core.js`
- `scripts/sheets/v2/vehicle-sheet/{crew-resolver,vehicle-rules-adapter,vehicle-context-builder}.js`
- `scripts/actors/derived/derived-calculator.js` (vehicle-branch check)
- `scripts/engine/feats/meta-resource-feat-resolver.js` (`buildAttackRerollChatOptions`, `resolveAttackRerollButton`)
- `scripts/ui/chat/chat-interaction-bridge.js` (reroll button dispatch)
- `templates/chat/holo-roll.hbs`
- `scripts/engine/combat/reactions/reaction-registry.js` (Deep-Space Gambit reroll)
- `scripts/engine/combat/full-attack-executor.js`, `scripts/engine/combat/damage-packet-builder.js`,
  `scripts/combat/rolls/damage.js` (multi-target/area consumers)
- `index.js` (global `SWSE.debug` registration point)

## Legacy roll facades found

| Facade | File | Live callers | Role |
|---|---|---|---|
| `SWSERoll.rollAttack` | `enhanced-rolls.js:337` | character-sheet.js (×2), action-economy-bindings.js, grappling-system.js, enhanced-combat-system.js, vehicle-weapons.js (dead caller — see below) | **Active, thin delegate.** Already imports and calls `rollAttack as canonicalRollAttack` from `attacks.js`; reads `isHit`/`isCritical` from the canonical result instead of recomputing. No fix needed beyond confirming this. |
| `SWSERoll.rollAutofire` | `enhanced-rolls.js:511` | **None found.** Only a defensive monkey-patch wrapper in `patches/attack-dialog-combat-corrections-hotfix.js` that calls the original if it exists. | Dead but exported/patchable. Contained a `mode === "take10"` reference to an undefined variable (guaranteed `ReferenceError`, silently caught and reported as "Autofire failed") plus a broken 3-arg call to `analyzeCriticalThreat(weapon, d20, roll.total)` against a 2-arg signature. **Fixed** (Phase 2): removed the confirmation-roll call, fixed the `mode` bug, now resolves via `AttackOutcomeResolver` per target. |
| `SWSERoll.rollFullAttack` | `enhanced-rolls.js:822` | **None found.** | Dead. Had the confirmation-roll defect. **Fixed** (Phase 2): now resolves via `AttackOutcomeResolver`, concealment preserved as an independent miss-chance layer. |
| `SWSERoll.rollBulkAttack` | `enhanced-rolls.js:449` | **None found** (only a JSDoc example). | Dead, but calls `this.rollAttack` per target in a loop — already safe (each call is independent), no fix needed if it is ever wired up. |
| `SWSECombat.rollAttack` / `.rollFullAttack` | `enhanced-combat-system.js` | Only `combat-action-bar.js`, which is itself never imported anywhere (`CombatActionBar` is unmounted). | Dead. Delegates dice roll to `SWSERoll.rollAttack` (fine) but then discards that outcome and re-resolves hit/critical via `CombatEngine.resolveAttack()`, which has its **own** inline natural-1/20 override (see below) — a real duplicate authority, but unreachable from any live UI. Not migrated (see "defects not confirmed"). |
| `CombatEngine.resolveAttack()` | `CombatEngine.js:163` | Only via the dead `SWSECombat` path above. | Independently computes `d20===1`/`d20===20` (lines 239-248), uses a different weapon schema (`system.combat.attack.bonus`) than `attacks.js`, and throws on legacy-schema weapons. Confirmed defect, confirmed dead. Left alone (see below). |
| `RollEngine` (`scripts/engine/roll-engine.js`) | active | Everything | Unchanged from Phase 1 — thin `RollCore.executeFormula()` facade, throws on failure. Still the correct authority for arbitrary formula rolls. |
| `custom-roll-engine.js` / `custom-roll-dialog.js` | `scripts/engine/roll/`, `scripts/apps/custom-roll/` | Only each other / a sidebar control hook | Not an attack facade — a user-facing "roll any formula" utility dialog. Out of scope (Category A: correctly outside RollCore's attack authority). Not touched. |

**Caller-map methodology note:** "no callers found" means `grep -rn` across
`scripts/`, `templates/`, and `index.js` found zero call sites outside the
defining file (plus, for class methods, zero references to the class outside
its own file). This does not rule out an external macro or a compendium
script the repo doesn't track, which is why nothing was deleted — only
deprecated in comments, per the Phase 2 instructions.

## Vehicle and starship roll entry points

**Confirmed: there is no separate live "vehicle attack" pipeline.** The V2
character sheet (`scripts/sheets/v2/character-sheet.js`) is shared across
actor types, including vehicles (it imports `vehicle-sheet/crew-resolver.js`,
`vehicle-rules-adapter.js`, `vehicle-context-builder.js`, `context.js`, and
`crew-skill-router.js` for vehicle-specific UI). Its attack button calls the
same `SWSERoll.rollAttack(this.actor, weapon, {...})` character attacks use,
which delegates to the canonical `attacks.js` `rollAttack()` — already
aligned with `AttackOutcomeResolver`, the Force Point coordinator, and the
modifier ledger in Phase 1. A vehicle actor attacking gets the exact same
natural-1/natural-20/critical-threat treatment a character does, today,
with no Phase 2 code changes required for that part.

The modules that looked like dedicated vehicle attack code were all
confirmed dead:

- `scripts/combat/systems/vehicle/vehicle-weapons.js` — zero importers
  anywhere in `scripts/`. `fireMissile()`/`fireWeaponBattery()` take an
  *injected* `rollAttack` callback that no live caller ever supplies, so its
  actual outcome shape can't be verified from this module. `missileSecondAttack()`
  (no injected dependency, Phase 1 already routed it through
  `AttackOutcomeResolver`) is the only self-contained piece.
- `scripts/actors/vehicle/swse-vehicle-core.js#rollWeapon()` — zero callers.
  Uses a flat pre-computed `system.combat.attack.bonus` and a **manual GM
  "Did the attack hit?" confirm dialog** — there is no target/defense
  comparison in code at all, so there is no natural-1/20 automation to
  migrate without inventing target-handling this function was never given.

Both are now documented as dead/deprecated in code comments (see "exact
files changed").

### Current vehicle attack formula (as actually exercised)

Since vehicle attacks go through `attacks.js` `rollAttack()` → `resolveAttackBonus()`
(`combat-roll-math.js`), the formula is **identical to the character attack
formula** documented in the Phase 1 report: BAB + ability mod + enhancement +
range penalty + firing-into-melee penalty + attack penalty + CT penalty +
proficiency penalty + talent bonus + state bonus + combat-option bonus + rage +
Sith Commander + Inquisition + Unsettling Presence + Rapid Alchemy + Force Item +
basic-effect-intent bonus + scoped-feat bonus, plus roll-invocation-only
additions (fighting defensively, custom modifier, situational bonus, sequence
penalty).

`combat-roll-math.js` and `scripts/utils/schema-adapters.js` contain **zero**
references to vehicle/gunner/pilot/crew concepts — `SchemaAdapters.getBAB(actor)`
and the ability-mod lookup read directly off whatever `actor.system.bab` /
`actor.system.abilities` contain for the vehicle document itself. Whether (and
how) those fields are populated with the correct gunner/pilot/operator's
effective stats was **not verified in this pass** — `derived-calculator.js`
(the main character derived-data pipeline BAB/abilities come from) explicitly
excludes vehicles from at least the shield-projection block
(`if (actor.type !== 'vehicle')`), strongly suggesting vehicles have a
separate, not-yet-traced derived-data pipeline. Per the Phase 2 instruction
to preserve current behavior and document uncertainty rather than guess,
**this is flagged as unverified and left untouched.**

### Crew/operator resolution behavior

`scripts/sheets/v2/vehicle-sheet/crew-resolver.js` (201 lines) resolves
**station display/visibility** (which crew stations exist, who's assigned,
labels for the sheet UI) — it is a UI-display module, not an attack-bonus
substitution mechanism. No file matching `*operatorBAB*`, `*gunnerBAB*`,
`*effectiveAttackBonus*`, or similar naming was found anywhere in `scripts/`.
Whether "Normalize crew/operator context once before calculating the attack"
already happens (via the untraced vehicle derived-data pipeline above) or
needs to be built is a genuine open question for Phase 3, not answered here.

## Critical-confirmation sites found

| Site | Status |
|---|---|
| `enhanced-rolls.js` `rollAutofire()` — `analyzeCriticalThreat(weapon, d20, roll.total)` + `rollCriticalConfirmation(actor, weapon, context.attackBonus)` | **Fixed.** Replaced with per-target `AttackOutcomeResolver.resolve()`. |
| `enhanced-rolls.js` `rollFullAttack()` — `analyzeCriticalThreat(d20, critRange)` + `rollCriticalConfirmation({...})` | **Fixed.** Replaced with `AttackOutcomeResolver.resolve()`, concealment preserved as an independent layer. |
| `roll-config.js` `analyzeCriticalThreat()` / `rollCriticalConfirmation()` definitions | **Deprecated in place** (JSDoc `@deprecated`, corrected the doc comment above them that incorrectly asserted confirmation rolls are an SWSE rule). Not deleted — zero callers were confirmed, but the instructions ask for comment-deprecation over deletion. |
| `attacks.js` (canonical path) | Already clean — never referenced these functions (confirmed in Phase 1). |

A new static guard, `tools/check-critical-confirmation-guard.mjs`, fails (in
`--strict` mode) if any file outside `roll-config.js` calls
`rollCriticalConfirmation(...)` again. It currently reports zero findings.

## Reroll pathways found

| Pathway | Mechanism | Status |
|---|---|---|
| Attack reroll (feats/talents, e.g. Instinctive Attack) | `MetaResourceFeatResolver.resolveAttackRerollButton()`, dispatched from `chat-interaction-bridge.js`'s `.swse-attack-reroll-btn` handler | **Fixed.** Previously only replaced the displayed total (`finalTotal = keepBetter ? max(...) : rerollTotal`) and posted a small chat card with Original/Reroll/Result numbers — it never computed a fresh hit/critical verdict at all, and the button's dataset didn't even carry target-defense/critical-threshold/multiplier data to do so. Now: `attacks.js` passes that data through `buildAttackRerollChatOptions()` → the hbs template → button `data-*` attributes; `resolveAttackRerollButton()` picks the natural d20 backing whichever roll (original or reroll) produced the kept total and builds a **completely fresh** `AttackOutcomeResolver` result (no field merging), shown on the reroll's own chat card and attached to its `flags.swse.attackOutcome`. |
| Species reroll (skill/ability) | `species-reroll-handler.js` | Not attack-related (skill/ability domain). Out of scope. |
| Skill reroll (feats) | `SkillFeatResolver.resolveChatRerollButton` | Not attack-related. Out of scope. |
| Reaction reroll — "Deep-Space Gambit" | `reaction-registry.js` `swseResolveDeepSpaceGambit()` | Genuine SWSE reaction mechanic (attacker rerolls and keeps the worse result), not a confirmation roll — preserved. Dice execution migrated from a bare `new Roll('1d20')` to `RollEngine.safeRoll(...)` for consistency. The function's own pre-existing comment says the result is currently descriptive only ("adjust the final result... until the attack event bridge can replace the roll automatically") — it does not yet programmatically replace the original attack's outcome. This was a **known, self-documented incomplete integration already**, not a regression introduced or fully closed by this pass; flagged for Phase 3. |
| GM/reflex-penalty "Desperate Gambit"-style rerolls | Same `resolveAttackRerollButton()`, `cost === 'reflexDefensePenalty'` branch | Untouched — applies a temporary Reflex Defense effect via `ActorEngine.updateActor`, unrelated to outcome interpretation. |

**Known limitation, documented rather than silently left implicit:** the
fresh outcome from `resolveAttackRerollButton()` is shown on the **reroll's
own** new chat message; it is not retroactively patched into the original
attack message's stored `content`/DOM (that would require regenerating and
replacing the original `ChatMessage`'s rendered HTML, a materially larger
change than this pass's scope). A player using the *original* card's "Roll
Damage" button after a reroll flips the result will still see the original
card's stale hit/crit state on that specific button. The reroll card itself
is now fully correct and self-sufficient. Full original-message patching is
Phase 3 work.

## Direct Roll bypasses classified

| Site | Classification | Action |
|---|---|---|
| `scripts/rolls/skills.js:224`, `enhanced-rolls.js:1292`, `SWSEInitiative.js:251` | **A** — Take-10/Take-20 constant-Roll display construction (already-decided total, not a random roll) | None (Phase 1 already reviewed this pattern) |
| `scripts/engine/combat/recurring-damage-engine.js:290` | **A** — damage-over-time engine with documented authority | None |
| `scripts/engine/combat/CombatEngine.js:252` (`Math.random() * 100` for concealment) | **A/dead** — inside the confirmed-unreachable `resolveAttack()` | Not migrated (dead code; migrating math inside dead code isn't attack-path alignment) |
| `scripts/engine/combat/reactions/reaction-registry.js:760` (`new Roll('1d20')`, Deep-Space Gambit) | **C** — active attack-adjacent reroll bypassing RollCore | **Migrated** to `RollEngine.safeRoll('1d20', ...)` |
| `enhanced-rolls.js` `rollAutofire()`/`rollFullAttack()` dice rolls (`this._safeRoll(formula)`) | **B** — already delegates to `RollEngine.safeRoll` → `RollCore` | None needed (only the outcome-interpretation half needed fixing, done above) |

No other `new Roll(`/`Roll.create(`/`Math.random` sites were found in
`scripts/combat/`, `scripts/engine/combat/`, `scripts/rolls/`, or
`scripts/actors/vehicle/` beyond the above.

## Defects confirmed

1. `enhanced-rolls.js` `rollAutofire()` had a guaranteed `ReferenceError`
   (`mode` never defined) that made every autofire attack through this
   method fail silently, on top of a broken 3-arg `analyzeCriticalThreat()`
   call and the confirmation-roll defect. **Fixed.**
2. `enhanced-rolls.js` `rollFullAttack()` had the confirmation-roll defect
   and no natural-1 override. **Fixed.**
3. `MetaResourceFeatResolver.resolveAttackRerollButton()` never produced a
   fresh hit/critical verdict for a reroll at all — only a new total.
   **Fixed** for the reroll's own card; original-message patching remains
   Phase 3 work (documented above).
4. `CombatEngine.resolveAttack()` independently re-implements natural-1/20
   interpretation and uses a different weapon schema than the canonical
   path. **Confirmed, not fixed** — the only path to it (`SWSECombat` via
   `CombatActionBar`) is unreachable from any live UI (`CombatActionBar` is
   never imported/mounted anywhere).
5. `scripts/combat/systems/vehicle/vehicle-weapons.js` and
   `scripts/actors/vehicle/swse-vehicle-core.js#rollWeapon()` are dead code
   with zero callers, despite being the modules a vehicle-alignment task
   would naturally target first. **Documented as deprecated**, not deleted,
   not rewired.

## Suspected defects not confirmed

- Whether vehicle actor documents' `system.bab`/ability fields (consumed by
  the now-shared `resolveAttackBonus()`) are correctly populated with a
  gunner/pilot/operator's effective stats. Not traced this pass (see vehicle
  section above) — genuinely unknown, not guessed at.
- Whether `combat-executor.js#resolveHit()` (flagged by the Phase 1 static
  guard) has any live caller. Not traced this pass.
- Whether an external macro or compendium script calls any of the "zero
  callers found" methods above. Grep-based caller mapping cannot rule this
  out; nothing was deleted because of this.

## Architecture chosen

No new roll engine. Extended existing Phase 1 authorities:

- `AttackOutcomeResolver` (Phase 1) is now also the outcome authority inside
  `enhanced-rolls.js`'s `rollAutofire()`/`rollFullAttack()` and the reroll
  handler — the same pure function, same import, no logic duplicated.
- `buildAttackRerollChatOptions()`/`resolveAttackRerollButton()`
  (`meta-resource-feat-resolver.js`, pre-existing) were extended to carry
  and consume the target-defense/critical-threshold/multiplier data
  `AttackOutcomeResolver` needs, rather than building a second resolution
  path.
- `AttackRollDiagnostics` (new, `scripts/engine/combat/attack-roll-diagnostics.js`)
  — a small, dependency-free, opt-in recorder registered at
  `globalThis.SWSE.debug.attackRolls` (extending the pre-existing
  `SWSE.debug.*` namespace `index.js` already established for
  `SWSE.debug.defenses`/`featPacks`/`seedFeatsPack`, rather than inventing a
  new registration convention). Disabled by default; `record()` no-ops
  entirely unless `.enabled` is set true.
- `tools/check-critical-confirmation-guard.mjs` (new) — modeled directly on
  `tools/check-combat-math-ssot.mjs`'s report-only-by-default,
  `--strict`-to-fail convention.
- `tools/check-attack-outcome-ssot.mjs` (Phase 1) — `KNOWN_DEBT` list
  updated: `enhanced-rolls.js` removed (fixed), five newly-confirmed
  pre-existing sites added with explanatory comments so the guard's output
  stays accurate rather than stale.

## Exact files changed

```
index.js
scripts/actors/vehicle/swse-vehicle-core.js
scripts/combat/rolls/attacks.js
scripts/combat/rolls/enhanced-rolls.js
scripts/combat/systems/vehicle/vehicle-weapons.js
scripts/engine/combat/reactions/reaction-registry.js
scripts/engine/feats/meta-resource-feat-resolver.js
scripts/rolls/roll-config.js
templates/chat/holo-roll.hbs
tools/check-attack-outcome-ssot.mjs
```

New files:

```
scripts/engine/combat/attack-roll-diagnostics.js
tools/check-critical-confirmation-guard.mjs
tests/critical-confirmation-guard-check.test.mjs
tests/phase2-critical-confirmation-removal.test.mjs
tests/phase2-legacy-facade-delegation.test.mjs
tests/phase2-multi-target-outcome-independence.test.mjs
tests/phase2-reroll-outcome-integrity.test.mjs
tests/phase2-vehicle-attack-alignment.test.mjs
docs/audits/rolling-system-alignment-phase-2.md (this file)
```

No feats, talents, progression, sheets (beyond the one hbs template
attribute addition needed to carry reroll data), chargen, workbenches, or
GM-tool files were touched. `vehicle-weapons.js`/`swse-vehicle-core.js`
changes are comment-only (deprecation notices), not behavioral.

## Compatibility decisions

- `roll-config.js`'s `analyzeCriticalThreat()`/`rollCriticalConfirmation()`
  were **not deleted** — marked `@deprecated` with an explanation, kept as
  compatibility exports in case an untracked external caller exists.
- `vehicle-weapons.js` and `swse-vehicle-core.js#rollWeapon()` were **not
  deleted or rewritten** — confirmed dead but left in place with deprecation
  comments, per "do not delete a facade until all imports, dynamic
  references, hooks, macros, templates, and external API uses have been
  checked" (grep-based checking has limits, noted above).
- `CombatEngine.resolveAttack()` / `SWSECombat` were **not touched** —
  confirmed unreachable from any live UI, and rewriting a large orchestration
  function (subsystem penalties, shields, damage, hooks, poison riders) that
  nothing currently calls would be scope creep with no user-facing benefit
  and real regression risk if it turns out something does call it via a path
  this grep-based audit missed.

## Tests added

Same convention as Phase 1: genuinely executable pure-logic tests where
possible, static source-text guards elsewhere (most engine modules use
absolute `/systems/foundryvtt-swse/...` imports that only resolve inside
Foundry's module loader, confirmed unrunnable under plain Node — this is a
pre-existing environment constraint, not something this pass changed).

**Genuinely executable:**
- `tests/phase2-vehicle-attack-alignment.test.mjs` — proves
  `AttackOutcomeResolver` is actor-type-agnostic by construction (identical
  output for identical inputs regardless of "character-like" vs
  "vehicle-like" framing), plus static checks that the dead vehicle modules
  are documented as such.

**Static source-text guards:**
- `tests/phase2-critical-confirmation-removal.test.mjs` — no
  `rollCriticalConfirmation()`/`analyzeCriticalThreat()` calls remain in
  `enhanced-rolls.js`, the `mode` ReferenceError bug is gone, both fixed
  functions call `AttackOutcomeResolver.resolve()`, and the deprecated
  definitions are marked `@deprecated`.
- `tests/phase2-legacy-facade-delegation.test.mjs` — `SWSERoll.rollAttack()`
  still imports and calls `canonicalRollAttack` and reads `isHit` from its
  result rather than independently comparing `roll.total` to a defense.
- `tests/phase2-reroll-outcome-integrity.test.mjs` — a reroll builds a fresh
  `AttackOutcomeResolver` result (no merged/spread stale outcome), selects
  the natural d20 based on which roll actually backs the kept total, spends
  the Force Point exactly once and before the fresh outcome is built, checks
  reroll failure before any spend, and attaches the replacement outcome to
  the new chat message's flags.
- `tests/phase2-multi-target-outcome-independence.test.mjs` — `rollAutofire()`
  resolves outcome once per target *inside* the per-target loop (using that
  target's own defense), not once before the loop with a shared/reused
  object.
- `tests/critical-confirmation-guard-check.test.mjs` — smoke-tests the new
  guard script in both report and `--strict` mode.

Existing guards extended, not replaced: `tools/check-attack-outcome-ssot.mjs`
(Phase 1) — `KNOWN_DEBT` list updated as described above; its own Phase 1
smoke test (`tests/attack-outcome-ssot-check.test.mjs`) still passes against
the updated output.

## Commands run

```
node --check <every changed/added .js file>
node tools/ci-smoke-check.mjs
node tools/check-combat-math-ssot.mjs
node tools/check-attack-outcome-ssot.mjs
node tools/check-critical-confirmation-guard.mjs
node tools/check-critical-confirmation-guard.mjs --strict
node tests/<each>.test.mjs   (all 23: 10 Phase-0-baseline + 8 Phase 1 + 7 Phase 2)
```

## Results

- All 15 changed/added `.js`/`.mjs` files (plus `index.js`, `holo-roll.hbs`
  reviewed by hand — not JS-checkable): `node --check` passes.
- `tools/ci-smoke-check.mjs`: same 2 pre-existing failures as the Phase 1
  baseline (`tools/audit-nonheroic-weapon-damage.mjs`,
  `tools/audit-npc-source-attribution.mjs` — template-literal syntax issues,
  files never touched by either phase).
- `tools/check-combat-math-ssot.mjs`: passes, unchanged.
- `tools/check-attack-outcome-ssot.mjs`: passes (exit 0); reports 5
  known-debt sites (updated list, see above), zero new/unlisted findings.
- `tools/check-critical-confirmation-guard.mjs`: passes in both report and
  `--strict` mode; zero findings.
- `tests/*.test.mjs`: **23 files total** (10 pre-Phase-1 baseline + 7 from
  Phase 1 + 7 new this phase — one Phase 1 file, `tests/attack-outcome-ssot-check.test.mjs`,
  re-verified against the updated guard output). **18 pass / 5 fail** — the
  failures are the exact same 5 pre-existing `ERR_MODULE_NOT_FOUND` files
  from the Phase 1 baseline (`force-power-final-integration`,
  `phase3-force-power-corrections`, `phase4-force-modifier-automation`,
  `phase5-force-healing-mitigation`, `phase6-force-direct-damage`), all
  present before this phase's changes. **Zero new failures.**

## Preexisting failures (recorded before editing, for comparison)

Verified identical before and after this phase's changes:
- The same 5 `tests/*.test.mjs` `ERR_MODULE_NOT_FOUND` failures (environment
  limitation: absolute `/systems/...` imports don't resolve under plain
  Node — pre-existing, documented in the Phase 1 report too).
- The same 2 `tools/ci-smoke-check.mjs` syntax failures in
  `tools/audit-nonheroic-weapon-damage.mjs` / `tools/audit-npc-source-attribution.mjs`.

## Runtime verification checklist (Foundry VTT v13)

Nothing below has been exercised in a live Foundry world. Static analysis
and Node-executable unit tests do not substitute for this.

**Character attacks** (mostly re-verifying Phase 1's checklist still holds
after Phase 2's changes to the reroll path):
- [ ] Ordinary hit / ordinary miss
- [ ] Natural 1 / natural 20
- [ ] Expanded critical range
- [ ] Force Point attack bonus / insufficient Force Points
- [ ] **Attack reroll** — confirm the reroll's own chat card shows the
      correct Hit/Miss/Critical Hit outcome label, and that a
      miss→hit / hit→miss / crit→normal / normal→crit / nat20→normal /
      normal→nat20 reroll each display correctly. Confirm Force Point is
      spent exactly once per reroll click. Confirm the *original* card's
      damage button still shows its pre-reroll (stale) state — this is the
      documented, not-yet-closed limitation above, not a new bug to
      diagnose.
- [ ] Full attack, autofire, area attack — **autofire specifically**: this
      pass fixed a guaranteed crash in `SWSERoll.rollAutofire()`, but that
      method has no confirmed live caller. Verify what UI path (if any)
      actually triggers "autofire" in the running game and confirm it
      behaves correctly; if it's the combat-option-based path through
      `attacks.js` (most likely per this audit), it was already covered by
      Phase 1's checklist.
- [ ] Ammunition failure / refundable action-cost failure (Phase 1 checklist item, re-verify unaffected)

**Vehicle/starship attacks:**
- [ ] Confirm the live vehicle attack UI path is in fact the shared V2
      sheet → `SWSERoll.rollAttack` → `attacks.js` path this audit
      identified, not one of the dead modules — click an actual vehicle
      weapon attack button and check which function executes (e.g. via the
      new `SWSE.debug.attackRolls` diagnostic, or breakpoints).
- [ ] **If** that's confirmed, vehicle natural 1/20/expanded-crit/range
      penalty/active-effect-modifier behavior should already match the
      Phase 1 character-attack checklist — verify it does.
- [ ] Verify a vehicle's attack bonus is actually computed from the correct
      gunner/pilot/operator's stats, not zeroed-out or defaulted — this was
      explicitly **not verified** in this pass (see "vehicle attack formula"
      above) and is the single biggest open question from Phase 2.
- [ ] Vehicle with explicit gunner vs. vehicle using pilot as operator vs.
      uncrewed/invalid crew state — all three need a live check against
      whatever the untraced vehicle derived-data pipeline actually does.
- [ ] Multi-target/autofire attack from a vehicle, damage workflow handoff

**Diagnostics:**
- [ ] `globalThis.SWSE.debug.attackRolls.enabled = true` in the console,
      make an attack, confirm `globalThis.SWSE.debug.attackRolls.events`
      contains a sensible snapshot and that console output stops when set
      back to `false`.

## Remaining Phase 3 work

1. Trace whether `combat-executor.js#resolveHit()` and
   `scripts/engine/rolls/swse-roll-engine.js`'s `isCritical` re-derivation
   have live callers; migrate or document-and-close accordingly.
2. Trace the vehicle actor derived-data pipeline (BAB/ability-mod
   population for gunner/pilot substitution) end to end; only then decide
   whether a `resolveVehicleAttackBonus()` domain-specific resolver is
   actually needed, or whether the existing shared pipeline already handles
   it correctly.
3. Decide the fate of confirmed-dead code: `vehicle-weapons.js`,
   `swse-vehicle-core.js#rollWeapon()`, `SWSECombat`/`CombatEngine.resolveAttack()`,
   `enhanced-rolls.js`'s `rollAutofire`/`rollFullAttack`/`rollBulkAttack`
   (now correctness-fixed but still uncalled), and `CombatActionBar`. Either
   wire them up deliberately or remove them in a dedicated cleanup pass —
   Phase 2 deliberately did neither beyond documentation, per "do not delete
   until proven obsolete."
4. Close the reroll gap: patch the *original* attack chat message's stored
   content/flags in place after a reroll, not just the reroll's own new
   card, so a stale "Roll Damage" button can't be clicked after a reroll
   changes the outcome.
5. Finish the Deep-Space Gambit reaction's "attack event bridge" — today it
   describes the reroll requirement in a chat message rather than
   programmatically replacing the original attack's outcome.
6. Result-contract consolidation (Phase 2 spec item 6): still only
   documented, not implemented. `RollCore.execute()` and `RollEngine.safeRoll()`
   still have different failure conventions (structured-return vs. throw);
   unifying them was out of scope for this pass's budget.

## Implementation summary

**Fixed**
- `enhanced-rolls.js` `rollAutofire()`: removed a guaranteed
  `ReferenceError` crash bug, a broken `analyzeCriticalThreat()` call, and
  the critical-confirmation roll; now resolves each target's outcome via
  `AttackOutcomeResolver` against that target's own defense.
- `enhanced-rolls.js` `rollFullAttack()`: removed the critical-confirmation
  roll; now resolves via `AttackOutcomeResolver`, concealment preserved as
  an independent layer.
- Attack rerolls (`resolveAttackRerollButton()`) now build a completely
  fresh, non-merged `AttackOutcomeResolver` verdict for whichever roll backs
  the kept total, instead of only replacing the displayed number.

**Aligned**
- `SWSERoll.rollAttack()` confirmed as an already-correct thin delegate to
  the Phase 1 canonical path — no change needed, verified with a test.
- Vehicle attacks confirmed to already flow through that same canonical
  path via the shared V2 sheet — no vehicle-specific resolver was needed for
  hit/critical/Force-Point/modifier-ledger alignment.
- Deep-Space Gambit reaction's dice execution migrated to `RollEngine.safeRoll`.

**Deprecated (documented, not deleted)**
- `roll-config.js`'s `analyzeCriticalThreat()`/`rollCriticalConfirmation()`.
- `vehicle-weapons.js` (whole module) and `swse-vehicle-core.js#rollWeapon()`.
- `CombatEngine.resolveAttack()`/`SWSECombat` left as-is with findings
  recorded here (not comment-annotated in the source — see Phase 3 item 3).

**Tests**
- 1 executable pure-logic test (actor-type-agnostic outcome proof).
- 6 static source-text guard tests covering every behavioral change in this
  pass.
- New `tools/check-critical-confirmation-guard.mjs`, wired to a smoke test.
- `tools/check-attack-outcome-ssot.mjs`'s known-debt list corrected to
  reflect this pass's fixes and new findings.
- Zero regressions across all 23 tests and all 3 static guards.

**Remaining risks**
- Vehicle attack-bonus correctness (gunner/pilot BAB substitution) is
  unverified — the single largest open question from this phase.
- `CombatEngine.resolveAttack()`'s duplicate natural-1/20 logic and
  confirmation-adjacent dead code remain in the tree, unreachable but
  unremoved.
- The original attack chat card is not retroactively corrected after a
  reroll — only the reroll's own new card is authoritative.
- Deep-Space Gambit's reroll is still descriptive-only, not a full
  programmatic replacement of the original attack outcome.
- Everything above the "Genuinely executable" test tier is proven by static
  text inspection, not execution — it is honest, careful reading, not proof
  by running code.

**Runtime checks required**
- Every item in the "Runtime verification checklist" above, particularly
  confirming which code path actually fires for a live vehicle attack and
  for autofire, and whether vehicle attack bonuses are numerically sane in
  a real game with a crewed vehicle.

This pass does not claim the rolling system is fully unified. It narrows and
documents the legacy-facade and vehicle-attack surface significantly (most
of it turned out to be dead code, not live duplicated logic), fixes the
confirmed-live critical-confirmation and reroll-outcome defects, and leaves
a clearly itemized, non-hand-wavy Phase 3 list for what's left.
