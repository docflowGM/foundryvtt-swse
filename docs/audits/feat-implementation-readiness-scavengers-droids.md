# Phase 9E — Scavenger's Guide to Droids Feat Implementation Accuracy

This audit checks the **17 Scavenger's Guide to Droids feats** for implementation accuracy, not mere metadata presence.

## Standard

A feat is marked `implemented_correct` only when the observed runtime shape matches the source-derived rule behavior.

Examples:

- A droid special attack must be an action/attack workflow, not a flat bonus.
- A shield feat must interact with the Shield Rating workflow, not normal defense math.
- A condition-track feat must hook damage-threshold/condition movement with the correct exclusions.
- A Force Point reaction does not make a feat a Force feat.

## Results

- Feats audited: 17
- implemented_correct: 2
- implemented_partial: 7
- not_implemented: 7
- metadata_correct: 1
- source_review_required: 0
- Review queue: 15

## Correct today

- **Ion Shielding**: metadata-driven damage rule is consumed by damage resolution and caps ion-damage CT movement to one step.
- **Logic Upgrade: Skill Swap**: selected non-Use the Force skill is consumed by derived skill training logic.

## Key backlog themes

- Attack-option feats such as **Aiming Accuracy** have metadata but need action timing/target persistence verification.
- Shield feats such as **Droid Shield Mastery** and **Shield Surge** need shield/SR workflow integration.
- Droid special attacks such as **Slammer** and **Tool Frenzy** need action cards and temporary/rider effects.
- Grapple feats such as **Pincer** need a proper grapple/pin workflow before they can be automated correctly.
