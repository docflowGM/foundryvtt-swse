# Skill Roll Dialog Base-Total Authority — Call-Path Audit + Fix

Audit scope: every code path that can open a normal character/NPC skill roll
dialog (`showRollModifiersDialog({ rollType: 'skill' | 'force' | 'force-power', ... })`),
plus the two callers found to disagree with the canonical skill-total
resolver. Fixture data is drawn from a real alpha-session actor export
("Gar'ee") supplied with the bug report.

This audit covers **two related but independent defects**, fixed by separate
commits so they stay distinguishable:

- **Defect A — skill-dialog base authority.** A legacy skill-roll caller
  expected `system.skills[key].total`, a field the V2 schema does not
  persist, producing `baseBonus: 0`. This is the alpha-reported bug itself.
- **Defect B — raw ability-modifier fallback authority.** Exposed while
  building the Gar'ee regression fixture for Defect A: on an actor with no
  `system.derived` (any raw actor export, or any code path operating on
  unprepared actor data), `getAbilityModifier()` accepted an inert legacy
  `system.abilities` stub before ever reconstructing a modifier from the
  canonical `system.attributes` score, masking a real Dex 20 (+5) as +0.
  They are related by the broader V2 authority migration — both are
  "a legacy V2-predecessor field outranking the canonical V2 field" — but
  they are different code paths with different fixes.

## Reported symptom

During live alpha testing, every skill roll dialog on one actor showed a
modifier equal to the *negative* of that skill's real total (e.g. Stealth
+24 displayed as -24). Manually entering an equal, opposite custom modifier
restored the correct roll. This affected every skill on the actor, not one
skill specifically, and could not be reproduced afterward under normal
testing.

## Root cause — Defect A (skill-dialog base authority)

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

## Fix — Defect A

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

## Root cause — Defect B (raw ability-modifier fallback authority)

Inspection of Gar'ee's raw export exposed a second authority defect in
`getAbilityModifier()`: when no derived layer was present, the resolver
accepted the inert legacy `system.abilities.<key>.mod` stub before
reconstructing the modifier from canonical V2 `system.attributes` source
data. This caused raw Gar'ee to resolve Dex as +0 instead of +5 and Stealth
as 19 instead of 24.

Audit performed before editing (per the authority audit requirement):

1. **What raw fields are the V2 source of truth for ability scores?**
   `system.attributes.<key> = {base, racial, enhancement, temp}` — confirmed
   directly against `template.json`'s `Actor` data model (line ~92) and
   against `scripts/actors/derived/derived-calculator.js`, which states in
   its own source comment: *"Canonical stored abilities path is
   system.attributes.<key>.{base, racial, temp, enhancement}. system.attributes
   is canonical; system.abilities is a read-only compatibility mirror."*
2. **What fields are the runtime derived authority for ability modifiers?**
   `system.derived.attributes.<key>.mod`, computed by `DerivedCalculator` as
   `Math.floor((base + racial + enhancement + temp - 10) / 2)` and written
   during `prepareDerivedData()`.
3. **Is `system.abilities` formally legacy/deprecated?** Yes — it is present
   in `template.json`'s data model (line ~48, defaulting to
   `{base:10, racial:0, temp:0, total:10, mod:0}` for every ability on every
   actor) and is explicitly documented by `derived-calculator.js` as a
   "read-only compatibility mirror," consulted only via a **whole-block**
   fallback (`actor.system.attributes || actor.system.abilities || {}`) —
   never per-key, and never once `system.attributes` exists at all.
4. **Is there already a shared helper?** `DerivedCalculator`'s own ability
   loop is the canonical formula, but it lives inside a full actor recompute
   (BAB, defenses, HP, and a `system.derived.*` write) — too heavy to import
   for a narrow, read-only lookup. `getAbilityModifier()` now reimplements
   the *identical* formula (`reconstructAbilityModifierFromScore()`) rather
   than inventing a competing one, so raw-export and live-runtime data always
   agree.

The resolver was hardened so derived V2 data remains first authority,
canonical raw V2 attributes provide the no-derived fallback (reconstructed
with the identical formula `DerivedCalculator` uses), and legacy
`system.abilities` is used only when the actor carries no `system.attributes`
block at all — mirroring `DerivedCalculator`'s own whole-block contract
rather than a new per-key rule. Every candidate is checked with
`Number.isFinite`, never truthiness, so a legitimate modifier of `0` is never
treated as absent.

With this fix, the raw export and live-runtime shape now agree exactly:
`getSkillTotal(gareeRawExport, 'stealth')` and
`getSkillTotal(gareeLiveActor, 'stealth')` both resolve to `24`.

## Fail-before / pass-after proof

### Defect A (skill-dialog base authority)

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

### Defect B (raw ability-modifier fallback authority)

Same Gar'ee Stealth fixture, but using the **exact raw-export shape** (no
synthetic `system.derived` added at all) against `getAbilityModifier()`
before and after its fix:

```
Gar'ee raw export, BEFORE the Defect B fix:
  getAbilityModifier(rawGaree, 'dex') = 0   (read from the inert system.abilities stub)
  getSkillTotal(rawGaree, 'stealth')  = 19  (0 dex + 4 half + 5 trained + 5 focus + 5 misc)

Gar'ee raw export, AFTER the Defect B fix:
  getAbilityModifier(rawGaree, 'dex') = 5   (reconstructed from system.attributes.dex.base = 20)
  getSkillTotal(rawGaree, 'stealth')  = 24  (5 dex + 4 half + 5 trained + 5 focus + 5 misc)

Gar'ee live-runtime shape (system.derived.attributes populated), unchanged by this fix:
  getAbilityModifier(liveGaree, 'dex') = 5
  getSkillTotal(liveGaree, 'stealth')  = 24
```

The raw-export and live-runtime numbers now agree exactly. The target
invariant holds: for ordinary actor data, removing the non-persisted
`system.derived` layer does not change the skill configurator's result.

## Tests

`tests/skill-roll-dialog-base-authority.test.mjs` and
`tests/ability-modifier-authority.test.mjs` (run via
`node tools/run-rolling-tests.mjs`, part of the full rolling-system suite):

Defect A (`skill-roll-dialog-base-authority.test.mjs`):

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
  the live-runtime shape — both now agree at `24` (see Defect B below).

Defect B (`ability-modifier-authority.test.mjs`):

- Test A: raw canonical `system.attributes` beats the legacy `system.abilities`
  stub (Dex 20 → +5, not the stub's 0).
- Test B: a legitimate zero modifier (Dex 10 → +0) is preserved, not treated
  as absent.
- Test C: a negative modifier (Dex 8 → -1) reconstructs correctly — proves
  the fix isn't "always prefer the larger/positive number".
- Test D: live `system.derived.attributes` data (+7) still wins over raw
  reconstruction (+5) when both are present.
- Test E: an actor with no `system.attributes` block at all still resolves
  from the legacy `system.abilities` mirror (+3), preserving old-actor-shape
  compatibility.
- Gar'ee multi-ability proof: all six of Gar'ee's real ability scores
  (STR 14→+2, DEX 20→+5, CON 14→+2, INT 12→+1, WIS 10→+0, CHA 8→-1),
  covering positive/zero/negative simultaneously, each verified through a
  representative untrained skill.

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
`skill`/`force`/`force-power` were hardened). No change to SWSE
ability-score formulas, normal derived-calculation semantics, `ModifierEngine`,
`RollCore`, actor persistence, ability advancement, chargen, species
modifiers, or temporary ability mechanics — `getAbilityModifier()`'s fix is a
resolution-authority/fallback-order correction that reuses
`DerivedCalculator`'s own existing formula and contract, not a new ability
system.

`getAbilityModifier()`'s legacy-fallback tier (used only when an actor has no
`system.attributes` block at all) follows Rule 4 of
`docs/systems/ABILITY_SCHEMA_AUTHORITY.md` ("`system.abilities` may be read
only as a compatibility fallback while older actors migrate") rather than
reintroducing `system.abilities` as a competing authority — it never runs
when `system.attributes` is present, however incomplete. A dead
`system.derived.abilities` read tier (not part of the documented contract,
and written nowhere in the codebase) was also removed from this function
during this fix, since it was unreachable dead code, not sanctioned
compatibility behavior.

## Deferred — repository-wide `system.abilities` residue (out of scope for this PR)

Investigating Defect B surfaced a larger, separate finding: `grep -rl
"system\.abilities" scripts/` matches **68 files**, and
`scripts/utils/schema-adapters.js` (lines 12-13) contains a doc comment that
directly contradicts `docs/systems/ABILITY_SCHEMA_AUTHORITY.md` — it
documents `system.abilities[ABILITY].base` as the "Ability Score
(Persistent)" path, "writable by progression/actor engine," where the
authority doc says the persistent path is `system.attributes` and
`system.abilities` is a legacy-only fallback. Both were verified directly
(not taken on report) before writing this section.

This is real, but it is **not part of this PR**. The 68 files include some
of the highest-blast-radius systems in the codebase —
`governance/actor-engine/actor-engine.js`, `governance/mutation/mutation-boundary-service.js`,
`apps/progression-framework/shell/progression-finalizer.js`,
`engine/chargen/CharacterGenerationEngine.js`, the suggestion engine, and the
droid normalizer among them — every one of which this repo's own test
harness (`tests/helpers/foundry-shim/`) cannot fully exercise under plain
Node; most require live Foundry runtime behavior to validate a change with
confidence. A full read/write classification and remediation pass across
that surface (which method in `SchemaAdapters` actually writes
`system.abilities` today and why, which of the 68 sites are migration-only
vs. active runtime reads vs. dead code, and what — if anything — must move
to a migration/adaptation boundary per the project's own "Compatibility
belongs at the edge" principle) is a staged, independently-reviewable
project in its own right, not a same-PR follow-on to a two-function skill-
roll bugfix.

**Recommended next step:** a dedicated task/PR scoped specifically to that
audit, starting from `scripts/utils/schema-adapters.js`'s actual
implementation (not just its doc comment) to determine whether
`system.abilities` is genuinely still written anywhere at runtime, before
any of the 68 sites are touched.
