# Reconciliation V2 — 17-Domain Authority Matrix (Phase 0)

Branch: `claude/clever-shannon-pwf22k-17domain` (stacked on PR #1145 head `44cc3c7`, which contains the completed HP-F1..F4 work).
Reference audit SHA: `1cad49f`. Nothing in this document changes implementation code.

Method: every authority below was located in the repository at `44cc3c7` and its entry points, sync/async nature and persistence
classification were read. "Located" means the file and exports exist; "Audited" means its internals were read in this phase;
items marked **not audited** have not been read beyond their exports and must be audited before their phase starts.
Nothing here has been run in Foundry.

## 1. Architectural findings that change the plan

### F-1 `system.derived.*` is prepared, not persisted — recomputing it is tautological
`template.json` declares no `derived` block. `SWSEV2BaseActor.prepareDerivedData()` runs `DerivedCalculator.computeAll(actor)` and
writes the result into `system.derived.*` in memory on every preparation (`base-actor.js` `_computeDerivedAsync`;
`derived-generation.js` stamps `system.derived.meta.appliedSignature`). `ActorEngine.recalcAll` uses the same function.

Consequence: comparing "stored derived defenses / initiative / grapple / damage threshold / skills / ability mods" with a fresh
`computeAll` compares the authority with its own output. A "complete defenses" adapter built that way can only ever report staleness,
never a wrong build, and must not be presented as verification of the character's mathematics.

What can legitimately be verified:
1. **Persisted inputs agree with each other** (class ledger vs class items — done; ability records vs ability scores; species grants vs
   persisted racial adjustments / `system.speed`; skill training vs entitlement).
2. **Persisted mirrors agree with their canonical calculator** — the only persisted values that duplicate a calculation:
   `system.hp.max` (+ `hpLedger`, done), `system.forcePoints.max` (`calculateMaxForcePoints`), `system.speed` (species movement plan),
   persisted `system.defenses.*` / `system.abilities.*.total|mod` template fields if any writer still populates them (see F-4).
3. **Derived mirror freshness** — `system.derived.meta.appliedSignature` vs `DerivedCalculator.getActorComputeSignature(actor)`, or a
   missing / non-finite derived field, indicates the async derived pass did not apply. This is a real, non-tautological check; its
   Resolve is the existing `ActorEngine.recalcAll` (already used by the BAB / defense Resolve).
4. **Cross-validation of an input table against the calculator** (BAB / class defense from the class model). Exists today (F-2).

### F-2 The reconciler contains a second implementation of BAB / class-defense expectations
`ProgressionReconciler._computeExpectedDerivedStats` / `_readCurrentDerivedStats` (`progression-reconciler.js` ~1744–1990) sum class-model
`levelProgression` independently of `BABCalculator` / `DefenseCalculator`, and read `system.derived.*` through a legacy fallback chain
(`system.bab`, `system.baseAttackBonus`, `system.hitPoints.max`, `system.defenses.*.class`, taking `Math.max` of candidates). The same
function also still computes an HP `knownMinimum` from `_readHpGainRecords` that no longer drives any verdict (HP is evaluated once, by
`buildHpAudit` / `hp-accounting.js`). These are architectural conflicts to consolidate (record only in Phase 0; retirement is Phase 1 work
and requires the existing `progression-derived-class-stat-audit-contract` test to be preserved or deliberately replaced).

### F-3 Reconciliation is synchronous; the canonical calculators are mostly asynchronous
`ProgressionReconciler.reconcileActor` / `safeReconcileActor` are synchronous and memoized. `DerivedCalculator.computeAll`,
`BABCalculator.calculate`, `DefenseCalculator.calculate`, `ModifierEngine.*` and `ThresholdEngine.getDamageThreshold` are `async`.
Synchronous canonical entry points that do exist: `calculateMaxForcePoints(actor)`, `ThresholdEngine.calculateDamageThreshold(actor)` /
`computeBaseThreshold(actor)`, `EncumbranceEngine.calculateEncumbrance(actor)` / `carriedWeightReport(actor)`, `SkillRules.*` setting readers,
`resolveArmorUsageEffects(actor)`, `getHeroicLevel` / `getClassLevel`. Any domain whose only authority is async needs one reviewed seam
(an asynchronous domain pass whose result is memoized and merged into the same finding list) rather than ad-hoc awaits. This is an engineering
decision, not a rules decision; it is made in Phase 1 and presented for review.

### F-4 Persisted legacy mirrors need an owner decision before they are checked
`template.json` still declares `system.defenses.<d>.{base,misc,total,ability,class,armorMastery,modifier}`, `system.abilities.<k>.{total,mod}`
and `system.attributes.<k>.*`. `system.attributes` is the canonical persisted ability input (used by `recomputeHP`, finalizer, builders);
`system.abilities` is documented in code as a read-only compatibility mirror. Persisted `system.defenses.*` is **player-editable**:
the V2 character sheet form maps `system.defenses.{fortitude|reflex|will}.classBonus` and `.misc.user.extra` as editable numeric overrides
(`scripts/sheets/v2/character-sheet/form.js` ~55–57), and the GM approvals surface edits `system.defenses.<d>.total`. So a persisted defense
override is a deliberate user input, not a stale mirror: a mismatch between an override and the class table must be reported as
informational (a possible deliberate GM/player adjustment), never as a build error, until the owner decides how overrides are treated. The
existing reconciler's class-defense row reads `system.defenses.<d>.classBonus` (via `Math.max` over candidates) and can therefore flag a
deliberate override — a likely false-positive source to confirm in Phase 1. Reconciliation must not treat a template default as a meaningful
persisted value.

### F-5 Species "reconciliation" is a write-time planner, not a verifier
`scripts/species/species-grant-reconciliation.js` (`reconcileSpeciesGrant`, `MANIFEST_FLAG = flags.swse.speciesGrantManifest`) plans
stale-deletion / re-application when species is applied; it is not a read-only comparison of the actor against the species ledger. A
read-only verifier would have to build the ledger via `SpeciesGrantLedgerBuilder` (2040 lines, **not audited**) and compare it to persisted
state, and must treat unknown racial evidence as unverifiable.

### F-6 Names in the audit reference that do not match the repository
`ModificationSlotAuthority` is the module `scripts/engine/customization/modification-slot-authority.js` (exports `resolveSlotState`,
`BASELINE_TABLE`, `CONTRACT_VERSION`); slot capacity for installs also lives in `UpgradeSlotEngine` (`upgrade-slot-engine.js`) and
`modification-v2/modification-slot-closure.js`. `combat-roll-math` is `scripts/engine/combat/combat-roll-math.js` (exports not audited; imported by
`droid-mode-adapter.js`, `combat-action-bar.js`, `active-effects-manager.js`). These are two possible competing slot authorities — record as an authority conflict to resolve in Phase 3.

## 2. Status vocabulary (target contract for all domains)
`VALID`, `CONFIRMED_DISCREPANCY`, `UNVERIFIABLE`, `NOT_APPLICABLE`, `AUTHORITY_CONFLICT`. Only `CONFIRMED_DISCREPANCY` drives the player `!`.
Today's pipeline expresses the same idea with row statuses `ok | issue | warning | unavailable | unverifiable` and `needsAttention`; the
mapping is: ok→VALID, issue (needsAttention)→CONFIRMED_DISCREPANCY, unverifiable/unavailable/warning→UNVERIFIABLE, engine-failure→diagnostics.
`AUTHORITY_CONFLICT` and `NOT_APPLICABLE` do not exist yet.

## 3. Domain matrix

Legend — Coverage: **Wired** (verdict feeds findings today), **Partial**, **None**. Confidence: what evidence a CONFIRMED finding needs.

### 1. Species and racial mechanics — Coverage: None (read-only)
- Authority (located): `SpeciesGrantLedgerBuilder` (ledger), `applyCanonicalSpeciesToActor` / `getSpeciesMutationPlan` (writer, ActorEngine plan),
  `species-grant-reconciliation.js` (write-time planner, F-5), `species-movement.js` (`planSpeciesMovement`, `primaryMode`).
- Source fields: `system.species`, `system.race`, species variant/profile flags, `system.speciesMovement.*`, `system.attributes.*.racial`,
  `flags.swse.speciesGrantManifest`, owned feats/skills/languages. Derived: movement display, size modifiers.
- House rules: not audited. Missing: a read-only comparison; stock/unknown-species handling.
- Mutation authority: species apply plan via ActorEngine. Findings: `SPECIES_GRANT_MISSING`, `SPECIES_ADJUSTMENT_MISMATCH`.
- Confidence: manifest present AND ledger rebuildable AND persisted value contradicts it; otherwise UNVERIFIABLE. Foundry: species change flow.

### 2. Classes and levels — Coverage: **Wired**
- Authority (audited): `reconciliation/class-level-reader.js` (single reader), `ProgressionEntitlementCalculator`. Source: class items,
  `system.progression.classLevels`, `system.level`. Existing tests: `reconciliation-v2-contract` (conflict, fragmentation, unresolved class).
- Missing: prestige-class eligibility (not verified anywhere), duplicate class record cases beyond conflict reporting.
- Mutation: existing class-level writer. Confidence: ledger/items disagreement is already a conflict (diagnostic, not accusation).

### 3. Ability scores — Coverage: Partial (ability *increase entitlements* only)
- Authority (audited): persisted `system.attributes.<k>.{base,racial,enhancement,temp}`; mod/total computed in `character-actor.js`
  (`computeCharacterDerived`) and `DerivedCalculator` (`system.derived.attributes`, prepared — F-1). Ability-increase history:
  `system.progression.abilityIncreaseHistory` (entitlement slots in reconciler).
- Missing: no check that persisted inputs equal base + recorded increases + species adjustment. Original base scores cannot be reconstructed
  (point-buy unknown) — must not be attempted. Only checkable: increase count vs entitlement (done), racial vs species ledger (domain 1).
- Findings: none new feasible without species ledger; mod/total recomputation would be tautological (F-1).

### 4. Hit points — Coverage: **Wired** (done in HP-F1..F4)
- Authority (audited): `engine/HP/hp-accounting.js` (ledger, `planHpRecompute`, `auditHp`), `HPGeneratorEngine`, `ProgressionEconomyPlanBuilder`
  (live writer), `ProgressionMetadataPlanBuilder` (history), `ActorEngine.recomputeHP` (sole `system.hp.max` writer), `ProgressionRules`
  (`hpGeneration`, `maxHPLevels`, `levelUpHpRecoveryMode`). Verdict: `HP_LEDGER_MISMATCH` only (review-only; Resolve disabled).
- Open: HP-001 (level-up + CON in one transaction). Leftover duplicate: `_computeExpectedDerivedStats` HP `knownMinimum` (F-2). Do not touch in 17-domain work.

### 5. Base Attack Bonus — Coverage: **Wired** (cross-validation, F-2)
- Authority: `BABCalculator` (async, class-data-loader; audited signature only). Reconciler expectation: `_computeExpectedDerivedStats`.
  Persisted: none (BAB is `system.derived.bab`, prepared). Existing test: `progression-derived-class-stat-audit-contract`.
- Missing: modifier contribution (`bab.total` modifiers) is outside the reconciler's expectation, so a legitimate permanent BAB modifier could
  appear as a discrepancy — verify before extending. Plan: route expectation through `BABCalculator` and remove the second summing (F-2).

### 6. Defenses — Coverage: Partial (class defense bonus only)
- Authority (audited header/imports): `DefenseCalculator` (async; 1154 lines; armor via `resolveArmorUsageEffects`, `armor-data-resolver`, size,
  heroic level, `ModifierEngine`, `ImplantRules`, grapple state, passive-state predicates). Output `system.derived.defenses.*`
  (prepared). `armoredDefenseForAll` is exercised through the talent grant (house-rule grant table) not the defense calculator.
- Missing: total defenses cannot be independently verified without re-deriving them (F-1). Meaningful checks: derived-mirror freshness (F-1.3),
  armor equipped-state/proficiency consistency (domain 15), and the house-rule grant presence (done in house-rule work).
- Needs owner decision: whether "complete defense" verification means freshness-only (feasible, non-tautological) or an independent
  recomputation (competing implementation — forbidden by the command).

### 7. Damage threshold, DR, shields — Coverage: None
- Authority (located): `ThresholdEngine` (sync `calculateDamageThreshold`, `computeBaseThreshold`; async `getDamageThreshold`),
  `DerivedCalculator` (`system.derived.damageThreshold`, `shield`, `damageResistances`), persisted `system.shields`, `system.damageReduction`.
- Same F-1 limit: derived threshold is prepared. Checkable: persisted shield maximum vs source item (not audited), persisted DR vs sources (not audited).
- Contextual values (current shield, damage) are never findings.

### 8. Feats — Coverage: Partial
- Authority: `AbilityEngine` (prerequisites, `evaluateAcquisition`), `FeatGrantEntitlementResolver` (feat-derived entitlements),
  `ProgressionEntitlementCalculator` (general/class feat slots), `HouseRuleFeatGrants` + `house-rule-grant-table.js`, acquisition evidence
  (`progression-evidence.js`, `acquisition-authority.js`). Wired: slot accounting, house-rule free grants, advisory drop check.
- Missing: historical prerequisite re-validation is intentionally absent (do not revalidate historical acquisitions); duplicate / mutually
  restricted feat conflicts: no rule source audited. Findings: existing `MISSING_*_FEAT`, `MISSING_HOUSE_RULE_GRANT`.

### 9. Talents — Coverage: Partial
- Authority: `TalentCadenceEngine`, class-table `talent_choice`, `TalentSlotCalculator`; reconciler class-table slots; house-rule extra-L1 slot.
- Blocked by RECON-001 (multiclass), RECON-005 (cadence under `talentEveryLevel`, `talentDoubleLevels`). Do not extend; tree-eligibility
  verification needs the talent-tree authority (not audited).

### 10. Skills — Coverage: None
- Authority (audited exports): `SkillRules` (settings: training points, cap, focus variant/activation, athletics consolidation, knowledge mode),
  `DerivedCalculator` skills block (`system.derived.skills`, prepared — F-1), persisted `system.skills.<key>.{trained,...}`.
- Checkable: trained-skill count vs entitlement (class skills-per-level + INT mod + species; **entitlement source not audited**), invalid skill keys,
  trained skills not in canonical skill list. Totals are tautological (F-1). Not audited: where trained-skill entitlement is computed in progression.

### 11. Force abilities — Coverage: Partial
- Authority: `FeatGrantEntitlementResolver` (Force Training power entitlements), `force-power-source-reconciliation` tests, reconciler typed
  `classChoices` (force secrets / techniques / powers). Gap confirmed by the audit: feat-derived entitlements are not source-aware in the reconciler.
- Caveat: five force-power tests fail at the PR merge base (missing `scripts/combat/damage-system.js`); they are unrelated and must stay isolated.

### 12. Force Points, Destiny Points, resources — Coverage: None
- Authority (audited): `calculateMaxForcePoints(actor)` (sync but **NOT pure**: its helper `getForcePointBase` calls `actor.setFlag('swse', 'hasBase7FP' | 'hasPrestigeFPBonus', true)` while computing; base 5/6/7 + floor(level/2) + `MetaResourceFeatResolver.getForcePointMaxBonus`),
  `calculateMaxForcePointsForBuildPlan` (read-only; used by the economy builder and by the reconciliation adapter). Planned convergence (not done): one pure rules function shared by both entry points, with the high-water flag persistence performed separately through an authorized writer. Persisted `system.forcePoints.{value,max}` written by
  `updateActorForcePoints` / builders. **Persisted-mirror-vs-authority comparison, but `system.forcePoints.max` is player-editable and is 0 on a manually built character; a difference is a confirmed error only with evidence the value was formula-managed (see the Phase 1 section of the implementation report).**
- Value below max is never a finding. Destiny Points / Second Wind: authority located only (`system.destinyPoints`, `system.secondWind`), not audited.

### 13. Movement and encumbrance — Coverage: None
- Authority (audited): `EncumbranceEngine` (sync; `calculateEncumbrance`, `carriedWeightReport`, `itemWeightVerified`), `species-movement.js`.
  Persisted `system.speed`, `system.speciesMovement`. `itemWeightVerified` already distinguishes uncertified weights → UNVERIFIABLE path exists.

### 14. Combat statistics — Coverage: None
- Authority: `DerivedCalculator` (`initiative`, `grappleBonus`, prepared), `engine/combat/combat-roll-math.js`, weapon runtime (located: weapon-runtime-5br tests), ModifierEngine.
  Contextual results are excluded. Largely F-1 tautological; persisted inputs are weapon items (domain 15).

### 15. Equipment, armor, modifications — Coverage: None
- Authority: `resolveArmorUsageEffects`, `armor-data-resolver`, `modification-slot-authority.js` + `UpgradeSlotEngine` +
  `modification-v2/modification-slot-closure.js` (**two possible slot authorities, F-6**). Certification of modifications must not become a
  character error. Needs audit before Phase 3.

### 16. Droid-specific mechanics — Coverage: None (separate service exists)
- Authority (located): `DroidValidationEngine`, `domain/droids/droid-converted-system-reconciliation-service.js` (`inspectReconciliation`,
  `buildReconciliationPlan`, `applyReconciliation`, `rollbackReconciliation`), `droid-installation-reconciler.js`,
  `droid-mode-adapter.js`. Mode (stock / playable-derived / custom) detection source: not audited. Existing droid reconciliation must not be merged
  with character progression reconciliation.

### 17. Progression integrity — Coverage: Partial (substantially wired)
- Authority (audited): `progression-evidence.js`, certification records, `auditTransactionMaterialization`, ownership classifier, house-rule
  accounting, targeted routing. Missing: duplicate certified grants detection beyond slot matching; class advancement order; stale metadata checks.

## 4. Existing reconciliation test inventory (this feature)
`reconciliation-v2-contract` (22), `reconciliation-phase6-advisory` (15), `reconciliation-phase6-review-fixes` (5), `reconciliation-house-rules`,
`progression-evidence-reconciliation`, `acquisition-authority`, `progression-derived-class-stat-audit-contract`, `hp-preservation-authority`,
`hp-house-rule-authority`. Unrelated name matches (`droid-*reconciliation*`, `species-*reconciliation*`, `action-authority-*`) test other systems.

## 5. Reusable validators located
`DroidValidationEngine`, `AbilityEngine.evaluateAcquisition`, `ProgressionContentAuthority`, `EncumbranceEngine.itemWeightVerified`,
`ModificationSlotAuthority.resolveSlotState`, `SkillRules` setting readers, `tools/validate-*.{js,mjs}` (data / partials).

## 6. Competing calculations to retire (record)
1. Reconciler class-defense / BAB expectation vs `BABCalculator` / `DefenseCalculator` (F-2).
2. Reconciler HP `knownMinimum` in `_computeExpectedDerivedStats` (unused for verdicts).
3. Legacy fallback reads in `_readCurrentDerivedStats`.
4. Dead duplicate HP block in `ProgressionFinalizer` (inline level-up/chargen, discarded by the economy builder) — pre-existing, outside reconciliation.
5. `ConfirmStep` (unreferenced).
6. Possible duplicate modification slot authorities (F-6).

## 7. Foundry runtime dependencies (cannot be verified under Node)
Real `prepareDerivedData` async timing and `appliedSignature` behavior; compendium-backed class/species data; `ActorEngine.recalcAll` on a
live actor; hooks for cache invalidation; sheet header `!` rendering; GM/player permissions; two-client behavior.

## 8. Phase 1 scope decision (derived from this audit)
Implement, reusing existing calculators and without duplicating math:
1. A domain-adapter contract (pure, read-only, returns `{domain, status, ...}`) mapped onto the existing finding model; no actor writes.
2. **Force Point maximum** adapter: persisted `system.forcePoints.max` vs `calculateMaxForcePoints` (sync, true mirror check). Resolve: none until
   an existing writer (`updateActorForcePoints`) is verified idempotent and routed through ActorEngine.
3. **Derived-mirror freshness** adapter: covers defenses, initiative, grapple, damage threshold, ability mods, skills (all prepared values) via
   `appliedSignature` and finite-field checks; Resolve = existing `recalcAll`. Reported honestly as freshness, not as proof the build is correct.
4. Consolidation of F-2 (route BAB / class-defense expectation through the canonical calculator seam) only if it can preserve the existing
   audit-contract test; otherwise record as `AUTHORITY_CONFLICT` for review.
Explicitly not done in Phase 1: tautological recomputation of defenses/initiative/grapple/threshold; ability-score reconstruction; anything blocked by
RECON-001..005 or HP-001.
