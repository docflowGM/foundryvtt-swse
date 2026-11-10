# Combat Tab UX Convergence

Branch `claude/combat-tab-ux` (stacked on `claude/combat-loadout-preview`). Presentation and wiring only: no combat rule, formula, action cost or actor data shape changed.

## Layout, old vs new (v2-concept Character / Droid sheet)

| Old (top to bottom) | New (top to bottom) |
| --- | --- |
| Action Economy indicator, Initiative/vitals, Combat Status, Effective Defenses, Attacks (cards from `mirrorAttacks`, Item formula), per-lane Actions panels, Combat Actions panel (second browser), Combat Features | **1** Active Attacks (Combat Loadout Preview numbers) **2** Action Economy strip **3** Combat Status and Defenses (compact strip; cover, conditions, defense formulas in a closed `<details>`) **4** Combat Action Library (one browser, collapsed) **5** Advanced / Reference (Force Point, level up, Combat Features slot, notes) |

NPC / Follower sheets: Attacks card first, then Action Economy, then Condition Track and Defenses.

## Authorities reused (nothing new that owns a rule)

- Attack numbers: `buildLoadoutPreviews` (`combat/rolls/loadout-preview.js`), the same map the Equipment tab shows; it calls the production attack and damage authorities.
- Readiness: `readCombatReadiness` / `describeWeaponReadiness` (never `system.equipped`).
- Use action: existing `swse-v2-use-action` handler. Rolls: `roll-attack`, `roll-unarmed-attack`. Weapon operations: `toggle-weapon-readiness`, `toggle-activated`, `change-weapon-configuration`, `set-power-source`.
- New pure modules: `combat-action-identity.js` (dedupe rule), `combat-loadout-context.js`, `combat-action-library-context.js` (view models), `combat-tab-ui.js` (DOM-only tab/search/filter state on the sheet instance; never touches an actor).

## Duplicate action rows

Root cause: `registerAction` (character-like-sheet.js) pushed every row from four registries (combat-actions compendium, species abilities, feat/talent cards, combined-feat cards) unconditionally, and the key lookup was last-wins.
Rule (`combat-action-identity.js`): identity = key + lane + source item id + source action id. Names are never identity.

- same identity, same mechanical contract (cost, executable, spendAction, resolution mode, related skills): one row; the other source is recorded as `alsoFrom`.
- same identity, different contract: both kept, both flagged `identityConflict`, reported in `combatActions.diagnostics.conflicts`. No silent winner.
- same key, different identity: distinct variants, both kept, reported as `sharedKeys`.

## Retired (all references removed from `load-templates.js`; tests updated)

v2-concept `panels/`: `actions-panel`, `attacks-panel`, `combat-actions-panel`, `combat-status-panel`, `effective-defenses-panel`, `action-economy-indicator`. The shared `actors/shared/v2-concept/action-economy-indicator.hbs` is kept (vehicle sheet uses it).

## Not changed / known gaps (reported, not guessed)

- **Droid-only / unlock-only gating.** `scripts/patches/combat-ui-behavior-hotfix.js` `dedupeAndGateCombatActions` gated rows by name on `.combat-action-row`. No concept template ever rendered that class, so it was already inert on the concept tab; the Action Library therefore does not hide or gate any action. Which actions are droid-only or unlock-only is a rules-visibility decision and is left for the project owner; the library shows every registered row unchanged. (The inert name-based hook remains for the legacy markup.)
- Removed the dead `.swse-concept-attack-card` rewrite loop (and its two helpers) from the hotfix; the cards now come from the preview.
- Dead CSS in `styles/sheets/v2-concept-sheet.css` (`swse-concept-ae-*`, old attack-card sub-elements, `combat-row*`, `initiative-command*`) was NOT removed in this pass: selectors are shared with unrendered legacy copies and need a runtime check first.
- NPC tab has no Action Library (no verified player/GM permission split for NPC actions).
- Droid integrated parts are not carded. Unreferenced candidates for later pruning: v2-concept `combat-stats-panel.hbs`, `special-combat-actions-panel.hbs`; unrendered `character/v2` and `droid/v2` `tabs/combat-tab.hbs`.
- Live Foundry V13 verification has not been done (screenshots come from the Handlebars + Chromium harness, not Foundry).
