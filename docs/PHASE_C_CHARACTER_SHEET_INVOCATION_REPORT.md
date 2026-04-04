# Phase C Character Sheet Invocation Report

Repo: `C:\Users\Owner\Documents\GitHub\foundryvtt-swse`

## Applied

- Inserted canonical invocation wrappers into character-sheet.js
- Patched initiative click handler to unified canonical wrapper
- Patched 2 skill call site(s) to canonical skill wrapper
- Patched 2 attack call site(s) to canonical attack wrapper
- Patched extra skill use handler to canonical execution wrapper

## Warnings

- None

## Verify Next

- roll-initiative and roll-initiative-take10 both work from the character sheet
- roll-skill and .skill-roll-btn both hit the same path
- roll-attack and .attack-btn both hit CombatExecutor
- execute-extra-skill-use no longer increments system.skills.*.extra
- if SkillUseFilter.rollSkillUseApplication does not exist in your repo build, the wrapper will fall back to rollSkillCheck with skillUse metadata