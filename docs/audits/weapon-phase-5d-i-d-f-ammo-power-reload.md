# Phase 5D-I-D-F -- ammunition, power sources and reloading

Policy: `docs/architecture/swse-automation-authority.md`. Matrix and manifest: `docs/audits/weapon-phase-5d-i-d-coverage-matrix.md`, `data/audits/weapon-phase-5d-i-d-input-manifest.json`.
Proof: `tests/weapon-phase-5d-i-d-f-ammo-power-reload.test.mjs` (real production paths: `rollAttack`, `AmmoSystem`, `FireStateStore`, the sheet reload workflow).
**Foundry smoke: NOT RUN.**

## Final disposition of the twelve entries

| Entry | Weapon(s) | Disposition | Existing authority / what was added |
|---|---|---|---|
| `capacityGrenades` | Micro Grenade Launcher | DUPLICATE (verified) | `ammo.capacityShots` = 4 -> resource resolver + the generated production projection AmmoSystem spends from |
| `oneShotCapacity` | Wrist Blaster | DUPLICATE (verified) | capacity 1; the second attack is refused |
| `singleShot` | Wrist Rocket Launcher | DUPLICATE (verified) | capacity 1 + `firingConstraints.reloadRequiredAfterEachShot` (fire-state) |
| `specialRateOfFire` | Sonic Disruptor | DUPLICATE (verified) | `firingConstraints` alternate rounds / cooldown 1 / max 1 / no multi-shot abilities |
| `powerLevelSwitchAction` | Variable and Heavy Variable Blaster | DUPLICATE (verified) | `modeProfiles[].switchAction` (swift) via the persistent-setting machinery; multipliers 1/5/10 and 1/10/20 |
| `requiresEnergyCell`, `requiresEnergyCells`, `requiresPowerPack`, `requiresPowerPacks` | 12 weapons | IMPLEMENTED | one reader, `power-source.js`; owned state via `FireStateStore.setPowerSourceState`; readiness note + weapon-card control |
| `secondCrewReloadAction` | E-Web Missile Launcher | IMPLEMENTED | `FireStateStore.reloadBySecondCrew` + the sheet reload workflow |
| `canSingleLoadShell` | Mortar Launcher | IMPLEMENTED | attack-shape `singleShellLaunch` + the weapon-granted "Single Shell" attack option (a FIRING mode) |
| `powerCordDisconnectRule` | Archaic Lightsaber | DATA_COMPLETENESS | the published text states no disconnect mechanic; nothing invented |

`powerLevelSwitchAction` was suspected to be an uncharged swift action. It is not: the swift is already charged once per change of level (free at the baseline and when unchanged; an unpayable switch refuses the attack and writes nothing). Verified by test, not assumed.

## Source rulings

* **Mortar Launcher -- Galaxy at War, printed p.40: SOURCE AMBIGUITY RESOLVED.** The published description supports both a five-shell magazine that automatically feeds successive shots and an alternative FIRING method: a single shell dropped down the open tube and launched by the electromagnet. `canSingleLoadShell: true` is canonical, not a data defect. It is a firing method, not a way to add to the magazine (a first implementation that added a round to the magazine was wrong and was replaced after review). The source states no separate action cost and no shell inventory, so none is invented: the player supplies the shell.
* **Archaic Lightsaber -- Jedi Academy Training Manual p.51.** The text states an external power cell worn on the belt or back, connected by a cord, and a special 600-credit power pack. It states no disconnect, cut or interruption rule: unresolved by design.

## New behaviour

* **Power source** (`requires*`): a *requirement*, not an ammunition cost. The readiness notes and the weapon card show "Requires 2 energy cells (not confirmed installed)". The player confirms installed / missing (owned Item state); only an explicit *missing* blocks the attack (before any cost); an unconfirmed source never blocks (unknown is not false). Nothing is consumed and no capacity or charge counter is invented.
* **Second-crew reload:** the Move action is charged to the supplied crew member through the existing action economy; the reload is `AmmoSystem.reloadWeapon` when ammunition tracking is on and the weapon has a pool, and otherwise just clears the awaiting-reload state (the untracked pool is never touched). No crew member is inferred; nothing is spent when none is supplied, the launcher is already loaded, or the action cannot be paid; a failed reload gives the action back. **While the gunner is in an active combat the crew member must be a combatant of that combat and their Move must really be recorded** (the action economy treats a non-participant as a free no-op, so this is enforced in the store, not only in the dialog); with no combat for the gunner the established out-of-combat policy applies. The sheet asks once, only for weapons that publish the alternative; "reload it myself" keeps the ordinary reload.
* **Mortar single shell:** a weapon-granted "Single Shell" attack option (a toggle in the attack dialog, offered only for weapons declaring `canSingleLoadShell`). An attack that asserts it draws nothing from the magazine and does not need one; ordinary shots still draw from the five-shell automatic-feed magazine; the option on any other weapon changes nothing.
* **Out-of-range distance (follow-up from the #1023 review):** a stated `distanceSquares` beyond every band of the selected form (including the Distant Discblade Throw pistol range) or an invalid distance is refused before any cost; an explicit band wins; no distance stated is unknown.

## Problems found

1. **Reload dead-end with ammunition tracking off (fixed).** The sheet reload workflow returned early when the optional tracking rule was off (the default), so a weapon *awaiting reload* (wrist rocket launcher, E-Web) could never be reloaded and stayed unfireable. Reload now resolves whenever a weapon is awaiting reload.
2. **Heavy Variable Blaster production projection (not changed).** The generated projection has `ammunition.max = 0` / `type: none`; the canonical record is a mixed 500-shot power pack + 2 syntherope lengths. AmmoSystem therefore never tracks its pack. This is a production-builder gap for `kind: mixed` resources, outside this pass; generated packs were not edited.
3. Six of the twelve power-source weapons are `unmapped::` identities; they work through the same reader.
