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

## Second review: routing trust, spoofed mechanics, grant identity, and live vs dormant reachability

1. **Internal routing could be forged.** `_runCanonicalCombatAction` skipped its gate when `options.__combatWorkflowRouted === true`, a flag any caller could set. Trust is now held by identity of an options object the workflow module created (`markWorkflowRouted` / `isWorkflowRouted`, a private WeakSet in `combat-workflow-registry.js`): a literal flag, a copy of a marked object and a replayed one are not trusted, and an untrusted flag is stripped. No new eligibility calculator: the nested workflow call is simply not gated twice, as before.
2. **Authorising one key and running another.** The workflow normalizer takes `id` / `resolutionMode` / `ruleData` from the caller's `actionData`, so a legitimately unlocked key could carry another action's mechanics. The gate helper (`gateCombatActionRequest`, pure, testable without the sheet) now replaces `actionData` with the sheet-registered row (else the live row) for the authorised key; caller-supplied mechanics are discarded.
3. **`item:` grants.** Ownership of an arbitrary Item no longer suffices: the Item must satisfy `isActorCombatActionGrant` (type `combat-action` and the species/actor-ability flag or execution model), the same predicate the sheet now uses to register such actions (the inline copy was removed), and the key must be exactly `item:<id>:use`.

**Reachability: production-live vs dormant**

| Code | Status |
| --- | --- |
| Sheet runner (`_runCanonicalCombatAction`) and `CombatWorkflowRegistry` | live; gated |
| `combat-feature-legacy-action-bridge.js` (capture click on `swse-v2-use-action` rows named Double/Triple Attack) | live (registered at boot in `runtime-bugfix-hotfixes-init.js`); routes to the router, gated |
| `combat-feature-handlers.js` `executeCombatFeatureMultiattack` | live; gated |
| Hotfix delegate `executeMultiAttackFromElement` | live-registered; shadowed on concept rows by the bridge, which is registered first and stops propagation; guarded anyway |
| Hotfix `executeCombatOptionAttackFromElement` (Power Attack, Flurry, ...) | live; no gate needed: the option resolver only honours options from owned abilities |
| Hotfix `dedupeAndGateCombatActions` | registered, inert (acts on `.combat-action-row`, which no rendered template emits) |
| `FullAttackExecutor`, `SWSEGrappling` | live; independent boundaries (legal plan required; feat or weapon-form entitlement) |
| `CombatExecutor.executeAttack` | dormant (imported by the sheet, only `executeInitiative` is called) |
| Legacy `character/v2` and `droid/v2` combat partials | dormant (not rendered by the concept sheet) |

Live Foundry v13 verification is still outstanding, including a click-through of the legacy bridge and the hotfix delegate against a real sheet.

## Deferred work (TODO)

### LOW PRIORITY — DEFERRED: hardening of the combat-action gate against hypothetical adversarial JavaScript (P4)
- **What:** the routing-trust marker (`markWorkflowRouted` / `isWorkflowRouted`, a module-private WeakSet) and the gate helper (`gateCombatActionRequest`) are not designed to withstand code that imports those internals directly, replays a trusted options object it obtained from inside a workflow handler, or is a deliberately malicious Foundry module.
- **Why it is deferred:** it concerns hypothetical adversarial JavaScript, not ordinary gameplay. Any module that can run script inside the Foundry client can already modify actors directly; the gate protects the normal paths (sheet buttons, stale sheets, macros that call the sheet runner with ordinary or accidentally wrong data, the Double/Triple Attack router and legacy bridge). Normal Foundry ownership and permission enforcement is unchanged.
- **Genuine limitation (not exaggerated):** trust is by object identity inside one JavaScript realm. It stops accidental and casual misuse (forged flags, copied options, wrong `actionData`), not a determined script author.
- **Action:** none planned. No further spoofing tests or abstractions will be added for this. Revisit only if a concrete operational problem is demonstrated.

### Other follow-up (optional, not merge blockers)
- Dead CSS in `styles/sheets/v2-concept-sheet.css` (`swse-concept-ae-*`, old attack-card sub-elements, `combat-row*`, `initiative-command*`): needs a runtime check before removal.
- The inert name-based hotfix gating (`dedupeAndGateCombatActions`) and its droid-only feat-name list, pending CAE-003.
- Dormant legacy partials under `character/v2` and `droid/v2` (combat tab and actions panels) and `CombatExecutor.executeAttack`.
- NPC tab Action Library; Droid integrated-part attack cards.
- A "before" screenshot set (only after-state harness shots exist).

## Acceptance status (final pass)

**Environment:** no Foundry VTT v13 runtime exists in this environment (no Foundry install, no licensed server), so live Actor/ApplicationV2 click-through testing could **not** be performed and is **not** claimed. What was verified instead is below; what needs manual Foundry testing is listed after it.

| Acceptance item | How verified | Where |
| --- | --- | --- |
| General actions present for organic, Droid and NPC-droid actors | runtime test over the real pack rows | `combat-action-eligibility.test.mjs` (1) |
| Feat action absent before / present after / gone after removal; disabled feat grants nothing; same-named different-identity feat does not unlock | runtime tests | `combat-action-eligibility.test.mjs` (2, 9), `...-coverage.test.mjs` (1) |
| Talent actions follow the same contract; passive riders not listed as actions | runtime tests | eligibility tests (6, 9), library test (25) |
| Organic gets no Droid-only action; Droid and NPC-type Droid Follower do (Droid rules profile); contradictory evidence fails closed; a name is not evidence | runtime tests | eligibility tests (7, 8) |
| Installed-component actions need operable ledger hardware; draft / item-only / missing hardware grant nothing | runtime tests against the production gate | eligibility tests (13, 14) |
| Double/Triple Attack refused without the feat (router, hotfix path via shared helper), still available with it | runtime test (router), helper + planner tests, existing 5D-F multi-attack suite | `...-coverage.test.mjs`, `weapon-phase-5d-f-multiattack-convergence.test.mjs` |
| Unresolved evidence never executable and stays visible with its reason | runtime tests; register CAE-001/003 | eligibility tests (15, 16) |
| Unlocked-but-spent action stays visible and disabled with the economy reason | library test | eligibility tests (24) |
| Layout order, one library, no duplicate rows/cards, variants kept, My Actions default, All Rules non-executable, search/filter/sort/reset | template + view-model tests, browser-harness screenshots (1100 / 720 / 380 px) | `combat-tab-ux-contract.test.mjs`, `docs/audits/combat-tab-ux/` |
| Primary weapon Roll button reachable without scrolling | harness: y≈184 px (desktop), ≈224 px (phone) | screenshots |
| Equipment and Combat previews agree; Roll uses the same authority | parity tests against the real `rollAttack` / `rollDamage` | `combat-loadout-preview.test.mjs`, `combat-tab-ux-contract.test.mjs` (B) |
| Ready / held / unavailable weapons, Unarmed card, NPC statblock rows preserved, no fabricated Items | view-model tests | `combat-tab-ux-contract.test.mjs` (B, D) |

**Exact-head CI (4dd13d0ed), verified from the workflow check runs:** Rolling system validation: success; targeted (Droid V2 Gate A): success; provenance: success; native-vehicle-packs (Universal Vehicles QA): success. #1141 head `383a0536c` and #1140 head `4ea9d3469` are unchanged since their green runs.

**Still requires manual Foundry v13 testing:** Characters A–D click-through (Organic Soldier gaining a feat; Jedi lightsaber one-/two-handed numbers and Equipment/Combat parity, readiness and activation; Droid with installed components and multiple manipulators; NPC/Follower statblock rows and permissions); executing a normal attack, unarmed attack, a permitted feat action, a permitted talent action, a blocked action, Double/Triple Attack with and without entitlement, a grapple action, a combat-status change, and action-economy spending; and the legacy multi-attack bridge and hotfix delegate against a real sheet.
