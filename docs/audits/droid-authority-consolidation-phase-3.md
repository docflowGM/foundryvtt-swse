# Droid Stabilization Phase 3 — Stock-Droid Statblock Authority

This follows `docs/audits/droid-authority-consolidation-phase-1.md` and
`-phase-2.md`. Both of those left "stock-droid statblock preservation"
explicitly deferred. `docs/audits/droid-static-audit.md`'s finding #5 was:

> Stock droids are very likely losing their published statistics after
> import... derived-data skipping currently applies only to statblock-mode
> NPCs, not droids. Every droid therefore proceeds through the normal V2
> derived path. DerivedCalculator then recalculates BAB from class levels
> and recalculates defenses from the actor's live progression and item
> state.

This phase traces that claim to the exact code, confirms and refines it,
and fixes it.

## Scope

**In scope:**

- Confirming, against the actual code (not assumed), whether and how a
  stock-imported droid's published totals get silently replaced.
- An explicit statblock-vs-playable mode distinction for droids, mirroring
  the existing NPC statblock-mode pattern.
- Wiring that distinction into the actor-preparation pipeline so a
  statblock-mode droid's displayed totals are the published ones, not
  classless-derived placeholders.
- An explicit, intentional, GM-invoked conversion action out of statblock
  mode.
- Tests for the new pure logic.

**Explicitly out of scope** (see "Deferred work"):

- Resurrecting the dead legacy Droid Builder's rich
  `CONVERT_FROM_STATBLOCK` conversion workflow (comparison, assumptions,
  per-system review).
- Wiring the "Convert to Playable" affordance into a rendered sheet tab (a
  pre-existing, separate defect was discovered: the template it would
  naturally live in is not currently included in the live sheet at all —
  see below).
- Combat-roll-time attack math reconciliation for published stock attacks
  (a different, narrower risk than the display-derivation bug this phase
  fixes — see "What was NOT actually at risk").
- Everything else already deferred by Phase 1/2.

## Investigation: what's actually at risk (confirmed, not assumed)

Traced the full call path from `SWSEV2BaseActor.prepareDerivedData()`
(`scripts/actors/v2/base-actor.js`) through to what a stock droid's sheet
displays:

1. `_performDerivedCalculation()` calls `shouldSkipDerivedData(this)` to
   decide whether to run `_computeDerivedAsync()`
   (`scripts/utils/hardening.js`). Before this phase, `shouldSkipDerivedData`
   returned `false` unconditionally for any non-NPC actor type — confirmed
   by reading `isStatblockNpc()`, which returns `false` immediately if
   `actor.type !== 'npc'`.
2. `_computeDerivedAsync()` calls `DerivedCalculator.computeAll(this)` and
   merges every returned `system.derived.<field>` path directly onto the
   live `system.derived` object — this is an in-memory mutation on every
   `prepareDerivedData()` pass, not a `system.bab`/`system.defenses` write
   to the document's stored source data. `DerivedCalculator` computes BAB
   and defenses from class levels/progression, which a stock-imported droid
   has none of (no classes, no progression) — so this pass would compute
   BAB 0 and base defenses.
3. Regardless of whether `_computeDerivedAsync` runs, `computeDroidDerived()`
   (`scripts/actors/v2/droid-actor.js`) unconditionally calls
   `computeCharacterDerived()` (`scripts/actors/v2/character-actor.js`),
   which seeds `system.derived.defenses.{fortitude,reflex,will,flatFooted}`
   with a hardcoded `{ base: 10, total: 10 }` placeholder *whenever that
   field isn't already an object* — which, for a droid whose async pass
   has been skipped, it isn't.
4. The V2 sheet contract is "UI reads derived data only" — the droid sheet
   reads `system.derived.*`, not `system.bab`/`system.defenses` directly.

**Conclusion, confirmed by reading the code rather than assumed:** the
underlying stored `system.bab` / `system.defenses.*.total` /
`system.damageThreshold` fields the stock importer writes are never
directly overwritten by anything (no writer sets them after import). The
bug is specifically that **the displayed mirror (`system.derived.*`) either
gets overwritten with classless-derived math (if the async pass runs) or
never gets populated with the published values at all (if it doesn't run,
since nothing else copies the published values in)**. Either way, the
sheet shows the wrong numbers. This is a real, live bug — from a player's
perspective it is indistinguishable from "the published statblock was
lost," which is exactly how the original static audit characterized it,
even though the persisted document data was intact the whole time.

### What was NOT actually at risk (a refinement of the original audit)

Checked each of HP, skills, and attacks individually, since the original
audit's finding named all of "BAB, defenses, HP, skills, attacks, Damage
Threshold" as at risk:

- **HP**: `mirrorHp()` in `character-actor.js` copies `system.hp.value/max/temp`
  into `system.derived.hp` unconditionally, every time, directly from the
  stored field. Never at risk.
- **Skills**: `mirrorSkills()` only trusts an *already-present*
  `system.derived.skills[key].total`; if none exists yet (true for a
  statblock droid once the async pass is skipped), it falls back to the
  stored skill's own total. Never at risk once the async overwrite is
  stopped — no separate fix needed.
- **Attacks**: `mirrorAttacks()` reads `attackTotal` from each weapon
  Item's own `system.attackBonus` — which the stock importer sets directly
  on the integrated weapon Items it creates — not from actor BAB. Never at
  risk for *display*. (A different, narrower question — whether the
  combat-roll pipeline recomputes an attack bonus from BAB/ability instead
  of trusting the stored `attackBonus` at roll time — is a separate risk
  this phase did not investigate; see "Deferred work".)

**What actually needed a fix: BAB, the three core defenses, and Damage
Threshold.** These are the only fields `computeCharacterDerived()` seeds
with a hardcoded, non-published placeholder rather than mirroring a stored
field.

## The statblock/playable mode distinction

New module `scripts/actors/droid/droid-mode-adapter.js`, mirroring the
existing `scripts/actors/npc/npc-mode-adapter.js` pattern:

- `isDroidStatblockMode(actor)` — true for a droid actor whose
  `flags.swse.stockDroidImport.importMode === 'statblock'` (the flag the
  stock importer already sets — confirmed by reading
  `scripts/engine/import/stock-droid-importer-engine.js`, which sets
  exactly this on every import; no importer change was needed).
- `isStockImportedDroid(actor)` — true regardless of current mode, for
  provenance display.
- `buildConvertDroidToPlayableModeUpdate(actor)` — pure mutation-plan
  builder that flips the mode flag to `'playable'` and stamps a
  `convertedAt` timestamp. Throws if called on an actor not currently in
  statblock mode (mirrors `setNpcModeUpdate`'s validation).
- `computeStatblockDerivedOverrides(system)` — pure extraction of the
  published BAB/defenses/Damage Threshold values from an actor's own
  stored fields, so the value-selection logic (as opposed to the
  `system.derived` mutation, which needs a live Foundry actor) is directly
  unit-testable.

`scripts/utils/hardening.js`'s `shouldSkipDerivedData()` now also returns
`true` for `isDroidStatblockMode(actor)`, stopping `_computeDerivedAsync`
from ever running for a statblock-mode droid — exactly the same mechanism
NPCs already use.

`scripts/actors/v2/droid-actor.js`'s `computeDroidDerived()` now calls
`applyPublishedStatblockDerivedOverrides()` for a statblock-mode droid
after `computeCharacterDerived()` runs, applying
`computeStatblockDerivedOverrides()`'s values onto
`system.derived.attacks.bab`, `system.derived.defenses.*`, and
`system.derived.damage.threshold`. This addresses point 3 above directly:
even with the async pass stopped, the sheet now shows the actual published
totals instead of `computeCharacterDerived()`'s hardcoded defaults.

No droid follower is ever mistaken for a statblock droid: follower
creation (`scripts/apps/follower-creator.js`, verified in Phase 2) never
sets `flags.swse.stockDroidImport` at all, so `isDroidStatblockMode`
correctly returns `false` for them without needing a follower-specific
exclusion (unlike the NPC adapter, which needs one because NPC followers
share the same flag namespace as ordinary statblock NPCs).

## Conversion workflow — what exists, and an honest limitation found

`buildConvertDroidToPlayableModeUpdate(actor)` is a complete, tested,
callable conversion action: applying its returned plan via
`ActorEngine.applyMutationPlan(actor, plan)` flips a stock droid out of
frozen statblock mode, after which `computeDroidDerived` resumes normal
derivation exactly as it would for any hand-built droid. This directly
satisfies "provide an intentional conversion workflow... prevent automatic
derived recalculation from silently changing published records" — the
recalculation is silent no longer (it's off by default for a statblock
droid) and the conversion is explicit (nothing flips the mode without this
function being called).

**What this is not**: the rich `CONVERT_FROM_STATBLOCK` workflow already
built into the dead legacy Droid Builder (`scripts/apps/droid-builder-app.js`)
— which would walk a GM through comparing individual systems, surfacing
assumptions and warnings, and reconciling published totals into
`installedSystems` — was not resurrected. That code is large, unverified,
and only reachable through `scripts/apps/stock-droid-conversion-dialog.js`,
which (confirmed in Phase 1 and re-confirmed here) nothing in the
repository imports. Reconnecting it is a materially bigger, riskier change
than this phase's scope justifies without live Foundry verification.

**A limitation discovered while wiring the context, not introduced by this
phase**: `templates/actors/droid/v2/partials/stock-droid-provenance-panel.hbs`
— the template that already displays `stockImport`/`stockConversion`
provenance data (built by `context-builder.js`, confirmed pre-existing) and
would be the natural home for a "Convert to Playable" button — is not
`{{> ...}}`-included anywhere in the live droid sheet's tab/frame templates.
This matches `docs/audits/droid-static-audit.md`'s finding #24 ("Live and
compatibility droid partials coexist"): the panel's context has been
computed for a while, but the panel itself is currently unreachable from
any rendered tab. This phase did not fix that (it's a separate, pre-existing
sheet-composition defect, not a Phase 3 authority problem), so today the
conversion action is reachable only via a GM console/macro call:

```js
const { buildConvertDroidToPlayableModeUpdate } = await import(
  '/systems/foundryvtt-swse/scripts/actors/droid/droid-mode-adapter.js'
);
const actor = game.actors.get('...');
await actor.update(buildConvertDroidToPlayableModeUpdate(actor).set);
```

`context-builder.js` now also computes `isStockStatblockMode` into the
droid sheet's specific-panels context (alongside the pre-existing
`stockImport`/`stockConversion`) so a future fix to the panel-inclusion
defect has the data it needs already available, at no cost today since the
panel isn't rendered either way.

## Confirmed fixes

- A stock-imported droid's displayed BAB, core defenses, and Damage
  Threshold no longer get replaced by classless-derived placeholder values
  on sheet render.
- The underlying mechanism (skip async derivation, then explicitly mirror
  published totals) is now symmetric with how NPC statblock mode already
  works, rather than droids being a special case with no protection at all.

## Deferred work

Unchanged from Phase 1/2, plus:

- Resurrecting/wiring the legacy Droid Builder's rich statblock-to-playable
  conversion workflow.
- Fixing `stock-droid-provenance-panel.hbs` not being included in the live
  sheet (a separate, pre-existing defect this phase discovered but did not
  fix).
- Combat-roll-time reconciliation of published stock attack bonuses against
  the canonical attack-math pipeline (the original static audit's finding
  #20 concern — a different question from the display-derivation bug fixed
  here).
- Reconciling `installedSystems`/`droidSystems` for a converted (now
  playable) stock droid so its published systems become Garage-editable
  components, rather than remaining a flat, non-componentized
  `droidSystems` blob.
- Live Foundry v13 runtime verification.

## Validation performed (this phase, Node-only)

- `node tools/run-rolling-syntax-check.mjs` — 2094 files, all pass
  (2 pre-existing, documented, unrelated exclusions).
- `node tools/run-rolling-tests.mjs` — 42/42 passed (5 pre-existing,
  documented, unrelated Force-power-track exclusions), including the new
  `droid-mode-adapter.test.mjs` alongside every Phase 1/2 droid test.
- `node tools/check-droid-authority-ssot.mjs --strict` and
  `node tools/check-droid-installation-write-authority.mjs --strict`
  (Phase 1/2 guards) — both still pass, unaffected.
- All 8 pre-existing combat/vehicle SSOT guards — still pass, unaffected.
- `bash tools/check-mutation-paths.sh` — still passes (this phase added no
  new direct `actor.update()`/`item.update()` call sites; the conversion
  action's plan is applied through `ActorEngine.applyMutationPlan`, same as
  every other droid mutation).

## Runtime test matrix

1. **Import a stock droid, open its sheet**: confirm BAB, Fortitude/Reflex/Will,
   flat-footed, and Damage Threshold match the published statblock, not
   `10`/`0` placeholders.
2. **Reopen the same droid's sheet in a later session** (fresh actor
   load): repeat scenario 1 — this specifically exercises the
   first-ever-`prepareDerivedData`-after-load path, not just the
   already-open-sheet path.
3. **Call `buildConvertDroidToPlayableModeUpdate`/apply it via console**:
   confirm the droid's `importMode` flips to `'playable'`, and that normal
   derivation (BAB/defenses computed from whatever class levels/items it
   has, likely 0/base for an unmodified conversion) resumes on next
   render — i.e. confirm the override stops applying once converted.
   Verify Second Wind/other statblock-adjacent systems don't error on a
   droid with no class levels post-conversion.
4. **A droid follower** (created via `follower-creator.js`): confirm it is
   never treated as statblock mode and derives normally, unaffected by this
   phase.
5. **Linked and unlinked token droids**: repeat scenario 1 on both.
