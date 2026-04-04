# Phase G.2 Attack Contract Report

Repo: `C:\Users\Owner\Documents\GitHub\foundryvtt-swse`

## Applied

- Patched mirrorAttacks(actor, system) to emit normalized rich attack entries

## Warnings

- None

## Verify Next

- system.derived.attacks.list now contains normalized rich attack entries
- attack entries expose attackTotal, damageFormula, critRange, critMult, breakdown.attack, breakdown.damage, weaponProperties, tags, ammo, actionType, and sourceType
- attacks panel renders richer weapon data without needing further template changes
- click handlers from earlier phases still execute through CombatExecutor