# Equipment Ecosystem — E4-C1 WP5-C2 Checkpoint: Attack-Gate and Persistence Integrity Corrections (NOT CONVERGED)

**Phase:** WP5-C2 only — the five independent-review corrections (R1–R5) to WP5-C1. WP3-B, WP6–WP9, worn-weapon rules, mounted certification, homebrew authorization, the droid refactor and the PR merge were not started. No commits from PR #1057 were incorporated.
**Branch / PR:** `audit/equipment-ecosystem-e0-e1` / draft PR #1056 · **Starting HEAD:** `c0d534d30571074efa866d2d579c0077b45d9a91` (CI run 39295745461 passed). **Final HEAD:** see the PR (recorded in the final report).
**Statuses:** `IMPLEMENTED` + `OFFLINE_TESTED`; `RUNTIME_UNVERIFIED`; nothing `FOUNDRY_TESTED`. **NOT CONVERGED.**
**Rules register:** EQ-001, EQ-002, EQ-003 unchanged. **EQ-004 appended** (`DEFERRED_RULES_REVIEW`): operator authorization / crew eligibility for vehicle weapon attacks. No recommended ruling.

## R1 — Weapon document ownership
**Defect:** the gate located the owned Item with `i === weapon || i.uuid === weapon.uuid`, so a look-alike object sharing an owned Item's uuid passed readiness (judged on the real Item) while the look-alike's own data went downstream.
**Fix:** ownership is identity only (`i === weapon`). The authorized document is returned as `source`, so the Item evaluated for readiness is the exact Item whose data the attack uses. Id and uuid equality are not ownership.

## R2 — Virtual unarmed provenance
**Defect:** `isVirtualUnarmedAttack` trusted `flags.swse.virtual/unarmed` on any object that was not an owned Item, so a fabricated object (with any damage record) or another actor's strike was eligible.
**Fix:** the unarmed-attack authority (`unarmed-attack-helper.js`) now owns provenance. `buildVirtualUnarmedWeapon` registers every record it builds in a module-private `WeakMap`, bound to the actor it was built for and to a digest of its content. `isGenuineVirtualUnarmed(actor, weapon)` accepts only a registered, unaltered record for that actor. Fabricated markers, JSON/structured/spread copies, edited damage or flags, and cross-actor reuse are refused. `isVirtualUnarmedAttack` (readiness) delegates to it and keeps the "not an owned Item" rule.
**Preserved legitimate behavior:** Martial Arts, species, droid-appendage and unarmed-style calculations are untouched (the build body is unchanged). The Slammer attack used to `deepClone` the built strike and then edit damage and flags, which provenance correctly rejects; it now asks the authority for the variant in one step (`extraDamageDieSteps`, `flagMarks`, `attackOptions`), with the same die-step order (extra weapon dice first, then the Crush step) and the same resulting flags. The dead `cloneWeapon` helper was removed.
**Test correction:** `grapple-state-attack-penalty.test.mjs` reused one actor's virtual strike for a second actor; that is exactly the cross-actor reuse R2 refuses, so the test now builds each attacker's own strike. The assertion under test is unchanged.

## R3 — Vehicle routing is not installation certification
**Defect:** `verifiedVehicleInstallation` was named and reported as a verified installation. The router decides a math domain; the check proves only that a vehicle-type actor owns the Item.
**Fix:** renamed `routedVehicleWeapon`; the result path is `vehicle-routed-weapon` with `certification: 'routing-only'`. It additionally requires the exact vehicle-owned Item (identity), a distinct non-vehicle firing actor for the gunner domain, and the vehicle itself for the explicit abstract-crew domain. It does not claim installation, station assignment, operator authorization or crew eligibility, and **no vehicle-mount permission flag was added**. Established legitimate vehicle attacks are unchanged.
**Not implemented (rules decision):** requiring station assignment or crew eligibility would change which actors may attack. Recorded as **EQ-004** for the project owner.

## R4 — Readiness freshness across asynchronous boundaries
New `revalidateAttackSource(actor, weapon, options, boundary)` (the same gate, read live). Revalidation points:
* `rollAttack` (`attacks.js`): before the first expenditure (after selection, opportunity, target-side and special-question awaits); before ammunition payment (action spends rolled back on refusal); immediately before the dice (ammunition and action payments rolled back).
* `rollAttackAndDamageWithNarration`: before the first spend and before the dice, with the same rollbacks.
* `SWSERoll.rollAttack` / `rollAutofire`: after the dialog and pre-roll hook, before the Force Point prompt; `rollAutofire` also before its action spend and before the dice (action payment rolled back).
* `SWSERoll.promptForcePointUse` takes an optional `guard`; it runs after the player confirms and **before** the Force Point is rolled or spent (a refusal returns `null`).
* `SWSERoll.rollFullAttack`: the FINALIZED `config.attacks` (not only the overrides) is gated as a whole before the Force Point prompt and before any attack; the attack loop re-checks each attack's weapon before its roll. A source that stops being ready ends the sequence; attacks already rolled stand.

## R5 — FireStateStore persistence truthfulness
Field-scoped delta persistence (the WP5-C1 stale-grip correction) is unchanged. Persistence now has a three-valued outcome: `persisted` / `unchanged` (empty delta; the stored record already holds the state) / `failed` (the write failed or could not be attempted; the in-memory Item is untouched and `state` is the old record).
* Player-intent setters (`setStockState`, `setPowerSourceState`, `setMounted`, `setLoadedPayload`, `setConfiguration`, `recordCrewRegulation`, `resetUsage`, `primePreparedAttack`, strict mount/unmount/held-together/size) return `{ ok, persistence, state }`; a failed write is `ok:false, reason:'persist-failed'`.
* Action expenditure before a failed write is given back: `setStockState`, `setConfiguration`, `primePreparedAttack` roll back the paid action.
* `commitFired` (post-attack recording) stays **intentionally best-effort** and returns `{ outcome, persisted, state, bestEffort:true }`; the attack is never undone and the Item never claims an unstored record.
* `clearReload` returns `{ outcome, persisted, state }` (null when nothing awaited a reload). `reloadBySecondCrew` rolls back the crew action when the clear failed; the sheet no longer reports "reloaded" for an unrecorded clear; `AmmoSystem` logs an unpersisted clear.
* Not changed (documented): the sheet's reload spends its action through the sheet's own economy hook before the clear, which has no rollback handle; a failed clear now reports failure to the user but the action stays spent. `setMounted` answers inside an attack stay best-effort (the answer applies to that attack either way).

## Files changed
`scripts/combat/rolls/attack-readiness-gate.js`, `attacks.js`, `enhanced-rolls.js`; `scripts/engine/combat/unarmed-attack-helper.js`, `fire-state-store.js`; `scripts/engine/equipment/combat-readiness.js`; `scripts/engine/feats/grapple-feat-actions.js`; `scripts/engine/inventory/ammo-system.js`; `scripts/sheets/v2/character-like-sheet.js`; `tests/equipment-e4c1-wp5-c2-attack-integrity.test.mjs` (new); `tests/equipment-e4c1-wp5-c1-attack-gate-and-firestate.test.mjs`, `tests/grapple-state-attack-penalty.test.mjs` (adjusted); `docs/audits/swse-rules-decisions-pending.md` (EQ-004, revision 7); this document.

## Remaining certification debt (unchanged)
EQ-001 action cost; EQ-002 held-together model; EQ-003 worn/mounted model and the acceptance-debt manifest; EQ-004 vehicle operator authorization; WP3-B, WP6–WP9, droid refactor; Foundry runtime certification of everything above.
