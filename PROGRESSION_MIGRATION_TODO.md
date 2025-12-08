# SWSE Progression Migration TODO
This file lists files modified automatically and items that require manual attention.

## Automatic actions performed
- index.js: no matches
- scripts\hooks\ui-hooks.js: no matches
- scripts\apps\chargen-init.js: no matches
- scripts\apps\chargen-improved.js: commented 2 lines
- scripts\apps\chargen-abilities.js: missing
- scripts\apps\chargen-narrative.js: no matches
- scripts\apps\chargen\chargen-templates.js: commented 2 lines
- scripts\apps\levelup\levelup-class.js: commented 1 lines
- scripts\apps\levelup\levelup-talents.js: no matches
- scripts\apps\base\swse-application.js: no matches
- scripts\apps\base\swse-form-application.js: no matches
- scripts\canvas-ui\canvas-ui-manager.js: commented 2 lines
- index.js: inserted progression-engine import

## Manual follow-up (high priority)
- Review every commented-out actor.update(...) or direct actor.system.* write. Replace with appropriate calls to ProgressionEngine:
  - ProgressionEngine.applyChargenStep(actor, stepId, payload)
  - ProgressionEngine.applyLevelUp(actor, { classId, level, selections })
  - ProgressionEngine.applyTemplateBuild(actor, templateId, options)
- Implement the full rule set in scripts/progression/data/progression-data.js (HP, talents, feats, prerequisites, backgrounds, classes).
- Replace any UI DOM-driven data writes (style/innerText changes used to store progression state) with engine calls and flags saved to actor.system.progression.
- Create full Applications/HBS for the chargen multi-step, template quick-build, and level-up UI using the files in scripts/progression/ui/.
- Run migrations/migrate-actors-to-progression.py (inspect outputs) to update repo JSON actor exports.
- Test thoroughly in a development world: template builds, normal chargen, level-ups, partial edits from the sheet.
