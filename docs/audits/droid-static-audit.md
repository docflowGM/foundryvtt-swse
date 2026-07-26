# Droid Static Audit

Audit scope: droid actor/sheet/system architecture only. No runtime code was changed. This is a static repository review — no live Foundry VTT v13 testing was performed.

## Executive verdict

The droid sheet itself is not the primary problem. It is reasonably consolidated into the shared V2 actor sheet and a dedicated droid context builder. The serious problem is underneath it: droid construction, installed systems, derived modifiers, inventory, Garage customization, stock-droid importing, and virtual droid-part attacks do not share one authoritative data model.

My overall assessment is:

Droids currently have a functional presentation layer sitting on top of a fragmented mechanical state model.

I would not expand droid features until the authority split is resolved. The current design can display duplicate systems, lose systems from particular panels, leave removed systems mechanically active, double-apply bonuses, and overwrite published stock-droid statistics.

This was a static audit only. I reviewed registration, actor preparation, sheet context, system resolution, droid-part schemas, Garage/customization, chargen, progression, modifiers, combat, damage, recovery, stock imports, templates, and available test coverage. No live Foundry VTT v13 testing was performed.

## What is structurally sound

### One registered actor sheet

Droids are not using a separate legacy ActorSheet. `SWSEV2CharacterSheet` is registered for characters, NPCs, droids, and vehicles, with `SWSEV2BaseActor` as the Actor document class. That is a good foundation because it avoids an entirely separate droid-sheet runtime.

The actor-mode adapter then changes the shared shell for droids by hiding Constitution, exposing the Droid Systems surface, and routing customization to the Garage.

### Dedicated droid context seam

`DroidSheetContextBuilder` is now the only droid-specific context builder and deliberately keeps droid-specific information — processors, locomotion, integrated systems, protocols, programming, modification points, build history — outside the generic character context.

It combines shared health, defenses, abilities, and Second Wind panels with dedicated droid system data.

### Several important droid rules are already protected

The progression guards correctly recognize that droids:

- have no Constitution for prerequisite purposes;
- cannot acquire Force Sensitivity;
- may have droid-only classes and talent trees.

Fortitude Defense also correctly uses Strength for droids and explicitly prevents stale legacy Constitution configuration from overriding that rule.

Owned Item mutations are generally routed through `ActorEngine`, and the modern customization path uses an atomic transaction rather than direct Actor updates.

## Critical findings

### 1. There are two competing "canonical" droid-part schemas

This is the largest architectural defect.

The repository contains both:

- `scripts/data/droid-part-schema.js`
- `scripts/domain/droids/droid-part-schema.js`

Both describe themselves as authoritative adapters over the droid system catalog, but they contain different aliases, normalized IDs, category logic, rule structures, and mechanical target definitions.

The domain-side `droid-system-definitions.js` then calls another merged registry the canonical source of truth, combining legacy definitions with the domain schema.

Consumers are divided:

- The sheet resolver, Garage customization, embedded-item hydration, virtual attacks, and chat hotfixes use the data schema.
- The installed-system modifier path and some prerequisite/domain code use the domain schema.

This means one installed part may be interpreted differently depending on whether it is being:

- displayed;
- priced;
- validated;
- converted into modifiers;
- used as a weapon;
- checked as a prerequisite.

This is a confirmed SSOT failure, not just duplicated helper code.

### 2. Installed droid hardware has at least three simultaneous representations

The system currently recognizes installed hardware through:

1. `system.droidSystems`
2. `system.installedSystems`
3. embedded actor Items

`DroidSystemsResolver` explicitly merges `droidSystems`, actor Items, and schema overlays.

The customization engine writes both `installedSystems` and `droidSystems` during a Garage transaction.

`ModifierEngine` then independently collects droid bonuses from:

- `droidSystems.mods`;
- `installedSystems`;
- embedded droid-part Items.

There is no shared canonical identity reconciliation across those three sources.

Consequence: a single logical component represented in two or three places can contribute more than once because each route generates a different modifier source identity.

For example:

- a Garage-installed processor in `installedSystems`;
- its compatibility mirror in `droidSystems`;
- an embedded processor Item;

may all be considered separate sources.

This is a direct double-counting risk for:

- skills;
- defenses;
- HP;
- Initiative;
- BAB;
- speed;
- Damage Threshold.

### 3. installedSystems values are not checked for active/installed state

`ModifierEngine` loops over every key in `system.installedSystems`, resolves its definition, and applies its effects. The associated value named `installed` is read from `Object.entries()` but is not used to decide whether the system is enabled, installed, disabled, false, or null.

Therefore an entry such as:

```js
installedSystems: {
  "advanced-processor": false
}
```

can still contribute its mechanical effects merely because the key exists.

This is a confirmed mechanical defect.

### 4. Garage removal does not reconcile embedded Items

The Garage customization transaction removes systems from:

- `system.installedSystems`
- `system.droidSystems`

It does not delete or update a corresponding embedded Item.

Its cleanup helper only removes matching records from droid-system fields and arrays.

`ModifierEngine` separately reads embedded droid-part Items. Therefore:

1. a user removes a system through the Garage;
2. the Garage state says it is removed;
3. the associated embedded Item remains;
4. the Item can continue granting modifiers and appearing in system panels.

The inverse is also possible: deleting an Item may leave the Garage/system record installed.

This is a confirmed state-drift path.

### 5. Stock droids are very likely losing their published statistics after import

The stock importer deliberately treats stock droids as published statblocks. It writes published:

- BAB;
- defenses;
- HP;
- skills;
- attacks;
- Damage Threshold;

directly into the Actor and creates integrated weapon Items.

However, derived-data skipping currently applies only to statblock-mode NPCs — not droids.

Every droid therefore proceeds through the normal V2 derived path.

`DerivedCalculator` then recalculates BAB from class levels and recalculates defenses from the actor's live progression and item state.

The stock importer does not create matching class progression for those published statblocks. Structurally, that means its published totals can be replaced by classless derived totals during preparation.

This needs runtime confirmation for the exact visible timing, but the static call path strongly indicates a real defect. Stock droids need either:

- a droid statblock mode comparable to NPC statblock mode; or
- a published-total override authority inside droid derivation.

## Confirmed resolver and display defects

### 6. Integrated lightsabers can be classified twice

The integrated-weapon predicate accepts both `weapon` and `lightsaber`.

The integrated-equipment predicate excludes only `weapon`, not `lightsaber`.

As a result, an integrated lightsaber can qualify as both:

- Integrated Weapon
- Integrated Equipment

The context builder contains the same asymmetry when classifying integrated items.

### 7. Processor Items disappear when builder processor data exists

The processor resolver chooses:

- builder primary processor, or
- actor Item processors.

It does not merge both when a builder primary exists.

Therefore an embedded processor Item may disappear from the resolved Systems view whenever `droidSystems.processor` is populated.

That can conceal backup, alternate, or legacy processor Items.

### 8. Actor-owned locomotion Items are not resolved consistently

The resolver documentation says actor-owned Items are an installation source, but `_resolveLocomotion()` reads builder/system locomotion records and associated arrays without incorporating actor-owned locomotion Items.

A locomotion component installed as an Item can therefore:

- contribute through some Item or modifier paths;
- remain absent from the droid Systems panel;
- fail readiness or configuration checks.

### 9. Weaponized accessories can be filtered out of both destinations

Integrated equipment explicitly filters out weaponized droid parts.

The integrated-weapons resolver subsequently attempts to collect weaponized systems from the already-filtered integrated-equipment result.

Unless that system also appears in another explicit weapon collection, a weaponized accessory can vanish from both:

- Integrated Equipment
- Integrated Weapons

### 10. Cross-source deduplication is too weak

The resolver deduplicates primarily using an entry's local id, then falls back to a normalized name.

A builder record and an embedded Item representing the same canonical droid part normally have different document IDs. They therefore survive as separate entries.

Deduplication should use a canonical part identity such as `canonicalRuleId` rather than `builderEntry.id !== embeddedItem.id`.

### 11. The integrated-weapons panel renders duplicate stat groups

The integrated-weapons template outputs damage, range, and attack information in two overlapping blocks.

This is not mechanically dangerous, but it confirms template drift and produces unnecessary UI duplication.

## Rules and validation disagreements

### 12. The code disagrees about whether droid armor is required

`DroidValidationEngine` declares four mandatory systems:

- locomotion;
- appendage;
- processor;
- armor.

`DroidSystemsResolver` marks armor as optional.

The progression builder's required groups include locomotion, processor, and appendage, but omit armor.

The older standalone Droid Builder requires armor and uses its own validation engine.

So a build can be valid in chargen, incomplete in another builder, valid on the sheet, and invalid in `DroidValidationEngine`.

This must be resolved against the intended SWSE rules and then represented in one requirements authority.

### 13. A parallel legacy Droid Builder still contains its own catalog

`DroidBuilderApp` has a standalone step workflow and hard-coded temporary catalog containing its own processors, locomotion systems, armor, weapons, sensors, accessories, prices, and bonuses.

This exists alongside the progression Droid Builder, the Garage/Customization Bay, `DROID_SYSTEMS`, both droid-part schemas, and `DROID_SYSTEM_DEFINITIONS`.

Even when not currently reachable from the main UI, this is a dangerous parallel authority because future code can accidentally reactivate it.

It should be classified as either live and migrated to the canonical catalog, compatibility-only, or dead and removed.

### 14. "Droids have no Constitution" is not a data-model invariant

The droid context removes Constitution from the displayed ability list.

Progression guards also treat droids as Constitution-less.

But the shared droid Actor still inherits the generic base attribute structure, and `computeDroidDerived()` simply invokes the character-derived calculator after adding droid-system defaults.

`DerivedCalculator` computes every stored ability, including any Constitution value present.

Thus "no Constitution" is currently enforced through UI hiding, progression guards, and isolated calculator exceptions — not by the actor schema or a normalized droid ability authority.

This can allow stale or imported Constitution values to leak into systems that were not individually droid-hardened.

## Garage and budget issues

### 15. Installation readiness does not include all installation sources

The droid sheet's configuration/readiness logic validates `system.droidSystems`. It does not establish completion from embedded Items alone.

Therefore a droid with valid processor, locomotion, appendage, or armor Items can still appear incomplete if the system mirrors are absent.

### 16. Builder cost and installed Item cost can diverge

The sheet's build-cost presentation derives primarily from droid-system records rather than all embedded installed Items.

Meanwhile, embedded Items may still appear in the resolver, grant modifiers, and function as weapons.

This permits an Item to be mechanically active but absent from Garage spent-cost totals, readiness, and installed-system accounting.

### 17. Installed-system payloads are too thin

The Garage stores `installedSystems` entries containing mainly id, name, category, slot, cost, and timestamp.

Their actual mechanics are then rehydrated later through one of the droid schemas.

Because the sheet and `ModifierEngine` do not consistently use the same schema, the meaning of the stored component depends on which consumer rehydrates it.

The stored ID needs to resolve through one immutable canonical registry.

## Combat findings

### 18. Virtual droid-part attacks are not cleanly integrated

The integrated-weapons template emits `data-action="use-droid-part"`.

A static repository search found the action in templates but did not identify a clearly registered live JS handler for that exact action.

There are virtual droid weapon helpers and chat reconstruction logic, but the damage path currently includes a runtime hotfix that reconstructs a virtual weapon whenever it sees an ID prefixed with `swse-droid-part-`.

That hotfix also captures chat damage buttons and reroutes them into the normal damage roll.

The existence of the hotfix means the virtual-part workflow has not yet been absorbed completely into the canonical attack/chat pipeline.

I classify the initial `use-droid-part` click path as unproven by static search, and the damage reconstruction path as confirmed hotfix-dependent.

### 19. Combat lists may contain non-rollable integrated parts

The droid context builder separately computes `rollableIntegratedParts`, but its combined "all combat" collection includes the broader integrated-part list.

Depending on the template consumer, nonweapon systems can therefore leak into a collection named as combat weapons.

This needs a strict contract: `allCombatWeapons`, `integratedSystems`, and `rollableVirtualWeapons` should not be interchangeable.

### 20. Published stock-droid attack bonuses may conflict with canonical attack math

The stock importer creates integrated weapon Items carrying the published attack bonus directly in the Item's system fields.

Playable/custom droids should normally derive attacks from BAB, ability, proficiency, and modifiers. Published statblock droids may instead need a preserved total.

The code currently lacks an explicit mode distinction between published stock attack total and playable derived attack.

That makes stock-droid attacks vulnerable to either double application of a published bonus plus normal derived math, or replacement of the published bonus with classless derived math.

## Health, recovery, and damage

### 21. Droids are differentiated in several damage paths, but the policy is distributed

Damage resolution correctly distinguishes droids at 0 HP: they become disabled rather than organically unconscious, and they may become destroyed when the instant-destruction conditions apply.

Organic rest recovery explicitly excludes droids.

Second Wind recovery skips droids for rest-triggered resets.

These are good distinctions, but they are distributed across several engines rather than governed by one droid vitality/repair policy.

### 22. Generic healing can bypass droid repair semantics

The base Actor's `applyHealing()` comments that callers are responsible for droid repair rules, but the method itself calls generic `ActorEngine.applyHealing()` without enforcing an `isRepair` requirement.

Any code path that calls generic healing directly can potentially restore droid HP without a repair-specific validation layer.

I classify this as an architecture risk rather than a confirmed user-facing exploit because every caller was not exhaustively executed.

## Item and template concerns

### 23. Several droid-specific item types referenced by code do not align cleanly with the declared Item schema

Droid code refers to types such as `heuristicProcessor`, `integratedSystem`, `protocol`, `programming`, and `customization`.

The active item type declarations do not clearly expose all of those as creatable Item document types, while the droid context continues to branch on them.

Those branches may be compatibility support for historical records, dormant code, or paths that cannot be created through current schemas.

This should be explicitly classified and guarded.

### 24. Live and compatibility droid partials coexist

The template loader intentionally keeps additional legacy droid partials preloaded while only a subset is considered part of the live sheet composition.

That makes repository searches noisy and increases the chance of fixing a dormant partial instead of the live one, accidentally reactivating an obsolete panel, or maintaining duplicate UI contracts.

### 25. Possible HTML-sanitization risk in droid-part chat output

The droid-part chat builder interpolates actor names, component names, descriptions, modifiers, and feature text into HTML. The inspected path did not show explicit escaping at the point of construction.

Whether Foundry sanitizes the final content elsewhere requires runtime confirmation, but user-authored/custom component content should not be assumed safe.

## Test assessment

Dedicated droid sheet/system coverage appears substantially thinner than the recently added rolling and vehicle suites. Repository search primarily surfaced implementation files and historical audit documents rather than a cohesive droid contract suite.

The following do not appear adequately protected as one integrated workflow:

- chargen droid → finalized Actor;
- Garage installation → sheet context;
- Garage removal → modifier removal;
- embedded Item → Garage mirror;
- stock droid import → derived-data preservation;
- virtual component attack → chat → damage;
- linked and unlinked token droid customization;
- no-CON behavior across all derived systems.

## Priority ranking

### Critical

1. Choose one canonical droid-part schema.
2. Choose one canonical installation ledger.
3. Prevent cross-source modifier double application.
4. Respect enabled/installed state in `installedSystems`.
5. Reconcile Garage changes with embedded Items.
6. Protect stock-droid published totals from derived recalculation.

### High

7. Fix processor, locomotion, weaponized-accessory, and integrated-lightsaber resolution.
8. Replace local-document-ID deduplication with canonical part identity.
9. Resolve the armor-required disagreement.
10. Retire or migrate the standalone Droid Builder's private catalog.
11. Make no-Constitution a normalized actor/derived rule rather than mostly a display rule.
12. Make virtual droid-part attacks use the canonical attack and chat pipeline without hotfix reconstruction.

### Medium

13. Align build cost/readiness with all installed representations.
14. Separate rollable weapons from noncombat integrated systems.
15. Consolidate repair/healing policy.
16. Remove duplicate template output.
17. Classify unsupported legacy item types and partials.
18. Verify/sanitize chat-rendered component text.

## Recommended remediation order

### Droid Phase 1 — Authority consolidation

- Select one canonical part registry.
- Define one canonical component ID.
- Define one installation record contract.
- Decide whether embedded Items are authoritative components or projections.
- Make all other representations derived compatibility views.
- Make `ModifierEngine` consume one normalized component resolver.
- Add a droid SSOT static guard.

### Droid Phase 2 — Garage and resolver reconciliation

- Repair classification and canonical deduplication.
- Make install/remove atomically synchronize required projections.
- Fix disabled-system handling.
- Unify readiness and budget accounting.
- Resolve the armor requirement.
- Retire the private legacy Builder catalog.

### Droid Phase 3 — Stock-droid authority

- Add explicit stock-statblock versus playable-derived modes.
- Preserve published BAB, defenses, skills, and attacks in statblock mode.
- Provide an intentional conversion workflow to derived/playable mode.
- Prevent automatic derived recalculation from silently changing published records.

### Droid Phase 4 — Combat, repair, and runtime validation

- Replace virtual-part hotfixes with canonical attack routing.
- Verify integrated weapon proficiency, ammo, modifiers, and damage.
- Centralize healing-versus-repair eligibility.
- Test linked and unlinked token droids.
- Run a full Foundry v13 runtime matrix.

## Bottom line

The droid sheet is not ready for another feature expansion. The presentation layer is serviceable, and several individual rules are correct, but the system beneath it has too many competing authorities.

The first implementation effort should not be "improve the droid sheet." It should be:

**Droid Authority Consolidation**: canonical part identity, installation state, modifier ownership, and stock-statblock protection.
