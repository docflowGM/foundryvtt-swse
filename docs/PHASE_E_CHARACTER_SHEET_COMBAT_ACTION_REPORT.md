# Phase E Character Sheet Combat Action Report

Repo: `C:\Users\Owner\Documents\GitHub\foundryvtt-swse`

## Applied

- Added CombatEngine import
- Inserted canonical combat action wrapper
- Patched combat action card/table handler to canonical combat action wrapper
- Patched swse-v2-use-action handler to canonical combat action wrapper

## Warnings

- None

## Verify Next

- clicking a combat action card routes through _runCanonicalCombatAction
- clicking swse-v2-use-action routes through _runCanonicalCombatAction
- if CombatEngine.executeAction succeeds, dialog fallback should not open
- if CombatEngine.executeAction fails, CombatRollConfigDialog should still open as compatibility fallback