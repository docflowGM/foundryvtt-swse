# Phase F Character Sheet Action Economy Report

Repo: `C:\Users\Owner\Documents\GitHub\foundryvtt-swse`

## Applied

- Inserted action economy helper methods into character-sheet.js
- Patched _runCanonicalAttack to enforce/consume action economy
- Patched _runCanonicalCombatAction to enforce/consume action economy
- Expanded action economy selector to include roll-attack and swse-v2-use-action

## Warnings

- None

## Verify Next

- roll-attack consumes/enforces standard action economy in combat
- swse-v2-use-action consumes/enforces according to action cost/type when available
- combat action cards consume/enforce according to action cost/type when available
- action economy hover/binding behavior recognizes roll-attack and swse-v2-use-action buttons
- if action economy modules are unavailable at runtime, sheet behavior should gracefully continue without hard failure