# V2 Damage Modifier Authority Audit — Correction #1

Scope: closure pass only, authorized in response to the review of `f95fb5b`
(`docs/audits/v2-damage-modifier-authority-audit.md`). Six items were held
pending further tracing; all six are closed below. No implementation code
was changed in this pass — this remains investigation/design, per the
explicit standing instruction. Section numbers below reference the
original audit doc unless noted.

---

## 1. RIDER_EFFECT / FORCE_POINT_DIE_STEP (closes original §17 items 1, 6)

The `attack-option-adapter.js`/`attack-primitives.js`/`attack-option-contract.js`
system is **confirmed dead scaffolding**: `handleRiderEffect()` is an empty
stub, and the whole system reads `abilityMeta.primitives[]`, a pack field
with zero real records (already established in the Attack Bonus phase of
this project).

The real pack-data rule types are consumed by **zero code anywhere in the
repo** (repo-wide grep for the literal strings `RIDER_EFFECT` and
`FORCE_POINT_DIE_STEP` returns no consumers, only pack data and this audit's
own docs):

- **`RIDER_EFFECT`** — 6 named records in `feats.db` (Battering Attack,
  Acrobatic Strike, Pinpoint Accuracy, Collateral Damage, Follow Through,
  Bantha Rush; `feat-catalog.db` carries a 7th raw string occurrence,
  traced to a nested substring inside "Frightening Cleave" — its real rider
  mechanic is separately implemented under a differently-named
  `CLEAVE_RIDER_EFFECT` type in `core-combat-reaction-normalization-hooks.js`,
  not this one). These describe combat-maneuver side effects (prone, push,
  movement, secondary attack, competence bonus) — **not numeric damage
  contributions**. **Out of Damage SSOT scope.** They are a separate,
  worth-flagging "unimplemented feature" finding (no code applies any of
  these rider effects today), but not this audit's problem.
- **`FORCE_POINT_DIE_STEP`** — 4 records in `feats.db` (Sharp Senses,
  Master Tracker, Gungan Weapon Master, Nature Specialist). These describe
  Force-Point bonus-die **size** increases for skill checks (mostly) and
  one attack roll (Gungan Weapon Master) — **not weapon damage dice**.
  **Out of Damage SSOT scope entirely** (belongs to an unimplemented Force
  Point mechanic domain).

**Closed. No change to the Damage SSOT's contribution scope.**

---

## 2. ResolutionContext / `RULES.*` full inventory (closes original §17 item 2)

Closed inventory: exactly **4** `RULES.*` values are consumed anywhere
(`scripts/engine/execution/rules/rule-enum.js`, read by
`combat-utils.js`):

| `RULES.*` value | Consumer | Overlaps with `CombatOptionResolver`? |
|---|---|---|
| `EXTEND_CRITICAL_RANGE` | `combat-utils.js` (via cached `actor._ruleParams`) | **Yes — confirmed overlap.** `CombatOptionResolver` independently handles its own `EXTEND_CRITICAL_RANGE` rule type (feeding `criticalThreatNaturalMin`). Two independent live implementations of the same mechanic, both reachable. Already covered by the original audit's §8 duplicate-authority table (`getEffectiveCritRange()`); this closes the open question of whether `RULES.EXTEND_CRITICAL_RANGE` is a third path onto the *same* mechanic — it is. |
| `CRITICAL_DAMAGE_BONUS` | `combat-utils.js` | Already known (original audit §9/§12) |
| `MODIFY_CRITICAL_MULTIPLIER` | `combat-utils.js` | Already known (original audit's Blocker 2) |
| `CRITICAL_CONFIRM_BONUS` | `combat-utils.js` | Not a damage number (attack-confirmation-adjacent); out of Damage SSOT scope |

`ResolutionContext` sources these from a **cached** `actor._ruleParams`
snapshot populated during `prepareDerivedData` — not a live per-roll scan —
which is itself a distinct authority mechanism from `CombatOptionResolver`'s
live switch. This is the third confirmed independent critical-range/
critical-multiplier implementation lane (alongside `CombatOptionResolver`
and `getEffectiveCritRange()`/`getCriticalMultiplier()` in
`combat-utils.js`), not a fourth new one — the inventory is closed and
matches the original audit's existing duplicate-authority findings; no new
target strings were found.

**Bonus finding (not part of the original 6, surfaced while closing this
item):** `enhanced-rolls.js#SWSERoll.rollAutofire()` is a **fourth**,
largely separate attack+damage pipeline (Autofire/Burst Fire), using the
deprecated `computeAttackBonus()`, building its own `1d20+bonus` formula
independent of `attacks.js#rollAttack()`, with its own hardcoded,
Burst-Fire-only "virtualWeapon" extra-dice patch that bypasses
`CombatOptionResolver`'s `damageExtraWeaponDice` entirely. Repo-wide grep
for UI callers of `rollAutofire()` across `scripts/sheets/` and more
broadly found none — only unrelated dataset-flag reads. Very likely
dead/unreachable from the current certified attack dialog; Blocker 1 in
the original audit most likely still stands uncontradicted for the actual
live path. This pipeline, plus `enhanced-combat-system.js`
(`SWSECombat`)/`combat-action-browser.js`/`combat-action-bar.js`, uses
deprecated `computeAttackBonus()`/`getEffectiveCritRange()` and matches
this project's own standing "old combat action browser" retirement-
candidate classification (Category B — deprecated but still referenced).
Flagged for a future retirement pass; not touched here.

**Closed.**

---

## 3. ModifierEngine vocabulary / `attack_and_damage` (closes original §17 items 7, 8)

- **`VALID_TARGET_PATTERNS`** (`ModifierTypes.js`) — confirmed via
  `isValidTarget()` having **zero callers anywhere in the codebase**: this
  validation is never enforced. Purely descriptive/dead metadata. Real
  pack data uses damage-target strings (`damage`, `damage.weapon`,
  `damage.melee`, `damage.ranged`) matching only `CombatOptionResolver`'s
  own separate vocabulary, never `ModifierEngine`'s declared
  `global.damage`-only pattern.
- **`attack_and_damage`** — traced to a single record: "Weakening Strike"
  (`talent-enhancements.db`, `type: "combat-action"`, a distinct
  pack/item type from feat/talent), `effect: {type:"penalty",
  target:"attack_and_damage", value:-5}`. Confirmed plumbed only as
  pass-through UI data via `CombatActionsMapper` into
  `combat-action-browser.js`/sheet display — no consumer applies it as a
  real roll-time penalty. **Confirmed inert for actual damage
  composition.**

**Closed.** Recommendation carried into §7 below: `ModifierEngine`'s
declared vocabulary and `CombatOptionResolver`'s real vocabulary should be
reconciled (already noted in the original audit's §13 required-fix list;
unchanged by this closure).

---

## 4. Vehicle/starship damage domain boundary (closes original §17 item 4)

**Finding: vehicle damage is NOT a separate domain. It shares the exact
same live `attacks.js#rollAttack()` / `damage.js#rollDamage()` character
pipeline**, invoked with the resolved gunner Actor as `actor` and the
vehicle-weapon Item as `weapon`.

1. `scripts/combat/systems/vehicle/vehicle-weapons.js` (the
   `SWSEVehicleWeapons` class plus `fireMissile`/`missileSecondAttack`/
   `fireWeaponBattery`/etc.) is **confirmed dead/macro-only legacy code**.
   The module's own header comment (added by a prior Phase 2 alignment
   audit) states plainly: *"this entire module has no callers anywhere in
   the active codebase... Left in place as unused legacy/prototype code."*
   Its only reachability is `window.SWSEVehicleWeapons`, a macro-only
   global (`dynamic-runtime-entrypoints.md` confirms this is its sole
   registration) — Category E (macro-only/global legacy utility) in this
   project's own classification scheme. Not the live path.
2. The real live path is
   `scripts/sheets/v2/vehicle-sheet/crew-skill-router.js#rollVehicleCrewSkill()`.
   For `skillKey === 'attack'` it calls the **same** `attacks.js#rollAttack()`
   used by character attacks, for both a named gunner
   (`rollAttack(actor, weapon, {vehicleActor, operator, crewStation})`) and
   abstract crew (`rollAttack(vehicle, weapon, {abstractCrewQuality,
   crewStation})`). The code's own comment confirms this is deliberate:
   *"the same component-ledger/chat/reroll/damage-workflow machinery...
   instead of the standalone unflagged roll the non-attack skill checks
   below still use."*
3. `vehicle-attack-math.js` (`resolveVehicleAttackBonus`/
   `resolveAbstractCrewAttackBonus`) is **attack-side only** — full read
   confirms zero damage-related logic. It swaps the ability-modifier
   component (vehicle INT vs. gunner's own ability) for the attack roll
   only; damage composition is untouched by this module.
4. Since the attack chat card is produced through the same generic
   pipeline as character attacks, its "Damage" button invokes the exact
   same `damage.js#rollDamage()` already established as the audit's
   Blocker-1 live entry point — for a named gunner, `actor` = the gunner,
   `weapon` = the vehicle-weapon Item.

**New confirmed finding (more directly actionable than a boundary note):**
`resolveDamageBonus()`'s two dominant numeric components —
`getHalfLevelDamageBonus(actor, weapon, ...)` and
`getDamageAbilityContribution(actor, weapon)` (both in
`combat-stat-rules.js`) — have **zero vehicle-weapon-type gating**.
Neither checks `isVehicleWeapon(weapon)` or `weapon.type ===
'vehicle-weapon'` anywhere; `getHalfLevelDamageBonus` sources its level
purely from `getEffectiveHalfLevel(actor)` (the gunner's own heroic-level
split) and `getDamageAbilityContribution` computes a STR/DEX ability
contribution from weapon-authored heuristics built for personal weapons.
**A named gunner firing a vehicle-mounted weapon through the confirmed-live
`crew-skill-router.js` path today has their own personal ½ heroic level
(and, depending on the weapon's ranged/melee classification, ability
modifier) silently added onto the vehicle weapon's damage dice** — a
contribution SWSE vehicle/starship weapon damage does not call for (fixed
dice + vehicle-scale multiplier, not a personal-weapon-style
character-scaled formula). Flagged as a strong, code-confirmed finding;
not cross-checked against a page citation, so treated as "needs printed-
source confirmation before automated as a fix," per this project's rules-
uncertainty policy — but the code-level gap (no gate at all, on either
function) is not in question.

`isVehicleWeapon()` is already imported into `combat-roll-math.js` and used
exactly once (gating the Spacehound talent's crit bonus) — the codebase
already has the primitive needed to gate damage the same way; it is simply
never applied to the half-level/ability contributions.

Separately, `vehicle-weapon-damage-parser.js`'s own header comment
independently confirms: *"nothing in the runtime combat path consumes this
yet"* — the intended future vehicle-weapon damage-profile registry
(typed dice/multiplier/energy-type parsing, vehicle-scale x2/x5/x10
multipliers, ion/special qualifiers) is **not wired into `rollDamage()` at
all today**. Today's vehicle-weapon damage roll reads `weapon.system.damage`
the same generic way any weapon item's damage string is read; multiplier/
type interpretation exists only as descriptive parsing, not runtime logic.

**Consequence for the SSOT design:** the risk the review flagged
("the new canonical composition must not accidentally apply character
half-level/ability damage where it doesn't belong") is **not hypothetical
— it is a live, confirmed bug today**, independent of any future
migration. The `resolveDamageComposition()` split (§6 below) must
explicitly gate half-level and ability contributions behind a weapon-type
check using the existing `isVehicleWeapon()` primitive, so vehicle-weapon
damage composition excludes personal half-level/ability scaling **by
construction**, rather than inheriting it silently the way
`resolveDamageBonus()` does today. Vehicle-scale multiplier and ion/
special damage-type interpretation remain out of scope for the first SSOT
migration (per the review's own "we don't necessarily need to migrate
vehicle damage in the first implementation" allowance) — captured as a
required fix for whenever vehicle damage is folded in, not blocking the
character-weapon migration.

**Closed.**

---

## 5. Non-feat/talent damage metadata scan (closes original §17 item 5)

Repo-wide scan of all 68 pack files (`packs/*.db`) for (a) `abilityMeta.rules[]`
type strings matching `CombatOptionResolver`'s interpreted vocabulary and
(b) `abilityMeta.modifiers[]`/`effect.target` damage-target strings.

**Result: the declarative rule vocabulary exists in exactly three pack
files — `feats.db` (390 records), `feat-catalog.db` (413 records, a
superset/duplicate catalog of `feats.db`, consistent with prior findings
from the Attack Bonus phase), and `talents.db` (1024 records).** Zero hits
in `species.db`, `backgrounds.db`, `droids.db`, all 7 `equipment*.db`
files, all 5 `armor*.db` files, all 7 `weapons*.db` files, all 10
`vehicles*.db` files, `vehicle-weapons.db`, `npc.db`, `beasts.db`,
`classes.db`, `heroic.db`, `nonheroic.db`, `forcepowers.db`,
`forceregimens.db`, `forcesecrets.db`, `forcetechniques.db`, all 3
`lightsaber*.db` files, `special-abilities.db`, `poisons.db`,
`conditions.db`, or any other pack. **The feat/talent universe (as already
fully classified by the original audit + §1-3 above) is the complete
surface for this specific declarative vocabulary.** No hidden damage-
contribution rules exist in species/background/item/droid-part/vehicle
data.

**Newly discovered pack, fully traced: `combat-actions.db`** (49 records,
type `combat-action`) carries its own, separate declarative vocabulary
under `system.ruleData` (not `abilityMeta`), including field names that
coincidentally match `CombatOptionResolver`'s own vocabulary
(`ruleData.damageExtraWeaponDice: 2` on the "Burst Fire" catalog record,
`ruleData.damageFormula: "unarmedOrClaw"` on Grapple/Crush records).
**Confirmed inert for actual damage-roll composition**: `ruleData` is
consumed only by `combat-action-normalizer.js` (a generic pass-through
clone feeding the action-execution/workflow layer for actions like
grapple/reload/aim — not a damage-number consumer) and
`combat-actions-mapper.js` (feeds the legacy `combat-action-browser.js`
reference/tooltip UI — already a retirement candidate per §2 above). No
production code reads `ruleData.damageExtraWeaponDice` to add dice to an
actual damage roll. The real, live Burst-Fire-family extra-dice mechanic
is injected directly into `abilityMeta.rules[]` on the relevant FEAT items
by `weapon-autofire-feat-normalization-hooks.js` (confirmed: "Autofire
Assault" gets `damageExtraWeaponDice: 1` this way) — a fully independent
path from `combat-actions.db`'s descriptive catalog entry, which merely
displays a similar-looking number for reference/UI purposes. Same
"descriptive, not applied" pattern already established for
`talent-enhancements.db`'s `attack_and_damage` target in §3.
`ship-combat-actions.db`'s `damage_scaling` field has the same
zero-consumer, inert-descriptive-metadata pattern.

Other packs' "damage"-named fields (`species.db`, `droids.db`,
`equipment.db`, `vehicles.db`, `armor.db`, `vehicle-weapons.db`) are plain
stat fields — `damage` (a weapon's raw dice string), `damageReduction`/
`damageReductionSource`, `damageThreshold`, `damageType` — not
contribution-rule vocabulary, already covered by the original audit's
production-formula-entry-point section.

**Closed. No new numeric-authority scope for the Damage SSOT beyond
feats/talents, already fully enumerated in the original audit.**

---

## 6. Sneak Attack / Skirmisher authority (closes original §17 item 3)

- **Sneak Attack fallback is rules-correct as far as it goes.**
  `buildTalentDamageBonusFallback()` (`runtime-bugfix-hotfixes.js`) computes
  `countTalentsNamed(actor, 'Sneak Attack') × d6`, gated on
  `targetIsDeniedDexForDamage()`. The single `talents.db` record's RAW
  text: *"Any time your opponent is Flat-Footed or otherwise denied its
  Dexterity bonus to Reflex Defense, you deal an additional 1d6 points of
  damage..."* — the multiple-take-talent × d6 scaling and the flat-footed/
  denied-Dex gating both match. Correctly does **not** treat flanking
  alone as triggering Sneak Attack (SWSE flanking grants +2 to attack, not
  denied Dex, unlike the D&D assumption this project's standing rules
  explicitly warn against importing). **Known, minor, unfixed gap:** the
  RAW "within 6 squares... for a ranged weapon" range restriction is not
  checked anywhere in the fallback — flagged, not fixed (audit scope).
- **"Skirmisher" is a real talent, but it is an ATTACK BONUS talent, not a
  damage talent — it does not belong in the Damage SSOT at all.** Its
  `talents.db` record: *"If you move at least 2 squares before you attack
  and end your move in a different square from where you started, you
  gain a +1 bonus on attack rolls until the start of your next turn."*
  ("Improved Skirmisher" grants +1 to Defenses, also not damage.)
  `damage.js`'s own doc comment naming Skirmisher alongside Sneak Attack
  as a `TalentEffectEngine.calculateDamageBonus` example was simply
  mistaken — there is no missing Skirmisher damage logic to find, because
  Skirmisher does not produce damage. This fully closes the open question.
- `TalentEffectEngine.applyPostDamageEffects` is a **permanent no-op stub**
  (`{success:true, effects:[]}`) — the intended hook for post-hit rider
  effects, which would be the natural consumer for the `RIDER_EFFECT`
  feats already confirmed unconsumed in §1 (Battering Attack, Bantha Rush,
  etc.). This corroborates, rather than expands, that existing finding.

**Architecture recommendation (per the review's stated preference,
"ordinary Damage contribution producer... if the mechanic fits the
contribution model"):** convert Sneak Attack into an ordinary Damage
contribution producer function — same tier as Rage/Rapid Alchemy/
Effect-Intent/Combat-Option/Scoped-Feat, called directly from both damage-
bonus resolvers and the future `resolveDamageComposition()` (§6 below).
This removes the load-order-fragile monkey-patch indirection (a real
fragility: if `registerRuntimeBugfixHotfixes()` somehow runs late, the
first damage roll of a session would hit a missing method), and
automatically fixes the "not consumed by `attacks.js#rollDamage()` at all"
second omission the original audit already noted for Sneak Attack
specifically. `TalentEffectEngine.calculateDamageBonus`/
`applyPostDamageEffects` should be retired once this migration lands —
not performed in this pass.

**Closed.**

---

## 7. Refined SSOT API (revises original §13)

The original audit's recommendation to extend `resolveDamageBonus()`
directly (adding `dice`/`critical` sub-objects to its own return shape) is
**superseded** by this refinement, per the review's explicit direction:
keep `resolveDamageBonus()` as a narrow, additive-only numeric sub-
authority; split dice/critical composition and final-formula assembly
into two new, separate functions.

```
resolveDamageBonus(actor, weapon, context)
  → { total, components, flags }
  UNCHANGED CONTRACT. Stays exactly what it is today: the numeric-only
  bonus (½ level, ability, enhancement, rage, Rapid Alchemy, effect-intent,
  combat-option damage, scoped-feat damage, and — per §6 — Sneak Attack as
  an ordinary contribution). Every existing consumer's total/components/
  flags reads are untouched. Gains a vehicle-weapon gate (§4) on the
  half-level/ability sub-calls, closing the confirmed vehicle bug as a
  side effect of the migration (not before it).

resolveDamageComposition(actor, weapon, context)
  → {
      bonus: resolveDamageBonus(...)'s full return value (nested, not duplicated),
      dice: {
        base: '2d8',
        extraWeaponDice: 1,              // damageExtraWeaponDice, single field post §7-cleanup
        dieStepIncreases: 0,
        criticalDieStepIncreases: 1,     // gated on context.isCritical
        talentDice: ['1d6'],             // Sneak Attack etc., as a real contribution producer
        otherDiceTerms: ['1d8']          // Force Item / Inquisition
      },
      critical: {
        multiplier: 2,                   // ONE getCriticalMultiplier(), actor/rule-aware, called here only
        bonusFormula: ''
      },
      ledger: [ ... ]                    // named-provenance list, §8, dice-shaped entries kept dice-shaped
    }
  NEW. The single place that discovers every dice-shaped and critical-
  shaped contribution. Nothing below this function re-derives any of these
  values from scratch.

buildDamageFormula(composition)
  → string                               // '3d8 + 1d6 + 9'
  NEW. Pure formula-string assembly from resolveDamageComposition()'s
  output. `damage.js#rollDamage()` and `attacks.js#rollDamage()` both call
  this instead of each hand-rolling `formulaParts.push(...)` independently
  — this is the actual fix for Blocker 1, since there is no longer a
  second, incomplete builder for a field to be silently unread by.
```

This matches the reviewer's target architecture directly:
`damage.js#rollDamage()`/`attacks.js#rollDamage()` become orchestration
wrappers (fetch actor/weapon/context → call `resolveDamageComposition()` →
call `buildDamageFormula()` → roll it → apply crit multiplier/bonus →
render), not mathematicians.

**Required fixes carried forward from the original audit, unchanged:**
1. `getCriticalMultiplier()` must have exactly one implementation,
   actor/rule-aware, called from exactly one place inside
   `resolveDamageComposition()`.
2. `damageExtraWeaponDice`/`damageDiceStepBonus` dual-field population in
   `CombatOptionResolver` should collapse to one field name.
3. `ModifierEngine`'s declared damage-target vocabulary and
   `CombatOptionResolver`'s own vocabulary should be reconciled into one
   (§3 above), mirroring the Attack Bonus domain's round-3/round-4
   `global.attack`/`attack.bonus` unification.
4. `TalentEffectEngine.calculateDamageBonus`/`applyPostDamageEffects`
   monkey-patch retired once Sneak Attack becomes an ordinary contribution
   producer (§6).
5. **New (from §4):** `resolveDamageBonus()`'s half-level and ability
   sub-calls gain a vehicle-weapon gate via the existing `isVehicleWeapon()`
   primitive.

**Modules that would delegate to this SSOT**: unchanged from the original
audit's §13 list — `damage.js#rollDamage()`, `attacks.js#rollDamage()`
(collapsed or one becomes a thin wrapper of the other),
`attacks.js#rollAttackAndDamageWithNarration()` (revive or delete —
currently dead), `resolveStockDroidDamageContract()` (already a correctly
special-cased feeder).

**Action Authority boundary**: unchanged from the original audit — routes
to this SSOT's contribution-discovery stage eventually, never duplicates
it; remains unwired to production regardless.

---

## 8. Contribution-ledger note (revises original §14)

Unchanged in substance from the original audit's §14 — the existing
`breakdown`/`components` pattern already proven for Attack Bonus should be
reused, and dice-shaped contributions (Sneak Attack, Deadeye, etc.) must
stay dice-shaped in the ledger, never coerced into the flat integer total.
The refined API in §7 gives this ledger a concrete home:
`resolveDamageComposition()`'s `ledger` field, populated from `bonus.components`
(flat contributions) plus `dice.talentDice`/`dice.otherDiceTerms`
(dice-shaped contributions), each entry retaining its source
(weapon/feat/talent/effect) exactly as `CombatOptionResolver`'s existing
`breakdown` array already does for Attack Bonus.

---

## 9. Updated deferred list (revises original §17)

Closed by this correction pass: items 1, 2, 3, 4, 5, 6, 7, 8 (all six
HOLD items plus the two related open questions they subsumed).

**Still deferred, unchanged:**
- `CombatEngine.resolveAttack()`'s actual live callers/consumers
  (`combat-executor.js`, `swse-combat.js`, `enhanced-combat-system.js`) —
  confirmed not the ordinary character-sheet weapon-attack path; whether
  it is live for some other flow was not resolved.
- `scripts/engine/combat/damage-engine.js`/`threshold-engine.js` (the
  `ARCHITECTURE.md`-documented pipeline) vs.
  `scripts/combat/damage-system.js` (the actually-live target-application
  consumer) — explicitly out of primary scope (Damage Threshold /
  target-application boundary, not contribution authority).
- The pre-existing `scripts/dev/audit-phase10*-damage-*.mjs` developer
  scripts (10f/10g/10h/10m/10n) — not read in this pass; may contain
  directly relevant prior findings worth consulting before implementation
  begins.
- Vehicle-scale damage multiplier (x2/x5/x10) and ion/special damage-type
  interpretation for vehicle weapons — confirmed unwired at runtime (§4);
  intentionally out of scope for the first (character-weapon) SSOT
  migration.

---

## 10. Status

All six items the review held are closed with direct source evidence; no
new HOLD items were opened by this pass (the vehicle half-level/ability
leak and the `combat-actions.db` discovery were investigated to closure
within this same correction, not left open). Per the review's own
statement, this should now be sufficient to write the actual Damage SSOT
implementation command without another exploratory cycle.

**Implementation remains NOT authorized by this document.** This is a
closure/design correction only — no production code was changed, no
NPC-flat work was begun, no Damage Threshold refactor was begun, no
Action Authority production wiring was begun, and no new branch/PR was
created, per the same standing constraints as the original audit.
