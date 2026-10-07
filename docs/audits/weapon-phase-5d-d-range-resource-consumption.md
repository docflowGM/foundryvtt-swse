# Phase 5D-D — Canonical Range + Ammunition/Resource Consumption

## 1-3. Baseline, branch, PR stack
* Baseline: Phase 5D-C head `ca956ec07` (PR #1008) ← 5D-B `6d2727b7f` (#1007) ← 5D-A `2c513c4` (#1006).
* Close-out at start: #1006/#1007/#1008 all open drafts, mergeable, "Rolling system validation" green on each head, no reviews or threads, nothing merged ⇒ no retargeting needed.
* Branch: `audit/weapon-phase-5d-d-range-resource-consumption` (from `ca956ec07`).

## 4. Files inspected
`range-resolver.js`, `resource-resolver.js`, `weapon-runtime-resolver.js`, `attack-consumer.js`, `attack-form-options.js`; `scripts/combat/rolls/attacks.js` (`rollAttack`, `computeFinalAttackComposition`, `rollFullAttack`),
`enhanced-rolls.js` (`rollAutofire`), `combat-roll-math.js`, `combat-stat-rules.js#getRangePenalty`, `combat-option-resolver.js` (Far Shot band adjustment),
`engine/inventory/ammo-system.js` (cost/preflight/spend/rollback), `full-attack-executor.js` + `character-like-sheet.js` (other AmmoSystem callers), `roll-config.js` (range chips, Range Band select, model/panel/wiring),
`weapon-range-profile-resolver.js`/`data/actor-weapon-ranges.json`, item-defaults/template (ammunition + range fields), the 5D-A/B/C tests, and the canonical range/resource facets of all 203 identities.

## 5. Pre-5D-D range path
The live attack penalty is **band-driven only**: the dialog's Range Band select (PB/Short/Medium/Long/Custom, identical for every weapon) → `getRangePenalty(weapon, context)` maps `short/medium/long` to −2/−5/−10, with an explicit `context.rangePenalty` **or the Item's `system.rangePenalty/currentRangePenalty`** taking precedence if finite. Item-level range data otherwise only fed the display chips
(`buildWeaponRangeProfile`). Nothing consulted the selected canonical profile: no per-band legality (`longAllowed:false`, `allowedBands`), no `shortPenaltyOverride`, and a melee profile of a ranged Item still showed ranged controls only through the 5D-B branch toggle.

## 6. Pre-5D-D resource path
Ammunition is **one counter per weapon** (`weapon.system.ammunition {type,current,max}`), tracked only when the house rule `trackBlasterCharges` is on. `AmmoSystem.resolveAmmoCost`: explicit cost > Burst (5) > Autofire (10) > **1 if the Item has a pool and looks ranged (Item heuristic)** > 0.
`rollAttack` spent action-option costs first, then ammo (`spendForWorkflow` = preflight + consume), rolling the action costs back if ammo failed. There are **no inventory ammunition items or per-payload stocks** in the live model.

## 7. Canonical range architecture
`canonical-range.js#resolveCanonicalRange(resolved, profile)` (via the existing `resolveRange`) attaches a **range facet** to the 5D-A runtime (so preview and roll share one resolution):
`status` = `melee` (no bands) / `banded` (band table, `allowedBands` = listed bands ∩ quality flags, optional `shortPenaltyOverride`, band squares) / `pending` (unresolved/conditional/fixed-area/fixed-maximum/host-inherited: no structured table).
The runtime answers *which* range definition applies; `getRangePenalty` still turns a band into a number: canonical banded facet → its table (+short override); melee facet → 0; `pending` → the unchanged generic band arithmetic (nothing invented). An explicit caller `rangePenalty` still wins; stale `system.rangePenalty/currentRangePenalty` is **ignored for canonical weapons** and honored for legacy ones.
A profile whose branch contradicts its own range mode throws `range-branch-mismatch` (never guessed); such forms are not offered by the 5D-B selector. A band the form forbids throws `range-band-not-allowed` at attack time (before any cost) and is not offered in the dialog (select options filtered; JS re-syncs on form change).
Dialog chips for canonical forms come from the facet (per-form chip sets toggled with the selection), never from Item range fields.

## 8. Canonical resource architecture
`canonical-resource.js#resolveCanonicalResourceCost(runtime,{damageMode})` returns `{status, units, resourceId, kind, ammoType, reason, source}`:
* `cost` — `profile.resourceConsumption` numeric `baseUnits×multiplier` (stun mode uses `stunUnits×multiplier`), else `resource.consumption.defaultUnitsPerAttack`, else `ammo.mode==='single'` ⇒ 1.
* `free` — melee form of a ranged weapon (a bayonet no longer spends rifle shots), or `resource.kind none`/self-contained.
* `untracked` — cost targets a secondary resource of a multi-resource weapon (Heavy Variable Blaster *ascension* → syntherope lengths): the single-counter model cannot represent it, so **nothing is spent** rather than debiting the power pack.
* `pending` — non-numeric/absent structured cost (autofire rule, null): the existing AmmoSystem rule applies unchanged.
`rollAttack` passes the units as `options.canonicalAmmoUnits`; `AmmoSystem.resolveAmmoCost` honors it only for ordinary attacks (explicit cost, Burst, Autofire keep priority). AmmoSystem still performs the spend/rollback.

## 9. Spending mutation point
Single point: `AmmoSystem.spendForWorkflow` inside `rollAttack`'s try/rollback block (one call site). New order: canonical resolve → damage-mode + range-band validation → **non-mutating ammo preflight** → attack-option action costs → the single ammo spend → roll. An invalid canonical form, a forbidden band, or insufficient ammunition for the *selected form's* cost now returns before any mutation (previously insufficient ammo spent then rolled back the action costs). Preview/model/recompute call no spend API (tested + source guard).

## 10. Selected-form persistence
Unchanged 5D-C mechanism (`weaponForm` in the workflow context); range facet and resource units are re-derived from the same resolved form at attack time, never stored separately, so preview, spend, retained card and damage cannot diverge.

## 11. Payload / ammunition identity
Canonical data defines **one resource per weapon** (Wrist Rocket: `wrist rockets`, shared by all 7 payloads) and the live model has one counter per weapon, so there is no per-payload inventory identity to match; selecting payload A while consuming payload B cannot happen, and the payload is validated and persisted. `acceptedAmmoIdentities` is empty for all 203 weapons (no canonical ammunition item identities exist). No second ammo registry or name adapter was created.
Remaining seam (data-model, not canonical data): per-payload stock/inventory ammo items.

## 12. Ammunition-dependent damage integration
Revisited the 5D-C deferrals. **Wrist Rocket** (payload damage) already resolves via payload selection. **Grenade Launcher** (`damageSource: loaded-ammo`, no payload list) and **Micro-Grenade Launcher** (single textual payload "Selected grenade damage − 2 dice") depend on *which grenade is loaded*, which the live ammo counter and canonical structure do not represent ⇒ they stay `deferred` with the explicit reason `loaded-ammo-identity-unavailable` (was a generic `damage-mode:*`). Not forced into ordinary damage.

## 13. Legacy compatibility
No canonical identity ⇒ unchanged: Item range fields, `system.rangePenalty`, Item-looks-ranged ⇒ 1 shot, Burst/Autofire rules. Tracking off ⇒ nothing spent.

## 14. Fail-closed behavior
Invalid identity/profile/configuration/mode/payload (5D-A/B/C), `range-branch-mismatch`, `range-band-not-allowed`: no roll, nothing spent. A canonical ranged form with no structured band table is *not* an error: it uses the generic arithmetic (documented `pending`).

## 15. All-203 census (256 offered forms; deterministic, derived from the runtime, asserted in the test)
* Range facet: melee 107, banded 138, pending 11 (Bowcaster `unresolved`, Energy Ball `conditional`, Flamethrower `fixed-area`, 5 `fixed-maximum` (Venom Spit, Ascension), Electronet/Neural Inhibitor/Wrist Rocket host/payload-inherited).
* Resource: free 127, cost 1 → 108, cost >1 → 5 (Variable Blaster medium ×5 / high ×10, Heavy Variable medium ×10 / high ×20, Double-Barreled double-shot ×2), untracked 4, pending 12.
* Payload weapons 2 (offered with >1 payload) · mode-dependent forms 28 · configuration forms 17 · configuration-varying resource cost: **0**.
* Ammunition-dependent damage still deferred: Grenade Launcher primary, Micro-Grenade Launcher primary (×2 configurations).
* Contradictory profiles: **Darkstick `thrown`** and **Static Pike `thrown`** (schema branch `melee`, range mode `ranged`).

## 16. Representative weapon tests
Stun Baton (melee, free), Blaster Pistol (banded, cost 1), Gungan Electropole (cross-branch), Siang Lance (melee bayonet free / ranged cost 1), Vibrobayonet (configuration), Variable Blaster (modes 1/5/10), Double-Barreled Carbine (×2), Bluebolt (stun 2), Heavy Variable Blaster (untracked secondary), Rotary Blaster Cannon (pending autofire),
Wrist Rocket (7 payloads), Grenade/Micro-Grenade (deferred damage), a short-override profile and a no-long-band profile (found from the registry, not by name), Bowcaster (pending range), legacy homebrew, NPC flat.

## 17. DATA_DEFECT vs CONSUMER_DEFECT
* CONSUMER_DEFECTs fixed: range penalty ignored the selected profile's facet (and let stale Item `rangePenalty` override); ammo cost was always the Item heuristic (1), so Variable Blaster modes / double-shot / stun / bayonet forms spent the wrong amount; insufficient-ammo ordering.
* **Suspected DATA_DEFECT (not changed, needs primary-source ruling):** `unmapped::Darkstick/thrown` and `unmapped::Static Pike/thrown` have `schemaFamily.branch = melee` but `range.mode = ranged` (thrown). Expected by the "thrown" range family: ranged branch. No source/page evidence was gathered in this phase. Consumer behavior: these two forms are refused (and not offered); all other forms of both weapons work. Flipping the branch (or the range mode) in the canonical record would restore them; it was intentionally not edited here.

## 18. Automated results
New `weapon-phase-5d-d-range-resource-consumption.test.mjs` 21 checks (census; range ×6 scenarios; resource/ordering/payload/damage/config/regression; dialog wiring guard). Full rolling suite **327 passed / 0 failed** (326 after 5D-C + the new 5D-D test; 5 documented exclusions); 5D-A 14/14, 5D-B 14/14, 5D-C 10/10, 5D-D 21/21; registry/5B/5B-R `--check`s, validate-partials, validate-data, system.json pass.

## 19. Foundry manual smoke test — **NOT RUN** (headless session; do not treat as passed)
1. Normal melee weapon (Stun Baton): no Range Band, attack, ammo untouched.
2. Normal ranged weapon: Range Band offers PB/Short/Medium/Long; attack with sufficient ammo ⇒ pool −1 once.
3. Cross-branch weapon (Electropole): select Thrown ⇒ Range Band appears with canonical chips; select Melee ⇒ band hidden, no range penalty.
4. Variable Blaster: select High ⇒ the dialog notes "Uses 10 shots per attack"; attack ⇒ pool −10 once.
5. Attack with insufficient ammo for the selected form (e.g. 3 shots, High) ⇒ refused, pool unchanged, no action-option cost spent.
6. Weapon with a restricted band (a profile with `longAllowed:false`): Long is not selectable.
7. Siang Lance bayonet attack ⇒ no ammo spent; ranged profile ⇒ −1.
8. Wrist Rocket: pick a payload, attack ⇒ one rocket spent; click Damage ⇒ that payload's damage.
9. Mode-dependent (Espo-500) and configuration-dependent (Vibrobayonet) weapons: switch forms, confirm preview and spend.
10. Legacy/homebrew weapon: normal attack, spends 1 via the old path. Reopen/re-render the dialog repeatedly ⇒ ammo never changes.

## 20. Remaining deferred
Autofire/Burst selected-form integration (`rollAutofire` still uses default form/cost; Burst/Autofire cost rule untouched, canonical `autofireUnits` unused) ; per-payload inventory/stock and canonical ammo identities; loaded-ammo-dependent damage (grenades); consumable/thrown items consuming themselves (`resource.kind consumable/single-use`: no quantity model, left as `free`/pending as-is);
multi-resource weapons (secondary resources untracked); `firingConstraints` (cooldown/alternating rounds/reload-after-shot); host-inherited ranges (Electronet); `rangeBand` auto-derivation from token distance (still a manual select); Far Shot interplay unchanged; damage multipliers/riders/effects; `damage-packet-rules`/`weapons-engine`/`multi-attack`/dual-wield proficiency readers.

## 21. Recommended Phase 5D-E scope
Special attack/effect consumption on the retained form (damage multipliers, rider components, stun/flash/toxin/venom/Pin/Trip, special payload effects, `conditionalModifiers`/`criticalEffects`). Then 5D-F: multi-attack / double weapon / dual wield / autofire (+ `firingConstraints`, `autofireUnits`) convergence, including the Darkstick/Static Pike data ruling if still open.
