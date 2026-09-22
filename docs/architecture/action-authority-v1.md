# Action Authority v1 (groundwork)

Status: **groundwork only**, established during the V2 Math Integrity Freeze's Attack Bonus round 8 correction #1 addendum and hardened in round 8 correction #2 (PR #973), after independent review found the first pass's contracts unsafe to build on. Attack Options are the pilot migration consumer, not the permanent scope. This document is the design record the addendum instructing this work asked for; it is not a claim that the migration is complete.

## 0. Round 8 correction #2: four hardening fixes

Independent review of the first groundwork pass (head `fdf3122`) found the direction correct but the contracts not yet safe to build future systems on:

1. **Lossless ingestion was actually lossy.** The v1 normalizer translated only a subset of the 24 real `requires*`/`excludes*` gate fields shipped ATTACK_OPTION records use, *silently omitting* the rest (`requiresRangeBand`, `requiresUnarmed`, `requiresContextFlags`, `requiresWeaponText`, `requiresDamageType`, `requiresSwiftActions`, `requiresFeatSelectedChoiceMatch`, `requiresVehicleWeapon`, `excludesAreaAttack`, `excludesDamageType`, `excludesWeaponGroups`, `excludesOptions`). An omitted requirement is fail-*open* ("requires nothing" instead of "requires X") — dangerous the moment a consumer starts trusting it. Fixed: every one of the 24 fields is now either translated into a real requirement predicate, or explicitly marked `externalWorkflow`/`unsupported` (§3) — never dropped — enforced by `validateAttackOptionNormalization()`, a guard that throws on any unrecognized or untranslated gate field. Proven against the *entire* real 136-record dataset, not just representative samples (§10).
2. **Registry identity contradicted its own schema.** `ActionDefinition.id` is documented "unique within a domain," but `ActionRegistry` indexed by the bare id — actually requiring *global* uniqueness. Fixed: the canonical key is now the domain-qualified composite (`${domain}:${id}`); the public API is `get(domain, id)` (§4).
3. **Definition and entitlement were conflated.** `ActorActionResolver` created one `ActionDefinition` per owned item, embedding that item's provenance directly into the definition — two different sources granting the same logical action would collide as a duplicate-definition error. Fixed: `ActionDefinition` (what the action IS) and the new `ActionEntitlement` (why *this actor* has it, and from which specific source) are separate; one canonical definition, any number of entitlements (§5).
4. **The availability engine was building a second fuzzy weapon/target classifier.** Its own `weaponText()`/`targetOwnsItem()` reimplementations risked drifting from `CombatOptionResolver.optionAllowedForWeapon()`'s certified logic. Fixed: those classification helpers were extracted verbatim (pure move, zero behavior change — proven by the full existing test suite re-passing unchanged) into a neutral shared module, `scripts/engine/combat/weapon-target-gate-classifiers.js`, which both `CombatOptionResolver` and `ActionAvailabilityEngine` now import from (§6). The `attackType` predicate was also corrected to fail closed on an unresolvable attack type (previously auto-passed), and the boolean-tree evaluator now records every branch's provenance (not short-circuited) and gives a truthful reason for a failing `not`-node.

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

A versioned (`schemaVersion: 1`), domain-tagged normalized shape. Fields: `id`, `name`, `domain` (one of `attack`, `reaction`, `force`, `skill`, `movement`, `defense`, `utility` — only `attack` has a normalizer today), `source` (type/id/uuid/name provenance), `ownership.mode`, `presentation` (`control`: `toggle`/`flag`/`slider`/`passive`, `section`, `label`), `requirements` (a composable `all`/`any`/`not` predicate tree, each leaf/negation carrying a `sourceField` naming the exact raw gate field it was translated from — the traceability the lossless guard checks), `economy.actionType` (metadata only — see §7), `execution.kind` (`attack-option` today; `handler` reserved as an escape hatch, §9), `effects` (declarative, informational-only in this round — see §8), and `tags`.

The requirement-predicate vocabulary (`ACTION_REQUIREMENT_PREDICATE_TYPES`) covers every gate the certified `optionAllowedForWeapon()` implements: `attackType`, `weaponGroup`, `weaponTextMatch`, `weaponCapability`, `unarmed`, `vehicleWeapon`, `damageType`, `areaAttack`/`areaAttackFlag` (two distinct predicates — see below), `featSelectedChoiceMatch`, `rangeBand`, `contextFlags`, `context` (a keyed boolean — `aim`/`charge`/etc.), `targetExists`, `targetType`, `targetFeat`, `targetTalent`, `targetItem`, `targetText`, `targetFlatFooted`, `targetDeniedDex`, `selectedOption`, and the two provenance markers `externalWorkflow`/`unsupported` (never-satisfiable, distinct meanings — see below). It grows by adding one new type + one new evaluator function that *delegates* to an existing canonical classifier (§6), never a per-feat special case or a new fuzzy reimplementation.

`areaAttack` vs `areaAttackFlag` is a deliberate asymmetry, not an oversight: it mirrors `optionAllowedForWeapon()`'s own real behavior, where `requiresAreaAttack` uses the fuller text-scanning `isAreaAttackContext()` check but `excludesAreaAttack` uses a narrower raw-flag-only check. Translating both fields to the same predicate would have been a *plausible-looking* but *unfaithful* simplification — exactly the kind of drift a "lossless" claim must rule out.

**`ATTACK_OPTION_GATE_FIELD_DISPOSITION`** is the single closed inventory (24 entries, one per real gate field ever observed on a shipped record) both the normalizer's translation logic and its own validator consult, so they cannot drift apart. Each field is `'normalized'` (translated into a real predicate), `'external-workflow'` (the `requiresManeuver`/`requiresOpportunityAttack` fields — the current dialog has no maneuver selector or opportunity-attack/reaction framing *at all*, genuinely structurally unreachable), or `'unsupported'` (`requiresSwiftActions` — per explicit reviewer instruction, swift-action cost belongs to the existing `ActionEngine` and must never be independently recalculated here; may gain a real evaluator in a future round without a schema change).

## 4. `ActionRegistry` (`scripts/engine/actions/action-registry.js`)

A per-instance (not a global singleton in this round — see §11), deterministic index keyed by the **domain-qualified composite** `${domain}:${id}` — `ActionDefinition.id` is only documented unique *within* a domain, so `attack:recover` and `utility:recover` must be able to coexist. Public API: `register(definition)`, `get(domain, id)`, `forDomain(domain)`, `all()`, `size()`. Re-registering the *same* definition object is a no-op; registering a *different* definition under a composite key that already exists throws immediately rather than silently overwriting. It does not evaluate requirements, mutate actors, or execute anything.

## 5. `ActorActionResolver` (`scripts/engine/actions/actor-action-resolver.js`) — definition vs. entitlement

`getOwnedActions(actor, { domain = 'attack', registry })` scans the actor's owned items, extracts genuine `ATTACK_OPTION` rules via `CombatOptionResolver.extractAttackOptionRules()` (the same strictly-typed extraction Blocker 1 of the prior correction round fixed — one shared contract, never a second parser), normalizes each via `normalizeAttackOptionRule()`, and returns `{ definitions, entitlements }` — **not** a flat definition array. An unsupported `domain` (anything but `'attack'` today) returns `{ definitions: [], entitlements: [] }` rather than throwing — no normalizer existing yet for a future domain is an expected, not exceptional, state during this migration.

The split exists because **`ActionDefinition` is what the action IS** (one canonical object per unique `domain:id`, registered into `registry` at most once) while **`ActionEntitlement` is why *this actor* has access to it** (`{ actionKey: {domain, id}, actorId, source, configuration }`, one per actor-owned granting item). If two different items (a feat and a talent, say) both grant the exact same logical action id, `getOwnedActions()` produces ONE canonical definition plus TWO entitlement records — never a duplicate-definition registry error, and never a definition with an ambiguous/merged source. No persistent entitlement database is built; both are computed fresh from the actor's current items on every call.

A gate the predicate vocabulary cannot represent at all is never silently dropped by the normalizer — see §3's `ATTACK_OPTION_GATE_FIELD_DISPOSITION`.

## 6. `ActionAvailabilityEngine` (`scripts/engine/actions/action-availability-engine.js`)

`evaluate(definition, context)` / `evaluateMany(definitions, context)`. Context: `{ actor, weapon, attackType, target|targetActor, aim, charge, autofire, selectedOptions|combatOptions|attackOptions, areaAttack, targetFlatFooted, targetDeniedDexBonus }`. Recursively evaluates the `requirements` tree (every branch of `all`/`any` fully evaluated, never short-circuited, so every leaf's provenance is always collected), collecting every leaf predicate's `met`/`reason` for the result's `requirements` array (never just a bare boolean — the UI needs to know *why*). A `not`-node produces its own synthesized leaf on failure with a truthful, non-null reason (e.g. `"This weapon's damage type is excluded for this option"`) rather than a silent boolean flip.

**Every predicate evaluator delegates to `scripts/engine/combat/weapon-target-gate-classifiers.js`** — the exact pure functions `CombatOptionResolver.optionAllowedForWeapon()` (the certified, live authority) uses, extracted verbatim rather than duplicated. This file's own job is only the tree composition and state model, never weapon/target classification itself.

Seven possible states (matching `action-definition.js#ACTION_STATES`):

- **`hidden`** — every unmet requirement is *structural* (`attackType`/`weaponGroup`/`weaponTextMatch`/`weaponCapability`/`unarmed`/`vehicleWeapon`/`damageType`/`areaAttack`/`areaAttackFlag` — a fact about the weapon/attack itself, never resolvable by a context toggle). No reason is surfaced; there is nothing the player can do about it here. Matches `CombatOptionResolver.optionAllowedForWeapon()`'s unconditional (never probed) gates.
- **`disabled`** — at least one unmet requirement is *contextual* (`context`/`target*`/`selectedOption`/`rangeBand`/`contextFlags`/`featSelectedChoiceMatch`) — player-actionable from this same dialog. Carries a human `reason` (e.g. `"Requires Aim"`, `"Requires a target"`, `"Target does not meet this option's requirement"`).
- **`external-workflow`** — blocked by the `externalWorkflow` marker (§3/§5). Genuinely unreachable from an ordinary attack dialog (no maneuver selector, no opportunity-attack/reaction framing) — reported honestly rather than shown as an actionable checkbox.
- **`unsupported`** — blocked (only) by the `unsupported` marker (§3) — a real, dialog-reachable-in-principle gate (swift-action cost) this round deliberately does not evaluate yet, distinct from `external-workflow`'s structural impossibility.
- **`available`** — all requirements met, `presentation.control !== 'passive'`.
- **`passive`** — all requirements met, `presentation.control === 'passive'` (an always-on modifier that currently applies, e.g. Droid Hunter against a droid target — not a player checkbox).
- **`active`** — reserved for a future refinement distinguishing a currently-toggled selectable option from a merely-available one; not yet produced by `evaluate()` in this round (the live `CombatOptionResolver.summarizeAttackOptions()`'s own `active` flag already covers this for the certified path).

An unrecognized predicate `type` fails closed: `met: false`, a `console.warn`, never silent success. The `attackType` predicate specifically fails closed on an unresolvable ("unknown") attack type — a caller that supplies no weapon and no explicit attack type has not proven a required melee/ranged predicate met, and must not receive `available` by default.

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

This round did **not** wire all 136 shipped `ATTACK_OPTION` records into any live consumer (explicit stop condition — none of this groundwork is production-wired). It DID, however, prove the normalizer is lossless against the *entire* real dataset: `tests/action-authority-groundwork-normalization-audit.test.mjs` runs all 136 records (verified: 88 feats + 48 talents) through `normalizeAttackOptionRule()` + `validateAttackOptionNormalization()` and asserts zero failures — every one of the 24 real gate fields normalizes, is marked external-workflow, or is marked unsupported, none silently dropped. It generates `docs/audits/generated/action-authority-normalization-audit-report.{md,json}` (195 normalized + 10 external-workflow + 3 unsupported gate-field occurrences across the dataset, matching the reviewer's own independent manual audit exactly). A mutation test confirms the guard actually guards: a synthetic `requiresMountedCombat` field with no disposition entry throws immediately rather than silently passing through.

The behavior-level (not just structural) proofs remain against representative classes from real pack records, in `tests/action-authority-groundwork.test.mjs`: an ordinary toggle (Rapid Shot), a passive (Droid Hunter — also target-gated), a slider (Power Attack), an Aim-gated option (Careful Shot), a Charge-gated option (Powerful Charge), a melee-only structural mismatch (Power Attack on a ranged attack → `hidden`), a target-gated option evaluated with/without a real target (Droid Hunter), domain-qualified registry identity, definition/entitlement separation (two sources granting the same action id), and full boolean-tree provenance (`all`/`any`/`not`, nested). This suite also directly cross-checks this groundwork engine's available/not-available verdict against `CombatOptionResolver.getAttackOptionsWithState()`'s own already-certified output for several representative cases, proving parity without claiming the dialog has been rewired to consume it.

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
