# Rules questions surfaced by the audit (for the owner's register)

Generated at `f734b4d`. The audit **decides none of these** and does **not** edit `docs/audits/swse-rules-decisions-pending.md` (append-only; partly machine-parsed). Items under "Not yet in the register" need an owner-approved, append-only entry using the register's field layout (Decision ID, rules domain, feature, source, evidence, confirmed behavior, unresolved question, options, recommended ruling: none, implementation impact, status `DEFERRED_RULES_REVIEW`, decision authority, resolution). Source pages and evidence for each item are in the cited domain contract.

Totals: 90 items · already referenced in the register 59 · not yet in the register 31.

## Not yet in the register

| Domain | From | Question (as recorded by the domain contract) |
|---|---|---|
| `abilities-effects` | F-ABL-005 | DerivedOverrideEngine computes HALF_LEVEL and ability mod independently of actor-core helpers — _getHalfLevel uses floor(system.level/2); level-split provides getHeroicHalfLevel/getEffectiveHalfLevel. _getAbilityMod recomputes from attributes as fallback. HALF_LEVEL is referenced only by orphan phase-3-feat-definitions.js and the contract, so no live feature uses it. |
| `combat` | deferredRules (ref none found — new entry required (DEFERRED_RULES_REVIEW)) | House-rule (enhanced massive damage) damage-threshold formula: DerivedCalculator adds size twice and keeps feat/Will-base/flat adjustments; ThresholdEngine uses fort+level+size only. Which is intended? |
| `combat` | deferredRules (ref none (UNVERIFIED, report only)) | Whether poison damage must be excluded from the half-heroic-level bonus (not in ELEMENTAL_HALF_LEVEL_EXCLUSION_KEYS); not traced |
| `combat` | F-CMB-003 | House-rule damage threshold computed independently by DerivedCalculator and ThresholdEngine with different formulas — RAW mode: ThresholdEngine reads system.derived.damageThreshold (single authority). With enableEnhancedMassiveDamage+modifyDamageThresholdFormula, DerivedCalculator stores base(incl. size, feat Will-base, flat/modifier adjustments)+level+size again, while ThresholdEngine.calculateDamageThreshold (used by evaluateThreshold on the live ActorEngine.applyDamage path) returns fort+leve |
| `customization` | deferredRules (ref none found — candidate DEFERRED_RULES_REVIEW) | Whether removing an item upgrade refunds credits (droid removal refunds resale; item removal does not) |
| `customization` | F-CUS-002 | Two live installed-upgrade representations; inconsistent removal refunds — UpgradeService writes system.installedUpgrades (paid via TE; removal writes without refund); workbench writes flags.swse.*Upgrades/gearMods and flags.foundryvtt-swse.customization via TE. Readers of one do not see the other (TX-02, still open). Droid removal refunds resale through DroidCustomizationEngine. |
| `droids` | deferredRules (ref none (new; to be registered by owner)) | Whether a constructed droid requires an Armor component and at least one appendage for readiness (code paths disagree) |
| `droids` | deferredRules (ref docs/audits/droids/droid-component-mechanical-certification-closeout.md) | 23 component source HOLDs |
| `droids` | F-DRD-001 | Two droid readiness validators disagree on armor — DroidValidationEngine (sheet readiness and issues list) requires locomotion, >=1 appendage, processor and armor; the chargen droid builder requires locomotion, processor, >=1 appendage and resolved quotes but not armor; reconciliation notes the Store path does not require armor. A droid built legally in chargen/store shows 'not ready' on its sheet. |
| `feats` | deferredRules (ref NONE — new entry required (owner)) | Confident Success (Rebellion Era Campaign Guide p.31): is "FP gained upon reaching current level" the same as the system FP maximum? Second cap not enforced. |
| `feats` | deferredRules (ref NONE — owner decision; may not be a rules question) | Meaning of a feat "per day" limit in a VTT (campaign day vs real-world day) for skill-feat daily uses |
| `feats` | F-FEA-007 | Skill-feat daily uses keyed on real-world UTC date — todayKey() = new Date().toISOString().slice(0,10); Force Point receipts record game.time.worldTime for once-per-day contracts (actor-engine.js spendForcePoints). Two incompatible "day" clocks. Note the module register function is never called, so only directly imported helpers run. |
| `feats` | F-FEA-008 | Confident Success: second published cap not enforced; counter write not atomic — Canonical text: no more than 3 FP per level and cannot have more FP than gained upon reaching current level; canonical automation note says "Needs ... both Force Point caps". Code enforces maxPerLevel (default 3 when rule missing) and relies on ActorEngine.gainForcePoints max cap; capToLevelStartMax is written by the hook but never read. |
| `force` | deferredRules (ref NONE — new entry required (owner)) | Whether the base-6/7 Force Point base persists after a prestige class is removed |
| `force` | F-FRC-009 | scripts/data/force-points.js: write-in-calculation functions with no callers; stale header — The 6 A-02 probe hits are un-awaited actor.setFlag calls inside getForcePointBase / hasPrestigeForcePointBonus (mutation inside a calculation, A-08), reachable only from calculateMaxForcePoints, updateActorForcePoints, initializeActorForcePoints and debug helpers, none of which has a caller. The live export is calculateMaxForcePointsForBuildPlan (read-only). Consequently the persistent prestige markers t |
| `npc-followers` | deferredRules (ref none (new; owner to register)) | Ability modifier for follower Fortitude Defense (hotfix uses CON, NPC sheet display uses max(STR, CON)) |
| `npc-followers` | deferredRules (ref none (new; owner to register)) | Fidelity of MinionManager.MINION_TALENTS paraphrases to printed talents (no source/page) |
| `npc-followers` | F-NPC-002 | Minion modules write owner/minion flags directly from a createItem hook; minion talent flags are write-only uncited rule text — MinionManager.applyTalent/removeTalent/_removeStaleFlags call owner.setFlag / minion.setFlag / unsetFlag directly (8 sites), triggered from the follower createItem/deleteItem hooks. The written flags (minionTacticalAbilities, minionTalentRegistry, minionTalentBenefits) have no reader outside the module. MINION_TALENTS holds hand-written rule paraphrases (e.g. Bodyguard  |
| `npc-followers` | F-NPC-003 | Three follower defense computations disagree; one installed by monkey-patching DefenseCalculator — The hotfix wraps DefenseCalculator.calculate for followers and rebuilds Fortitude with CON; the NPC sheet helper independently computes Fortitude as 10 + level + max(STR, CON) for display; the deriver applies template bonuses. A follower with STR > CON can show a different Fortitude than the one used by derived/rolls. |
| `progression` | deferredRules (ref none (new entry required)) | Hard-coded fallback starting credits by class when content lacks a value |
| `progression` | deferredRules (ref RECON-001..RECON-007) | Talent/feat/ability/skill entitlement cadence for multiclass, droid, Nonheroic, house rules |
| `progression` | F-PRG-009 | Telekinetic Savant/Prodigy text and slot rule hard-coded in a runtime patch, diverging from canonical reference text — The patch replaces picker description/benefit/prerequisite text for two talents with in-code strings and filters the ForcePowerStep Prodigy resolution (suppressProdigyOnlyRetroactiveSlot). The in-code Prodigy text says the extra power must have the [Telekinetic] descriptor and adds a Wisdom-increase clause; the canonical reference (FUCG p.88) says it must be one of the powers af |
| `progression` | F-PRG-019 | Hard-coded fallback starting credits by class — When neither content authority nor class/background records yield credits, a fixed table (soldier/scout/scoundrel 3000, jedi/force_adept 1200, noble 4800) is used - a default for missing published data (CLAUDE.md §3). |
| `rolls` | deferredRules (ref none yet - to be registered by owner (DEFERRED_RULES_REVIEW)) | Custom skill bonus uses half of system.level (custom-skill-roller.js:35) while derived skills use actor-core level-split helpers; aligning changes results for multiclass/nonheroic actors |
| `rolls` | F-ROL-001 | Local skill-total formulas in the rolls domain — getSkillTotal returns a locally rebuilt component total (ability + half level + trained + focus + misc) for useTheForce, and otherwise prefers derived totals with a component fallback. calculateCustomSkillBonus computes ability + 5 trained + 5 focus + floor(system.level/2) + misc. skills.calculateSkillModifier (exported, no importer) omits half level entirely. The derived skill pipeline (actor-core/ABL) is the authority for normal skills. |
| `talents` | deferredRules (ref FP-RD-001..FP-RD-013) | Contracted Force Point talent uses |
| `vehicles` | deferredRules (ref V-P6C-21) | Stock launcher printed Payload as canonical ammunition pool |
| `vehicles` | deferredRules (ref V-P5-03) | Non-starship vehicles |
| `vehicles` | deferredRules (ref V-P5-04) | Derived statistics depending on crew quality |
| `vehicles` | deferredRules (ref none (new; owner to register if a rules question)) | Whether a maneuver may be marked spent without the Pilot activation check (vehicle sheet path) — owner/rules question raised by F-VEH-003, not registered |
| `vehicles` | F-VEH-003 | Two spend paths for starship maneuvers with different semantics — Vehicle sheet useManeuver writes system.discarded=true on the crew/vehicle item without a roll; the character sheet uses StarshipManeuverSuite.activateManeuver (Pilot activation check, then discarded). Regain on the vehicle sheet already delegates to the suite. |

## Already referenced in the register

| Domain | Register ref | Item |
|---|---|---|
| `classes` | SWSE-NPC-RD-002 | Nonheroic class skill list (Ride) |
| `classes` | SWSE-NPC-RD-004 | Galactic Profile Nonheroic starting feats |
| `classes` | CF-RD-001 | Class features whose printed text could not be read |
| `classes` | MSV-RD-006 | Talent-tree access for Charlatan/Jedi Master/Sith Lord/Independent Droid |
| `droids` | DROID-RD-001 | Stabilized Mount host |
| `droids` | DROID-RD-002 | Telescopic Appendage host |
| `droids` | DROID-RD-003 | Upgrade Workshop 10-system cap |
| `droids` | DROID-BUILD-001 | Re-installing size-default locomotion |
| `droids` | CAE-003 | Droid-only evidence for action cards / cyborg hybrids |
| `droids` | RECON-002 | Ability increase count for droids/Nonheroic |
| `equipment` | EQ-001 | Action cost of reconfiguring a drawn weapon |
| `force` | FP-RD-015 (OWNER_CONFIRMATION_PENDING) | Last Grasp timing/cap exceptions; Emergency Patch failed-check charge |
| `force` | FP-RD-003 | Uncertified contracted abilities |
| `force` | FP-RD-013 | Temptation of the Dark Side (Force Unleashed p.85) |
| `mentor-suggestion` | MSV-RD-001 | L1 Q2 career ranking |
| `mentor-suggestion` | MSV-RD-002 | L1 Q4 child-specialization ranking by Q3 tags |
| `mentor-suggestion` | MSV-RD-003 | Multiclass Q5 milestone content/mapping |
| `mentor-suggestion` | MSV-RD-004 | Origin class keying with two or more prior foundation classes |
| `mentor-suggestion` | MSV-RD-005 | Prestige Q1 answer count/rotation/weights |
| `mentor-suggestion` | MSV-RD-006 | Talent-tree access for Charlatan, Jedi Master, Sith Lord, Independent Droid |
| `mentor-suggestion` | MSV-RD-007 | Multiclass Q2 build-integration inputs |
| `mentor-suggestion` | MSV-RD-008 | Q4/Q5 routing after 'I'm not sure yet' in Q1 |
| `mentor-suggestion` | MSV-RD-009 | Q5 career_continuity milestone and {declared_goal} slot |
| `npc-followers` | GP-RD-010 | Beast creation authority |
| `npc-followers` | GP-RD-011 | Beast readiness must block |
| `npc-followers` | RECON-002 | Ability increase count for droids/Nonheroic |
| `npc-followers` | RECON-003 | Which level drives entitlements for Nonheroic/mixed actors |
| `progression` | RECON-006 (related); new ID pending | Telekinetic Prodigy: runtime-hardcoded talent text and retroactive-slot suppression differ from canonical reference text (new entry required; not created by this audit) |
| `skills` | RECON-007 | Trained-skill entitlement under skill house rules |
| `skills` | SPECIES-RD-013 | Species skill reroll result |
| `skills` | SWSE-NPC-RD-002 | Nonheroic class skill Ride |
| `species` | SPECIES-RD-001 | See register entry |
| `species` | SPECIES-RD-002 | See register entry |
| `species` | SPECIES-RD-003 | See register entry |
| `species` | SPECIES-RD-004 | See register entry |
| `species` | SPECIES-RD-005 | See register entry |
| `species` | SPECIES-RD-006 | See register entry |
| `species` | SPECIES-RD-007 | See register entry |
| `species` | SPECIES-RD-008 | See register entry |
| `species` | SPECIES-RD-009 | See register entry |
| `species` | SPECIES-RD-010 | See register entry |
| `species` | SPECIES-RD-011 | See register entry |
| `species` | SPECIES-RD-012 | See register entry |
| `species` | SPECIES-RD-013 | See register entry |
| `species` | SPECIES-RD-014 | See register entry |
| `species` | SPECIES-RD-015 | See register entry |
| `species` | SPECIES-RD-016 | See register entry |
| `species` | SPECIES-RD-017 | See register entry |
| `species` | SPECIES-RD-018 | See register entry |
| `species` | SPECIES-RD-019 | See register entry |
| `species` | SPECIES-RD-020 | See register entry |
| `species` | SPECIES-RD-021 | See register entry |
| `species` | SPECIES-RD-022 | See register entry |
| `species` | SPECIES-RD-023 | See register entry |
| `talents` | TALENT-RD-001 | Which trees are Force talent trees for class-slot substitution |
| `talents` | RECON-001 / RECON-005 | Multiclass talent entitlement cadence |
| `talents` | GP-RD-017 | Name-keyed talent prerequisite collision |
| `vehicles` | EQ-004 | Operator authorization for vehicle-mounted weapons |
| `vehicles` | CF-RD-006 | Vehicle Dodge stacking |
