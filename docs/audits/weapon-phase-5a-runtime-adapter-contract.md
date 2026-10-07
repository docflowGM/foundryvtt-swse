# Phase 5A — Weapon Runtime Adapter Contract

**Status:** design contract (no implementation) · derived from `weapon-phase-5a-runtime-ingestion-map.md` and `data/audits/weapon-phase-5a-runtime-consumer-matrix.json`

> The Phase 3B canonical schema and the Phase 4H semantic/selector/proficiency authority are **frozen**. The runtime adapts to them. Nothing in this contract changes, flattens or renames a canonical field.

```
Frozen canonical authority (3B mechanics + 4H semantics/selectors/proficiency)
        │  generated, hash-pinned, deterministic
        ▼
WeaponAuthorityRegistry            ← one read-only lookup by identityKey
        │
        ▼
WeaponRuntimeResolver.resolve(weaponItem, ctx) ──► ResolvedWeapon ──► ResolvedAttackProfile
        │                                              (normalized view; immutable)
        ▼
existing combat SSOTs (attacks.js, combat-roll-math.js, AmmoSystem, damage packet chain …)
```
Legacy/custom items go through the **compatibility adapter**, which produces the same `ResolvedWeapon` shape from legacy fields (and is the only place name/text heuristics may live).

## 1. Authority inputs

| Input | Source | Runtime form |
| --- | --- | --- |
| Canonical mechanics per identity | Phase 3B `canonicalStats`, `qualities`, `conditionalQualities`, `conditionalDamageProfiles`, `qualityParameters`, `proficiencyRules`, `operation`, `schemaFamily`, `weaponGroup` | `WeaponAuthorityRegistry` records |
| Semantic tags, exact/family/group/proficiency selectors, modes, payloads, alternate proficiency routes, ability interactions, authored-vs-derived selector flag | Phase 4H combined authority | same records (`semantic`, `selectors`, `proficiency`, `abilityInteractions`) |
| Global SWSE rule tables | `data/actor-weapon-ranges.json` (band tables), global Burst/Autofire rules, combat math | stay global; **not copied into canonical records** |
| Owned-item mutable state | the Item document | `system.ammunition.current`, equipped/two-handed flags, installed upgrades, selected mode/payload/configuration |

**Registry delivery (recommendation for 5B/5F).** A deterministic builder emits one runtime registry file (`data/weapons/canonical-weapon-registry.json`, ≈0.9 MB of runtime-relevant canonical data for 203 identities; hash recorded in the builder output and verified in CI) from the frozen 3B + 4H files. It is loaded once at `init`/`ready` like the other `data/*.json` registries. Items do **not** embed mechanics; they carry only an identity link and mutable state. This keeps one SSOT, avoids 203 × N copies in the compendium and lets the registry be versioned independently of world data.

**Item → identity link (resolution order, no name matching for canonical resolution):**
1. `item.flags.swse.canonicalWeapon.identityKey` (stamped by the 5F production migration and by creation from a canonical compendium entry);
2. `item.flags.core.sourceId` / compendium id mapped through the registry's `productionId → identityKey` index;
3. none ⇒ legacy compatibility adapter.
Names are never used to resolve a canonical identity.

## 2. Runtime outputs — `ResolvedWeapon`

```
ResolvedWeapon {
  source: 'canonical' | 'legacy'            // which adapter produced this view
  degraded: boolean                          // canonical link present but registry data unavailable
  identity { identityKey, canonicalName, weaponGroup, schemaFamily, repoId }
  profiles: ResolvedAttackProfile[]          // ≥1; enumerated from 3B attackProfiles, reconciled with 4H modes by id
  defaultProfileId
  payloads: ResolvedPayload[]                // 3B payloadProfiles / deliveryMethod
  configurationStates, wielding              // 3B configurationStates / wieldingRules
  selectors { exact, group, proficiency[], families[], authored|derived }
  semanticTags { final[], tradeoff[], conditional[{tag,condition}] }   // build/applicability joins ONLY
  abilityInteractions[]                      // exact named feat/talent joins (ability → weapon/profile)
  ownedState { ammoCurrent, equipped, twoHanded, installedUpgrades }   // read from the Item, never from the registry
}

ResolvedAttackProfile {
  id, label, kind ('attack'|'utility'|'special')
  branch: 'melee'|'ranged'                   // from profile.schemaFamily.branch (+ thrown quality)
  requiredProficiency { native, exoticIdentity?, alternateRoutes[] }
  attackResolution { mode, defense, ignoredDefenseComponents, onMiss }   // standard|area|grab|override × reflex|fortitude|…
  damage: ResolvedDamage                     // §4
  range: ResolvedRange                       // §5
  resource: ResolvedResource                 // §6
  rateOfFire[], qualities{accurate,inaccurate,arc,ignoresDR,areaEffect,autofireOnly,doubleWeapon,thrown,reach}
  area{shape,radius,length,width…}, reach, hands, firingConstraints, preparedAttack, activationRequirements
  conditionalModifiers[], criticalEffects[], triggeredEffects[], notes[]
  stun { capability, settingAvailable, nativeOnly, damage?, rangeRule? }   // from canonical stun model
}
```
The resolved view is immutable and cacheable (§11). Consumers read **only** this object; none of them parse `system.*` legacy fields or the raw frozen schema.

## 3. Profile selection contract

* The unit of attack is the **profile**, not the Item. `ctx.profileId` selects it; absent ⇒ `defaultProfileId` (the 3B `primary`/first profile; for hybrids the profile matching the item's equipped/wielded configuration).
* Multi-profile identities (31/203; 6 cross melee/ranged) surface a profile choice in roll-config (e.g. Energy Lance melee/plasma-bolt, Siang Lance ranged/bayonet, Massassi Lanvarok disc/melee, Electropole melee/thrown). Double weapons expose `end1`/`end2` as two profiles; a full attack consumes both.
* **Profile-source reconciliation.** Profiles are enumerated from 3B `attackProfiles`. Phase 4H authored `modes`/`modeSelectors`/`profileSelectors` are matched to them by id/label; 4H modes with no 3B profile (Atlatl/Cesta launcher, Amphistaff forms, Shock Stick, Vibrobayonet, Electropole, PLX-2M) are exposed as `selectorOnlyModes` and flagged `profileDefinitionIncomplete`; the adapter never invents mechanics for them. These 7 identities are recorded as a planner review item; the frozen schema is not edited.
* The selected `profileId` (plus payload and damage mode) is **serialised into the workflow context** carried by the attack card and the Roll Damage/Apply Damage buttons. (Today Apply Damage rebuilds the packet from item id + total, which would drop the profile.)
* Payload selection (`ctx.payloadId`) and configuration state (`ctx.configurationId`) follow the same carry-through. Payload-owned damage, area and damage type come from the payload, never from the launcher (Wrist Rocket Launcher, Missile Launcher family).

## 4. Damage contract

`resolveDamageProfile(weapon, {actor, profileId, payloadId, damageMode, target})` → `ResolvedDamage`:
```
{ baseFormula|null, baseMode ('dice'|'fixed'|'none'|'special'|'modifier'|'double'|'ammunition'|'alternate-profiles'|'conditional'),
  dice{count,die,flat}, multiplier,
  types { mode: 'single'|'and'|'or'|'varies'|'special'|'none', list[], qualifiers[] },
  components[]  (AND damage → typed components that split one rolled total),
  stunMode?, ionMode?, conditionalDamage[], criticalEffects[], triggeredEffects[], source: 'profile'|'payload'|'stun' }
```
Integration without reopening the certified math (damage audit §5):
* base dice: `combat-roll-math.js:972` reads `context.resolvedDamageProfile.baseFormula` first, then the existing `stockDamageFormula`/legacy string (single optional input; die-step, extra-dice, flat, talent, critical logic untouched);
* types/components/stun/ion/mode travel through `options.damageComponents`, `options.damageTypes`/`damageType`, `stun`/`ion`/`damageMode`, which already outrank weapon fields; add one authoritative short-circuit so `damageTypesFromContext` stops appending name/property heuristics for canonical weapons;
* critical multiplier via `context.critMultiplier` (already a floor in `resolveCriticalMultiplier`); new `damageMultiplier` option on `buildDamageFormula` (pure);
* `none`/`special`/`modifier`/`ammunition` base modes need an explicit no-roll/payload-required decision in `damage.js` (never `String(object)`);
* OR damage is resolved to one type before the roll; AND damage becomes components.
Semantic tags never choose damage behaviour.

## 5. Range contract

From the canonical profile: `profileId` (pistols/rifles/heavy-weapons/simple-weapons/thrown-weapons), `allowedBands`, `hardMaxSquares`, `penaltyApplication`, `qualities.accurate/inaccurate/thrown/reach`, `conditionalRangeRules`, and "treat as pistol/rifle for range" facts. From **global** rules: the band widths and the −2/−5/−10 penalties (`data/actor-weapon-ranges.json`), applied by one helper that replaces the four copies of those numbers. Band tables are **not** copied into canonical records. Inaccurate/Accurate become real modifiers sourced from the profile (today Inaccurate has no effect and Accurate exists only inside two feat patches). Out-of-range/forbidden bands are reported by the resolver; enforcement policy is a 5D decision.

## 6. Ammo / resource contract

Static definition (canonical `ammo`/`resource`/`resourceProfiles`/`resourceConsumption`): resource kind, capacity, reload action, replaceable/integrated/rechargeable, accepted payload family, per-profile consumption. **Mutable state stays on the owned item** (`system.ammunition.current`; for weapons with several independent resources, `flags.swse.resourceState[resourceId]`). The resolver returns `ResolvedResource { resourceId, capacity, current (read from the item), reloadRule, costPerAttack }` and never writes. `AmmoSystem` keeps its `ActorEngine` write path. `costPerAttack` = profile `resourceConsumption.baseUnits × multiplier`, with Burst Fire (5) and Autofire (10) kept as **global rules** applied on top when the option is active (replacing the three hard-coded copies). Unresolved sources (`not-stated`, 9 identities) stay unresolved — the adapter reports `capacity: null`, it does not invent a number; self-contained weapons report no tracked resource. Mutable state is never put into canonical authority.

## 7. Proficiency contract

`resolveProficiency(weapon, profile, actor)` → `{ proficient, route, reason, penalty }`:
1. profile requirement = native group (`simple|pistols|rifles|heavy-weapons|advanced-melee|lightsabers`) or an **exact Exotic identity** (`exoticWeaponIdentity`);
2. actor entitlements from the existing ability/feat/class/species sources (Weapon Proficiency (X), Exotic Weapon Proficiency (X), class/species grants);
3. frozen alternate routes evaluated in order: species overrides (e.g. Wookiee+rifles→Bowcaster, Gungan+simple→Atlatl/Cesta, Kissai+simple→lanvarok family, Nagai→Tehk'la Blade, Squib/Verpine, Massassi advanced melee), ability overrides (Siang Lance Mastery, Exotic Weapons Master), profile-specific requirements (Siang Lance bayonet=simple, Energy Lance profiles), and exact named classifications (Sith Sword counts as a lightsaber for Block/Deflect/Redirect Shot only);
4. result feeds the existing −5 penalty application (`combat-roll-math.js:441`) and the existing Spacehound/implant bypasses (re-expressed as ability overrides).
**Boundary:** `system.proficient` is *actor-specific derived state*, not canonical weapon data. For canonical weapons it is ignored; for legacy items it remains the existing override. The canonical item/registry never stores an actor's proficiency truth. The resolver's cache key includes the actor's proficiency revision (§11).

## 8. Selectors and tags contract

`matchesWeaponSelector(resolvedWeapon, selector, {profileId})` understands `weapon:<identityKey>`, `weapon-family:*`, `weapon-group:*`, `weapon-proficiency:*`, `profile:<id>`, `payload:<id>`, species/ability override selectors. Feats/talents declare what they apply to; weapons declare what they are. Semantic tags (final/tradeoff/conditional) feed **recommendation and applicability joins only**. Combat execution must not branch on tags (`ranged`→DEX, `stun`→stun mode, `control`→condition track); it uses the structured profile fields above. Existing code that conflates the two (`getAttackType`, Weapon Focus fuzzy matching in `scoped-combat-feat-resolver.js`, the stun inference in `roll-config.js`, text classifiers in the suggestion engines) is migrated in 5C–5E.

## 9. Legacy fallback and failure behaviour (amended in 5B-0 — planner ruling A: canonical fails closed)

* **No canonical identity** (no `flags.swse.canonicalWeapon.identityKey` stamp and no compendium source id in the production-id index) ⇒ legacy compatibility adapter (`source:'legacy'`, `heuristics[]` naming every inference). Name/text heuristics live **only** there.
* **Canonical identity + valid registry entry** ⇒ canonical resolver. The legacy adapter is never invoked (CI proves it).
* **Canonical identity + missing or corrupt registry entry** ⇒ **ERROR** (`canonical-registry-entry-missing` / `-corrupt`). Never "treated as legacy".
* **Explicit valid `profileId`** ⇒ that profile. **No `profileId`** ⇒ the canonical default profile (`operatingModes.default` when it names a profile, else the first 3B attack profile).
* **Explicit unknown `profileId` / `payloadId` / `configurationId`** ⇒ **ERROR**. A default is never substituted for an explicit request. A selector-only (unmatched 4H) mode named as `profileId` ⇒ `profile-not-executable` ERROR.
* Canonical never silently falls back to heuristics. Runtime callers use `resolveSafe()`, which reports a GM-visible error (`ui.notifications`) and returns `{source:'error'}`; strict callers/tests use `resolve()`, which throws `WeaponRuntimeError`.
* Homebrew/old-world items keep rolling through the legacy adapter; they never receive canonical-only features (profiles, alternate proficiency routes).

## 10. Integration points

| Seam | Consumes | Change |
| --- | --- | --- |
| `roll-config.js` model/preview | `ResolvedWeapon.profiles`, stun/ion availability, range profile | profile + damage-mode selectors; drop stun name inference for canonical |
| `computeFinalAttackComposition` / `rollAttack` | resolved context in the options bag | pass profile/proficiency/ammo cost; keep orchestration |
| `resolveAttackBonus` | `resolveProficiency`, profile ability/branch/range penalty | replace candidate builder and `proficient` short circuit |
| `resolveDamageComposition` | `resolvedDamageProfile` (single input, §4) | replace line 972 read; keep everything else |
| `damage.js`, chat buttons, Apply Damage | serialised profile/payload/mode | carry-through; re-resolve on Apply as fallback |
| `damage-packet-*`, `damage-type-rules` | authoritative types/components | skip inference when authoritative |
| `AmmoSystem` | `ResolvedResource` | capacity/cost from resolver; write path unchanged |
| `CombatOptionResolver`, `WeaponsEngine`, planners, grapple, reactions | resolved qualities/wielding/size/exact selectors | replace text/name classifiers |
| item sheet, store, suggestion | `ResolvedWeapon` read-only view | display / scoring |

## 11. Caching (amended in 5B-0 — planner ruling B: no actor-dependent caching)

5B caches **only** registry/immutable records and two indexes built once: `identityKey → record` and `productionId → identityKey`. The registry is deep-frozen and never mutated.

5B does **not** cache effective proficiency, actor entitlements, current ammo, equipped state, temporary configuration, turn state or target rules, and does **not** invent an "actor proficiency revision". Every `resolveProficiency` call re-reads the actor. A later phase may add display/derivation caching only with an explicit invalidation key.

## 12. Migration ordering (Phase 5B → 5H)

| Phase | Work |
| --- | --- |
| **5B** | `WeaponAuthorityRegistry` (+ deterministic registry builder and hash), `WeaponRuntimeResolver` core: identity resolution, profile enumeration/selection (incl. 3B↔4H reconciliation), proficiency resolution, branch/range resolution, damage/resource resolution, **legacy compatibility adapter**, unit tests against the 203 identities and the probe weapons. No consumer changes. |
| **5C** | Attack + proficiency consumers: branch resolver shim, `combat-roll-math` proficiency, roll-config profile selector, `rollAttack` pass-through, CombatOptionResolver/WeaponsEngine/Weapon Focus matching. |
| **5D** | Damage + range + ammo + mode consumers: base-dice seam, damage types/components, packet builders, range helper, `AmmoSystem`, serialised profile for Apply Damage. |
| **5E** | Specialised rules: double weapons/full attack, hybrids, payloads, area/autofire, Block/Deflect/Sith Sword, grapple, droid/NPC adapters. |
| **5F** | Production weapon data migration (203 identities, preserving ids and category-pack membership; item link stamping; store/template reference handling). |
| **5G** | Legacy field/heuristic retirement and dead-code removal. |
| **5H** | End-to-end runtime certification (CI strict-mode assertions + Foundry runtime matrix). |

## 13. Acceptance for Phase 5B (first implementation)

Registry builds deterministically and verifies against 3B/4H; `resolve()` returns `source:'canonical'` with zero heuristics for all 203; every probe weapon resolves its profiles/proficiency routes as in the frozen authority; legacy items resolve through the compatibility adapter with unchanged results; no combat consumer is modified; the existing rolling-system tests (316) stay green.

## 14. Planner corrections applied in Phase 5B (A–E)

* **A — Canonical fails closed.** See §9.
* **B — No actor-dependent caching.** See §11.
* **C — Incomplete 3B↔4H profile reconciliation.** Seven identities (Amphistaff, Atlatl, Cesta, Shock Stick, Vibrobayonet, Gungan Electropole, PLX-2M) have 4H modes that cannot be matched to a 3B attack profile by explicit id, explicit branch evidence, or strict cardinality. Those 4H modes are exposed as `selectorOnlyMode:true, profileDefinitionIncomplete:true, executable:false` in `diagnostics.unmatchedPhase4HModes` / `diagnostics.selectorOnlyModes`. Mechanics are never synthesized and neither frozen authority is altered.
* **D — Profile-specific branch.** Branch, proficiency group and exotic identity come from the selected 3B profile's `schemaFamily` (Massassi Lanvarok: `disc` ranged / `melee` melee; Siang Lance: `ranged` ranged / `bayonet-aao` melee; Electropole: `melee` melee / `thrown` ranged). The weapon-level branch is classification only.
* **E — Damage-type representation.** AND = **one** damage component carrying all simultaneous types; OR = one selected type before application (`requiresDamageTypeSelection` until chosen); single = one component/one type; a separate component exists only where the authority models a separate damage event (e.g. Neuronic Whip `damageComponents`).

## 15. Phase 5B-R reconciliation (planner rulings)

* **Typed modes** — a Phase 4H selector mode is an ATTACK_PROFILE, CONFIGURATION, OPERATING_MODE or SPECIAL_ACTION (plus PROFICIENCY_ROUTE for a route descriptor); §14 item C (“non-executable selector-only modes”) is superseded: 0 unresolved modes remain. See `weapon-phase-5b-r-runtime-authority-reconciliation.md`.
* **Configuration-driven resolution** — profiles carry `availableIn` (from `activationRequirements{type:configuration}`); a configuration may delegate to another certified identity's attack via `operation.configurationResolution` (Vibrobayonet detached → Vibrodagger) without duplicating stats.
* **Canonical item sheet (5G contract)** — rules fields read-only for canonical-linked Items; mutable state only; GM “Create Custom Copy / Detach From Canonical Authority”.
* **Hybrid conditions** — AUTO / PROMPT / UNSUPPORTED; never parse prose; answers persist in `AttackWorkflowContext`; 5J requires 0 UNSUPPORTED.
