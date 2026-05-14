# Species Phase 6: Activated Species Abilities

This phase makes species-granted active abilities ingestible by the actor as `combat-action` items and routes those items through `SpeciesActivatedAbilityEngine`.

## Actor ingestion

`SpeciesGrantLedgerBuilder` populates `ledger.activeSpeciesAbilities[]` from canonical species traits. `applyCanonicalSpeciesToActor` now materializes each ledger entry as an actor-owned `combat-action` item with stable species flags:

- `flags.swse.isSpeciesAbility`
- `flags.swse.speciesGranted`
- `flags.swse.sourceSpecies`
- `flags.swse.sourceTrait`
- `flags.swse.speciesAbilityId`
- `system.executionModel = species-activated-ability`
- `system.speciesAbility = <structured ability profile>`

`CombatEngine.executeAction` now resolves `item:<id>:use` keys and sends species action items to `SpeciesActivatedAbilityEngine.use(actor, item, options)`.

## Implemented automated handlers

### Ithorian Bellow

- Standard action.
- Rolls `1d20 + character level` against Fortitude.
- Base damage is `3d6` sonic and half damage on a miss.
- `Devastating Bellow` raises base damage to `4d6`.
- Variable-power slider supports extra dice.
- Without `Strong Bellow`, default use costs one condition-track step and each extra die costs one more.
- With `Strong Bellow`, default cost is zero and the maximum extra dice rises to `+6d6`.

Damage is posted to chat for selected targets. Area damage is intentionally not auto-applied until the area-damage pipeline has a safe target/application seam.

### Yarkora Confusion

- Standard action, once per encounter by data.
- Rolls Deception against each selected target's Will Defense.
- On success, creates a real ActiveEffect named `Confused`.
- The effect flags the target as not threatening squares and as mind-affecting.

### Caamasi Pacifism

- Standard action.
- Rolls Persuasion against one selected target's Will Defense.
- On success, applies one non-physical condition-track step immediately.
- Also creates a short ActiveEffect marker for mind-affecting/language-dependent provenance.

This is intentionally shaped as the reusable basis for future Adept Negotiator-style talent automation.

### Falleen Pheromones

- Standard action.
- Rolls `1d20 + character level + Charisma modifier` against one selected adjacent target's Fortitude Defense.
- On success, applies one non-physical condition-track step.
- On failure, marks the target as immune to that Falleen's pheromones for 24 hours.
- The effect is flagged as an inhaled poison.

### Clawdite Startle

- Reaction action item.
- Rolls Deception against the selected attacker's Will Defense.
- On success, applies a `Startled` ActiveEffect with a `-5` next-attack penalty flag.
- The item is flagged with trigger metadata (`when-attacked`) so a later reaction-window pass can auto-surface it when the attack pipeline opens reaction prompts.

### Clawdite Shapeshift / Metamorph

- Full-round action.
- Creates a timed ActiveEffect for `+10` species bonus to Deception checks made to disguise appearance.
- Duration is Constitution score rounds.
- If the actor has `Metamorph`, prompts for appearance-only, one-step smaller, or one-step larger.
- Metamorph applies size, Reflex, Stealth, carrying-capacity, Damage Threshold, and reach flags/changes where schema seams exist.

### Aleena Energy Surge

- Swift action.
- Duration is Constitution modifier rounds, minimum one.
- Creates a timed ActiveEffect for +2 Dexterity-based checks/attacks and raises base speed toward 8 squares.
- Stores an expiration flag for the persistent condition-track aftereffect.

### Felucian Force Blast

- Racial combat action, not a Force-suite power.
- Rolls `1d20 + Charisma modifier` without requiring Force Sensitivity or trained Use the Force.
- Uses the Force Blast DC table:
  - 15: `2d6`
  - 20: `3d6`
  - 25: `4d6`
  - 30: `5d6`
- Optional Force Point damage bonus adds half heroic level.

## Remaining seams

- Bellow area damage still posts chat results rather than applying HP damage automatically.
- Energy Surge stores the persistent-aftereffect flag; a turn/expiry hook should consume it when duration expires.
- Startle is now a reaction action and has trigger metadata, but automatic reaction-window presentation depends on a future attack-pipeline/reaction pass.
- Other species powers remain case-by-case candidates.
