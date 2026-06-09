# Combat Phase 0B Addendum — Fight Defensively / Total Defense

**Scope:** audit only. No runtime files changed.

## RAW baseline supplied during 0B

- Fight Defensively is a **Standard Action**.
- It applies `-5` to attack rolls and grants `+2` dodge Reflex until the start of the next turn.
- If trained in Acrobatics, the Reflex bonus is `+5` instead.
- If the character chooses to make no attacks until the next turn, Total Defense grants `+5` dodge Reflex.
- If trained in Acrobatics, Total Defense grants `+10` dodge Reflex instead.

## Current accounting

| Layer | Finding | Severity |
|---|---|---:|
| `data/combat-actions.json` / `packs/combat-actions.db` | Fight Defensively has mostly correct note text, but is classified as `compound`; current combat lanes do not render compound actions. | High |
| `scripts/combat/combat-status.js` | Defense resolver hardcodes `+2` for fighting defensively and `+5` for full defense. It does not check Acrobatics training. | High |
| `scripts/combat/active-effects-manager.js` | Active effect definitions hardcode the same `+2/+5` values and do not check Acrobatics training. | High |
| `scripts/sheets/v2/character-sheet.js` attack-dialog route | Preroller Fight Defensively only spends action economy when the houserule mode is `swift`; RAW default does not visibly spend the Standard action in this route. | High |
| `scripts/components/combat-action-bar.js` | Separate quick-action path has a default Standard cost and a Swift houserule, but no Move-action houserule option. | Medium |
| `scripts/houserules/houserule-settings.js` | Existing setting choices are `default`, `rai`, and `swift`; user wants eventual house-rule support for Move or Swift cost. | Medium |
| `data/feat-combat-actions.json` | Legacy `defensive-fighting` and `total-defense` entries conflict with RAW values and should be reconciled before exposing them as executable actions. | High |

## Audit conclusion

Fight Defensively is not just a UI toggle. It crosses action routing, action economy, combat status, defense math, feat/talent activation, and houserule settings. Later implementation should choose one SSOT for the declared mode and compute the Reflex bonus from the actor's Acrobatics training state.

Recommended future phase placement:

- **Phase 1:** routing contract and action cost modes.
- **Phase 8:** defense-state persistence and Acrobatics-based bonus calculation.
- **Phase 10:** UI labels explaining RAW vs house-rule action cost.
