# Phase 9G — KOTOR Feat Implementation Accuracy

This phase audits **Knights of the Old Republic Campaign Guide** feats separately from Jedi Academy Training Manual because the KOTOR feat set has several complicated action economy, implant, droid, reaction, and attack-option feats.

The audit asks whether each feat is implemented with the **correct runtime shape**, not whether the feat merely exists or has metadata.

## Accuracy standard

- `implemented_correct` means the implementation mode matches the source behavior.
- `implemented_partial` means useful metadata or rule shape exists, but the runtime hook, picker, duration, trigger, or usage tracking is not proven.
- `implemented_incorrect` means the code grants the wrong shape of benefit.
- Static bonuses are not acceptable substitutes for attack options, reactions, action economy rules, or chosen-weapon restrictions.

## KOTOR summary

- Total feats audited: 20
- Implemented correct: 6
- Implemented partial: 14
- Review list entries: 14

## High-confidence correct implementations

The current audit marks these KOTOR feats as correctly shaped because their `abilityMeta.rules` line up with the combat option resolver:

- Critical Strike: attack_option
- Flurry: attack_option
- Improved Rapid Strike: attack_option
- Mandalorian Training: attack_option_rider
- Power Blast: attack_option_slider
- Sniper Shot: attack_option

## Main remaining implementation homes

- Attack/action economy cards: Accelerated Strike, Gearhead, Quick Skill.
- Reaction prompts: Conditioning, Republic Military Training, Sith Military Training.
- Droid workflows: Logic Upgrade: Self-Defense, Logic Upgrade: Tactician.
- Poison/implant engines: Poison Resistance, Implant Training.
- Movement/zone control: Increased Agility, Tumble Defense, Withdrawal Strike.

## Important note on Implant Training

The catalog already contains correct suppression metadata for Implant Training. It is only marked partial here because the uploaded repo baseline used for this audit does not include the later ImplantRules runtime engine. If the implant phases are merged, this feat should be promoted to `implemented_correct` after the audit is updated to detect `scripts/engine/implants/ImplantRules.js` and the Will/condition-track hooks.
