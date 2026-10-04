# Feat Phase 1B — Repository Reconciliation Authority

Status: `PHASE_1B_REPOSITORY_RECONCILIATION_CERTIFIED`

Generated from `data/audits/feat-phase-1b-repository-reconciliation.json` by `tools/build-feat-phase-1b-reconciliation-authority.mjs`.

## Baseline

- Starting main SHA: `2a7723d2f8b80a4de48e343988c3224a6a9cc832`
- Phase 0 version: `1.1-phase0-authority-corrected-after-persistence-readback`
- Phase 1A: `PHASE_1A_CANONICAL_IDENTITY_MANIFEST_CERTIFIED` (final commit `ba2b8b925b24284c2fc4045eec73ec79e5f16b73`)

## Exact partition

```text
390 current records
351 preserve canonical
6 preserve derivatives pending 1C
33 remove noncanonical
```

Two canonical identities are missing from production and are future additions, not current records.

## Missing canonical identities (future additions)

| Name | canonicalId | identityKey | futureAction |
| --- | --- | --- | --- |
| Recall | `c352f81dde5c9dff` | `feat::the-force-unleashed-campaign-guide::p35::recall` | `CREATE_CANONICAL_FEAT_RECORD` |
| Staggering Attack | `c9c4130a55761330` | `feat::scum-and-villainy::p24::staggering-attack` | `CREATE_CANONICAL_FEAT_RECORD` |

## Six implementation derivatives

Parent: Weapon Proficiency, `ecc2471ac96ec2d4` (`feat::saga-edition-core-rulebook::p89::weapon-proficiency`). None is a canonical identity; none is counted among the 353; structural resolution is `PENDING_PHASE_1C`. Their references are preserved as evidence (`PRESERVE_REFERENCES_PENDING_PHASE_1C`) and not rewritten.

| Repo ID | Name | Disposition | Exact-ID reference paths | Live runtime paths |
| --- | --- | --- | --- | --- |
| `2d680cc46a7972da` | Weapon Proficiency (Simple Weapons) | `PRESERVE_IMPLEMENTATION_DERIVATIVE_PENDING_1C` | 19 | `data/feat-effects.json`<br>`data/generated/class-feat-list-bindings.json`<br>`packs/heroic.db`<br>`packs/nonheroic.db`<br>`packs/npc.db` |
| `765ff8a34e58acac` | Weapon Proficiency (Rifles) | `PRESERVE_IMPLEMENTATION_DERIVATIVE_PENDING_1C` | 19 | `data/feat-effects.json`<br>`data/generated/class-feat-list-bindings.json`<br>`packs/heroic.db`<br>`packs/nonheroic.db`<br>`packs/npc.db` |
| `8329a353aa3899be` | Weapon Proficiency (Heavy Weapons) | `PRESERVE_IMPLEMENTATION_DERIVATIVE_PENDING_1C` | 20 | `data/class-archetypes.json`<br>`data/feat-effects.json`<br>`data/generated/class-feat-list-bindings.json`<br>`packs/heroic.db`<br>`packs/nonheroic.db`<br>`packs/npc.db` |
| `e5d361d01d1b44e4` | Weapon Proficiency (Pistols) | `PRESERVE_IMPLEMENTATION_DERIVATIVE_PENDING_1C` | 21 | `data/feat-effects.json`<br>`data/generated/class-feat-list-bindings.json`<br>`packs/heroic.db`<br>`packs/nonheroic.db`<br>`packs/npc.db`<br>`scripts/engine/progression/prerequisites/class-prereq-normalizer.js` |
| `cf28ec45cabaff59` | Advanced Melee Weapon Proficiency | `PRESERVE_IMPLEMENTATION_DERIVATIVE_PENDING_1C` | 19 | `data/feat-effects.json`<br>`data/generated/class-feat-list-bindings.json`<br>`scripts/engine/progression/prerequisites/class-prereq-normalizer.js` |
| `41a9ce755ecffb5b` | Heavy Weapon Proficiency | `PRESERVE_IMPLEMENTATION_DERIVATIVE_PENDING_1C` | 16 | `data/feat-effects.json` |

## 33 removals

Disposition `REMOVE_NONCANONICAL_FEAT_RECORD` for all; `replacementCanonicalId` is null for all (no automatic replacements). Dependency analysis tells a later execution phase what else must be cleaned; it does not change canonicality.

| Repo ID | Name | Phase 0 classification | Dependency status | Exact-ID paths | Live runtime path |
| --- | --- | --- | --- | --- | --- |
| `02ac414f546a539a` | Forceful Strike | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | `NO_LIVE_RUNTIME_REFERENCE` | 13 | — |
| `058de949e909d9ae` | Low Profile | `LEGACY_D20_FEAT_NO_SAGA_EQUIVALENT` | `NO_LIVE_RUNTIME_REFERENCE` | 13 | — |
| `08dbd76457db101f` | Saber Throw | `WRONG_DOMAIN_NONCANONICAL_FEAT` | `NO_LIVE_RUNTIME_REFERENCE` | 12 | — |
| `0c53cb8b7c29d865` | Stealthy | `LEGACY_D20_FEAT_NO_SAGA_EQUIVALENT` | `LIVE_RUNTIME_REFERENCE_PRESENT` | 14 | `data/class-archetypes.json` |
| `10a017a020aa4a9c` | Forceful Throw | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | `LIVE_RUNTIME_REFERENCE_PRESENT` | 14 | `data/feat-effects.json` |
| `17e317292814e13e` | Forceful Will | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | `LIVE_RUNTIME_REFERENCE_PRESENT` | 13 | `data/feat-effects.json` |
| `17f4a0850e94dc7d` | Reactive Awareness | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | `NO_LIVE_RUNTIME_REFERENCE` | 12 | — |
| `2f2fa438a6fb54a0` | Triple Crit Specialist | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | `NO_LIVE_RUNTIME_REFERENCE` | 14 | — |
| `37cb4455a70876ad` | Forceful Saber Throw | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | `LIVE_RUNTIME_REFERENCE_PRESENT` | 13 | `data/feat-effects.json` |
| `3cd647b126f1d171` | Reactive Stealth | `WRONG_DOMAIN_TALENT` | `NO_LIVE_RUNTIME_REFERENCE` | 12 | — |
| `465434fb7b44aee1` | Forceful Grip | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | `LIVE_RUNTIME_REFERENCE_PRESENT` | 13 | `data/feat-effects.json` |
| `54d6201340a6757f` | Headstrong | `LEGACY_D20_FEAT_NO_SAGA_EQUIVALENT` | `NO_LIVE_RUNTIME_REFERENCE` | 13 | — |
| `5824e2360feb505a` | Improved Grapple | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | `LIVE_RUNTIME_REFERENCE_PRESENT` | 14 | `data/feat-effects.json` |
| `647d77a8f5ab9af3` | Keen Force Mind | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | `LIVE_RUNTIME_REFERENCE_PRESENT` | 15 | `data/feat-effects.json` |
| `6673cd53493a9d6c` | Forceful Slam | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | `LIVE_RUNTIME_REFERENCE_PRESENT` | 13 | `data/feat-effects.json` |
| `6d8ce2807c579289` | Trustworthy | `LEGACY_D20_FEAT_NO_SAGA_EQUIVALENT` | `LIVE_RUNTIME_REFERENCE_PRESENT` | 14 | `data/class-archetypes.json` |
| `83abd1c384b58c3c` | Intimidating Presence | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | `NO_LIVE_RUNTIME_REFERENCE` | 13 | — |
| `8566edcae3a2f18c` | Forceful Telekinesis | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | `NO_LIVE_RUNTIME_REFERENCE` | 12 | — |
| `88cdedff38b610c0` | Two-Weapon Fighting | `LEGACY_D20_FEAT_NO_SAGA_EQUIVALENT` | `LIVE_RUNTIME_REFERENCE_PRESENT` | 14 | `data/feat-effects.json` |
| `9768963c7a36237d` | Fast Talk | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | `NO_LIVE_RUNTIME_REFERENCE` | 13 | — |
| `9a89576b3cc1347e` | Great Fortitude | `LEGACY_D20_FEAT_NO_SAGA_EQUIVALENT` | `LIVE_RUNTIME_REFERENCE_PRESENT` | 15 | `data/feat-effects.json` |
| `ae5c34d352d6dff7` | Intuitive Initiative | `WRONG_DOMAIN_SPECIES_TRAIT` | `NO_LIVE_RUNTIME_REFERENCE` | 14 | — |
| `b2296a4d5cef8a61` | Frightful Presence | `LEGACY_D20_FEAT_NO_SAGA_EQUIVALENT` | `NO_LIVE_RUNTIME_REFERENCE` | 13 | — |
| `bee76d01da40677d` | Lightning Reflexes | `LEGACY_D20_FEAT_NO_SAGA_EQUIVALENT` | `LIVE_RUNTIME_REFERENCE_PRESENT` | 14 | `data/feat-effects.json` |
| `d612e7a708edf75b` | Frightening Presence | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | `NO_LIVE_RUNTIME_REFERENCE` | 15 | — |
| `db564cc6f9879ec8` | Forceful Weapon | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | `LIVE_RUNTIME_REFERENCE_PRESENT` | 13 | `data/feat-effects.json` |
| `e5ab9392378400ec` | Resilient Reflexes | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | `NO_LIVE_RUNTIME_REFERENCE` | 12 | — |
| `e99d9284a73cf505` | Conditioned | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | `NO_LIVE_RUNTIME_REFERENCE` | 13 | — |
| `eb33f5e4b5f6318c` | Surgical Precision | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | `NO_LIVE_RUNTIME_REFERENCE` | 13 | — |
| `f82323ee06f59735` | Resilient Will | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | `NO_LIVE_RUNTIME_REFERENCE` | 12 | — |
| `fda012e3b2b1e55f` | Resilient Talent | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | `NO_LIVE_RUNTIME_REFERENCE` | 12 | — |
| `ff76bea42641ca5b` | Forceful Stun | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | `LIVE_RUNTIME_REFERENCE_PRESENT` | 14 | `data/feat-effects.json` |
| `ffd5fecab0550bb6` | Forceful Vitality | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | `LIVE_RUNTIME_REFERENCE_PRESENT` | 14 | `data/feat-effects.json` |

## Dependency classification

Reference classes are owner-defined by exact path (not by directory): `LIVE_RUNTIME_AUTHORITY` = `data/feat-effects.json`, `data/class-archetypes.json`, `data/generated/class-feat-list-bindings.json`, `packs/heroic.db`, `packs/nonheroic.db`, `packs/npc.db`, `scripts/engine/progression/prerequisites/class-prereq-normalizer.js`; `DERIVED_REBUILD_ARTIFACT` = `data/feat_buckets_and_subbuckets.json`, `data/generated/feat-view-model.json`; `FIX_OR_MIGRATION_ARTIFACT` = `data/fixes/feat-view-model.json`; `ORPHAN_HISTORICAL_ARTIFACT` = `packs/feat-catalog.db`; `AUDIT_OR_DOCUMENTATION_REFERENCE` = `data/prestige-prerequisites-reference.json` (live prestige authority is `scripts/data/prestige-prerequisites.js`), `docs/`, `data/audits/`, Phase 0/1 audit builders. Classification is exact-path specific (e.g. `data/generated/class-feat-list-bindings.json` is live, `data/generated/feat-view-model.json` is derived). Any other path fails the build as `OTHER_REFERENCE_REQUIRES_REVIEW` (0 found).

- All 33 of the 33 removal records have exact-ID references somewhere in tracked repository artifacts.
- 15 have exact-ID references in live runtime authorities (13 in `data/feat-effects.json`, 2 in `data/class-archetypes.json`): `REMEDIATE_LIVE_REFERENCES_BEFORE_RECORD_DELETION`.
- 18 have no live runtime exact-ID blocker: `NO_LIVE_REFERENCE_BLOCKER_REFRESH_DERIVED_ARTIFACTS_DURING_MUTATION`.
- All 33 also occur in stale/derived/fix/orphan artifacts that require regeneration, cleanup, or historical handling during the later mutation phase; these are not deletion blockers and create no replacement requirement.
- `packs/feat-catalog.db` is orphaned and nonblocking. It MUST NOT block deletion of a noncanonical feat record, and it MUST NOT be regenerated as the production feat pack unless separately authorized. The live Foundry feat pack remains `packs/feats.db` as declared in `system.json`.

### Live-reference removal records (15)

| Repo ID | Name | Live path |
| --- | --- | --- |
| `0c53cb8b7c29d865` | Stealthy | `data/class-archetypes.json` |
| `10a017a020aa4a9c` | Forceful Throw | `data/feat-effects.json` |
| `17e317292814e13e` | Forceful Will | `data/feat-effects.json` |
| `37cb4455a70876ad` | Forceful Saber Throw | `data/feat-effects.json` |
| `465434fb7b44aee1` | Forceful Grip | `data/feat-effects.json` |
| `5824e2360feb505a` | Improved Grapple | `data/feat-effects.json` |
| `647d77a8f5ab9af3` | Keen Force Mind | `data/feat-effects.json` |
| `6673cd53493a9d6c` | Forceful Slam | `data/feat-effects.json` |
| `6d8ce2807c579289` | Trustworthy | `data/class-archetypes.json` |
| `88cdedff38b610c0` | Two-Weapon Fighting | `data/feat-effects.json` |
| `9a89576b3cc1347e` | Great Fortitude | `data/feat-effects.json` |
| `bee76d01da40677d` | Lightning Reflexes | `data/feat-effects.json` |
| `db564cc6f9879ec8` | Forceful Weapon | `data/feat-effects.json` |
| `ff76bea42641ca5b` | Forceful Stun | `data/feat-effects.json` |
| `ffd5fecab0550bb6` | Forceful Vitality | `data/feat-effects.json` |

## Domain guard

- `NAME_ONLY_DOMAIN_GUARD_REJECTED`: no canonical feat decision may reject a record solely because another domain has the same normalized name.
- Recall proves the failure: `scripts/data/feat-domain-guard.js` denies the name `recall` as a talent-only contaminant, yet the feat Recall (`c352f81dde5c9dff`, The Force Unleashed Campaign Guide p.35) is a certified canonical identity distinct from the Rebellion Era Campaign Guide talent.
- Autofire Assault independently demonstrates same-name cross-domain legality: feat (Legacy Era Campaign Guide p.34) and talent (Galaxy at War p.22).
- `NAME_ONLY_VALIDITY_AUTHORITY_INSUFFICIENT_FOR_SAME_NAME_CROSS_DOMAIN_IDENTITIES`: `data/feat-validity-registry.json` is name-keyed; future validity must key to stable feat identity.
- Future domain authority must be identity-aware, using `CANONICAL_FEAT_IDS` (353), `FEAT_IMPLEMENTATION_DERIVATIVE_IDS` (6), and `NONCANONICAL_FEAT_RECORD_IDS` (33). Not implemented in Phase 1B.

## Projection

- Canonical identity count: 353.
- Interim projected documents before Phase 1C: 390 − 33 + 2 = **359** (derivatives retained).
- Final production document count is **not frozen** (`null`, `PENDING_PHASE_1C`); Phase 1C controls derivative structure.

## Acceptance

| Gate | Result |
| --- | --- |
| currentRecords | 390 |
| uniqueCurrentIds | 390 |
| preserveCanonical | 351 |
| canonicalIdsRepresented | 351 |
| preserveDerivativesPending1C | 6 |
| derivativeParentCanonicalId | ecc2471ac96ec2d4 |
| derivativesCountedAsCanonical | 0 |
| removeNoncanonical | 33 |
| replacementCanonicalIdNonNullCount | 0 |
| requiredCanonicalAdditions | 2 |
| unclassifiedCurrentRecords | 0 |
| multiplyClassifiedCurrentRecords | 0 |
| interimProjectedProductionDocumentCountBefore1C | 359 |
| finalProductionDocumentCount | null |
| nameOnlyDomainGuardStatus | NAME_ONLY_DOMAIN_GUARD_REJECTED |
| removalLiveRuntimeReferences | 15 |
| removalNoLiveRuntimeReferences | 18 |
| featEffectsLiveReferenceRemovals | 13 |
| classArchetypesLiveReferenceRemovals | 2 |
| otherReferenceRequiresReviewPaths | 0 |
| derivativeLiveRuntimeReferences | 6 |
| derivativeNoLiveRuntimeReferences | 0 |
| recallCrossDomainCollisionRetained | true |
| autofireAssaultCrossDomainCollisionRetained | true |
| productionMutated | false |
| allGatesPassed | true |

## Mutation statement

Phase 1B is authority-only. No production feat record was added, removed, renamed, re-IDed, or rewritten.

## Current record dispositions (390)

| Repo ID | Name | Disposition |
| --- | --- | --- |
| `0053d97632b02e4a` | Wary Sentries | `PRESERVE_CANONICAL_RECORD` |
| `005e922d0430d86b` | Resurgence | `PRESERVE_CANONICAL_RECORD` |
| `0066c394e5d636fb` | Spray Shot | `PRESERVE_CANONICAL_RECORD` |
| `0166fcdddc548545` | Improved Charge | `PRESERVE_CANONICAL_RECORD` |
| `01dee6f32bbd8f85` | Battering Attack | `PRESERVE_CANONICAL_RECORD` |
| `0214e9586b6c8bb5` | Unwavering Focus | `PRESERVE_CANONICAL_RECORD` |
| `029c3935e9bed6eb` | Expert Droid Repair | `PRESERVE_CANONICAL_RECORD` |
| `02ac414f546a539a` | Forceful Strike | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `03593bdccdd70fa2` | Galactic Alliance Military Training | `PRESERVE_CANONICAL_RECORD` |
| `0365722a629eed1f` | Increased Resistance | `PRESERVE_CANONICAL_RECORD` |
| `03e16cbf16cdc81d` | Slippery Maneuver | `PRESERVE_CANONICAL_RECORD` |
| `047f06ec480d841f` | Primitive Warrior | `PRESERVE_CANONICAL_RECORD` |
| `0536f81eff886234` | Flurry | `PRESERVE_CANONICAL_RECORD` |
| `05459ac4d439f229` | Point-Blank Shot | `PRESERVE_CANONICAL_RECORD` |
| `058de949e909d9ae` | Low Profile | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `05d8053002347946` | Fast Surge | `PRESERVE_CANONICAL_RECORD` |
| `08896a9f860ebca9` | Pitiless Warrior | `PRESERVE_CANONICAL_RECORD` |
| `08a15012d82f0d16` | Scion of Dorin | `PRESERVE_CANONICAL_RECORD` |
| `08dbd76457db101f` | Saber Throw | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `09d4eedfce05c6a3` | Pincer | `PRESERVE_CANONICAL_RECORD` |
| `09faea502795c45f` | Grapple Resistance | `PRESERVE_CANONICAL_RECORD` |
| `0a6c87a410bee1f2` | Unstoppable Force | `PRESERVE_CANONICAL_RECORD` |
| `0ac76f1c0c1677cb` | Conditioning | `PRESERVE_CANONICAL_RECORD` |
| `0c53cb8b7c29d865` | Stealthy | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `0d4d7c147c48cdab` | Burst Fire | `PRESERVE_CANONICAL_RECORD` |
| `0dbd1d12c0b99725` | Zero Range | `PRESERVE_CANONICAL_RECORD` |
| `0e9aa3d941f4eb80` | Mounted Regiment | `PRESERVE_CANONICAL_RECORD` |
| `10a017a020aa4a9c` | Forceful Throw | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `11db29efd899c438` | Toughness | `PRESERVE_CANONICAL_RECORD` |
| `1228a537592ad145` | Grazing Shot | `PRESERVE_CANONICAL_RECORD` |
| `125c328c4573890a` | Ascension Specialists | `PRESERVE_CANONICAL_RECORD` |
| `12d064d086102ff0` | Rapid Reaction | `PRESERVE_CANONICAL_RECORD` |
| `139a80972fc3b8ee` | Confident Success | `PRESERVE_CANONICAL_RECORD` |
| `14f0d916e9228368` | Channel Rage | `PRESERVE_CANONICAL_RECORD` |
| `1592aaedf4b6e40a` | Skill Focus | `PRESERVE_CANONICAL_RECORD` |
| `167c394e90424916` | Accelerated Strike | `PRESERVE_CANONICAL_RECORD` |
| `171f0d8d997c8bbc` | Wilderness First Aid | `PRESERVE_CANONICAL_RECORD` |
| `17e317292814e13e` | Forceful Will | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `17f4a0850e94dc7d` | Reactive Awareness | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `18779d9a72b47a12` | Technical Experts | `PRESERVE_CANONICAL_RECORD` |
| `191aacaecaa92ce1` | Logic Upgrade: Self-Defense | `PRESERVE_CANONICAL_RECORD` |
| `192923f60db38831` | Staggering Attack | `PRESERVE_CANONICAL_RECORD` |
| `1a9091174116f6ff` | Strong Bellow | `PRESERVE_CANONICAL_RECORD` |
| `1d0291d930abda15` | Wrruushi Training | `PRESERVE_CANONICAL_RECORD` |
| `1d27dfb8ce491836` | Medical Team | `PRESERVE_CANONICAL_RECORD` |
| `1dfbddf5f1aa57c3` | K'tara Training | `PRESERVE_CANONICAL_RECORD` |
| `1e0222988b4e8714` | Force Regimen Mastery | `PRESERVE_CANONICAL_RECORD` |
| `1e21ddf471811265` | Tumble Defense | `PRESERVE_CANONICAL_RECORD` |
| `1ea7da65feb15b18` | Exotic Weapon Proficiency | `PRESERVE_CANONICAL_RECORD` |
| `1ec2b64343aca60e` | Close Combat Escape | `PRESERVE_CANONICAL_RECORD` |
| `1f2f70d34a17667d` | Vehicular Combat | `PRESERVE_CANONICAL_RECORD` |
| `1f404db00518aeed` | Damage Conversion | `PRESERVE_CANONICAL_RECORD` |
| `1f594024b4757109` | Lightning Draw | `PRESERVE_CANONICAL_RECORD` |
| `203f7fa521105d0b` | Tool Frenzy | `PRESERVE_CANONICAL_RECORD` |
| `21a0af5ef58172a0` | Quick Comeback | `PRESERVE_CANONICAL_RECORD` |
| `223a5c14f2ea4737` | Ample Foraging | `PRESERVE_CANONICAL_RECORD` |
| `225c535ebc74e54a` | Deft Charge | `PRESERVE_CANONICAL_RECORD` |
| `22d0f64aa8ac99df` | Riflemaster | `PRESERVE_CANONICAL_RECORD` |
| `2357f4a68fe571fb` | Sharp Senses | `PRESERVE_CANONICAL_RECORD` |
| `252b67d6e31c377e` | Weapon Finesse | `PRESERVE_CANONICAL_RECORD` |
| `25aaf859b6109c02` | Predictive Defense | `PRESERVE_CANONICAL_RECORD` |
| `25ba21b021086a71` | Disturbing Presence | `PRESERVE_CANONICAL_RECORD` |
| `25ce950a142f969d` | Adaptable Talent | `PRESERVE_CANONICAL_RECORD` |
| `2624254a23604d5b` | Poison Resistance | `PRESERVE_CANONICAL_RECORD` |
| `2866d953b4b6245d` | Dive for Cover | `PRESERVE_CANONICAL_RECORD` |
| `289588197d691d64` | Advantageous Cover | `PRESERVE_CANONICAL_RECORD` |
| `28a02f0e5412dd53` | Fortifying Recovery | `PRESERVE_CANONICAL_RECORD` |
| `29173ea2d8416eea` | Flèche | `PRESERVE_CANONICAL_RECORD` |
| `2942c0676644251b` | Tactical Advantage | `PRESERVE_CANONICAL_RECORD` |
| `2956acfbfd27967d` | Hideous Visage | `PRESERVE_CANONICAL_RECORD` |
| `2bb34366776f0371` | Cut the Red Tape | `PRESERVE_CANONICAL_RECORD` |
| `2bdb31b248f680e3` | Republic Military Training | `PRESERVE_CANONICAL_RECORD` |
| `2cc20fb67232f92f` | Skill Challenge: Catastrophic Avoidance | `PRESERVE_CANONICAL_RECORD` |
| `2d680cc46a7972da` | Weapon Proficiency (Simple Weapons) | `PRESERVE_IMPLEMENTATION_DERIVATIVE_PENDING_1C` |
| `2def724bf673c2fc` | Impersonate | `PRESERVE_CANONICAL_RECORD` |
| `2e5ada2de01fff4d` | Dreadful Countenance | `PRESERVE_CANONICAL_RECORD` |
| `2eb0c304d99ef6ee` | Hold Together | `PRESERVE_CANONICAL_RECORD` |
| `2ed1a3257175feb9` | Wroshyr Rage | `PRESERVE_CANONICAL_RECORD` |
| `2f2fa438a6fb54a0` | Triple Crit Specialist | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `3036290329d5b3e6` | Shake It Off | `PRESERVE_CANONICAL_RECORD` |
| `30cb2abcd11bf1bd` | Relentless Attack | `PRESERVE_CANONICAL_RECORD` |
| `313095ada7504547` | Signature Device | `PRESERVE_CANONICAL_RECORD` |
| `32d1cd4b09ec0d3b` | Cleave | `PRESERVE_CANONICAL_RECORD` |
| `33905755bbb1ca10` | Binary Mind | `PRESERVE_CANONICAL_RECORD` |
| `34071c4705615ce8` | Moving Target | `PRESERVE_CANONICAL_RECORD` |
| `34bc0c5808778bf5` | Improved Bantha Rush | `PRESERVE_CANONICAL_RECORD` |
| `357807a5ceb77203` | Double Attack | `PRESERVE_CANONICAL_RECORD` |
| `3595086bb17d4303` | Justice Seeker | `PRESERVE_CANONICAL_RECORD` |
| `376d805d1b73f7e6` | Starship Tactics | `PRESERVE_CANONICAL_RECORD` |
| `37aa58a3833bf34a` | Bad Feeling | `PRESERVE_CANONICAL_RECORD` |
| `37cb4455a70876ad` | Forceful Saber Throw | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `3a847230d573a623` | Melee Defense | `PRESERVE_CANONICAL_RECORD` |
| `3b9b60551a3379ce` | Gearhead | `PRESERVE_CANONICAL_RECORD` |
| `3cd647b126f1d171` | Reactive Stealth | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `3d4a4e93ced26712` | Triple Crit | `PRESERVE_CANONICAL_RECORD` |
| `3eed0b4f1227cf91` | Throw | `PRESERVE_CANONICAL_RECORD` |
| `3f76464c43c73f84` | Power Attack | `PRESERVE_CANONICAL_RECORD` |
| `40429365d8f28219` | Hasty Modification | `PRESERVE_CANONICAL_RECORD` |
| `419a502e59264382` | Acrobatic Strike | `PRESERVE_CANONICAL_RECORD` |
| `41a9ce755ecffb5b` | Heavy Weapon Proficiency | `PRESERVE_IMPLEMENTATION_DERIVATIVE_PENDING_1C` |
| `423c5fffe7abe449` | Veteran Spacer | `PRESERVE_CANONICAL_RECORD` |
| `42dc0158ce091479` | Destructive Force | `PRESERVE_CANONICAL_RECORD` |
| `42e2404790756700` | Tech Specialist | `PRESERVE_CANONICAL_RECORD` |
| `4330126d10dccd71` | Maniacal Charge | `PRESERVE_CANONICAL_RECORD` |
| `43a4b873d9a9984d` | Ion Shielding | `PRESERVE_CANONICAL_RECORD` |
| `44705a692e2f01a6` | Quick Draw | `PRESERVE_CANONICAL_RECORD` |
| `44cce39d67c0979d` | Duck and Cover | `PRESERVE_CANONICAL_RECORD` |
| `45366d4f3a5e443d` | Dodge | `PRESERVE_CANONICAL_RECORD` |
| `4595bed5d4117164` | Opportunistic Shooter | `PRESERVE_CANONICAL_RECORD` |
| `465434fb7b44aee1` | Forceful Grip | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `46d70ac7db6872f6` | Keen Scent | `PRESERVE_CANONICAL_RECORD` |
| `477b62d36e012719` | Separatist Military Training | `PRESERVE_CANONICAL_RECORD` |
| `4788389dadb5cb0a` | Stay Up | `PRESERVE_CANONICAL_RECORD` |
| `47c92eae6c1a0b84` | Pinpoint Accuracy | `PRESERVE_CANONICAL_RECORD` |
| `47f21e32233bb910` | Resurgent Vitality | `PRESERVE_CANONICAL_RECORD` |
| `4be60753991eec43` | Rapid Assault | `PRESERVE_CANONICAL_RECORD` |
| `4cc4f4afdcf6e4f8` | Collateral Damage | `PRESERVE_CANONICAL_RECORD` |
| `4d6a68d553fb0449` | Running Attack | `PRESERVE_CANONICAL_RECORD` |
| `4dc36deda6faf597` | Anointed Hunter | `PRESERVE_CANONICAL_RECORD` |
| `4e57ee834c301ad8` | Extra Second Wind | `PRESERVE_CANONICAL_RECORD` |
| `50903195fbb5d090` | Blaster Barrage | `PRESERVE_CANONICAL_RECORD` |
| `513f0d9e7eb6965b` | Opportunistic Retreat | `PRESERVE_CANONICAL_RECORD` |
| `51a2fdd9a7965111` | Stand Tall | `PRESERVE_CANONICAL_RECORD` |
| `526109c14cc81285` | Sith Military Training | `PRESERVE_CANONICAL_RECORD` |
| `52f1a7f7eb33a1f4` | Attack Combo (Fire and Strike) | `PRESERVE_CANONICAL_RECORD` |
| `53444cc061d81627` | Force Boon | `PRESERVE_CANONICAL_RECORD` |
| `53f600d68f3afdc3` | Unwavering Resolve | `PRESERVE_CANONICAL_RECORD` |
| `54d6201340a6757f` | Headstrong | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `5535b5d495f381f5` | Recurring Success | `PRESERVE_CANONICAL_RECORD` |
| `55483fd350b3ba28` | Aquatic Specialists | `PRESERVE_CANONICAL_RECORD` |
| `56367f3943ee8c17` | Sniper | `PRESERVE_CANONICAL_RECORD` |
| `5824e2360feb505a` | Improved Grapple | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `58d3d0aece0f3bdc` | Improved Sleight of Hand | `PRESERVE_CANONICAL_RECORD` |
| `59e495de34a23def` | Leader of Droids | `PRESERVE_CANONICAL_RECORD` |
| `5a2ba2f28bc5ee01` | Perfect Intuition | `PRESERVE_CANONICAL_RECORD` |
| `5afd91fb081e576b` | Linguist | `PRESERVE_CANONICAL_RECORD` |
| `5ba03b04f0f1c7d7` | Recovering Surge | `PRESERVE_CANONICAL_RECORD` |
| `5bedd71f0eead6b9` | Martial Arts II | `PRESERVE_CANONICAL_RECORD` |
| `5bef5e65e532ba7c` | Wicked Strike | `PRESERVE_CANONICAL_RECORD` |
| `5d17898fc9652370` | Droid Hunter | `PRESERVE_CANONICAL_RECORD` |
| `5e1e84d933295217` | Experienced Medic | `PRESERVE_CANONICAL_RECORD` |
| `5e471161ad85b040` | Vehicular Surge | `PRESERVE_CANONICAL_RECORD` |
| `5f479944307731d1` | Attack Combo (Melee) | `PRESERVE_CANONICAL_RECORD` |
| `600f43af4edb16f7` | Whirlwind Attack | `PRESERVE_CANONICAL_RECORD` |
| `6179746c48e30c26` | Nikto Survival | `PRESERVE_CANONICAL_RECORD` |
| `61c053191d05d0a2` | Knife Trick | `PRESERVE_CANONICAL_RECORD` |
| `627b92fefdc552d2` | Forceful Recovery | `PRESERVE_CANONICAL_RECORD` |
| `62fdf44c56b24507` | Careful Shot | `PRESERVE_CANONICAL_RECORD` |
| `6335692284f98ec6` | Flood of Fire | `PRESERVE_CANONICAL_RECORD` |
| `6342effd242f0b61` | Turn and Burn | `PRESERVE_CANONICAL_RECORD` |
| `6356fd5ea46b9c6c` | Impulsive Flight | `PRESERVE_CANONICAL_RECORD` |
| `63dbb0e9623f7fce` | Resolute Stance | `PRESERVE_CANONICAL_RECORD` |
| `643c54c206ed5f64` | Swarm | `PRESERVE_CANONICAL_RECORD` |
| `647d77a8f5ab9af3` | Keen Force Mind | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `648a4f16669056f0` | Triple Attack | `PRESERVE_CANONICAL_RECORD` |
| `6557f371e55b900a` | Distracting Droid | `PRESERVE_CANONICAL_RECORD` |
| `6673cd53493a9d6c` | Forceful Slam | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `6723270208549f73` | Mandalorian Training | `PRESERVE_CANONICAL_RECORD` |
| `691b3a9309b28e60` | Demoralizing Strike | `PRESERVE_CANONICAL_RECORD` |
| `6b6a0dc594ad4e3c` | Tae-Jitsu Training | `PRESERVE_CANONICAL_RECORD` |
| `6ba02f4dd4c3bfe5` | Elder's Knowledge | `PRESERVE_CANONICAL_RECORD` |
| `6cf1898b8c3c837c` | Scavenger | `PRESERVE_CANONICAL_RECORD` |
| `6d8ce2807c579289` | Trustworthy | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `6dcb59b199dba6a1` | Hijkata Training | `PRESERVE_CANONICAL_RECORD` |
| `6e3b0ca6413e607c` | Crossfire | `PRESERVE_CANONICAL_RECORD` |
| `6e47c132fbedde08` | Deadeye | `PRESERVE_CANONICAL_RECORD` |
| `6ef0920984de0ed0` | Risk Taker | `PRESERVE_CANONICAL_RECORD` |
| `6fb0f56dd9b9b75c` | Deadly Sniper | `PRESERVE_CANONICAL_RECORD` |
| `70962165bed8e5ed` | Gunnery Specialist | `PRESERVE_CANONICAL_RECORD` |
| `70c842436bbb6330` | Perfect Swimmer | `PRESERVE_CANONICAL_RECORD` |
| `70f27646ad28816a` | Instinctive Attack | `PRESERVE_CANONICAL_RECORD` |
| `7146640744fdf052` | Combat Reflexes | `PRESERVE_CANONICAL_RECORD` |
| `71892687abbed346` | Strong in the Force | `PRESERVE_CANONICAL_RECORD` |
| `72146d8a36d77736` | Grand Army of the Republic Training | `PRESERVE_CANONICAL_RECORD` |
| `72183c573d1cc44e` | Unhindered Approach | `PRESERVE_CANONICAL_RECORD` |
| `723563f70bd7f28f` | Acrobatic Ally | `PRESERVE_CANONICAL_RECORD` |
| `74dc095d9ab94915` | Returning Bug | `PRESERVE_CANONICAL_RECORD` |
| `752b00692fa5376b` | Nimble Team | `PRESERVE_CANONICAL_RECORD` |
| `75ce7688bdfb0b23` | Deceptive Drop | `PRESERVE_CANONICAL_RECORD` |
| `75daa55c22ffed5e` | Covert Operatives | `PRESERVE_CANONICAL_RECORD` |
| `765ff8a34e58acac` | Weapon Proficiency (Rifles) | `PRESERVE_IMPLEMENTATION_DERIVATIVE_PENDING_1C` |
| `773ec00effc7e96f` | Armor Proficiency (light) | `PRESERVE_CANONICAL_RECORD` |
| `77c897590b4000f6` | Slicer Team | `PRESERVE_CANONICAL_RECORD` |
| `77dba0a49c63e42d` | Biotech Surgery | `PRESERVE_CANONICAL_RECORD` |
| `7bc21d4a74b95be5` | Crush | `PRESERVE_CANONICAL_RECORD` |
| `7d8366d0481d76e2` | Trench Warrior | `PRESERVE_CANONICAL_RECORD` |
| `7de37c473be72f87` | Imperial Military Training | `PRESERVE_CANONICAL_RECORD` |
| `7df64382f1a0a892` | Overwhelming Attack | `PRESERVE_CANONICAL_RECORD` |
| `80805c30ea6dd11e` | Aiming Accuracy | `PRESERVE_CANONICAL_RECORD` |
| `80c52cf7838095c1` | Return Fire | `PRESERVE_CANONICAL_RECORD` |
| `821e127ba3b83c1a` | Multi-Grab | `PRESERVE_CANONICAL_RECORD` |
| `8329a353aa3899be` | Weapon Proficiency (Heavy Weapons) | `PRESERVE_IMPLEMENTATION_DERIVATIVE_PENDING_1C` |
| `836f80dd762cf155` | Stava Training | `PRESERVE_CANONICAL_RECORD` |
| `83abd1c384b58c3c` | Intimidating Presence | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `84d8866a57381620` | Dual Weapon Mastery I | `PRESERVE_CANONICAL_RECORD` |
| `8566edcae3a2f18c` | Forceful Telekinesis | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `859d6b9f49118499` | Armor Proficiency (heavy) | `PRESERVE_CANONICAL_RECORD` |
| `8778b4271420f789` | Sport Hunter | `PRESERVE_CANONICAL_RECORD` |
| `87969fb8b12ff507` | Flawless Pilot | `PRESERVE_CANONICAL_RECORD` |
| `88cdedff38b610c0` | Two-Weapon Fighting | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `89c5695c7435b733` | Halt | `PRESERVE_CANONICAL_RECORD` |
| `8a5cb28f625d6f02` | Great Cleave | `PRESERVE_CANONICAL_RECORD` |
| `8a78270d15aa4738` | Force Readiness | `PRESERVE_CANONICAL_RECORD` |
| `8a86aa95c54f6dad` | Never Surrender | `PRESERVE_CANONICAL_RECORD` |
| `8b1a9adee4e2e78e` | Steadying Position | `PRESERVE_CANONICAL_RECORD` |
| `8b2f7862b3c76e61` | Frightening Cleave | `PRESERVE_CANONICAL_RECORD` |
| `8baf83743668f63a` | Desperate Gambit | `PRESERVE_CANONICAL_RECORD` |
| `8cf12d528b0d0478` | Opportunistic Trickery | `PRESERVE_CANONICAL_RECORD` |
| `8d164553709dd068` | Pall of the Dark Side | `PRESERVE_CANONICAL_RECORD` |
| `8d1747eda25693b0` | Cunning Attack | `PRESERVE_CANONICAL_RECORD` |
| `8ff15069dbf6270d` | Silver Tongue | `PRESERVE_CANONICAL_RECORD` |
| `90a258aae2583994` | Survivor of Ryloth | `PRESERVE_CANONICAL_RECORD` |
| `9244159a233a101a` | Dreadful Rage | `PRESERVE_CANONICAL_RECORD` |
| `92f927c92ded9fcf` | Martial Arts I | `PRESERVE_CANONICAL_RECORD` |
| `931fae85d3d53c07` | Rancor Crush | `PRESERVE_CANONICAL_RECORD` |
| `935212056c7968c8` | Power Blast | `PRESERVE_CANONICAL_RECORD` |
| `94023012303ad257` | Disabler | `PRESERVE_CANONICAL_RECORD` |
| `94b8751efb03536a` | Rapid Shot | `PRESERVE_CANONICAL_RECORD` |
| `94fc90a53d747f84` | Sniper Shot | `PRESERVE_CANONICAL_RECORD` |
| `95020f2ce5ad0e88` | Quick Skill | `PRESERVE_CANONICAL_RECORD` |
| `9567c9e2fe8416e6` | Disarming Charm | `PRESERVE_CANONICAL_RECORD` |
| `964f0781b3e3fc37` | Coordinated Attack | `PRESERVE_CANONICAL_RECORD` |
| `96666de28ba99b64` | Improved Damage Threshold | `PRESERVE_CANONICAL_RECORD` |
| `9768963c7a36237d` | Fast Talk | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `97dbebe63aa6af79` | Martial Arts III | `PRESERVE_CANONICAL_RECORD` |
| `982b00394a73719e` | Bantha Herder | `PRESERVE_CANONICAL_RECORD` |
| `987bdca14576cf2f` | Mind of Reason | `PRESERVE_CANONICAL_RECORD` |
| `98d9c2c211a7a458` | Unswerving Resolve | `PRESERVE_CANONICAL_RECORD` |
| `99b2114bb2fbc209` | Mighty Throw | `PRESERVE_CANONICAL_RECORD` |
| `99e4f98cbcbdd9e1` | Erratic Target | `PRESERVE_CANONICAL_RECORD` |
| `9a89576b3cc1347e` | Great Fortitude | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `9ad13542c8370aef` | Combat Trickery | `PRESERVE_CANONICAL_RECORD` |
| `9af3ba38a2c671b8` | Feat of Strength | `PRESERVE_CANONICAL_RECORD` |
| `9b7b869a86f39190` | Force Training | `PRESERVE_CANONICAL_RECORD` |
| `9c904590c02fb30a` | Targeted Area | `PRESERVE_CANONICAL_RECORD` |
| `9c9e98a70538855c` | Slammer | `PRESERVE_CANONICAL_RECORD` |
| `9d70c309eb95da5e` | Inborn Resilience | `PRESERVE_CANONICAL_RECORD` |
| `9de63b7a605768c2` | Advantageous Attack | `PRESERVE_CANONICAL_RECORD` |
| `9f1305cc6ada5d7a` | Devastating Bellow | `PRESERVE_CANONICAL_RECORD` |
| `a12f6fd51e121a30` | Vitality Surge | `PRESERVE_CANONICAL_RECORD` |
| `a16af4c63582b44a` | Flash and Clear | `PRESERVE_CANONICAL_RECORD` |
| `a16df0d4edf3e7bf` | Heavy Hitter | `PRESERVE_CANONICAL_RECORD` |
| `a2708e8daf121947` | Rapport | `PRESERVE_CANONICAL_RECORD` |
| `a51721a36b699c7c` | Fight Through Pain | `PRESERVE_CANONICAL_RECORD` |
| `a65c4d3ad1c3202f` | Resilient Strength | `PRESERVE_CANONICAL_RECORD` |
| `a6890bb21adad47e` | Expert Briber | `PRESERVE_CANONICAL_RECORD` |
| `a717435c8094e7fb` | Superior Tech | `PRESERVE_CANONICAL_RECORD` |
| `a75d5d6b3ce5bc6f` | Logic Upgrade: Tactician | `PRESERVE_CANONICAL_RECORD` |
| `a8511e47656ef4dd` | Trip | `PRESERVE_CANONICAL_RECORD` |
| `a945e2f5ffb5a7ed` | Charging Fire | `PRESERVE_CANONICAL_RECORD` |
| `a9a59c85cddbda1f` | Warrior Heritage | `PRESERVE_CANONICAL_RECORD` |
| `a9f6de36f24ef202` | Skill Training | `PRESERVE_CANONICAL_RECORD` |
| `aaa730a68f195111` | Savage Attack | `PRESERVE_CANONICAL_RECORD` |
| `acb7efcc70769b9f` | Mounted Defense | `PRESERVE_CANONICAL_RECORD` |
| `ad2b32e5dfa38a3f` | Sadistic Strike | `PRESERVE_CANONICAL_RECORD` |
| `ad740c563485664d` | Lasting Influence | `PRESERVE_CANONICAL_RECORD` |
| `adc9cac4d22b3090` | Assured Attack | `PRESERVE_CANONICAL_RECORD` |
| `ae4dece84c32c3ac` | Droidcraft | `PRESERVE_CANONICAL_RECORD` |
| `ae5c34d352d6dff7` | Intuitive Initiative | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `af5caa92d8fc0e3a` | Mounted Combat | `PRESERVE_CANONICAL_RECORD` |
| `b00e0a883da4edda` | K'thri Training | `PRESERVE_CANONICAL_RECORD` |
| `b0feacaeae4860e9` | Teräs Käsi Training | `PRESERVE_CANONICAL_RECORD` |
| `b1299c242802a260` | Fringe Benefits | `PRESERVE_CANONICAL_RECORD` |
| `b1970c18996d44dd` | Unified Squadron | `PRESERVE_CANONICAL_RECORD` |
| `b2296a4d5cef8a61` | Frightful Presence | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `b26497554169ac38` | Instinctive Defense | `PRESERVE_CANONICAL_RECORD` |
| `b3965f7a31f310ec` | Cybernetic Surgery | `PRESERVE_CANONICAL_RECORD` |
| `b3984239e21c64ca` | Suppression Fire | `PRESERVE_CANONICAL_RECORD` |
| `b3dfdfd783cf16be` | A Few Maneuvers | `PRESERVE_CANONICAL_RECORD` |
| `b4c1dbb468777c09` | Rebel Military Training | `PRESERVE_CANONICAL_RECORD` |
| `b531781f373c3031` | Master of Disguise | `PRESERVE_CANONICAL_RECORD` |
| `b573d4f48af37b42` | Attack Combo (Ranged) | `PRESERVE_CANONICAL_RECORD` |
| `b5a8d5899e02139c` | Far Shot | `PRESERVE_CANONICAL_RECORD` |
| `b60e581b6c102cfc` | Long Haft Strike | `PRESERVE_CANONICAL_RECORD` |
| `b648515a5e8dd612` | Tireless Squad | `PRESERVE_CANONICAL_RECORD` |
| `b754b5e064c20cc0` | Improvised Weapon Mastery | `PRESERVE_CANONICAL_RECORD` |
| `b7f51561e60fefe6` | Mission Specialist | `PRESERVE_CANONICAL_RECORD` |
| `b9d4eb946079b555` | Mechanical Martial Arts | `PRESERVE_CANONICAL_RECORD` |
| `baff0da30d0bc8ee` | Force of Personality | `PRESERVE_CANONICAL_RECORD` |
| `bb16070b5fdfccf4` | Mon Calamari Shipwright | `PRESERVE_CANONICAL_RECORD` |
| `bb7a952715116e00` | Improved Opportunistic Trickery | `PRESERVE_CANONICAL_RECORD` |
| `bcc7f3fe56008a28` | Unleashed | `PRESERVE_CANONICAL_RECORD` |
| `be1346b0cfb5ea78` | Regenerative Healing | `PRESERVE_CANONICAL_RECORD` |
| `be1b2f8015c971a5` | Increased Agility | `PRESERVE_CANONICAL_RECORD` |
| `bee76d01da40677d` | Lightning Reflexes | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `bf6c01fa590a3f75` | Biotech Specialist | `PRESERVE_CANONICAL_RECORD` |
| `bf71e5f4171547ef` | Instinctive Perception | `PRESERVE_CANONICAL_RECORD` |
| `c01f64239af7705d` | Extra Rage | `PRESERVE_CANONICAL_RECORD` |
| `c060d4cb33df501a` | Angled Throw | `PRESERVE_CANONICAL_RECORD` |
| `c0bd186e6fb23619` | Knock Heads | `PRESERVE_CANONICAL_RECORD` |
| `c120ef1fe27225af` | Controlled Rage | `PRESERVE_CANONICAL_RECORD` |
| `c180eee7d3bc29b2` | Precise Shot | `PRESERVE_CANONICAL_RECORD` |
| `c238f3f722689a3a` | Pin | `PRESERVE_CANONICAL_RECORD` |
| `c2538c3a906700ae` | Forceful Blast | `PRESERVE_CANONICAL_RECORD` |
| `c2da9691c1bb9742` | Focused Rage | `PRESERVE_CANONICAL_RECORD` |
| `c41814601364b643` | Weapon Focus | `PRESERVE_CANONICAL_RECORD` |
| `c51d23038e2862e6` | Coordinated Barrage | `PRESERVE_CANONICAL_RECORD` |
| `c7c99a77ebee1c0c` | Dual Weapon Mastery II | `PRESERVE_CANONICAL_RECORD` |
| `c973e43c85382068` | Autofire Assault | `PRESERVE_CANONICAL_RECORD` |
| `caad1a8c13bf01a1` | Withdrawal Strike | `PRESERVE_CANONICAL_RECORD` |
| `cab4954728195119` | Hyperblazer | `PRESERVE_CANONICAL_RECORD` |
| `cb6aea7e256e4c8c` | Improved Rapid Strike | `PRESERVE_CANONICAL_RECORD` |
| `cbea70febcf834cd` | Burst of Speed | `PRESERVE_CANONICAL_RECORD` |
| `ccb33e58342499a3` | Rapid Strike | `PRESERVE_CANONICAL_RECORD` |
| `ccc7a6e191e811a4` | Hobbling Strike | `PRESERVE_CANONICAL_RECORD` |
| `cda6cb7b58f96a2f` | Acrobatic Dodge | `PRESERVE_CANONICAL_RECORD` |
| `ce009e054ef1681f` | Implant Training | `PRESERVE_CANONICAL_RECORD` |
| `ce473e52f90b160a` | Improved Disarm | `PRESERVE_CANONICAL_RECORD` |
| `cefb9edb540745d6` | Multi-Targeting | `PRESERVE_CANONICAL_RECORD` |
| `cf278001c780f3f9` | Momentum Strike | `PRESERVE_CANONICAL_RECORD` |
| `cf28ec45cabaff59` | Advanced Melee Weapon Proficiency | `PRESERVE_IMPLEMENTATION_DERIVATIVE_PENDING_1C` |
| `d133d3fad058c35f` | Master Tracker | `PRESERVE_CANONICAL_RECORD` |
| `d2e86b15327ae544` | Hunter's Instincts | `PRESERVE_CANONICAL_RECORD` |
| `d3c4ae9f793b8573` | Jedi Heritage | `PRESERVE_CANONICAL_RECORD` |
| `d40dea327376ec90` | Bothan Will | `PRESERVE_CANONICAL_RECORD` |
| `d41076e442832c3e` | Natural Leader | `PRESERVE_CANONICAL_RECORD` |
| `d445051370a88a7f` | Armor Proficiency (medium) | `PRESERVE_CANONICAL_RECORD` |
| `d48614f7ae500a5b` | Logic Upgrade: Skill Swap | `PRESERVE_CANONICAL_RECORD` |
| `d518e8c1220af930` | Droid Shield Mastery | `PRESERVE_CANONICAL_RECORD` |
| `d612e7a708edf75b` | Frightening Presence | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `d6e528de87b25b95` | Wary Defender | `PRESERVE_CANONICAL_RECORD` |
| `d7736c072de9b86c` | Vehicle Systems Expertise | `PRESERVE_CANONICAL_RECORD` |
| `d7a139003afc04b8` | Indomitable Personality | `PRESERVE_CANONICAL_RECORD` |
| `d874a33284de77e4` | Fast Swimmer | `PRESERVE_CANONICAL_RECORD` |
| `d976f03c298fb1be` | Officer Candidacy Training | `PRESERVE_CANONICAL_RECORD` |
| `d9ecf143e6a9f889` | Critical Strike | `PRESERVE_CANONICAL_RECORD` |
| `da2e6fb7a11b3d63` | Pistoleer | `PRESERVE_CANONICAL_RECORD` |
| `da8e272f5dae09b9` | Tactical Genius | `PRESERVE_CANONICAL_RECORD` |
| `daf0594fbb48e61e` | Wilderness Specialists | `PRESERVE_CANONICAL_RECORD` |
| `db547ac84af63b06` | Skill Challenge: Last Resort | `PRESERVE_CANONICAL_RECORD` |
| `db564cc6f9879ec8` | Forceful Weapon | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `db82e1df17c3110b` | Bowcaster Marksman | `PRESERVE_CANONICAL_RECORD` |
| `dd2c0e394cdf08ba` | Mighty Swing | `PRESERVE_CANONICAL_RECORD` |
| `dd6ad0e712e9a314` | Spacer's Surge | `PRESERVE_CANONICAL_RECORD` |
| `ddbeb23013d9e917` | Force Sensitivity | `PRESERVE_CANONICAL_RECORD` |
| `de584ec0aaddcbad` | Wookiee Grip | `PRESERVE_CANONICAL_RECORD` |
| `dec7203bc81176dc` | Prime Shot | `PRESERVE_CANONICAL_RECORD` |
| `df58db54c4b53539` | Shrewd Bargainer | `PRESERVE_CANONICAL_RECORD` |
| `e0cdeb7d44cf44fd` | Brilliant Defense | `PRESERVE_CANONICAL_RECORD` |
| `e18eecc0f21a95f4` | Friends in Low Places | `PRESERVE_CANONICAL_RECORD` |
| `e306ecce877537a9` | Grab Back | `PRESERVE_CANONICAL_RECORD` |
| `e3b2b8360fb05d82` | Shield Surge | `PRESERVE_CANONICAL_RECORD` |
| `e4de79f4993a6690` | Deep Sight | `PRESERVE_CANONICAL_RECORD` |
| `e5a77e8e4754fa5b` | Trample | `PRESERVE_CANONICAL_RECORD` |
| `e5ab9392378400ec` | Resilient Reflexes | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `e5d361d01d1b44e4` | Weapon Proficiency (Pistols) | `PRESERVE_IMPLEMENTATION_DERIVATIVE_PENDING_1C` |
| `e73873cdc77a6451` | Powerful Charge | `PRESERVE_CANONICAL_RECORD` |
| `e85f36d48d9c6989` | Meat Shield | `PRESERVE_CANONICAL_RECORD` |
| `e896798c6d194345` | Fleet-Footed | `PRESERVE_CANONICAL_RECORD` |
| `e8e6b74907471ad5` | Cornered | `PRESERVE_CANONICAL_RECORD` |
| `e9147ce66a783fbb` | Starship Designer | `PRESERVE_CANONICAL_RECORD` |
| `e95252c02d2ae129` | Sensor Link | `PRESERVE_CANONICAL_RECORD` |
| `e97cc5c5128a55ce` | Thick Skin | `PRESERVE_CANONICAL_RECORD` |
| `e99d9284a73cf505` | Conditioned | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `e9d1e9099a3e4ecc` | Powerful Rage | `PRESERVE_CANONICAL_RECORD` |
| `ea684defcd3222ca` | Dual Weapon Mastery III | `PRESERVE_CANONICAL_RECORD` |
| `eaf7079b977d60b7` | Darkness Dweller | `PRESERVE_CANONICAL_RECORD` |
| `eb33f5e4b5f6318c` | Surgical Precision | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `ebe730776cd3e310` | Fatal Hit | `PRESERVE_CANONICAL_RECORD` |
| `ec8b6bb889f65dea` | Imperceptible Liar | `PRESERVE_CANONICAL_RECORD` |
| `ecc2471ac96ec2d4` | Weapon Proficiency | `PRESERVE_CANONICAL_RECORD` |
| `eccb2b4dbdbfa324` | Bone Crusher | `PRESERVE_CANONICAL_RECORD` |
| `edd8bb64c18d9a8a` | Clawed Subspecies | `PRESERVE_CANONICAL_RECORD` |
| `ef64dc738a6afeeb` | Skill Challenge: Recovery | `PRESERVE_CANONICAL_RECORD` |
| `f0afba1763ddff90` | Intimidator | `PRESERVE_CANONICAL_RECORD` |
| `f2cbe2ac10195858` | Follow Through | `PRESERVE_CANONICAL_RECORD` |
| `f313d17068d1cdea` | Informer | `PRESERVE_CANONICAL_RECORD` |
| `f362e5a4ad0a98bd` | Echani Training | `PRESERVE_CANONICAL_RECORD` |
| `f401ac70ee67def1` | Impetuous Move | `PRESERVE_CANONICAL_RECORD` |
| `f4604b0d477e5fe7` | Strafe | `PRESERVE_CANONICAL_RECORD` |
| `f4e8244a4c8bb9a0` | Brink of Death | `PRESERVE_CANONICAL_RECORD` |
| `f4f3706e393976b3` | Droid Focus | `PRESERVE_CANONICAL_RECORD` |
| `f59c9679c02b8896` | Metamorph | `PRESERVE_CANONICAL_RECORD` |
| `f5be1207aa6b1817` | Read the Winds | `PRESERVE_CANONICAL_RECORD` |
| `f82323ee06f59735` | Resilient Will | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `f8748ba7993b6b17` | Sure Climber | `PRESERVE_CANONICAL_RECORD` |
| `f8e2a30390d870e7` | Improved Defenses | `PRESERVE_CANONICAL_RECORD` |
| `f916516eeeaae10b` | Gungan Weapon Master | `PRESERVE_CANONICAL_RECORD` |
| `f965ca153bb13aaf` | Nature Specialist | `PRESERVE_CANONICAL_RECORD` |
| `f9ae5b531ae01fd0` | Surgical Expertise | `PRESERVE_CANONICAL_RECORD` |
| `fa8a56961708bbdc` | Unstoppable Combatant | `PRESERVE_CANONICAL_RECORD` |
| `fb64065b4a779cd8` | Artillery Shot | `PRESERVE_CANONICAL_RECORD` |
| `fbd561777651635e` | Autofire Sweep | `PRESERVE_CANONICAL_RECORD` |
| `fc1e5f0a2367debb` | Bantha Rush | `PRESERVE_CANONICAL_RECORD` |
| `fc56de4d0d15c95c` | Jedi Familiarity | `PRESERVE_CANONICAL_RECORD` |
| `fda012e3b2b1e55f` | Resilient Talent | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `febbb0f05c8a0883` | Forest Stalker | `PRESERVE_CANONICAL_RECORD` |
| `ff76bea42641ca5b` | Forceful Stun | `REMOVE_NONCANONICAL_FEAT_RECORD` |
| `ff8eaa4e2f6d1cf1` | Mobility | `PRESERVE_CANONICAL_RECORD` |
| `ffd5fecab0550bb6` | Forceful Vitality | `REMOVE_NONCANONICAL_FEAT_RECORD` |
