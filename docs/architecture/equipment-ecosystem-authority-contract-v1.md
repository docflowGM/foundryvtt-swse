# Universal Equipment Ecosystem — Authority Contract v1 (PROPOSED)

**Status:** E1 deliverable — **proposed for owner review**. Documentation only. Nothing in this document is implemented, schema-approved or authorized for build. Only E0 and E1 are authorized.
**Revision note (E2A):** §14 records the owner rulings on OA-2, OA-4, OA-7, OA-8, OA-9 and what E2A actually implemented. Sections 1–13 are unchanged E1 text; where §14 differs from §12 (decision status), §14 governs.
**Audited commit:** `185dac1bded12f5e40cb851539c0a912f42fc24d` (see baseline §1 for the upstream-divergence note).
**Evidence:** every statement tagged `[CURRENT]` cites `equipment-ecosystem-e0-consumer-matrix.md` (row IDs such as `A4`, `D2`) or `equipment-ecosystem-e0-baseline.md`.

## 0. Reading guide and tags

| Tag | Meaning |
|---|---|
| `[CURRENT]` | behaviour of the repository today, evidenced |
| `[APPROVED]` | stated by the owner directive / approved roadmap; **not yet implemented** |
| `[PROPOSED]` | Claude's drafting of how to express an approved requirement; not approved |
| `OWNER_APPROVAL_REQUIRED` (`OA-n`) | an engineering/schema/architecture choice reserved to the project owner |
| `SOURCE_REVIEW_REQUIRED` (`SRC-n`) | a statement about published SWSE rules that this phase did not and may not establish; candidate `DEFERRED_RULES_REVIEW` register entry |

Claude's role in this document: executor. No rules question is resolved here, no sourcebook was consulted, no schema field name is selected as final, and no design choice is made on the owner's behalf. Where a choice exists, the options are listed with repository evidence only.

## 1. Approved invariants `[APPROVED]`

1. Existing authorities are reused, not duplicated: `InventoryEngine`, `ActorEngine`, `ActionEconomyConsumption`, `FireStateStore`, `resolveWielding()`, `resolveEffectiveWieldingSize()`, canonical weapon-runtime resolvers, existing damage authorities, `DualWieldCombatShapeResolver`, species variant/profile resolution and canonical species materialization, droid installed-component resolution, droid installation/slot governance, existing physical weapon-host mounting, V2 sheet context builders and row transformers.
2. **Single mutation authority.** All actor and owned-item mutation continues through the approved `ActorEngine` pathways. The new coordinator never writes documents directly.
3. **Universal physical capability.** Species default to two ordinary arms unless an authoritative species definition says otherwise. Explicit exceptions must be source-verified. Droids derive appendages from actual installed and functional systems. Not every appendage is a general-purpose hand.
4. **Individual manipulator tracking** with stable IDs; holding, wielding, specialized and mounted capability are distinct.
5. **Weapon requirements are contextual**: no blanket fixed hand-count field added to canonical weapons; physical size, effective wielding size, operating configuration and actual grip are separate facts.
6. **Mounted weapons**: a properly supported armor- or body-mounted weapon does not automatically consume an ordinary manipulator; mounting hardware/host availability may add restrictions; zero-hand occupancy is not unrestricted operation and grants no extra attacks.
7. **Publication authority**: complete publication snapshots never inherit rules-bearing properties from incompatible base entries; unknown requirements are never turned into permissions.
8. **Modifications stay separately governed**: the immutable v1.5 modification snapshot, registries, ledgers, executor and certification flags (including D-004, D-005, D-006, D-010, D-011, D-013, D-014, D-015) are out of scope and untouched.
9. **Physical capacity never grants attacks.** Attack count remains the job of the existing multiattack/feat authorities.
10. **Three collaborating components** (§9) — one coordinator for all actor types.

## 2. Existing semantics that must be preserved `[CURRENT]`

| # | Semantics | Evidence |
|---|---|---|
| P-1 | For ordinary weapons the owned Item's `equipped` state **is** the drawn state; Draw/Stow costs a Move action (Swift with Quick Draw metadata) through `resolveActionCost('drawOrHolsterWeapon')` and `ActionEconomyConsumption` | matrix A3, A4 |
| P-2 | Natural (auto-equipped) and droid-integrated weapons are always readied; no Draw/Stow | C3 |
| P-3 | Activation (`system.activated`, mirrored `system.active`) is a separate write path; lightsaber ignition and energy-shield activation cost a Swift; both require the item to be drawn/equipped first | A5 |
| P-4 | Draw & Ignite is one Swift only when the feat resolver exposes `drawAndIgniteLightsaber` | A6 |
| P-5 | An ignited lightsaber cannot be stowed (`deactivate-before-stowing`) | A4 |
| P-6 | Body armor is exclusive; energy shields coexist with body armor | A2; `energy-shield-defense-and-activation-authority` test |
| P-7 | A failed action spend mutates nothing; a throwing write rolls the spend back | A4, A5, A6 |
| P-8 | Grip legality, size-relative wielding, tripod-uncertainty refusal, held-together groups, host eligibility and the mount Mechanics check keep their current implementations | C5-C9, B4, B5 |
| P-9 | Stock position is `FS.stock`, a Move to change, refused for weapons whose record states no folding stock | B1 |
| P-10 | Light-sync, modifier-cache and derived-cache invalidation keyed on equip/activation fields keep working (any new state field must be added to these keys) | A16, F2, F3, E6 |
| P-11 | Species complete snapshots are whitelist projections with no base inheritance | baseline §6.2 |
| P-12 | `isArmorItemEquipped` remains the single armor predicate | F1 |

## 3. E1.1 — State separation `[APPROVED]` concepts, `[PROPOSED]` mapping

### 3.1 Weapon postures

| Posture | Approved meaning | Occupancy |
|---|---|---|
| `STOWED` | not currently held for operation | 0 manipulators |
| `EQUIPPED` | physically held, not necessarily configured for normal combat use | at least one holding manipulator (exact number depends on the item and chosen holding — to be determined by the resolver, not by the posture) |
| `READIED` | occupies the manipulators, or satisfies the mounting requirements, needed for its chosen operating configuration | the actual required manipulators, or a mount relationship |

Activation is orthogonal. The UI word "Ready" must remain distinct from SWSE's *Ready an Action*; no new action cost is inferred from the UI states — existing published action-cost authority stays controlling.

Mounted-weapon readiness is evaluated **through the host relationship** (is the host present, worn/installed, functional?), not by forcing an ordinary handheld grip.

### 3.2 Nine concepts that must not be conflated

For each concept: where it lives today `[CURRENT]` and what the contract requires `[APPROVED]`. The *home* of each new concept is a schema decision (OA-2) and is not selected here.

| Concept | Today `[CURRENT]` | Contract |
|---|---|---|
| Owned inventory state (owned/carried/quantity) | Item existence; `system.quantity`; `system.carried` (read by one reader, F8) | unchanged |
| Physical location (worn / held / stowed / mounted / installed) | implicit and partial: `equipped` (drawn/worn), `FS.mountedHostId` (weapon on weapon) | explicit, derived or stored per OA-2 |
| Physical occupancy (which manipulator holds what) | **does not exist** (R-4) | new, owned by E3 resolver output; persisted only if OA-2 requires |
| Combat posture (STOWED/EQUIPPED/READIED) | one boolean `system.equipped` with alias fan-out meaning "drawn" | three-valued; legacy boolean kept for old readers (OA-1, OA-3) |
| Selected grip | `FS.wielded` (`'one-handed'|'two-handed'`), attack option `wieldedHands` (`B2`, `C5`) | unchanged; consumed by resolver |
| Operating configuration | `FS.configurationId`, `settingProfile`, `stock`, `mounted`(tripod), `sizeTreatment`, power source, payload (`B1`-`B6`) | unchanged; stay in `FS`; must not be duplicated |
| Mount installation | `FS.mountedHostId` (weapon→weapon only); armor `system.weaponMount` boolean tag without host link (`G1`, `G2`) | host relationship projected to one read interface (E6); underlying owners keep ownership |
| Activation | `system.activated` / `system.active` (`A5`, `C4`) | independent state; must be separated from posture reads (R-1) |
| Combat permission | not centralized: composed of drawn-state gates, `resolveWielding` legality, dual-wield resolver verdicts, action economy | stays in the existing combat authorities; resolver supplies facts only |

## 4. E1.2 — Legacy compatibility

### 4.1 Principle `[APPROVED]`

The old `system.equipped` interpretation **remains available to existing combat readers until each is explicitly migrated**. A weapon that is merely EQUIPPED (held, not READIED) must **not** become combat-ready because an old boolean was set. Therefore the future EQUIPPED posture must never be written as legacy `equipped: true`.

### 4.2 Required mapping decision `OA-1` (not decided here)

Today `equipped: true` on a weapon means "drawn". The repository evidence supports *either* reading when mapping old data to the new three-valued posture, and the choice changes the behaviour of every legacy reader in matrix §4.D-E:

- Option A — legacy `equipped: true` is interpreted as `READIED` (matches today's "drawn" label and today's combat-readiness consumers). Evidence: matrix A3/A4, E1 (`stateLabel: 'Drawn'`), D13.
- Option B — legacy `equipped: true` is interpreted as `EQUIPPED` (held, not validated) and `READIED` requires an additional signal. Evidence for the possibility: none in the repository; it would change attack-list hydration, reactions and Full Attack for every existing actor.
- Option C — legacy `equipped: true` is "ambiguous legacy state" reported for review rather than converted (matches the directive's migration principle for ambiguous states, §E9).

No recommendation is made. It is `OWNER_APPROVAL_REQUIRED`.

### 4.3 Read-only compatibility adapter `[PROPOSED concept, not implemented]`

A pure function `effectiveEquipmentState(item, actor)` (E5A in the roadmap) that returns one object combining: legacy alias reading (using the existing `isItemEquipped` set, split into *posture aliases* vs *activation aliases*), the future posture record when present, `FS` facts (`wielded`, `stock`, `mountedHostId`), natural/integrated "always readied" status, and an `ambiguous` flag with a reason for legacy-only states. It must not write, and it must not become a second source of truth: it **derives** from the owners above.

### 4.4 Reader-by-reader migration classes `[PROPOSED]`

The classes below use the vocabulary the plan proposes (physically held / readied / worn / activated). The mapping is a proposal for owner review; it is not approved.

| Class | Matrix rows | Proposed future predicate |
|---|---|---|
| Combat readiness (who attacks, off-hand, reactions, defenses) | D2, D3, D4, D7, D8, D9, D10, D11(passive), D13, D14, E4 | `isReadied` — equals legacy behaviour while OA-1 = Option A |
| Held-group / holding validity | B5 (`resolveHeldGroup`), `heldTogetherOptions` | `isHeld` (EQUIPPED or READIED) — **an owner decision** because it can differ from today's drawn requirement (`wielding-size.js:168`, "equipped / readied per the repository's own predicate") |
| Activation preconditions | A5 (`draw-before-activating`, `equip-before-activating`), D8 | posture predicate chosen by item class (OA-12) |
| Armor/shield worn | F1, F4, F5, E3, `condition-evaluator` armor lookups | `isWorn` (keep `isArmorItemEquipped`) |
| Activation display/state | C4, A5, E1, E2 | `isActivated` (stop reading `system.active` as equip) |
| Display/analysis copies | E2, E3, E5, F11, F12 | consume the shared effective view (E8), no private copy |
| Cache keys | E6, F2, F3 | add a revision/hash of the new posture + occupancy state to the signature (invalidation key must name exactly what changes) |
| Hook watch lists | A16 | add new field paths |
| Item-editor / legacy writers | A8-A11, A14 | OA-13 (prune/reroute policy) |

## 5. E1.3 — Effective anatomy

### 5.1 Resolution tiers `[APPROVED, as the directive describes them]`

1. Effective, source-verified species anatomy (from the resolved species snapshot).
2. Installed droid components (droid actors), from `resolveInstalledDroidComponents`.
3. Explicit actor alterations (adds, replaces, disables, removes).
4. Default rule: two ordinary arms when anatomy is unspecified.

The tiers combine according to actor type; they are not simply competing arm-count overrides (an installed droid arm supplements or replaces an appendage by its installation record).

### 5.2 Appendage record concepts `[PROPOSED]`

Each resolved appendage carries (names are conceptual, final schema is OA-2/OA-7):

- a **stable ID** within the actor (see OA-8),
- a **source** (species snapshot / droid installation / actor alteration / default),
- **capabilities**: can hold, can wield a weapon, can manipulate, specialized function(s) — never defaulted to "general-purpose hand" without a source,
- **functional state** (functional / disabled / missing / unreconciled / unknown) — a missing, disabled or unreconciled appendage never yields a working hand,
- **restrictions** carried verbatim from the source as flags/strings pending review (no interpretation).

### 5.3 What the repository can and cannot supply `[CURRENT]`

- Species: no structured anatomy data exists for any species; Codru-Ji "Extra Arms" and Ryn "Prehensile Tail" are display-only trait prose in complete-snapshot variants (baseline §6.3). Structured anatomy therefore requires **new source-verified data**, not parsing the prose (`SRC-1`, `SRC-4`).
- Snapshot carrier: optional anatomy can ride inside a trait's `rules[]` without touching the snapshot whitelist, or in a new variant field only if `applyCompleteSnapshot` is extended (baseline §6.2) — `OA-7`.
- Droids: component type and install/enable/active state exist (`resolveInstalledDroidComponents`); a per-entry `location` key is written by the Garage but `additional-N` is length-derived and a same-part-type install appears to replace rather than add (static read, baseline §7.2), so per-instance appendage identity does not yet exist — `OA-8`; `canManipulate`/`canAttack` metadata exists only in the builder catalog `scripts/data/droid-systems.js` and as adapter traits (the canonical registry carries none), and wield capability is prose in `features`/`restrictions` — `SRC-5`. The structured canonical-registry rules `weaponCountsAsTwoHanded`, `mountCapacity`, `oneMountedToolOrWeaponActive` have no consumer today.
- Default two arms: no data needed; lives in the resolver as the lowest tier.
- Natural weapons/integrated weapons: `isAlwaysReadiedWeapon` is the only existing zero-hand-like notion and is not anatomy-aware (C3).

### 5.4 Unknown and conflicting data `[APPROVED policy; mechanism PROPOSED]`

Per `docs/architecture/swse-automation-authority.md` §2 ("Unknown is not false"): anatomy that cannot be established yields **UNKNOWN capacity**, reported with a reason, never silently a hand. Conflicting sources are surfaced as conflicts (the droid resolver already has a `conflicts[]` pattern, `droid-installed-component-resolver.js:417-427`) and left for GM adjudication. No arm count is ever inferred from names or prose.

### 5.5 Specialized mounts

A specialized mount can satisfy a weapon's requirement without ordinary hands **only where the mount's own source says so**. Today the canonical records state this for at most one weapon identity (`weapon-sith-lanvarok`: `handsRemainFree`, `wornNotHeld`) and the repository's own comment states that worn/forearm/wrist classification "does not say that a worn weapon occupies, frees or needs a hand" (`wielding-size.js:130-136`). Whether an armor- or wrist-mounted weapon occupies a manipulator is therefore `SRC-3`; the contract encodes only the mechanism (host relationship + per-source occupancy statement), not the answer.

## 6. E1.4 — Weapon configuration (reuse list) `[APPROVED]`

The following existing facts are consumed as-is and must not be re-implemented or mirrored into new hand-count fields:

- canonical wielding constraints (`wieldingConstraintsOf`: `requiresTwoHands`, `cannotWieldTwoHanded`);
- size-relative grip (`resolveEffectiveWieldingSize`, `classifySize`, `sizeStateOf`, `resolveWielding` including the tripod-unknown refusal);
- owned grip choice `FS.wielded`;
- stock operating state `FS.stock` (and its Move cost);
- tripod state `FS.mounted`;
- source-specific wielding exceptions in the canonical `operation` block (e.g. held-together `Darkstick`, `Bayonet` mounted-on-rifle requirements, `cannotBeWieldedTwoHanded` lightfoils);
- weapon-to-weapon mounting (`FS.mountedHostId`).

A schema addition for a weapon requirement is permitted only with evidence of a specific published requirement not representable by the above (none identified in E0).

## 7. E1.5 — Equipment transaction contract

### 7.1 Sequence `[APPROVED]`

1. Request → 2. read actor/item state → 3. resolve capabilities → 4. produce legal transition plan → 5. prompt if needed → 6. confirm → 7. **re-read and revalidate** current state → 8. obtain applicable action authorization → 9. execute through existing mutation authorities → 10. verify final state → 11. roll back/recover on failure.

A canceled prompt leaves actor and item state unchanged; steps 1-5 are read-only.

### 7.2 Atomicity and rollback support actually found `[CURRENT]`

| Capability | Where | Limits |
|---|---|---|
| Several owned-item updates in one call | `ActorEngine.updateOwnedItems(actor, [..])` → one `updateEmbeddedDocuments` (`actor-engine.js:816-, 889-891`); `toggleEquip` already sends body-armor + target updates as one array (`InventoryEngine.js:125-129`) | whether the platform applies the array atomically is **not established by repository evidence**; to be verified in E5 |
| Spend → write → rollback-on-throw | `setWeaponReadied`, `setActivated`, `drawAndActivateLightsaber` (`InventoryEngine.js:194-205, 229-234, 259-264`) | single spend only |
| Multi-spend with reverse-order rollback of earlier spends on a later denial | `FireStateStore.spendRequiredActions` (`fire-state-store.js:210-221`) | rolls back spends **within that call**; after the call returns ok, the returned `rollback()` undoes in reverse |
| Spend rollback implementation | `ActionEconomyConsumption.spend().rollback` → `Persistence.undoLast(actor, combatId)` (`action-economy-consumption.js:205-211`) | undoes the **last** recorded entry — correct only if nothing else was spent in between; out-of-combat spends return `committed:false` and a rollback that returns `false` (`:117-129, 214`) |
| Plan-level snapshot/restore | `ActorEngine.applyMutationPlan(actor, plan, {transactional:true})` pre-plan snapshot + `restoreFromSnapshot`; failed restore sets `error.partialMutationPossible` (`actor-engine.js:3006-3140`) | designed for plan buckets (progression); best-effort; not used by InventoryEngine |
| Per-actor re-entry guard | `ActorEngine._markActorMutationInFlight` etc. (`actor-engine.js:432-467`) | reference-counted marker consulted by reactive hooks; **does not serialize concurrent requests** and is not a lock |
| Strict vs best-effort `FS` writes | `persistOwned(..., {strict})` | default best-effort (errors swallowed after warn, `fire-state-store.js:188-203`); in-memory `weapon.flags` is assigned after the write regardless (`:286`) |
| Post-write side effects | `LightsaberLightSync.syncActorTokenLight` runs *after* the update (`InventoryEngine.js:207, 235, 265`) | outside any rollback |

### 7.3 Gaps for E5 review `[PROPOSED list]`

1. No multi-item **posture + occupancy + action-spend** transaction exists; combining them needs an owner-approved strategy (OA-9).
2. Rollback of the economy is last-entry undo; ordering of several spends interleaved with writes must be proven or constrained.
3. No serialization of two simultaneous requests for one actor; the revalidate step (7) must detect staleness, because the in-flight guard will not.
4. Post-write side effects (light sync, derived recalculation via `ActorEngine.recalcAll`) are not rolled back with state.
5. `FS` writes are best-effort by default; any transition that writes `FS` must opt into `strict`.
6. Out-of-combat `committed:false` spends cannot be undone and need no undo; the plan must treat both cases.
7. Verification (step 10) needs a defined "expected final state" comparison; none exists today.
8. `applyMutationPlan` transactional mode is available but unproven for owned-item posture changes.

## 8. E1.6 — UI contract `[APPROVED vocabulary]`

| Item type | Primary actions | Notes / known exceptions |
|---|---|---|
| Handheld weapon | Equip · Ready · Stow · Activate (when applicable) | Draw & Ignite lightsaber shortcut preserved with its action-cost conditions; always-readied (natural, integrated) weapons get no Stow |
| Armor | Equip · Stow · Activate (energy shield / verified powered equipment) | no weapon-style Ready; body-armor exclusivity and shield coexistence preserved; donning/removal rules must not be bypassed by an instantaneous toggle (`SRC-2`/`OA-10` — today `toggleEquip` is such a toggle, A2) |
| Generic equipment | Equip/Stow; Activate/Deactivate where an operating state exists | no forced weapon-style readiness |
| Physical attachment | Attach · Detach inside the host's details (once authorized) | separate from permanent modification; same-looking workflow must not be shared with modification install |
| Mounted weapon | Ready/Activate as the mount supports | fixed non-retractable mounted weapons show no Stow (display rule: `OA-5`) |

Assisted Hand Management `[APPROVED]`: determine exact required manipulators → identify conflicts → present the legal resolutions (stow, holster where supported, drop) → player chooses → compute complete action requirements through existing authorities → execute only after confirmation and revalidation. No automatic arbitrary dropping/stowing.

Reuse targets `[CURRENT]`: `buildWeaponReadinessView` (concept-context.js:346-376), `RowTransformers` rows, existing weapon/armor cards under `templates/actors/character/v2-concept/partials/panels/` (`inventory-weapon-card.hbs`, `inventory-armor-card.hbs`, `inventory-item-row.hbs`) and the `v2/partials` family, handler actions `equip`, `toggle-weapon-readiness`, `toggle-activated`, `draw-and-ignite-lightsaber`, `change-weapon-configuration`, `set-power-source` (`character-like-sheet.js:3868-3905`). The sheet handlers live in the shared base used by character, NPC and droid sheets (baseline §3.1). No template or CSS change is made in this phase.

## 9. Component contracts `[APPROVED responsibilities]`

### 9.1 `EquipmentCapabilityResolver` — read-only

Inputs: actor (and optionally a hypothetical equipment configuration). Output (conceptual): functional manipulators with stable IDs and capabilities; occupied/available manipulators; supported grip configurations per item (from `resolveWielding`/size resolvers, not recomputed); mount/host dependencies; physical conflicts; unresolved prerequisites with reasons.
Must not: mutate documents, spend actions, roll dice, compute attacks per round, award feats/talents/bonuses, render UI. Must distinguish physical capability from combat permission (a Codru-Ji can physically hold two two-handed weapons; the result carries no bonus attack).

### 9.2 `EquipmentTransitionPlanner` — read-only

Evaluates Equip, Ready, Stow, Activate and (once authorized) Attach/Detach requests; returns legality, missing requirements, conflict-resolution choices, required actions (asked from existing authorities, never a private cost table), and the expected final configuration. No mutation, no resource spend; canceling has no side effect.

### 9.3 `EquipmentStateCoordinator` — workflow

Receives approved requests; calls resolver and planner; coordinates confirmation; revalidates; delegates execution to `InventoryEngine`, `FireStateStore`, `ActionEconomyConsumption` through `ActorEngine`; coordinates rollback/recovery; returns a verified final result. One coordinator for all actor types. Must not become a combat engine, a mutation gate, an item registry, a species database or a modification executor, and must not write documents itself.

### 9.4 Enforcing the boundaries `[PROPOSED]`

Architectural tests (E3-E5) asserting by static import/call inspection that: the resolver and planner modules import no `ActorEngine`, no `ActionEconomyConsumption.spend`, no `Hooks`/`ui`; the coordinator imports no direct `item.update/actor.update/setFlag`; no sheet module computes hand allocation. These tests are proposals for E3-E5, not created now.

## 10. Failure and unknown handling (E1.7)

Established policies reused: `docs/architecture/swse-automation-authority.md` — UNKNOWN is not false (§2), GM-adjudicated is supported (§1, §6); existing refusal-reason vocabulary (`always-readied`, `deactivate-before-stowing`, `draw-before-activating`, `action-unavailable`, `weapon-not-owned`, `host-not-owned`, `check-failed`, `persist-failed`) and the attack preflight's "could not be evaluated and were not applied (GM adjudication)" notice (`combat/rolls/attacks.js:298-300`).

| Failure | Required outcome `[APPROVED policy; wording PROPOSED]` |
|---|---|
| Insufficient hands | transition not performed; plan lists legal resolutions (Assisted Hand Management); no mutation |
| Wrong appendage capability | the specific appendage is excluded with a stated reason; if no appendage qualifies, request refused with the missing capability named; never reassigned to a non-qualifying appendage |
| Stale item reference | revalidation fails the plan; nothing written; user shown a refreshed plan (existing `missing-item` / `weapon-not-owned` reasons) |
| Missing or unavailable host | dependent weapon reported unavailable; attachment record retained; nothing deleted; not interpreted as detached |
| Disabled or missing droid appendage | contributes no manipulator; appears as unavailable capacity with the reason; no invented hand |
| Conflicting assignments | reported as a conflict; plan refused until resolved by the user |
| Unestablished mount eligibility | UNKNOWN, never "functional mount"; operation requires GM adjudication or an explicit prompt |
| Unavailable combat actions | transition refused before any write; no partial spend (existing `action-unavailable`) |
| Failed multi-step mutation | roll back writes and spends in the order proven in E5; if recovery cannot be proven, report `partial` with the exact state and halt; never silently charge an action or discard equipment |
| Ambiguous legacy state | report for review (OA-1 Option C pattern); never auto-convert into a hand assignment |
| Unsupported or uncertified modification | feature blocked; equipment workflows never unlock the modification executor or alter certification flags |

## 11. Planned migration and testing boundaries

- **Migration:** none in E0-E1. Any later durable state requires a reversible strategy or backup and a per-state report of ambiguous cases (E9). Existing worlds keep working with unchanged legacy fields until each reader is migrated.
- **Testing:** pure tests for resolver/planner (E3-E4); transaction and concurrency tests before any live sheet adopts the coordinator (E5); combat regression parity ("identical results whenever relevant physical state has not changed", E7); Foundry v13 smoke certification on character, NPC and droid sheets (E9). Existing baseline suites (baseline §2) are the regression floor.
- **Minimum acceptance scenarios** (from the owner's matrix): two pistols; rifle in one hand = Equipped not Readied; Ready with both hands occupied → assisted resolution; two-handed weapon needing both ordinary hands (illegal grip rejected); Codru-Ji four weapons / two two-handed weapons (physical capacity only); additional arms → no extra attacks; Ryn tail holds an eligible item without wielding; droid adds an approved manipulator / tool-only appendage / multifunction apparatus; armor-mounted weapon occupies no ordinary hand and disappears with the armor while the attachment is retained; rifle + grenade launcher host validation preserved; stock extension cost/state preserved; two-handed melee Strength contribution and no doubling for light weapons; lightsaber activation/stow and light sync preserved; energy shield independent of body armor; insufficient actions → refused without partial mutation; two simultaneous requests → stale one revalidated; legacy actor with only `equipped` flags → interpreted or flagged; missing mount data never proves a functional mount. Rows whose source rule is unresolved (`SRC-1`…`SRC-6`) are **blocked from automated acceptance until ruled**.

## 12. Open decisions

### 12.1 `OWNER_APPROVAL_REQUIRED` — architecture / schema (no rules content)

| ID | Decision | Why it matters (evidence) |
|---|---|---|
| OA-1 | Mapping of legacy weapon `equipped: true` to STOWED/EQUIPPED/READIED (or "ambiguous") | §4.2; matrix §4.D-E, A15 |
| OA-2 | Persistent state home, namespace, versioning and field shapes for posture and manipulator assignment (the plan floated `flags.swse.equipmentState`; **not adopted**), including whether anything is persisted vs derived | contract §3.2; `FS` already owns grip/stock/host and must not be duplicated |
| OA-3 | Duration and rules of dual-writing legacy aliases during the transition; which alias set remains authoritative for legacy readers | R-3; matrix A1/A2/A14/D10 |
| OA-4 | Representation of a genuinely unusable or severed natural appendage on an actor (open item in the plan) | no precedent in repository (baseline §7.2) |
| OA-5 | Display rule for Stow on a mounted, non-retractable weapon (open item in the plan) | §8 |
| OA-6 | Representation of the host relationship for armor-integrated and droid-integrated weapons (new link to an owned armor item / installed part id); only weapon→weapon exists | matrix G1-G5 |
| OA-7 | Where optional species anatomy lives: inside `traits[].rules[]`, or a new whitelisted snapshot field requiring a change to `applyCompleteSnapshot`, or a separate registry | baseline §6.2 |
| OA-8 | Stable manipulator/appendage ID scheme for droids and species (reconciling `leftArm` vs `left-arm`, same-type instances, positional fallbacks) | baseline §7.2 |
| OA-9 | Atomicity strategy for multi-item transitions (single `updateOwnedItems` batch + ordered spends, or `applyMutationPlan` transactional, or other) | §7.2-7.3 |
| OA-10 | Whether current instantaneous armor equip/unequip (A2) is to be treated as existing behaviour to preserve or corrected under the donning/removal requirement | directive §2 vs matrix A2 |
| OA-11 | Whether EQUIPPED-but-not-READIED weapons appear in attack lists, reaction eligibility and Full Attack candidate sets | matrix D2-D4, D7, D13 |
| OA-12 | Per-reader predicate disposition (the §4.4 table) including activation preconditions | §4.4 |
| OA-13 | Policy for deprecated/unreferenced legacy writers and macro-facing helpers (A8-A10): prune, reroute or keep (project class-E question) | matrix §4.H |
| OA-14 | Disposition of the legacy two-handed booleans and heuristics (`wieldedTwoHanded`, `twoHanded`, `system.hands`, name regex) in D5/D6 vs the canonical `resolveWielding` path (engineering decision; mechanics unchanged) | matrix D5, D6 |

### 12.2 `SOURCE_REVIEW_REQUIRED` — published-rules questions (candidate `DEFERRED_RULES_REVIEW` register entries; none decided)

| ID | Question | Repository facts (no interpretation) |
|---|---|---|
| SRC-1 | Codru-Ji Extra Arms: the structured meaning of holding capacity; and which recorded grapple/grab bonus is correct | prose-only trait; three differing recorded bonus values across layers (baseline §6.4); requires source verification before any structured field |
| SRC-2 | Published armor donning/removal timing, and whether it applies to the sheet's Equip/Stow toggle | current toggle spends no action (A2); timing rules not researched in E0 |
| SRC-3 | Whether armor-mounted / wrist- / forearm-mounted weapons occupy zero ordinary manipulators and what restrictions apply (the plan's "zero-hand wrist rocket" example) | canonical records classify worn/forearm weapons but do not state occupancy; exactly one identity states `handsRemainFree` |
| SRC-4 | Ryn Prehensile Tail: how a "holding but not wielding" appendage interacts with hand allocation and load | prose-only trait (baseline §6.3) |
| SRC-5 | Droid appendage capabilities: which of hand/claw/tool/probe/instrument/mount may hold or wield a weapon; effect of multifunction apparatus limits; stabilized-mount function | three differently shaped sources: builder catalog `canManipulate`/`canAttack`/features, adapter traits, canonical `rules` (`weaponCountsAsTwoHanded`, `mountCapacity`); none source-verified in E0 (baseline §7.1) |
| SRC-6 | Stock-dependent range/proficiency behaviour referenced by the plan as an existing documented gap | not researched; out of scope for the coordinator per the directive; existing stock state is `FS.stock` (B1) |
| SRC-7 | Which species besides Codru-Ji and Ryn have anatomy exceptions relevant to holding/wielding | not enumerable without interpreting prose (baseline §6.3) |

## 13. What this contract does not do

It does not select a schema, create fields, implement a resolver/planner/coordinator/adapter or migration, change any combat, species, droid or modification behaviour, declare any certification status (no item is `SOURCE_VERIFIED`, `MECHANIC_SPECIFIED`, `IMPLEMENTED` or `FOUNDRY_TESTED` by this document), or authorize E2.

## 14. E2A rulings and implementation status (owner-approved; supersedes the status of the listed OA items in §12.1)

Legend: **[APPROVED-FUTURE]** = approved architecture not yet built · **[IMPLEMENTED-E2A]** = built and offline-tested in E2A · **[DEFERRED]** = not authorized yet. Nothing here is Foundry-tested.

| ID | Owner ruling | Status |
|---|---|---|
| OA-7 | Species anatomy is an optional structured `anatomy` field on the **effective canonical species profile**, respecting publication-specific complete snapshots; the universal default is two ordinary arms unless an authoritative exception exists; it is **not** placed in the generic trait-rule vocabulary. | Field/schema **[APPROVED-FUTURE]** (E2B; whitelist / `listMissingSnapshotFields` / packs unchanged). **[IMPLEMENTED-E2A]**: the resolver reads `speciesProfile.anatomy` only from the profile passed in, never from a base species; synthetic fixtures only; two-arm default; temporary guards for exact trait ids `extra-arms` and `prehensile-tail` (removed in E2B). |
| OA-8 | Three separate identities: appendage **slot** (stable location), installed component **instance**, canonical **part**. Two identical droid hands must eventually be independently representable. Component type, array index and `additional-N` are not instance identity. | **[APPROVED-FUTURE]**. **[IMPLEMENTED-E2A]** only as a read-only vocabulary: every appendage carries `identity {slot, instance, part}`; the droid projection (corrected in the E2A correction pass) treats an embedded Item document id as **candidate evidence only**, leaves `slot` and `instance` null, emits **no allocatable droid appendages** from legacy evidence, and returns every record as an unresolved record. `resolved` is reserved for allocation-grade evidence (confirmed slot and installed-instance identity, boolean capabilities, known functional state). Persistent ids, Garage and resolver repair: **[DEFERRED]** (droid refactor). |
| OA-4 | Functional status belongs to the actor's effective anatomy: functional / disabled / missing / unresolved. No permanent damage or severed-limb field yet. | **[IMPLEMENTED-E2A]** as read-only derived state (existing installed/enabled evidence + explicit overrides supplied to the resolver; overrides may only restrict). Permanent fields **[DEFERRED]**. |
| OA-2 | E2A produces a read-only derived anatomy snapshot; no persistent posture, grip or manipulator allocation. | **[IMPLEMENTED-E2A]**: nothing persisted. Persistent equipment state remains **[DEFERRED]** to later approved phases. |
| OA-9 | Transaction atomicity deferred to E5. | **[DEFERRED]**; no mutation exists in E2A. |

### 14.1 Droid refactor dependency (project invariant, owner addendum)

The comprehensive refactor of droid actors, models, components, equipment/installations, appendages, schemas and the Garage has **not** been done and follows the vehicle refactor. The current droid implementation is **legacy / pre-refactor infrastructure** even where a file calls itself canonical. Consequences for this contract:

- The Equipment Ecosystem accommodates droids **architecturally** (actor-type-neutral resolver contract; droid adapter isolated and replaceable via `deps.projectInstalledComponents`; future droid anatomy may arrive through the input contract) **without** refactoring them.
- Droid work in E2A is diagnostic and read-only; discoveries are audit findings recorded as `DEFERRED_DROID_REFACTOR` in `docs/audits/equipment-ecosystem-e2a-anatomy-checkpoint.md` §12 (DR-001…DR-010).
- E2B is split in scope: its **species** work may proceed independently when authorized; its **droid** identity / schema / installation work waits for the dedicated droid refactor. No later phase repairs the old droid implementation; a phase needing unfinished droid functionality documents the dependency and leaves that functionality unimplemented.
- The eventual droid refactor determines the authoritative droid schema and installation-identity rules; nothing in the E2A droid projection is a permanent V2 decision.
- **Integration contract for the droid refactor (requirements, not instructions to build now):** provide per-instance appendage records carrying separate slot / instance / part identities; structured `canHold` / `canWield` / `canManipulate` per appendage type; per-instance functional state; installer that can add independent same-type components; a slot vocabulary shared with this project; weapon-to-host links for integrated weapons. The anatomy resolver will consume these through its input contract.

### 14.2 What E2A did not decide

The `anatomy` field's final schema; species exception data (SRC-1, SRC-4, SRC-7/EQUIP-RD-006); droid capabilities (SRC-5); any hand-occupancy, grip, posture or readiness rule (E3+).

