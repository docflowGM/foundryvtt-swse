# Skill Roll Dialog Base-Total Authority — Call-Path Audit + Fix

Audit scope: every code path that can open a normal character/NPC skill roll
dialog (`showRollModifiersDialog({ rollType: 'skill' | 'force' | 'force-power', ... })`),
plus the two callers found to disagree with the canonical skill-total
resolver. Fixture data is drawn from a real alpha-session actor export
("Gar'ee") supplied with the bug report.

## Reported symptom

During live alpha testing, every skill roll dialog on one actor showed a
modifier equal to the *negative* of that skill's real total (e.g. Stealth
+24 displayed as -24). Manually entering an equal, opposite custom modifier
restored the correct roll. This affected every skill on the actor, not one
skill specifically, and could not be reproduced afterward under normal
testing.

## Root cause

Two independent callers of `showRollModifiersDialog()` did not obtain their
base total from the canonical resolver (`getSkillTotal()` in
`scripts/rolls/roll-config.js`), and `buildRollConfigModel()` unconditionally
trusted whatever `baseBonus` a caller supplied — including an explicit `0` —
over the canonical total.

1. **`scripts/rolls/skills.js#rollSkillWithConfig()`** called the dialog with:

   ```js
   baseBonus: actor.system.skills?.[skillKey]?.total || 0
   ```

   The V2 actor schema never stores a computed `.total` on
   `system.skills[key]` — only raw inputs (`trained`, `focused`, `miscMod`,
   `selectedAbility`, `classSkill`). Confirmed directly against Gar'ee's
   actor export: `system.skills.stealth` is
   `{trained:true, miscMod:5, focused:true, selectedAbility:'', classSkill:true}`,
   with no `.total` key at all. The expression was therefore `undefined || 0`
   for every skill, on every actor, unconditionally. It also never set
   `rollType`, so absent that fix it would have defaulted to `'attack'`.

2. **`scripts/combat/rolls/enhanced-rolls.js#SWSERoll.rollSkill()`** called
   the dialog with `rollType: 'skill'` but no `skillKey`. Inside
   `buildRollConfigModel()`, `getRollBaseTotal()` resolves a skill dialog's
   base via `getSkillTotal(model.actor, model.skillKey || 'useTheForce')` —
   with no `skillKey`, every skill dialog through this path silently
   resolved Use the Force's total instead of the requested skill's.

3. **`buildRollConfigModel()`** (pre-fix) computed:

   ```js
   const baseTotal = Number(options.baseBonus ?? getRollBaseTotal(...)) || 0;
   ```

   Because `??` only falls through on `null`/`undefined`, an explicit `0`
   from (1) was trusted as-is. The skill breakdown then computed
   `misc = baseTotal - abilityMod - halfLevel - trained - focus`, which
   manufactured a negative "Other Bonuses" row that exactly canceled the
   real total back to 0 — reproducing the reported "-24, restore with +24"
   fingerprint exactly.

`rollSkillWithConfig()` has no static import anywhere in the codebase, but
is exposed at runtime as `game.swse.rolls.skills.rollSkillWithConfig(actor,
skillKey)` by `scripts/core/rolls-init.js`, which exports the whole
`skills.js` module onto `game.swse.rolls.skills`. It is therefore reachable
from a macro or the console even though no sheet template calls it by name
— a plausible, concrete mechanism for why the bug appeared once during a
live alpha session (via that global entry point or an experimental
button/macro that has since been removed) and could not be reproduced
through the current sheet UI, which calls `rollSkillCheck`/`SWSERoll.rollSkill`
through different, mostly-correct paths.

## Call-path ledger

| Entry point | File | Supplies `actor` | Supplies `skillKey` | Supplies `rollType:'skill'` | Supplies `baseBonus` | Base authority (pre-fix) | Base authority (post-fix) |
|---|---|---|---|---|---|---|---|
| `rollSkillWithConfig()` | `scripts/rolls/skills.js` | yes | yes | **no** (defaulted to `'attack'`) | yes, stale `.total \|\| 0` | stale/broken | canonical (`getSkillTotal`) |
| `SWSERoll.rollSkill()` | `scripts/combat/rolls/enhanced-rolls.js` | yes | **no** | yes | no | wrong skill (useTheForce fallback) | canonical, correct skill |
| Character sheet skill button | `scripts/sheets/v2/character-like-sheet.js:3249` | yes | yes | yes | no | canonical | canonical (unchanged) |
| Character sheet skill-use button | `scripts/sheets/v2/character-like-sheet.js:6514` | yes | yes | yes | no | canonical | canonical (unchanged) |
| Combat-action skill use | `scripts/sheets/v2/character-like-sheet.js:6816` | yes | yes | yes (`skillKey==='useTheForce' ? 'force' : 'skill'`) | no | canonical | canonical (unchanged) |
| Combat-action skill use (2nd site) | `scripts/sheets/v2/character-like-sheet.js:7047` | yes | yes | yes | no | canonical | canonical (unchanged) |
| NPC sheet skill button | `scripts/sheets/v2/npc-actor-sheet.js:229` | yes | yes | yes | no | canonical | canonical (unchanged) |
| Acrobatic Recovery talent | `scripts/engine/talent/consular-talent-actions.js:726` | yes | yes (`'acrobatics'`) | yes | no | canonical | canonical (unchanged) |
| Force Haze / Dampen Presence talents | `scripts/engine/talent/sentinel-talent-actions.js` | yes | yes (`'useTheForce'`) | yes (`'force'`) | no | canonical | canonical (unchanged) |
| Other talent-action Force/skill uses | `scripts/engine/talent/{lightsaber,jedi-prestige}-talent-actions.js` | yes | yes | yes | no | canonical | canonical (unchanged) |

Every entry point that already supplied both `skillKey` and `rollType:
'skill'` was unaffected and required no change. Only the two rows marked
"stale/broken" / "wrong skill" needed a fix, and both are fixed by making
`skillKey`-driven resolution mandatory rather than by changing any of the
already-correct callers.

## Fix

1. `rollSkillWithConfig()` — removed the stale `baseBonus` read entirely,
   added `rollType: 'skill'` alongside the `skillKey` it already passed.
   Lets `buildRollConfigModel()` resolve the canonical total itself.
2. `SWSERoll.rollSkill()` — added the missing `skillKey` to its dialog call.
3. `buildRollConfigModel()` — for `rollType` of `'skill'`, `'force'`, or
   `'force-power'`, the canonical `getSkillTotal()` result is now
   authoritative. A caller-supplied `baseBonus` that disagrees with it is
   ignored (with a `SWSELogger.warn` diagnostic naming the actor, skill,
   provided value, and canonical value) unless the caller explicitly passes
   `allowBaseBonusOverride: true`. No current caller needs that escape
   hatch. `buildRollConfigModel()` and `getSkillTotal()` are now also
   exported, for direct testability.

## Gar'ee findings (raw export vs. live runtime)

The supplied actor export is Foundry **source** data only — it has no
`system.derived` key at all (derived data, including computed skill totals
and ability modifiers, is populated by `prepareDerivedData()` at runtime and
is never serialized into an export). Two consequences, both confirmed by
running the actual pre-fix and post-fix `roll-config.js` code against
fixtures built from Gar'ee's real exported fields:

- `system.skills.stealth.total` is confirmed absent — the legacy
  `rollSkillWithConfig()` expression evaluates to exactly `0` for Gar'ee, as
  hypothesized.
- Running the canonical resolver (`getSkillTotal`) against Gar'ee's **raw
  export with no derived layer added** does *not* reproduce the live +24
  Stealth total from the reporting player's screenshot — it resolves to
  19. This is because `getAbilityModifier()`'s candidate order checks
  `system.abilities.<key>.mod` (a separate, apparently-inert legacy stub
  block present on every actor in this schema, with `mod: 0` for every
  ability regardless of the real score) before falling back to
  reconstructing a modifier from the real `system.attributes.<key>.base`
  score. Gar'ee's real Dex is 20 (mod +5); with only raw-export data in
  hand, the resolver silently reads +0 from the stub instead, giving
  0(dex) + 4(half level) + 5(trained) + 5(focus) + 5(misc) = 19 instead of
  24.
  - This is a **separate, narrower latent issue** from the one this fix
    addresses, is not part of this change (see Non-goals below), and is not
    the live alpha bug's mechanism: `scripts/actors/derived/derived-calculator.js`
    documents `derived.attributes[abilityKey].mod` as the ability-modifier
    authority, and a live Foundry client always populates
    `system.derived.attributes` via `prepareDerivedData()` before a player
    can open any roll dialog. It only becomes visible when code runs
    against actor data that predates derivation — as in this export, or a
    stale snapshot/macro operating on `actor.toObject()` instead of the
    live actor. Flagged here as a prune/follow-up candidate, not fixed.
  - Once `system.derived.attributes` is present (the live-runtime shape),
    the same resolver reproduces the screenshot's +24 exactly: dex(+5) +
    half level(4) + trained(5) + focus(5) + miscMod(5) = 24.

## Fail-before / pass-after proof

Ran the actual pre-fix `buildRollConfigModel()` (extracted from git history,
only re-exported for import — no logic changed) against a Gar'ee-shaped
fixture with `derived.attributes` populated (the live-runtime shape):

```
PRE-FIX baseTotal: 0
PRE-FIX breakdown: [
  { label: 'DEX Modifier', value: 5 },
  { label: 'Half Level',   value: 4 },
  { label: 'Trained',      value: 5 },
  { label: 'Focus',        value: 5 },
  { label: 'Other Bonuses', value: -19 }
]
```

(Note: -19, not -24, because `baseTotal` was 0 and 0-5-4-5-5 = -19; the
reported symptom used +22/-22 as an illustrative round number — the exact
magnitude always equals the actor's real total, whatever it is.)

Same fixture against the post-fix code:

```
baseTotal: 24
breakdown: [
  { label: 'DEX Modifier', value: 5 },
  { label: 'Half Level',   value: 4 },
  { label: 'Trained',      value: 5 },
  { label: 'Focus',        value: 5 },
  { label: 'Other Bonuses', value: 5 }
]
[warn] [SWSE RollConfig] Ignoring non-authoritative skill baseBonus for Gar'ee: skill.stealth provided=0 canonical=24
```

`Other Bonuses: 5` here is Gar'ee's real `miscMod: 5` — a legitimate
component, not a fabricated reconciliation artifact.

## Tests

`tests/skill-roll-dialog-base-authority.test.mjs` (run via
`node tools/run-rolling-tests.mjs`, part of the full rolling-system suite —
196 passed / 0 failed after this change, 5 pre-existing unrelated
exclusions unchanged):

- Stale `baseBonus: 0` cannot override the canonical Stealth total.
- Omitted `baseBonus` resolves canonical.
- Five independently-configured skills each resolve their own total.
- `SWSERoll.rollSkill()` forwards `skillKey` (source-contract check).
- `rollSkillWithConfig()` no longer reads the stale raw `.total` and
  identifies itself as a skill roll (source-contract check + live
  `buildRollConfigModel()` check with its exact new options).
- A real mechanical penalty (-5 armor check penalty) still reduces the
  total normally — the fix rejects stale/disagreeing input only, never a
  real modifier.
- Four Gar'ee-specific fixture tests (A-D): canonical total, stale-zero
  resistance, five real Gar'ee skills resolving independently (plus a
  direct reproduction of the omitted-`skillKey` → Use the Force fallback),
  and no fabricated inverse breakdown row.
- Fail-before/pass-after proof using Gar'ee's exact raw-export shape and
  the live-runtime shape, both described above.

## Runtime/transient assessment

Plausible but not proven. `rollSkillWithConfig()` was unreachable from any
sheet template or talent action in the current source tree, but *is*
reachable via `game.swse.rolls.skills.rollSkillWithConfig(actor, skillKey)`
(exposed by `scripts/core/rolls-init.js`). This is consistent with the bug
having been triggered once, during a live session, through a macro,
console call, or an experimental button that has since been removed or
rerouted to the correct `rollSkillCheck`/`SWSERoll.rollSkill` path — rather
than through any currently-wired UI element, which is why it could not be
reproduced afterward through normal sheet interaction. This is not proven
from static analysis alone; no client-side caching/hot-reload evidence was
found or ruled out either way.

## Non-goals honored

No change to `RollCore`, `ModifierEngine`, skill math, Take 10/Take 20,
Force Points, Skill Focus, or any other roll type's base-total resolution
(`attack`/`damage`/`ability`/`initiative` all keep their prior
`options.baseBonus ?? getRollBaseTotal(...)` behavior — only
`skill`/`force`/`force-power` were hardened). The `system.abilities` legacy
stub / ability-modifier fallback-order issue documented above is flagged,
not fixed, in this pass.
