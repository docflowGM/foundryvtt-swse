# KOTOR + Jedi Academy Feat Implementation Fit

## High-confidence implementation candidates

These feats are good candidates for existing or near-existing hooks:

- `Flurry`, `Power Blast`, `Sniper Shot`, `Improved Rapid Strike`, `Critical Strike`: attack-option/action-card workflow.
- `Implant Training`: implemented through `ImplantRules` when the implant phases are applied.
- `Fast Surge`: Second Wind action-cost metadata.
- `Gearhead`: skill-use timing metadata.
- `Logic Upgrade: Tactician`: Aid Another result hook.
- `Poison Resistance`: poison defense/damage mitigation hook.

## Requires runtime reaction/result context

These should not become static sheet bonuses:

- `Conditioning`
- `Republic Military Training`
- `Sith Military Training`
- `Unswerving Resolve`
- `Follow Through`
- `Tumble Defense`

They depend on a failed/successful attack, cover state, target state, mind-affecting/fear result, or movement result.

## Requires selected choice

These need persistent choice metadata and tactical validation:

- `Quick Skill`
- `Withdrawal Strike`
- `Relentless Attack`
- `Logic Upgrade: Self-Defense`

Do not automate them as global modifiers until the selected choice can be represented and validated.

## Force-context feats

These are correctly Force-contextual:

- `Force Regimen Mastery`
- `Keen Force Mind`
- `Intuitive Initiative`

`Force Regimen Mastery` should remain tied to a regimen picker/card model. It is not a static Use the Force modifier.

## Taxonomy warning

`Fast Surge` is intentionally **not** a Force feat. It has no Force prerequisite and its benefit modifies Second Wind action economy.
