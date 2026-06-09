# SWSE Combat Phase 1A - Aggregator Wiring Plan

Audit/architecture phase only. No runtime files were changed.

## The recommended SSOT shape

The combat SSOT should be a **thin workflow registry/orchestrator**, not a giant new combat rules engine.

Suggested future files for Phase 1B:

```text
scripts/engine/combat/workflow/combat-workflow-registry.js
scripts/engine/combat/workflow/combat-context-builder.js
scripts/engine/combat/workflow/combat-action-normalizer.js
scripts/engine/combat/workflow/combat-workflow-result.js
```

Naming can change, but the responsibilities should stay thin.

## What the aggregator owns

The aggregator owns:

1. accepting a combat action request from any sheet/app/macro;
2. resolving the action record from `CombatActionsMapper` or actor-owned action data;
3. normalizing the action record into one shape;
4. building a shared context object;
5. asking `ActionEngine`/policy/persistence to preview or spend action economy;
6. routing to the registered subsystem authority;
7. preserving context into the result;
8. returning a structured result to the UI/chat layer.

The aggregator does **not** own:

- attack math;
- damage math;
- full-attack sequencing;
- feat/talent attack-option rules;
- ammo accounting;
- Second Wind rules;
- grapple rules;
- healing/repair rules;
- actor mutation;
- Foundry document writes;
- map/LoS/AoE automation.

## Proposed high-level flow

```text
UI click / macro / actor action
  -> CombatWorkflowRegistry.execute(actor, actionId, options)
      -> CombatActionNormalizer.resolve(actionId, sourceData)
      -> CombatContextBuilder.build(actor, actionRecord, options)
      -> ActionEngine.preview/consume + ActionEconomyPersistence.commit
      -> registered workflow handler
      -> structured CombatWorkflowResult
  -> UI/chat renders result
```

## Proposed registered workflow handlers

| `resolutionMode` | Registered handler | Existing authority to use |
|---|---|---|
| `attack` | `AttackWorkflow` | Roll Configurator V2 + `rollAttack()` + `CombatOptionResolver` |
| `fullAttack` | `FullAttackWorkflow` | `FullAttackExecutor` |
| `damage` | `DamageWorkflow` | `rolls/damage.js`, `DamageResolutionEngine`, `DamageEngine`, `ActorEngine` depending phase |
| `combatState` | `CombatStateWorkflow` | `CombatStatusResolver`, Modifier/Effect systems, action economy |
| `secondWind` | `SecondWindWorkflow` | `SecondWindRules` / `SecondWindEngine` |
| `grapple` | `GrappleWorkflow` | `SWSEGrappling` |
| `aidAnother` | `AidAnotherWorkflow` | skill/attack roll systems + GM-assisted pending bonus later |
| `skillAction` | `SkillActionWorkflow` | skill roll/use systems |
| `healRepair` | `HealingRepairWorkflow` | HealingRules/HealingMechanics/ActorRepairEngine |
| `ammoReload` | `AmmoWorkflow` | `AmmoSystem` |
| `reaction` | `ReactionWorkflow` | ReactionEngine/ReactionRegistry |
| `manual` | `ManualActionWorkflow` | chat card/reminder; no fake automation |
| `reference` | `ReferenceActionWorkflow` | rule card only; usually no action spend unless source says so |
| `actorItem` | `ActorItemWorkflow` | SpeciesActivatedAbilityEngine, PoisonEngine, actor.useAction fallback |

## Minimal normalized action record

The action record should preserve source fields and add safe derived defaults.

```js
{
  id: "burst-fire",
  key: "burst-fire",
  name: "Burst Fire",
  sourceType: "combatAction|feat|talent|item|skillUse|actorFlag|fallback",
  actionCost: { standard: 1, move: 0, swift: 0, fullRound: false, reaction: 0, free: false },
  actionType: "standard",
  resolutionMode: "attack",
  executable: true,
  manualResolution: false,
  gmManaged: false,
  automationBoundary: "automate|assist|gm",
  spendAction: true,
  contextTags: ["burstFire", "ranged", "weaponMode:autofire"],
  requiredContext: ["weapon", "autofireCapable", "burstFireFeat"],
  resources: [{ type: "ammo", amount: 5, gatedBy: "trackBlasterCharges" }],
  ruleData: {},
  sourceDocumentId: null,
  sourcePath: null,
  uiHint: null,
  raw: {}
}
```

## Minimal combat context record

This is the data object that prevents context loss.

```js
{
  actor,
  sourceActor: actor,
  target: null,
  action: {},
  weapon: null,
  attack: {
    mode: null,
    isArea: false,
    isAutofire: false,
    isBurstFire: false,
    isFiringIntoMelee: false,
    isAiming: false,
    isCharging: false,
    maneuver: null,
    rangeBand: null,
    defense: "reflex"
  },
  damage: {
    packets: [],
    crit: false,
    hit: null,
    natural1: false,
    natural20: false,
    areaHitState: null
  },
  resources: {
    ammoCost: 0,
    enforceAmmo: false,
    reloadAvailable: false
  },
  states: {
    apply: [],
    consume: [],
    expire: []
  },
  economy: {
    cost: {},
    preview: null,
    spent: false
  },
  automationBoundary: "automate",
  gmNotes: [],
  source: {
    sheet: null,
    element: null,
    rollDialog: null
  }
}
```

## Phase 1B implementation boundaries

Phase 1B should **not** fix every combat rule. It should only create the road.

Allowed Phase 1B changes:

- Add registry/context/action-normalizer files.
- Make character sheet combat action click path call the registry for a narrow set of actions.
- Preserve mapper fields.
- Make registry return structured results.
- Keep existing behavior behind registered handlers.
- Add safe fallbacks to avoid breaking current play.

Do not implement yet:

- full damage packet model;
- complete Burst Fire/Autofire damage semantics;
- grapple rewrite;
- stun/ion packet application;
- ammo UI pills;
- gear consumption;
- healing/repair overhaul;
- recurring Fire/Acid hazards.

## Suggested Phase 1B first slice

1. Create `CombatWorkflowRegistry` with `register()` and `execute()`.
2. Create `CombatActionNormalizer.normalizeAction()`.
3. Register handlers for:
   - `manual`
   - `reference`
   - `fullAttack`
   - `attack`
   - `skillAction`
   - `actorItem`
4. Keep handlers as wrappers around existing sheet methods/subsystems at first.
5. Update `CombatActionsMapper._normalizeAction()` to preserve future-critical fields.
6. Route only the character sheet combat action row path through the registry.
7. Leave direct attack buttons and other sheets alone until the registry proves stable.

## Why this is safe

This approach uses every existing subsystem:

- existing data stays the action inventory;
- existing action engine remains action-economy authority;
- existing roll dialog remains player-input authority;
- existing attack roller remains attack-math authority;
- existing option resolver remains feat/talent authority;
- existing full attack executor remains multiattack authority;
- existing damage engines remain damage/mutation authorities;
- existing ammo/healing/grapple systems remain specialized authorities.

The only new authority is the missing one: workflow routing and context preservation.
