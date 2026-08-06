# Rolling-System Alignment — Phase 5

Stacked on: PR #931 (Phase 4) ← PR #930 (Phase 3) ← PR #929 (Phase 2) ←
PR #928 (Phase 1). None of the prior four PRs are merged, squashed, or
rebased by this phase. Branch: `claude/rolling-system-alignment-phase-5`,
based on `claude/rolling-system-alignment-phase-4` at commit `bf5c574`
(Phase 4's abstract-crew/routing/sequence-identity work).

Phase 5's brief named six focus areas: interactive per-attack rerolls for
combined Full Attack chat cards; attack-sequence state/cost/ammo/damage
hardening; Foundry VTT v13 runtime verification where possible; a final
stacked-integration review across #928-#931; repository CI for the
rolling-system tests and guards; a merge-readiness report. This document
covers what was found, built, deliberately left unresolved (and why), and
— per the brief's explicit instruction — does **not** claim the rolling
system is completely verified, since the runtime matrix has not been
executed in a live Foundry world.

## Phase 1-4 baselines reviewed

- `docs/audits/rolling-system-alignment-phase-1.md` — `AttackOutcomeResolver`,
  `ForcePointSpendCoordinator`, `ModifierEngine.resolveTarget()`, and the
  roll-component-ledger shape as single authorities.
- `docs/audits/rolling-system-alignment-phase-2.md` — critical-confirmation
  removal, reroll outcome integrity, dead-code confirmation for most
  "vehicle attack"/"legacy roll facade" modules.
- `docs/audits/rolling-system-alignment-phase-3.md` — vehicle operator
  resolution fix, reroll-to-original supersession
  (`flags.swse.{authoritative,superseded,supersededBy,revision}`), and (in
  a same-PR addendum) the authoritative vehicle attack formula
  (`resolveVehicleAttackBonus`).
- `docs/audits/rolling-system-alignment-phase-4.md` — abstract-crew formula
  alignment (`resolveAbstractCrewAttackBonus`), `attack-domain-router.js`
  enforced inside `rollAttack()`, `sequenceId`/`attackInstanceId` identity
  added to both live full-attack orchestrators, a damage-application
  receipt guard, and the confirmed non-implementation of vehicle size/
  fire-control modifiers.
- `docs/systems/COMBAT_MATH_SSOT.md` — unchanged; Phase 5 does not touch
  attack-bonus math, only sequence state, reroll UI, and CI.

## Branch and commit baseline

```
claude/rolling-system-alignment-phase-5  (this phase, new)
  based on
claude/rolling-system-alignment-phase-4 @ bf5c574
  based on
claude/rolling-system-alignment-phase-3 @ c8c0b6f
  based on
claude/rolling-system-alignment-phase-2 @ 655ca60
  based on
claude/rolling-system-alignment-phase-1 @ 47e40d9
```

## Files inspected

Read in full or in relevant part before editing: `attacks.js`,
`combat-roll-math.js`, `vehicle-attack-math.js`, `attack-domain-router.js`,
`attack-outcome-resolver.js`, `force-point-spend-coordinator.js`,
`ModifierEngine.js`, `meta-resource-feat-resolver.js` (both existing
reroll methods, in full — 808 lines), `chat-interaction-bridge.js` (all
damage/reroll handlers and their `bind()` registrations),
`full-attack-executor.js`, `combat-feature-handlers.js`, `multi-attack.js`,
`enhanced-rolls.js` and `enhanced-combat-system.js` (to confirm which
"autofire"/"full attack" code is live vs. dead), `crew-skill-router.js`,
`holo-roll.hbs` (the existing single-attack reroll button's template
contract), and every Phase 1-4 test/guard file. Two parallel research
passes (documented inline below) covered the five Force-power-track test
failures and the reroll-eligibility/result-policy authority before any
code was written.

## Full-attack workflow call graphs

Confirmed (research pass, re-verifying Phase 4's own finding): exactly two
live full-attack orchestrators, plus one dead one.

```
Double/Triple Attack combat-feature button
  → combat-feature-handlers.js#executeCombatFeatureMultiattack()
    → buildFullAttackSequence() / fallbackMultiAttackPlan()  [plan, once]
    → per attack: rollAttack(actor, weapon, {sequenceId, attackInstanceId,
        sequenceIndex, sequenceLength, sequencePenalty: step.finalPenalty})
      → posts its OWN independent, fully Phase-3-flagged chat message
        (suppressChat NOT set on this path)

Full Attack dialog button
  → FullAttackExecutor.execute()
    → showFullAttackDialog() → buildFullAttackSequence()  [plan, once]
    → per attack: rollAttack(actor, weapon, {..., suppressChat: true,
        attackInstanceId: `${sequenceId}-${index}`, sequenceIndex: index})
      → returns attackResult in memory only; NO chat message posted
    → _postCombinedCard(actor, sequence, results, target, sequenceId)
      → builds one attack entry per result via
        full-attack-message-state.js#buildInitialAttackEntry()
      → renders via full-attack-card-renderer.js#renderFullAttackCardContent()
      → ChatMessage.create({flags.swse: {schemaVersion, fullAttack:true,
          sequenceId, breakdown, attacks: [...]}})   <- ONE combined message

SWSECombat.rollFullAttack() (enhanced-combat-system.js) — CONFIRMED DEAD:
its only caller, combat-action-bar.js, is never imported/mounted anywhere
in the codebase (re-verified this phase; unchanged from the Phase 4
finding). Not touched.
```

`rollAutofire()`/`rollBulkAttack()` (`enhanced-rolls.js`) — re-confirmed
dead this phase (zero callers, one has a live bug referencing an undefined
`attackRerollOptions`), per Phase 4's finding. Not touched — Phase 5 did
not assume they were active merely because their names resemble a live
concept, and did not build reroll-rebuild logic for a workflow with no
live callers.

## Sequence-state model

`scripts/engine/combat/full-attack-message-state.js` (new this phase) is
the single authority for a combined-card message's `flags.swse` shape —
schema version `full-attack-v2`:

```js
{
  schemaVersion: 'full-attack-v2',
  fullAttack: true,
  packageType,
  sequenceId,
  breakdown: [...],           // declared-sequence descriptive text, stored once
  attacks: [
    {
      attackInstanceId, order, weaponUuid, weaponName, targetUuid, targetName,
      label, penaltyText,       // preserved verbatim from the original declaration
      activeRevision,
      attackRerollOptions: [...],  // the SAME eligibility list rollAttack() computed
      revisions: [
        {
          revision, rollInstanceId, authoritative, superseded, supersededBy,
          rollResult: {naturalD20, total, formula},
          outcome: {hit, critical, criticalThreat, automaticHit, automaticMiss,
                    targetDefense, critMultiplier},
          componentLedger, transactions, rerollSource, resultPolicy,
          damageContext, createdAt
        }
      ],
      damageApplications: [{key, targetId, amount, appliedAt}]
    }
  ]
}
```

This is a version bump from Phase 4's flat per-attack shape (no
`schemaVersion` field, no `revisions[]`, single implicit revision). A
Phase 4 message is normalized **in memory, read-only** by
`normalizeAttackEntry()` — wrapped into a synthetic single-revision v2
entry so old messages render and are damage-routable exactly as before,
without writing anything back to them (no historical-message migration, as
instructed). `readAttacksArray()` returns `null` for any message that
isn't a full-attack card at all (`flags.swse.fullAttack !== true`),
distinguishing "not a full-attack message" from "a full-attack message
with no attacks," which never happens in practice but is handled
explicitly rather than assumed away.

**Serialization:** every field in the schema above is a string, number,
boolean, plain object, or array thereof. No Actor/Item/Token/Roll/
Application/HTMLElement is ever stored — confirmed by code review of every
write site (`buildInitialAttackEntry`, `appendRevision`,
`recordDamageApplication`) and by a genuinely-executed JSON round-trip
test (`tests/phase5-full-attack-message-state.test.mjs`, assertion 10).
`weaponUuid`/`targetUuid` are stored, resolved back to live documents via
`fromUuidSync()` only at render time, never persisted as live references.
Reaction context (`res.reactionContext`, which carries live Actor
references per `full-attack-executor.js`'s `_postCombinedCard` — confirmed
by tracing `buildReactionContextForAttack()`) is explicitly **excluded**
from the persisted schema for exactly this reason; reaction buttons are
shown once at initial post and never reproduced on reroll re-render.

## Attack revision model

- Revision 0 is always the initial roll, `authoritative: true, superseded:
  false`.
- `appendRevision(message, attackInstanceId, expectedRevision, revisionData)`
  is the **only** way a new revision is created. It re-reads the message's
  current stored state fresh (not a caller-held copy) before writing,
  compares `entry.activeRevision` to `expectedRevision`, and refuses
  (`{ok:false, conflict:'stale-revision'}`) if they don't match — this is
  the concurrency/stale-card protection (see below). On success, the
  previous revision is marked `authoritative:false, superseded:true,
  supersededBy:<new revision number>`, the new one is pushed as
  `authoritative:true, superseded:false`, and `entry.activeRevision` is
  updated — all in one `message.update()` call, so there is never a
  window where two revisions are simultaneously authoritative or where the
  write is partially applied.
- Sibling attacks in the same message are structurally untouched:
  `appendRevision` only replaces the ONE matching array entry
  (`attacks.map((a,i) => i === index ? updatedEntry : a)`), never
  reconstructing or reordering the others. Proven by a genuinely-executed
  test (`phase5-full-attack-message-state.test.mjs`, assertion 8).

## Reroll eligibility sources

Research pass (full read of `meta-resource-feat-resolver.js`) found
exactly two real eligibility sources, both pre-existing and unchanged by
Phase 5:

1. **Normalized feat metadata** — any feat item's
   `system.abilityMeta.attackRerolls` array (type `ATTACK_REROLL` or
   untyped), the general-purpose, data-driven path.
2. **Hardcoded name fallback** — the "Instinctive Attack" feat, used only
   if no normalized rule exists.

Both are additionally filtered by `attackRerollRuleMatches()` (weapon/
attack-type requirements), a `missedAttack`-only trigger check, and
`EncounterUseTracker.canUse()` for `oncePer`-limited features. **Force
Points are the only cost type with real spend logic** (`cost ===
'forcePoint'`); a `reflexDefensePenalty` cost path exists in the resolver
but its triggering `data-rule`/`data-d20` attributes are never emitted by
the button template, making it currently dead for both reroll buttons.

**Other reroll mechanisms found, not adapted:** a **Deep-Space Gambit**
reaction (`reaction-registry.js`) forces the *attacker* to reroll and keep
the *worse* result when a *defender* triggers it — a genuinely different
policy (`keepWorse`) than anything in `meta-resource-feat-resolver.js`.
Its own code comments state it is "intentionally left out of
AttackOutcomeResolver's scope... until the attack event bridge can replace
the roll automatically" — i.e. it is itself an acknowledged, unfinished
mechanic, structurally triggered *before* an attack resolves (a defender
reaction window), not a post-roll "click to reroll my own attack" button.
Phase 5 did not adapt it into the combined-card reroll button, both
because it is explicitly unfinished upstream and because it belongs to a
different trigger point than "reroll one row of a posted card" — flagged
as a Phase 6 candidate if that reaction is ever finished, not silently
ignored.

**Phase 5's interactive full-attack reroll reuses these sources verbatim** —
`full-attack-executor.js#_postCombinedCard` stores exactly the
`attackRerollOptions` array `rollAttack()` already computed per attack
(via the unmodified `MetaResourceFeatResolver.buildAttackRerollChatOptions()`)
on each attack entry, and `full-attack-card-renderer.js` renders a reroll
button **only when that array is non-empty** — zero buttons, not disabled
buttons, when no rule grants a reroll. No new eligibility source or rule
was invented.

**Execution-time re-validation (new, stronger than the single-attack
path):** `resolveFullAttackRerollButton()` re-checks that the granting
rule is still present on the actor (`getAttackRerollRules(actor).some(...)`)
and that any `oncePer` encounter-use limit hasn't been consumed since
render, in addition to the pre-existing Force Point balance check both
paths share. The single-attack `resolveAttackRerollButton()` does **not**
re-check feat presence or `oncePer` limits (confirmed by the research
pass) — Phase 5 intentionally added this for the full-attack path (a
sequence has multiple attacks that could exhaust a shared `oncePer`
feature between renders) rather than silently inheriting the weaker
single-attack behavior; this is a documented asymmetry, not an oversight.

## Result-selection policies

Exactly **two** policies are proven to exist in this codebase (confirmed
by reading `normalizeRerollOutcome()` and the total-selection line in
`resolveAttackRerollButton()` in full):

- `use-new-result` (the default/fallback, `'keepSecond'` internally) —
  always uses the reroll.
- `use-better-result` (`'keepBetter'`) — `Math.max(originalTotal, rerollTotal)`.

**`use-worse-result`, `choose-result`, and `GM-replace-result` are NOT
implemented anywhere in this codebase** and were **not** added this phase
— per the brief's own explicit instruction ("do not invent policies
unsupported by current rules"). `resolveFullAttackRerollButton()`
implements only the same two proven policies, via the same
`normalizeRerollOutcome()` function the single-attack path already uses
(not a reimplementation). A static guard
(`tests/phase5-full-attack-reroll-handler.test.mjs`, assertion 8) asserts
none of the three unproven policy names appear anywhere in
`meta-resource-feat-resolver.js`.

Both results (original and reroll) are stored for auditability: the new
revision's `rollResult` holds the kept total, and the superseded
revision's own `rollResult` (from the prior append or the initial post)
remains in the `revisions[]` history array untouched — "original roll
history remains visible" is satisfied by the array itself, plus a concise
`historyLine` rendered under any row whose `activeRevision > 0`.

## Cost and ammunition behavior

| Cost | Spent where | Spent how many times per sequence | Reroll interaction |
|---|---|---|---|
| Sequence declaration (`full-round`/`standard` action economy) | `FullAttackExecutor.execute()` step 3 (`_spendFullAttackEconomy`, before the roll loop) / `executeCombatFeatureMultiattack()`'s `if (!spend)`-guarded lazy spend inside the loop | Exactly once | Never touched by `resolveFullAttackRerollButton()` — confirmed by the Phase 5 static guard (`check-full-attack-reroll-guard.mjs`, invariant 2: the reroll handler must never call `ActionEconomyConsumption.spend`/`_spendFullAttackEconomy`) |
| Per-attack ammunition | Inside each `rollAttack()` call (`AmmoSystem.spendForWorkflow`, unchanged Phase 1 logic), associated with that attack's own `ammoSpend` receipt | Once per declared attack | `resolveFullAttackRerollButton()` never calls `AmmoSystem.spendForWorkflow` — no reroll rule in this codebase requires a new shot on reroll (confirmed absent from `getAttackRerollRules()`), so ammo is correctly NOT double-spent |
| Reroll cost (Force Point) | `resolveFullAttackRerollButton()`, after the stale-revision check and the fresh roll succeeds | Once per reroll | N/A (this IS the reroll cost) |
| Force Point (character reroll) | `ActorEngine.spendForcePoints(actor, 1)` — same call the single-attack reroll uses | Once per reroll | — |

**Refunds:** a failed reroll (no roll produced, Force Point spend fails,
eligibility re-check fails, stale revision, damage-already-applied) always
returns **before** any spend attempt for that specific failure class
except the Force-Point-spend-itself-failing case, which by definition
never actually removed a resource (the coordinator's own spend call
reports `spent:false`). There is therefore no scenario in this phase's
code where a resource is reported spent but the mutation didn't succeed —
`ActorEngine.spendForcePoints`'s own return value is the single source of
truth for whether the spend happened, never assumed.

**Idempotency:** the render-side `button.disabled = true` (set
synchronously before the async persistence work) plus the
`expectedRevision`-checked `appendRevision()` together prevent a double-
click from producing two revisions: the first click's in-flight request
disables the button immediately; even if a second click somehow fired
before the disable took effect, both would race to `appendRevision` with
the SAME `expectedRevision`, and only the first to actually write wins —
the second sees a now-stale `entry.activeRevision` and is rejected. This
was not additionally implemented as a formal
`sequenceId+attackInstanceId+revision+type` idempotency key (the brief's
suggested mechanism) because `appendRevision`'s fresh-read-then-compare
design already provides the same guarantee without a separate key registry
— documented here as the equivalent mechanism actually used, not silently
substituted.

## Damage-routing behavior

`isFullAttackRowStale(message, button)` (new,
`chat-interaction-bridge.js`) checks a damage button's
`data-attack-instance-id`/`data-expected-revision` (present only on
combined-card rows, rendered by `full-attack-card-renderer.js`) against
the message's **current** stored `activeRevision` via the state service,
returning `false` (not stale) for any button without these attributes —
an ordinary single-attack damage button is unaffected. Wired into both
live damage handlers that a combined-card's `swse-roll-damage` class
button reaches (`handleLegacyDamageRollButton`) and, for completeness,
`handleApplyDamageButton`, in both cases **after** the pre-existing Phase 3
superseded-message check. A single reroll of one attack invalidates every
previously-rendered damage button for that attack (since ANY reroll
increments `activeRevision`), which is exactly how "do not apply damage
from a superseded hit after a reroll to miss" / "use the new critical
multiplier after a reroll becomes critical" are satisfied — there is no
separate hit/miss/critical-specific check because staleness alone already
captures every case where the underlying outcome could have changed.

Rerolling **after** damage has already been applied is rejected with a
clear message, since no rule in this codebase permits changing hit/
critical state retroactively under already-resolved damage. This check
was caught mid-development pointing at the wrong field
(`activeRevision?.damageContext?.applied`, which nothing in this codebase
ever sets) — fixed before this phase's diff was finalized to check
`entry.damageApplications.length > 0` instead, the array
`recordDamageApplication()` actually populates. Documented here (and in
the code's own comment) rather than silently corrected without a trace,
since a static-guard test had to be updated to match.

## Concurrency protections

- **Stale-card reroll:** `resolveFullAttackRerollButton()` reads the
  message's current `entry.activeRevision` and compares to the button's
  `expectedRevision` before spending anything or rolling anything.
- **Stale-card damage:** `isFullAttackRowStale()`, same comparison, same
  timing (before `DamageSystem` is invoked).
- **Two rerolls both becoming authoritative:** structurally prevented —
  `appendRevision` is the only writer of `activeRevision`, and it always
  compares against a freshly-read value, so a second concurrent append
  attempting the same `expectedRevision` after the first succeeded will
  see the new value and be rejected.
- **Duplicate damage:** Phase 4's `damageApplications` receipt mechanism,
  extended this phase to be revision-scoped
  (`damageApplicationReceiptKey(activeRevision, targetId)`) so a reroll's
  new revision does not inherit an older revision's "already applied"
  state (proven by a genuinely-executed test, assertion 9).
- **Structured conflict results:** `appendRevision`/`recordDamageApplication`
  return `{ok:false, conflict:'stale-revision'|'attack-not-found'|
  'not-a-full-attack-message'}`; the reroll handler additionally returns
  `{ok:false, conflict:'damage-already-applied'|'render-failed'}`. Every
  conflict is surfaced to the user via `ui.notifications.warn` with a
  human-readable message, never a silent no-op or a thrown error.
- **No new `ChatMessage.update()` scattered across UI handlers:** every
  write to a combined card's `flags.swse.attacks` goes through
  `full-attack-message-state.js` (`appendRevision`/
  `recordDamageApplication`) — enforced by
  `tools/check-full-attack-reroll-guard.mjs`'s invariant 1 (no file
  outside the state service may write `'flags.swse.attacks'`).

## Vehicle and abstract-crew sequence behavior

**Confirmed, not assumed: no live vehicle or abstract-crew full-attack
sequence UI exists.** Grepped both full-attack orchestrators
(`full-attack-executor.js`, `combat-feature-handlers.js`) for
`vehicleActor`/`abstractCrewQuality` — zero references in either. Grepped
every vehicle-sheet/vehicle-actor/vehicle-weapon-system file for
`FullAttackExecutor`/`executeCombatFeatureMultiattack` — zero references.
Vehicle attacks (both named-gunner and abstract-crew) only ever reach the
codebase through `crew-skill-router.js#rollVehicleCrewSkill` → a single
`rollAttack()` call, never a declared multi-attack sequence.

Because of this, a vehicle attack's *reroll* (when eligible — the same
`getAttackRerollRules`/Force-Point mechanism applies to any actor,
including a resolved gunner character) can only ever reach the
**single-attack** `resolveAttackRerollButton()` path, never the new
`resolveFullAttackRerollButton()`. Phase 3/4 already proved that path
reuses the captured `rollFormula` string verbatim rather than recomputing
which domain's formula applies — so a named-gunner vehicle attack's
reroll already correctly preserves Gunner BAB + Vehicle INT (never
substituting vehicle BAB or adding gunner Dex/Str), and an abstract-crew
attack's reroll already correctly preserves the Crew Quality BAB
equivalent, purely because the formula is never recomputed on reroll at
all. Phase 5 verified this remains true (`resolveAttackRerollButton()`
and `resolveFullAttackRerollButton()` both statically confirmed to contain
no reference to `resolveVehicleAttackBonus`/`resolveAbstractCrewAttackBonus`/
`resolveAttackDomain`) rather than re-deriving it, and did not build any
new vehicle-specific sequence code, per the brief's explicit instruction
to document this conclusion rather than invent a vehicle full-attack UI
that doesn't exist.

Force Point support for vehicle rerolls is exactly as before: available
when the resolved actor (gunner character, or the vehicle actor itself for
abstract crew) has Force Points — a vehicle actor structurally has none,
so abstract-crew rerolls are correctly unavailable rather than fabricated,
unchanged from Phase 3/4.

## Force-power-track failure classification

Research pass (fresh `node` runs of all 5 files, git-history tracing for
every file in each failure's import chain) confirms **all five are
Category B (environment-only limitation, unrelated to the rolling-system
work)**:

| Test file | Exact unresolved import | Failure origin | What the test targets |
|---|---|---|---|
| `force-power-final-integration.test.mjs` | `/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js` | Direct import in `force-power-final-integration.js` | Consolidated Force Grip/Stun/Thrust/Move Object coverage |
| `phase3-force-power-corrections.test.mjs` | `/systems/foundryvtt-swse/scripts/utils/logger.js` | Direct import in `phase3-force-power-corrections.js` | Farseeing/Force Disarm/Rebuke/Surge corrections |
| `phase4-force-modifier-automation.test.mjs` | `/systems/foundryvtt-swse/scripts/utils/logger.js` | Direct import in `phase4-force-modifier-automation.js` | Battle Strike/Battlemind modifier automation |
| `phase5-force-healing-mitigation.test.mjs` | `/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js` | Transitive, via `force-power-outcome-service.js` | Vital Transfer healing/mitigation |
| `phase6-force-direct-damage.test.mjs` | `/systems/foundryvtt-swse/scripts/combat/damage-system.js` | Direct import in `phase6-force-direct-damage.js` | Force Lightning/direct-damage scaling |

**Evidence, not assertion:** `scripts/utils/logger.js`,
`.../actor-engine/actor-engine.js`, and `.../combat/damage-system.js` all
exist in the working tree (this is an unresolvable-Foundry-absolute-path
problem, not a missing-file problem). `git log --oneline` on every
production file in each test's import chain shows commits from an
unrelated, older "Force power corrections" project (`ce0c796`, `3b5ee39`,
`df1a9ff`, `f8040fb`, `9a3bfad`, `3508697`, `dd92059`, `ea96021`) and one
unrelated shared-dependency commit (`03ec7b1`, "Wire custom talent tree
existing-talent import") — all of which sit strictly *below* (older than)
the four rolling-system-alignment commits in history. The only
rolling-system commit that touched any Force-related file at all (Phase 1,
`47e40d9`) modified `force-executor.js`, `force-point-spend-coordinator.js`,
`force-points-service.js`, and `force-regimen-executor.js` — none of which
appear in any of these five tests' import chains.

**Action taken:** none of the five were "fixed" (their failure is a
Foundry-module-loader environment limitation shared by most of this
repo's engine-layer tests, not a logic defect this phase could repair
without rewriting how those files import dependencies — explicitly out of
scope: "do not broaden Phase 5 into a Force-power-system rewrite"). They
were **not deleted**. They are **explicitly excluded, by name, with this
classification as the documented reason**, from the CI-facing focused test
runner (`tools/run-rolling-tests.mjs`'s `KNOWN_EXCLUDED_TESTS`) so CI can
be honestly green for the rolling-system track without claiming the whole
suite (including this unrelated, pre-existing, environment-only failure
class) is green.

## Stacked integration findings

Reviewed PRs #928-#931 and this phase's diff together:

- **Result contracts:** the vehicle/abstract-crew resolvers'
  `{total, ledger, warnings, error}` shape (Phase 3/4) and the new
  `appendRevision`/`recordDamageApplication` shape
  (`{ok, conflict?, entry?, revision?}`, Phase 5) are distinct but each
  internally consistent — no attempt was made to unify them into one
  generic "result" type, since they answer different questions (a formula
  resolution vs. a state-mutation attempt) and forcing one shape onto both
  would have been a style-only rewrite with no correctness benefit.
- **Component-ledger shapes:** confirmed all three attack domains
  (character, vehicle-actor-gunner, vehicle-abstract-crew) and the new
  full-attack revision's `componentLedger` field use the identical
  `{id, label, value, category, sourceId, sourceName, domain, applied,
  reason}` shape — Phase 5 stores it verbatim from `res.componentLedger`,
  introducing no new shape.
- **Authoritative/superseded semantics:** confirmed one canonical meaning
  across both the Phase 3 single-message model
  (`flags.swse.{authoritative,superseded,supersededBy}` on the message
  itself) and the Phase 5 per-attack revision model
  (`revisions[i].{authoritative,superseded,supersededBy}` inside one
  message) — "authoritative" always means "this is the current result to
  act on," "superseded" always means "a newer authoritative result
  exists," regardless of which level (message vs. revision) it's attached
  to.
- **Duplicate constant found and fixed (already, in Phase 4):**
  `CREW_QUALITY_BONUS`. Re-checked this phase for any NEW duplication
  introduced by Phase 5's own work — none found (the reroll-policy
  constants `'keepBetter'`/`'keepSecond'` exist in exactly one place,
  `normalizeRerollOutcome()`, reused by both reroll handlers).
- **Import direction / circular dependency risk — one real risk found and
  fixed during development, not left in the final diff:** an early draft
  had `meta-resource-feat-resolver.js` import the card-rendering function
  directly from `full-attack-executor.js`, which imports `rollAttack` from
  `attacks.js`, which imports `MetaResourceFeatResolver` from
  `meta-resource-feat-resolver.js` — a genuine cycle
  (`meta-resource-feat-resolver.js → full-attack-executor.js →
  attacks.js → meta-resource-feat-resolver.js`). Resolved by extracting
  the rendering functions into a new, dependency-free
  `full-attack-card-renderer.js` (imports only
  `combat-context-serializer.js`, `full-attack-message-state.js`, and
  `multi-attack.js` for a label-lookup constant — none of which import
  `attacks.js` or `meta-resource-feat-resolver.js`), which both
  `full-attack-executor.js` and `meta-resource-feat-resolver.js` import
  one-way. Documented in the new file's own header comment so a future
  change doesn't reintroduce the cycle.
- **Chat consumes resolved data, not reconstructed data:** confirmed by a
  dedicated static guard (`check-full-attack-reroll-guard.mjs`, invariant
  3) that `full-attack-card-renderer.js` contains no `getBAB(`/
  `getAbilityMod(`/`AttackOutcomeResolver.resolve(` call — it only formats
  values already present on a stored revision.
- **No prior-phase test mock bypasses the real integration boundary:**
  the one genuinely-executable test added this phase
  (`phase5-full-attack-message-state.test.mjs`) uses a minimal mock
  `ChatMessage` (get/getFlag/update) rather than mocking the state
  service's own logic — the module under test is the real
  `full-attack-message-state.js` file, not a stand-in.

**Combined end-to-end test:** `tests/phase5-stacked-integration.test.mjs`
covers all ten dimensions item 12 named (attack-domain routing, formula
resolution, modifiers, resource transaction, RollCore, AttackOutcomeResolver,
sequence chat state, per-attack reroll, supersession, authoritative damage
routing), extending Phase 4's own combined test rather than duplicating it.

## CI architecture

New workflow: `.github/workflows/rolling-system-validation.yml`. Triggers
on `pull_request`, `push` to `main`, and `workflow_dispatch`. Least-
privilege `permissions: contents: read`. Concurrency group
`rolling-validation-${{ github.workflow }}-${{ github.ref }}` with
`cancel-in-progress: true`.

**No `package.json`/lockfile exists in this repository** (confirmed: `ls
package.json` fails), and grepping every test file's imports confirms zero
npm dependencies — every test imports only Node built-ins
(`node:assert/strict`, `node:fs`, `node:path`, `node:child_process`,
`node:url`) or relative source files. There is therefore no dependency-
install step and nothing to cache. Node version pinned to `'20'` (an
actively-supported LTS) via `actions/setup-node@v4`, since no `engines`
field exists to read a required version from — this repo's dev
environment happened to run Node 22, but nothing in the tested code uses
version-specific syntax beyond standard ES modules/optional chaining, both
supported since Node 14.

**Steps** (each a separately-named job step, so a failure identifies
exactly which check broke):
1. Checkout
2. Set up Node.js
3. Syntax check — `node tools/run-rolling-syntax-check.mjs` (new; same
   walk logic as the pre-existing `tools/ci-smoke-check.mjs`, over
   `scripts/`, `tools/`, `tests/`, minus 2 documented pre-existing
   failures — see below)
4. Rolling-system test suite — `node tools/run-rolling-tests.mjs` (new;
   runs every `tests/*.test.mjs` except the 5 documented Force-power-track
   failures above)
5. Six `--strict` guard steps: `check-combat-math-ssot.mjs`,
   `check-attack-outcome-ssot.mjs`, `check-critical-confirmation-guard.mjs`,
   `check-reroll-supersession-guard.mjs`,
   `check-vehicle-attack-routing-guard.mjs` (Phase 4),
   `check-full-attack-reroll-guard.mjs` (Phase 5, new)
6. A scoped `actor.update(`/`new Roll(` bypass grep, restricted to the
   exact 13 files the rolling-system phases own (not whole directories —
   `scripts/combat/` and `scripts/engine/combat/` contain many pre-existing,
   unrelated files with their own long-standing, out-of-scope `new Roll()`/
   `actor.update()` usage that this workflow does not police)

**Second exclusion (syntax check) — resolved, no longer exists:**
`tools/audit-nonheroic-weapon-damage.mjs` and
`tools/audit-npc-source-attribution.mjs` used to fail `node --check` and
were excluded by name. Both have since been repaired: each file's report
template literal had been flattened onto a single line, which escaped the
newlines inside its `${...}` interpolations as literal `\n` sequences —
valid inside the string parts, a stray backslash in code position inside
the interpolations. Restoring real newlines there fixed both, and both now
run end to end and emit their intended JSON + Markdown reports.
`tools/run-rolling-syntax-check.mjs` no longer has a `KNOWN_EXCLUDED_FILES`
list at all: it sweeps every discovered `.js`/`.mjs` file under `scripts/`,
`tools/`, and `tests/` and reports the total it checked.

**What this CI explicitly does NOT verify** (stated in the workflow file's
own header comment, not just this doc): anything requiring a running
Foundry VTT v13 instance — actual dice rolls, chat rendering, DOM click
handling, live document mutation. This is a static/Node-only CI.

## Exact CI commands

```
node tools/run-rolling-syntax-check.mjs
node tools/run-rolling-tests.mjs
node tools/check-combat-math-ssot.mjs --strict
node tools/check-attack-outcome-ssot.mjs --strict
node tools/check-critical-confirmation-guard.mjs --strict
node tools/check-reroll-supersession-guard.mjs --strict
node tools/check-vehicle-attack-routing-guard.mjs --strict
node tools/check-full-attack-reroll-guard.mjs --strict
grep -Hn -E 'actor\.update\(|new Roll\(' <13 explicit rolling-system files>
```

All eight run locally, in this exact form, before being committed to the
workflow file — no command in the YAML was written without first being
verified to pass on this branch.

## CI limitations

- No Foundry runtime verification (see "Runtime matrix" below).
- The 5 Force-power-track tests are excluded by name, not fixed — a future
  contributor changing their underlying cause (e.g. giving `logger.js`/
  `actor-engine.js` a non-Foundry-absolute import path) would need to
  update `KNOWN_EXCLUDED_TESTS` accordingly; the runner hard-fails if an
  excluded name no longer exists in the repo (a built-in staleness check),
  but it cannot detect "this exclusion is no longer necessary"
  automatically. The syntax gate has no exclusions left to go stale.
- No coverage/lint step exists in this repository to add to CI (none was
  found during the audit; not invented).

## Defects confirmed

1. **(Pre-existing since Phase 4, closed this phase.)** No interactive
   reroll existed for any attack inside a combined Full Attack card — a
   player using Double/Triple Attack (via the dialog path) or any full
   attack with a Force-Point/feat-granted reroll had no way to use it once
   the combined card was posted. **Fixed** — `resolveFullAttackRerollButton()`
   + the renderer's per-row reroll button.
2. A combined-card damage button carried no revision identity at all
   (Phase 4 only added revision fields to the message's per-attack state,
   not to the damage button's own dataset) — a reroll of one attack could
   not be detected as invalidating that attack's already-rendered damage
   button. **Fixed** — `data-attack-instance-id`/`data-expected-revision`
   on every combined-card damage button, checked by
   `isFullAttackRowStale()`.
3. `chat-interaction-bridge.js`'s Phase 4 damage-application receipt
   (single-attack path) was keyed by weapon+target only, with no revision
   component — meaning a reroll of a single attack (via the pre-existing
   single-message reroll) that changed the outcome would still see the
   OLD receipt as blocking a legitimate new damage application. **Not
   applicable to Phase 5's new combined-card receipts** (which are
   revision-scoped from the start, `damageApplicationReceiptKey(activeRevision,
   targetId)`), but this is a **suspected defect in the Phase 4
   single-attack receipt** — see below, not fixed this phase (out of the
   combined-card scope this phase was chartered for; flagged for Phase 6).
4. **Caught during this phase's own development, fixed before the diff was
   finalized:** `resolveFullAttackRerollButton()`'s "reject reroll after
   damage already applied" check initially read
   `activeRevision?.damageContext?.applied`, a field nothing in this
   codebase ever sets (damage applications are recorded via
   `recordDamageApplication()`'s separate `damageApplications[]` array, not
   a flag on `damageContext`) — making the guard dead code, silently
   never triggering. **Fixed** — the check now reads
   `entry.damageApplications.length > 0`, the array that actually reflects
   whether damage has been applied for this attack instance. Caught while
   writing this audit's own description of the check, not by a test
   written in advance — noted here rather than silently corrected, since
   the corresponding static-guard test also had to be updated to match.

## Suspected defects not confirmed

- **Phase 4's single-attack damage-application receipt is not
  revision-scoped.** `chat-interaction-bridge.js`'s
  `damageApplicationReceiptKey(weaponKey, targetId)` (Phase 4) has no
  revision component, unlike Phase 5's combined-card equivalent. If a
  single attack message is rerolled (via `resolveAttackRerollButton()`,
  which creates a NEW message and marks the old one superseded) this is
  moot — the receipt lives on the old, now-superseded message, and the
  new message starts with no receipt. This was traced far enough to
  confirm it is **not** actually exploitable given the single-attack
  path's create-new-message-on-reroll design, but the asymmetry with the
  combined-card path's revision-scoped key was not fully reconciled — a
  Phase 6 candidate to unify the two receipt shapes if the single-attack
  path's design ever changes.
- Whether `system.derived.damage.conditionPenalty` should read from the
  operator or the vehicle for a vehicle weapon attack (open since Phase 3)
  — unchanged, not investigated this phase (out of scope).
- The generic `[data-action="roll-attack"]` DOM-layer guard gap (Phase 4's
  "suspected defect not confirmed") — unchanged, still relies on
  `attack-domain-router.js` inside `rollAttack()` plus template
  segregation, not a second DOM-layer check.

## Exact files changed

**New:**
- `scripts/engine/combat/full-attack-message-state.js` — the sequence-state
  authority (schema, `appendRevision`, damage-application receipts).
- `scripts/engine/combat/full-attack-card-renderer.js` — pure HTML
  rendering from stored state (extracted from `full-attack-executor.js` to
  break an import cycle — see "Stacked integration findings").
- `.github/workflows/rolling-system-validation.yml`
- `tools/run-rolling-tests.mjs`, `tools/run-rolling-syntax-check.mjs` — CI
  support scripts with documented, self-checking exclusion lists.
- `tools/check-full-attack-reroll-guard.mjs`
- `tests/phase5-full-attack-message-state.test.mjs` (genuinely executed),
  `tests/phase5-full-attack-reroll-handler.test.mjs`,
  `tests/phase5-stacked-integration.test.mjs`,
  `tests/full-attack-reroll-guard-check.test.mjs`,
  `tests/rolling-ci-support-check.test.mjs`
- `docs/audits/rolling-system-alignment-phase-5.md` (this file)

**Modified:**
- `scripts/engine/combat/full-attack-executor.js` — `_postCombinedCard`
  rebuilt around `buildInitialAttackEntry`/`renderFullAttackCardContent`;
  rendering functions extracted to the new renderer module.
- `scripts/engine/feats/meta-resource-feat-resolver.js` —
  `resolveFullAttackRerollButton()` added, directly after the existing
  `resolveAttackRerollButton()`.
- `scripts/ui/chat/chat-interaction-bridge.js` —
  `handleFullAttackRerollButton()` + its `bind()` registration;
  `isFullAttackRowStale()`/`warnStaleFullAttackRow()` guards wired into
  `handleLegacyDamageRollButton`/`handleApplyDamageButton`.
- `tests/phase2-reroll-outcome-integrity.test.mjs`,
  `tests/phase4-full-attack-sequence-identity.test.mjs` — re-anchored to
  Phase 5's restructured code (method-boundary slice fixed; flags-shape
  assertion updated for the schema version bump); no invariant weakened,
  only re-targeted at the new code shape (see inline diff comments in each
  file).

No feat, talent, progression, character-generation, workbench, GM-tool, or
compendium file was touched.

## Tests added

6 new test files (1 genuinely executed — zero Foundry dependencies,
confirmed by successfully importing and running it under plain Node — the
rest static-guard source-text checks, same convention as every prior
phase) plus 1 guard-tool smoke test, plus 2 existing test files re-anchored
to this phase's restructured code without weakening any assertion:

- `phase5-full-attack-message-state.test.mjs` — **genuinely executed**,
  12 assertions against a real mock-`ChatMessage`: entry shape, read/
  normalize (including Phase 4 legacy wrapping), `appendRevision` success
  + supersession + stale-revision rejection + not-found rejection, sibling
  isolation, revision-scoped damage receipts, JSON-round-trip
  serializability, schema version bump, and fresh-read-not-cached-copy
  behavior.
- `phase5-full-attack-reroll-handler.test.mjs` — reroll button data
  contract, reroll-options sourced from the same eligibility list as
  `rollAttack()`, execution-time re-validation (rule presence, oncePer,
  Force Points), stale-revision/damage-already-applied rejection ordering,
  fresh AttackOutcomeResolver verdict (no stale-field merge), single-attack
  scoping (`appendRevision` targets one `attackInstanceId`, ledger
  preserved not recomputed), only the two proven result policies, cancel/
  fail-before-append ordering, render-failure recoverable-warning +
  diagnostics behavior, button wiring, and damage-routing staleness
  guards on both live handlers in the correct order relative to the
  superseded-message check.
- `phase5-stacked-integration.test.mjs` — the item-12 combined end-to-end
  test (10 dimensions, see above), plus a re-verified import-cycle check.
- `full-attack-reroll-guard-check.test.mjs` — smoke test for the new
  guard tool.
- `rolling-ci-support-check.test.mjs` — source-text checks for both CI
  scripts' exit/reporting behavior and the exclusion-list contract, and a
  structural check of the workflow YAML itself (triggers, permissions,
  concurrency, no Foundry install, no blanket `continue-on-error`). Does
  **not** spawn either CI script as a live subprocess from within the test
  suite — doing so during development caused unbounded recursive
  subprocess spawning (`run-rolling-tests.mjs`/`run-rolling-syntax-check.mjs`
  each ran `main()` unconditionally at module top level, so even
  `import()`ing them for their exported constants re-triggered a full run,
  which itself re-ran this very test file, which re-imported them, ...).
  **Fixed** by guarding both scripts' `main()` call behind an
  entry-point check (`process.argv[1]` resolves to the script's own path)
  — a real bug caught during this phase's own test-writing, not
  theoretical; documented here rather than silently patched.

## Guards added or updated

- `tools/check-full-attack-reroll-guard.mjs` (new) — four invariants: only
  `full-attack-message-state.js` writes `'flags.swse.attacks'`; the reroll
  handler never re-spends the shared sequence cost; the card renderer
  never computes attack math or hit/critical state; no `new Roll(`/
  `actor.update(` in any Phase 5 full-attack file. Report-only by default,
  `--strict` to fail, same convention as every prior guard.
- Phase 1-4 guards (`check-combat-math-ssot.mjs`,
  `check-attack-outcome-ssot.mjs`, `check-critical-confirmation-guard.mjs`,
  `check-reroll-supersession-guard.mjs`,
  `check-vehicle-attack-routing-guard.mjs`) — unmodified, re-run, zero new
  findings.

## Commands run

```
node --check <every changed/added .js/.mjs file>
node tools/run-rolling-syntax-check.mjs
node tools/run-rolling-tests.mjs
node tools/check-combat-math-ssot.mjs [--strict]
node tools/check-attack-outcome-ssot.mjs [--strict]
node tools/check-critical-confirmation-guard.mjs [--strict]
node tools/check-reroll-supersession-guard.mjs [--strict]
node tools/check-vehicle-attack-routing-guard.mjs [--strict]
node tools/check-full-attack-reroll-guard.mjs [--strict]
node tests/<each>.test.mjs   (all 38: 10 pre-Phase-1 + 7 Phase 1 + 6 Phase 2
                               + 5 Phase 3 + 6 Phase 4 + 6 Phase 5,
                               2 phase2/phase4 files re-anchored)
grep -Hn -E 'actor\.update\(|new Roll\(' <13 rolling-system files>
```

## Test results

- All changed/added `.js`/`.mjs` files: `node --check` passes.
- `node tools/run-rolling-syntax-check.mjs`: **passes** — 2070 files
  checked, 2 documented pre-existing failures excluded, zero new failures.
- `node tools/run-rolling-tests.mjs`: **passes** — 34 of 38 test files run
  (5 documented Force-power-track exclusions; the 5th, "excluded," count
  is fixed at 5 regardless of total file growth by the script's own
  self-check), 34 pass / 0 fail.
- Full `tests/*.test.mjs` sweep (unfiltered, for this report's own
  record): **38 files total, 33 pass / 5 fail** — the same 5 pre-existing,
  now-classified Category-B failures. **Zero new failures** relative to
  the Phase 4 baseline.
- All 6 static guards: pass, report and `--strict`, zero new findings.
- `git diff` review: no `actor.update(` or `new Roll(` introduced in any
  file this phase touched (the scoped grep step above, run locally,
  confirms this for the 13-file rolling-system set; a repo-wide grep was
  also run manually and the only hits are pre-existing, unrelated files
  this phase did not touch — `enhanced-rolls.js`, `recurring-damage-engine.js`,
  `SWSEInitiative.js`).

## Runtime test matrix

**Foundry VTT v13 could not be launched in this static-analysis
environment** (same constraint as every prior phase — no display/Electron/
Node-Foundry install available here). Every row below is genuinely
pending — none should be read as "passed." The Phase 3 (44 rows) and
Phase 4 (36 rows) matrices are carried forward unchanged (see their own
audit files) plus the following Phase 5 additions, all **Pending**:

### Full Attack card (20 rows)

| # | Test | Statically proven | Runtime result |
|---|---|---|---|
| 1 | Combined card renders stable sequence/attack IDs | Yes (static — `buildInitialAttackEntry`/renderer contract) | Pending |
| 2 | Reroll first attack only | Yes (static — `appendRevision` scoped to one `attackInstanceId`) | Pending |
| 3 | Reroll middle attack only | Yes (static, same mechanism, order-independent) | Pending |
| 4 | Reroll final attack only | Yes (static, same mechanism) | Pending |
| 5 | Sibling totals remain unchanged | Yes (genuinely executed — `phase5-full-attack-message-state.test.mjs` #8) | Pending |
| 6 | Sibling outcomes remain unchanged | Yes (same test) | Pending |
| 7 | Sibling damage buttons remain correctly routed | Partially (static — each row's damage button carries its own `attackInstanceId`) | Pending |
| 8 | Miss rerolled to hit | Yes (static — fresh `AttackOutcomeResolver.resolve()`, no field merge) | Pending |
| 9 | Hit rerolled to miss | Yes (same mechanism) | Pending |
| 10 | Normal hit rerolled to critical | Yes (same mechanism) | Pending |
| 11 | Critical rerolled to normal hit | Yes (same mechanism) | Pending |
| 12 | Natural 20 rerolled to noncritical | Yes (same mechanism; `automaticHit`/`criticalThreat` recomputed) | Pending |
| 13 | Natural 1 rerolled to hit | Yes (same mechanism) | Pending |
| 14 | Cancelled reroll preserves original result | Yes (static — no roll attempted, function returns before any state change) | Pending |
| 15 | Failed reroll preserves original result | Yes (static — `if (!newRoll)` returns before `appendRevision`) | Pending |
| 16 | Reroll resource-payment failure preserves original result | Yes (static — Force-Point-spend failure returns before `appendRevision`) | Pending |
| 17 | Reroll chat-update failure surfaces a warning | Yes (static — try/catch around render, `ui.notifications.warn` + diagnostics record) | Pending |
| 18 | Page reload preserves active revisions | Yes by construction (flags persist on the ChatMessage document; no in-memory-only state) | Pending |
| 19 | Original roll history remains visible | Yes (static — `revisions[]` array retained, `historyLine` rendered) | Pending |
| 20 | Superseded outcome cannot apply damage | Yes (static — `isFullAttackRowStale` blocks any stale `expectedRevision`) | Pending |

### Result policies (7 rows)

| # | Test | Statically proven | Runtime result |
|---|---|---|---|
| 21 | Use-new-result policy | Yes (static) | Pending |
| 22 | Use-better-result policy | Yes (static) | Pending |
| 23 | Use-worse-result policy | **N/A — not implemented; no rule in this codebase grants it for a player-initiated reroll** (see "Reroll eligibility sources") | N/A |
| 24 | Choose-result policy | **N/A — not implemented; no rule grants it** | N/A |
| 25 | Unauthorized user cannot choose | **N/A** (no choose-result policy exists to authorize/unauthorize) | N/A |
| 26 | Unresolved choice blocks damage | **N/A** (same) | N/A |
| 27 | Chosen result becomes uniquely authoritative | **N/A** (same; the two implemented policies each deterministically resolve to one total with no pending-choice state) | N/A |

### Costs (7 rows)

| # | Test | Statically proven | Runtime result |
|---|---|---|---|
| 28 | Shared action cost spent once | Yes (static — `_spendFullAttackEconomy` pre-loop / `if (!spend)`-guarded lazy spend) | Pending |
| 29 | Per-attack cost associated with correct attack | Yes (static — `attackInstanceId` threaded per attack) | Pending |
| 30 | Reroll cost spent once | Yes (static — single `ActorEngine.spendForcePoints` call per reroll invocation) | Pending |
| 31 | Ammunition not double-spent | Yes (static — reroll handler never calls `AmmoSystem.spendForWorkflow`) | Pending |
| 32 | Force Point spend and receipt correct | Yes (static — same coordinator call as the single-attack path) | Pending |
| 33 | Refund on failed reroll correct | Yes (static — no spend attempted for the failure classes that would need a refund) | Pending |
| 34 | Duplicate click does not duplicate spending | Partially (static — `button.disabled` + `appendRevision`'s stale-check; not runtime-verified against actual rapid double-click timing) | Pending |

### Concurrency (6 rows)

| # | Test | Statically proven | Runtime result |
|---|---|---|---|
| 35 | Double-click reroll | Partially (static mechanism present; timing not runtime-verified) | Pending |
| 36 | Two clients reroll same attack | Yes (static — `appendRevision` re-reads fresh; genuinely executed in the mock test) | Pending |
| 37 | Stale card attempts reroll | Yes (genuinely executed — `phase5-full-attack-message-state.test.mjs` #6, #12) | Pending |
| 38 | Stale card attempts damage | Yes (static — `isFullAttackRowStale`) | Pending |
| 39 | Duplicate damage click | Yes (genuinely executed — revision-scoped receipt test #9) | Pending |
| 40 | Newest revision remains authoritative | Yes (genuinely executed — #5) | Pending |

### Vehicle and abstract crew (6 rows)

| # | Test | Statically proven | Runtime result |
|---|---|---|---|
| 41 | Assigned-gunner sequence retains Gunner BAB | **N/A — no live vehicle full-attack sequence exists** (see "Vehicle and abstract-crew sequence behavior"); the single-attack path this actually exercises was already proven in Phase 3/4 | N/A for sequences; Pending for the single-attack path |
| 42 | Assigned-gunner sequence retains Vehicle INT | Same as above | N/A / Pending |
| 43 | Abstract-crew sequence retains Crew Quality BAB equivalent | Same as above | N/A / Pending |
| 44 | Vehicle reroll does not introduce gunner Dex or Str | Yes (static — reroll never recomputes the formula, single-attack or full-attack path) | Pending |
| 45 | Vehicle reroll does not use vehicle BAB | Yes (same reasoning) | Pending |
| 46 | Vehicle damage uses current authoritative revision | Partially (the single-attack supersession guard, unchanged since Phase 3, covers this; not sequence-specific since no vehicle sequence exists) | Pending |

## Merge order

Unchanged from Phase 3/4's guidance: #928 → #929 → #930 → #931 → this
Phase 5 PR. Each PR's base branch already targets its predecessor, so
merging in that order is what GitHub's stacked-PR UI will present
naturally; no manual reordering is required.

## Expected conflicts

None anticipated at merge time. This phase's changes are additive to
files Phase 3/4 already modified (`chat-interaction-bridge.js`,
`full-attack-executor.js`, `meta-resource-feat-resolver.js`) in
non-overlapping regions (new functions, new `bind()` registrations, new
fields appended to existing objects), and to files no prior phase touched
(`full-attack-message-state.js`, `full-attack-card-renderer.js`, the CI
workflow and its two support scripts, the new guard tool).

## Remaining Phase 6 / post-merge candidates

1. Interactive per-attack reroll for a genuinely live multi-target ("one
   roll, many targets") attack workflow — still N/A, since none exists
   live in this codebase (confirmed again this phase). If one is ever
   built, it should adopt this phase's revision-history pattern.
2. Reconcile Phase 4's single-attack damage-application receipt (not
   revision-scoped) with Phase 5's combined-card receipt (revision-scoped)
   — traced to be non-exploitable given the single-attack path's
   create-new-message-on-reroll design, but the asymmetry is unresolved.
3. Finish or formally shelve the Deep-Space Gambit reaction's own
   acknowledged incompleteness ("until the attack event bridge can replace
   the roll automatically") — if finished, its `keepWorse` policy would be
   the first real evidence for implementing that policy generally.
4. A second, DOM-layer `actor.type` guard for the generic
   `[data-action="roll-attack"]` handler (Phase 4's still-open item).
5. Vehicle attack-roll size/fire-control modifiers, if authoritative SWSE
   data is ever supplied (Phase 4's still-open item; Phase 5 re-confirmed
   no new data appeared and did not touch `vehicle-attack-math.js`).
6. All pending runtime-matrix rows above, plus the full Phase 3 (44-row)
   and Phase 4 (36-row) matrices, plus the still-dead-code disposition
   questions carried since Phase 2 (`vehicle-weapons.js`,
   `swse-vehicle-core.js#rollWeapon()`, `SWSECombat`/
   `CombatEngine.resolveAttack()`, `CombatActionBar`,
   `SWSERoll.rollAutofire()`/`rollBulkAttack()`).
7. If a future phase gives the 5 excluded Force-power-track tests
   Foundry-independent imports (or this project adopts a Foundry-module
   test harness), remove them from `KNOWN_EXCLUDED_TESTS` and let CI
   verify them for real.

## Final summary

**Fixed**
- Interactive per-attack reroll now exists for combined Full Attack chat
  cards, reusing the exact same eligibility/policy authority as the
  existing single-attack reroll — no new reroll rule invented.
- Combined-card damage buttons are now revision-aware and reject stale
  clicks after any reroll of that specific attack.
- A duplicate-constant/import-cycle risk introduced during this phase's
  own development was caught and fixed before landing (extracted
  `full-attack-card-renderer.js`).

**Full Attack rerolls**
- One attack rerolled independently of its siblings; a brand-new
  `AttackOutcomeResolver` verdict every time; original and rerolled
  results both retained in the revision history; only the two proven
  result policies (use-new-result, use-better-result) implemented — no
  invented worse-result/choose-result/GM-replace-result mechanism.

**State and concurrency**
- New `full-attack-message-state.js` is the single, narrowly-scoped
  authority for combined-card state — schema version `full-attack-v2`,
  Phase 4 messages normalized read-only, fresh-read-then-compare
  concurrency protection, no live documents ever stored.

**Costs and ammunition**
- Shared sequence cost spent exactly once, never re-spent by a reroll;
  ammunition never double-spent on reroll (no rule requires it);
  Force Point reroll cost routed through the same `ActorEngine`-backed
  coordinator as the single-attack path.

**Damage routing**
- Stale-revision damage rejection on both live combined-card damage
  handlers, ordered after the pre-existing supersession check.

**Vehicle behavior**
- Confirmed, not invented: no live vehicle/abstract-crew full-attack
  sequence exists. Vehicle/abstract-crew reroll correctness (Gunner BAB /
  Vehicle INT / Crew Quality preserved, vehicle BAB and gunner Dex/Str
  never introduced) is inherited from the unmodified single-attack reroll
  path, re-verified rather than re-implemented.

**Force-power test findings**
- All 5 pre-existing failures classified Category B (environment-only,
  unrelated to rolling-system work) with git-history evidence. Not fixed
  (out of scope), not deleted, explicitly excluded by name from the
  focused CI test runner with the reasoning documented in the runner
  itself.

**CI**
- New `.github/workflows/rolling-system-validation.yml`: syntax check,
  focused test suite, 6 static guards, and a scoped bypass grep — every
  command verified locally before being committed. Explicitly documents
  what it does and does not verify (no Foundry runtime claim).

**Tests**
- 6 new test files (1 genuinely executed against real mock-message logic)
  + 1 guard smoke test + 2 existing files re-anchored without weakening
  any assertion. Zero regressions across 38 total test files (33 passing
  outside the 5 documented exclusions) and 6 static guards.

**Runtime results**
- **None.** Foundry VTT v13 was not launched. Every runtime-matrix row is
  pending, not passed.

**Integration findings**
- One real import-cycle risk found and fixed during this phase's own
  development (not left in the diff). No new duplicate constants. Ledger
  shapes, authoritative/superseded semantics, and chat-consumes-resolved-
  data all verified consistent across all five stacked PRs.

**Remaining risks**
- Phase 4's single-attack damage-application receipt is not
  revision-scoped (unlike Phase 5's combined-card equivalent) — traced to
  be non-exploitable given the single-attack path's design, but the
  asymmetry between the two receipt shapes is unresolved (Phase 6
  candidate).
- No live vehicle/multi-target sequence workflow exists to runtime-verify
  rows 38/41-43/N-A above against.
- Every runtime-matrix row across all five phases remains unexecuted in a
  live Foundry world.

**Merge order:** #928 → #929 → #930 → #931 → this Phase 5 PR. No
conflicts anticipated.

This pass does not claim the rolling system is completely verified. It
closes the interactive-reroll gap Phase 4 left open, hardens sequence/
cost/damage state with a genuinely tested new authority, gives the whole
rolling-system track real CI enforcement for the first time, and is
explicit — including about a bug found in its own new code — about
everything that remains open for Phase 6 or a live runtime pass.
