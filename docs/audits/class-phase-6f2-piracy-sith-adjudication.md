# Class Phase 6F-2 — Piracy GM advisory and Sith minimum DSP house rule

**Date:** 2026-11-02  
**Base:** merged `main` commit `62169f621e15409268ca8f91efd846a3a2c118d9`  
**Branch:** `feat/class-phase-6f2-privateer-piracy`  
**Status:** implemented as a separate draft PR; exact-head CI and live Foundry testing required.

## Player/GM policy decisions

1. **Master Privateer — Piracy (The Force Unleashed Campaign Guide p. 52):** the printed prohibition on further Master Privateer levels applies if a character is *lost to the dark side*. That is a narrative/table-state decision for the GM, not an automatic interpretation of any DSP threshold. The picker and finalizer display an advisory for an actor already owning Master Privateer levels. DSP saturation can inform discussion but **never automatically blocks class advancement**. The GM retains the authority to adjudicate what follows.
2. **Sith Apprentice / Sith Lord (Core Rulebook):** the project's chosen **house rule** sets the **numeric Dark Side Score requirement to at least 1**, replacing the printed requirement that DSP equal Wisdom. A DSP of zero fails the numerical check. Other requirements remain unchanged: minimum level, trained skills, feats, Force Technique for Sith Lord, and Sith membership as a GM-adjudicated table-state prerequisite.
3. **No global fallen-state inference:** a DSP threshold is not automatically equivalent to a story determination that a character has fallen. This policy is scoped to these class-feature and prestige-entry checks, and should guide later class-feature work involving falling.

## Implementation

- `scripts/engine/progression/utils/master-privateer-piracy-rules.js`: pure advisory helper; returns `blocked:false` for all DSP values; advisory only for further levels in an already-owned Master Privateer class.
- `scripts/engine/progression/prerequisites/class-prerequisites-cache.js`: retains the existing prestige eligibility result and appends Piracy advisory without changing the mechanical verdict.
- `scripts/apps/progression-framework/steps/class-step.js`: recalculates eligibility on commit rather than reusing stale browser cache; includes narrative advisory in class details/card model.
- `templates/apps/progression-framework/details-panel/class-details.hbs`: displays a separate **GM Adjudication** section; does not disable the Choose button.
- `scripts/engine/progression/validation/finalization-prerequisite-validator.js`: emits Piracy as a warning, not a finalization error.
- `scripts/data/prestige-prerequisites.js`: Sith Apprentice and Sith Lord structured and legacy DSP minimum set to `1` for the project rule.
- `scripts/data/prerequisite-checker.js`: uses 1 DSP for both Sith prestige class numerical checks rather than the old Wisdom/percentage world setting; other prerequisites are still evaluated.
- `data/prestige-class-prerequisites.json`: player-facing metadata labels this divergence as a house rule.
- `scripts/core/settings.js`: preserves the two old percentage-based world settings for compatibility but hides them from configuration because the project-specific class rule now uses 1 DSP. Existing stored settings do not override the new requirement.

## Tests / verification

- `tests/class-phase-6f2-master-privateer-piracy.test.mjs`: DSP saturation/non-saturation, missing score, first vs further class levels, and warning-only wiring.
- `tests/class-phase-6f2-sith-one-dsp.test.mjs`: both Sith entries, preserved other requirements, metadata, and prestige checking authority.

**Not yet certified:** live Foundry v13 display, actual prestige finalization, GM-facing warning visibility, or exact-head CI. This phase does not grant Force Disciple Prophet Destiny Points or automate any separate narrative consequences of a GM-declared fall.

## Next source-certified class feature candidate

**Force Disciple — Prophet (Core p. 215)**: at each Force Disciple level, receive two Destiny Points rather than the usual one; the extra point may be sacrificed immediately for a GM-authored prophetic vision, and the GM adjudicates eligible destiny changes. This requires a verified level-up Destiny economy and an explicit vision-choice/persistence path, not an automatic grant inferred merely from a class-feature Item.
