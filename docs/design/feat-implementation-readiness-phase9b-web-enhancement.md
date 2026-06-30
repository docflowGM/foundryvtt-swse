# Phase 9B: Web Enhancement Feat Implementation Accuracy

This phase audits the feat implementation accuracy for **Saga Edition Web Enhancement 1**, specifically **Tech Specialist**.

The goal is accuracy, not speed. Tech Specialist is not a passive feat; it is a procedure/workbench feat. A correct implementation must model the modification workflow and target-specific effects rather than simply granting a flat bonus.

## Source behavior being audited

Tech Specialist lets a Mechanics-trained hero modify a device, armor, weapon, droid, or vehicle so it gains one listed special trait. The workflow includes:

- prerequisite gate: trained in Mechanics
- target selection: device, armor, weapon, droid, or vehicle
- upfront modification cost: one-tenth target cost or 1,000 credits, whichever is more
- modification time: 1 day per 1,000 credits of modification cost
- DC 20 Mechanics check
- no Take 10 and no Take 20 for the base feat
- failure loses spent credits and applies no trait
- success applies the selected trait
- Mechanics-trained helpers can assist and reduce time proportionately
- modified market value equals base cost plus double the modification cost

## Current implementation read

The current repo has a substantial `TechSpecialistModificationService` used by customization apps. That is a strong foundation and should not be treated as absent.

However, the audit marks the feat `implemented_partial` rather than `implemented_correct` because the following still need verification or cleanup:

- catalog source attribution currently appears as Core Rulebook rather than Web Enhancement 1
- at least one listed Tech-tier trait, `Additional Upgrade Slot`, is not part of the Web Enhancement 1 Tech Specialist table and needs source separation or review
- downtime, helper assistance, and market-value recalculation are not proven as enforced runtime workflows
- Signature Device / Take 10 handling must be verified so the base Tech Specialist feat still obeys the no Take 10 / no Take 20 rule
- every mutation kind needs targeted tests for final derived math and tooltip/breakdown parity

## Implementation accuracy principle

`implemented` is not enough. Tech Specialist is correct only if the implementation shape matches the source procedure. A customization UI that charges credits and applies some traits is partial until every source-critical step and all derived effects are verified.

## Outputs

- `data/feat-implementation/web-enhancement-feat-implementation-backlog.json`
- `data/feat-implementation/web-enhancement-feat-implementation-review-list.json`
- `scripts/dev/audit-web-enhancement-feat-implementation-readiness.mjs`
- generated reports under `docs/audits/generated/`

No feat mechanics are changed in this phase. This is a correctness audit and backlog phase.
