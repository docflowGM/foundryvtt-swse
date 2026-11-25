# Unimplemented and unresolved requirement ledger (generated)

Aggregated from domain contracts at `f734b4d`. Counts: FOUNDRY_ACCEPTANCE_REQUIRED 30 · UNIMPLEMENTED 18 · DEFERRED_RULES_REVIEW 24. Rules questions are never decided here; they belong in `docs/audits/swse-rules-decisions-pending.md`.

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
| UNIMPLEMENTED | `feats` | U-FEA-01 | Team feat skill bonuses: prompt is live, bonus patch and producer never registered | scripts/rolls/skills.js:243; scripts/engine/feats/team-feat-runtime-patches.js:172 |
| UNIMPLEMENTED | `feats` | U-FEA-02 | Skill-feat reroll/substitution/temporary-defense runtime patches never registered | scripts/engine/feats/skill-feat-runtime-patches.js:361 |
| UNIMPLEMENTED | `feats` | U-FEA-03 | Advisory/defense-avoidance riders need a per-attack selected-advisory UI context | docs/audits/combat-feat-runtime-architecture.md:64 |
| DEFERRED_RULES_REVIEW | `feats` | NONE — new entry required (owner) | Confident Success (Rebellion Era Campaign Guide p.31): is "FP gained upon reaching current level" the same as the system FP maximum? Second cap not enforced. | docs/audits/swse-rules-decisions-pending.md |
| DEFERRED_RULES_REVIEW | `feats` | NONE — owner decision; may not be a rules question | Meaning of a feat "per day" limit in a VTT (campaign day vs real-world day) for skill-feat daily uses | docs/audits/swse-rules-decisions-pending.md |
| FOUNDRY_ACCEPTANCE_REQUIRED | `feats` | — | Multi-client creation/update of a normalized feat: exactly one metadata write, no permission errors on non-owner clients | F-FEA-001 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `feats` | — | Cleave availability chat card posts once per drop | F-FEA-006 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `feats` | — | GM empty-pack seeding and icon repair on a migrated v13 world | R-FEA-03 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `feats` | — | Attack bonus composition with Riflemaster+Pistoleer+Sniper+Dual Weapon+droid+core attack options wrappers | F-FEA-002 |
| UNIMPLEMENTED | `galactic-profiles` | U-GAL-01 | Generator UI and Generate->Review->Commit (CampaignMutationCoordinator, JobEngine) | docs/audits/gm-datapad-ecosystem-redesign.md §199-201 (line 9551: not started) |
| UNIMPLEMENTED | `galactic-profiles` | U-GAL-02 | Applying generated rewards; credits must go through TransactionEngine (A-10); Store-index pricing adapter does not exist | docs/audits/gm-datapad-ecosystem-redesign.md §130 |
| UNIMPLEMENTED | `galactic-profiles` | U-GAL-03 | NPC Opposition Catalog, species-specific names, encounter-balance math, rank/privilege mechanics (deferred; not to be invented) | docs/audits/gm-datapad-ecosystem-redesign.md §130 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `galactic-profiles` | — | GM Locations / player Atlas surfaces, Scene factory, Location Library import | docs/audits/gm-datapad-ecosystem-redesign.md:4945 (live checklist not run) |
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
| UNIMPLEMENTED | `store-economy` | U-STO-01 | TE operation identity / exactly-once (TI4-B G17) | docs/audits/transaction-integrity/ti4-c0-closure-report.md §4 |
| UNIMPLEMENTED | `store-economy` | U-STO-02 | Cross-client credit lock / CAS | docs/audits/transaction-integrity/ti4-c0-closure-report.md §3 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `store-economy` | — | Store checkout incl. droid/vehicle acquisition and failure rollback | R-STO-04 |
| FOUNDRY_ACCEPTANCE_REQUIRED | `store-economy` | — | GM approval / resale / credit transfer under two clients | ti4c0-closure-report §3 |
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
