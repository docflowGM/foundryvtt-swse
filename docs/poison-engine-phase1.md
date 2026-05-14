# Poison Engine Phase 1

This pass adds a reusable PoisonEngine foundation for SWSE hazards, species riders, weapon-applied toxins, and future poison talents.

## Added foundation

- `scripts/engine/poison/poison-definitions.js`
- `scripts/engine/poison/poison-registry.js`
- `scripts/engine/poison/poison-engine.js`
- `packs/poisons.db`

The engine handles poison attacks against Fortitude while ignoring equipment Fortitude, damage reduction, and shield rating. It blocks nonliving targets, droids, vehicles, poison-immune actors, and inhaled/atmosphere poisons when the target has a functional breath mask or equivalent environmental gear.

## Supported poison shapes

The poison pack includes the indexed poisons provided in this session, plus the Mantellian Savrip natural poison rider and Malkite Techniques poison profile.

The poison data records:

- challenge level
- keywords
- delivery method
- trigger
- attack bonus or formula
- defense
- damage formula
- condition-track movement
- recurrence
- treatment DC
- special consequences

## Runtime support

`PoisonEngine.applyPoison(...)` resolves the initial poison attack and stores an active poison instance when recurrence is needed.

`PoisonEngine.tickPoisons(...)` resolves recurring poison attacks at start-of-turn hooks for active poison instances.

`PoisonEngine.treatPoison(...)` clears active poison instances when the appropriate treatment succeeds.

`CombatEngine.resolveAttack(...)` now calls the poison rider hook after damage is applied, so Mantellian Savrip natural weapon poison can trigger only after a natural weapon actually damages a living target.

## Talent-ready hooks

The Malkite profile includes extension points for:

- Modify Poison
- Numbing Poison
- Undetectable Poison
- Vicious Poison

The engine already applies Vicious Poison attack bonuses, Undetectable Poison treatment DC increases, and Numbing Poison's denial flag when those talents are present. Modify Poison still needs UI for selecting an alternate delivery method.

## Remaining seams

- Full automatic weapon-poison application needs an inventory/action flow for coating a weapon and consuming poison doses.
- Daily recurrence for Falsin's Rot is represented in data but not scheduled by an in-world calendar yet.
- Sith Poison recurrence on Force Point spend is hook-ready via `swse.forcePointSpent`, but the Force Point spending sites still need to emit that hook consistently.
- Special end-track results such as immobilized/blinded/limb loss are flagged for GM/UI handling, not fully enforced.
