# SWSE Combat Phase 0J - Healing Implementation Boundary Recommendations

Audit-only recommendations. No runtime code was changed.

## Primary recommendation

Do not model healing as only "negative damage." SWSE has too many separate recovery concepts:

- ordinary organic HP healing
- droid/object/vehicle repair
- bonus hit points
- drain damage that heals the attacker
- condition-track recovery
- persistent condition removal
- death/revivify state changes
- medpac/gear consumption
- downtime/rest workflows

The shared low-level mutation can still be `ActorEngine.applyHealing()` or a future `ActorEngine.applyRecoveryPacket()`, but the upstream workflow must carry the rule source and target kind.

## Suggested future foundation

Create one context builder for healing and one for repair.

### Healing workflow context

```js
{
  workflow: "first-aid",
  actorId: "medic-id",
  targetId: "target-id",
  targetKind: "organic",
  skill: "treatInjury",
  dc: 15,
  checkTotal: 23,
  success: true,
  actionCost: "full-round",
  duration: "full-round",
  amountFormula: "targetLevel + margin",
  amount: 9,
  requiresGear: ["medpac"],
  consumesGear: ["medpac"],
  cooldown: "firstAid24h",
  selfApplied: false,
  selfPenalty: 0,
  gmManaged: false
}
```

### Repair workflow context

```js
{
  workflow: "repair-droid",
  actorId: "mechanic-id",
  targetId: "droid-id",
  targetKind: "droid",
  skill: "mechanics",
  dc: 20,
  checkTotal: 27,
  success: true,
  actionCost: "downtime",
  duration: "1-hour",
  amountFormula: "droidCharacterLevel",
  amount: 7,
  requiresGear: ["tool-kit"],
  consumesGear: [],
  removesPersistentConditions: true,
  selfApplied: false,
  selfPenalty: 0,
  gmManaged: true
}
```

## Gear stance

Because gear is currently nominal, the next implementation should not block all healing if a medpac item is missing unless the GM enables gear consumption.

Use three levels:

1. **Strict gear tracking enabled**
   - Require item possession.
   - Consume single-use Medpac.
   - Decrement Medical Kit uses if the item tracks uses.

2. **Nominal gear mode**
   - Show requirement reminder.
   - Let GM/player confirm the item is available.
   - Do not mutate inventory.

3. **No gear enforcement**
   - Do not block.
   - Still show rule text in chat cards.

## Target-type stance

Healing and repair workflows should gate before mutation:

| Target type | Organic healing | Mechanics repair | Natural healing | Second Wind |
|---|---:|---:|---:|---:|
| Organic creature | Yes | No | Yes if alive/no persistent | Yes if heroic/allowed |
| Droid | No | Yes | No | Only if explicit feat/rule path allows |
| Vehicle | No | Yes | No | No |
| Object/device | No | Yes | No | No |
| Biotech/living vehicle | Special Treat Injury/biotech rules | Special | Usually GM-managed | Usually no |

## Phase split recommendation

1. Healing foundation/context builder.
2. Second Wind cleanup and legacy path deprecation.
3. Treat Injury executable workflows.
4. Mechanics Repair executable workflows.
5. Gear requirement/consumption stubs.
6. Natural Healing and rest RAW/houserule split.
7. Bonus HP canonical model.
8. Force healing and drain-heal packet routing.
9. Medical/repair feat/talent hooks.
10. UI: Combat tab, Gear tab, GM Recovery console, Summary tab status.

## Hard boundaries

Keep these GM-managed unless later requested:

- Was the surgery uninterrupted?
- Did Revivify occur within one round of death?
- Did the table actually consume the medpac when gear tracking is off?
- Was a vehicle in a proper facility or field repair context?
- Which exact persistent condition came from which disease/poison/radiation source when historical source data is missing?
