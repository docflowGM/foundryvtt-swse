# Clone Wars Campaign Guide Feat Implementation Readiness Report

Checked: 2026-06-30T15:58:58.027Z

## Summary

- Feats audited: 20
- Review entries: 15
- Errors: 0
- Warnings: 0

## Status Counts

- implemented_correct: 5
- implemented_partial: 15

## Review Queue

- Artillery Shot: implemented_partial — Needs area-template/targeting workflow support; cannot be considered runtime-correct yet.
- Coordinated Barrage: implemented_partial — Requires Aid Another/ally-count/margin-over-Reflex damage rider workflow.
- Droidcraft: implemented_partial — Needs Mechanics/Repair Droid action timing display or GM workflow hook.
- Experienced Medic: implemented_partial — Correct as metadata but not an automated Treat Injury procedure workflow.
- Expert Droid Repair: implemented_partial — Needs Mechanics/Repair Droid procedure workflow support.
- Flash and Clear: implemented_partial — Needs hit-resolution effect application and expiry tracking.
- Flood of Fire: implemented_partial — Needs target-defense component suppression in the attack resolution path.
- Grand Army of the Republic Training: implemented_partial — Needs defense calculator integration and tooltip/breakdown parity.
- Gunnery Specialist: implemented_partial — Needs vehicle role context, proficiency override, and reroll lifecycle tracking.
- Jedi Familiarity: implemented_partial — Needs Force power/talent target event, ally validation, damage/CT exclusion, once-per-encounter tracking, and temp FP expiry.
- Leader of Droids: implemented_partial — Correct implementation is a targeted effect prompt, not passive math.
- Overwhelming Attack: implemented_partial — Needs action economy and negation-attempt integration.
- Spray Shot: implemented_partial — Needs autofire targeting/template integration.
- Unwavering Resolve: implemented_partial — Needs social-skill attack/defense workflow or Will defense contextual resolver.
- Wary Defender: implemented_partial — Needs Fight Defensively state/effect lifecycle and defense breakdown support.

## Errors

- None

## Warnings

- None
