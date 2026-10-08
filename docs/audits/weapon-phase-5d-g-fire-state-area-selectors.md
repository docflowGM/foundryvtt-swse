# Phase 5D-G — Fire state, area shape, canonical ability selectors

Branch `audit/weapon-phase-5d-g-fire-state-area-selectors`, based on merged `main`. One draft PR against `main`. 5D-H is not included.

## 1. Merged-main baseline
`main` = `a671b7c467d4c6d3484bffd9b647fe7d798299f2` (5D-A…5D-F merged). Full rolling suite on merged main: 331 passed / 0 failed / 5 documented exclusions.

## 2. Stack merge result
Normal merge commits (no squash / rebase), strictly in order, each next PR retargeted to `main` first:

| PR | Merge SHA |
|----|-----------|
| #1006 (5D-A) | `4045a2d0888b8fc2527203cebb675fff83ab4435` |
| #1007 (5D-B) | `2c12c898456b0570539461a6ce37fb4e21155b59` |
| #1008 (5D-C) | `a9ea2daebaa33e14b4639c48a64964e943a8ee4e` |
| #1009 (5D-D) | `234d316ff59f1dce2ebfeca19b84edca57a09802` |
| #1010 (5D-E) | `7ba978ac507bc2e2e7e206c20685101fc18656cb` |
| #1011 (5D-F) | `a671b7c467d4c6d3484bffd9b647fe7d798299f2` |

## 3. Deleted branches
**Not deleted.** `git push origin --delete <branch>` failed for every target with `fatal: the remote end hung up unexpectedly` (claude/phase-5d-a-proficiency-5sift7, audit/weapon-phase-5d-b…-f, and the stray `audit/weapon-phase-5d-a-runtime-consumption`). No MCP delete-branch tool exists in this session; the proxy status showed nothing fixable. Needs manual deletion (or a retry from an environment with branch-delete permission). Unrelated audit branches were not touched.

## 4. Heavy Assault Blaster ruling
Legacy Era Campaign Guide table lists Rate of Fire **A**. **No data defect.** Single-fire is refused (`attack-shape-illegal`, `autofire-only`), autofire works, d10→d12 critical intact. Other autofire-only forms (7 in the census) were rechecked and agree with their published rate of fire.

## 5. Selector migration
New `weapon-runtime/ability-selector.js`: `canonicalFeatSlug` (from a `feat::…::slug` identityKey, or talent `flags.swse.id` `swse.talent.<slug>`), `featIs`, `abilityChoiceMatchesWeapon` (true/false for canonical weapons, `null` for legacy → legacy fallback).
- Weapon Focus / Weapon Specialization (scoped resolver, gate classifiers, Weapon Finesse detection) decide by canonical identity + structured stored choice joined to the SELECTED form's proficiency group / exact exotic identity. Display name is display-only; the name parenthetical is only consulted when no structured choice exists.
- **CONSUMER_DEFECT fixed:** Weapon Specialization ships as a *talent*, but the scoped resolver scanned only feats, so its +2 never applied. It now scans feat + talent. An item that carries its own data-driven damage modifier is not double-counted (same guard as Weapon Focus).

## 6. Remaining legacy fallbacks
Used only when the weapon has no canonical identity (homebrew/legacy): name/choice-text matching. Census: 12 canonical-capable selectors vs 27 + 13 legacy text rule features in packs (not migrated; deferred).

## 7. Temporal architecture
`weapon-runtime/fire-state.js` (pure). Families: per-round-limit, cooldown, alternate-round, reload-required, post-shot-reset, ability-triggered-reset, prepared-required. Constraints are derived from the selected canonical form; nothing temporal is stored in the registry.

## 8. Owned-state storage
`engine/combat/fire-state-store.js`; state at `flags.swse.fireState` on the owned weapon Item, written through `ActorEngine.updateOwnedItems`. Keyed to `combatId` so a new encounter inherits nothing.

## 9. Combat clock
`game.combat` only when started, round ≥ 1 and the actor is a combatant. With no combat: no round is invented; round-based families (per-round-limit, cooldown, alternate-round) are not enforced; state-based families (reload, resets, preparation) still apply.

## 10. Reload / reset
Reload-after-each-shot sets `needsReload`; the existing `AmmoSystem.reloadWeapon` clears it (also on the already-full early return). Readiness is independent of the ammunition pool.

## 11. Sidearm Pistol
`operation.rapidShotReset.requiredActionBeforeNextShot: swift` + relation `TRIGGERS_SWIFT_RESET_BEFORE_NEXT_SHOT` → firing with Rapid Shot sets `resetPending`; the next shot auto-pays a swift action through `ActionEconomyConsumption`; no reset if Rapid Shot was not used.

## 12. Fail-before-spend
`rollAttack` / `rollAutofire` evaluate readiness first; a blocker returns before any action, ammo or roll. Required actions are paid via action economy with rollback combined with the option spend. Preview (`computeFinalAttackComposition().readiness`) is non-mutating. State is committed only after the attack resolves.

## 13. Area architecture
`weapon-runtime/area-shape.js` resolves kind/geometry from the selected payload ?? profile `area` + `attackResolution`. No new AreaAttackEngine: the shape sets existing `attack.isArea` / `ruleData.areaAttack` / `halfDamageOnMiss` (only for onMiss `half-damage`; unspecified miss rules are not invented). Damage uses the selected form's area (a single-target profile of an area weapon is not an area attack).

## 14. Selected-form propagation
Shape is carried in the workflow `attackShape.area` (serializer whitelist). Autofire against N targets keeps form, fire mode, `autofire-area` shape and per-target hit; later damage uses the originating form.

## 15. Resource spending
One ammunition expenditure per area/autofire attack regardless of target count.

## 16. Sith Lanvarok range
`operation.rangeTreatedAs: Pistol` now has a consumer in `canonical-range.js`: mapped to the canonical range family, validated against the profile range block; mismatch → `RANGE_FAMILY_MISMATCH`.

## 17. Census
`tools/census-weapon-fire-state-area-selectors.mjs` → `data/audits/weapon-phase-5d-g-attack-form-census.json` (203 identities, 265 forms).
- Area: single 227, area-unspecified 10, burst 11, splash 4, cone 3, blast 2, square 2, other 2, adjacent 1, autofire-area 1, cloud 1, rectangle 1.
- Fire modes: single 238, single+autofire 20, autofire-only 7.
- Temporal: none 242, per-round-limit 20, reload-required 11, alternate-round 3, post-shot-reset 2, prepared-required 2, ability-triggered-reset 1.

## 18. DATA_DEFECT findings
None changed (canonical data untouched). Completeness issues, reported not mutated: 10 area-enabled forms with no geometry (frag/thermal/stun/ion/remote grenades, adhesive, cryoban, flamethrower, blaster cannon, repeating carbine).
Canonical fields still without consumers: Bryar pistol/rifle optional `preparedAttack`; subrepeating `braceRule`; weapon-ability relations other than PROHIBITED, EXTRA_ATTACK_PENALTY, REMOVE_RAPID_STRIKE_ATTACK_PENALTY, TRIGGERS_SWIFT_RESET_BEFORE_NEXT_SHOT.

## 19. Focused tests
`tests/weapon-phase-5d-g-fire-state-area-selectors.test.mjs` — 17 grouped checks covering the 32 required points (selector identity, temporal, area shape, remaining findings, census).

## 20. Validation
Rolling suite 332 passed / 0 failed / 5 excluded; `node --check` on changed modules; `validate-partials`, `validate-data`, `system.json` parse; census `--check`; authority-classification rebuilt.

## 21. Foundry smoke checklist (NOT RUN)
- Fire a crossbow twice in one round; reload; fire next round.
- Disruptor pistol across consecutive rounds in a live combat.
- Sidearm Pistol with Rapid Shot, then fire again (swift auto-paid).
- Splash/burst weapon miss vs hit against several targets; wrist-rocket payload switch.
- Autofire at four targets; one ammo spend.
- Weapon Specialization talent with a Pistols choice on pistol vs rifle.

## 22. Deferred
Geometry for the 10 area-unspecified forms; Bryar prepared attack and subrepeating brace consumers; migrating the legacy text rule features; remaining ability relations.

## 23. Next subphase (5D-H proposal)
Consume remaining executable fields without consumers, fill area geometry via source review, and migrate legacy text-rule features to canonical identity.
