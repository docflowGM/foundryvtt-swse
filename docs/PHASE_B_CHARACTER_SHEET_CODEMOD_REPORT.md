# Phase B Character Sheet Codemod Report

Repo: `C:\Users\Owner\Documents\GitHub\foundryvtt-swse`

## Applied Changes

- `C:\Users\Owner\Documents\GitHub\foundryvtt-swse\scripts\sheets\v2\character-sheet.js` — Added rollSkillCheck import
- `C:\Users\Owner\Documents\GitHub\foundryvtt-swse\scripts\sheets\v2\character-sheet.js` — Added SkillUseFilter import
- `C:\Users\Owner\Documents\GitHub\foundryvtt-swse\scripts\sheets\v2\character-sheet.js` — Normalized JS roll-weapon-attack action strings (1 replacements)
- `C:\Users\Owner\Documents\GitHub\foundryvtt-swse\scripts\sheets\v2\character-sheet.js` — Normalized JS take10-initiative action strings (2 replacements)
- `C:\Users\Owner\Documents\GitHub\foundryvtt-swse\scripts\sheets\v2\character-sheet.js` — Normalized JS use-extra-skill action strings (1 replacements)
- `C:\Users\Owner\Documents\GitHub\foundryvtt-swse\scripts\sheets\v2\character-sheet.js` — Rerouted swseRollInitiative to CombatExecutor.executeInitiative (1 replacements)
- `C:\Users\Owner\Documents\GitHub\foundryvtt-swse\templates\actors\character\v2\partials\attacks-panel.hbs` — Normalized attack action name (1 replacements)
- `C:\Users\Owner\Documents\GitHub\foundryvtt-swse\templates\actors\character\v2\partials\initiative-control.hbs` — Normalized take-10 initiative action name (1 replacements)
- `C:\Users\Owner\Documents\GitHub\foundryvtt-swse\templates\actors\character\v2\partials\skills-panel.hbs` — Normalized extra skill use action name (1 replacements)
- `C:\Users\Owner\Documents\GitHub\foundryvtt-swse\templates\actors\character\v2\partials\resources-panel.hbs` — Normalized resources-panel take-10 initiative action name (1 replacements)

## Warnings

- None.

## Skipped

- None.

## Next Manual Verification

- Confirm character sheet click routing still enters the correct switch/case handlers.
- Confirm roll-attack buttons still open any expected pre-roll dialog before execution if that behavior is intended.
- Manually wire execute-extra-skill-use to ExtraSkillUseRegistry -> SkillUseFilter -> SkillEnforcementEngine -> rollSkillCheck.
- Then repeat the same codemod strategy for droid/npc/vehicle sheets.