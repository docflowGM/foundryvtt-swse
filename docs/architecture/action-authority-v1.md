# Action Authority v1 (groundwork)

Status: **groundwork only**, established during the V2 Math Integrity Freeze's Attack Bonus round 8 correction #1 (PR #973). Attack Options are the pilot migration consumer, not the permanent scope. This document is the design record the addendum instructing this work asked for; it is not a claim that the migration is complete.

## 1. Problem being solved

`CombatOptionResolver` (`scripts/engine/combat/combat-option-resolver.js`) grew, over several rounds of this freeze, into discovering attack-option metadata, evaluating runtime context, presenting UI state, *and* calculating roll-math contributions — four different jobs in one module. That overload produced a real defect (round 8 correction #1, Blocker 1): the module's own discovery step inferred "is this an attack option" from `rule.type === 'ATTACK_OPTION' || rule.option || rule.id` — a loose enough test that 180+ unrelated compendium rules (`RUNTIME_CONTEXT_REFERENCE`, `TALENT_RULE`, `HIT_RIDER`, `DEFENSE_BONUS`, ...) were one card-render away from appearing as attack checkboxes.

The reviewer's diagnosis: there is no single runtime authority answering *"what actions does this actor possess, and what is each one's availability state right now?"* — that question is currently split across feat/talent metadata shapes, `CombatOptionResolver`, `PrerequisiteChecker`, capability registries, `ActionEngine` (action economy), reaction engines, and several combat-specific runtime patch files, none of which agree on one schema. This document establishes the first, minimal interfaces for that missing authority.

## 2. SSOT boundaries (what this layer does and does NOT own)

| Authority | Owns |
|---|---|
| `PrerequisiteChecker` (existing) | Can this actor **acquire** this feat/talent/class/etc.? (character-building legality) |
| `ActionRegistry` (new, groundwork) | What normalized `ActionDefinition`s exist, indexed by id/domain |
| `ActorActionResolver` (new, groundwork) | Does this actor **own** (already possess) this action? (entitlement) |
| `ActionAvailabilityEngine` (new, groundwork) | Can the actor **use** this action **right now**, and why/why not? (runtime presentation state) |
| `ActionEngine` (existing) | Action-economy cost/legality (standard/move/swift/full-round, substitutions) — **unchanged, not overloaded** |
| `CombatOptionResolver` (existing) | The **live, certified** attack-modifier composition math (`collectAttackModifiers()`) — **unchanged, still the roll-math authority** |
| `ActorEngine` (existing) | Actor mutation |
| `ModifierEngine` / typed-modifier stacking (existing) | Roll-math contribution stacking |

None of the four new modules in this round mutate an actor, calculate a roll bonus, or spend action economy. `ActionAvailabilityEngine` explicitly does not duplicate `PrerequisiteChecker` — an actor's entitlement (owning the source item) is treated as already-established by the time this layer runs; runtime availability only asks whether *currently reachable* context (weapon, target, Aim/Charge/Autofire, another selected option) satisfies the action's requirements.

## 3. The `ActionDefinition` schema (`scripts/engine/actions/action-definition.js`)

A versioned (`schemaVersion: 1`), domain-tagged normalized shape. Fields: `id`, `name`, `domain` (one of `attack`, `reaction`, `force`, `skill`, `movement`, `defense`, `utility` — only `attack` has a normalizer today), `source` (type/id/uuid/name provenance), `ownership.mode`, `presentation` (`control`: `toggle`/`flag`/`slider`/`passive`, `section`, `label`), `requirements` (a composable `all`/`any`/`not` predicate tree), `economy.actionType` (metadata only — see §7), `execution.kind` (`attack-option` today; `handler` reserved as an escape hatch, §9), `effects` (declarative, informational-only in this round — see §8), and `tags`.

The requirement-predicate vocabulary (`ACTION_REQUIREMENT_PREDICATE_TYPES`) is deliberately small: `attackType`, `weaponGroup`, `weaponCapability`, `context` (a keyed boolean — `aim`/`charge`/etc.), `targetExists`, `targetType`, `targetFeat`, `targetTalent`, `targetFlatFooted`, `targetDeniedDex`, `selectedOption`, `areaAttack`, and `externalWorkflow` (an explicit, never-satisfiable marker — see §5). It grows by adding one new type + one new evaluator function, never by adding a per-feat special case.

## 4. `ActionRegistry` (`scripts/engine/actions/action-registry.js`)

A per-instance (not a global singleton in this round — see §11), deterministic index: `register(definition)`, `get(id)`, `forDomain(domain)`, `all()`, `size()`. Re-registering the *same* definition object is a no-op; registering a *different* definition under an id that already exists throws immediately rather than silently overwriting. It does not evaluate requirements, mutate actors, or execute anything.

## 5. `ActorActionResolver` (`scripts/engine/actions/actor-action-resolver.js`)

`getOwnedActions(actor, { domain = 'attack', registry })` scans the actor's owned items, extracts genuine `ATTACK_OPTION` rules via `CombatOptionResolver.extractAttackOptionRules()` (the same strictly-typed extraction Blocker 1 fixed — one shared contract, never a second parser), normalizes each via `normalizeAttackOptionRule()`, and returns only the actor's own definitions. An unsupported `domain` (anything but `'attack'` today) returns an empty array rather than throwing — no normalizer existing yet for a future domain is an expected, not exceptional, state during this migration.

A gate the current predicate vocabulary cannot represent at all — `requiresManeuver` and `requiresOpportunityAttack` on the legacy `ATTACK_OPTION` shape, which round 8 correction #1's coverage report classifies `EXTERNAL_WORKFLOW_GATED` — is never silently dropped by the normalizer. It is encoded as an explicit `externalWorkflow` predicate, so `ActionAvailabilityEngine` reports the honest `external-workflow` state instead of a false `available`.

## 6. `ActionAvailabilityEngine` (`scripts/engine/actions/action-availability-engine.js`)

`evaluate(definition, context)` / `evaluateMany(definitions, context)`. Context: `{ actor, weapon, attackType, target|targetActor, aim, charge, autofire, selectedOptions|combatOptions|attackOptions, areaAttack, targetFlatFooted, targetDeniedDexBonus }`. Recursively evaluates the `requirements` tree, collecting every leaf predicate's `met`/`reason` for the result's `requirements` array (never just a bare boolean — the UI needs to know *why*).

Six possible states (matching `action-definition.js#ACTION_STATES`):

- **`hidden`** — every unmet requirement is *structural* (`attackType`/`weaponGroup`/`weaponCapability`/`areaAttack` — a fact about the weapon/attack itself, never resolvable by a context toggle). No reason is surfaced; there is nothing the player can do about it here. Matches `CombatOptionResolver.optionAllowedForWeapon()`'s unconditional (never probed) gates.
- **`disabled`** — at least one unmet requirement is *contextual* (`context`/`target*`/`selectedOption`) — player-actionable from this same dialog. Carries a human `reason` (e.g. `"Requires Aim"`, `"Requires a target"`, `"Target does not meet this option's requirement"`).
- **`external-workflow`** — blocked by the `externalWorkflow` marker (§5). Genuinely unreachable from an ordinary attack dialog (no maneuver selector, no opportunity-attack/reaction framing) — reported honestly rather than shown as an actionable checkbox.
- **`available`** — all requirements met, `presentation.control !== 'passive'`.
- **`passive`** — all requirements met, `presentation.control === 'passive'` (an always-on modifier that currently applies, e.g. Droid Hunter against a droid target — not a player checkbox).
- **`active`** — reserved for a future refinement distinguishing a currently-toggled selectable option from a merely-available one; not yet produced by `evaluate()` in this round (the live `CombatOptionResolver.summarizeAttackOptions()`'s own `active` flag already covers this for the certified path).

An unrecognized predicate `type` fails closed: `met: false`, a `console.warn`, never silent success.

## 7. `PrerequisiteChecker` / `ActionEngine` boundaries (explicit, not merged)

- **`PrerequisiteChecker`** decides *acquisition* legality (STR 13? BAB +1? another feat?) at character-build time. Once an actor owns the granting item, `ActorActionResolver` treats that as sufficient entitlement — it never re-runs acquisition prerequisites per attack.
- **`ActionEngine`** remains the sole action-economy authority (standard/move/swift/full-round, legal substitutions). `ActionDefinition.economy.actionType` is metadata only in this round; no code path in this groundwork queries or spends action economy. A future round may have `ActionAvailabilityEngine` ask `ActionEngine` "can the actor currently pay this action type," but that call does not exist yet.

## 8. Effects are routed, not reimplemented

`ActionDefinition.effects` exists in the schema but is populated as `[]` by this round's normalizer — no effect-translation or application logic was written. The intent (documented, not built): a future round routes declarative effect descriptors to the *existing* authorities (`ModifierEngine`, `CombatOptionResolver.collectAttackModifiers()`, the attack/damage resolvers) rather than reimplementing roll math inside the Action Authority layer. This round does not touch that boundary at all — `CombatOptionResolver.collectAttackModifiers()` remains the only place attack-modifier math is calculated.

## 9. Execution handler escape hatch

`ActionDefinitionExecution.kind` supports `'attack-option'` (routes through the existing certified math) and reserves `'handler'` for mechanics too irregular for the declarative requirement/effect vocabulary. No handler registry exists yet — the schema simply does not prevent one from being added later without a breaking change.

## 10. Migration strategy from `ATTACK_OPTION`

```
legacy { type: 'ATTACK_OPTION', option, control, requires*, ... }
              │
    CombatOptionResolver.extractAttackOptionRules()   (strict type check — Blocker 1)
              │
    normalizeAttackOptionRule(sourceItem, rule)        (pure, one shared adapter)
              │
    ActionDefinition v1
```

This round did **not** mass-migrate all 136 shipped `ATTACK_OPTION` records (explicit stop condition). It proved the adapter against nine representative classes from real pack records: an ordinary toggle (Rapid Shot), a passive (Droid Hunter — also target-gated), a slider (Power Attack), an Aim-gated option (Careful Shot), a Charge-gated option (Powerful Charge), a melee-only structural mismatch (Power Attack on a ranged attack → `hidden`), and a target-gated option evaluated with/without a real target (Droid Hunter). `tests/action-authority-groundwork.test.mjs` also directly cross-checks this groundwork engine's available/not-available verdict against `CombatOptionResolver.getAttackOptionsWithState()`'s own already-certified output for several of these cases, proving parity without claiming the dialog has been rewired to consume it.

**The current production attack dialog (`scripts/rolls/roll-config.js`) is not wired to this groundwork layer in this round.** It continues to call `CombatOptionResolver` directly, exactly as round 8/round 8 correction #1 left it. This is a deliberate "safe incremental migration, not a risky rewrite" choice.

## 11. Scalability / caching model (intended, not yet implemented)

The design goal: evaluating N actor-owned actions should cost roughly N, never the size of the full system catalog (hundreds of definitions, if every feat/talent/Force power/reaction eventually migrates). The intended split:

- **Ownership** (`ActorActionResolver.getOwnedActions()`) changes only when the actor's items change (a feat/talent is added/removed, a `selectedChoice` changes) — a natural caching boundary for a future round to add, keyed on an actor item-signature.
- **Availability** (`ActionAvailabilityEngine.evaluate()`) changes on every weapon/target/context change (Aim toggled, target selected) — cheap to recompute on each dialog interaction since it only runs over the actor's *owned* (already-filtered) definitions, not the full registry.

No caching is implemented in this round — `ActionRegistry` is an explicit per-instance object, not a global singleton, specifically because a real Foundry init/load lifecycle for a shared instance was not designed here and should not be guessed at. Building that caching layer prematurely, before real usage patterns exist, would be over-engineering.

## 12. How a future domain would adopt this

Any future domain (`reaction`, `force`, `skill`, `movement`, `defense`, `utility`) follows the exact same three-step shape §10 shows for `attack`: a domain-specific extraction/normalization adapter producing `ActionDefinition`s, `ActorActionResolver.getOwnedActions(actor, { domain })` (already domain-parameterized, just needs a matching normalizer to stop returning `[]`), and the *same* `ActionAvailabilityEngine` (already domain-agnostic — nothing in its predicate vocabulary or state model assumes "attack"). No new availability engine is expected per domain; only a new normalizer and, where the existing predicate vocabulary doesn't cover a domain's specific gates, new predicate types.

## Explicit non-goals of this round

- All 136 `ATTACK_OPTION` records are not migrated.
- `CombatOptionResolver` is not deleted, reduced, or bypassed by production code.
- No reaction, Force power, or skill action has been migrated.
- `PrerequisiteChecker` is not replaced or duplicated.
- `ActionEngine` (action economy) is not replaced, duplicated, or overloaded.
- The production attack dialog is not rewired to consume this layer.
- No global/singleton registry, caching, or Foundry init-hook wiring was added.
