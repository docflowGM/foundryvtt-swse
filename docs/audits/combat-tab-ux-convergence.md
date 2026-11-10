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

- **Droid-only / unlock-only gating:** now handled by the eligibility module (below); no longer a gap. The name-based hotfix gating remains in `combat-ui-behavior-hotfix.js` but is inert on every rendered markup (see "Hotfix status").
- Removed the dead `.swse-concept-attack-card` rewrite loop (and its two helpers) from the hotfix; the cards now come from the preview.
- Dead CSS in `styles/sheets/v2-concept-sheet.css` (`swse-concept-ae-*`, old attack-card sub-elements, `combat-row*`, `initiative-command*`) was NOT removed in this pass: selectors are shared with unrendered legacy copies and need a runtime check first.
- NPC tab has no Action Library (no verified player/GM permission split for NPC actions).
- Droid integrated parts are not carded. Unreferenced candidates for later pruning: v2-concept `combat-stats-panel.hbs`, `special-combat-actions-panel.hbs`; unrendered `character/v2` and `droid/v2` `tabs/combat-tab.hbs`.
- Live Foundry V13 verification has not been done (screenshots come from the Handlebars + Chromium harness, not Foundry).

## Combat Action Eligibility and Unlock Convergence

Three things are kept apart: **discovery** (the catalog lists it), **eligibility** (the actor earned it) and **availability** (economy, resources, grapple, context right now).

`scripts/engine/combat/features/combat-action-eligibility.js` (pure) returns `{state: unlocked|locked|unresolved, entitlement[], basis[], missing[], unresolved[], reason, execution:{allowed, reason}}` per row. It composes existing authorities: owned feat/talent items (the Ability resolver already emits cards only for owned items), `resolveDroidRulesProfile` (follower/NPC droids included; contradictory evidence fails closed), `authorizeDroidComponentOperation` (installed hardware ledger), and the resolver's own resolved-choice predicate. Catalog rows are read ONLY from structured fields (`requirements`, `requiredContext`, `restriction`); target/state preconditions ("already Grappled", "Target is Pinned") are context, not entitlement.

| Row origin | Entitlement |
| --- | --- |
| catalog (`combat-actions` pack / JSON) | general unless a structured feat / talent / Droids-only / trained-in requirement is present |
| ability (owned feat/talent card) | the owned item; structured `requiresDroid` on its rule locks it for non-Droids; an unresolved required choice blocks execution |
| actor-item (species / actor ability) | the owned `combat-action` item |
| combined feat | derived live only when every feat is owned |
| component | installed, operable hardware (no producers yet; contract and tests only) |
| anything else / unrecognised structured requirement | UNRESOLVED (fail closed, reported) |

**Presentation.** The library defaults to **My Actions** (unlocked + unresolved-disabled). **All Rules** is a reference browser that adds locked actions with their prerequisites and no Use control. Spent actions stay visible and disabled. Passive riders are never listed. Scope, tabs, search, sort are DOM-only.

**Execution boundary.** `_runCanonicalCombatAction` re-derives the action from the LIVE actor and catalog by key (`authorizeCombatActionExecution`) before any workflow; a stale sheet, macro, or hand-built `actionData` cannot bypass it, and unknown keys fail closed. Defect found and fixed with a failing test first: `executeCombatFeatureMultiattack` (Double/Triple Attack router, also the legacy click bridge) replaced an illegal plan with `fallbackMultiAttackPlan`, so an actor without the feat could run the sequence; the fallback now applies only when the multi-attack authority confirms the entitlement.

**Data.** `packs/combat-actions.db` Feign Haywire gained the structured `restriction: "Droids only"` (its notes and the JSON catalog already said so). `CombatActionsMapper` now passes `requirements` through (it was merged into `requiredContext`).

**Classified catalog (49 pack actions, organic actor):** 43 general; entitlement-gated: Burst Fire, Crush Pinned Opponent, Pin Grappled Opponent, Throw Grappled Opponent (Throw + Trip), Trip Grappled Opponent, Feign Haywire (Droids only). None unresolved. Eligibility not established (recorded in the register): CAE-001 Treat Poison (prose-only), CAE-002 GM override, CAE-003 cyborg-hybrid / droid-only feat cards without a structured link.

**Hotfix status** (`combat-ui-behavior-hotfix.js`): replaced at the data level and covered by permanent tests: gating of Pin, Trip, Throw, Crush Pinned Opponent, Feign Haywire. Still present, unreplaced: the name-based droid-only list for feat names (Distracting Droid, Sensor Link, Erratic Target, Link, Shield Surge, Logic Upgrade, Droid Shield Mastery) because those feats carry no structured action-card link (CAE-003). The hook only acts on `.combat-action-row`, which no rendered template emits, so it is inert; it was not removed in this pass.

## Eligibility coverage audit (follow-up to review of bc21161f0)

**Execution entrypoints (reachability).** Pinned by `tests/combat-action-eligibility-coverage.test.mjs`:

| Path | Boundary |
| --- | --- |
| Sheet buttons, rows, `combat-ui.js`, macros calling the sheet runner | `_runCanonicalCombatAction` first-entry gate (live re-derivation by key). `CombatWorkflowRegistry` is only called from that method, after the gate; nested/routed calls come from the registry's own handlers. |
| Combat Features router / legacy click bridge (Double/Triple Attack) | `executeCombatFeatureMultiattack`, gated by `actorEntitledToMultiAttackPackage` (new, in `multi-attack.js`, the multi-attack authority) |
| Hotfix multiattack delegate (`executeMultiAttackFromElement`) | **second bypass found and fixed**: it had its own `fallbackMultiAttackPlan` that made any actor with a ready weapon legal; now guarded by the same helper. Every `fallbackMultiAttackPlan(` call site in the codebase is asserted to be guarded (a new unguarded route fails the test). Covered by a source-contract test and by the helper's behavioral test; the hotfix delegate itself is not driven headlessly. |
| `FullAttackExecutor` | requires `plan.legal` from `buildFullAttackSequence` (no fallback plan) |
| Pin / Trip / Throw / Crush | independent second boundary inside `SWSEGrappling` (feat or a weapon-form entitlement); tested to refuse without the feat |
| Attack-option features (Power Attack, Flurry, ...) via the router | no entitlement gate needed: `CombatOptionResolver` only sees options from OWNED abilities, so a forced option adds no math (tested); the result is a normal attack |
| Tracked active states (Rage, Braced, ...) | display-only flags; tested that only the Combat Features display modules read them |
| `CombatExecutor.executeAttack` | legacy plain attack roll from an actor flag; not called by the sheet; grants no feat/talent action |

**Ownership is identity-first** (a defect in the first version: it matched by name). It now uses `featIs` from the ability identity authority, the rule the grapple and multi-attack authorities use: a same-named item with a different canonical identity never satisfies a requirement; the name is the fallback only for an item with no canonical identity; a disabled ability is not owned.

**Action sources crosswalk.** Every `registerAction` call states its origin (5 sites, asserted). The 263-entry feat/talent catalog: an actor owning nothing receives none; for each of 260 distinct required feat/talent items an owner receives only that item's cards, unlocked, and a copied key is refused for any other actor. 3 catalog entries (`defensive-fighting`, `total-defense`, `skill-focus`) have no required feat/talent and are never emitted by the resolver (unreachable). Metadata-defined cards, combined-feat cards and species/actor-ability items follow ownership and are re-derived live at execution.

**Weapon-granted entitlement (Amphistaff whip form).** The grapple authority lets a weapon form entitle Pin/Trip without the feat. That entitlement travels through the weapon-control workflow (`weaponEntitlement`), not through a library action, so the library correctly shows these actions as locked for a character without the feat and the weapon path is untouched.

**Actor-flag-defined actions.** No code writes `flags.*.combatActions`; the sheet only read it, merged into the action data. It is not a registered extension interface, so such keys are refused (asserted). If an extension interface is wanted it should register through the catalog / a granting item.

**Rulings.** CAE-001/002/003 stay `DEFERRED_RULES_REVIEW`. The reviewer's recommendations (Treat Poison: require skill training and an equipment prerequisite once a Medical Kit authority exists, show unresolved meanwhile; GM override only as an explicit attributable workflow; Droid feat cards from the Droid rules profile, feat ownership and structured metadata, no cyborg assumption) are provisional and are not implemented as rulings.
