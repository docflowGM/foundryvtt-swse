# Reconciliation V2 - House-Rule Coverage Audit (Phase 6 addendum)

Scope: feat and talent house rules, automatic grants, and how reconciliation, grants and progression treat them. Date 2026-11-12. Evidence tags: **[S]** static inspection, **[T]** executed test (`tests/reconciliation-house-rules.test.mjs`, 18 checks), **[F]** needs Foundry V13.

Constraints honoured: one canonical authority per concern; no new rules engine; no migration; no shims; no silent repair or deletion; no rules ruling made (open questions are in RECON-005 and the existing RECON-001..004).

## 1. Canonical authorities found

| Concern | Authority | Notes |
|---|---|---|
| Reading a setting | `HouseRuleService` (SSOT) | `FeatRulesAdapter` is the family adapter for feat/talent rules |
| Talent cadence | `TalentCadenceEngine` (+ `TalentSlotCalculator` for L1 slots) | sole reader of `talentEveryLevel`, `talentEveryLevelExtraL1` |
| Automatic feat/talent grants | `HouseRuleFeatGrants` (`houserule-feat-grants.js`) | creates items through `ActorEngine.createEmbeddedDocuments` |
| What a level-up owes | `buildLevelUpEntitlementManifest` | heroic cadence via `TalentCadenceEngine`, class choices from ClassModel |
| What reconciliation expects | `ProgressionReconciler` + `ProgressionEntitlementCalculator` | ClassModel table; heroic cadence suppressed when class slots exist |

## 2. Setting-by-setting matrix

| Setting (default) | Reader | Kind | Authoritative implementation | Materializes an item? | Chargen | Level-up | Reconciliation (before -> after) | Manual build | Enabled/disabled after creation | Open ambiguity |
|---|---|---|---|---|---|---|---|---|---|---|
| `talentEveryLevel` (off) | `FeatRulesAdapter.talentEveryLevelEnabled` -> `TalentCadenceEngine` | replaces RAW cadence | `grantsHeroicTalent`, `grantsClassTalent`, `calculateL1TalentCount` | no (selections) | yes (L1 count) | yes via manifest `heroicTalent` (every level) | not modelled -> **unchanged for levels >= 2, informational note only** | same as progression | memo key now includes it; no item changes | **RECON-005**: class table talents are odd-level only and not house-rule aware while `grantsClassTalent` says every class level; manifest owes heroic AND class talents |
| `talentEveryLevelExtraL1` (**on**, only meaningful with `talentEveryLevel`) | `FeatRulesAdapter.talentExtraAtLevel1` | additional CHOICE entitlement | `TalentSlotCalculator.calculateL1Slots` (source `houserule:talentEveryLevelExtraL1`) | no | yes | n/a (L1 only) | not modelled -> **own entitlement `slot:houserule-talent-extra-l1`**, only alongside the ordinary class talent slot it is extra to; filled by a heroic-tagged talent; never consumes the class talent [T 2,3] | same | recomputed from current settings; signature in memo | none beyond RECON-005 |
| `talentDoubleLevels` (off) | none | claimed "wired" in `houserules-manifest.js` | **none: no engine consumer** [S] | - | no | no | **informational note** "enabled but unimplemented"; never a finding [T 4,17] | - | - | RECON-005 |
| `weaponFinesseDefault`, `pointBlankShotDefault`, `powerAttackDefault`, `preciseShotDefault`, `dodgeDefault` (off) | `FeatRulesAdapter.*DefaultEnabled` | AUTOMATIC grant of one specific feat (not a free selection) | `HouseRuleFeatGrants` (createActor, rule switched on, now also a silent world-load pass) | yes | actor created first, so the feat exists before chargen | owned item | free feat counted as an ordinary feat / unattributed -> **house-rule grant, outside slot accounting**; absent grant -> own finding `houserule-grant:<setting>` [T 5,6] | same | disabled later: explicit marker keeps it identifiable, never extra, never deleted [T 8]; enabled later: expected-grant finding + service grants it [T 9,11] | none |
| `armoredDefenseForAll` (off) | `HouseRuleService.getBoolean` (direct; table now centralizes) | AUTOMATIC grant of the talent Armored Defense | same service | yes | same | same | same as above | same | same | prerequisite checker lists the talent among "feats" (cosmetic); the Reflex effect itself has no other consumer |
| `multiclassBonusChoice` (`single_feat`) | `ProgressionRules.getMulticlassBonusChoice` | claimed variants single_skill / feat_or_skill / all_feats | **no caller of the getter** [S]. Progression actually reads the separate boolean `multiclassExtraStartingFeats` (registered in `core/settings.js`, absent from the manifest) | - | - | manifest/finalizer use the boolean | variant -> **informational note**; no finding | - | - | two settings describe the same intent; owner to choose the surviving one |
| `multiclassExtraStartingFeats` (off), `multiclassEnhancedEnabled` | `ProgressionRules` | changes multiclass starting feat quantity | manifest `baseMulticlassStartingFeatRequired`, finalizer | yes | - | yes | multiclass starting feats are automatic items, excluded from slot accounting (unchanged) | - | in memo signature | - |
| `talentTreeRestriction`, `classTreeOverrides`, `enableDarkSideTreeAccess`, `forceSensitiveJediOnly`, `blockDeflectTalents`, `groupDeflectBlock` | `ProgressionRules` / adapters | eligibility/presentation only | various | no | - | - | no quantity impact; included in the signature so cached results cannot go stale | - | - | - |
| `retrainingEnabled`, `allowHumanFollowerNormalBonus` | `HouseRuleService` | swap / follower rules | various | - | - | - | no entitlement impact; in signature | - | - | - |

## 3. Defects found in the house-rule path and their disposition

| ID | Finding | Evidence | Disposition |
|---|---|---|---|
| HR-1 | **Two live materializers** granted the same items: `HouseRuleFeatGrants` and a second one in `feat-housekeeping-runtime-patches.js` (called from `index.js:221`). Each raced the other; whichever lost saw the item as "already owned" and could pop a spurious **replacement dialog** on a brand-new actor or at world load | [S] | **Fixed**: the patch file's materializer is removed; `HouseRuleFeatGrants` is the only creator and gained a silent world-load pass (`reconcileActorGrants`) |
| HR-2 | The service wrote **no provenance** on grants (the patch path wrote `houseRuleGranted`/`houseRuleSetting`; the service did not) | [S] | **Fixed for new grants** (`system.acquisition {source:'house-rule', houseRuleKey, grantKind, grantId, countsAgainstSlot:false}` + the existing `houseRuleGranted`/`houseRuleSetting`/`canonicalGrantId` markers). Existing items are not rewritten |
| HR-3 | Replacement offered on every call path including world load; replacement items carried no provenance, so a replacement looked like an ordinary selection | [S] | **Fixed**: offered only when a rule is switched on, once per actor+setting; replacement carries `grantKind: 'replacement'` identity and consumes no ordinary slot [T 12] |
| HR-4 | The service's `updateSetting` handler ran on every client | [S] | **Fixed**: GM client only |
| HR-5 | The setting -> item table existed three times | [S] | **Fixed**: one table `house-rule-grant-table.js` (the prerequisite checker's virtual list is left as is) |
| HR-6 | Reconciliation memo key included only the two cadence settings | [S] | **Fixed**: one `getFeatTalentRulesSignature()` over every identified feat/talent rule key; `invalidateReconciliationForRuleChange()` clears reports and refreshes open sheets on any such setting change [T 10] |
| HR-7 | Cadence disagreement between chargen, level-up manifest, ClassModel and the reconciler | [S] | **Not decided** - RECON-005; reconciliation emits an informational note, never a finding |
| HR-8 | `talentDoubleLevels` and `multiclassBonusChoice` advertised as `wired` with no consumer | [S] | **Documented**; tripwire test fails if a consumer appears so the audit is redone [T 17] |

## 4. Classification used by reconciliation (reusing the existing evidence model)

| Source | How recognized | Ordinary slot |
|---|---|---|
| General / class progression | certified or stamped items, ClassModel slots | consumes the matching entitlement |
| House-rule choice (extra L1 talent) | `slot:houserule-talent-extra-l1` from `TalentCadenceEngine` | only its own entitlement |
| House-rule automatic grant | explicit marker (`houseRuleGranted`, `acquisition.source === 'house-rule'`) -> `house-rule`; unmarked item that is the canonical feat/talent of a CURRENTLY ENABLED rule and has no progression/acquisition stamps -> `house-rule-inferred` | none |
| House-rule replacement | `grantKind: 'replacement'` marker | none |
| Authorized GM grant | existing `external` evidence | none |
| Manual acquisition | unstamped, unmarked -> unattributed -> only ever `unverifiable`, never extra | decided by evidence; never assumed illegal |

An ordinary stamped Dodge keeps its ordinary meaning even when `dodgeDefault` is on (it consumed a real selection). Inference never overrides stamps.

## 5. Coverage of the 20 required test topics

1 RAW disabled [T 1] - 2 talentEveryLevel [T 2] - 3 extra L1 on/off [T 2,3] - 4 talentDoubleLevels [T 4,17] - 5 each automatic feat [T 5,6] - 6 armoredDefenseForAll [T 5,6] - 7 multiclass variants [T 4,17] - 8 manual with grants [T 16] - 9 progression-built with grants [T 16] - 10 previously owned feat + replacement opportunity [T 12] - 11 accepted/declined [T 12] - 12 enabled after creation [T 9,11] - 13 disabled after creation [T 8] - 14 setting changed while cached [T 10] - 15 grants consume no ordinary slot [T 6,7] - 16 ordinary missing selection still identifiable [T 1,6] - 17 Resolve opens the right step, no level-up [T 14] - 18 Resolve twice [T 13,14] - 19 Ignore persistence/restore [T 15] - 20 no false `!` [T 16].

Test kinds: **unit** - table, evidence, findings, signature; **integration with stubs** - real HouseRuleService/FeatRulesAdapter/TalentCadenceEngine with a stub `game.settings`, real `HouseRuleFeatGrants` with `ActorEngine.createEmbeddedDocuments` and the registries stubbed, real reconciler/resolvers; **Foundry runtime** - none performed.

## 6. Foundry V13 runtime checks still required [F]

1. Enable a default-feat rule with the GM online and offline; new actor, existing actors, and world reload each end with exactly one granted item carrying `system.acquisition.source === 'house-rule'` and no replacement dialog except on switch-on for an owner of the item.
2. Accept and decline a replacement; reopen the sheet; no `!` for either; the replacement is not offered again.
3. Toggle `talentEveryLevel` / `talentEveryLevelExtraL1` with a sheet open: header `!` and overlay refresh without reopening.
4. Chargen with the extra-L1 rule: the two L1 talents leave no false finding; skipping one produces the house-rule row and Choose opens the right step without leveling.
5. Disable a granting rule after creation: items remain, no `!`.
6. Two clients, both able to see the setting change: only the GM client grants.
