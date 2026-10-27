# Equipment Ecosystem E0 — Repository and Test Baseline

**Status:** E0 research deliverable. Documentation only.
**Authorization:** E0 + E1 only. No production code, schema, data, test or tool was modified.
**Companion documents:** `equipment-ecosystem-e0-consumer-matrix.md` (evidence), `../architecture/equipment-ecosystem-authority-contract-v1.md` (proposed contract), `equipment-ecosystem-e0-e9-roadmap.md`, `equipment-ecosystem-e0-e1-handoff.md`.

Wording convention used throughout: **"Current"** = established by reading the cited lines at the audited commit. **"Approved design"** = stated in the owner directive, *not yet implemented*. **"Static read only"** = not exercised in Foundry.

## 1. Repository baseline

| Item | Value |
|---|---|
| Repository | `docflowGM/foundryvtt-swse` |
| Reference HEAD named in directive | `185dac1bded12f5e40cb851539c0a912f42fc24d` |
| Local checkout HEAD at start of work | `185dac1bded12f5e40cb851539c0a912f42fc24d` (identical; subject: "Merge pull request #1054 … audit/d-005-universal-upgrade-host-text") |
| Branch created | `audit/equipment-ecosystem-e0-e1`, branched from `185dac1` |
| `origin/main` at fetch time | `4392c90dc324a0474e9ca470c514f4ec1a8fcc37` |
| **Upstream movement** | `main` advanced by **3 commits** after the reference HEAD (`e064bf8`, `1677ef6`, merge `4392c90`, PR #1055 `audit/d-005-t2-plan`). `git diff --stat 185dac1 origin/main`: **2 files, 323 insertions** — both new/updated documents under `docs/audits/` for the independent modification audit (`d-005-t2-implementation-plan.md` and a v1.5 correction addendum). No `scripts/`, `data/`, `packs/`, `templates/`, `tests/` or `tools/` file changed. |
| Handling of the divergence | Per directive ("report the divergence; do not silently rebase or incorporate"), the branch was cut from the verified reference HEAD `185dac1` and **was not rebased or merged** onto `4392c90`. All line numbers in these documents refer to `185dac1`. The two upstream commits touch only modification-audit documents and cannot alter any equipment-state citation here. |
| Working tree at start | clean |

## 2. Test baseline (E0.5)

All tests are standalone Node scripts (no `package.json` exists in the repository root; there is no repo-wide runner). Each file was run exactly as `node <file>` from the repository root, using Node `v22.22.0`, with a 300 s timeout per file. Foundry globals are supplied by the in-repo shim (`tests/helpers/foundry-shim/*`); **no run involved a real Foundry instance** — every result below is **offline**.

The set was chosen as (a) the six files the directive names, plus (b) every other `tests/*.mjs` whose source names `InventoryEngine`, `FireStateStore`, `isItemEquipped`, the droid installed-component resolver, species variant profile, `DualWieldCombatShapeResolver`, `resolveWielding`, `wielding-size`, `droid-slot-governance`, `multi-attack` or `reaction-weapon-context`, plus equipment-skill-hook and species profile suites.

### 2.1 Results

31 files executed, **31 exited 0, 0 non-zero**. No test, tool or production file was edited to obtain these results; `git status` stayed clean after the runs.

| Test file | Exit | Self-reported result (last meaningful line) |
|---|---|---|
| `weapon-readiness-production-path.test.mjs` (named) | 0 | "9 checks passed" |
| `weapon-readiness-ui-contract.test.mjs` (named) | 0 | "14 checks passed" |
| `weapon-phase-5d-i-d-b1-mounting.test.mjs` (named) | 0 | "11 checks passed" |
| `weapon-phase-5d-i-d-b2-wielding-size.test.mjs` (named) | 0 | "8" checks reported |
| `weapon-phase-5d-i-d-b5-stock.test.mjs` (named) | 0 | "4 checks OK" |
| `droid-item-classification.test.mjs` (named) | 0 | "Droid item classification predicate guards passed." |
| `character-actor-inventory-index-and-vehicle-skip.test.mjs` | 0 | "all assertions passed" |
| `droid-installation-drift-repair-intent-boundary.test.mjs` | 0 | "(P1-6) tests passed." — the log also prints expected `Error: simulated …` stack traces from deliberately injected failures; exit 0 |
| `droid-installed-component-resolver.test.mjs` | 0 | "dedup/precedence/state guards passed." |
| `droid-mode-adapter.test.mjs` | 0 | **no output at all** (exit 0, 0 bytes). The pass count cannot be reported; recorded as "exit 0, silent" |
| `energy-shield-defense-and-activation-authority.test.mjs` | 0 | "[8/8] … OK" |
| `equipment-skill-hook-roll-regression.test.mjs` | 0 | "6 checks passed" |
| `legacy-equip-state-single-pass-authority.test.mjs` | 0 | "[4/4] … OK" |
| `species-ability-choice-validation.test.mjs` | 0 | PASS |
| `species-movement-languages.test.mjs` | 0 | PASS |
| `species-profile-invariants.test.mjs` | 0 | PASS (93 profiles) |
| `species-snapshot-consumers.test.mjs` | 0 | PASS |
| `species-source-pinned.test.mjs` | 0 | PASS |
| `species-variant-atomic-profile.test.mjs` | 0 | PASS |
| `weapon-phase-5d-f-multiattack-convergence.test.mjs` | 0 | "16 checks passed" |
| `weapon-phase-5d-h-executable-field-closure.test.mjs` | 0 | "26 checks passed" |
| `weapon-phase-5d-i-a-core-attack-residuals.test.mjs` | 0 | "35 checks passed" |
| `weapon-phase-5d-i-b-wielding-activation-threat.test.mjs` | 0 | "17 I-B checks" |
| `weapon-phase-5d-i-c-a-outcome-persistent-effects.test.mjs` | 0 | last check [12] OK |
| `weapon-phase-5d-i-c-b-grapple-control.test.mjs` | 0 | "97 checks passed" |
| `weapon-phase-5d-i-c-c-reaction-defense.test.mjs` | 0 | "73 checks passed" |
| `weapon-phase-5d-i-d-a-residual-manifest.test.mjs` | 0 | "11 checks passed" |
| `weapon-phase-5d-i-d-a1-equipment-skill-hooks.test.mjs` | 0 | "12 checks passed" |
| `weapon-phase-5d-i-d-f-ammo-power-reload.test.mjs` | 0 | "9 checks passed" |
| `weapon-production-mixed-resource-ammunition.test.mjs` | 0 | "2 checks passed" |
| `weapon-runtime-builder-negative.test.mjs` | 0 | "ok" |

(The exact command per file is `node tests/<file>`. A line-per-test results table with wall-time was produced in the session scratchpad and is summarized above; it is not committed because only five files are authorized.)

### 2.2 Environmental exclusions and limits

- **Offline only.** Nothing here proves behaviour inside Foundry v13 (`FOUNDRY_TESTED` is not claimed for any item).
- Other files in `tests/` (391 entries in total) were **not** run; the baseline is scoped to equipment-state, weapon-runtime, droid-component and species-snapshot suites. No claim is made about the rest of the suite.
- `droid-mode-adapter.test.mjs` prints nothing; an exit code of 0 is the only evidence.
- Pass counts are the tests' own printed counts; some print only a banner.
- Node 22 was used because it is what the container provides; no `engines` constraint exists in the repository.

## 3. Current authority map

Verified by reading the modules and their call graph.

| Concern | Current authority | Evidence |
|---|---|---|
| Posture mutation (draw/stow/equip/activate) | `InventoryEngine` → `ActorEngine.updateOwnedItems` | `scripts/engine/inventory/InventoryEngine.js:11,127,201,230,260` |
| Item mutation guard | `ActorEngine` (`updateEmbeddedDocuments` strips `type` mutations, audits boundaries, recalculates) | `scripts/governance/actor-engine/actor-engine.js:816-` , `889-891` |
| Actor in-flight re-entry guard | `ActorEngine._inFlightMutations` (reference counter) — **a re-entry marker for reactive hooks, not a serializing lock**; consumers are hooks (`hp-recompute-hooks`, `force-power-hooks`, `starship-maneuver-hooks`, …) | `actor-engine.js:44, 432-467`; consumers listed by `rg isActorMutationInFlight` |
| Action expenditure | `ActionEconomyConsumption.spend` (returns `{allowed, permitted, committed, rollback}`); rollback is `Persistence.undoLast` | `scripts/engine/combat/action/action-economy-consumption.js:117-216` |
| Action cost of draw/holster | `resolveActionCost(actor, 'drawOrHolsterWeapon', …)` from the feat action-speed runtime | `InventoryEngine.js:17,224` |
| Weapon operating state | `FireStateStore` → `flags.swse.fireState` (v1 record, `patchOwnedState`) | `scripts/engine/combat/fire-state-store.js:16,188-203`; `weapon-runtime/owned-state.js:1-40` |
| Grip legality | `resolveWielding` (owned-state.js), `resolveEffectiveWieldingSize`/`classifySize` (wielding-size.js) | see matrix C5, C6 |
| Weapon-to-weapon host mount | `FireStateStore.mountOnHost/unmountFromHost`, rule from `host-mount.js` | matrix B4, C9 |
| Multiweapon permissions | `DualWieldCombatShapeResolver` | matrix D4 |
| Species publication profile | `species-variant-profile.js` `applySpeciesVariantProfile` | §4 |
| Installed droid components | `resolveInstalledDroidComponents` | §5 |
| Droid slot legality | `DroidSlotGovernanceEngine` | §5 |
| Sheet rows/panels | `RowTransformers`, `PanelContextBuilder`, `concept-context.js`, `character-like-sheet.js` | matrix §4.E |

### 3.1 Sheet class structure (relevant to the "one shared interface" requirement)

Character, NPC and droid sheets are **three classes sharing one base**: `SWSEV2CharacterSheet extends SWSEV2CharacterLikeSheet` (`scripts/sheets/v2/character-sheet.js:31`), `SWSEV2NpcSheet extends SWSEV2CharacterLikeSheet` (`npc-actor-sheet.js:29`), `SWSEV2DroidSheet extends SWSEV2CharacterLikeSheet` (`droid-actor-sheet.js:145`). All equipment handlers live in the shared `character-like-sheet.js`. The default sheet template is `templates/actors/character/v2-concept/character-sheet.hbs` (`actor-sheet-base.js:169`); **two template families coexist** (`templates/actors/character/v2/partials/*` registered through `PANEL_REGISTRY.js`, and `templates/actors/character/v2-concept/partials/*`), plus NPC and droid partials (`templates/actors/npc/v2/partials/npc-gear-panel.hbs`, `templates/actors/droid/v2/partials/armor-panel.hbs`). E8 will have to decide which family is the reuse target.

## 4. Current behaviour summary — equipment posture

1. **Weapon `equipped` is "drawn".** `toggleEquip(weapon)` → `toggleWeaponReadied` → `setWeaponReadied`: spends a Move action (Swift with the Quick Draw metadata), refuses always-readied (natural/integrated) weapons, refuses stowing an ignited lightsaber, writes `system.equipped` plus whichever aliases already exist, rolls the spend back if the write throws (`InventoryEngine.js:66-74, 212-243`). Tests: `weapon-readiness-production-path` ("legacy toggleEquip on an ordinary weapon routes through Draw/Stow (Move) and writes nothing on failed spend").
2. **Activation is a separate field** (`system.activated`, mirrored to `system.active` when present), costs a Swift only for lightsabers and energy shields, and requires the item to be drawn/equipped first (`InventoryEngine.js:144-209`). However, the canonical equipped predicate *also* accepts `system.active` — so activation can make an item read as equipped (matrix R-1).
3. **Armor/equipment equip is an instantaneous toggle** with body-armor exclusivity and shield coexistence, no action spend (`InventoryEngine.js:76-134`). No test exercises it (matrix A2).
4. **No hand-occupancy model.** Searching `scripts/` for hand/manipulator allocation finds only: the grip *choice* (`FS.wielded`), the `isOffhand`/`slot==='offhand'` designation, `FS.heldTogetherIds`, and implicit "has enough hands" in `resolveWielding`. There is no actor anatomy input to any of them.
5. **No EQUIPPED-but-not-READIED state** exists for weapons.
6. **No stock control in the sheet.** `setStockState` has no production caller (only tests); stock persists only if a test or a future caller sets it. `setWielding` is similarly caller-less except for the implicit write from a chosen `wieldedHands` attack option (`fire-state-store.js:236-237`).
7. **Attack gating.** The attack-list hydration and the generic `combat:*` action resolver use drawn state; the direct-id attack path in `CombatEngine._resolveAttackWeapon` and the grip preflight in `combat/rolls/attacks.js` contain no drawn-state check (static read only).
8. **Lightsaber light synchronisation** follows `preUpdateItem` on a named field list (`lightsaber-light-sync.js:185-205`).

## 5. Raw reader/writer counts

| Search (`*.js`/`*.mjs` under `scripts/`) | Lines | Files |
|---|---|---|
| Directive-named symbols (`system.equipped`, `system.isEquipped`, `system.readied`, `flags.swse.equipped`, `isItemEquipped`, `isAlwaysReadiedWeapon`, `toggleEquip`, `setWeaponReadied`, `toggleWeaponReadied`, `setWielding`, `setStockState`, `mountOnHost`, `unmountFromHost`) | 117 | 35 |
| Wider: `\bequipped\b`, `\bisEquipped\b`, `\breadied\b`, `equippable` | 548 | 101 |
| `fireState` / `FireStateStore` | 81 | 15 |
| `system.active` / `system.activated` | 59 | 29 |
| Template lines mentioning `equipped` / `readied` / equip-related actions | 96 | 23 files (see §3.1) |
| Consumer-matrix rows (grouped call sites, each classified) | **72** | — |

The wider search overcounts: it includes effect-application scope strings, progression payload fields and suggestion-engine locals. The matrix groups and classifies the production-relevant ones. `flags.swse.equipped`, `system.equipStatus`, `system.status`, `system.state` and `system.carried` occur only as reader inputs, never as written fields by InventoryEngine.

## 6. Species and anatomy inventory (E0.2)

**No SWSE sourcebook was consulted and no anatomy was inferred.** The findings below describe only what the repository already stores. Any statement about a published rule is marked `SOURCE_REVIEW_REQUIRED`.

### 6.1 Structure that exists

- Canonical species live in `packs/species.db` (JSON-lines, one document per species with a `system` block). Species with publication variants carry `system.variants[]`; a variant with `completeSnapshot: true` is a full publication profile (variant fields: `id, label, source, completeSnapshot, sourceProfileId, size, speed, movement, abilities, abilityMods, abilityChoice, skillBonuses, special, languages, naturalWeapons, description, traits, runtimeStatus`).
- `applySpeciesVariantProfile` is the single authority that overlays a variant (`scripts/species/species-variant-profile.js:191-196`). For complete snapshots it **builds a new object from an explicit whitelist** of fields; "nothing rules-bearing is read from the base entry" (`applyCompleteSnapshot`, `:98-144`). Legacy overlay variants fall back to the base species field-by-field (`applyLegacyOverlay`, `:146-189`) and report `variantFallbackFields`.
- Trait entries inside `variant.traits[]` may carry an optional `rules[]` array of typed rules; the rule types actually present in the pack are `featGrant`, `defenseModifier`, `reroll`, `classSkillGrant`, `trainedSkillChoice` (counted over all species). Trait entries without `rules` are display-only.
- `listMissingSnapshotFields` validates only the required snapshot fields (`id, sourceProfileId, size, speed|landSpeedUnspecified, movement, abilityMods, languages, special, traits, skillBonuses, naturalWeapons`) (`:69-89`).

### 6.2 Can optional anatomy be added without breaking snapshot authority?

- **Inside a trait's `rules[]`: yes, structurally.** Traits are copied wholesale into `canonicalTraits` (`applyCompleteSnapshot`: `canonicalTraits: [...variant.traits]`), so an extra rule entry in an existing trait survives the snapshot projection and is publication-scoped. Whether the rule-type vocabulary may be extended is `OWNER_APPROVAL_REQUIRED`.
- **As a new top-level variant field (e.g. an `anatomy` block): not without an explicit change to `applyCompleteSnapshot`.** Because the snapshot is a whitelist, an unlisted field on a variant would be **silently dropped** from the effective profile. Adding it to the whitelist is a code change inside the "single authority" and must preserve the no-inheritance guarantee. `listMissingSnapshotFields` would treat it as optional (it validates only required fields).
- **On the base species entry: it would not be inherited by complete-snapshot variants** (by design), so a base-level default anatomy cannot serve as the "two arms unless specified" default for snapshot actors; the default would have to live in the resolver (consistent with the approved "default rule" tier).
- Actors that use a resolved snapshot are identified by `actorUsesResolvedSnapshot` (`species-variant-profile.js:42-46`); such actors must not consult name-keyed base data.

### 6.3 Confirmed existing support for the named cases

| Case | Current repository state | Status |
|---|---|---|
| Standard humanoid anatomy | **No anatomy field exists anywhere.** Two arms are implicit (nothing consumes an arm count). | no structured support |
| Codru-Ji "Extra Arms" | Present only as a **display-only trait** `extra-arms` (no `rules[]`) in the variant `codru-ji-leg-2c-03` (`packs/species.db`; `docs/audits/swse-species-implementation-status.md:63` classifies it `MULTI_ARM_EQUIPMENT_CAPACITY`, a label produced by the hydration tool, **not a runtime rule type**). The trait text is stored as prose in the pack. | prose only; `SOURCE_REVIEW_REQUIRED` before any structured field is written |
| Ryn "Prehensile Tail" | Display-only trait `prehensile-tail`, no `rules[]` (variant `ryn-sv-2f-06`; status doc line 100 labels it `CARRYING_EXTRA_LIMB`, again a tool label). | prose only; `SOURCE_REVIEW_REQUIRED` |
| `multiLimb` migration parsing | `migrate-species-to-structured-rules.js:1052-1086` can emit `{type:'multiLimb', limbCount, effects}` rules from text patterns (four arms / extra limbs / quad-limbed / elongated reach) but **no runtime consumer of `multiLimb` exists** (`rg multiLimb\|limbCount` → only that script). The legacy sidecars `data/species-traits.json` / `species-traits-migrated.json` carry a `quad-limbed` structural trait for Codru-Ji whose text mentions only a grapple bonus. | dead-end artifact; do **not** treat as anatomy authority |
| Other multi-limb / holding-appendage species | Not enumerated: finding them would require interpreting prose across the pack, which the directive forbids. | `SOURCE_REVIEW_REQUIRED` (owner/reviewer to supply the list) |

### 6.4 Observed data inconsistency (reported, not adjudicated)

For Codru-Ji the repository holds **different recorded grapple-bonus values** in different layers: the legacy sidecar `quad-limbed` trait records a +2 grapple bonus (`data/species-traits.json`, id `quad-limbed`), the pack base entry's `canonicalStats` records a +5 to Grab and Grapple, and the complete-snapshot variant records a +5 grab-specific "Skilled Grappler" trait. This is a species-bonus question unrelated to equipment; it is flagged for the rules register in the handoff (§"Proposed register entries"), not resolved.

## 7. Droid inventory (E0.3)

### 7.1 Where appendage truth comes from (three data sources plus two resolvers)

Droid appendage facts are spread over **three differently shaped definition sources**. Their own headers establish which is canonical (`scripts/domain/droids/droid-part-schema.js:1-25`, `scripts/data/droid-part-schema.js:1-18`).

| Layer | Module | Appendage content |
|---|---|---|
| Canonical droid-part registry | `scripts/data/droid-part-schema.js` ("CANONICAL droid-part registry") | `claw, hand, tool, instrument, probe` with `appendageType` only (`:143-147`); enhancements/mounts with prerequisites and structured `rules`: `stabilized-mount {prerequisiteIds:['tool'], rules:{weaponCountsAsTwoHanded:true}}` (`:161-167`); `multifunction-apparatus {rules:{mountCapacity:3, oneMountedToolOrWeaponActive:true, switchAction:'swift'}}` (`:178-183`); `projectile-appendage`, `rocket-arm` weapon profiles (`:184-197`). **No manipulation/wield capability fields.** `rg weaponCountsAsTwoHanded\|mountCapacity\|oneMountedToolOrWeaponActive` → defined here, **no consumer**. |
| Builder catalog | `scripts/data/droid-systems.js` `DROID_SYSTEMS.appendages` (`:496-583`) | per appendage `role`, **`canManipulate`**, `canAttack`, `createsUnarmedAttack`, `features[]`, `restrictions[]` (probe: not manipulate; instrument/tool/claw/hand: manipulate; hand features include "Wield weapons"; stabilized mount: "Can hold a weapon as if wielded in two hands", `canManipulate:false`). `DROID_SYSTEMS` is imported by `unarmed-attack-helper.js` (`unarmedDamageTable`), `droid-customization-engine.js`, the suggestion engine and builder-view code. This is repository data; it was **not** checked against a sourcebook (`SRC-5`). |
| Identity/prerequisite adapter | `scripts/domain/droids/droid-part-schema.js` ("prerequisite/identity compatibility module, NOT the canonical droid-part registry") | overlays with traits (`probe canManipulate:false`, `claw ['manipulator']`, `hand ['true-hand','manipulator']`, `mount {requiresAny:['tool'], traits:['weapon-mount']}`, `multifunction-apparatus {grants:{toolMountCapacity:3}, activeLimit:1}`) at `:186-219`; `BASE_APPENDAGE_SLOTS` = `leftArm`, `rightArm` (`:89-92`) and `resolveAppendageSlots` (`:831-867`, positional fallback). **`rg resolveAppendageSlots\|BASE_APPENDAGE_SLOTS` finds no caller outside the file** (and no test). Its live consumer is `data/prerequisite-checker.js:77`. Its ids ("short ids like 'heuristic'") differ from the canonical registry's ("heuristic-processor"); the file states the alias tables agree "only because … kept in sync by hand". |
| Installed-component resolution | `droid-installed-component-resolver.js` `resolveInstalledDroidComponents` | merges installed-ledger, embedded Items, `system.droidSystems` records (single and array fields) and legacy modifications by **`canonicalId` (a component type slug)**, picks the precedence-winning candidate, reports `installed/enabled/active` and `conflicts[]` (`:396-471`) |
| Garage installer | `scripts/engine/customization/droid-customization-engine.js` | on install of an appendage writes `droidSystems.appendages[]` with a **`location` key**: `'left-arm'`, then `'right-arm'`, else `additional-<array length+1>` (`#nextAppendageLocation`, `:573-578`, applied at `:524-528`) |
| Sheet projection | `scripts/sheets/v2/droid-sheet/droid-systems-resolver.js` `_resolveAppendages`, `_buildAppendageSlots`, `_resolveIntegratedWeapons` | slot views with `DEFAULT_APPENDAGE_SLOTS = left-arm, right-arm` (`:26-29`); assigns by substring match on `location/slot`, then **positional fallback** `items[index]` (`:414-426`) |
| Slot legality | `DroidSlotGovernanceEngine` (`droid-slot-governance.js:30`) | `appendage` is a multi-slot category |
| Validation | `scripts/engine/droid-validation-engine.js:63-70` | requires at least one appendage |

### 7.2 Answers to the specific questions

- **Stable appendage identity?** *Partial; not an ID usable as a manipulator ID.* The Garage writes a per-entry `location` (`left-arm`, `right-arm`, `additional-N`), and the sheet resolver reads it. But: (a) `additional-N` is derived from the *current array length*, so it is **not stable if an entry is removed** (static read); (b) the installer's `#upsertArrayEntry` **removes any existing entry with the same normalized part id before pushing the new one** (`droid-customization-engine.js:566-571`), so installing a second appendage of the same part type appears to *replace* the first rather than add a second — static read only, not exercised; the implicit default of two arms is the fallback when `droidSystems.appendages` is empty (`isDefault`); (c) the installed-component resolver groups by component *type* slug (`groups` keyed by `canonicalId`, `primary = sorted[0]`, `droid-installed-component-resolver.js:403-415`), so several same-type installed appendages would collapse into one component row; (d) the unreferenced adapter helper spells slot keys `leftArm/rightArm`, the live code `left-arm/right-arm`; (e) positional fallbacks can assign a slot the part did not declare. **Individual stable manipulator IDs would be new work (OA-8), and the same-type replacement behaviour is a prerequisite finding for the proposed scenario "droid adds an approved manipulator".**
- **Functional/disabled representation.** Exists at component level: `enabled !== false`, `system.disabled !== true` (`itemIsEnabled`, `droid-installed-component-resolver.js:139-141`), `installed`, `active`. No *damage* or *severed* appendage notion was found.
- **Hand/claw/tool/instrument capability metadata.** Present in the builder catalog (`canManipulate`, `canAttack`, features/restrictions) and, separately, as adapter traits; **absent** from the canonical registry. The three do not share a schema. Whether claw/tool/instrument may *wield* a weapon is not encoded as a field (only prose in `features`/`restrictions`) and is `SOURCE_REVIEW_REQUIRED` (`SRC-5`).
- **Weaponized appendages / integrated weapons.** Canonical registry `weaponProfile` entries (`projectile-appendage`, `rocket-arm`) and `isWeaponizedDroidPart` (`scripts/data/droid-part-schema.js:696-698`); the sheet resolver partitions weaponized parts (`partitionWeaponizedParts`, `droid-systems-resolver.js:171,450`). Materialization to owned weapon Items sets `equipped:true, integrated:true` (`chat-interaction-bridge.js:113`, `patches/runtime-bugfix-hotfixes.js:97`) with **no link back to the installed part id** (matrix G3, G4).
- **Multifunction apparatus / stabilized mounts.** Structured `rules` exist in the canonical registry (`mountCapacity`, `oneMountedToolOrWeaponActive`, `switchAction`, `weaponCountsAsTwoHanded`) but **nothing consumes them** for equipment occupancy.
- **Host relationships.** None for droids (matrix G1-G4).
- **Duplicated/legacy projections.** (i) three appendage-capability sources (above); (ii) two slot-key spellings, one of them in an unreferenced function; (iii) droid-sheet `context-builder.js` carries its own equip predicate (matrix E5); (iv) `collectActorDroidSystemParts` (adapter, `:643-672`) and `resolveInstalledDroidComponents` both read installed parts — the latter's header declares it the reconciliation SSOT.

No droid installation, Garage or governance logic was changed.

## 8. Mounting and modification boundaries (E0.4)

Responsibility matrix — distinct mechanical domains that **must not be collapsed** into one installation workflow:

| Domain | Current owner | Persistence | Cost / check | Relation to equipment posture |
|---|---|---|---|---|
| Weapon configuration (e.g. stun setting, extended blade, stock position, configuration states) | `FireStateStore` (`setConfiguration`, `setStockState`, `setPowerSourceState`, …) | `FS` | Move for stock change; others per record | operating mode of an already-held/owned weapon; independent of posture |
| Physical weapon-to-weapon attachment / mount | `FireStateStore.mountOnHost` (+`host-mount.js`) | `FS.mountedHostId` on the mounted weapon | Mechanics check rolled before write; time reported, never simulated | host identity; **not** an installation/modification |
| Armor weapon mount | (none; only a boolean `system.weaponMount` set by customization effect `weapon_mount_standard`, `effect-resolver.js:413-417`) | item `system` | — | **no host link exists** |
| Integrated droid installation | droid installed-component resolver + Garage governance | `system.droidSystems`, ledger, Items | per droid rules | integrated weapon Items are `equipped:true, integrated:true` |
| Armor-integrated equipment | no dedicated system; canonical classification only (`wornClassOf`, matrix C7) | n/a | — | classification only |
| Permanent SWSE modification (upgrades) | `UpgradeService`, `UpgradeSlotEngine`, `ItemCustomizationWorkbench` (certification-gated, independent project) | item data | slot costs, install checks (D-001…D-015 pending) | **untouched by this project**; reads `equipped` for display only (matrix F10) |
| Temporary mechanical effect | ActiveEffects / ModifierEngine / `ItemEffects` ("while equipped" scope uses `system.equipped` or `integrated`) | embedded effects | per effect | consumes equip state as a trigger only (matrix F9) |

Modification-registry boundary: nothing under `data/`, `packs/`, `scripts/engine/customization/` or the modification ledgers was edited. Decision records D-004, D-005, D-006, D-010, D-011, D-013, D-014, D-015 were **not read for status change and not modified** (`docs/audits/swse-rules-decisions-pending.md` untouched).

## 9. Verified missing capabilities

1. No EQUIPPED (held, not ready) posture for weapons.
2. No per-manipulator occupancy; no actor anatomy resolver; no structured anatomy data for any species.
3. No stable instance-level droid appendage identity usable as a manipulator ID.
4. No host relationship from a weapon to armor, a droid appendage or a droid chassis.
5. No production entry point for stock position or explicit grip selection outside the attack flow.
6. No multi-item equipment transition coordinator; no preview/confirm/revalidate flow.
7. No hand-conflict resolution prompt (Assisted Hand Management).
8. No shared "effective equipment view" for character/NPC/droid sheets (three predicate copies in sheet code, matrix E2, E4, E5).
9. No migration/versioning for equipment posture state.

## 10. Reusable systems (confirmed present)

`InventoryEngine` (spend→write→rollback pattern), `ActorEngine.updateOwnedItems` (batched owned-item updates), `ActorEngine.applyMutationPlan({transactional:true})` (snapshot/restore, best-effort, see contract §E1.5), `ActionEconomyConsumption` (spend with rollback handle), `resolveActionCost('drawOrHolsterWeapon')` (Quick Draw aware), `FireStateStore` (+`readFireState`, `heldGroupOf`, host eligibility), `resolveWielding`/`resolveEffectiveWieldingSize`/`resolveHeldGroup`, `DualWieldCombatShapeResolver`, `applySpeciesVariantProfile`/`actorUsesResolvedSnapshot`, `resolveInstalledDroidComponents`, `DroidSlotGovernanceEngine`, `isArmorItemEquipped` (a single-predicate model worth copying), `buildWeaponReadinessView` (readiness view model), `PanelContextBuilder`/`RowTransformers`.

## 11. Limitations of this baseline

- Static analysis plus offline Node tests; no Foundry runtime session.
- Dynamic imports, macros and world-script usage of unreferenced helpers (matrix A8-A10) cannot be excluded by static search.
- Counts are search-derived and may include comment lines.
- Species and droid facts are the repository's own recorded data; none were verified against a sourcebook in this phase.
