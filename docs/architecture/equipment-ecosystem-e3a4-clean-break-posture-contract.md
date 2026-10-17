# Equipment Ecosystem — E3-A4 Clean-Break Posture Contract

**OA-1: SUPERSEDED — CLEAN-BREAK POSTURE MODEL APPROVED** (owner decision, 2026-10-17)

**Branch / PR:** `audit/equipment-ecosystem-e0-e1` / draft PR #1056 · **Baseline HEAD:** `36d6efb55e99ff78a50b49aba44bb7c153d74000` (E3-A3 accepted, CI run 39053779906).
**Scope of this document:** the posture vocabulary, the owner's clean-break decision, the audited consumer inventory and cutover plan, and the persistence recommendation. Only the vocabulary module `scripts/engine/equipment/equipment-posture.js` is implemented. Nothing is persisted, no reader or writer was changed, and no live Foundry testing has occurred (everything runtime-facing is `RUNTIME_UNVERIFIED`).

## 1. Owner decision and what it supersedes

The owner approved a clean break from existing character equipment data. Existing testers will rebuild characters after the full implementation. Consequences:

- No old-character equipment migration and no compatibility aliases kept only for old saved characters.
- No dual-writing solely to preserve legacy behavior, and no permanent legacy weapon-posture alias authority.
- Competing weapon booleans must not remain long-term authorities; weapon posture ends with exactly one canonical persisted field.
- **This is not permission to leave application code broken.** `system.equipped` is read in 32 script files at this HEAD (10 files use `isItemEquipped`/`isAlwaysReadiedWeapon`); the cutover must migrate every reader and writer in one coordinated change.
- The published mechanics survive: Draw/Stow costs, Quick Draw, lightsaber activation/deactivation, Draw & Ignite, grip and size rules, Full Attack and dual-wield, reaction eligibility, body-armor exclusivity, energy-shield coexistence, natural and droid-integrated weapons, combat feats/talents, weapon modifications. They are re-pointed at the new posture authority, never recreated in the posture module.

**Supersession (referenced, not edited):** `docs/architecture/equipment-ecosystem-authority-contract-v1.md` §4.1/§4.2 (legacy `equipped` kept for old readers; OA-1 "not decided here"), the "legacy boolean kept for old readers" row of §3.3, and the OA-3 dual-write question are superseded by this document. An intermediate "Option A" proposal (`equipped: true` ⇒ `READIED` in a legacy view) was drafted and withdrawn before implementation; it is not adopted. The E1 document keeps its historical text.

## 2. Posture vocabulary (implemented: `equipment-posture.js`)

| Posture | Meaning | Occupancy |
|---|---|---|
| `STOWED` | not physically held for ordinary operation | none |
| `EQUIPPED` | physically held; its grip/configuration need not satisfy readiness; not automatically eligible for combat | at least one holding appendage (count decided by the occupancy and grip resolvers, not by the posture) |
| `READIED` | established, legal operating configuration; physical occupancy and grip verified | the appendages (or mount relationship) its configuration requires |

Kept separate and never conflated: physical holding, posture, grip selection, operating configuration, activation, combat permission. READIED never overrides attack eligibility, action economy or activation.

`projectEquipmentPosture({ posture })` accepts exactly `STOWED | EQUIPPED | READIED` (exact, case-sensitive), returns `declared | absent | invalid` with `posture: null` unless declared, never reads legacy fields (it lists those present as ignored), reports `declaredPhysicalHold` by declaration only, and always reports `verification: { physicalOccupancy, gripLegality, readiness }` as `unverified`. A declared READIED is therefore distinguishable from readiness verified by E3-A2/E3-A3. Absent or malformed input can never become READIED. The module has no imports, persists nothing and is not a second source of truth.

## 3. Recommended persisted location (requires owner approval — OA-2)

Requirement: one field that holds all three states, applies to **every** weapon (canonical, legacy/custom and lightsabers), is owned-item writable only through `ActorEngine`, has a default for newly created Items, and leaves armor/shield worn state alone.

| Option | Assessment |
|---|---|
| Reuse `system.equipped` with the enum | **Rejected.** `template.json:602` declares it a boolean; several readers coerce it differently (`=== true` in D14, `!== false` in D9/D11, `isTruthyEquipState` in D2/C2), so the string `'STOWED'` would read as "not false" in D9/D11 and silently count as wielded. It is also shared with armor/equipment/implants. |
| `flags.swse.fireState.posture` (FireStateStore) | **Rejected.** The store deliberately passes through legacy/custom weapons and canonical weapons with no temporal constraint (reads and writes nothing); posture must cover all weapons. It also owns operating state (grip, stock, tripod, host), not location. Flags carry no schema default. |
| New weapon-only system field | **Recommended:** `system.weaponPosture` on the weapon Item template, a string enum `STOWED | EQUIPPED | READIED`, default `"STOWED"` in `template.json` (so a missing or unwritten value is STOWED, never READIED). The name avoids collision with armor's `equipped`. |

Ownership of writes: a single equipment coordinator (E4/E5) updates the field through `ActorEngine` owned-item helpers in the same transaction as the Draw/Stow action spend (`ActionEconomyConsumption`) and any `FireStateStore` change; `InventoryEngine.setWeaponReadied` is the seed of that coordinator. No other writer may touch it. At cutover the weapon template's `equipped`, `dualWielded` and `wieldedTwoHanded` booleans are removed; armor/equipment/shield keep `system.equipped` as their worn state (`isArmorItemEquipped` remains the single armor predicate).
Natural and droid-integrated weapons ("always readied", C3) need no stored value: the future adapter reports READIED-by-nature from the existing `isAlwaysReadiedWeapon` rule without writing it. Activation (`system.activated`, lightsaber blade state) stays a separate field and must never be a posture alias.
Cache invalidation: the sheet render signature (E6), derived-calculator/ModifierEngine signatures (F2, F3) must include `weaponPosture` (and, for E6, the fire state they currently omit) so a posture change invalidates exactly the dependent results.

## 4. Audited legacy field classification (verified at HEAD)

| Field | Class | Evidence |
|---|---|---|
| `system.equipped` | 1 explicit posture evidence (legacy) | template `:602`; written by `InventoryEngine.equipMirrors`, read in 32 files |
| `system.isEquipped`, `system.readied`, `system.equippable.equipped`, `flags.swse.equipped` | 1 posture aliases (fan-out mirrors) | `isItemEquipped`, `InventoryEngine.equipMirrors` |
| `system.active` | **4 ambiguous**: equip alias in `isItemEquipped` **and** activation in `isItemActivated` | `weapon-branch-resolver.js` |
| `system.activated` | 2 activation (not an alias in `isItemEquipped`, but one in `CombatEngine.isEquippedWeaponItem` and `isItemActivated`) | `item-activation-state.js` |
| `system.equippable.active`, `system.activation.active` | 4 ambiguous (named "active", counted as equipped by `isItemEquipped`) | 4 files each |
| `system.equipStatus`, `system.status`, `system.state` | 4 ambiguous; read only by `CombatEngine.isEquippedWeaponItem` and the character-sheet closures | `CombatEngine.js:62-76`, `character-like-sheet.js:1346,6334` |
| `system.carried`, `location` | 3 other physical-location evidence (read by `WeaponVisualProfileResolver`, suggestion engines) | matrix F8, F11 |
| `FS.wielded/stock/mounted/mountedHostId/heldTogetherIds` | operating state (grip, stock, tripod, host); not posture | `FireStateStore` |
| `system.dualWielded`, `system.wieldedTwoHanded`, `system.twoHanded` | 5 unsupported/legacy grip booleans (superseded by `resolveWielding`) | matrix §4 note, `template.json:603-604` |

Readers disagree: `isItemEquipped` counts `active`/`equippable.active`/`activation.active` but not `activated`; `CombatEngine.isEquippedWeaponItem` counts `activated`, `status`, `state` and `equipStatus` too; `character-actor.js` (D14) accepts only `system.equipped === true`; `weapon-control-effects.js` treats `equipped !== false` (so `undefined`) as wielded. These disagreements are not resolved here; the cutover removes the alias set rather than reconciling it.

## 5. Consumer cutover inventory (matrix IDs verified: 137 cited locations all present and in range at HEAD)

Legend of roles after the cutover: **P** reads canonical posture · **A** reads separate activation · **O** evaluates physical occupancy (E3-A2) · **G** evaluates grip (E3-A3 / `resolveWielding`) · **C** evaluates combat permission (existing authorities) · **N** nonweapon authority, unchanged.

| Subsystem | Files (matrix ids) | Today | Role after cutover |
|---|---|---|---|
| Posture writers | `scripts/engine/inventory/InventoryEngine.js` `equipMirrors`, `setWeaponReadied`, `toggleWeaponReadied`, `toggleEquip` weapon branch, `drawAndActivateLightsaber` (A1, A3, A4, A6) | writes `equipped` + 5 aliases and clears `active` on stow | becomes the coordinator's weapon path: writes only `weaponPosture` (P), keeps action costs; activation separately (A) |
| Armor/shield worn | `InventoryEngine.toggleEquip` non-weapon branch (A2), `armor-data-resolver.js` `isArmorItemEquipped` (F1), `EncumbranceEngine.js` (F4), `armor-talent-actions.js` (F5) | `system.equipped` | **N** — unchanged |
| Raw/legacy writers | `SWSEActorBase.setItemEquipped/equipItem/unequipItem/toggleItemEquipped` (A8), `ui/inventory-handlers.js` (A9), `ui/weapon-config-dialog.js` (A10), item-sheet normalization (A11), `force-alchemy-mechanics-service.js` (A13), `phase-3-advanced-crystal-system.js` (A14) | direct `system.equipped` writes bypassing InventoryEngine | weapon paths removed or rerouted to the coordinator (OA-13); non-weapon uses stay N |
| Creation producers | starter lightsaber, follower natural weapons, droid-integrated materialization (A15) | write `equipped: true` | set explicit posture (or none for always-readied) |
| Activation | `item-activation-state.js` `isItemActivated` (C4), `InventoryEngine.setActivated/toggleActivated` (A5), `lightsaber-light-sync.js` hook (A16) | `activated`/`active`, and the hook watches equip fields | **A** only; hook watches `weaponPosture` and activation, not `equipped` |
| Predicates | `weapon-branch-resolver.js` `isTruthyEquipState`, `isItemEquipped`, `isAlwaysReadiedWeapon` (C1-C3) | alias set (includes activation) | `isItemEquipped` retired for weapons; always-readied rule kept as the natural/integrated exception |
| Attack availability | `CombatEngine._resolveAttackWeapon`/`isEquippedWeaponItem` (D2), attack hydration `mirrorAttacks` (D13), `character-actor.js` action mirror (D14), sheet attack gates (E4) | broad alias set / narrow `=== true` | **P + C**: only READIED (or always-readied) weapons enter attack lists; EQUIPPED does not (needs OA-11 confirmation) |
| Full Attack / dual wield | `combat/multi-attack.js` (D3), `DualWieldCombatShapeResolver` (D4), `core-attack-option-runtime-patches.js` (D6), `combat-stat-rules.js` (D5) | narrow `system.equipped`, legacy `twoHanded` booleans | **P + O + G + C**; legacy grip booleans removed |
| Reactions and talents | `reaction-weapon-context.js` (D7), `lightsaber-talent-actions.js` (D8), `weapon-control-effects.js` (D9), `weapons-engine.js` (D10), `passive-state.js`/`condition-evaluator.js` (D11), `unarmed-attack-helper.js` (D12) | `isItemEquipped` or divergent narrow reads | **P** (+ **A** for Lightsaber Defense ignition) via the one shared interface |
| Grip/size/tripod | `weapon-runtime/owned-state.js` `resolveWielding`, `wielding-size.js`, `FireStateStore` (B2-B6, C5-C9) | operating state, independent of posture | **G**; unchanged authorities, consumed by the equipment interface |
| Sheets | `RowTransformers.js` (E2), `PanelContextBuilder` (E3), `character-like-sheet.js` (E4), droid `context-builder.js` (E5), `concept-context.js` (E7), `buildWeaponReadinessView` (E1), `actor-sheet-base.js` signature (E6) | each has its own alias copy | **P/A** from the shared interface; one copy of the logic |
| Derived/effects/other | `defense-calculator`/`derived-calculator` (F2), `ModifierEngine` (F3), `equipment-skill-hook-resolver.js` (F6), implants (F7), `WeaponVisualProfileResolver` (F8), effect application (F9), `UpgradeService`/workbench (F10), suggestion engines (F11), advisory readers (F12) | assorted equipped reads | each classified weapon (P) or **N**; signatures add `weaponPosture` |
| Item defaults/schema | `template.json` weapon template, `item-defaults.js`, item editor | `equipped`, `dualWielded`, `wieldedTwoHanded` booleans | weapon template gets `weaponPosture`; legacy booleans removed |

There must be no final-state reader of `system.equipped`, `isEquipped`, `readied`, `equippable.equipped/active`, `flags.swse.equipped` for weapons, and no posture decision based on `active`/`activated`.

## 6. Future read-only adapter contract (specified, not implemented — proposed E3-A5)

`resolveEffectiveEquipmentPosture(itemEvidence, context)` — pure, no writes:
- Inputs: the explicit `{ posture }` declaration from the (future) persisted field, the always-readied classification (natural/integrated rule), activation evidence as a separate input, and optionally the E3-A2 occupancy and E3-A3 grip results for the same `itemId`.
- Output: effective posture and its source; `declaredPhysicalHold`; `readinessVerified` (true only when a READIED declaration is corroborated by `physically-compatible` occupancy and a `grip-supported` verdict, or by the always-readied rule); occupancy/grip status passthroughs; activation as an independent fact; diagnostics for a declaration that contradicts the verified resolvers; no attack, action or combat fields.
- It consumes the existing authorities (E3-A1 permissions through E3-A3, `resolveWielding`, effective size) and is not a source of truth.

## 7. Open decisions (not resolved here)

- **OA-2** persistent posture/occupancy state authority — a recommendation is given in §3; owner approval is required before any schema change. Whether manipulator assignment is persisted at all remains open.
- **OA-3** alias dual-write/migration duration — effectively superseded by the clean break (no dual-write); the owner should confirm there is no transition period.
- **OA-11** whether EQUIPPED-but-not-READIED weapons appear in attack lists, reaction eligibility and Full Attack — this document proposes "no"; detailed per-reader policy still needs approval.
- **OA-12** per-reader posture and activation predicates (e.g., Lightsaber Defense needs READIED and activation).
- **OA-13** disposition of legacy writers and macro-facing helpers (A8-A10): prune or reroute.
- New: default posture of newly created weapons (proposed STOWED) and of starter/creation-time producers; whether mounted/worn weapons (FS host, wrist/forearm) get a posture at all (separate authorities, still uncertified); the E6 render-signature change.

## 8. Testing policy

No live Foundry testing happens before the full implementation is merged. Offline unit tests, mocked integration tests, static validation and GitHub Actions gate each phase; runtime behavior is `RUNTIME_UNVERIFIED` until post-merge certification. Automated testing is not weakened for the unavailable runtime.
