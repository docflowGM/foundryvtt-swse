# SWSE Galactic Profiles v3 — Unification and Canonical Alignment Audit (Revision 2)

> **Read first.** This file has two parts. **Part 1 (§0–§I)** is the original audit evidence. **Part 2 (§R.0–§R.13)** incorporates the owner's 11 decisions and **governs wherever the two differ**. Statements in Part 1 that Part 2 supersedes are marked *[superseded → §R.x]*.

**Mode:** read-only audit. No runtime file, data file, branch or commit was changed in `docflowGM/foundryvtt-swse`.
**Examined:** `origin/feature/chargen-splash-prewarm` @ `9de84a421ae62f734f30e75113ebcd1cccc32dd6` (detached worktree in the scratchpad; scratch test files removed afterward).
**Evidence legend:** **[V]** verified by running repo code or schema/pack data in this session · **[C]** verified by reading the code path · **[S]** suspected, needs V2 execution · **[R]** needs Foundry v13 runtime · **[P]** carried from the prior rolling audit / handoff and *not* re-verified here (rules-book claims in particular: I cannot read the printed books).

Reproduction scripts (outside the repo): `.../scratchpad/audit-scripts/`.

---

## 0. Repository authority

| Check | Result |
|---|---|
| Remote `feature/chargen-splash-prewarm` HEAD | `9de84a4…` — **identical** to the last verified commit; nothing newer **[V]** |
| Commits since baseline `c8c1c4b` | only `9de84a4` (droid data + handoff); `c8c1c4b` itself staged the 33-profile package |
| Branch vs `main` (`8efa680`) | 23 files / +22,864 −61: the v3 data, 3 audit docs, splash prewarm, intro/profile-step edits, 3 tests |
| **This session's branch** `claude/galactic-profiles-v3-audit-7nfpt0` | sits at `main` **without** any v3 data or prewarm work. Implementation must start from `feature/chargen-splash-prewarm` (or merge it) — otherwise every file in this audit is absent |
| Rules register | `docs/audits/swse-rules-decisions-pending.md` exists (SPECIES-RD-001…023). **SPECIES-RD-001 is a ruling that binds the compiler**: multi-publication species require an explicit player choice, never a silent default |

---

## A. Executive verdict

**Yes — all 41 profiles can be one system, and the right move is a *targeted consolidation*, not a rewrite.**

* The expensive, risky parts already exist and are correct: `ProgressionSession`, the **subtype-adapter registry** (`actor`/`droid`/`nonheroic`/`beast`/`follower` — already the participant-specific seam), `ProgressionFinalizer.dryRun/finalize` → `ActorEngine.applyMutationPlan`, `quoteDroidBuild`, `applyInitialInstallationToPlan`, `droid-trait-rules`, `FeatChoiceResolver`, `TalentCadenceEngine`, `ProgressionEconomyPlanBuilder`.
* What is wrong is the *front end*: a v2 `TemplateRegistry`/`TemplateAdapter`/`TemplateValidator` stack that writes `draftSelections` directly, locks steps by array non-emptiness, applies on step exit, and cannot carry equipment, wallet, droid builds or beast data — plus **a second, live template path** (`TemplateCharacterCreator`) that bypasses the progression session and finalizer entirely.
* The v3 data is a good *intent* format but has two schema files that are ~90% copy-paste and have already drifted (the droid records **fail their own schema**), plus a lot of derived data that duplicates V2 and will drift.

Smallest correct end state: **one schema, one registry+catalog, one compiler, one session slot for "applied profile", one finalizer path** — with exactly two participant extensions that carry real data (`droid`, `beast`) and `nonheroic` handled by V2's existing adapter.

**What the evidence says about legality right now:** the eight droids are *mechanically closer to correct than the 33* — I executed the real V2 droid quote and installation code against them (§C.4). But **none of the 41 is applicable today**: no runtime consumer for v3 exists, and the verified data/contract defects in §C–D would make a naive apply wrong.

---

## B. Verified architecture map

```
 INTRO  intro-step.js:791  [intro-galactic-profile] → profilePickerMode=true → chargen-shell._injectGalacticProfileDescriptors
        intro-step.js:865  [droid-select-standard]  → TemplateInitializer.initializeForChargen → legacy modal;
                                                       then sets creationMode='standard-model'            ← wrong lane for droid profiles [C]
        actor-sidebar-controls.js:81 / directory-hooks.js:51 / droid-template-choice-dialog.js:105
                                                    → TemplateCharacterCreator (1,133 lines)               ← SECOND live path [C]
 PICK   galactic-profile-step.js  ProfileClass → ProfileArchetype → ProfileReview
        onStepEnter/Render seeds first class + first template (:359-405,447,502)                          ← implicit consent [C]
        ProfileReviewStep.onStepExit → _applyTemplateToSession (:596-657)                                  ← applies on Back/Close [C]
        filter: subtype==='droid' → t.subtype==='droid' (:166-171)  (v3 droid records have legacySubtype:null)
 LOAD   template-registry.js  fetch(character-templates.json)+(nonheroic-templates.json) v2; _loadPromise never cleared on reject
 COMPILE template-adapter.js  initializeSessionFromTemplate → new ProgressionSession; direct draftSelections.* writes;
        locks by array non-empty (:283-345); session.draftSelections.droid = {id,name} (:250)  — not the builder's shape
 VALIDATE template-validator.js  hardcoded 4 skills / 3 languages; warn-only
 SESSION progression-session.js  draftSelections has NO slot for: profileId/revision, starting equipment, net wallet, beastData
 FINAL  progression-finalizer.js  dryRun:298 → _compileMutationPlan → adapter.contributeMutationPlan → _validateMutationPlan
        credits: ProgressionEconomyPlanBuilder.buildChargenSet (live; finalizer's inline copy is stripped by phase4RemoveInlineEconomyKeys)
        writes system.credits ONLY if >0; adds Wealth grant; reads chargenStore   → cannot express "net balance 0 / exactly this"
        items: only class auto-grants + Jedi starter lightsaber (_compileClassStarterEquipmentItems:3057)  → no profile-kit path
 DROID  DroidSubtypeAdapter (default-subtypes.js:71): degree+size mods into `.racial`, forces CON=0, then
        applyInitialInstallationToPlan(…) — the ONE ledger seeding point.   quoteDroidBuild accepts exactly profile droidSystems shape.
```

**Competing authorities (verified):**

| # | Competing pair | Status |
|---|---|---|
| 1 | `TemplateRegistry` (v2 JSON) vs v3 packages | v3 has **no loader**; two data authorities would coexist |
| 2 | `TemplateAdapter` direct writes vs `session.commitSelection` | adapter bypasses validation/watchers/persistence hooks (`:154,164,…`) |
| 3 | `TemplateCharacterCreator` + `chargen-templates.js` vs ProgressionShell | separate actor-creation path reading `character-templates.json` directly; defaults `credits` to 1000 when missing (`:376`) **[C]** |
| 4 | Finalizer inline credits (`:1513-1521, :2674`) vs `ProgressionEconomyPlanBuilder` | duplicated; the builder wins at runtime. The handoff's cited `:2674-2689` is the *losing* copy |
| 5 | `chargenStore` flag (actor-backed, pre-confirm) vs draft-only ledger | the flag is written at `summary-step.js:1772-1787` (timing relative to confirm not re-verified **[C?]**) and would conflict with "no actor write before confirm" |
| 6 | Profile-JSON derived stats vs V2 | degree/size mods, inhibitors, hardware costs, grants, final scores, class-credit math all duplicate V2 (§C) |
| 7 | `TemplateTraversalPolicy` locks vs real entitlement computation | locks by non-empty array |

---

## C. Schema comparison and discrepancy classification

### C.1 Structure facts **[V]**

* Both packages: same top-level keys, same profile key set (`schemaVersion, profileId, revision, catalog, identity, build, optionalRules, certification, provenance`), and **both declare `format: "swse.galactic-profiles.v3"`** though their `source` blocks differ (`commit/inputFiles` vs `sourceCommit/rulesSources/authorityModules`).
* 41/41 `profileId`s unique; catalogs list all 41; **catalog fields common to both match the records with 0 diffs**.
* Organic doc vs organic schema: **valid**. **Droid doc vs droid schema: INVALID — 32 errors (4 × 8 profiles)**: `startingPackage.budgetAccounting` const (inherited from organic), `provenance.sourceFile` and `legacyId` required strings (droids have `null`), `provenance.sourceCommit` pinned to the organic commit `b5e2a75…` (droids use `c8c1c4b…`). The schema was cloned and never run against its own data.
* Neither schema has `$defs`; the `{sourceRef, canonicalIdCandidate, resolution}` ref shape is pasted inline repeatedly. Cross-rejection works only through `const`s (droid ⇄ organic).
* Neither schema constrains `droidSystems` row shape, `sourceRef.type`, `feats.sourceSelections[]` or `item` entries beyond `id`.

### C.2 Discrepancy table

Classes: **STR** structural inconsistency · **SEM** semantic inconsistency · **LEG** legitimate rules-track variation · **RED** redundant/derived data · **DEP** unresolved implementation dependency.

| # | Discrepancy | Class | Evidence | Disposition |
|---|---|---|---|---|
| 1 | Identity uses 4 overlapping fields: `participantKind`, `rulesTrack`, `legacySubtype`, `legacyParticipantKind` (values observed: heroic/heroic/actor/∅ ×23; nonheroic/nonheroic/actor/INDEPENDENT ×3 **and** nonheroic/nonheroic/actor/∅ ×5; beast/nonheroic/beast/INDEPENDENT ×2; droid/heroic-droid/∅/∅ ×8) | **SEM**+RED | `rulesTrack` is a function of `participantKind`; the other two are legacy leftovers; the schema permits `participantKind:'beast'`+`rulesTrack:'heroic'` | Replace by **one** discriminator (§E) |
| 2 | Attributes: organic has 6 `scores` + `basis:'unverifiedLegacyScoreBasis'`; droid has 5 + `con:null` + `preDegreeAndSizeScores` + `degreeModifiers` + `sizeModifiers` | **SEM** (basis) / **RED** (mods) / **LEG** (no CON) | V2 `DroidSubtypeAdapter` adds degree+size mods to `.racial` and forces CON=0 itself → **session base must be the pre-modifier array; committing the droid `scores` would double-count [C]**. Droid mods/inhibitors/default-locomotion/standard array all equal V2 for 8/8 **[V]** | One field `attributes.base` (what the player assigns). Droid: five keys, **CON key absent** (not `null`). Delete `scores`(final), `degreeModifiers`, `sizeModifiers` |
| 2b | Legacy organic score basis (pre- vs post-species) is undeclared; 0/23 heroics match the standard array; 14/23 share one identical multiset (8,10,12,12,14,16 Σ72) regardless of species; 9 others Σ70–78 | **DEP** (data fact only the author knows) | §I Q1 | Owner question; compiler must not guess |
| 3 | Skill identity: organic = 16-hex opaque ids in `sourceEntry.id/name` (28 profiles); droid = readable keys; 1 unresolved (`laborer-worker` "Athletics"); `resolution` values differ (`mappedFromV2FinalizerKey` ×151 / `mappedFromExistingV3PendingV2` ×48 / `unresolvedSkillKey` ×1) | **STR**+RED | `normalizeSkills` consumes semantic keys ("compendium IDs are opaque and must not become progression choice keys") | Single `skills: [key]` (V2 skill key). Drop `sourceEntry`, `resolution` |
| 4 | Feat identity: parameterized feats authored as display names (`"Skill Focus (Mechanics)"`, `"Weapon Proficiency (Rifles)"`); packs hold generic "Skill Focus"/"Weapon Proficiency"; V2 stores `{id, system.selectedChoice}` validated by `FeatChoiceResolver`. 42 feat refs (19 distinct names) match nothing by `_id` or exact name | **SEM**/**DEP** | pack probe + `feat-step.js:167,2148-2180`, `feat-choice-options.json` | `feats: [{ feat:<id>, choice?:<option> }]`; compiler validates via FeatChoiceResolver |
| 5 | Feat bookkeeping: `sourceSelections[]` with `sourceCandidates[]` aliases, `entitlement`, `selectionStatus`; droids add `expectedAutomaticClassFeatNames` | **RED** | V2 `ClassAutoGrants` already equals the droid expected lists exactly (Scout: `Shake It Off*`, Noble: `Linguist*` carry an asterisk in V2's list; the droid README treats them as conditional — V2 must evaluate, not the profile) | Keep **only** the player's selected feats. Alias quarantine belongs in the migration report, not the runtime contract. Expected auto-grants become a **test fixture** |
| 6 | Talents: `classSlot.selection`, `sourceTree`, `parameters`, `validation`, `generalSlotWhenTalentWikiEnabled`, `additionalSourceEntries`, `policy`; droids `sourceTree:null` (8/8) | **STR** (droid vs organic) / **RED** | **6 of 23 organic `sourceTree` assertions contradict the talent doc's own tree** (Block/Deflect/Force Focus/Surveillance/Sizing Up; Sentinel = duplicate same-name tree docs) **[V]** | `talents: [{ talent, choice? }]`. **Drop `sourceTree`** — resolve tree from the talent DB. Slot allocation comes from `TalentCadenceEngine` |
| 7 | `optionalRules.talentWiki{…}` + `generalSlotWhenTalentWikiEnabled` | **RED** | identical text in 33+8; nonheroic/beast = `null` | Remove. Optional general slot is an *unfilled* V2 entitlement the player resolves; profiles must not carry a placeholder for it |
| 8 | Force: `forcePowers.sourceSelections[]` + `grantAuthority` (`ForceTrainingAndV2PowerSlotValidation` vs `droidForbidden`) | **LEG**/**RED** | `grantAuthority` is prose | `forcePowers: [id]`; empty and **schema-forbidden** for droid, beast, nonheroic-without-Force-Training |
| 9 | Languages: `legacyKnownLanguages` + `grantPolicy` prose | **RED** | adapter already strips automatic grants (`_filterTemplateBonusLanguages`) | `languages: [bonus language ids]` only |
| 10 | *[disposition superseded → §R.4]* Class/species/background refs: `{sourceRef:{id,name,pack,type}, canonicalIdCandidate, resolution}` | **STR**/**RED** | 29/33 species `_id`s resolve; Wolf/Bear species absent from packs; backgrounds mostly resolve by *name* (ids are slugs like `duro-origin`); 4 backgrounds unresolved; **nonheroic/beast `classRef` ids (`soldier-nonheroic-id`, `beast-nonheroic-id`, `Nonheroic`) exist in no class doc — V2 uses `NONHEROIC_CLASS_MODEL`** | *[superseded → §R.2/§R.4]* Refs become one id each resolved by V2 registries; nonheroic/beast `classRef` is **retained** under `provenance.sourceRefs` and normalized to the V2 class id `nonheroic`; droid has no species/background |
| 11 | Equipment: item = `{item:{sourceRef,canonicalIdCandidate,resolution}, quantity, displayName, sourceExtra, resolution}`; droid adds `printedUnitPriceCredits`; `budgetAccounting` is `prePurchasedLegalByUserAssumption` (organic) vs a long droid-specific string; `duplicateProtection` prose | **STR**/**RED** | 4 droid "Energy Cell" refs authored `id:null` although `tool-energy-cell` exists uniquely **[V]**; item present in two packs (`equipment`, `equipment-tools`) | `equipment: [{ item:<id>, qty }]`. Prices are never read (owner decision: no re-pricing) |
| 12 | Wallet: `{mode:'finalNetBalance', credits, allowZero}` both packages | **SEM-consistent** | Finalizer writes credits only if >0 and adds Wealth (§D) | Keep `wallet: <int ≥0>` (mode is a constant); fix the finalizer, not the data |
| 13 | Droid class-credit ledger: `startingClassCredits{dice,preselectedDiceResults,perDieTotal,multiplier,initial,purchasesTotal,remaining}` | **RED** | `remaining` == `wallet.credits` for 8/8; the rest derives from V2 class credits | Delete; keep a regression test that recomputes it |
| 14 | Droid hardware: `hardware{budgetCredits,spentCredits,remainingCredits,lineItems[],grants[],quotedBy,v2QuoteStatus…}` | **RED** | `quoteDroidBuild` on `droidSystems` = **OK / 1000 / expected free grants for 8/8**, authored `costCredits` equal | Keep only `droid.systems`. Delete the ledger (`lineItems`, `sourcePriceCredits`, `grantAuthority`, `sourceDecision`, …) |
| 15 | Droid `droidSystems` row shape: appendages `{id:'hand-1'}`; builder rows are `{id,name,type:'hand',…}` | **DEP — verified defect** | `buildInitialDroidInstallation` on authored data: **8/8 `UNKNOWN_COMPONENT hand-1/hand-2`; with only `type:'hand'` added: 8/8 `seeded:true, unresolved:0`** (8–11 ledger entries each) **[V]** | Compiler, not JSON, owns builder-row construction (the row shape is V2-internal); profile keeps ids only |
| 16 | Droid `creationMode/droidCalculationMode/isDroid/chassis` | **RED/LEG** | constants (`custom`, `playable-derived`, `true`, `null`) | `droid.mode:'custom'` only; the other three are constants of the extension |
| 17 | Beast: `build.beastSourceMechanics` {size, intelligence, naturalWeapons, naturalArmor, senses, specialQualities, creatureType…} | **LEG** + **DEP** | `BeastSubtypeAdapter` seeds *only* from `actor.flags.swse.beastData`/`nonheroicContext.isBeast`; `draftSelections` has no beast slot; `"Pack Tactics (advantage…)"` is not SWSE vocabulary | Real participant extension — but **blocked** (§G P5, §I R3) |
| 18 | `optionalRules` = `null` (nonheroic/beast) vs object (heroic/droid) vs `allowDroidOverflow` (droid) | **STR** | `allowDroidOverflow` is `false` constant; V2 reads the house setting | Remove the key entirely |
| 19 | `certification`: organic `status:'pendingV2Certification'`; droid `staticLegality{16 booleans}` + issue strings | **STR**/**RED** | the 16 booleans are author claims; I verified several independently (std array, mods, inhibitors, quote) and they hold, which is a reason to compute them in tests, not to store them | Keep `{status, publishableAsReadyToPlay}`. Issues/flags move to a **generated** report; `publishableAsReadyToPlay` becomes *derived* from CI results |
| 20 | `provenance`: organic `legacyId/sourceFile/sourceVersion/rawSourcePreservedIn/legacySupportLevel`; droid `authoringMethod/rulesSources/authorityModules` | **LEG** (provenance may differ) | not a mechanical field | Keep as free-form `provenance{}` outside the mechanical contract; **not** schema-compared |
| 21 | `catalog`: shared 9 fields identical; droid adds `focus,degree,size,finalAttributes,weapon,gear,construction*,classStartingCreditsRemaining,readyToPlay`, lacks `className,quote,dialogueKey`; droid `imagePath:null`, `mentorKey` null for 4 | **RED**/**LEG** | currently consistent 8/8 but denormalised from the record (drift hazard) | **Generate** both catalogs from the profiles by one script; one catalog schema; droid extras are optional display fields generated from the compiled draft |
| 22 | Catalog file: organic has `totalProfiles`, `source.generatedFrom`; droid has `source.repository…authoringFile` | **STR** | cosmetic | one generated catalog covering all 41 |
| 23 | Mentor/dialogue: `mentorKey` 33/33 heroics+droids set; nonheroic/beast `null`; `dialogueKey` set for 23 heroics only | **LEG**/gap | `MENTOR_COVERAGE_UNSPECIFIED` ×10, `MENTOR_ASSIGNMENT_PENDING` ×4 | optional in schema; not a legality item |

### C.3 Does v3 support all four categories? **[V]**

Structurally yes (all 41 are the same 9 top-level keys). Mechanically **no, not as authored**: nonheroic and beast classRefs point to nothing; beast mechanics have no session destination; droid builder rows are not V2-consumable until the compiler adds `type`; organic score basis is unknown; and the schemas can't prove any of it.

### C.4 Executed V2 evidence for the 8 droids **[V]** (real repo modules via the repo's own test loader)

| Check | Result |
|---|---|
| `{15,14,13,12,10}` standard array permutation (pre-modifier, CON null) | 8/8 |
| Authored `degreeModifiers` / `sizeModifiers` vs `getDroidDegreeAbilityMods` / `getDroidSizeAbilityMods`; arithmetic `pre + deg + size == final` | 8/8 equal, 0 mismatches |
| Inhibitor flags vs `hasDroidNonviolenceInhibitor/ObedienceInhibitor` | 8/8 equal |
| `quoteDroidBuild({droidSystems, droidSize, droidDegree})` | **8/8 `OK`, total exactly 1000**; free grants = heuristic + `hand-1/hand-2` (+ default walking for the one Medium droid that kept it) |
| Locomotion charging: chosen vs `getDroidSizeDefaultLocomotion` | consistent with quote (e.g. Small default is *tracked*; the recon probe's *wheeled* is charged) |
| `buildInitialDroidInstallation` (host + source-review + initial-build quote gates) on authored data | **8/8 FAIL** (`hand-1/hand-2 UNKNOWN_COMPONENT`) |
| …same call with `type:'hand'` supplied | **8/8 `seeded:true`, 0 unresolved** |
| Droid JSON vs own schema | **FAIL 8/8** |

*Limits:* offline Node, not Foundry; `buildInitialDroidInstallation` ran with `actor:null`; feat/talent/skill entitlement and prerequisite checks were **not** executed for any profile (no V2 registry bootstrap offline).

---

## D. Mechanical legality matrix (all 41)

"Verified defect" = demonstrated by data/code here. "Verified correct" is claimed only where I executed the V2 check. A structurally valid row is **not** a legal character. Every row additionally needs **[R]** (actor, inventory, ledger, wallet in Foundry v13).

| Profile | Track | Class | Verified correct | Verified defect | Suspected | Needs runtime |
|---|---|---|---|---|---|---|
| `jedi_guardian` | heroic/heroic | Jedi | — | lightsaber ref `weapons-simple#weapon-lightsaber` not in pack by id or name; class-slot talent tree asserted by profile ≠ talent doc tree; Force Training absent while Force powers listed (cert flag FORCE_TRAINING_ENTITLEMENT_MISSING); authored 2 Force powers but Force Training (V2 doc, Core p.85) would give 1+WIS(+2)=3 (GP-RD-003) | starter-lightsaber duplicate vs finalizer auto-grant (GP-021) | Foundry v13: actor, inventory, ledger, wallet |
| `jedi_consular` | heroic/heroic | Jedi | — | lightsaber ref `weapons-simple#weapon-lightsaber` not in pack by id or name; class-slot talent tree asserted by profile ≠ talent doc tree; Force Training absent while Force powers listed (cert flag FORCE_TRAINING_ENTITLEMENT_MISSING) | starter-lightsaber duplicate vs finalizer auto-grant (GP-021) | Foundry v13: actor, inventory, ledger, wallet |
| `jedi_defender` | heroic/heroic | Jedi | — | lightsaber ref `weapons-simple#weapon-lightsaber` not in pack by id or name; class-slot talent tree asserted by profile ≠ talent doc tree; Force Training absent while Force powers listed (cert flag FORCE_TRAINING_ENTITLEMENT_MISSING) | starter-lightsaber duplicate vs finalizer auto-grant (GP-021) | Foundry v13: actor, inventory, ledger, wallet |
| `jedi_sentinel` | heroic/heroic | Jedi | — | lightsaber ref `weapons-simple#weapon-lightsaber` not in pack by id or name; asserted tree id ≠ doc tree id though both named "Jedi Sentinel" (duplicate tree docs) | starter-lightsaber duplicate vs finalizer auto-grant (GP-021) | Foundry v13: actor, inventory, ledger, wallet |
| `noble_diplomat` | heroic/heroic | Noble | — | — | — | Foundry v13: actor, inventory, ledger, wallet |
| `noble_leader` | heroic/heroic | Noble | — | — | — | Foundry v13: actor, inventory, ledger, wallet |
| `noble_aristocrat` | heroic/heroic | Noble | — | Wealth talent: finalizer adds lineageLevel×5000 on top of authored net wallet | — | Foundry v13: actor, inventory, ledger, wallet |
| `noble_duelist` | heroic/heroic | Noble | — | — | — | Foundry v13: actor, inventory, ledger, wallet |
| `soldier-guard` | nonheroic/nonheroic | Soldier (Nonheroic) | — | classRef id absent from classes pack (V2 uses NONHEROIC_CLASS_MODEL) – field is dead weight; background refs unresolved by id/name (Military Academy / Frontier Settler / Common Worker / Feral Creature) | — | Foundry v13: actor, inventory, ledger, wallet |
| `scout-pathfinder` | nonheroic/nonheroic | Scout (Nonheroic) | — | classRef id absent from classes pack (V2 uses NONHEROIC_CLASS_MODEL) – field is dead weight; background refs unresolved by id/name (Military Academy / Frontier Settler / Common Worker / Feral Creature) | — | Foundry v13: actor, inventory, ledger, wallet |
| `laborer-worker` | nonheroic/nonheroic | Laborer (Nonheroic) | — | skill "Athletics" has no V2 skill key; classRef id absent from classes pack (V2 uses NONHEROIC_CLASS_MODEL) – field is dead weight; background refs unresolved by id/name (Military Academy / Frontier Settler / Common Worker / Feral Creature) | — | Foundry v13: actor, inventory, ledger, wallet |
| `beast-wolf` | beast/nonheroic | Beast (Nonheroic) | — | species & class docs absent from packs; beastData has no session slot; BeastSubtypeAdapter seeds only from actor flags; "Pack Tactics (advantage…)" is not SWSE terminology; background refs unresolved by id/name (Military Academy / Frontier Settler / Common Worker / Feral Creature); BeastSubtypeAdapter.validateReadiness only warns (reads actor INT, `||1`); beast subtype needs pre-existing `flags.swse.beastData` that nothing writes (§R.1) | — | Foundry v13: actor, inventory, ledger, wallet |
| `beast-bear` | beast/nonheroic | Beast (Nonheroic) | — | species & class docs absent from packs; beastData has no session slot; BeastSubtypeAdapter seeds only from actor flags; background refs unresolved by id/name (Military Academy / Frontier Settler / Common Worker / Feral Creature); BeastSubtypeAdapter.validateReadiness only warns (reads actor INT, `||1`); beast subtype needs pre-existing `flags.swse.beastData` that nothing writes (§R.1) | special qualities/natural attacks need source review (README flag) | Foundry v13: actor, inventory, ledger, wallet |
| `nonheroic_worker` | nonheroic/nonheroic | Nonheroic | — | classRef id absent from classes pack (V2 uses NONHEROIC_CLASS_MODEL) – field is dead weight | — | Foundry v13: actor, inventory, ledger, wallet |
| `nonheroic_trooper` | nonheroic/nonheroic | Nonheroic | — | classRef id absent from classes pack (V2 uses NONHEROIC_CLASS_MODEL) – field is dead weight | — | Foundry v13: actor, inventory, ledger, wallet |
| `nonheroic_criminal` | nonheroic/nonheroic | Nonheroic | — | classRef id absent from classes pack (V2 uses NONHEROIC_CLASS_MODEL) – field is dead weight | — | Foundry v13: actor, inventory, ledger, wallet |
| `nonheroic_merchant` | nonheroic/nonheroic | Nonheroic | — | classRef id absent from classes pack (V2 uses NONHEROIC_CLASS_MODEL) – field is dead weight | — | Foundry v13: actor, inventory, ledger, wallet |
| `nonheroic_police` | nonheroic/nonheroic | Nonheroic | — | classRef id absent from classes pack (V2 uses NONHEROIC_CLASS_MODEL) – field is dead weight | — | Foundry v13: actor, inventory, ledger, wallet |
| `scoundrel_pistoleer` | heroic/heroic | Scoundrel | — | — | — | Foundry v13: actor, inventory, ledger, wallet |
| `scoundrel_skill_monkey` | heroic/heroic | Scoundrel | — | — | — | Foundry v13: actor, inventory, ledger, wallet |
| `scoundrel_knuckledragger` | heroic/heroic | Scoundrel | — | — | — | Foundry v13: actor, inventory, ledger, wallet |
| `scoundrel_outlaw` | heroic/heroic | Scoundrel | — | — | — | Foundry v13: actor, inventory, ledger, wallet |
| `scoundrel_brigand` | heroic/heroic | Scoundrel | — | — | — | Foundry v13: actor, inventory, ledger, wallet |
| `scout_sniper` | heroic/heroic | Scout | — | asserted tree "Reconnaissance" ≠ doc tree "Spy" | — | Foundry v13: actor, inventory, ledger, wallet |
| `scout_engineer` | heroic/heroic | Scout | — | asserted tree "Versatility" ≠ doc tree "Espionage" | — | Foundry v13: actor, inventory, ledger, wallet |
| `scout_pistoleer` | heroic/heroic | Scout | — | starting item is a vehicle doc in non-existent pack `vehicles` | Mechanized Rider (Mobile Scout) tree not in Scout `talent_trees`; needs V2 talent-access check | Foundry v13: actor, inventory, ledger, wallet |
| `scout_survivalist` | heroic/heroic | Scout | — | — | — | Foundry v13: actor, inventory, ledger, wallet |
| `scout_infiltrator` | heroic/heroic | Scout | — | — | — | Foundry v13: actor, inventory, ledger, wallet |
| `soldier_rifleman` | heroic/heroic | Soldier | — | Commanding Presence maps to 2 distinct docs (Force Unleashed / Galaxy at War) | — | Foundry v13: actor, inventory, ledger, wallet |
| `soldier_gunner` | heroic/heroic | Soldier | — | Devastating Attack (weapon group) has no per-group doc; one parameterized Core doc; alias entry quarantined | — | Foundry v13: actor, inventory, ledger, wallet |
| `soldier_brawler` | heroic/heroic | Soldier | — | Devastating Attack (weapon group) has no per-group doc; one parameterized Core doc; alias entry quarantined | — | Foundry v13: actor, inventory, ledger, wallet |
| `soldier_tank` | heroic/heroic | Soldier | — | Devastating Attack (weapon group) has no per-group doc; one parameterized Core doc; alias entry quarantined | — | Foundry v13: actor, inventory, ledger, wallet |
| `soldier_commando` | heroic/heroic | Soldier | — | — | — | Foundry v13: actor, inventory, ledger, wallet |
| `droid_scout_dex_recon_probe` | droid/heroic-droid | Scout | std array; degree/size mods; inhibitors; `quoteDroidBuild`=OK/1000 exact; projection OK once `type` supplied | fails own schema (4 errs); appendage rows lack `type:"hand"` → installation projection UNKNOWN_COMPONENT; "Energy Cell" authored with id:null (unique exact doc `tool-energy-cell` exists) | — | Foundry v13: actor, inventory, ledger, wallet |
| `droid_scout_int_astromech_pathfinder` | droid/heroic-droid | Scout | std array; degree/size mods; inhibitors; `quoteDroidBuild`=OK/1000 exact; projection OK once `type` supplied | fails own schema (4 errs); appendage rows lack `type:"hand"` → installation projection UNKNOWN_COMPONENT | — | Foundry v13: actor, inventory, ledger, wallet |
| `droid_soldier_dex_security_enforcer` | droid/heroic-droid | Soldier | std array; degree/size mods; inhibitors; `quoteDroidBuild`=OK/1000 exact; projection OK once `type` supplied | fails own schema (4 errs); appendage rows lack `type:"hand"` → installation projection UNKNOWN_COMPONENT | — | Foundry v13: actor, inventory, ledger, wallet |
| `droid_soldier_str_industrial_vanguard` | droid/heroic-droid | Soldier | std array; degree/size mods; inhibitors; `quoteDroidBuild`=OK/1000 exact; projection OK once `type` supplied | fails own schema (4 errs); appendage rows lack `type:"hand"` → installation projection UNKNOWN_COMPONENT | — | Foundry v13: actor, inventory, ledger, wallet |
| `droid_noble_int_medical_coordinator` | droid/heroic-droid | Noble | std array; degree/size mods; inhibitors; `quoteDroidBuild`=OK/1000 exact; projection OK once `type` supplied | fails own schema (4 errs); appendage rows lack `type:"hand"` → installation projection UNKNOWN_COMPONENT; "Energy Cell" authored with id:null (unique exact doc `tool-energy-cell` exists) | Linguist conditional on final INT → V2 must evaluate, not the list | Foundry v13: actor, inventory, ledger, wallet |
| `droid_noble_cha_protocol_envoy` | droid/heroic-droid | Noble | std array; degree/size mods; inhibitors; `quoteDroidBuild`=OK/1000 exact; projection OK once `type` supplied | fails own schema (4 errs); appendage rows lack `type:"hand"` → installation projection UNKNOWN_COMPONENT; "Energy Cell" authored with id:null (unique exact doc `tool-energy-cell` exists) | Linguist conditional on final INT → V2 must evaluate, not the list | Foundry v13: actor, inventory, ledger, wallet |
| `droid_scoundrel_cha_service_operative` | droid/heroic-droid | Scoundrel | std array; degree/size mods; inhibitors; `quoteDroidBuild`=OK/1000 exact; projection OK once `type` supplied | fails own schema (4 errs); appendage rows lack `type:"hand"` → installation projection UNKNOWN_COMPONENT; "Energy Cell" authored with id:null (unique exact doc `tool-energy-cell` exists) | — | Foundry v13: actor, inventory, ledger, wallet |
| `droid_scoundrel_dex_systems_infiltrator` | droid/heroic-droid | Scoundrel | std array; degree/size mods; inhibitors; `quoteDroidBuild`=OK/1000 exact; projection OK once `type` supplied | fails own schema (4 errs); appendage rows lack `type:"hand"` → installation projection UNKNOWN_COMPONENT | Precise Shot depends on class-granted Point-Blank Shot → V2 must count pending auto-grants | Foundry v13: actor, inventory, ledger, wallet |


**Cross-cutting verified findings behind these rows**

* **Rev 2 additions [V/C]:** (1) `resolveAdapter()` falls back to the actor adapter for unknown subtypes (§R.1); (2) `TemplateAdapter` commits classes with `system:{}` unlike `ClassStep` (§R.4) — affects every profile; (3) session persistence stores only `draftSelections` + step tracking, so template locks do not survive close/resume (§R.6.1); (4) `SummaryStep` writes actor credits/flag before confirm (§R.7); (5) attribute basis is unresolved for 20 organic/beast profiles (§R.3); (6) Zabrak V2 mods are 0 while a legacy note says CON bonus (GP-RD-008).

* **Wallet vs finalizer [V/C]:** `ProgressionEconomyPlanBuilder.buildChargenSet` writes `system.credits` only when `startingCredits > 0` (7 profiles have wallet 0), adds `lineageLevel × 5000` for the Wealth talent (`noble_aristocrat`), requires `survey.startingCreditsResolved`/`startingCredits>0` for readiness (`progression-finalizer.js:945`), and reads actor-backed `chargenStore`. A "final net balance" cannot be expressed today.
* **Kit delivery [C]:** no path adds profile equipment; the only chargen starter-item path is the Jedi lightsaber (`:3057`). The Jedi profile kit lists a lightsaber too (duplicate hazard, GP-021 **[P]**; confirmed structurally).
* **Tree identity [V]:** profile-asserted talent trees contradict the talent DB in 6 of the 23 organic class-slot talents; Mechanized Rider's tree is not in Scout's `talent_trees` list **[S]**.
* **Prior-audit rules claims [P]** (not re-verified; I cannot read the books): Jedi Force Training prerequisites/entitlement (GP-019), Devastating Attack once-per-group, starting class feat/talent counts, nonheroic entitlement counts. They stay `DEFERRED`/unverified until checked against V2 authorities and printed sources.

---

## E. Unification blueprint

### E.1 Principles

1. **The profile is player intent; V2 is every derived value.** If V2 can compute it, the profile does not carry it (items 2, 5, 13, 14, 19 above).
2. **One discriminator, one extension slot.** No parallel `rulesTrack`.
3. **No crosswalk:** discriminator values *are* V2 subtype ids.
4. **Fail closed:** compile returns `blocked[]`; an unresolved id never degrades to a name guess.

### E.2 Profile contract (one schema, `$defs` for refs, `if/then` on `subtype`)

```jsonc
{
  "schemaVersion": 3, "profileId": "…", "revision": 1,
  "subtype": "actor | droid | nonheroic | beast",     // == ProgressionSubtypeAdapterRegistry id
  "catalog":  { "name","archetype","description","quote?","imagePath?","mentorKey?","dialogueKey?",
                "roleTags":[…], "classKey?" },                                  // display only, never granted from
  "choices": {                                                                   // identical shape for all four
    "class":      "<class id>",                      // actor|droid: registry id · nonheroic|beast: "nonheroic" (V2 synthetic model) [superseded → §R.4]
    "species":    "<species id>",                    // required for actor|nonheroic|beast; FORBIDDEN for droid
    "speciesVariant?": "<verified variant id>",      // only when V2 has a verified variant (SPECIES-RD-001)
    "background?":"<background id>",
    "attributes": { "str","dex","int","wis","cha", "con?" },  // PRE-modifier base; `con` required for actor|nonheroic|beast, FORBIDDEN for droid
    "skills":     ["<skillKey>"],
    "feats":      [ { "feat":"<id>", "choice?":"<option>" } ],
    "talents":    [ { "talent":"<id>", "choice?":"<option>" } ],               // empty/absent for nonheroic|beast
    "forcePowers":["<id>"],                                                      // empty unless V2 entitlement exists; forbidden droid|beast
    "languages":  ["<bonus language id>"],
    "equipment":  [ { "item":"<id>", "qty":1 } ],
    "wallet":     0                                                             // exact final net credits, ≥0, 0 legal
  },
  "extension": {                                    // exactly one, iff subtype ∈ {droid, beast}
    "droid": { "degree","size","systems":{ "locomotion":{id}, "processor":{id}, "appendages":[{id}],
               "accessories":[{id,category}], "locomotionEnhancements":[…], "appendageEnhancements":[…] } },
    "beast": { …only fields V2 can consume; BLOCKED until a session slot exists… }
  },
  "provenance": { …free-form, not schema-compared… },
  "certification": { "status", "publishableAsReadyToPlay" }                      // publishable is CI-derived
}
```

*Why `subtype` and not `participantKind`+`rulesTrack`:* V2 already routes by it (`TemplateAdapter` `subtype`, `ProgressionSession(subtype)`, adapter registry). A second vocabulary needs a crosswalk — the thing you asked me to avoid. (`actor` reads oddly for "heroic organic"; the catalog can display "Heroic". Alternative if you prefer `heroic`: one trivial constant table inside the compiler — I do not recommend it.)

*Contradiction-proofing:* `if subtype=droid then {required extension.droid, class required, species forbidden, con forbidden, forcePowers maxItems 0}`; `if subtype ∈ {nonheroic,beast} then {class forbidden, talents maxItems 0}`; `if beast then {extension.beast required}`. A 4-way `oneOf` guarantees exactly one.

### E.3 What stays participant-specific (and why)

| Item | Where it lives | Justification |
|---|---|---|
| Droid `degree`, `size`, `systems` | `extension.droid` | Builder inputs that V2 cannot derive; everything else about the droid (mods, inhibitors, cost, grants, ledger, CON) is derived |
| Droid "no CON, five-score array" | schema `if/then` + V2 `DroidSubtypeAdapter` | LEG: genuine rule difference; schema only *forbids* `con`; V2 enforces |
| Droid no Force / class restriction | `DroidSubtypeAdapter` + `getPCDroidAllowedHeroicClasses` | already V2 |
| Nonheroic class model, entitlement counts, talents/Force suppression | `NonheroicSubtypeAdapter` + `NONHEROIC_CLASS_MODEL` | already V2; profile carries `class:"nonheroic"` and keeps the original `classRef` in provenance *[superseded → §R.4]* |
| Beast natural attacks/qualities | `extension.beast` | genuinely participant data, but **no V2 destination** yet (§I R3) |
| Custom-heroic vs stock-chassis vs standard-model droid | `extension.droid.mode` (`custom` only now) | keeps methods distinct; stock/standard stay in the stock importer / `droid-select-standard` flow |

### E.4 Registry + catalog

* **One** loader `GalacticProfileRegistry`: fetches the single generated `galactic-profiles.json` (+ generated `galactic-profiles.catalog.json`) once; validates with the single schema; rejects duplicate `profileId`; indexes by `profileId` and by `subtype`/`classKey`; clears the in-flight promise on rejection (fixes GP-014) and retries bounded.
* Catalog is **generated** from profiles by one script (not hand-maintained); card UI reads catalog only; compiler reads the full profile on Apply.
* Authoring may stay as two/three source files; they are **concatenated by the generator**, and the runtime reads one. (No runtime merge of two schemas.)

### E.5 Compiler (`GalacticProfileCompiler.compile(profile, {actor, session, settings})`)

Pure; no actor writes; no mutation of the live session. Returns:

```js
{ profileId, revision, subtype,
  draft:        { …normalized draftSelections for every key it can legally fill… },   // via the same normalizers V2 uses
  droidBuild?:  { …exact builder-shaped draft.droid, built from canonical defs… },
  equipment:    [{ itemId, qty, provenance }],       // draft-only ledger, deduped against class/species auto-grants
  wallet:       { mode:'finalNetBalance', credits },
  resolved:     [{ key, id, … }],                    // what V2 confirmed
  open:         [{ stepId, reason }],                // real unresolved entitlements → drive navigation
  blocked:      [{ code, path, detail }],            // fail-closed; any entry ⇒ Apply refused
  digest }                                           // hash of (profile revision + settings + registry versions) = cache key
```

Responsibilities, each **delegated** (no new rule logic):

| Concern | Delegate to (existing) |
|---|---|
| class id / skills / species / background resolution | `ClassesRegistry`, `SkillRegistry`, `SpeciesRegistry` (+ `species-publication-selection`), background builder |
| feat identity, choice, prerequisites incl. pending class auto-grants | `FeatChoiceResolver`, prerequisite authority, `getClassAutoGrants` |
| talent entitlement + tree/prereq | `TalentCadenceEngine`, talent prerequisite authority |
| Force entitlement | existing Force Training / entitlement computation |
| droid mods, inhibitors, default locomotion | `droid-trait-rules` |
| droid price/grants/status | `quoteDroidBuild` (`OK` and `totalCredits==budget`, else `blocked`) |
| droid installation validity | `buildInitialDroidInstallation` as a **dry check** (never persisted at compile) |
| class starting items/credits context | `ProgressionEconomyPlanBuilder` helpers |

*Abstraction justification (you asked for each):* the compiler is **required** because no existing module converts "intent" into normalized, validated draft+ledger without side effects (`TemplateAdapter` is the closest and has the defects in B). The registry **replaces** `TemplateRegistry`, not adds. No new finalizer, no new ledger, no new economy, no new droid builder.

### E.6 Session mapping

| Compiler output | Canonical home | Change needed |
|---|---|---|
| species/class/background/attributes/skills/feats/talents/languages/forcePowers | `draftSelections.*` **through `commitSelection`** | none (stop assigning directly) |
| droid build | `draftSelections.droid` in **exactly** the builder's shape (`isDroid, creationMode, droidDegree, droidSize, droidSystems(typed rows), droidCredits{base:1000,spent,remaining}, buildState{isFinalized…}`) | extract a pure `buildDroidDraftFromSelection()` (today only `DroidBuilderStep._syncDraftDroidIdentity` instance method writes it) |
| profile identity/revision/digest, player overrides, resolved refs | **one new** `session.profileApplication` (declared in the schema like the follower sub-schema, persisted with the session snapshot) | new slot (small) |
| equipment ledger + net wallet | inside `profileApplication` | read by the finalizer/economy builder |
| beast data | **blocked** until a session/mutation destination exists | |

`profileApplication = { profileId, revision, digest, appliedAt, equipment[], wallet, overrides:{[path]:…}, openAtApply:[…] }` — one object, not a parallel draft: the actual choices remain only in `draftSelections`.

### E.7 Finalization (one path, no second finalizer)

1. `ProgressionFinalizer.dryRun/finalize` unchanged in shape.
2. **Equipment:** `_compileMutationPlanBase` appends `profileApplication.equipment` to `add.items` through the same item-spec builders, **after** `_compileClassAutoGrantItems/_compileClassStarterEquipmentItems`, deduped by canonical item id + provenance (fixes the Jedi lightsaber collision without removing the class rule).
3. **Wallet:** in `ProgressionEconomyPlanBuilder.buildChargenSet`: if `profileApplication.wallet` exists → `set['system.credits'] = wallet.credits` (zero allowed), **skip** class credits, Wealth grant and `chargenStore` reconciliation; `_validateReadiness` accepts `startingCreditsResolved` from the profile. (Wealth history flag still recorded if the talent is present — owner ruling R4 first.)
4. **Droid:** `DroidSubtypeAdapter.contributeMutationPlan` already seeds the ledger once. The compiler must never call `applyInitialInstallationToPlan` itself.
5. **Parity:** preview = `dryRun().plan` hashed; final confirm recompiles and compares the plan digest to the previewed one (excluding timestamps/ids); mismatch ⇒ abort before `applyMutationPlan`.
6. **Rollback:** `ActorEngine.applyMutationPlan` already transactional with rollback attempt; surface its outcome (including *indeterminate*) to the UI.

### E.8 UX / transaction model (all 41 share it)

`Intro → Choose profile class → Choose archetype → Review → [Apply Profile] → resolve open steps → Summary → Confirm`

* Pick steps keep **focus/preview in step-local state**; committing a selection is a click. **No auto-select** on enter/render (fix `:359-405,447,502`).
* **Apply Profile** is the *only* compile+commit action: compile into a disposable draft → on `blocked.length===0` replace the session's profile-owned keys atomically, set `profileApplication`, recompute active steps **once**, persist **once**. Idempotent by `(profileId, revision, digest)`.
* `onStepExit`/Back/Close **never** apply (remove `_applyTemplateToSession` from exit).
* **Switching profile:** keys previously produced by the old profile *and not edited since* are replaced; keys the player edited (tracked in `overrides`) are preserved only if still legal under the new profile, else listed in a one-time "kept/dropped" summary. Deterministic: ownership map = `profileApplication`'s resolved paths.
* **Navigation:** `open[]` maps 1:1 to V2 step ids (`ActiveStepComputer`); jump uses the existing business-row path.
* **Persistence:** `profileApplication` rides the existing session snapshot; reopen restores without re-apply.
* **Perf:** registry loaded once (prewarmed on splash — already done); card render reads catalog only; one compile per Review (cache keyed by `digest`), reused for Review, open-step computation and Apply (fixes GP-012/GP-024); no per-card compendium fetches.

### E.9 Droid entry

The droid splash gets the **same three-stage picker** filtered by `subtype:'droid'`; it keeps `creationMode:'custom'`. The current `droid-select-standard` → `TemplateInitializer` path stays only for a genuine standard-model route (and must stop being labelled "Galactic Profile").

---

## F. Removal and consolidation inventory

Classes use your A–F scheme. **Nothing is deleted until cutover + regression coverage; reachability verified by grep this session.**

| Module | Class | Verified consumers | Action |
|---|---|---|---|
| `template-registry.js` | B | `template-initializer`, `template-selection-dialog`, `galactic-profile-step` | replace by `GalacticProfileRegistry`; delete after rerouting those 3 |
| `template-adapter.js` | B | `template-initializer`, `galactic-profile-step`, `tests/species-publication-selection.test.mjs`, `architecture-governance.js` (text/rule strings) | replace by compiler; port the species-publication test; update governance strings |
| `template-validator.js` | B | `template-initializer`, `galactic-profile-step` | delete (hardcoded 4/3 limits are wrong; V2 validators own this) |
| `template-traversal-policy.js` | B | `galactic-profile-step`, `chargen-shell`, `template-packaged-flow`, `template-override-handler` | replace locks with "unresolved entitlements"; keep only if still needed for step suppression, minus array-based locks |
| `template-initializer.js` | B | `intro-step.js:882` (`droid-select-standard`) | reroute droid entry; then delete |
| `dialogs/template-selection-dialog.js` | B | `template-initializer` only | delete with it |
| `template-packaged-flow.js`, `template-override-handler.js`, `template-observability.js`, `template-suggestion-context.js`, `content/packaged-build-registry.js` | **C?** | no importers found by file-name grep other than each other / `content-growth-validator` (for packaged-build-registry) | candidates; **re-verify (dynamic imports, hooks, docs) before deleting** |
| `apps/template-character-creator.js` (1,133 l) + `apps/chargen/chargen-templates.js` + `droid-template-choice-dialog.js` | **F** | `actor-sidebar-controls.js:81`, `directory-hooks.js:51`, `droid-template-choice-dialog.js:105` | **live competing creation path**; reroute entry points to the shell profile picker, then retire; needs your policy decision (§I Q9) |
| `data/character-templates.json`, `data/nonheroic-templates.json` | B | the above | delete after all consumers cut over; `scripts/maintenance/migrate-templates-to-ids.js`, `scripts/migration/template-schema-migrator.js` become dead → verify macro use (E) |
| Finalizer inline credit copy (`:1513-1521`, `_resolveFinalStartingCredits:2674`) | D | stripped at runtime by `phase4RemoveInlineEconomyKeys` | candidate for removal after confirming no non-economy path calls it |
| `chargenStore` flag producers/consumers | F | `summary-step.js:1772`, `ledger-service.js:29-37`, economy builder | do **not** remove; **bypass for profile sessions**; separate plan |

**Keep untouched:** `ProgressionSession` (+1 declared slot), `ProgressionFinalizer` shape, `ActorEngine`, `ProgressionSubtypeAdapterRegistry` and all adapters, `droid-trait-rules`, `droid-build-quote`, `droid-component-*`, `droid-initial-installation*`, `DroidBuilderStep` (extract one pure function), `FeatChoiceResolver`, `TalentCadenceEngine`, stock-droid importer/conversion, `species-publication-selection`, the splash preloader and mentor dialogue.

---

## G. Phased roadmap

*(No phase begins without your approval of §E. Every phase is independently revertible.)*

**P0 — Data contract & CI (no runtime change).** Base work on `feature/chargen-splash-prewarm`.
Files: new single `…/galactic-profiles.schema.json`; generator `tools/build-galactic-profiles.mjs` (concatenate sources → `galactic-profiles.json` + catalog); fix the droid **schema** (§R.2); authored droid selections are **not** edited — appendage `type` is supplied by the general resolver (§R.5); the `Energy Cell` id is proposed correction PC-1 and waits for approval *[superseded → §R.12]*; regenerate. Tests: schema valid 41/41; unique ids; subtype `if/then`; catalog==generated; recompute droid mods/quote/ledger (the scripts in `audit-scripts/`).
Accept: 41 valid; zero droid/organic cross-acceptance; droid quote 8/8 `OK`/1000. Rollback: delete new files.

**P1 — Registry + compiler (pure).** New `scripts/engine/progression/profile/galactic-profile-registry.js`, `…-compiler.js`; extract `buildDroidDraftFromSelection` from `DroidBuilderStep`. Delegates only (§E.5). Tests: each of 41 compiles → expected `resolved/open/blocked`; unresolved id ⇒ `blocked` (no fuzzy); parameterized feat → `{id, selectedChoice}`; droid compile never commits `con` or final scores; no actor/session mutation (frozen inputs); idempotent digest; retry-after-failed-fetch.
Accept: pure + deterministic; known-bad profiles (Jedi FT, Commanding Presence, Athletics, wolf/bear) are `blocked` with precise codes. Rollback: modules unused.

**P2 — Session/finalizer contract.** Files: `progression-session.js` (declare `profileApplication`), `progression-finalizer.js` (+ `mutation/` equipment contribution; readiness), `progression-economy-plan-builder.js` (final-balance wallet; Wealth interplay per ruling), `default-subtypes.js` (verify only). Tests: zero live actor writes before confirm; preview==final plan digest; wallet 0 and N exact; Wealth not double-added; Jedi lightsaber deduped; droid ledger once; rollback reported; persistence round-trip.
Accept: all green offline with a fake ActorEngine. Rollback: remove slot; finalizer paths are `if (profileApplication)` additive.

**P3 — Explicit picker + Apply.** Files: `galactic-profile-step.js` (focus≠commit, Apply, remove exit-apply), `intro-step.js` (droid → same picker, `custom`), `chargen-shell.js` (descriptor injection by `subtype`), templates `galactic-profile-*.hbs`. Tests: no auto-select; Back/Close no mutation; double-Apply idempotent; switch profile with/without overrides; close/resume; one render per click.
Accept per §6 of the handoff table. Rollback: feature flag on the intro button.

**P4 — Cutover & retirement.** Reroute `TemplateCharacterCreator` entry points (needs Q9); delete B-class modules and v2 JSON; update governance strings/tests. Tests: grep-gate that no import of deleted paths; full progression suite.
Rollback: git revert (v2 files retained in history).

**P5 — Beast extension & nonheroic certification.** Only after rulings R1–R3. Needs a beast session slot + mutation destination (currently actor flag). Tests per participant.

**P6 — Foundry v13 certification.** 41 profiles, one at a time; `publishableAsReadyToPlay` flips only from recorded CI+runtime evidence.

---

## H. Instructions for the implementing Claude session

1. Start from `origin/feature/chargen-splash-prewarm` (not `main`). Re-verify HEAD; read `CLAUDE.md` and `docs/audits/swse-rules-decisions-pending.md` first; never resolve a `DEFERRED_RULES_REVIEW` item.
2. Do P0 → P1 → P2 → P3 → P4 in order; one commit per phase; run the existing suite plus new tests; do not start a phase until the previous phase's acceptance is demonstrated.
3. **Never** write actor data, flags, credits or items before final confirmation; never call `applyInitialInstallationToPlan` from the compiler; never add a second finalizer, ledger or droid builder.
4. Resolve identities only through V2 registries. Unresolved ⇒ `blocked`. No name fallback, no first-match, no alias auto-pick. Parameterized feats/talents via the existing choice resolver.
5. Commit session state only through `commitSelection`. Declare (do not smuggle) `profileApplication`.
6. Commit the droid **pre-modifier** array only. Do not set `con`. Do not read profile hardware costs, grants or final scores.
7. Treat the wallet as a final balance incl. 0; fix the economy builder, not the data. Dedupe equipment against class/species auto-grants by canonical id.
8. Keep catalogs generated. Keep the 41 `profileId`s and authored choices unchanged except for verified, unambiguous data defects listed in §D; record each change with reason.
9. Do not delete any module marked C?/F before its consumers are rerouted and your own grep + tests pass.
10. At the end of each batch report per `CLAUDE.md` §8 (implemented / deferred / questions / tests / commits).

---

## I. Proposed rules-register entries and owner questions

*(Not written to the register, because you asked for no changes. Each would be `DEFERRED_RULES_REVIEW`, recommended ruling **none**.)*

| ID (proposed) | Domain | Feature | Confirmed by repo evidence | Unresolved |
|---|---|---|---|---|
| GP-RD-001 | Beast | Wolf "Pack Tactics (advantage on melee attack rolls…)" | wording is not SWSE vocabulary **[V]** | whether any SWSE-printed beast trait is intended; source/page |
| GP-RD-002 | Talent identity | Commanding Presence (`soldier_rifleman`) | 2 distinct talent docs: Force Unleashed Campaign Guide tree `4007…`, Galaxy at War tree `5964…` **[V]** | which publication is the intended talent (choosing between sources) |
| GP-RD-003 | Force | Jedi Guardian/Consular/Defender powers without Force Training | flag `FORCE_TRAINING_ENTITLEMENT_MISSING` ×3 **[V-data]**; rules text **[P]** | whether to add/swap the feat, or leave powers open for the player |
| GP-RD-004 | Credits | Wealth talent (`noble_aristocrat`) vs authored net wallet | finalizer adds `lineageLevel×5000` **[V]** | is the authored 465 inclusive or exclusive of the Wealth grant |
| GP-RD-005 | Skills | `laborer-worker` "Athletics" | no V2 skill key **[V]** | which SWSE skill(s) were intended |
| GP-RD-006 | Talent tree identity | `scout_sniper` Surveillance, `scout_engineer` Sizing Up | profile trees ≠ doc trees **[V]**; Surveillance source identity **[P]** | intended source/tree |
| GP-RD-007 | Talent access | `scout_pistoleer` Mechanized Rider (Mobile Scout) for Scout | tree absent from Scout `talent_trees` **[V]** | whether Scout may take it and under what source |

**Owner questions (decisions only you can make)**

* **Q1 (data fact):** are the 33 organic score sets pre- or post-species-modifier? (If post, V2 would double-apply species mods.)
* **Q2:** approve `subtype` (`actor|droid|nonheroic|beast`) as the single discriminator, or name another value set.
* **Q3:** *[superseded → §R.2/§R.4: nothing is deleted; derived blocks move to `evidence`, `classRef` is retained in provenance]*
* **Q4:** GP-RD-002…007 above.
* **Q5:** should the wallet's Wealth interplay (GP-RD-004) be "exact as authored" or "authored + Wealth"?
* **Q6:** approve the policy for retiring `TemplateCharacterCreator` (live sidebar/directory entry) and the v2 JSON (class F/E).
* **Q7:** approve beast profiles being **blocked** until a V2 beast draft destination and GP-RD-001 exist (nonheroics proceed).
* **Q8:** confirm implementation base = `feature/chargen-splash-prewarm`.

---

# PART 2 — REVISION 2: incorporation of the owner's decisions (governs wherever it differs from Part 1)

**Status:** read-only; nothing in `docflowGM/foundryvtt-swse` was changed except this document and its audit scripts (untracked, uncommitted). Evidence tags as in Part 1. Any rules text below is **repo-recorded** (pack `source`/`page` fields, `data/*.json`); I cannot read the printed books, so every book/page citation is "as recorded by the repository", not independently verified.

## R.0 How each decision is incorporated

| # | Owner decision | Where / how |
|---|---|---|
| 1 | `actor/droid/nonheroic/beast`; one registry/compiler/session/finalizer; **unknown subtype fails closed** | §R.1 (strict resolver, exact-id match, not `handles()`); §R.6 contract |
| 2 | One schema, subtype-specific validation, fix the 32 droid errors, preserve provenance, **don't erase mechanically significant fields** | §R.2 (`choices` / `evidence` / `provenance` split — redundant values move to `evidence`, they are not deleted) |
| 3 | Attribute basis: per-profile determination, block unresolved | §R.3 (33-row table; 12 moot, 1 explicit, 20 blocked) |
| 4 | Nonheroic/beast `classRef` conditional | §R.4 (proof chain; `classRef` is **retained** under `provenance.sourceRefs` and only normalized) |
| 5 | Droid hardware preserved; general resolver supplies `type:'hand'`; no per-profile workaround | §R.5 |
| 6 | Strict economy design | §R.7 |
| 7 | Rulings stay blocked; exact entries | §R.9 (GP-RD-001…011, recommendations supplied *because you asked*, none applied) |
| 8 | Legacy creator retirement is conditional | §R.8 gate list |
| 9 | Beast blocked, must not block others; investigate adapter | §R.1, §R.4, P5 |
| 10 | Base = `feature/chargen-splash-prewarm` | §R.10 |
| 11 | Updated plan + transferable report | this document; §R.11 regression plan |

## R.1 Adapter-boundary findings (new, all **[V]/[C]**)

1. **Fallback-to-actor is real.** `ProgressionSubtypeAdapterRegistry.resolveAdapter()` (`progression-subtype-adapter-registry.js:98-114`): an invalid string returns `this.adapters[0]`; an unknown subtype logs a warning and returns the **actor** adapter. `ProgressionSession`'s constructor (`progression-session.js:50`) calls it, so *any* mistyped subtype silently becomes an ordinary heroic actor session.
2. **`handles()` aliases are wider than the ids.** `NonheroicSubtypeAdapter.handles()` accepts `nonheroic | imported-statblock | standard`; `BeastSubtypeAdapter.handles()` accepts `beast | mount`. A profile with `subtype:'standard'` would therefore resolve to the nonheroic adapter. Profiles must match `adapter.subtypeId` **exactly**.
3. **Required hardening (additive, no behavior change for existing callers):** add `resolveAdapterStrict(subtype)` → exact `subtypeId` match or `null` (never `adapters[0]`, never `handles()`). The compiler and Apply use only the strict resolver; unknown ⇒ `blocked: UNKNOWN_SUBTYPE`. Migrating the other callers (session constructor) is a **separate, later** change because it can alter chargen behavior elsewhere.
4. **Beast readiness cannot block.** `BeastSubtypeAdapter.validateReadiness()` (`beast-subtype-adapter.js:212-229`): INT outside 1–2 only `swseLogger.warn`s ("Allow creation to proceed; will be corrected at finalization if needed") — **nothing corrects it**. Two further defects in the same function: it reads `session.beastContext.intelligence`, which `seedSession` copies from the **actor's** `abilities.int.base` (not the draft attribute), and `intelligence || 1` turns `0`/`undefined` into a passing `1`. The adapter's own header states the rule ("Intelligence 1-2"), so enforcing it is fixing an established V2 intent, not inventing a rule. **Requires your confirmation that this becomes blocking** (it changes V2 behavior for any beast session).
5. **Subtype is fixed at construction and derived from the actor, not the profile.** `chargen-shell.js:80-110` infers `beast` from `actor.flags.swse.beastData`, `nonheroic` from NPC profile flags / existing class items; `seedNonheroicSession` creates the implicit Nonheroic class **only when `actor.type === 'npc'`**; **nothing in progression writes `flags.swse.beastData`** (only a sheet-helper field list references it). Consequences: Apply must **never change the session subtype**; the picker offers only profiles whose `subtype` equals the session's resolved subtype (the existing filter at `galactic-profile-step.js:166-171`, tightened to exact equality); a beast profile cannot establish a beast session by itself → **blocked** until a V2 beast creation path exists (P5).

## R.2 Revised schema: one contract, three blocks

Nothing mechanically meaningful is deleted. Each profile has:

* **`choices`** — what the compiler turns into `draftSelections`. This is the only block runtime reads (plus `extension`).
* **`evidence`** — the original authored derived/redundant data, retained verbatim and **never read as authority**: droid `hardware` (budget/spent/lineItems/grants/quote status), `startingClassCredits` ledger, `degreeModifiers`/`sizeModifiers`/final `scores`, `behavioralRestrictions`, `expectedAutomaticClassFeatNames`, `staticLegality` booleans, alias/quarantined feat+talent candidates, `printedUnitPriceCredits`, `sourceTree` assertions, `legacyNotes`, per-ref `resolution`/`displayName`. CI uses it as **expected values** for regression tests (this is how "redundant" data keeps earning its place: the compiler recomputes and the test compares).
* **`provenance`** — free-form, not schema-compared: source files/commits, `legacyId`, **and the original classification** (`legacyClassification:{participantKind, rulesTrack, legacySubtype, legacyParticipantKind}`) and the **original source refs** (`sourceRefs:{class, species, background, …}` with pack/type/flags such as `isNonheroic`). The 33 original legacy records additionally remain untouched in `SWSE_Galactic_Profiles_Source_Archive.json`.

`subtype` is the primary discriminator and equals the V2 adapter id. The four legacy classification fields move to `provenance.legacyClassification`, so the source identity stays recoverable (decision 2).

**Droid schema fix (the 32 errors).** Root cause (confirmed): the droid schema was cloned from the organic one and retained (a) `provenance.sourceCommit` const = `b5e2a75…` (the droid records, authored against `c8c1c4b…`, can't match), (b) required `sourceFile`/`legacyId` strings (droids have `null`), (c) `startingPackage.budgetAccounting` const = `prePurchasedLegalByUserAssumption` (droids use a different, longer accounting label). Fix in the single schema: `provenance` is open, `budgetAccounting` is not a runtime key at all (the economy contract in §R.7 replaces it), the commit is a free string. A generated test asserts all 41 records validate and that **each record fails the schema for every other subtype** (so contradictions cannot slip in).

## R.3 Attribute basis — explicit per-profile determination (decision 3)

V2 facts **[C]**: the attribute step is point-buy (base 8, max 18, pool 25 by house-rule default, `attribute-step.js:18-33,130-133`) and stores **base** scores; species modifiers are applied by V2 afterwards; the droid adapter adds degree+size to `.racial` (so droids must be committed pre-modifier). Test applied: for each profile, whether the stored scores are consistent with being (a) base, or (b) already post-species (stored − V2 `abilityMods`), plus any authored statement.

Result: **MOOT 12 · EXPLICIT 1 · SUGGESTIVE 2 (conflicting) · UNRESOLVED 1 · UNDETERMINED 17.** The point-buy test alone is **not** discriminating (the pool is a house rule; rolls/arrays exist; 11 profiles share the multiset 8/10/12/12/14/16 regardless of species, which *favors* "base" but proves nothing). Two same-species profiles disagree (Duros `scoundrel_knuckledragger` suggests base; `scoundrel_brigand` suggests final), so the basis **varies per profile** and cannot be blanket-assigned.

Compiler rule: `attributes.basis ∈ {unresolved, base, final}` (`final` requires an approved transformation rule and is **not implemented** — blocked). `unresolved` + species with all-zero V2 mods ⇒ allowed (moot). `unresolved` + non-zero mods ⇒ **blocked `ATTRIBUTE_BASIS_UNRESOLVED`**. No score is ever rewritten.

| Profile | Species (V2 mods) | Stored str/dex/con/int/wis/cha | Evidence | Determination | Action |
|---|---|---|---|---|---|
| `jedi_guardian` | Mirialan (dex+2,cha-2) | 10/16/12/12/14/8 | only the post-reading fits a 25-pt buy, but 11 profiles share one array regardless of species (favors pre); no authored statement | **UNDETERMINED** | BLOCK until owner/author states basis |
| `jedi_consular` | Miraluka (dex-2,int+2) | 8/12/10/12/16/14 | not a ≤25 point-buy under either reading; no authored statement | **UNDETERMINED** | BLOCK until owner/author states basis |
| `jedi_defender` | Zabrak (none) | 14/12/16/10/12/8 | note says "Zabrak CON bonus"; V2 Zabrak abilityMods are all 0 | **UNRESOLVED (species-data conflict)** | BLOCK until owner/author states basis |
| `jedi_sentinel` | Miraluka (dex-2,int+2) | 10/14/12/12/16/12 | not a ≤25 point-buy under either reading; no authored statement | **UNDETERMINED** | BLOCK until owner/author states basis |
| `noble_diplomat` | Zeltron (wis-2,cha+2) | 8/12/10/14/12/16 | only the post-reading fits a 25-pt buy, but 11 profiles share one array regardless of species (favors pre); no authored statement | **UNDETERMINED** | BLOCK until owner/author states basis |
| `noble_leader` | Human (none) | 10/12/14/12/14/16 | V2 species ability mods are all 0 → pre == post | **MOOT** | may proceed (commit stored scores as base) |
| `noble_aristocrat` | Bothan (dex+2,con-2) | 8/10/12/16/12/14 | not a ≤25 point-buy under either reading; no authored statement | **UNDETERMINED** | BLOCK until owner/author states basis |
| `noble_duelist` | Zeltron (wis-2,cha+2) | 8/14/12/10/12/16 | only the post-reading fits a 25-pt buy, but 11 profiles share one array regardless of species (favors pre); no authored statement | **UNDETERMINED** | BLOCK until owner/author states basis |
| `soldier-guard` | Human (none) | 14/12/14/10/12/10 | V2 species ability mods are all 0 → pre == post | **MOOT** | may proceed (commit stored scores as base) |
| `scout-pathfinder` | Human (none) | 12/14/12/13/14/10 | V2 species ability mods are all 0 → pre == post | **MOOT** | may proceed (commit stored scores as base) |
| `laborer-worker` | Human (none) | 13/10/14/10/11/10 | V2 species ability mods are all 0 → pre == post | **MOOT** | may proceed (commit stored scores as base) |
| `beast-wolf` | Wolf (?) | 12/14/11/1/13/8 | Wolf/Bear have no species doc/mods in V2 packs | **UNDETERMINED** | BLOCK until owner/author states basis |
| `beast-bear` | Bear (?) | 16/10/13/2/12/8 | Wolf/Bear have no species doc/mods in V2 packs | **UNDETERMINED** | BLOCK until owner/author states basis |
| `nonheroic_worker` | Human (none) | 12/10/13/12/11/8 | V2 species ability mods are all 0 → pre == post | **MOOT** | may proceed (commit stored scores as base) |
| `nonheroic_trooper` | Human (none) | 13/12/12/10/11/8 | V2 species ability mods are all 0 → pre == post | **MOOT** | may proceed (commit stored scores as base) |
| `nonheroic_criminal` | Human (none) | 12/13/11/10/9/11 | V2 species ability mods are all 0 → pre == post | **MOOT** | may proceed (commit stored scores as base) |
| `nonheroic_merchant` | Human (none) | 8/10/10/13/12/13 | V2 species ability mods are all 0 → pre == post | **MOOT** | may proceed (commit stored scores as base) |
| `nonheroic_police` | Human (none) | 12/11/13/11/12/10 | V2 species ability mods are all 0 → pre == post | **MOOT** | may proceed (commit stored scores as base) |
| `scoundrel_pistoleer` | Human (none) | 10/16/12/14/12/8 | V2 species ability mods are all 0 → pre == post | **MOOT** | may proceed (commit stored scores as base) |
| `scoundrel_skill_monkey` | Bothan (dex+2,con-2) | 8/14/10/16/12/14 | not a ≤25 point-buy under either reading; no authored statement | **UNDETERMINED** | BLOCK until owner/author states basis |
| `scoundrel_knuckledragger` | Duros (dex+2,con-2,int+2) | 10/16/14/12/12/8 | note says "DEX 18"; stored DEX 16 + Duros +2 = 18 | **SUGGESTS-PRE** | BLOCK until owner/author states basis |
| `scoundrel_outlaw` | Twi'lek (wis-2,cha+2) | 8/14/12/12/10/16 | only the post-reading fits a 25-pt buy, but 11 profiles share one array regardless of species (favors pre); no authored statement | **UNDETERMINED** | BLOCK until owner/author states basis |
| `scoundrel_brigand` | Duros (dex+2,con-2,int+2) | 8/18/8/14/12/14 | note says "DEX 18"; stored DEX 18, Duros +2 would make 20 | **SUGGESTS-POST (conflicts with knuckledragger, same species)** | BLOCK until owner/author states basis |
| `scout_sniper` | Duros (dex+2,con-2,int+2) | 8/16/10/14/12/12 | only the post-reading fits a 25-pt buy, but 11 profiles share one array regardless of species (favors pre); no authored statement | **UNDETERMINED** | BLOCK until owner/author states basis |
| `scout_engineer` | Mon Calamari (con-2,int+2,wis+2) | 8/16/12/14/12/10 | only the post-reading fits a 25-pt buy, but 11 profiles share one array regardless of species (favors pre); no authored statement | **UNDETERMINED** | BLOCK until owner/author states basis |
| `scout_pistoleer` | Codru-Ji (none) | 8/16/14/12/12/10 | V2 species ability mods are all 0 → pre == post | **MOOT** | may proceed (commit stored scores as base) |
| `scout_survivalist` | Ithorian (dex-2,wis+2,cha+2) | 12/14/16/12/14/8 | not a ≤25 point-buy under either reading; no authored statement | **UNDETERMINED** | BLOCK until owner/author states basis |
| `scout_infiltrator` | Bothan (dex+2,con-2) | 8/16/12/14/12/10 | only the post-reading fits a 25-pt buy, but 11 profiles share one array regardless of species (favors pre); no authored statement | **UNDETERMINED** | BLOCK until owner/author states basis |
| `soldier_rifleman` | Houk (str+2,con+2,wis-2,cha-2) | 16/16/14/12/8/6 | not a ≤25 point-buy under either reading; no authored statement | **UNDETERMINED** | BLOCK until owner/author states basis |
| `soldier_gunner` | Human (none) | 14/16/14/12/10/8 | V2 species ability mods are all 0 → pre == post | **MOOT** | may proceed (commit stored scores as base) |
| `soldier_brawler` | Mantellian Savrip (str+4,dex-2,con+4,int-4,wis-4,cha-4) | 18/12/16/10/10/8 | archive note: "STR 22 (after +4 racial), CON 20 (after +4 racial)" vs stored 18/16 → stored scores are pre-species (author statement; base-array legality under V2 generation still unverified: point-buy cost 34) | **EXPLICIT-PRE** | may proceed once owner confirms the note |
| `soldier_tank` | Gen'Dai (con+4,wis-2,cha-2) | 12/14/16/10/12/8 | only the post-reading fits a 25-pt buy, but 11 profiles share one array regardless of species (favors pre); no authored statement | **UNDETERMINED** | BLOCK until owner/author states basis |
| `soldier_commando` | Sullustan (dex+2,con-2) | 12/16/12/12/10/8 | no authored statement | **UNDETERMINED** | BLOCK until owner/author states basis |


*Droids (8):* basis is **determined** — `preDegreeAndSizeScores` are the base; `scores` are cross-checks in `evidence` (verified equal to V2 for 8/8, §C.4).

## R.4 Nonheroic and beast class identity — proof, and what is retained (decision 4)

Proof chain that V2 already materializes a nonheroic class **[C]** (one link needs runtime):

1. `ClassesRegistry.getById/resolveModel` returns the **synthetic** model for any ref that satisfies `isNonheroicClassRef` (`classes-registry.js:111,124,144,167`; `nonheroic-class-model.js:63-83,85-156`): `id:'nonheroic'`, `isNonheroic:true`, d4 hit die, nonheroic BAB table, `trainedSkills:1`, 24 class skills, no talent trees, no Force Points, `bonus_feats` at level 1 and every 3rd level.
2. `ClassStep` commits that class via `normalizeClass({classId, sourceId, className, classData, system: classData.system})` (`class-step.js:497-517`), i.e. **with the full `system`**.
3. The finalizer emits the class item from `clazz.system` (`progression-finalizer.js:1308,1365-1378`) → `type:'class'` item carrying `system.isNonheroic:true`.
4. **[R]** the chargen class-item `system.level` for the synthetic model defaults to `0` unless overridden (`createNonheroicClassModel`: `level: … || 0`; `ClassStep` passes `totalNonheroicLevel`); whether chargen finalization normalizes it to 1 must be shown in Foundry (or in a finalizer unit test with a fake ActorEngine). **Open verification item V-NH-1.**

Why not simply keep the old reference: the legacy ids (`soldier-nonheroic-id`, `scout-nonheroic-id`, `laborer-nonheroic-id`, `beast-nonheroic-id`) exist in **no** class document, and `isNonheroicClassRef('soldier-nonheroic-id')` is **false** (it only matches a normalized name `nonheroic` or an object carrying `isNonheroic:true`). Only the five `Nonheroic` refs and the three/two refs that carry `isNonheroic:true` in their `sourceRef` resolve. So the legacy ids are not a working identity as bare strings.

**Existing defect that the compiler must not copy [C]:** `TemplateAdapter` commits `normalizeClass({classId, className})` with **no `system`** (`template-adapter.js:~163`), so for *every* profile — heroic included — the class item would be built from `system: {}` (`normalizeClass` defaults `system: raw.system || {}`). `ClassStep` is the correct pattern. **[R/S]** whether anything downstream re-resolves is unverified; the compiler will commit the registry model's `system` exactly as `ClassStep` does.

**Decision implemented in the contract:**
* `choices.class` for `nonheroic` **and** `beast` = the V2 canonical id `"nonheroic"` (resolved through `ClassesRegistry`, committed with full `system`).
* The original `classRef` object (id, name `"Soldier (Nonheroic)"`/`"Beast (Nonheroic)"`/`"Nonheroic"`, `isNonheroic`) is **kept** in `provenance.sourceRefs.class`; the "Soldier/Scout/Laborer" qualifier stays in `catalog.archetype/classKey`. V2 has a single nonheroic class model **[C]**, so the qualifier has no V2 mechanical effect; if you consider it mechanically intended, say so and it becomes a blocked question rather than a deletion.
* Deletion of any now-redundant reference is a **separate, later** step after V-NH-1 passes.

## R.5 Droid hardware: general resolver (decision 5)

All eight authored `droidSystems` stay byte-for-byte. **A general pure resolver** `resolveDroidSystemsSelection({ size, systems })` in `scripts/domain/droids/droid-draft-builder.js` (new; extracted from the inline defaults in `DroidBuilderStep:~143-176,218`):

* looks every id up in the canonical `DROID_SYSTEMS` (locomotion, processors, appendages, accessories[category], enhancements); unknown id ⇒ `blocked UNKNOWN_COMPONENT` (no guessing);
* emits **builder-shaped rows** — appendage rows get `type` from the canonical appendage definition after the same `hand-N → hand` normalization the quote already uses (`droid-build-quote.js:39`); slot ids (`hand-1/hand-2`) are preserved; display names come from the definitions;
* takes **no profile id and no per-profile switch**; any future custom droid (or a builder-produced selection) goes through the same function;
* is then passed through the **unchanged** authorities: `quoteDroidBuild` (must be `OK` and `totalCredits === ProgressionRules.getDroidConstructionCredits()`, the authored 1000 is `evidence` and is only *compared*) and `buildInitialDroidInstallation` as a **dry check** (never persisted at compile; `applyInitialInstallationToPlan` remains solely in `DroidSubtypeAdapter.contributeMutationPlan`).
* The compiler builds `draftSelections.droid = { isDroid, creationMode:'custom', droidDegree, droidSize, droidSystems(rows), droidCredits{base,spent,remaining,allowOverflow}, buildState }` where `spent/remaining` come from the quote, never from the authored ledger.
* `buildState` is seeded **provisional** (not finalized) so the droid builder appears as an *open* "confirm build" step (finalizer readiness blocks only `deferred && !finalized` or `mode:'finalized' && !isFinalized`, `progression-finalizer.js:906-915`). Whether Apply should auto-finalize is a UX decision for you (Q-UX1).
* Verified offline: with this single canonical `type` the real installation projection seeds 8–11 ledger records with 0 unresolved for all 8 droids (§C.4). `DroidBuilderStep` is refactored to call the same function **only** under a golden-output test (default state before == after); if that test cannot be made green, the builder is left alone and the equality test stays as a drift guard.

## R.6 THE profile-to-session contract (the decision that must be settled before coding)

**Principles:** (1) the profile is intent; V2 derives everything; (2) one atomic Apply into the one session; (3) nothing touches an actor before final confirmation; (4) persistence uses the **existing** snapshot; (5) fail closed.

### R.6.1 Where profile state lives (verified constraint)

`SessionStorage._compileSessionData/restoreIntoSession` persists **only** `draftSelections`, `visitedStepIds`, `invalidatedStepIds`, `completedStepIds`, `currentStepId`, `subtype`, and restore **drops any `draftSelections` key not already declared** (`session-storage.js:557-575,632-648`). Today's template state (`lockedNodes`, `isTemplateSession`, `templateId`, `profilePickerMode`, `profileSelection`, `templateReconciliation`, `droidContext`, `nonheroicContext`) is **not persisted** — so "close/resume" after a template apply already loses locks. Therefore:

> **`profileApplication` is declared as a `draftSelections` key** (schema-validated by `_validateSelection`, deep-cloned by the snapshot, restored by the existing loop). No second persistence mechanism, no `lockedNodes`. Picker UI state (focus, hover) is intentionally *not* persisted.

```text
draftSelections.profileApplication = null | {
  schema: 'swse-profile-application-v1',
  profileId, revision, subtype, digest,            // digest = hash(profile revision + settings + registry versions)
  appliedAt,
  owned: { '<draft path>': '<fingerprint of value the profile wrote>' },   // ownership map; drives switch/override rules
  economy: { walletMode:'finalNetBalance', walletCredits:<int>, walletResolved:true, wealthPolicy:'…',
             equipment:[{ itemId, qty, provenance }] },
  open: [ { stepId, reason } ],                    // snapshot for UI; recomputed from ActiveStepComputer on resume
  evidenceRef: profileId@revision                  // pointer only; evidence is NOT copied into the session
}
```
All actual choices (class, species, attributes, skills, feats, talents, languages, force powers, droid build) live **only** in their normal `draftSelections` keys — `profileApplication` is bookkeeping, not a shadow draft.

### R.6.2 State machine

| State | Entered by | Mutates | Notes |
|---|---|---|---|
| **Browse** | intro button | picker-local focus only | `profilePickerMode`; no auto-select on enter/render; catalog only |
| **Review** | explicit archetype click | nothing | one `compile()` (cached by digest) → preview; shows `resolved / open / blocked` |
| **Apply** | explicit **Apply Profile** click | `draftSelections.*` via `commitSelection`, `profileApplication`, active steps recomputed **once**, snapshot persisted **once** | atomic: compile to disposable draft → `blocked.length===0` required → single transaction. Same `(profileId,revision,digest)` re-Apply = no-op |
| **Resolve** | normal shell | normal step commits | `open[]` rows jump to V2 step ids; edits update nothing in `owned` (fingerprints compare later) |
| **Confirm** | Summary confirm | `dryRun` plan digest == final plan digest → `ActorEngine.applyMutationPlan` | the only actor write |
| Back/Close/step exit/render | — | **never** apply, never replace the session | removes `ProfileReviewStep.onStepExit` application |

### R.6.3 Switching and overrides (deterministic, no listeners)

On Apply of profile B over profile A: for each path in `A.owned`, if the current value's fingerprint still equals what A wrote ⇒ **replace** with B's value (or clear); if it **differs** ⇒ the player edited it ⇒ keep it **only if** the same V2 check B's compile would run accepts it, else drop and list it in a one-time "kept / dropped" summary. Paths A never owned (the player's own earlier choices, e.g. character name) are untouched. No `commitSelection` watcher is needed.

### R.6.4 Compile → session mapping (all via V2 owners)

| Compiler output | Session home | Owner of correctness |
|---|---|---|
| class (full registry model + `system`) | `draftSelections.class` | `ClassesRegistry`, `normalizeClass` (as `ClassStep`) |
| species (+ `speciesVariant`) | `species`, `pendingSpeciesContext` | `SpeciesRegistry`, `species-publication-selection` (SPECIES-RD-001) |
| attributes | `attributes` (**base**) | basis rule §R.3 |
| skills | `skills` | `SkillRegistry` keys |
| feats / talents (+ choice) | `feats`, `talents` | `FeatChoiceResolver`, prerequisite authority, `TalentCadenceEngine` |
| Force powers | `forcePowers` | existing Force entitlement |
| droid build | `droid` | §R.5 |
| equipment + wallet | `profileApplication.economy` | §R.7, read by finalizer/economy builder |
| (none) | `lockedNodes` | removed — steps are skipped only when `ActiveStepComputer` reports no unresolved entitlement |

### R.6.5 Failure / rollback / parity

Compile or Apply failure leaves the session byte-identical (disposable draft). Confirm: `dryRun().plan` is hashed at Review time and again at Confirm; mismatch ⇒ abort **before** `applyMutationPlan`. `ActorEngine.applyMutationPlan` is already transactional; its rollback outcome (including *indeterminate*) is surfaced as-is.

## R.7 Economy and equipment — strict design (decision 6)

**Verified current behavior [V/C]** that the design must replace for profile sessions only: `ProgressionEconomyPlanBuilder.buildChargenSet` writes `system.credits` **only if `startingCredits > 0`**; adds `lineageLevel×5000` for Wealth; consults actor-backed `chargenStore`; readiness requires `startingCreditsResolved` or `startingCredits>0` (`progression-finalizer.js:945`). **`SummaryStep._stageStartingCreditsForStore` writes `system.credits` and `flags.swse.chargenStore` to the actor through `ActorEngine.updateActor` before confirmation** (`summary-step.js:1768-1799`) — so "no actor credit mutation before final confirmation" requires the profile path to **not enter that store** (profile sessions disable `enterStore` for now; making chargen shopping draft-only is a separate project).

**Contract** (`profileApplication.economy`):

| Field | Meaning | Rule |
|---|---|---|
| `walletMode` | constant `finalNetBalance` | never derived, never "startingCredits" |
| `walletCredits` | integer ≥ 0, **0 is a valid resolved value** | |
| `walletResolved` | boolean | absent/false ⇒ **unresolved ⇒ compile blocked**; `0` + `true` ≠ unset |
| `wealthPolicy` | `none` \| `inclusive` \| `exclusive` | required **only** when the Wealth talent is among the compiled talents; `unspecified` ⇒ **blocked** (GP-RD-004). `inclusive`: authored balance already contains the Wealth grant → add 0; `exclusive`: finalizer adds the V2 Wealth grant exactly once. Wealth history flag is written once either way |
| `equipment[]` | `{itemId, qty, provenance}` | ids only; a ref with no id ⇒ blocked (see PC-1) |
| class starting credits, dice, purchase totals, printed prices | **`evidence`** | never read at runtime; CI recomputes and compares |

**Finalization wiring (additive, `if (profileApplication.economy)`):**
1. `buildChargenSet`: if `walletResolved` → `set['system.credits'] = walletCredits` (including 0); skip class credits, background credits, `chargenStore` reconciliation; Wealth per policy.
2. `_validateReadiness`: treat `walletResolved` as resolved credits.
3. `_compileMutationPlanBase`: append `equipment` to `add.items` through the existing item-spec path **after** `_compileClassAutoGrantItems` and `_compileClassStarterEquipmentItems`, deduped by canonical item id + provenance (Jedi lightsaber), with `flags.swse.progression.selectionKey:'galactic-profile'`; quantities honored; no price/purchase logic.
4. Droid: `add.items` for **external** gear only; integrated hardware never enters `add.items` (the ledger comes from the adapter). Duplicate-hardware guard test.
5. Zero actor writes before Confirm (asserted by a fake ActorEngine in tests).

**PC-1 (proposed data correction, needs your approval, not applied):** four droids author `Energy Cell` with `id:null`; exactly one exact-name doc exists (`tool-energy-cell`, present in both `equipment` and `equipment-tools` packs with the same `_id`). Adding `itemId` is an authoring correction, retaining the original name in `evidence`. Until approved those four droids compile as **blocked** (`ITEM_WITHOUT_ID`).

## R.8 Legacy creator retirement gate (decision 8)

`TemplateCharacterCreator` (1,133 lines) is live (`actor-sidebar-controls.js:81`, `directory-hooks.js:51`, `droid-template-choice-dialog.js:105`) and creates actors with `createActor` + `ActorEngine` calls **outside** `ProgressionSession`/`ProgressionFinalizer`, defaulting `credits` to 1000 (`:376`) and applying feats/talents directly. It, `chargen-templates.js`, `template-registry.js`, `template-adapter.js`, `template-validator.js`, `template-initializer.js`, `template-selection-dialog.js` and both v2 JSON files are retired **only when all** hold:

1. The three entry points open the shell profile picker (or ProgressionShell chargen) — verified by a test that clicks each and asserts a `ProgressionSession` exists and no `Actor.create`/`createActor` call precedes confirm.
2. Grep gate: zero imports of any retired path in `scripts/`, `tests/`, `system.json`, `index.js`, templates, styles, `architecture-governance.js` strings updated.
3. All 41 profiles' regression suite green; species-publication test ported.
4. Macro/global surfaces checked (E-class): `scripts/maintenance/migrate-templates-to-ids.js`, `scripts/migration/template-schema-migrator.js`, `window.SWSE`/macro references — asked of you before deletion.
5. Foundry v13 smoke: sidebar "Templates" and directory entry both behave.

Until then the old creator stays untouched, and **no new route is added that bypasses the session**.

## R.9 Exact ruling entries (decision 7) — `DEFERRED_RULES_REVIEW`, nothing applied

Format per `CLAUDE.md` §5. "Recommended ruling" is supplied **because you asked for one in this message**; it is a recommendation for your approval, **not** an applied change, and rests only on repository-recorded evidence (I could not read the printed books).

**GP-RD-001 — Wolf: "Pack Tactics (advantage on melee attack rolls if ally is within 5 squares)"**
Profiles: `beast-wolf`. Source: *none located* — the string exists only in `data/nonheroic-templates.json:265` (the v2 template); no pack, species trait, or other V2 data contains it. Confirmed: Wolf has no species document in `packs/species.db` or the species JSON data; no beast creation destination. Unresolved: whether any SWSE-printed trait is intended; "advantage" is not SWSE terminology. Options (source-supported): none. Recommendation: **keep blocked; remove the trait from the runtime contract; treat as unsourced**; author a replacement only from a cited SWSE source. Impact: `beast-wolf` (and `beast-bear` by extension, same unverified block).

**GP-RD-002 — Commanding Presence (talent identity)** — Profile `soldier_rifleman` (its profile `sourceTree` says "Mercenary"). Repo evidence: two talent docs: `438e13c99c7b53a6` tree **Mercenary**, *Force Unleashed Campaign Guide* p.28, **no prerequisites**; `d442508aa9d9bdf6` tree **Leadership**, *Galaxy at War* p.19, prerequisites **Born Leader + Tactical Savvy**. V2 Soldier `talent_trees` include **Mercenary**, not Leadership; the profile selects neither prerequisite. Options: A) `438e…` (Mercenary/FUCG); B) `d442…` (Leadership/GaW) — would require Born Leader + Tactical Savvy and Soldier tree access. Recommendation: **A**, because it is the only option consistent with the profile's own tree, Soldier's V2 tree list and its prerequisites. Needs your approval before the selection is pinned to an id.

**GP-RD-003 — Jedi Force powers without Force Training** — Profiles `jedi_guardian`, `jedi_consular`, `jedi_defender` (not `jedi_sentinel`, which has the feat). Repo evidence: V2 feat doc `9b7b869a86f39190` Force Training, *Saga Edition Core Rulebook* p.85: prerequisites **Force Sensitivity, trained in Use the Force**; adds **1 + Wisdom modifier** powers (min 1). Class auto-grants for Jedi (V2): Force Sensitivity, Weapon Proficiency (Lightsabers, Simple). Authored: guardian WIS 14 (+2) with 2 powers (Force Training would give 3 — also a count mismatch), consular WIS 16 (+3) with 4 (matches), defender WIS 12 (+1) with 2 (matches); selected feats are Weapon Finesse / Skill Focus (Use the Force) ×2. Options: (a) replace the chosen non-Force-Training feat with Force Training; (b) keep the feat and leave Force powers unselected for the player; (c) a different legal source of the entitlement (none located). Recommendation: **(b)** — it grants nothing the profile did not author and loses no authored selection; (a) changes an authored feat. Guardian's count mismatch is reported separately.

**GP-RD-004 — Wealth talent vs authored net wallet** — Profile `noble_aristocrat` (flag `WEALTH_CREDITS_EXACTLY_ONCE`). Evidence: authored wallet 465; legacy note "6,500 starting credits with Wealth talent"; Noble class `starting_credits` "3d4 x 400"; finalizer adds `lineageLevel × 5000` for Wealth. Options: `inclusive` (465 already reflects Wealth) / `exclusive` (finalizer adds 5000 on top). Recommendation: **`inclusive`** (preserves the authored exact balance, matches the project's "final net balance, don't re-add" ruling); needs your confirmation. Blocked until stated.

**GP-RD-005 — "Athletics"** — Profile `laborer-worker` (skills: Endurance, "Athletics"). Evidence: V2 skills pack has 19 skills and no Athletics; the legacy record's `Athletics` has no mapping. Options (source-supported): none. Recommendation: **none can be made without inventing**; owner states which V2 skill (or removes the entry). Blocked.

**GP-RD-006 — Surveillance (Spy tree) and Sizing Up (Espionage tree) tree assertions** — Profiles `scout_sniper`, `scout_engineer`. Evidence: unique talent docs — Surveillance `f23b63464e0aeff7`, tree **Spy**, FUCG p.28, prereq trained Perception (profile *has* Perception); Sizing Up `95579a44ff466f19`, tree **Espionage**, *Galaxy of Intrigue* p.23, no prereq. Profile asserted trees "Reconnaissance"/"Versatility" differ. Scout's V2 tree list contains Spy, Reconnaissance, Surveillance, Versatility, Espionage. Options: (a) resolve by the unique talent doc and ignore the asserted tree; (b) owner intended a different talent. Recommendation: **(a)** — the identities are unambiguous (one doc each); the asserted tree is derived data and is retained only as `evidence`. Needs approval because it overrides an authored assertion.

**GP-RD-007 — Mechanized Rider and Scout tree access** — Profile `scout_pistoleer`. Evidence: doc `93b73db64423a7a3`, tree **Mobile Scout**, *Unknown Regions* p.22, prerequisites trained Pilot **and** Ride (profile has both); V2 Scout `talent_trees` **does not list Mobile Scout**; V2 prerequisite engine not executed. Options: (a) another legal Scout-tree talent chosen by the owner; (b) evidence that Scout may use Mobile Scout (e.g. a V2 access rule I did not find). Recommendation: **none without the book text**; blocked until the owner rules.

**GP-RD-008 — Zabrak ability modifiers** — Profile `jedi_defender`. Evidence: V2 Zabrak species `abilityMods` all 0 (source Core); legacy archive note says "Zabrak CON bonus makes this an excellent tank" (stored CON 16). Unresolved: whether V2 species data or the note is right; affects attribute basis. Options: A) V2 data authoritative; B) V2 species data is incomplete (separate species-register matter). Recommendation: **A pending a SPECIES-RD entry**; do not edit species data here.

**GP-RD-009 — Attribute basis per profile (authoring fact, not a rules ruling)** — the 20 profiles in §R.3 that are UNDETERMINED/UNRESOLVED/SUGGESTIVE, plus `beast-wolf/bear` (no species mods). Owner states `base` or `final` per profile. Recommendation: none.

**GP-RD-010 — Beast creation authority** — `beast-wolf`, `beast-bear`. Evidence: no species docs, no beast session slot, nothing writes `flags.swse.beastData`; `BeastSubtypeAdapter` rules (INT 1–2, d8 HP, beast BAB, no talents/starting feats, beast skill list) exist in code. Unresolved: which source defines Wolf/Bear stat blocks. Recommendation: **blocked until sourced**.

**GP-RD-011 — Beast readiness becomes blocking** — see §R.1(4). Approving that INT outside 1–2 must block finalization.

## R.10 Branch authority

Implementation base **`feature/chargen-splash-prewarm`**. First action of every phase: `git fetch`, verify HEAD, compare to the last recorded SHA (`9de84a4…` at this audit), read `CLAUDE.md` and the rules register, and stop if HEAD moved in a file the phase touches.

## R.11 Regression plan (offline unless marked [R])

| Suite (new file) | Assertions |
|---|---|
| `gp-v3-schema.test.mjs` | all 41 valid vs the single schema; each record rejected by the other 3 subtype branches; unique ids; catalog == generator output; evidence block present; no `con` on droid, `con` on others |
| `gp-v3-subtype-strict.test.mjs` | unknown/typo/`standard`/`mount`/`imported-statblock` ⇒ `UNKNOWN_SUBTYPE`; registry strict resolver returns `null`, never actor; session subtype unchanged by Apply |
| `gp-v3-beast-readiness.test.mjs` | INT 1,2 pass; 0, 3, undefined, draft≠actor ⇒ **blocks** (xfail until approved GP-RD-011) |
| `gp-v3-attribute-basis.test.mjs` | the §R.3 table as fixture: moot ⇒ proceed; unresolved+nonzero mods ⇒ blocked; `final` ⇒ blocked; no number ever rewritten; droid commits pre-modifier only (con absent) |
| `gp-v3-class-identity.test.mjs` | heroic/droid class committed with full `system` (== ClassStep output); nonheroic/beast ⇒ synthetic model with `isNonheroic`; level materialization (V-NH-1) |
| `gp-v3-droid-resolver.test.mjs` | resolver output has `type:'hand'`; unknown ids blocked; builder-default golden equality; all 8: `quoteDroidBuild` OK == budget, installation `seeded`, 0 unresolved, ledger records stable-id idempotent; hardware never in `add.items`; authored ledger == recomputed |
| `gp-v3-references.test.mjs` | every feat/talent/item/skill/species/background id resolves to exactly one V2 doc; parameterized feats ⇒ `{id, selectedChoice}`; null id / ambiguous / absent ⇒ blocked with code; no fuzzy fallback |
| `gp-v3-economy.test.mjs` | wallet 0 resolved vs unset; Wealth policy matrix; no double credit; Jedi lightsaber dedupe; quantities; zero actor writes before confirm; enterStore disabled in profile session; dryRun == final digest |
| `gp-v3-session-contract.test.mjs` | no auto-select; Back/Close/exit/render don't apply; Apply atomic and idempotent; failed compile leaves session byte-identical; switch profile with/without edits; close → resume restores via snapshot (draft key survives, `droidContext` re-derived); ownership fingerprints |
| `gp-v3-finalize.test.mjs` | fake `ActorEngine`: single `applyMutationPlan`; rollback reported incl. indeterminate; parity |
| Foundry v13 [R] | each of the 41: create actor, compare stats/inventory/ledger/wallet to plan; sidebar and directory entry points; the species-publication path |

Existing tests that must stay green: `species-publication-selection`, `chargen-splash-prewarm`, `mentor-atomic-utterances`, `progression-intro-datapad-containment`, droid quote/installation suites.

## R.12 Revised phased roadmap (one commit per phase, tests green before the next)

| Phase | Scope | Exit criteria | Rollback |
|---|---|---|---|
| **P0** Contract + CI (no runtime) | single schema + generator; droid schema fix; `evidence`/`provenance` relocation script (lossless — verified by round-trip); attribute-basis fixture; ruling entries appended to the register (after your approval); PC-1 only if approved | 41 valid; losslessness test (every original authored field reachable); droid quote 8/8 | revert commit; originals untouched |
| **P1** Strict resolver + registry + compiler (pure) | `resolveAdapterStrict`; `galactic-profile-registry.js`; `-compiler.js`; `droid-draft-builder.js`; reference resolution | all P1 suites green; known-bad profiles blocked with exact codes; no mutation of inputs | modules unused |
| **P2** Session + finalizer contract | declare `draftSelections.profileApplication`; economy builder branch; item contribution; readiness; Summary `enterStore` gate for profile sessions | economy + finalize suites green; zero pre-confirm writes | additive `if (profileApplication)` branches |
| **P3** Picker + Apply UX | no auto-select; Apply; remove exit-apply; droid entry via same picker (`custom`); exact-subtype filter | session-contract suite; one render per click | feature flag on intro button |
| **P4** Cutover + retirement | §R.8 gate | all gates green | git revert |
| **P5** Beast + nonheroic completion | V-NH-1; beast sourcing (GP-RD-001/010) and readiness (GP-RD-011) | nonheroic 8 certified offline; beast blocked or certified | n/a |
| **P6** Foundry v13 certification | per-profile | `publishableAsReadyToPlay` flipped individually from evidence | n/a |

## R.13 Open questions for you (new or changed)

* **Q-UX1** Should Apply seed the droid build as provisional (player taps "confirm build") or auto-finalize?
* **Q-UX2** Profile sessions skip the chargen store (it writes credits to the actor pre-confirm). Acceptable for now?
* **Q-A** Approve GP-RD-011 (beast INT becomes blocking) and the strict-resolver addition.
* **Q-B** Approve GP-RD-002/003/004/006 recommendations, or give your own rulings; state GP-RD-005/007/008/009/010.
* **Q-C** Approve PC-1 (Energy Cell id).
* **Q-D** For the 12 MOOT, 1 EXPLICIT profiles, may they proceed once the schema/compiler exist while the other 20 stay blocked?
* **Q-E** Permission to commit and push this document (currently an uncommitted file in the working tree) to the branch of your choice so it survives this container.

---

# PART 3 — Owner review dispositions and contract corrections (recorded at implementation start)

Recorded from the project owner's review of PR #1152. Where Part 3 differs from Part 2, **Part 3 governs**. These are owner dispositions; I could not independently read the printed books (not available in the build environment), so each is recorded as *owner-attested*.

| Ruling | Disposition | Implementation effect |
|---|---|---|
| GP-RD-001 Wolf Pack Tactics | **Blocked** | `beast-wolf` carries `rulingBlocks: [GP-RD-001, GP-RD-010]`; trait not applied |
| GP-RD-002 Commanding Presence | **Approved: Mercenary-tree talent** (`438e13c99c7b53a6`, FUCG p.28), subject to V2 entitlement validation | compiler pins `soldier_rifleman`'s talent to this id; V2 prerequisite/access still decides legality |
| GP-RD-003 Jedi Force Training | **Blocked pending legal choices.** Preserve authored feats and powers as intent; do **not** replace feats or silently drop powers | compiler withholds Force powers from the draft until Force Training + slots are legally present; keeps them as deferred intent and reports an open step |
| GP-RD-004 Wealth | **Approved: 465 is the exact final balance (net, post-grant)** | `wallet.mode = exactFinalBalance`; no Wealth is ever added to it |
| GP-RD-005 Athletics | **Blocked** (selection needed) | `laborer-worker.choices.unresolved` |
| GP-RD-006 Surveillance / Sizing Up | **Approved: published talent identities** (Spy; Espionage) | authored `sourceTree` is evidence only; resolve by talent document |
| GP-RD-007 Mechanized Rider | **Revised:** *The Unknown Regions* p.22 makes Mobile Scout a **Scout** talent tree; the profile choice is legal; the gap is V2 class→tree registration | V2 Scout tree-access data corrected (see P5 commit); profile selection unchanged |
| GP-RD-008 Zabrak | **Approved: Core Zabrak have no ability-score adjustments**; the legacy CON-bonus note is incorrect | note kept only in `evidence`; `jedi_defender` basis is moot |
| GP-RD-009 Attribute basis | Unresolved profiles stay blocked; no blanket conversion | compiler `ATTRIBUTE_BASIS_UNRESOLVED` |
| GP-RD-010 Beast creation | **Blocked** until sources and a V2 draft/finalization path exist | beast profiles blocked, infrastructure improved |
| GP-RD-011 Beast readiness | **Approved: strict blocking, using the draft** | `BeastSubtypeAdapter.validateReadiness` throws; reads draft INT |

**Contract corrections (all three adopted):**
1. **Plan parity** is validated *after* the player resolves open choices: the authoritative preview is computed at final confirmation, then the plan that is applied must equal that previewed plan. A pre-resolution preview is informational only.
2. **`wallet` has one meaning** — the exact final balance. A balance that excludes a grant would need a *different, explicitly named* accounting mode; none exists.
3. **Subtype is established before the picker opens.** The creation lane (ordinary actor, custom droid, nonheroic, beast) sets the session subtype first; the picker offers only exact-subtype profiles. A new ordinary actor session cannot select a droid profile.
