# Unimplemented and unresolved requirement ledger (generated)

Aggregated from domain contracts at `f734b4d`. Counts: FOUNDRY_ACCEPTANCE_REQUIRED 86 · UNIMPLEMENTED 32 · DEFERRED_RULES_REVIEW 69. Rules questions are never decided here; they belong in `docs/audits/swse-rules-decisions-pending.md`.

| Kind | Domain | ID | Item | Source |
|---|---|---|---|---|
| FOUNDRY_ACCEPTANCE_REQUIRED | `abilities-effects` | — | Managed-effect expiry at turn start/combat end (GM client) | scripts/infrastructure/hooks/combat-hooks.js:305 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `abilities-effects` | — | Lineage credit award flow after rerouting to TransactionEngine | scripts/engine/abilities/progression/progression-event-processor.js:374 |
| UNIMPLEMENTED | `actor-core` | U-ACT-01 | Automatic HP recompute hooks (hp-recompute-hooks.js) wired only from orphan governance-integration.js | scripts/governance/actor-engine/hp-recompute-hooks.js:3 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `actor-core` | — | Async derived re-render after prepareDerivedData | scripts/actors/v2/base-actor.js:217 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `actor-core` | — | Multi-client Force/Destiny point ledger serialisation (single-client queue only) | scripts/governance/actor-engine/actor-engine.js:41 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `actor-core` | — | applyMutationPlan transactional rollback including CREATE-bucket world actors | scripts/governance/actor-engine/actor-engine.js:3389 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `actor-core` | — | setFlag('swse',...) remap behaviour under Foundry v13 flag-scope validation | scripts/actors/base/swse-actor-base.js:463 |
| DEFERRED_RULES_REVIEW | `classes` | SWSE-NPC-RD-002 | Nonheroic class skill list (Ride) | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `classes` | SWSE-NPC-RD-004 | Galactic Profile Nonheroic starting feats | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `classes` | CF-RD-001 | Class features whose printed text could not be read | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `classes` | MSV-RD-006 | Talent-tree access for Charlatan/Jedi Master/Sith Lord/Independent Droid | docs/audits/swse-rules-decisions-pending.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `classes` | — | Class enumeration when the classes pack is not yet indexed at boot (loader fallback) | scripts/engine/progression/utils/class-data-loader.js:185 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `classes` | — | Prestige class availability in level-up | scripts/data/prestige-prerequisites.js:650 |
| UNIMPLEMENTED | `combat` | U-CMB-01 | Action authority v1 integration (registry/availability/resolver are test-only) | docs/architecture/action-authority-v1.md |
| UNIMPLEMENTED | `combat` | U-CMB-02 | Aid Another / Galaxy of Intrigue / Unknown Regions combat-action adapters never registered | scripts/engine/combat/aid-another-action-adapter.js |
| DEFERRED_RULES_REVIEW | `combat` | none found — new entry required (DEFERRED_RULES_REVIEW) | House-rule (enhanced massive damage) damage-threshold formula: DerivedCalculator adds size twice and keeps feat/Will-base/flat adjustments; ThresholdEngine uses fort+level+size only. Which is intended? | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `combat` | none (UNVERIFIED, report only) | Whether poison damage must be excluded from the half-heroic-level bonus (not in ELEMENTAL_HALF_LEVEL_EXCLUSION_KEYS); not traced | docs/audits/swse-rules-decisions-pending.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `combat` | — | Turn economy and reactions | OSI runtime-risk |
| FOUNDRY_ACCEPTANCE_REQUIRED | `combat` | — | Damage packet application incl. bookkeeping flags | R-CMB-04 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `combat` | — | Combat Action Browser execution | F-CMB-004 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `compat-patches` | — | Any fold-back of a class-F patch (combat attack options, follower lifecycle, progression steps) | scripts/patches/runtime-bugfix-hotfixes-init.js:21 |
| UNIMPLEMENTED | `droids` | U-DRD-01 | Production registry certification and cross-application parity for droid components (both 0) | docs/audits/droids/droid-component-mechanical-certification-closeout.md:22 |
| DEFERRED_RULES_REVIEW | `droids` | none (new; to be registered by owner) | Whether a constructed droid requires an Armor component and at least one appendage for readiness (code paths disagree) | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `droids` | DROID-RD-001 | Stabilized Mount host | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `droids` | DROID-RD-002 | Telescopic Appendage host | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `droids` | DROID-RD-003 | Upgrade Workshop 10-system cap | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `droids` | DROID-BUILD-001 | Re-installing size-default locomotion | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `droids` | CAE-003 | Droid-only evidence for action cards / cyborg hybrids | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `droids` | RECON-002 | Ability increase count for droids/Nonheroic | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `droids` | docs/audits/droids/droid-component-mechanical-certification-closeout.md | 23 component source HOLDs | docs/audits/swse-rules-decisions-pending.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `droids` | — | Droid sheet readiness card and component browser | scripts/sheets/v2/droid-sheet/context-builder.js:438 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `droids` | — | Self-destruct MeasuredTemplate placement | scripts/sheets/v2/droid-actor-sheet.js:37 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `droids` | — | GM natural healing excludes droids including NPC-type droid followers | scripts/holonet/subsystems/gm-healing-trigger.js:97 |
| UNIMPLEMENTED | `equipment` | U-EQP-01 | Player remote equipment mutation route (E4-P4 WP3) — modules test-only by design | docs/architecture/equipment-ecosystem-e4c0-ssot-persistence-contract.md:15 |
| DEFERRED_RULES_REVIEW | `equipment` | EQ-001 | Action cost of reconfiguring a drawn weapon | docs/audits/swse-rules-decisions-pending.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `equipment` | — | Posture/occupancy cutover final gate | E4-P5 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `equipment` | — | Ammo spend/reload, lightsaber ignite and token light | R-EQP-06 |
| UNIMPLEMENTED | `feats` | U-FEA-01 | Team feat skill bonuses: prompt is live, bonus patch and producer never registered | scripts/rolls/skills.js:243; scripts/engine/feats/team-feat-runtime-patches.js:172 |
| UNIMPLEMENTED | `feats` | U-FEA-02 | Skill-feat reroll/substitution/temporary-defense runtime patches never registered | scripts/engine/feats/skill-feat-runtime-patches.js:361 |
| UNIMPLEMENTED | `feats` | U-FEA-03 | Advisory/defense-avoidance riders need a per-attack selected-advisory UI context | docs/audits/combat-feat-runtime-architecture.md:64 |
| DEFERRED_RULES_REVIEW | `feats` | NONE — new entry required (owner) | Confident Success (Rebellion Era Campaign Guide p.31): is "FP gained upon reaching current level" the same as the system FP maximum? Second cap not enforced. | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `feats` | NONE — owner decision; may not be a rules question | Meaning of a feat "per day" limit in a VTT (campaign day vs real-world day) for skill-feat daily uses | docs/audits/swse-rules-decisions-pending.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `feats` | — | Multi-client creation/update of a normalized feat: exactly one metadata write, no permission errors on non-owner clients | F-FEA-001 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `feats` | — | Cleave availability chat card posts once per drop | F-FEA-006 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `feats` | — | GM empty-pack seeding and icon repair on a migrated v13 world | R-FEA-03 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `feats` | — | Attack bonus composition with Riflemaster+Pistoleer+Sniper+Dual Weapon+droid+core attack options wrappers | F-FEA-002 |
| UNIMPLEMENTED | `force` | U-FRC-01 | Force power resolution schema v1 not used at runtime | docs/architecture/force-power-resolution-v1.md:3 |
| UNIMPLEMENTED | `force` | U-FRC-02 | Forceful Recovery picker unreachable (only importer is an orphan feat module) | scripts/apps/dialogs/forceful-recovery-picker.js |
| UNIMPLEMENTED | `force` | U-FRC-03 | dailyForcePoints house rule has no effect on the stored maximum | scripts/core/settings.js:240; scripts/engine/force/force-points-service.js:82 |
| DEFERRED_RULES_REVIEW | `force` | FP-RD-015 (OWNER_CONFIRMATION_PENDING) | Last Grasp timing/cap exceptions; Emergency Patch failed-check charge | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `force` | FP-RD-003 | Uncertified contracted abilities | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `force` | FP-RD-013 | Temptation of the Dark Side (Force Unleashed p.85) | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `force` | NONE — new entry required (owner) | Whether the base-6/7 Force Point base persists after a prestige class is removed | docs/audits/swse-rules-decisions-pending.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | A1 Force Point spend + finalize | docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | A2 Failed paid roll rollback | docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | A3 Round cap | docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | B1 Destiny spend separate ledger | docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | C1 Temptation mark (needs live roll stack) | docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | C2 Temptation spend window, owner prompted | docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | C3 Initiative reorder | docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | C4 Late delivery / reload | docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | C5 Concurrent FP + Destiny receipts | docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | C6 Two Sith Lords mark each other (live needed) | docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | C7 Capped condition track | docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | D1 GM world time only | docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | E1 Serenity | docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | E2 Prophet review | docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | F1 Immunities | docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | G1 Reactions (verified event, non-owner refused) | docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | G2 Reaction settlement on finalize failure | docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | H1 WatchCircle Initiate | docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | H2 Drain Force | docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | I1 Last Grasp / Emergency Patch (provisional FP-RD-015) | docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | J1 Force Alchemy multi-resource costs with injected failures (not atomic) | docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | J2 Receipt reconciliation | docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | K1 Retired legacy entry points absent | docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | L1 Cross-client repeat of C2/C4/G1 (cannot be proven offline) | docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | Not covered by matrix: Alchemy multi-resource atomicity; Last Grasp timing/cap; unresolved reaction receipts after client close; reactions other than Block/Deflect/Force Fortification via chat-dataset context | docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | Proposed: Guardian Spirit claim then Force Point spend, reload | F-FRC-003 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | Proposed: dailyForcePoints on/off at level-up | F-FRC-002 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `force` | — | Proposed: end combat with two clients; Force talent cleanup once | F-FRC-006 |
| UNIMPLEMENTED | `galactic-profiles` | U-GAL-01 | Generator UI and Generate->Review->Commit (CampaignMutationCoordinator, JobEngine) | docs/audits/gm-datapad-ecosystem-redesign.md §199-201 (line 9551: not started) |
| UNIMPLEMENTED | `galactic-profiles` | U-GAL-02 | Applying generated rewards; credits must go through TransactionEngine (A-10); Store-index pricing adapter does not exist | docs/audits/gm-datapad-ecosystem-redesign.md §130 |
| UNIMPLEMENTED | `galactic-profiles` | U-GAL-03 | NPC Opposition Catalog, species-specific names, encounter-balance math, rank/privilege mechanics (deferred; not to be invented) | docs/audits/gm-datapad-ecosystem-redesign.md §130 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `galactic-profiles` | — | GM Locations / player Atlas surfaces, Scene factory, Location Library import | docs/audits/gm-datapad-ecosystem-redesign.md:4945 (live checklist not run) |
| UNIMPLEMENTED | `governance` | U-GOV-01 | Runtime mutation enforcement (observer checking MutationInterceptor context in DEV/STRICT) or retirement of the enforcement claims | scripts/governance/mutation/MutationInterceptor.js:99 |
| UNIMPLEMENTED | `governance` | U-GOV-02 | Sentinel invariant-monitoring layers (layers/*, mutation-path-guard, sovereignty-enforcement) | scripts/governance/sentinel/sentinel-registry.js:54 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `governance` | — | Transactional rollback verification (C-GOV-1) | scripts/governance/actor-engine/actor-engine.js:3389 |
| UNIMPLEMENTED | `holonet` | U-HOL-01 | Durable recovery for in-flight trades/payouts (snapshots in memory only) | docs/audits/transaction-integrity/ti4-c0-closure-report.md:50 |
| UNIMPLEMENTED | `holonet` | U-HOL-02 | GM tool to resolve indeterminate Party Fund requests | docs/architecture/v2-contracts/unresolved-ledger.md:68 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `holonet` | — | Credit/item/asset trades including forced rollback; job payouts; Party Fund contribution/payout | OSI runtime-risk areas (trade/store, credit movement) |
| FOUNDRY_ACCEPTANCE_REQUIRED | `holonet` | — | Emitter notifications (droid/ship/follower HP) after F-HOL-004 fix | this contract |
| FOUNDRY_ACCEPTANCE_REQUIRED | `holonet` | — | Socket relay of GM-authority actions from a player client | this contract |
| FOUNDRY_ACCEPTANCE_REQUIRED | `infrastructure` | — | Boot order after moving hotfix registration into index.js | index.js:91 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `infrastructure` | — | Foundry v13 acceptance of settings namespace 'swse' | index.js:361 |
| UNIMPLEMENTED | `mentor-suggestion` | U-MEN-01 | Certified answer-to-tag crosswalk for survey responses | docs/design/mentor-survey-v2/01-SHARED-ARCHITECTURE-CONTRACT.md §9 (SV-16) |
| UNIMPLEMENTED | `mentor-suggestion` | U-MEN-02 | Single suggestion analytics service (PlayerAnalytics / SuggestionStateService as sole writer) | docs/architecture/ENGINE-ARCHITECTURE.md §10 |
| UNIMPLEMENTED | `mentor-suggestion` | U-MEN-03 | Prestige Q6 Mentor dialogue package (not in Git) | docs/design/mentor-survey-v2/06-CONTENT-STATUS-AND-BLOCKERS.md §3 |
| DEFERRED_RULES_REVIEW | `mentor-suggestion` | MSV-RD-001 | L1 Q2 career ranking | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `mentor-suggestion` | MSV-RD-002 | L1 Q4 child-specialization ranking by Q3 tags | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `mentor-suggestion` | MSV-RD-003 | Multiclass Q5 milestone content/mapping | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `mentor-suggestion` | MSV-RD-004 | Origin class keying with two or more prior foundation classes | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `mentor-suggestion` | MSV-RD-005 | Prestige Q1 answer count/rotation/weights | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `mentor-suggestion` | MSV-RD-006 | Talent-tree access for Charlatan, Jedi Master, Sith Lord, Independent Droid | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `mentor-suggestion` | MSV-RD-007 | Multiclass Q2 build-integration inputs | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `mentor-suggestion` | MSV-RD-008 | Q4/Q5 routing after 'I'm not sure yet' in Q1 | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `mentor-suggestion` | MSV-RD-009 | Q5 career_continuity milestone and {declared_goal} slot | docs/audits/swse-rules-decisions-pending.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `mentor-suggestion` | — | Entire Mentor Survey V2 live pass (NOT PERFORMED) | docs/design/mentor-survey-v2/20-FOUNDRY-ACCEPTANCE-CHECKLIST.md:3 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `mentor-suggestion` | — | Confirm Foundry rejects flag scope 'swse' (F-MEN-003) and observe multi-client decay behavior (F-MEN-004) | this contract |
| FOUNDRY_ACCEPTANCE_REQUIRED | `mentor-suggestion` | — | Sheet/progression re-render count caused by getSuggestions history writes (F-MEN-006) | this contract |
| UNIMPLEMENTED | `progression` | U-PRG-01 | ClassPlanBuilder not wired; class compiled inline | docs/architecture/progression-architecture.md §Intentionally inline domains |
| UNIMPLEMENTED | `progression` | U-PRG-02 | Single durable draft store | this contract (PROPOSED) |
| UNIMPLEMENTED | `progression` | U-PRG-03 | SWSELanguageModule.init() never called; its updateActor and swse:progression:completed listeners are dormant | scripts/engine/progression/modules/language-module.js:12 |
| DEFERRED_RULES_REVIEW | `progression` | RECON-006 (related); new ID pending | Telekinetic Prodigy: runtime-hardcoded talent text and retroactive-slot suppression differ from canonical reference text (new entry required; not created by this audit) | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `progression` | none (new entry required) | Hard-coded fallback starting credits by class when content lacks a value | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `progression` | RECON-001..RECON-007 | Talent/feat/ability/skill entitlement cadence for multiclass, droid, Nonheroic, house rules | docs/audits/swse-rules-decisions-pending.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `progression` | — | Full chargen and level-up finalize through ActorEngine.applyMutationPlan | docs/architecture/progression-architecture.md §Verification status |
| FOUNDRY_ACCEPTANCE_REQUIRED | `progression` | — | Chargen store purchase, then abandon / resume chargen | F-PRG-003 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `progression` | — | Single-step finalize from sheet/Holonet | R-PRG-06 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `progression` | — | Rollback indeterminate path surfaced to the player | scripts/apps/progression-framework/shell/progression-finalizer.js:4028 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `progression` | — | System boots and finalizes Force techniques if squad-actions-init.js stops importing the patch | F-PRG-002 |
| DEFERRED_RULES_REVIEW | `skills` | RECON-007 | Trained-skill entitlement under skill house rules | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `skills` | SPECIES-RD-013 | Species skill reroll result | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `skills` | SWSE-NPC-RD-002 | Nonheroic class skill Ride | docs/audits/swse-rules-decisions-pending.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `skills` | — | Sheet extra skill uses (Quick Sabotage, recharge shields) | scripts/utils/skill-use-filter.js:348 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `skills` | — | Vehicle crew skill routing | scripts/sheets/v2/vehicle-sheet/crew-skill-router.js:243 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `skills` | — | Skill challenge flow | scripts/engine/skill-challenges/SkillChallengeEngine.js:21 |
| UNIMPLEMENTED | `species` | U-SPC-01 | Atomic species replacement on an existing actor is not reachable at runtime | scripts/species/species-plan-transaction.js |
| DEFERRED_RULES_REVIEW | `species` | SPECIES-RD-001 | See register entry | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `species` | SPECIES-RD-002 | See register entry | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `species` | SPECIES-RD-003 | See register entry | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `species` | SPECIES-RD-004 | See register entry | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `species` | SPECIES-RD-005 | See register entry | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `species` | SPECIES-RD-006 | See register entry | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `species` | SPECIES-RD-007 | See register entry | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `species` | SPECIES-RD-008 | See register entry | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `species` | SPECIES-RD-009 | See register entry | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `species` | SPECIES-RD-010 | See register entry | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `species` | SPECIES-RD-011 | See register entry | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `species` | SPECIES-RD-012 | See register entry | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `species` | SPECIES-RD-013 | See register entry | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `species` | SPECIES-RD-014 | See register entry | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `species` | SPECIES-RD-015 | See register entry | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `species` | SPECIES-RD-016 | See register entry | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `species` | SPECIES-RD-017 | See register entry | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `species` | SPECIES-RD-018 | See register entry | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `species` | SPECIES-RD-019 | See register entry | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `species` | SPECIES-RD-020 | See register entry | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `species` | SPECIES-RD-021 | See register entry | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `species` | SPECIES-RD-022 | See register entry | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `species` | SPECIES-RD-023 | See register entry | docs/audits/swse-rules-decisions-pending.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `species` | — | Species change on an existing character | R-SPC-07 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `species` | — | Activated species abilities in combat | scripts/engine/species/species-activated-ability-engine.js:12 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `species` | — | Conditional bonus feats after skill training changes | scripts/infrastructure/hooks/actor-hooks.js:85 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `species` | — | Live checklist | docs/audits/swse-species-live-foundry-checklist.md |
| UNIMPLEMENTED | `store-economy` | U-STO-01 | TE operation identity / exactly-once (TI4-B G17) | docs/audits/transaction-integrity/ti4-c0-closure-report.md §4 |
| UNIMPLEMENTED | `store-economy` | U-STO-02 | Cross-client credit lock / CAS | docs/audits/transaction-integrity/ti4-c0-closure-report.md §3 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `store-economy` | — | Store checkout incl. droid/vehicle acquisition and failure rollback | R-STO-04 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `store-economy` | — | GM approval / resale / credit transfer under two clients | ti4c0-closure-report §3 |
| UNIMPLEMENTED | `talents` | U-TAL-01 | GM relay for cross-actor talent effects | no socket/executeAsGM in scripts/engine/talent/*-talent-actions.js (grep) |
| UNIMPLEMENTED | `talents` | U-TAL-02 | Progression tree-provider API replacing the TalentStep patch | scripts/apps/talent-tree-workbench/custom-talent-tree-progression-overlay.js:296 |
| DEFERRED_RULES_REVIEW | `talents` | TALENT-RD-001 | Which trees are Force talent trees for class-slot substitution | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `talents` | RECON-001 / RECON-005 | Multiclass talent entitlement cadence | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `talents` | GP-RD-017 | Name-keyed talent prerequisite collision | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `talents` | FP-RD-001..FP-RD-013 | Contracted Force Point talent uses | docs/audits/swse-rules-decisions-pending.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `talents` | — | Affliction turn-start damage applied once, to the correct combatant | F-TAL-003 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `talents` | — | Master Advisor end-of-turn temporary Force Point granted | F-TAL-003 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `talents` | — | Player-client use of Sith/Consular/Force Adept talents that mark an enemy actor | F-TAL-002 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `talents` | — | Guardian Spirit claim then Force Point spend: bonus pool decrements and stays decremented after reload | F-TAL-007 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `talents` | — | Custom tree workbench trees appear in chargen TalentStep; effect wizard auto-open does not loop renders | F-TAL-005, F-TAL-006 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `talents` | — | Class/Force V2 matrix rows G1, H1, H2 | docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md |
| UNIMPLEMENTED | `ui-shell` | U-UIS-01 | Shared pure sheet-context helper module (sanitize/documentToTemplateData/action-economy VM) | F-UIS-002 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `ui-shell` | — | All four actor types render through the shared template and Holopad frame | templates/actors/character/v2-concept/character-sheet.hbs:19 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `ui-shell` | — | Tooltips/responsive observer bind on V2 sheets (renderApplication hook name) | scripts/ui/discovery/index.js:39 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `ui-shell` | — | Credit adjustment through TransactionEngine after F-UIS-001 | scripts/sheets/v2/character-like-sheet.js:6074 |
| UNIMPLEMENTED | `vehicles` | U-VEH-01 | Vehicle import UI entry (wizard unwired, button disabled) | scripts/sheets/v2/vehicle-actor-sheet.js:704 |
| UNIMPLEMENTED | `vehicles` | U-VEH-02 | GM tool to resolve indeterminate Party Fund requests (P6B-D-074) | docs/audits/swse-rules-decisions-pending.md:2099 |
| DEFERRED_RULES_REVIEW | `vehicles` | V-P6C-21 | Stock launcher printed Payload as canonical ammunition pool | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `vehicles` | V-P5-03 | Non-starship vehicles | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `vehicles` | V-P5-04 | Derived statistics depending on crew quality | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `vehicles` | EQ-004 | Operator authorization for vehicle-mounted weapons | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `vehicles` | CF-RD-006 | Vehicle Dodge stacking | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `vehicles` | none (new; owner to register if a rules question) | Whether a maneuver may be marked spent without the Pilot activation check (vehicle sheet path) — owner/rules question raised by F-VEH-003, not registered | docs/audits/swse-rules-decisions-pending.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `vehicles` | — | Vehicle import/materialization from canonical packs | docs/audits/vehicles/universal-vehicle-phase4d-native-runtime-acceptance.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `vehicles` | — | Party Fund ammunition settlement and restore | docs/audits/swse-rules-decisions-pending.md:2099 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `vehicles` | — | Starship Tactics feat during chargen finalization: double prompt/grant | scripts/infrastructure/hooks/starship-maneuver-hooks.js:36 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `vehicles` | — | Vehicle crew assignment drop stack | scripts/sheets/v2/vehicle-actor-sheet.js:286 |
