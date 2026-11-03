# SWSE Droid Semantic Tags and Archetype-Aware Scoring

**Rolling design proposal / implementation roadmap — updated 2026-11-03 (full phased execution handoff and Git delivery protocol)**  
**Project:** `docflowGM/foundryvtt-swse` · Foundry VTT v13 / V2 migration  
**Status:** `PROPOSED — NOT IMPLEMENTED; OWNER / ONTOLOGY REVIEW REQUIRED`  
**Scope:** Ten proposed droid semantic refinements; extraction of mechanical evidence from chassis, size, degree, components, feats, talents, classes, skills and progression; shared archetype scoring; explanation UI; validation and rollout; **rolling droid-exclusive industrial archetype gap review (Section 12), five Star Wars-specific droid job proposals (Section 13), and published feat/talent tag-target matrix plus implementation amendments (Section 14), plus the agent execution and Git delivery handoff (Section 15)**.  
**Intent:** Make droid recommendations more accurate and informative **without unnecessarily multiplying archetypes or creating a separate droid scorer**.

> **Core rule:** A droid and an organic may express the same archetype with different mechanical evidence. Preserve a shared definition of the archetype, but interpret the actor's legally available, actually possessed capabilities through its own character rules. Droid identity, degree, size, and hardware are **context and capability facts**, not automatic proof of an archetype.

---

## 0. Authority and compatibility status — read first

This project has progressed beyond the original Phase 11 *57-tag archetype vocabulary*. The subsequent Phase 3 talent/feat **190-tag ontology** is the newer shared semantic authority, and archetype Phases **12A/12B** introduced/curated `data/archetypes.json` (297 records). The 57-tag vocabulary is **historical**, not a valid target for blindly appending ten tags.

**Authoritative files to verify against the current target commit before implementation:**

| Authority / consumer | Existing repository path | Role |
|---|---|---|
| Final 190-tag shared ontology | `data/audits/talent-feat-phase3-final-ontology.json` | Canonical existing tags, definitions, implications and retirement policy |
| 297-archetype identity SSOT | `data/archetypes.json` | Archetype identities, typed mechanics, exact references, primary/supporting tags |
| Phase 12B curation authority | `data/audits/archetype-phase-12b-semantic-curation.json` | Certified archetype tag relationships; do not silently rewrite |
| Archetype SSOT reader | `scripts/engine/archetype/archetype-registry.js` | Existing registry lane to evolve, not replace |
| Installed droid component read model | `scripts/domain/droids/droid-installed-component-resolver.js` | Canonical deduplicated/effective installed, enabled and active component evidence |
| Droid part catalog | `scripts/data/droid-part-schema.js` | Part identities, categories, slots, prerequisites, mechanical metadata |
| Droid traits / degree / size | `scripts/engine/progression/droids/droid-trait-rules.js` | Current implementation authority to cross-check against published rules |
| Droid playable/stock mode | `scripts/actors/droid/droid-mode-adapter.js` | Distinguishes mutable playable builds from published stock statblocks |
| Current suggestion tag scoring | `scripts/engine/suggestion/tag-signal-engine.js` | Transitional runtime consumer; contains legacy biases and a Constitution-sensitive attribute path |
| Current route confidence | `scripts/engine/suggestion/build-route-confidence-profile.js` | Access vs support vs commitment vs anchor distinction |
| Current loadout extraction | `scripts/engine/suggestion/equipment-loadout-profile.js` | Weapon/equipment observations; do **not** duplicate installed droid parts through this path |
| Droid-oriented equipment suggestions | `scripts/engine/progression/engine/droid-suggestion-engine.js` | Existing role/budget/component recommendation logic to integrate, not replace |
| Legacy archetype affinity | `scripts/engine/suggestion/ArchetypeAffinityEngine.js` | Still reads legacy `class-archetypes.json`; retire/bridge via the planned archetype convergence, not a droid-specific fork |

**Current design boundary:** Phase 12B's closeout says its curated archetype tags are not yet consumed by the final live scoring flow. This document describes the *intended target* and a read-only shadow route during transition, not a claim that the new scoring design is already running.

**Ontology change control:** The ten strings below are *candidates*. Inspect the actual 190-tag authority and the feat/talent final tags before adopting them. Some encode distinctions already partially covered by existing `command`, `targeting`, `movement`, `power_systems`, `durability`, `modification`, `sensors`, and other tags. If a proposed tag cannot reliably improve discrimination beyond its canonical parent concepts, do **not** add it solely to reach a total of ten. A ten-tag proposal is not a mandate to create ten unnecessary canonical tags. If all ten are certified, the 190-tag ontology would become **200**, not 67.

---

## 1. Source-grounded mechanics: why droids need a different evidence profile

**Primary printed rules to verify mechanically:**

- *Star Wars Saga Edition Core Rulebook*, **Droid Heroes**, pp. 185–197: custom/standard-model droid creation, five droid degrees, size, class restrictions, no Constitution, droid traits, locomotion, processors, appendages and accessories; **Fortitude Defense**, p. 145.
- *Scavenger's Guide to Droids*, **Droid Heroes**, pp. 10–13: third creation option (stock chassis), eight stock chassis types, size/degree/grants/starting systems; **Feats**, pp. 22–25; **Droid Talents and prestige additions**, pp. 26–29; **Droid Equipment**, Ch. III.
- *The Clone Wars Campaign Guide*, **Droid Commander**, pp. 42–44.
- *The Force Unleashed Campaign Guide*, **Independent Droid**, pp. 46–48.
- The *Scavenger's Guide* explicitly distinguishes a **custom droid**, an **existing standard-model droid**, and a **stock chassis treated like a species**. Do not treat those creation modes as interchangeable, or assume that a printed stock NPC is a legal level-1 heroic build.

### Rules that the scoring layer must not distort

1. Standard droids have **no Constitution score**. An absent `con` is not Constitution 10, zero, or Strength. **Strength substitutes for Constitution only where the rule actually directs it**, notably the Strength modifier on a nonliving target's **Fortitude Defense**. It does **not** replace Constitution for hit points, generic Endurance skill modifiers, feat prerequisites, or arbitrary archetype ability priorities.
2. Droid size affects statistics such as Reflex Defense, Stealth, Strength/Dexterity modifiers, carrying capacity, speed, damage threshold, hit points for some sizes, and system cost factor. Apply **published rule packages**, not assumed size→role correlations. Small-size +5 Stealth is a real bonus, but is not evidence that the player spent a feat/talent/upgrade to become a stealth specialist.
3. Droid **degree** has real rules consequences: ability modifiers, typical function, relevant degree talent tree, and behavioral constraints. A fourth-degree droid is *not automatically a Soldier archetype*, nor a first-degree droid automatically a Doctor. Degree is access/context, not identity.
4. System types matter: installed processor, locomotion, appendages, sensors, mounted weapon, armor/shield, power supply, tools and accessories. An installed, functioning part is distinct from an owned item, disabled part, historical equipment, or installed-but-inapplicable component.
5. Default hardware bundled with a stock chassis is a **grant**, not necessarily a deliberate player investment. A genuinely selected and mechanically specialized modification may be stronger evidence than a standard-issue component. Do not punish characters for standard hardware, but do not make every stock astromech a Slicer/Mechanic recommendation solely because it has a data port.
6. Droids are repaired through applicable **Mechanics** rules; living-entity healing should not be projected onto them. Endurance is **not** universally absent for droids: certain droid rules explicitly call for Endurance checks (for example, maintenance or shield recharge). Determine the skill's actual availability and permitted use; do not infer trained Endurance from high Strength.
7. Droids cannot normally gain Force Sensitivity/Force powers. Hard-gate Force-dependent routes from genuine published capabilities. Hybrid, cyborg, Shard/biological exceptions need typed rules, **not** a blanket `isDroid`/`isOrganic` shortcut; inspect the actual source-specific exception before making claims.
8. Prerequisites for droid-only feats, degree talent trees, Droid Commander, Independent Droid, installed-part upgrades and chassis restrictions are resolved by existing **eligibility authorities**. A semantic tag can explain a rule; it never grants the rule.

---

## 2. Ten proposed *additional* semantic tags

Use `lower_snake_case` when approved; retain existing 190 canonical tags and their exact definitions. **Every proposed tag carries a narrow meaning, explicit evidence, negative examples, and neighboring existing ontology tags.** Source examples are intended for exact canonical-ID adjudication, not fuzzy name matching.

| # | Proposed tag | Distinctive meaning | Published evidence examples | Existing 190-tag companions / avoid confusion |
|---:|---|---|---|---|
| 1 | `droid_command` | Mechanically direct, coordinate, or override **other droids** | Droid Commander: Directed Action, Directed Movement, Remote Attack, Full Control; Supervising Droid | `command`, `ally_support`, `teamwork`, `action_economy`; **not** generic `leadership` or simply owning a comlink |
| 2 | `droid_autonomy` | Specific abilities enhancing freedom from programming/control or independent operation | Independent Droid: Sapience, Independent Spirit, Defensive Electronics; evaluate exact rules | `droid`, `resilience`, `reliability` where independently justified; **not** merely having a heuristic processor by default |
| 3 | `droid_reprogramming` | Mechanics directly change, substitute, resist, or optimize programmable character functions | Logic Upgrade: Skill Swap; relevant Independent Droid and reprogramming features | `modification`, `skills`, `skill_substitution` where text supports; **not** ordinary `use_computer` training |
| 4 | `droid_data_link` | Specialized performance through direct machine-to-machine interfaces or communications links | Burst Transfer, On-Board System Link, Scomp Link Slicer, Sensor Link | `network`, `sensors`, `slicing`, `use_computer`, `vehicle` only when rule qualifies; **not** a generic dataport or comlink alone |
| 5 | `droid_targeting` | Dedicated machine-assisted target tracking, acquisition or attack precision | Aiming Accuracy, Multi-Targeting, Target Acquisition, Target Lock | `targeting`, `target-designation`, `precision`, `setup`; **not** every ranged feat |
| 6 | `droid_integrated_weapons` | Combat depends on installed chassis weapons, powered mounts or appendages functioning as weapons | Weapons Power Surge, Pincer, Slammer, Tool Frenzy | `offense_melee`, `offense_ranged`, `grapple`, `weapon_empowerment`; **not** an ordinary held blaster |
| 7 | `droid_chassis_resilience` | Specialized machine-specific survival, ion resistance, armor/shield resilience, or on-board repair | Damage Conversion, Ion Shielding, Durable, Droid Shield Mastery, Combat Repairs | `durability`, `resilience`, `shields`, `ion`, `repair`, `self_repair`; **not** every droid's standard immunity package |
| 8 | `droid_power_management` | Explicit power allocation, surges, energy supply or trade-offs | Weapons Power Surge, Power Surge, Power Boost; power-related installed systems | `power_systems`, `empowerment`, `resource_spend`, `condition_track`; **not** generic battery ownership |
| 9 | `droid_locomotion` | Specialized exploitation/upgrades of locomotion **as a build choice** | Erratic Target, Turn and Burn, Power Boost; relevant active locomotion enhancements | `mobility`, `movement`, `jump`, `climb`, `evasion` where justified; **not** a default walking/wheeled chassis alone |
| 10 | `droid_task_optimization` | Direct programming or subsystems that accelerate/reconfigure skill tasks | Task Optimization, Quick Astrogation, specialized subprocessors when rules support | `action_economy`, `skills`, `skill_mastery`, `swift_action`, `use_computer`; **not** ordinary skill training |

**Shared tag implications:** Only retain implications required by the approved ontology policy. Do **not** auto-infer `command` from any droid, `targeting` from a built-in blaster, or `slicing` from a physical data link. Companion tags must be independently supported by the record's real mechanical effect. Some candidate names may be rejected/recast during adjudication if they merely duplicate existing semantic meaning.

### Content-side tagging contract

- Feat/talent semantic tags describe the **mechanic**, independently of what archetypes happen to favor it.
- Content-side tags should generally be a **flat set** of canonical tags (`system.tags` when that is the certified content field); *primary/supporting* belong to archetype relationships, not automatically to a feat/talent.
- Correct source, printed page, canonical feat/talent identity, droid/degree/part prerequisites, and downstream state required for use must remain available in structured data.
- Never infer a content tag from a recommended archetype. Avoid `archetype -> content tag -> archetype` circularity.
- A feat that droids and cyborgs can both acquire should not be falsely restricted merely because its mechanical domain has a `droid_` label. **Who can select it** is a legality question; **what it does** is semantics.

---

## 3. Three distinct layers: facts, semantics, and scoring

### Layer A — Typed mechanical facts (not new archetype tags)

The extractor records, with canonical IDs and source provenance:

| Fact group | Fields to record | Can directly determine an archetype? |
|---|---|---|
| Actor identity/rules mode | actual construct/droid rule profile, heroic vs stock-statblock mode, rule exceptions, valid capability flags | **No**; gates applicable rules and interpretation |
| Creation route | custom / standard model / stock chassis; chassis or model ID; innate package provenance | **No**; explains grants and available choices |
| Degree | 1st–5th, degree-modifier package, allowed degree talent trees, inhibitor state | **No**; primarily access and constraints |
| Size | canonical size category, size modifier package, effective size/bonuses | **No**; effects count through appropriate axes only |
| Abilities | real STR/DEX/INT/WIS/CHA and `con = absent`, derived defenses | **Yes**, through archetype ability criteria; never fake CON |
| Class/levels | exact starting class, heroic class levels, relevant prestige levels | **Yes**, through same legal class-route framework as organics |
| Skill state | trained status, class-skill access, exact legal check modifiers, skill use limitations | **Yes**, after normal legal/access processing |
| Feats/talents | canonical identity, acquired source, prerequisites, currently active features | **Yes**, strongest exact-reference/content evidence |
| Installed systems | part canonical ID, slot/category, installed/enabled/active, origin (standard/added), functional capability | **Sometimes**: a mechanically relevant, effective specialized system supports an archetype; baseline parts are weak context |
| Loadout | wielded/equipped vs carried, integrated vs handheld, actual powered weapon/armor/shield capabilities | **Sometimes**, based on documented ability and investment |
| Operational state | disabled/shutdown, damage/ion/condition, suppressed component, unavailable feature | **Not archetype identity**; may affect active recommendation eligibility and currently usable capability |
| Faction/personality/quirks | roleplay traits, affiliation, inhibitor narrative | **No** without a certified mechanical rule; do not invent scoring for personality |

The actor sheet's label `droid`, degree, size, chassis name, and part names may be shown as **informational chips**, but they must not be injected into the semantic tag scorer as arbitrary new canonical tags such as `size_small`, `degree_4`, `basic_processor` or `astromech`.

### Layer B — Canonical semantic evidence

For every **actual rules effect** that changes a capability, attach its appropriate **existing** ontology tags and any approved new droid refinements. Example: an active specialized targeting processor might substantiate `sensors`, `targeting`, and `droid_targeting` only to the extent its *exact* rules support those effects. A generic sensor package may substantiate `sensors` but **not** `targeting`.

### Layer C — Shared archetype identity score

One central scoring policy ranks **all 297 existing archetypes** using comparable evidence channels. The droid adapter changes how mechanical evidence is constructed and interpreted; it does **not** create new archetypes or a second independent scoring engine. The ten proposed tags are supplemental specificity signals, not prerequisites for the original archetype to be a valid match.

---

## 4. Component/degree/size -> existing + proposed tags: implementation matrix

Each entry below is a **mapping rule proposal**. Apply an existing tag only where an exact item/talent/system effect meets its frozen ontology definition; use source-level verification rather than keyword matches.

| Source mechanic / droid subsystem | Existing semantic tags to consider (190 authority) | Proposed droid refinement | Strict evidence threshold and guardrail |
|---|---|---|---|
| 1st degree, medical chassis, medical analysis | `medical`, `medicine`, `science`, `treat_injury`, `support` | `droid_task_optimization` **only if** a task-speed feature exists | Degree/chassis alone are eligibility context; actual medical skills/talents produce identity signal |
| 2nd degree, technical or astromech chassis | `tech`, `mechanics`, `use_computer`, `pilot`, `vehicle` | `droid_data_link`, `droid_task_optimization` if features actually apply | Never assume all second-degree units are slicers, pilots or mechanics |
| 3rd degree, protocol/service chassis | `social`, `persuasion`, `knowledge`, `ally_support` | `droid_command` only from command mechanics | A translator/vocabulator is not Persuasion proficiency by itself |
| 4th degree, battle/probe chassis | `offense_ranged`, `targeting`, `sensors`, `defense`, `recon` | `droid_targeting`, `droid_integrated_weapons` where equipped/effective | Degree is not a combat build score; weapons/targeting systems and choices are evidence |
| 5th degree, labor chassis | `durability`, `mechanics`, `unarmed`, `movement`, `skills` | `droid_chassis_resilience`, `droid_task_optimization` only where granted | STR bonus is an ability fact, not automatic `unarmed` investment |
| Small / Tiny effective size | `stealth`, `mobility`, `movement` when actually supported by size and build | `droid_locomotion` only for chosen specialty | Size Stealth/Reflex bonus is *baseline rules effect*, not authored stealth intent |
| Large+ effective size | `durability`, `damage_threshold`, `grapple` if actual effects/feats justify | `droid_chassis_resilience`, `droid_integrated_weapons` if specialized | Follow size table and GM-approval rules; large size alone is not a defender archetype |
| Processor: basic / heuristic / remote / backup | `skills`, `reliability`, `network`, `modification` where supported | `droid_autonomy`, `droid_reprogramming` on explicit enhancements | Default heuristic or basic processor = normal operating context, not a strong specialization |
| Specialized subprocessor / skill-task routines | `action_economy`, `skills`, `swift_action` when exact | `droid_task_optimization` | Tag one approved, effective capability; don't count a second copy of the same part/effect |
| Scomp/data link or wireless interface | `network`, `use_computer`, `slicing`, `vehicle` when actual use supported | `droid_data_link` for specialized interface performance | A port that enables a check is *access*; it does not grant skill training or slicing mastery |
| Sensor upgrades / direct sensor sharing | `sensors`, `perception`, `awareness`, `ally_support` if real | `droid_data_link`; `droid_targeting` only if attacking/targeting enhanced | Sensing is not equivalent to targeting or Stealth |
| Walking/wheeled/tracked/hovering/flying | `mobility`, `movement`, `climb`, `jump`, `evasion` per actual rule | `droid_locomotion` only on specialized talent or elective upgrade | Default locomotion primarily creates legality/access/terrain movement, not identity weight |
| Magnetic feet/hands, climbing claws, jump servos | `climb`, `jump`, `movement`, `mobility` where exact effect | `droid_locomotion` where specialized locomotion is defining | Synergy (e.g. hands + feet) activates only when both qualifying parts work |
| Claw, tool, probe, instrument, hand appendages | `mechanics`, `skills`, `grapple`, `unarmed` only when real attack/task modifiers exist | `droid_integrated_weapons` when weaponized; `droid_task_optimization` when routine-based | Mere appendage possession or item count does not establish role specialization |
| Mounted weapon / powered weapon interface | `offense_melee`, `offense_ranged`, `weapon_empowerment`, `damage` | `droid_integrated_weapons`; `droid_power_management` for energy surges | Respect integrated status, active mount, weapon proficiencies and specific talent conditions |
| Droid armor / shields / ion protection | `armor`, `defense`, `shields`, `ion`, `durability`, `resilience` | `droid_chassis_resilience` where specialized | Passive standard protective chassis may support a weak capability, not a strong identity anchor |
| Recharger, power reroute, power/condition tradeoff | `power_systems`, `resource_spend`, `condition_track`, `empowerment`, `recovery` if exact | `droid_power_management` | No generic `power` tag just for having an internal battery |
| Repair/diagnostic/internal tool support | `repair`, `self_repair`, `mechanics`, `jury_rig`, `medical` only when appropriate | `droid_task_optimization` or `droid_chassis_resilience` if specialized | Repairing droids via Mechanics is not the same as healing organics via Treat Injury |
| Droid Commander class/talents | `command`, `ally_support`, `teamwork`, `action_economy` | `droid_command` | Resolve actual Droid Commander class levels and exact acquired talents |
| Independent Droid class/talents | `modification`, `reliability`, `resilience`, `skills` as supported | `droid_autonomy`, `droid_reprogramming`, `droid_power_management` when specific | Class access is not evidence that unchosen talent effects are owned |
| Selected droid-only feat/talent | Every mechanically grounded existing tag from the 190 ontology | One/more of ten proposed only with rule-specific warrant | Never auto-tag all droid-only content with all `droid_*` categories |

### Mandatory part metadata (read, don't invent)

A proposed evidence projection should receive resolved records conceptually shaped like:

```json
{
  "partId": "canonical-existing-part-id",
  "sourceAuthority": "droid-installed-component-resolver",
  "sourceKind": "installedLedger",
  "category": "sensor",
  "slot": "sensor.primary",
  "installed": true,
  "enabled": true,
  "active": true,
  "origin": "stock-grant-or-player-added-when-known",
  "ruleEffects": ["actual-effect-reference"],
  "tags": ["only-ontology-approved-existing-or-new-tags"],
  "evidenceKind": "capability | access | investment | active-use",
  "provenance": "canonical-part-id + exact-rule-reference"
}
```

This is a **conceptual read-only evidence DTO**, not a request to create a second installed-component store or persist a duplicate equipment truth. Verify the repo's actual property names, `getDroidPartDefinition` metadata, and effect schema before coding. A missing origin/installation state should be marked `unknown`, not automatically assumed to be player choice or active.

---

## 5. Droid-aware interpretation of ability scores (critical)

### No universal STR-for-CON swap

**Correct rule:** For a standard nonliving droid, `CON` does not exist. **STR is used for Fortitude Defense** (Core, p. 145; droid traits in Chapter 11). Other uses must be checked individually. A droid with STR 16 does not automatically count as an organic with CON 16 for Endurance, class HP or prerequisites.

The ability profile must support a genuinely **not-applicable** value, not `10` and not `0`:

```js
// Illustrative policy, not production code or a second ability authority.
organic.abilities = { str: 12, dex: 16, con: 14, int: 12, wis: 12, cha: 10 };
droid.abilities   = { str: 16, dex: 16, con: null, int: 12, wis: 12, cha: 10 };
// derived Fortitude for droid uses STR according to the authoritative rule.
// Generic survival/Endurance archetype matching does NOT silently use STR as CON.
```

A new **ability-evidence adapter** should expose (1) present ability axes, (2) actual derived defense values, (3) legal skills, and (4) special substitutions **with an exact printed-rules origin**. For droid `con`, return `not_applicable` and omit that axis **with explicit normalization** from the denominator; do not award its expected points and do not penalize it as if the droid had poor CON. Fortitude defense may still yield a legitimate `durability`/`defense` capability signal where the archetype considers that derived statistic.

Do not mistakenly remove all `endurance` relevance for droids; an actual trained Endurance skill and specific droid Endurance mechanics remain evidence. Conversely, do not create a fictitious ability-based `endurance` tag merely because STR is high.

### Runtime seam to audit

The current `tag-signal-engine.js` has a `scoreAttributeRealization()` path with a `con` axis for `survivability`/`endurance`-style candidate tags, while `getAbilityValue()` can fall back to `10` for absent values. This is a **potential mismatch**, not proof of a current live-scoring outcome. Audit which callers still use it and replace the faulty assumption *in the shared scoring path*, rather than adding a local droid bonus or a competing duplicate calculation.

Do not restore legacy `ability_con` archetype semantic tags: Phase 12A removed typed ability tags from the canonical semantic lane. Ability priorities stay in typed archetype mechanics.

---

## 6. Scoring design: common archetype, conditional evidence interpretation

### Conceptual evaluation pipeline

```text
Canonical actor + current progression draft
  |
  +-- Actor/rules mode resolver (ordinary organism, standard droid, special hybrid)
  +-- Canonical class, ability, skill, feat/talent and legality authorities
  +-- Existing installed-component resolver + droid part definitions
  +-- Actual active equipment / weapons / processor / locomotion state
  +-- Degree, size, chassis, creation method and stock-vs-playable context
  |
  v
Normalized actor capability evidence (canonical IDs + provenance + applicability)
  |
  +-- Exact feat/talent/class/skill evidence
  +-- Existing 190-tag semantic evidence
  +-- Approved droid-specific refinement tags (up to ten)
  +-- Access-only vs default-granted vs deliberate investment vs actual use
  +-- Not-applicable ability channels (e.g. CON)
  |
  v
ONE shared archetype compatibility / route / identity scorer (297 records)
  |
  +-- Hard legality exclusions (separate from affinity)
  +-- Evidence deduplication and domain caps
  +-- Applicable-axis normalization, not missing-CON punishment/bonus
  +-- Primary/supporting tag treatment from central scoring policy
  +-- Normalized common scale for organic and droid users
  |
  v
Ranked archetypes + evidence breakdown + honest explanation + next legal options
```

### A recommended qualitative scoring model

- **Eligibility gate:** Can this actor legally follow the route? Hard blocked routes must not be presented as currently legal, even when tags fit.
- **Exact match channel:** Acquired canonical feat/talent and skill investments linked to an archetype are more authoritative than broad tags. Prestige/class route legality and the acquisition timeline remain independently validated.
- **Typed capability channel:** Actual attributes, trained skills, fortitude/defense, active equipment and confirmed droid subsystems; compare applicable axes only. Class is a structural signal, not a semantic tag.
- **Semantic refinement channel:** Existing canonical tags plus approved new droid tags improve specificity; primary vs supporting strength is defined on the archetype relationship, not inferred from whether the item came from a droid.
- **Evidence strength:** `access` (port lets you attempt an action), `grant` (stock hardware), `investment` (trained skill/feat/talent/selected part), `repeated_or_advanced_commitment` (multiple distinct supporting decisions). These are policy **categories**, not baked-in per-archetype weight numbers.
- **Independent evidence cap:** The same part or talent must not contribute several unrelated additive boosts merely because it has several closely related tags. Group co-occurring tags as one source contribution for scoring, while still displaying all informative tags.
- **Domain normalization:** Prevent droids from outscoring organics simply because they have dozens of part objects. Cap or normalize by domains: class, attributes, skills, feats/talents, equipment/components, and contextual route evidence; calibrate centrally after shadow tests.
- **No global `droid` multiplier:** Droid type is context. A droid with only ordinary built-in systems should rank similarly to an equivalent organic character; a genuinely heavily customized chassis should influence recommendations where its mechanics materially affect the role.
- **Stable scales:** Output [0,1] *affinity-style* normalized scores if desired, but do not display them as statistically calibrated probabilities of the character's identity. Keep a separate legality/access label and explanation confidence/evidence completeness.
- **No forced identity:** The highest archetype is advisory; preserve multiple paths, hybrid builds, and manual choice.

### A careful ranking formulation (not final weights)

For archetype `a`, define domain scores over **legal, applicable evidence**:

```text
S(a, actor) = NormalizeApplicableDomains(
  ExactReferenceAlignment(a),
  ClassRouteAndProgressionAlignment(a),
  RealizedAbilitiesAndSkills(a, actor),
  CanonicalSemanticMatch(a, actor),
  VerifiedEquipmentAndDroidSubsystemMatch(a, actor)
)
```

`NormalizeApplicableDomains` is centrally calibrated and must distinguish `not_applicable` from `missing_evidence`. There is **no per-droid-archetype hand-authored numerical multiplier**. A droid-specific subsystem domain can explain how skills are achieved, but cannot simply be added as a sixth full-weight domain to inflate scores.

### Worked comparison — Scout / stealth-oriented identity

**Both builds:** Scout 4, Stealth trained, development in reconnaissance/field survival. The following affinities are purely hypothetical for demonstrating output; they are **not** calculated from the current repository:

| Evidence | Organic Scout | Droid Scout |
|---|---|---|
| Class | Scout 4 | Scout 4 |
| Abilities | DEX 16, CON 14 | DEX 16, STR 16, CON **absent** |
| Skills | Stealth, Endurance (trained where legal) | Stealth, Endurance (trained if legal) |
| Defenses | Ordinary CON-based Fortitude | STR-derived Fortitude, according to droid rules |
| Base movement | Ordinary organism movement | Actual locomotion package (walking, wheeled, hovering, etc.) |
| Chassis / size | Species and size traits | Degree/size/stock chassis package |
| Specialized systems | General gear | A verified active optical/sensory/mobility/stealth part, **only if a published part actually grants the effect** |
| Example scored narrative | Pathfinder / Hunter / Survivalist | Pathfinder / Hunter / Survivalist remain candidates; a droid-specific enhancement may strengthen the particular stealth/mobility branch |

**What should change:** The droid should not receive a nonexistent `CON` score or automatically trade STR for Endurance. Its size-granted Stealth bonus, active mobility systems, actual trained skill, and selected mechanical upgrades can legitimately provide **alternative evidence** of the same scout role. If the droid invested heavily in specialized sensor/data-link support instead, the rank could drift toward a recon/technical specialization — *not* automatically toward a new "Droid Pathfinder" archetype.

**What should not change:** Simply being a fourth-degree or small droid must not artificially produce "Hunter 0.95"; one standard sensor suite cannot count as five independent talents; a generic integrated comlink cannot equate to slicing expertise.

---

## 7. Explainability: make tag evidence useful without more archetypes

The character-facing recommendation should answer **what**, **why**, and **what next**, rather than showing a wall of opaque tags.

**Suggested presentation (illustrative):**

> **Pathfinder — strong mechanical match (illustrative affinity 0.84)**  
> **Identity evidence:** Scout 4; trained Stealth; relevant active movement features.  
> **Droid-specific evidence:** An installed/enabled locomotion enhancement provides the documented movement benefit; the droid's small chassis contributes a rules-based Stealth size bonus (**baseline**, not player investment).  
> **Ability interpretation:** DEX contributes to Stealth; Fortitude uses STR for this droid. CON is **not applicable**, not zero.  
> **What did not count:** Spare inactive sensor; built-in comlink; default droid type.  
> **Next legal developments:** Show actual eligible skill, feat/talent or component options, with prerequisites/costs and source pages.

**Compact tags/chips for user education:**

- **Identity tags** (semantic and archetype-aligned): `stealth`, `survival`, `recon`, `droid_locomotion` if certified and truly evidenced.
- **Context badges** (not semantic tags, zero identity weight): `Droid`, `2nd Degree`, `Small`, `Stock Astromech`, `Wheeled`, `Heuristic Processor`.
- **Evidence labels:** `Trained`, `Feat`, `Talent`, `Installed & Active`, `Chassis Grant`, `Prerequisite Only`, `Unavailable / Offline`.
- **Rules notes:** condition-specific functionality, active system requirements, exact prerequisites, and why a score changed when a part is installed/removed.

**Recommendation explanations must be auditable:** every scored contribution should link to its canonical actor fact, part ID, feat/talent ID, rule or derived field and a human-readable reason. Show missing evidence and block reasons; do not silently transform missing tags into speculative positive signals.

---

## 8. Concrete implementation sequence and deliverables

This roadmap is intentionally **read-only first**, before any migration of live score behavior. Each phase has an explicit output and stop condition.

### D0 — Baseline freeze / repository census

1. Pin current branch/commit. Read the 190-tag ontology, Phase 12B archetype data, current feat/talent semantic authority, live suggestion consumers, and all current droid authority modules.
2. Audit all actor droid variants (PC, NPC, converted stock, follower, custom, stock chassis, cybernetic/Shard special cases). Identify actual `degree`, `size`, `chassis`, `installedSystems`, active states and derived attributes.
3. Trace existing 297-archetype ranking call paths, including any legacy `class-archetypes.json`, bias fields, `ArchetypeAffinityEngine`, `tag-signal-engine`, Mentor, and V2 chargen screens. Identify one planned single-owner scoring boundary.
4. Inventory current droid parts by canonical part ID and feat/talent restrictions. Do not assume every record is mechanically certified or presently runnable.

**Outputs:** status/call graph; dependency and ownership matrix; part-by-part available-evidence census; baseline snapshot/fixtures. **Gate:** no second authority and no unexamined live scorer.

### D1 — Semantic ontology adjudication (ten candidates)

1. For each of the ten candidates: compare its meaning against all 190 existing definitions, current tag use, canonical feat/talent rule texts, and item/part mechanical effects.
2. Produce a source-backed **positive / negative evidence rubric** and exact assigned-record list (feat/talent ID, part ID, printed page).
3. Decide `ACCEPT_NEW`, `USE_EXISTING`, `ALIAS_ONLY` or `REJECT` per candidate. Do not equate syntactic novelty with semantic value.
4. If approved, revise the single existing ontology authority with definition, implications, usage rules, retired aliases and validation tests. Preserve existing 190 IDs and semantic meanings.

**Outputs:** ontology decision table; up-to-ten approved tags; frozen extension manifest and provenance. **Gate:** 0 unresolved ontology collisions or unowned interpretations.

### D2 — Typed droid fact & applicability adapter (no scoring)

1. Add a small, **read-only** projection using existing droid trait, degree, size, mode and component authorities; do not write any droid actor state.
2. Treat `con` as absent for standard droids; explicitly distinguish special rule variants and missing facts. Use canonical effective ability/defense calculations, not raw guesses.
3. Resolve `installed/enabled/active`, part category/slot, integrated-vs-held distinction, primary-vs-secondary locomotion, selected processor and any actual restriction/state.
4. Carry precise source/provenance for creation-time stock grants, deliberate upgrades and actual temporary capabilities where it can be proven. Mark ambiguous origins as unknown.
5. Stock-statblock mode: do not reconstruct a level-up intent history from frozen printed totals. It may have statblock capability display and non-mutating descriptive suggestions, but **no invented player investments**.

**Outputs:** deterministic `DroidCapabilityEvidence` pure read model and fixtures. **Gate:** same actor and rules state always yield identical evidence; conflicting installed records raise diagnostics, not score inflation.

### D3 — System and content tag projection

1. Define exact mapping of each mechanically effective part category to canonical old/new semantic tags. Tag definitions originate in ontology, not duplicated object literals in five UI modules.
2. Populate/verify flat semantic tags on already certified feats/talents using canonical IDs, not search-by-name; retain exact rules/provenance and approved owner decisions.
3. Infer dynamic evidence from **mechanical effect identifiers**, not free-text description regexes. Distinguish a port that grants *access* from a feature that improves *success*, timing, targeting, etc.
4. Deduplicate by canonical component/feature identity across ledger, embedded item, and chassis draft. Deduplicate a single mechanical benefit even if represented in several technical sources.
5. Validate old 190-tag hard implications and any new adopted implications; no unknown, retired or nonsemantic labels in semantic fields.

**Outputs:** mapping authority, source-by-source tag projections, coverage/gap report, pure projection tests. **Gate:** 0 false owned capabilities, 0 unlicensed tags, 0 duplicate part counting.

### D4 — Applicable ability and skill interpretation

1. Make the shared scorer consume the system's **actual typed abilities and derived defenses**, with three states per axis: present, legitimately not applicable, unresolved.
2. Correct the missing-CON/fallback-10 hazard wherever still live. STR affects the Fortitude-derived defense for droids, **not** every CON-dependent role/feat/skill.
3. Derive skills from class/background/chassis grants and actual trained skills using the corrected class SSOT (not stale progression skill lists).
4. Distinguish rule-based size Stealth bonuses, inherent grants, and trained/selected Stealth improvements as separate evidence provenance; avoid double scoring the same Stealth modifier.
5. Respect skill restrictions associated with basic/heuristic processors and feats/talents affecting untrained skill use.

**Outputs:** typed applicable-ability adapter, organic/droid comparison tests and special-case rules tests. **Gate:** never manufacture CON or grant a skill/feat through tagging.

### D5 — Shared archetype scoring integration

1. Evolve the **existing** archetype scoring authority to consume `DroidCapabilityEvidence` and normal organic evidence through one common normalized channel.
2. Maintain exact refs > certified semantic evidence > context, separate from hard class/feat/talent/part eligibility.
3. Centralize the strength treatment of access vs grants vs selected/learned/active investments. Prevent baseline hardware and multiple same-source tags from dominating.
4. Normalize applicable domains and score range, with specific protections against a part-rich droid counting as ten independently specialized choices.
5. Keep primary/supporting relationships curated on the 297 archetypes. Add a droid-specific tag to an archetype only where owner-certified identity logic actually warrants it; **do not** auto-add droid tags to every organic-accessible role.
6. Preserve exact canonical reference hierarchy, class-independent archetypes, legal skill/feat/talent routing and stable archetype IDs. No new droid archetypes required for this phase.

**Outputs:** shared score implementation under feature flag; explicit per-domain contribution traces; no mutation of actors. **Gate:** droid and organic actors use same scorer API and stable comparable scale.

### D6 — Explainability / player UI

1. Render up to three recommended archetypes, their score/affinity **as a relative heuristic, not probability**, and a compact list of strongest actual reasons.
2. Separate semantic identity tags from typed fact badges (size, degree, chassis, processor, locomotion). Show which part/feat/talent contributed and whether it was a default grant, selected improvement, or active capability.
3. Explain substitutions/exclusions: "CON not applicable; STR used for Fortitude only"; hide unsupported statements about trained Endurance, survival, stealth, or slicing.
4. Expose blocked/pending capabilities and the actual next **legal** class, feat/talent, skill or equipment decisions. Recommendations remain advisory; do not silently install systems.
5. Stabilize score explanation under V2 sheet rerenders; don't conflate currently offline system status with permanent character-identity loss.

**Outputs:** V2 presentation contract, example snapshots, accessibility/label QA. **Gate:** each displayed match reason has a verifiable source.

### D7 — Shadow scoring and calibration

1. Run old and proposed scorers side-by-side on a locked fixture corpus without changing live recommendations. Compare ranks, scores, contribution provenance, and whether correct legal options are recommended.
2. Include matched organic/droid pairs with equivalent player investment, plus variants differing only in degree, size, a stock grant, one selected part, or a disabled part.
3. Identify per-domain imbalances (e.g. numerous component tags artificially overpowering trained skills/talents). Adjust **central scoring policy**, not 297 hand-authored weights.
4. Explicitly test whether each approved new tag changes at least one legitimate ambiguous classification or explanation *without harming* obvious matches. If not, remove/retain as non-scoring diagnostic metadata rather than inflate ontology.
5. Owner-review adversarial cases and rank inversions. Only then enable new scorer behind guarded rollout and remove superseded legacy scoring authority when all readers have migrated.

**Outputs:** before/after shadow benchmark; owner-approved central weight policy; rollback path; signed acceptance report. **Gate:** no unexplained ranking regressions or illegal recommendation leaks.

### D8 — Production activation and convergence

1. Target one branch/PR with precise commit, migration manifest, schema/ontology changes, tests, updated docs and exact diff.
2. Run existing validations for archetypes, feats/talents, droid installation/state, chargen, legal progression, and V2 UI; require deterministic read-back.
3. Activate in the canonical suggestion entrypoint once accepted. Remove competing temporary/legacy scoring lanes when safe. **Do not maintain two independently authoritative score calculators.**
4. Verify in live Foundry v13 after merge: create organic and droid PCs, install/remove parts, advance levels, inspect recommendations and explanations.

**Outputs:** merged code only after explicit implementation authorization; release note and QA evidence. **Gate:** SSOT and score ownership converge, not merely "tests pass." 

---

## 9. Targeted test corpus (minimum)

| Fixture | Expected result / failure prevented |
|---|---|
| Organic Scout 4: high DEX + CON, Stealth + Endurance investment | Existing relevant Pathfinder/Hunter/Survivalist candidates remain; CON considered normally |
| Droid Scout 4: high DEX + STR, real trained Stealth/Endurance | No fake CON; STR counts for Fortitude only; archetypes remain comparable |
| Small droid vs Medium identical chosen build | Correct published size effects; size-only bonus not treated as multiple purchased Stealth investments |
| 1st-degree droid with no medical training | First-degree does not force Doctor archetype or medical talent ownership |
| 4th-degree droid without specialized combat investment | Fourth-degree does not force Soldier/Assassin archetype |
| Battle droid with integrated powered weapon + Weapons Power Surge | Correct `droid_integrated_weapons` and `droid_power_management` evidence; respects mounted-power rule |
| Droid with handheld blaster only | `ranged` where supported, **no** integrated-weapon claim |
| Astromech with scomp link, no Slicer talents | Data-link access captured; no unearned `slicing` expertise |
| Scomp Link Slicer and legal link | Actual Slicer features receive `slicing`/droid refinement according to exact source |
| Same part in `installedSystems` and embedded item | One canonical part contribution, not two |
| Disabled/uninstalled/removed component | No active capability contribution; diagnostic explanation records why |
| Basic vs heuristic processor, with appropriate skill state | Untrained-skill restrictions/gateway respected; no retroactive training |
| Turn and Burn without qualifying locomotion | Illegal/inapplicable route blocked; tag cannot authorize it |
| Small/Medium size + explicit alternate locomotion | Actual configured speed and legal movement hooks; no assumed terrain bypass |
| Droid Commander with Remote Attack | Specific droid command evidence; ordinary Officer not automatically `droid_command` |
| Independent Droid with Sapience/selected specialization | Autonomy is grounded in acquired features, not baseline droid type |
| Ion Shielding droid or cyborg | Exact prerequisites and source-specific use; semantic tag doesn't force droid-only eligibility |
| Droid requiring Mechanics repair / organic medical healing | Each uses relevant legitimate recovery semantics; no "Treat Injury heals all droids" leakage |
| Stock-imported frozen NPC vs converted playable droid | Statblock mode does not invent level-by-level investment history |
| Shard/other explicitly exceptional shell | Use precise published actor rules; no blanket no-CON or Force conclusions |
| Droids with many generic bundled parts | No high match score solely due to inventory volume / duplicate descriptor tags |

**Mandatory property tests:** stable output under item reorder; installed-vs-embedded duplicate invariance; `unknown` != `false` != `not_applicable`; canonical-ID-only matching; no unknown ontology tags; no unavailable component counted as selected; consistent scorer range; actor not mutated by scoring; primary/supporting preserved; no hard implication regressions; organic results unchanged except explicitly approved shared-scoring corrections.

---

## 10. Questions requiring owner adjudication before coding

1. Which of the ten `droid_*` refinements truly differ from the 190 ontology enough to deserve canonical membership? Demonstrate at least two real mechanically distinguishable use cases for each accepted tag.
2. Should generic **stock grants** affect archetype affinity at all, or only explain capabilities and reduce route cost? Suggested initial policy: **access only / weak context**, with meaningful affinity reserved for real investment and actual specialization.
3. Should currently disabled components affect **identity** (a character specialized in them) differently from **current usability**? Suggested answer: preserve historical investment, but show equipment-dependent recommendations as temporarily unavailable and do not count active-only effects.
4. Do size and degree deserve any *direct* archetype weight? Suggested answer: **none**; their real published modifiers, access gates, and granted capabilities can influence the right downstream channels.
5. How should exceptional constructs, Shards and cyborgs be classified? Resolve using certified per-rule capability flags rather than a universal `actor.type` heuristic.
6. What score calibration and rank-shift threshold constitutes a successful rollout? Choose after shadow benchmarks, not before evidence exists.

### Recommended decision

**Approve the architecture direction, not blind implementation of ten extra tags.** First certify the ontology additions against the existing **190** concepts; then build the read-only droid capability adapter and update the **single shared** archetype scorer to use typed, provenance-backed droid rules. Make degree, size, chassis, and parts visible and explanatory without turning them into new archetypes or fake semantic tags. Preserve canonical mechanics and legality as the final authorities.

---

## 11. Read-only audit and delivery checklist

- [ ] Pinned repository ref, ontology hash, archetype SSOT hash, and 297-record count.
- [ ] All ten candidate tags cross-compared with 190 definitions and current feat/talent classifications.
- [ ] Source-backed feat/talent/part assignment with page/ID provenance; owner adjudication complete.
- [ ] No generic degree, size, `droid` identity, comlink or default chassis automatically mistaken for specialization.
- [ ] Droid no-CON and Fortitude substitution obey printed rules; no implicit CON=10 fallback.
- [ ] Stock models and player builds distinguished.
- [ ] Installed, enabled, active state resolved through existing component authority; one part counted once.
- [ ] Canonical skill/class/feat/talent/part prerequisites remain outside semantic scoring.
- [ ] Existing 190 semantic tags and applicable new tags work together without unknown or retired strings.
- [ ] Scores comparable across organic/droid actors; no "more parts = more identity" bias.
- [ ] V2 UI explains score, underlying exact evidence, chassis/degree/size context, and next legal steps.
- [ ] Shadow comparison and all targeted cases pass; owner approval before changing production scoring.
- [ ] One authority for actor calculations, one for installed parts, one ontology, one archetype SSOT, one score policy.

**Status at handoff:** Design document only. No actor-data migration, semantic ontology mutation, repository commit, or runtime scoring change was performed in preparing it.


---

## 12. Rolling addition — droid-exclusive archetype candidates (2026-11-02)

**Decision state:** `DESIGN_CANDIDATES_ONLY — NO NEW ARCHETYPE RECORDS, TAGS, OR SCORING CHANGES APPROVED`. This section extends, rather than replaces, Sections 0–11. Existing 297 class-independent archetypes remain the comparison authority. The proposals below are **possible new identities, specializations, or descriptive build styles**, not published SWSE character classes, feats, or archetypes.

### 12.1 Why industrial droids are a genuinely interesting gap

A droid can plausibly specialize in **lifting cargo**, **breaking down derelict ships**, **boring tunnels**, **distributing power**, or **turning installed tools into weapons**. These roles are recognizable through mechanical *combinations* rather than simply a droid degree or a job title. They also give a fifth-degree labor droid meaningful paths beyond "strong Soldier" and "generic Mechanic."

**Published touchpoints that justify exploring these roles (not proof of ready-made heroic builds):**

- *Scavenger's Guide to Droids*, p. **11**: the stock **Labor Droid Chassis** grants +2 STR / −2 INT, appropriate starting systems, and **Heavy Lifting** (reroll a Strength check or Strength-based skill check, keeping either result). That is a concrete *chassis grant*, not an earned talent and not automatic proof of a Loadlifter archetype.
- *Scavenger's Guide to Droids*, **Feats**, pp. **22–25**: **Slammer**, **Pincer**, and **Tool Frenzy** give mechanically distinct physical-appendage combat options, subject to their exact prerequisites. They support a tool-weaponized "scrapheap bruiser" concept much more specifically than high STR alone.
- *Scavenger's Guide to Droids*, droid examples: **KM1 Mining Droid** (mining-shield/stability/tool systems), **DT-16 Light Construction Droid modification**, **Capital Ship Scrapper modification**, and **PLNK-Series Power Droid** (power recharge, ammunition source, vehicle shield support). These give rich *concept inspiration*. **KM1/DT-16/PLNK/annihilator statistics or modifications do not automatically become legal heroic PC abilities**; the text explicitly says **PLNK droids and annihilator droids cannot be played as droid heroes**. Reconstruct playable concepts from approved chassis/classes/parts/feats/talents only.
- The printed droid modification examples include a **cargo hauler**, **magnetic hull-crawling ship scrapper**, **industrial-spy unit**, and **field repair/repurposing** workflows. These are models of what a droid may become, but the suggestion engine must evaluate the actual legal character state, not award the entire published NPC's custom abilities because its name resembles an archetype.

### 12.2 Duplication audit against the 297 existing archetypes

The actual **Phase 12B semantic curation authority** already contains the identities below. Treat them as established; do not create duplicates with decorative "Droid" suffixes.

| Already existing ID | Existing identity | Why this matters for the new proposal |
|---|---|---|
| `scavenger_droid` | **Scavenger Droid** | **Already directly satisfies "Scav Droid."** Curated primary: `droid`, `jury_rig`, `mechanics`, `repair`, `survivability`, `tech`. Focus on its component evidence and possible *build expressions*, not a second record. |
| `scavenger` / `salvager` | Scavenger / Salvager | Broad collecting/survival vs equipment/mechanical salvage; a new Shipbreaker needs hull-dismantling specificity beyond these. |
| `salvage_engineer` | Salvage Engineer | A dismantling/repair specialist already exists. Cutting a derelict's hull and manipulating ship-sized wreckage may be distinctive, but require concrete new capability evidence. |
| `repair_droid` | Repair Droid | A general repair identity is already canonical; do not add "Maintenance Droid" purely as a renamed repair specialist. |
| `mechanic` / `droidsmith` | Mechanic / Droidsmith | Technical maintenance/droid modification already covered. "Mobile Fabricator" only earns a new identity if its chosen fabrication systems and action/timing profile are truly different. |
| `prospector` | Prospector | Exploration/search for valuable deposits already covered. A **Tunnel Borer** must focus on *excavation and machinery*, not only finding resources. |
| `disaster_responder` / `search_and_rescue_specialist` | Disaster Responder / Search-and-Rescue Specialist | Existing rescue roles; a hazard-work droid must show specialized machinery or droid-only rescue capabilities rather than mere environmental immunity. |
| `combat_engineer` / `demolitions_specialist` | Combat Engineer / Demolitions Specialist | An industrial breaker is not a new archetype just because it carries explosives or tools. |
| `tactical_droid` / `droid_commander` | Tactical Droid / Droid Commander | Coordination of other droids is already covered; "Foreman Droid" may be better as a noncombat expression of Droid Commander rather than a duplicate. |
| `assassin_droid` / `battle_droid_veteran` / `slicer_droid` / `pilot_droid` / `medical_droid` / `protocol_droid` | Existing specialized droid identities | The catalog already knows a number of droid-only roles. The expansion should target **missing industrial mechanics**, not reopen these identities. |

**Provenance:** Current repository `data/audits/archetype-phase-12b-semantic-curation.json` (read-only inspection on `main`, 2026-11-02), plus Phase 12B closeout. Name/ID comparisons here are grounded in the actual curated authority; no changes to its 297 identities have been made.

### 12.3 Candidate shortlist — what I would consider adding

**Priority describes value for an eventual archetype identity audit, not approval to insert a record.** All labels are working names.

| Candidate (working ID) | The player fantasy | Distinctive mechanical evidence to demand | Existing canonical tags worth investigating | Proposed droid refinements **only if certified and earned** | Verdict |
|---|---|---|---|---|---|
| **Loadlifter / Cargo Hauler** (`cargo_loadlifter`) | "I'm the giant warehouse loader / cargo mule who can move anything." | Actual load/carry capabilities, STR-check rerolls, appropriate manipulators, cargo handling and stability upgrades; distinguish inherent labor chassis grants from specialized upgrades. | `droid`, `equipment`, `durability`, `movement`, `mechanics` **only if** their defined mechanics apply | `droid_task_optimization`, `droid_chassis_resilience` if specific additional effects warrant them | **HIGH — potential new parent or specialization**. Best fit for user's loader idea. |
| **Shipbreaker / Hull Rigger** (`shipbreaker_droid`) | "I crawl across dead Star Destroyers cutting them into salvage." | Magnetic hull travel, climbing/positioning, actual cutting/welding tools, handling separated sections, repair/salvage or demolition mechanics; active chassis system combinations. | `mechanics`, `repair`, `equipment`, `movement`, `climb`, `modification`, `tech` as actually supported | `droid_locomotion`, `droid_integrated_weapons` **only** for mechanically weaponized cutting systems | **HIGH — compelling candidate** if it ranks differently from Salvage Engineer. |
| **Tunnel Borer / Excavator** (`excavation_droid`) | "I am an enormous tunneling machine that digs the team's way in or out." | Burrower-drive capabilities, excavation/drilling parts, underground movement, terrain access, work stability and relevant mechanics; no invented universal burrow speed. | `movement`, `mobility`, `mechanics`, `survival`, `equipment`, `durability` when substantiated | `droid_locomotion`, `droid_task_optimization` if mechanically justified | **HIGH — candidate** with a distinct movement+industrial-work signature. |
| **Scrapheap Bruiser / Wrecking Droid** (`scrapheap_bruiser`) | "A junkyard labor droid turned pit fighter, smashing enemies with its claws and welding tools." | Specific acquired Slammer/Tool Frenzy/Pincer or other legal appendage attacks; integrated tool/weapon state; grappling or condition effects from actual rules. | `unarmed`, `melee`, `grapple`, `damage`, `condition_track`, `equipment` where exact | `droid_integrated_weapons`, `droid_chassis_resilience` when proven | **HIGH — candidate**. Different from a generic Soldier/Battle Droid because appendage/tool conversion is the signature playstyle. |
| **Power-Distribution / Generator Droid** (`power_support_droid`) | "I'm the walking reactor that keeps everybody's gear and vehicles running." | Player-legal installed power-transfer/refueling/shield-recharge capability, repeated investment in resource supply, actual action/rate rules and supported targets. | `power_systems`, `support`, `ally_support`, `shields`, `equipment`, `resource_recovery`, `mechanics` if exact | `droid_power_management`, possibly `droid_task_optimization` | **MEDIUM-HIGH — conditional candidate**; strong theme, but first prove a legal heroic implementation rather than copying PLNK NPC abilities. |
| **Hazard Recovery / Rescue Machine** (`hazard_recovery_droid`) | "I go into the vacuum, radiation, and collapsing factory to pull people out." | Actual lifting/extraction tools, dedicated sensors, locomotion/access systems, repair/recovery aid; **not** universal droid immunities alone. | `ally_support`, `recovery`, `sensors`, `movement`, `repair`, `survivability` as justified | `droid_locomotion`, `droid_chassis_resilience`, `droid_task_optimization` where exact | **MEDIUM — probably first test as a droid-specific expression** of Disaster Responder. |
| **Mobile Forge / Assembly Platform** (`mobile_fabricator_droid`) | "I'm a rolling workshop with multiple tool arms, fabricating and repairing in the field." | Multi-tool utility beyond default appendages, dedicated fabrication/repair systems, programmable task/action specialization and actual legal proficiency. | `crafting`, `mechanics`, `modification`, `equipment`, `repair`, `tech` | `droid_task_optimization`, `droid_reprogramming` if truly supported | **MEDIUM-LOW — likely expression** of Droidsmith/Mechanic/Repair Droid unless it has proven unique mechanics. |
| **Industrial Foreman / Droid Crew Boss** (`industrial_foreman_droid`) | "I command a team of loaders and assembly drones in worksite operations." | Actual droid command/control abilities, coordination of other droids, networked equipment, meaningful ally actions; not job title or mere leadership. | `command`, `leadership`, `teamwork`, `ally_support`, `network`, `support` | `droid_command`, `droid_data_link` | **LOW as a new identity** — likely an industrial **variant** of `droid_commander` or `tactical_droid`. |

**Special treatment for "Scav Droid":** `scavenger_droid` **already exists**, so the recommended next action is to create informative **suggestion explanations / optional build recipes**, for example **Scrapyard Picker** (perception, salvage), **Junk-Tech Reclaimer** (jury-rig, repair, parts), and **Raxus Scrapper** (installed industrial tools). These are **displayed substyles**, not extra archetype IDs unless distinct, mechanically supported roles later pass the nonduplication gate.

### 12.4 A high-value distinction: loader is a role, Labor Droid is a chassis

Do not make `labor`, `fifth_degree`, `large`, or `high_str` an automatically scored archetype semantic tag. The stock **labor chassis** comes with baseline lifting capability, but a deliberate *Loadlifter* identity should be recognized through specialization beyond that baseline (additional load-bearing upgrades, manipulators, handling-related feats/talents/skills where legal and mechanically supported, or consistent real use if runtime evidence is trustworthy).

**Useful candidate explanation — illustrative, no real score calculated:**

> **Loadlifter — strong match.** You're a fifth-degree labor droid with the chassis' Heavy Lifting reroll. Your selected cargo equipment and heavy-duty appendages further specialize you in material handling. **Baseline context:** labor chassis and STR package. **Chosen evidence:** installed active load-handling systems and any certified upgrades. **Not counted:** a mere warehouse job title, a disabled component, or equipment listed only in inventory. **Next:** legal improvement options that enhance load transport, manipulation or durability.

For a droid with the same chassis but **Slammer, Tool Frenzy, integrated powered tools and combat feats**, **Scrapheap Bruiser** should plausibly outrank Loadlifter. A third same-chassis droid with repair and jury-rig feats/talents may instead fit the already-existing **Scavenger Droid** or **Repair Droid**. The deciding factor is **chosen mechanical capability**, not which industrial chassis name appears on the sheet.

### 12.5 Does the current tag vocabulary describe industrial identities well enough?

Probably **partially**, but do not alter the ontology without evidence.

- The existing 190-tag concepts already cover substantial overlap: `droid`, `equipment`, `mechanics`, `repair`, `crafting`, `modification`, `movement`, `power_systems`, `durability`, `grapple`, `unarmed`, `ally_support`, `sensors`, and `command`.
- The ten **previously proposed** `droid_*` tags describe recognizable refinements such as locomotion, systems durability, tool-weapon attacks, power routing and task optimization. They are not yet adopted or mechanically mapped; reusing them here is **conditional**.
- A potential **unrepresented typed capability** is *material handling* (lifting/carrying, powered gripping, hauling, cargo stabilization). There is **no authorization** to invent a new tag `cargo_handling` or `droid_loader` now. First determine whether evidence from Heavy Lifting, carrying capacities, cargo manipulators and installed components can live in a typed **capability axis** read by the shared scorer; only reopen the frozen ontology if there is compelling repeated content across multiple independent published rules and a demonstrated misclassification.
- **Never tag a generic claw or welder as `droid_integrated_weapons`** unless the exact component/feat supports weapon use. Likewise, never tag all labor droids `droid_chassis_resilience` merely because the standard chassis has armor.
- **Noncombat recommendations are first-class.** The scorer should not overvalue attack features over hauling, repair, power support, excavation or rescue. Measure actual archetype discrimination through shared typed evidence; do not fabricate a new numeric per-archetype bias to make a favorite concept rank higher.

### 12.6 Proposed identity admission test (before making the 298th archetype)

A candidate should become a **new archetype record** only if all six questions can be answered **yes**:

1. **Distinct play fantasy:** A player can clearly describe the playstyle independently of chassis or profession label.
2. **Distinct mechanics:** At least **two independent**, published and PC-legal feat/talent/part/skill or trait interactions support that identity (the count is a proposed QA bar, not a RAW rule).
3. **No better existing home:** The proposal cannot be explained adequately as an existing archetype with a droid-specific equipment/build profile.
4. **Class independence:** It can be described independently from a single heroic class, even if some routes are more practical than others; it is not "fifth-degree Soldier" as an identity.
5. **Legal build demonstrable:** Construct one **legal, editable level-1** starting direction and one **legal progressed** example without borrowing non-playable NPC abilities or assuming optional GM rules.
6. **Shadow-scoring separation:** When run next to the most similar existing archetypes, it ranks highest for its signature build **without stealing obvious matches** from Scavenger Droid, Salvage Engineer, Repair Droid, Droid Commander, etc.

If not, classify as an **EXISTING_ARCHETYPE_EXPRESSION** or **BUILD_RECIPE**. A build recipe may still offer a name, description, recommended components and next legal advancements, with no new SSOT archetype identity.

### 12.7 Suggested first approval batch

**My recommended initial design review:**

1. **Loadlifter** — most distinctive missing workhorse identity; verify lift/cargo evidence first.
2. **Shipbreaker** — memorable capital-ship salvage fantasy; distinguish from Salvage Engineer.
3. **Tunnel Borer** — mechanically distinctive locomotion + industrial work.
4. **Scrapheap Bruiser** — strong droid-specific feat/appendage combat story.

**Next, contingent on playable mechanics:** **Power Support Droid**. **Keep as named build expressions for now:** **Scav Droid** (already `scavenger_droid`), **Mobile Forge**, **Hazard Recovery Droid**, **Industrial Foreman**.

These priorities are **proposed**, not a request to immediately increase the 297-record corpus. Some may fail the identity admission test and be more useful as recipes than as archetypes; that is a desirable outcome.

### 12.8 Follow-on plan for this rolling document

- **D9 — Droid-archetype identity gap adjudication:** For each candidate, collect canonical feat/talent IDs, component IDs, source/page references, class routes and legality. Compare it directly to existing curated records in Phase 12B. Owner decides `NEW_ARCHETYPE`, `SPECIALIZATION_OF_EXISTING`, `BUILD_RECIPE_ONLY`, or `REJECT`; nothing is added by default.
- **D10 — Droid industrial capability matrix:** Inventory every relevant *legal* labor, cargo, clamp, magnetic, tool, drilling, power, shield, fabrication and salvage component. Link each to the existing 190 semantic tags and to proposed new refinements **only after** ontology approval; maintain typed degree/size/chassis data separate from tags.
- **D11 — Comparative shadow fixtures:** Build mechanically legal contrasting samples: vanilla labor droid; specialized Loadlifter; tool-fighting Scrapheap Bruiser; mining Tunnel Borer; ship salvage Shipbreaker; existing Scavenger Droid; and generic organic industrial Mechanic/Salvager. Assert that size/degree/default grants alone do not force an archetype and that new identities earn their match through independent investment.
- **D12 — UI expression layer:** Show the **archetype** and an optional **droid-specific descriptor** without changing ID, e.g. `Scavenger Droid — Junk-Tech Reclaimer` or `Droid Commander — Industrial Foreman`. These descriptors must be truthful, derived from verified evidence and clearly marked as style labels, not new classes or permissions.

### 12.9 Additional acceptance fixtures

| Fixture | Expected behavior |
|---|---|
| Stock fifth-degree labor chassis, ordinary claws, no specialized upgrades | Explain Heavy Lifting and STR package as baseline; **do not** force Loadlifter or award multiple specialized tags. |
| Labor droid with verified hauling manipulators and load-specific work systems | Candidate Loadlifter gains its distinct evidence; no fake generic Strength→all-industrial tag boost. |
| Labor droid with Slammer and Tool Frenzy | Existing combat options recognized; Scrapheap Bruiser candidate should be plausible even without a higher size category. |
| Droid with magnetic hull systems, cutters and salvage tools | Shipbreaker gains real hull-working evidence; distinguish Salvager and Salvage Engineer in side-by-side scoring. |
| Droid with only a burrower-drive catalog entry, not an installed/active one | No Tunnel Borer drilling evidence; no invented underground speed. |
| Droid with valid burrower drive and actual excavation specialization | Movement/industrial work recognized without conflating combat melee damage with digging role. |
| A PLNK stock statblock | Do not claim player-legal Power Support Droid feats/abilities from the NPC statblock. |
| Playable droid with independently verified power-transfer functionality | Power Support candidate may count exact support mechanics, with rate/action/target restrictions. |
| Existing `scavenger_droid` with salvage + jury rig + repair evidence | Continue recommending the **existing** Scavenger Droid ID, optionally with a specific descriptive substyle. |
| Industrial foreman commanding other droids | Prefer already curated Droid Commander when identity evidence is droid command, not factory-management flavor. |

### 12.10 Decision log / next review

- **Preserve:** all existing 297 archetypes, especially `scavenger_droid`, `salvager`, `salvage_engineer`, `repair_droid`, `droidsmith`, `droid_commander`.
- **Propose for deeper certification:** Loadlifter, Shipbreaker, Tunnel Borer, Scrapheap Bruiser.
- **Conditional:** Power Support Droid.
- **Build expressions first:** Junk-Tech Reclaimer, Mobile Forge, Hazard Recovery Droid, Industrial Foreman.
- **Do not implement yet:** new IDs, 10 proposed ontology tags, optional cargo-handling ontology tag, independent droid scorer, or statblock-derived heroic powers.
- **Rolling-document state:** appended design review; all earlier sections retained; owner review and source-level legal build certification still pending.

---

## 13. Rolling addition — five Star Wars-specific droid jobs / archetype candidates (2026-11-02)

**Decision state:** `FIVE_NEW_DESIGN_CANDIDATES — NONE PROMOTED TO CANONICAL ARCHETYPE`; all Sections 0–12 remain effective. These five are **additional** to the industrial candidate group in Section 12, not substitutes. The full working candidate pool now has **five industrial headline candidates + five Star Wars-job headline candidates**; Section 12 also retains its lower-priority descriptive expressions. The **297 canonical identities remain unchanged**.

### 13.1 Why this category deserves a separate review

Industrial droids provide a physical-work fantasy; these five emphasize **recognizable jobs from Star Wars settings**: a Jedi sparring partner, a podracing/shipyard pit mechanic, a scout/probe, an Imperial interrogator, and a starship-attached saboteur. The recommendation engine should be capable of saying more than "Droid / Soldier / Mechanic," but should not create an archetype ID just because a recognizable droid model has a name.

**Important source-derived distinctions (verified against the uploaded sourcebook TXT transcription; reconcile page images and exact IDs before production certification):**

- ***Scavenger's Guide to Droids*, Duelist Elite Training Droid, printed p. 88:** The **Duelist Elite** is expressly permitted as a droid hero. Its published **Lightsaber Sparring Partner** modification describes reprogramming its weapon training to use lightsabers. The printed stock/model profile and its special-purpose programmed actions are **not** a blanket grant to a newly constructed PC; use the actual creation route and modifications. This is our **strongest positive source anchor** for the user's Lightsaber Training Droid concept.
- ***Clone Wars Campaign Guide*, BCA-11/X Lightsaber Practice Droid:** The **BCA-11/X** is expressly **not** playable as a droid hero. Its lightsaber-resistant construction is design inspiration, **not** a license to copy its statistics, damage reduction, equipment, or special abilities onto a PC.
- ***Jedi Academy Training Manual*, Lightsaber Training Regimens:** Sparring Practice and Training Remote are distinct published activities. A **training remote is equipment**, not automatically a heroic droid character or a Force-user talent. The Force-regimen benefits are earned by the qualifying practitioner under their printed conditions, **not** automatically by the droid operating the remote.
- ***Clone Wars Campaign Guide*, Serv-O-Droid Pit Droid:** The pit droid **is** expressly available for droid-hero play. The printed model's unusual small-size carrying behavior and compact, folded shutdown form must be sourced to that **model**, not generalized to all small or second-degree droids.
- ***Threats of the Galaxy*, TO-D Interrogation Droid:** The TO-D **is not** available as a droid hero. Its investigative/intimidating theme can inform a *separately legal* player-designed model, but the NPC-only package is not player-owned content.
- ***Scavenger's Guide to Droids*, Probe Droid Chassis, printed p. 12:** The probe chassis is an explicit **hero creation route**, with surveillance-oriented starting traits. Its baseline Perception/locomotion does not establish deliberately acquired reconnaissance expertise.
- ***Threats of the Galaxy*, Pistoeka Buzz Droid:** The printed buzz droid **cannot** be played as a droid hero. The narrative of hull-attachment sabotage is useful, but its missile deployment, NPC attack options, and programmed swarming cannot be imported as free heroic capabilities.
- ***Scavenger's Guide to Droids*, V2-Series Commando Droid, EVA Shipjacker modification:** The V2-Series **can** be played as a droid hero; its printed EVA Shipjacker modification gives a more credible *published modification route* for a playable hull-sabotage concept. Verify model, modification, skills, equipment, check DCs, action costs, and any GM limitations before a legal build is certified.

### 13.2 Existing-archetype collision check — candidates must beat these alternatives

The **Phase 12B 297-record curation authority** already includes the following records. Do **not** duplicate these with a decorative `droid_` prefix or assume absence of a droid-specific label means a role is unsupported.

| Working job concept | Existing canonical identities it competes with | Specific differentiation to prove |
|---|---|---|
| Lightsaber Training Droid | `educator`, `jedi_instructor`, `weaponsmith`, `warrior`, `jedi_battlemaster` | **Non-Force droid** teaching live martial technique through credible sparring and assistance; not merely a Droid Soldier holding a lightsaber, and not a Jedi who can use Force regimens. |
| Pit-Crew Droid | `mechanic`, `repair_droid`, `combat_engineer`, `pilot_droid`, `shipwright` | Time-critical **vehicle/pod/starship service**, tools, aid, repair and race/flight support; not just a smaller Repair Droid. |
| Recon Probe Droid | `recon_scout`, `scavenger_droid`, `spy`, `investigator`, `survivalist` | Active **sensor collection, transmission, tracking and remote reconnaissance**; not just using the probe chassis or the Scout class. |
| Interrogation / Forensic Interview Droid | `investigator`, `forensic_specialist`, `counterintelligence_officer`, `enforcer`, `protocol_droid` | Specialized **behavioral observation and interview control** with actual legal sensors and interaction mechanics; a sadistic name or stun weapon is not enough. |
| Hull Saboteur / Buzz-Droid-Inspired Ship Parasite | `saboteur`, `demolitions_specialist`, `combat_engineer`, `shipbreaker_droid` (Section 12 candidate), `assassin_droid`, `boarding_marine` | **Active external-hull attachment, EVA/mobility, and targeted vessel-system disruption**; not merely salvage or generic demolition. |

**Note:** `shipbreaker_droid` is an **unapproved Section 12 candidate**, not an existing canonical SSOT ID. It is listed for candidate-to-candidate separation as well as canonical overlap review.

### 13.3 The five proposed identities

| # / working ID | Star Wars fantasy / signature play | Exact evidence to look for (not automatically granted) | Existing 190-tag domains to review | Conditional Section 2 `droid_*` refinements | Provisional outcome |
|---|---|---|---|---|---|
| **1 — Lightsaber Training Droid** `lightsaber_training_droid` | A Duelist Elite-derived training partner that spars with Padawans, challenges Jedi technique, assists practice, and can be an entertaining foil in or outside combat. | Published, legally acquired **Lightsaber Sparring Partner** modification where applicable; actual lightsaber proficiency and attack/training support; melee technique; legally acquired aid-another or sparring capabilities; check model/class/equipment constraints. | `droid`, `lightsaber`, `melee`, `weapon_training`, `ally_support`, `teamwork`, `support` **only for actual effects**; perhaps `skills` or `reliability` where mechanically grounded | `droid_reprogramming` for the actual training-program alteration; `droid_task_optimization` only where specific mechanics reduce actions/improve routines | **HIGH — strongest distinctive lore-backed candidate**. Compare against Educator and non-Force martial mentor styles. |
| **2 — Pit-Crew / Podracer Service Droid** `pit_crew_droid` | A compact, frantic racing-pit mechanic keeping a podracer or freighter alive through emergencies, precision diagnostics, and fast field repairs. | **Playable Serv-O-Droid Pit Droid** model traits; trained Mechanics, legal repair/vehicle-relevant feats/talents; appropriate active tools; explicit vehicle support or action-cost changes where printed. Unusual carrying and fold-up are model context, not evidence of skill mastery. | `droid`, `mechanics`, `repair`, `vehicle`, `equipment`, `ally_support`, `teamwork`, `pilot` **only if actual piloting**, `action_economy` **only if effect changes actions** | `droid_task_optimization`, `droid_data_link` when installed systems truly perform the function | **MEDIUM — fun job; initially test as Repair Droid / Mechanic build expression**. Promote only if race/vehicle-service specialization separates in shadow scoring. |
| **3 — Recon Probe / Deep-Space Survey Droid** `recon_probe_droid` | A stealthy sensor platform mapping hostile territory, collecting telemetry, and scouting terrain or ship approaches without risking organic life. | Actual **probe chassis** as origin/context; selected sensors beyond defaults, active recording/transmission/remote interfaces, trained Perception/Stealth where legal, and reconnaissance/observation talents; track live component state. | `droid`, `recon`, `sensors`, `detection`, `perception`, `awareness`, `stealth`, `tracking`, `network`, `movement` **when directly supported** | `droid_data_link`, `droid_locomotion`, `droid_targeting` **only for explicit targeting improvements** | **MEDIUM-HIGH — plausible candidate**; do not grant scouting identity for chassis alone. |
| **4 — Interrogation / Forensic Interview Droid** `interrogation_droid` | A sinister Imperial investigator or a legitimate forensic interview automaton specialized in detecting inconsistencies and controlling an interview environment. | **Custom legal build**, not copied TO-D: Perception, Deception/Persuasion or investigation capabilities where lawfully acquired, sensor/inference upgrades, nonlethal/control options if chosen, and explicit mechanically supported information-gathering or social pressure. | `droid`, `investigation`, `perception`, `detection`, `persuasion`, `deception`, `intimidation`, `control`, `nonlethal`, `sensors` **only when justified** | `droid_data_link`, `droid_task_optimization` only for actual sensing/analysis/action mechanics | **MEDIUM — compelling antagonist/PC concept, but likely an Investigator/Forensic Specialist expression** absent independent mechanics. Do not assume torture is necessary for the role. |
| **5 — Buzz-Droid-Inspired Hull Saboteur** `hull_saboteur_droid` | A compact droid that reaches an enemy ship, adheres to the hull and disables external equipment or critical systems while pilots try to shake it loose. | Legal **EVA Shipjacker**-style modification or certified propulsion/hull-grip parts; active magnetic systems; actual sabotage/Mechanics/demolition capabilities and prerequisites; explicit starship-scale movement/attachment conditions. No copying Pistoeka NPC missile/swarms. | `droid`, `sabotage` **is not in the frozen 190 ontology—DO NOT ADD AS CANONICAL TAG**, `mechanics`, `modification`, `movement`, `climb`, `positioning`, `equipment`, `vehicle`, `damage` and `trap` **only if applicable** | `droid_locomotion`, `droid_integrated_weapons` if a mounted cutter is actually an attack option | **HIGH-CONCEPT / CONDITIONAL**. Strong visual role but complex scale/legality; compare closely against Saboteur and Section 12 Shipbreaker. |

**Tag-policy correction:** The prose term *sabotage* describes behavior but is **not** among the current frozen 190 tag strings. Represent supported mechanics with actual canonical tags and exact references. **Never add `sabotage` or `droid_instruction` as an unapproved canonical tag merely to make a candidate score.** Likewise, `weapon_training`, `network`, `sensors`, `command`, and other present tags retain their exact definitions; no keyword-based auto-tagging.

### 13.4 Lightsaber Training Droid — a proposed showcase build expression

This is the first **worked design example**, not a certified legal build. It is particularly compelling because the source already explicitly supports a playable training-droid model and a lightsaber-sparring modification.

```text
Duelist Elite heroic model or otherwise legally constructed droid
    + verified lightsaber sparring modification / appropriate actual proficiency
    + legal active sparring weapon / safe practice gear
    + acquired melee training and actual assist/teaching capability
    + context: training partner to Jedi or other duelists
    = player-facing candidate "Lightsaber Training Droid"

NOT:
    Jedi class or Force Sensitivity because the character holds a lightsaber
    every lightsaber-form or Force-regimen benefit
    a BCA-11/X NPC-only cortosis package
    an automatic teaching bonus from "training" in the model name
```

A droid may be a **lightsaber instructor's training partner** without being a Force-sensitive Jedi. When a Jedi character performs *Jedi Academy Training Manual* sparring practice or training-remote regimens, **the Jedi's own eligibility and check** determine the published regimen outcome; no scoring projection should treat the droid as the recipient of that Force benefit.

**Example explanation only, with no invented match percentages:**

> **Lightsaber Training Droid — promising match.** You have a verified training-droid model, an acquired lightsaber-sparring programming modification, and legal lightsaber/melee capabilities. Your actual sparring support affects allies' training, so this identity fits more precisely than a generic melee fighter. **Context only:** your fourth-degree chassis. **Not counted:** any Force ability you do not possess or a lightsaber-practice NPC's special defenses.

**Candidate distinction fixture:** Two identically built fourth-degree droids, both proficient with lightsabers: one has actual support/sparring investments; the other invests entirely in attacking enemies. The former should match a Training Droid style more strongly; the latter should instead favor an appropriate existing melee/Soldier/Warrior identity.

### 13.5 The droid model is not the archetype: five integration rules

1. **Source classification first.** Mark each observed character/model as `playable-model`, `npc-only-model`, `custom-heroic-build`, or `stock-chassis-heroic-build` using the published creation rules. These are **typed context facts**, not semantic tags. In particular: **Duelist Elite and Pit Droid can be heroic models; BCA-11/X, TO-D, and Pistoeka are explicitly NPC-only examples**.
2. **No automatic role from chassis or job.** Fourth-degree and probe chassis, Small size, a lightsaber proficiency, a scomp port, or a model's occupation can establish *capability/access*, but must not overwhelm actual chosen feats/talents/systems when determining archetype identity.
3. **Re-use the existing canonical part read model.** For training modules, workshop tools, remote interfaces, stun equipment, extra sensors, magnetic systems and external-hull hardware, resolve **actual installed, enabled, active** parts through `resolveInstalledDroidComponents()` and canonical part definitions. Never add separate "job equipment" persistence.
4. **Preserve class/legal authority.** Don't assume a droid must take Soldier/Scout/Noble levels just because its catalog job mentions combat/scouting/interviews. The class path comes from legal progression; feats, talents, component rules, and Force limitations must be resolved independently.
5. **Use the 190 + proposed ten framework honestly.** Only assign approved existing tags (and later owner-approved droid refinements) to actual mechanics; compare candidate archetypes using the shared central scoring pipeline described in Sections 3–8. Do not author numeric archetype biases to force these five into the top results.

### 13.6 Proposed recommendation UI: informative droid roles without identity inflation

The engine can show two levels of information:

```text
CANONICAL ARCHETYPE: [existing 297-record ID + name]
DROID SPECIALIZATION / BUILD EXPRESSION: [evidence-derived display name]
WHY: [exact feats/talents + active parts + skill/class evidence]
CONTEXT: [creation route, model/chassis, degree, size]
LEGAL NEXT STEPS: [available options only, checked by existing progression engine]

Examples before approving a new archetype:
- Warrior / appropriate melee archetype — "Lightsaber Sparring Partner"
- Repair Droid — "Podracing Pit-Crew Technician"
- Recon Scout — "Probe and Telemetry Specialist"
- Investigator — "Forensic Interview Droid"
- Saboteur — "Hull-Attached Systems Disruptor"
```

The five role names are **proposed player-facing descriptors** and must not masquerade as canonical feat/talent/class names. This approach lets players see droid-specific identity even if all five ultimately fail the stricter Section 12.6 archetype-admission test.

**Desired explanation:**

> **Recon Scout — Probe and Telemetry Specialist.** Primary evidence: trained Perception, a chosen reconnaissance talent, and an active advanced sensor system. Supporting evidence: an enabled long-range data interface. Context: fourth-degree probe chassis. Baseline hovering and Perception training are identified as grants, not double-counted. Suggested next step: a legal sensor or stealth option, if your actual build qualifies.

### 13.7 Source/legality certification tasks before a new record or sample build

| Candidate | Required source and legality proof | Highest-risk confusion |
|---|---|---|
| Lightsaber Training Droid | *Scavenger's Guide to Droids* Duelist Elite / Lightsaber Sparring Partner modification + *Jedi Academy Training Manual* regimens; canonical feat/proficiency and component IDs; a playable progression route | Mistaking BCA-11/X NPC abilities or Jedi-only Force regimen benefits for a droid's abilities. |
| Pit-Crew Droid | *Clone Wars Campaign Guide* Pit Droid playable declaration, model traits and fully legal heroic progression/equipment; compare `repair_droid` | Applying the pit model's Small-size carry exception and compact folding to all Small droids, or interpreting repair as instant/free action. |
| Recon Probe Droid | *Scavenger's Guide* probe chassis, legal actual sensors, source-linked skill/talent/parts; comparison versus `recon_scout` and `spy` | Probe chassis baseline automatically counting as expert stealth, tracking, recording or electronic warfare. |
| Interrogation Droid | *Threats of the Galaxy* TO-D inspiration **plus a separate legal custom/stock heroic build**; exact interrogation/social/sensor mechanics | Treating NPC-only intimidation/interrogation features as free player choices, or asserting generic Persuasion works exactly like a lie detector. |
| Hull Saboteur | *Threats of the Galaxy* Pistoeka as NPC-only inspiration **versus** playable *Scavenger's Guide* V2 Commando EVA Shipjacker; specific movement, hull, explosives, and scale rules | Copying buzz-droid swarm/missile deployment, assuming any magnetic feet grant starship-EVA attacks, or conflating noncombat Shipbreaker with hostile sabotage. |

Required for each new archetype adjudication: (a) exact candidate identity and differentiator; (b) **two independently certified, PC-legal mechanics** or a justified documented exception to that proposed QA threshold; (c) existing canonical tag evidence and proposed-refinement gaps; (d) exact component IDs + active-state evidence; (e) one legal level-1 or earliest legal concept and one progressed concept, where possible; (f) shadow-score comparisons against each named incumbent; (g) owner decision: `NEW_ARCHETYPE`, `SPECIALIZATION_OF_EXISTING`, `BUILD_RECIPE_ONLY`, or `REJECT`.

### 13.8 Additional shadow-scoring acceptance fixtures

| Scenario | Expected result |
|---|---|
| Unmodified Duelist Elite model, rapier proficiency, no lightsaber conversion | Do not claim it possesses lightsaber proficiency or tag its abilities `lightsaber` solely because the book discusses an optional modification. |
| Duelist Elite with the actual Lightsaber Sparring Partner modification | Recognize its *acquired* weapon-training change; do not also count lost pistol proficiency. Do not give it Jedi Force powers. |
| BCA-11/X NPC statblock dragged into a world | Do not present its printed NPC-only package as a legal heroic character template or grant a new heroic archetype route. |
| Duelist-derived combat droid without teaching/support evidence | Favor martial archetypes rather than automatically the Lightsaber Training Droid identity. |
| Playable pit droid with basic repair equipment and no special pit skills | Its model is context; generic Mechanic/Repair Droid may be the best actual archetype. |
| Pit-crew droid with truly earned rapid vehicle servicing / assistance mechanics | Support a "Pit-Crew Technician" expression; promote a new identity only if the exact mechanic combination separates from Repair Droid/Mechanic. |
| Stock probe chassis with baseline sensors and trained Perception | Probe role is explained but not over-scored as an elite reconnaissance identity; default grants remain low-intent context. |
| Probe with acquired advanced sensors, scouting talents and telemetry systems | Recon/observation identity increases because of actual independent choices and active equipment. |
| TO-D NPC-only profile, or custom droid merely carrying a stun baton | Do not create a legal interrogation template from the NPC profile or infer behavioral analysis from the weapon. |
| Custom legal investigative droid with verified observational, interview and control choices | Rank existing Investigator/Forensic Specialist and optional Interrogation expression from actual evidence; preserve nonlethal/legal route requirements. |
| Pistoeka buzz-droid NPC profile | Never grant PC missile-delivered swarm ability or ship-disabling attacks simply from being a buzz droid. |
| Heroically legal V2/other droid with approved EVA movement, ship adhesion and explicit sabotage features | Hull Saboteur expression has evidence; distinguish hostile sabotage from the Shipbreaker salvage role. |
| Any of five with disabled, duplicate or uninstalled signature hardware | No phantom duplicate evidence; only authoritative current state contributes. |

### 13.9 Owner decision worksheet and provisional priority

| Candidate | New 298+ SSOT archetype? | Best current representation | Next evidence action |
|---|---|---|---|
| **Lightsaber Training Droid** | **REVIEW FIRST — HIGH** | Melee specialist / Warrior with named droid sparring expression | Certify Duelist Elite + lightsaber conversion and support mechanics. |
| **Pit-Crew Droid** | **DEFER — MEDIUM** | `repair_droid` or `mechanic` + pit-crew expression | Identify a distinct legal rapid-service mechanic, not just the playable model name. |
| **Recon Probe Droid** | **REVIEW SECOND — MEDIUM-HIGH** | `recon_scout` + advanced probe expression | Inventory real sensor/data/stealth commitments beyond chassis baseline. |
| **Interrogation Droid** | **DEFER — MEDIUM** | `investigator` / `forensic_specialist` + interview expression | Separate permitted heroic abilities from TO-D NPC-only package. |
| **Hull Saboteur** | **REVIEW THIRD — CONDITIONAL HIGH** | `saboteur` + hull-sabotage expression; compare proposed Shipbreaker | Verify playable EVA Shipjacker path and starship interaction rules. |

**Recommended work order:** first lock all ten **job candidate briefs** (five industrial, five Star Wars-job), then run a joint side-by-side **identity-gap audit** against the same 297 existing archetypes. Do **not** preselect ten new archetypes. It is entirely acceptable for only two or three to pass and for the rest to become useful named build recipes. Then extend the component/tag semantic projection *once* to support all ten rather than building a separate rule path per job.

### 13.10 Rolling decision log

- **User-requested concept adopted for design review:** Lightsaber Training Droid.
- **Four additional Star Wars-role proposals:** Pit-Crew Droid, Recon Probe Droid, Interrogation/Forensic Interview Droid, Buzz-Droid-Inspired Hull Saboteur.
- **Published playable anchors:** Duelist Elite / lightsaber-sparring modification; Serv-O-Droid Pit Droid; generic stock Probe chassis; playable V2 Commando EVA modification subject to exact conditions.
- **Published NPC-only caution flags:** BCA-11/X, TO-D, Pistoeka. No NPC-only mechanical package may be assumed available to a heroic PC.
- **SSOT preserved:** no archetype IDs created, no final ontology tags added, no scored outcomes simulated as real, no engine/registry or sourcebook data changed.
- **Cross-section status:** Section 12 industrial archetypes and Section 13 Star Wars-job archetypes should be adjudicated together under the existing Section 12.6 six-part admission gate.

---

## 14. Rolling addition — exact feat/talent tag-target review and job-archetype integration (2026-11-02)

**Status:** `PROPOSED_CONTENT_TAG_DELTA — NOT APPROVED, NOT APPLIED`. This section is an **append-only continuation of Sections 0–13**, including all five industrial concepts and all five Star Wars-specific job concepts. It answers a distinct implementation question: **Which published feats, talents, class features and droid parts should contribute each proposed refinement, and how do those contributions help the ten candidate job expressions?**

**Important authority clarification:** The current semantic baseline is **190 canonical feat/talent tags**, not the historical 57-tag archetype vocabulary. The following `droid_*` tags are **not yet canonical**. A name in the tables below means **candidate for an *additional* tag after owner approval**, not instruction to overwrite that record's `system.tags` or reconstruct its existing tag array. All 190 existing ontology tags, their definitions, and hard implications remain untouched until an approved deterministic manifest states otherwise. The read-only source review below uses the uploaded *Scavenger's Guide to Droids*, *The Clone Wars Campaign Guide*, *The Force Unleashed Campaign Guide*, and *Knights of the Old Republic Campaign Guide* TXT transcriptions; PDF escalation and canonical-ID/production-state verification are mandatory before any actual write.

### 14.1 Canonical tagging rule, before making a manifest

For each row below, the final production manifest must contain:

```text
sourcebook + printed page + talent tree/feat section + canonical identity + canonical record ID
current finalTags (read from latest applicable repository authority/pack)
proposed additions (only approved new ontology tags)
existing 190-tag companions (retain / inspect / NEVER blindly infer)
verbatim mechanical evidence pointer + positive/negative rationale
prerequisite applicability (degree, size, class, parts, processor, droid/cyborg variant)
content classification (FEAT, TALENT, CLASS_FEATURE, SYSTEM_PART, MODEL_MODIFICATION)
review status (EXACT_VERIFIED | PDF_REVIEW | OWNER_REVIEW | REJECTED)
```

**Do not confuse content types.** `Sapience`, `Independent Spirit`, and `Networked Mind` are **prestige-class features**; the *Lightsaber Sparring Partner* conversion is a **model modification**; `Cargo Hauler` and `Power Supply` below are **talents**. Never create fake feat/talent records simply to attach tags. A feature's semantic effect can be represented in the scorer's evidence projection even when it does not have `system.tags` as an item. If the feature is not already a structured rule/effect in the class authority, record an evidence gap rather than fabricating an item.

### 14.2 Published feats — proposed NEW tag additions

**Source shorthand:** `SGD` = *Scavenger's Guide to Droids* (feat chapter, pp. 22–25); `KOTOR` = *Knights of the Old Republic Campaign Guide*. Existing-tag examples below are **definition checks**, not claims about their currently persisted values. **The list is a proposal for a canonical-ID audit**, not a certified tag mutation manifest.

| Published feat | Source | Proposed NEW tag(s) | Existing 190-tag evidence to inspect / why | Guardrail |
|---|---|---|---|---|
| **Aiming Accuracy** | SGD | `droid_targeting` | `targeting`, `precision`, `setup`, `ranged`, `action_economy`: full-round aim improves one attack | Requires its actual droid feat/aim sequence; not all ranged attacks. |
| **Multi-Targeting** | SGD | `droid_targeting` | `targeting`, `setup`, `action_economy`: tracking an aim over several rounds while attacking other targets | Does not grant free attacks or automatic multi-target damage. |
| **Pinpoint Accuracy** | SGD | `droid_targeting` | `targeting`, `condition_track`/`control` as definition permits; depends on Aiming Accuracy | Only its exact altered aim/target effect, not every precision feat. |
| **Damage Conversion** | SGD | `droid_chassis_resilience` | `durability`, `damage_threshold`, `condition_track`: trade extra HP damage for avoiding condition decline | Do not apply to excluded area, ion or Force attacks. |
| **Droid Shield Mastery** | SGD | `droid_chassis_resilience`; **review** `droid_power_management` | `shields`, `action_economy`, `endurance`: faster automatic personal-shield replenishment | Requires an equipped shield generator; don't infer generic energy transfer. |
| **Ion Shielding** | SGD | `droid_chassis_resilience` | `ion`, `condition_track`, `defense`/`resilience` per frozen definitions | Also usable by eligible **cyborgs**; new tag never means droid-only legality. |
| **Erratic Target** | SGD | `droid_locomotion` | `mobility`, `movement`, `defense`: spend speed to improve Dodge | Hovering/flying locomotion is required, not any default movement system. |
| **Turn and Burn** | SGD | `droid_locomotion` | `movement`, `mobility`, `evasion`, `reaction` if actual rules justify | Uses particular installed locomotion; the Force Point option does not grant Force Sensitivity. |
| **Logic Upgrade: Skill Swap** | SGD | `droid_reprogramming` | `skill_substitution`, `skills`, `action_economy`: basic-processor skill-slot swapping | Swapped-in skill is **not** actually trained; never grant trained-only actions. |
| **Sensor Link** | SGD | `droid_data_link` | `sensors`, `network`, `perception`, `ally_support` if exact rule fits | Eligible cyborgs exist; linked sensor sharing is not generic slicing. |
| **Shield Surge** | SGD | `droid_data_link`, `droid_power_management` | `shields`, `vehicle`, `reaction`, `support`: direct-linked vehicle shield energy tradeoff | Must be linked and trained in Mechanics; consumes shield rating, with recharge limitation. |
| **Pincer** | SGD | `droid_integrated_weapons` | `grapple`, `melee`, `control`, `swift_action`: actual claw/hand appendage pin-and-crush chain | The appendages and Pin/Crush prerequisites must really be met. |
| **Slammer** | SGD | `droid_integrated_weapons` | `unarmed`, `melee`, `damage`, `damage_threshold`: multi-appendage crushing attack | Requires two suitable appendages, sufficient size and Strength. |
| **Tool Frenzy** | SGD | `droid_integrated_weapons` | `unarmed`, `melee`, `damage`, `defense`: weaponizing mounted tools at Reflex cost | **Real melee/ranged weapons do not qualify as tools** for this feat. |

**Feat non-target / owner-review set:**

- **Mechanical Martial Arts** (SGD): unarmed combat with mechanical appendages, but the ability does **not** require a chosen installed weapon/tool system. `droid_integrated_weapons` is **REVIEW**, not an automatic approval; its exact text may already be fully expressed by `unarmed`, `melee` and control/attack tags.
- **Distracting Droid** (SGD): relevant to an interrogation/control build, but its actual benefit is a Persuasion-vs-Will control effect; do **not** add `droid_command` merely because the feat name includes Droid.
- **Droid Focus** (SGD): bonuses scoped to a *selected degree of target droid*, not computerized weapon tracking; do **not** add `droid_targeting`.
- **Logic Upgrade: Self-Defense** (KOTOR): temporary defensive morale bonus; not evidence of resistance to programming or autonomous behavior. Retain its normal defense/morale evidence; **do not** add `droid_autonomy` based on its name.
- **Logic Upgrade: Tactician** (KOTOR): improves aid another against an enemy for an ally, **not specifically command of other droids**. Existing `ally_support`, `teamwork` or `target-designation` (as actually justified) may suffice. `droid_command` = **NO** unless its narrow definition is deliberately and explicitly changed with owner approval.

### 14.3 Published talents — proposed NEW tag additions

**Source shorthand:** `SGD` = *Scavenger's Guide to Droids* (droid degree / prestige additions, pp. 26–29); `CW` = *The Clone Wars Campaign Guide*, Droid Commander (pp. 42–44); `TFU` = *The Force Unleashed Campaign Guide*, Independent Droid / additional degree trees. Tree and sourcebook are required to disambiguate same-name talents.

| Published talent and owner | Source | Proposed NEW tag(s) | Directly supported mechanical reason / related existing tags | Review status |
|---|---|---|---|---|
| **Burst Transfer** — 2nd-degree | SGD | `droid_data_link`, `droid_task_optimization` | Faster Binary transfer between qualifying droids and reduced Use Computer Access Information time; `network`, `use_computer`, `action_economy` only if exact definitions fit | **HIGH** |
| **On-Board System Link** — 2nd-degree | SGD | `droid_data_link`, `droid_power_management` | While physically linked aboard a vehicle/ship, quicker power reroute/shield recharge; `vehicle`, `shields`, `power_systems` | **HIGH** |
| **Quick Astrogation** — 2nd-degree | SGD | `droid_task_optimization` | Reduced astrogation calculation time and action cost; `use_computer`, `action_economy`, `vehicle` when exact | **HIGH** |
| **Scomp Link Slicer** — 2nd-degree | SGD | `droid_data_link` | Specialized slicing options *while physically linked*; `slicing`, `use_computer`, `network` | **HIGH** |
| **Supervising Droid** — 3rd-degree | SGD | `droid_command` | Specific droid ally aid/command actions, with action grant; `ally_support`, `command`, `action_economy` | **HIGH** |
| **Just a Scratch** — 4th-degree | SGD | `droid_chassis_resilience` | Reactive damage reduction from applicable armored chassis; `armor`, `defense`, `durability`, `reaction` | **HIGH** |
| **Target Acquisition** — 4th-degree | SGD | `droid_targeting` | Explicit lock onto designated target for attack/damage bonuses; `targeting`, `target-designation` | **HIGH** |
| **Target Lock** — 4th-degree | SGD | `droid_targeting` | Reacquires prior target and improves Perception vs its Stealth; `targeting`, `perception`, `detection` | **HIGH** |
| **Weapons Power Surge** — 4th-degree | SGD | `droid_integrated_weapons`, `droid_power_management` | Damage dice increase **only for permanently mounted weapons using internal power**, with condition-track cost; `damage`, `power_systems`, `condition_track` | **HIGH** |
| **Durable** — 5th-degree | SGD | `droid_chassis_resilience` | Resists becoming disabled at the bottom of the condition track; `durability`, `condition_track`, `survivability` | **HIGH** |
| **Task Optimization** — 5th-degree | SGD | `droid_task_optimization` | Performs a chosen trained skill's application at lower action cost; `skills`, `action_economy` | **HIGH** |
| **Directed Action** — Override tree / Droid Commander | SGD | `droid_command` | Commands another droid to make an immediate specific skill check as a free action; `command`, `ally_support`, `action_economy` | **HIGH** |
| **Directed Movement** — Override tree / Droid Commander | SGD | `droid_command` | Grants a droid ally movement using commander's Intelligence where provided; `command`, `movement`, `ally_support` | **HIGH**; **NOT** `droid_locomotion` |
| **Remote Attack** — Override tree / Droid Commander | SGD | `droid_command` | Commands another droid's attack using commander's Intelligence where provided; `command`, `ally_support` | **HIGH**; **NOT** `droid_targeting` |
| **Full Control** — Override tree / Droid Commander | SGD | `droid_command` | Commands another droid to take a full attack under specified conditions; `command`, `ally_support`, `action_economy`, `full_attack` | **HIGH** |
| **Power Boost** — Specialized Droid / Independent Droid | SGD | `droid_power_management`, `droid_locomotion` | Power Surge-dependent boost to the installed locomotion system, with persistent condition cost; `power_systems`, `movement`, `condition_track` | **HIGH** |
| **Break Program** — Elite Droid / Independent Droid | SGD | `droid_reprogramming` | Linked Use Computer override of **another droid's** behavioral inhibitors; `use_computer`, `control` if exact | **HIGH**; `droid_data_link` **REVIEW** (link is a condition, not automatically a specialized interface enhancement) |
| **Scripted Routines** — Elite Droid / Independent Droid | SGD | `droid_task_optimization` | Preprogrammed attack/defense/skill scripts and action-cost changes; `skills`, `action_economy`, `defense` by option | **HIGH** |
| **Ultra Resilient** — Elite Droid / Independent Droid | SGD | `droid_chassis_resilience` | Reaction improving damage threshold via class level; `damage_threshold`, `durability`, `reaction` | **HIGH** |
| **Automated Strike** — Droid Commander | CW | `droid_command` | Commands droid allies to benefit from a Double Attack capability; `command`, `ally_support`, `teamwork` | **HIGH** |
| **Droid Defense** — Droid Commander | CW | `droid_command` | Int-based defensive bonus conveyed to droid allies; `command`, `defense`, `ally_support` | **HIGH** |
| **Droid Mettle** — Droid Commander | CW | `droid_command` | Grants temporary hit points to selected droid ally; `ally_support`, `survivability`, `command` | **HIGH** |
| **Expanded Sensors** — Droid Commander | CW | `droid_command` | Shares awareness/line-of-sight between droid allies via understood communications; `sensors`, `awareness`, `command` | **HIGH**; **NOT automatically** `droid_data_link` (no physical direct link required) |
| **Inspire Competence** — Droid Commander | CW | `droid_command` | Grants a droid ally attack bonus; networked ally gains specific processor equivalence; `ally_support`, `teamwork` | **HIGH** |
| **Maintain Focus** — Droid Commander | CW | `droid_command` | Grants droid allies faster Recover action; `command`, `ally_support`, `recovery`, `action_economy` | **HIGH** |
| **Overclocked Troops** — Droid Commander | CW | `droid_command` | Allows *networked* droid allies immediate movement; `command`, `movement`, `ally_support` | **HIGH**; **NOT** self-locomotion specialization |
| **Reinforced Commands** — Droid Commander | CW | `droid_command` | Increases bonuses given to commanded droid allies; `command`, `ally_support`, `empowerment` if definition permits | **HIGH** |
| **Defensive Electronics** — Autonomy / Independent Droid | TFU | `droid_autonomy` | Raises Will Defense against attempts to reprogram the droid; `will_defense`, `resilience` | **HIGH** |
| **Modification Specialist** — Autonomy / Independent Droid | TFU | `droid_reprogramming` | Removes ordinary penalties when reprogramming/modifying self; `modification`, `use_computer`, `mechanics` | **HIGH** |
| **Skill Conversion** — Specialized Droid / Independent Droid | TFU | `droid_reprogramming` | Sacrifices trained skill on self-reprogramming to obtain qualified Skill Focus; `skills`, `modification` where exact | **HIGH** |
| **Hotwired Processor** — Specialized Droid / Independent Droid | TFU | `droid_power_management` | Temporarily boosts processing/attack capability at persistent condition cost; `power_systems`, `empowerment`, `condition_track` | **HIGH** |
| **Power Surge** — Specialized Droid / Independent Droid | TFU | `droid_power_management` | Surge boosts melee, damage and speed; persistent condition cost; `power_systems`, `damage`, `movement` | **HIGH** |
| **Ion Resistance 10** — Autonomy / Independent Droid | TFU | `droid_chassis_resilience` | Specific damage reduction against ion attacks; `ion`, `damage_reduction`, `resilience` | **HIGH** |
| **Soft Reset** — Autonomy / Independent Droid | TFU | `droid_chassis_resilience` | Recovers from certain bottom-of-track disabling conditions; `condition_track`, `recovery`, `durability` | **HIGH** |
| **Repair Self** — Autonomy / Independent Droid | TFU | `droid_chassis_resilience` | Improves self-repair hit-point result; `self_repair`, `repair`, `recovery` | **HIGH** |
| **Combat Repairs** — 4th-degree | TFU | `droid_chassis_resilience` | Limited quick self-repair in combat; `self_repair`, `repair`, `action_economy` | **HIGH** |
| **Targeting Package** — 4th-degree | TFU | `droid_targeting` | Activates specific targeting software to improve near-range attacks; `targeting`, `precision`, `setup` | **HIGH** |
| **Environmentally Shielded** — 5th-degree | TFU | `droid_chassis_resilience` | Improved Fortitude Defense against environmental hazards; `defense`, `durability` | **HIGH** |
| **Power Supply** — 5th-degree | TFU | `droid_power_management` | Can power an E-Web or analogous weapon; expedites vehicle/starship reroute and shield recharge; `power_systems`, `support`, `shields` | **HIGH**; essential for the **Power Support Droid** concept |

**Additional talent review — meaningful droid jobs but not necessarily any of these ten new tags:**

| Talent | Source | Existing semantic meaning to preserve | Why no automatic new tag |
|---|---|---|---|
| **Cargo Hauler** — 5th-degree | TFU | Strength-based skill bonuses, **double carrying capacity**; industrial capability for Loadlifter | Not automatically `droid_task_optimization` (no action-speed change) or `droid_chassis_resilience` (not a defensive mechanic). This is a **core exact reference for `cargo_loadlifter`**, independently of the ten new tags. |
| **Heavy-Duty Actuators** — 5th-degree | SGD | Melee/unarmed Strength-damage enhancement; industrial strength / Scrapheap Bruiser potential | Not `droid_power_management` merely because actuators are mechanical; no actual power allocation rule stated. |
| **Load Launcher** — 5th-degree | SGD | Proficiency with throwing improvised objects and Strength-based range/damage; loadlifter / industrial combat | Existing `improvised_weapon`, `ranged`, `damage` may fully express it; not a permanently mounted weapon. |
| **Droid Smash** — 4th-degree | TFU | Strength-based melee weapon damage | Wielding a one-handed melee weapon is not by itself an integrated weapon system. |
| **Medical Analyzer**, **Science Analyzer**, **Triage Scan** — 1st-degree | SGD | `medical`, `science`, `treat_injury`, `knowledge`, `detection` where exact | Scientific/medical specialization already fits existing tags; do not invent `droid_medical`. |
| **Nuanced**, **Observant**, **Talkdroid** — 3rd-degree | SGD | `persuasion`, `social`, `perception`, `ally_support` where exact | Protocol/translation roles already have effective canonical tags. |
| **Computer Language**, **Computer Master** — Specialized Droid | TFU | `skill_substitution`, `use_computer`, `reroll`, `reliability` where exact | Do not tag as reprogramming or task-speed optimization solely because they involve a processor. |
| **Heuristic Mastery** — Elite Droid | SGD | `reroll`, `skills`, `reliability` where exact | Rerolling skill checks is not automatically task acceleration or programming change. |
| **Just a Droid** — Autonomy | SGD | `stealth`, `deception`, `reaction` where exact | Talent TREE membership is not proof of actual resistance to restraints or reprogramming. |

### 14.4 Relevant class features and physical systems (NOT feat/talent tag writes)

| Real feature/system | Published/context owner | Potential new projection | Classification guardrail |
|---|---|---|---|
| **Sapience** | Independent Droid prestige **class feature**, TFU | `droid_autonomy` | Behavioral inhibitor and restraining-bolt immunity; do **not** add a fake Talent Item. |
| **Independent Spirit** | Independent Droid prestige **class feature**, TFU | **None of ten by default** | Reaction-based bonus to defense; its name says independence but its actual effect is a defense bonus. |
| **Networked Mind** | Droid Commander prestige **class feature**, CW | `droid_command`; **review** `droid_data_link` | Special droid ally network with comlink-dependent line-of-sight; network is not proof of scomp/physical port. |
| **Lightsaber Sparring Partner** | Duelist Elite **model modification**, SGD | Existing `lightsaber`, `weapon_training`/proficiency effects when exact; **no new droid tag automatically** | Conversion gives lightsaber proficiency and removes pistol proficiency; no Force powers, Jedi class entitlement, or generic lesson-granting feature. |
| **Labor chassis Heavy Lifting** | SGD **stock chassis grant** | Exact Strength-check reroll fact; maybe `reliability` after ontology review | Default chassis trait: contextual baseline, **not** a selected Cargo Hauler talent. Do not double-count. |
| **Active power generator / power-transfer part** | Canonical droid part catalog | `droid_power_management` only if actual supply/reroute effect | PLNK NPC-only power features do not automatically become heroic PC part effects. |
| **Cargo manipulator / load-enhancement part** | Canonical installed part | Existing `equipment`, `skills`, `modification` only if documented; no automatic ten-tag mapping | Detect actual lift/load mechanics. This is a meaningful **future ontology gap candidate** but not an approved 11th tag. |
| **Burrower drive, magnetic feet/hands, jump servos** | Canonical installed part | `droid_locomotion` if the modification gives exceptional movement capability and is installed/active | Do not infer burrowing, hull travel, or climbing from size, degree or part name alone. |
| **Tool appendage, welding/cutting system** | Canonical installed part | `droid_integrated_weapons` **only** where it actually grants a combat application | Ordinary tool operation, cargo handling, cutting objects and repair work are not inherently attacks. |
| **Targeting computer or specific sensor enhancement** | Canonical installed part | `droid_targeting` when explicit targeting effect; otherwise existing `sensors` | Sensor perception, weapon targeting and network transfer are three distinct effects. |
| **Training hologram/module or programmed sparring routines** | Actual legal model/system if certified | Existing `melee`, `weapon_training`, `support`, `knowledge` if supported | Owning a training module never automatically grants ability to instruct or confer a regimen. |

**Important positive discovery for the industrial set:** *The Force Unleashed Campaign Guide* has the **Cargo Hauler** fifth-degree talent, which directly grants a Strength-based skill bonus and doubles carrying capacity. This is a stronger, earned signature for **Loadlifter** than fifth-degree identity or size. **Power Supply**, also in the fifth-degree tree, is a concrete player-talent path toward **Power Support Droid**. Neither should be replaced by borrowing an NPC statblock. **Load Launcher** (SGD) creates a different *improvised throwing* expression; do not mistakenly tag it as a mounted weapon. 

### 14.5 All ten rolling job-archetype candidates — exact feature seeds and relevant tags

**A role name is not a source of semantics.** These pairings describe *how to recognize a build from legal evidence*, not tags to assign to every candidate archetype by default.

| Proposed job / existing comparison | Strong mechanically specific feat/talent evidence | Installed component evidence that must be checked | Existing 190-tag domains | Potential NEW refinement(s) if approved |
|---|---|---|---|---|
| **Loadlifter / Cargo Hauler** vs `salvager`, `prospector`, `scavenger_droid` | **Cargo Hauler** (TFU), optionally **Load Launcher** (SGD), Heavy-Duty Actuators (SGD) where suited | Working cargo manipulators, appropriate lift/stability systems; stock Heavy Lifting grant recorded separately | `equipment`, `skills`, `reliability`, `improvised_weapon`, `mechanics` only as actually evidenced | **No mandatory new tag**. Consider later independent `material_handling`/industrial evidence gap only if the 190-tag vocabulary cannot express its signature. |
| **Shipbreaker / Hull Rigger** vs `salvage_engineer`, `scavenger_droid` | Actual salvage/repair and movement investments; **Slammer/Tool Frenzy only if weaponized** | Magnetic hands/feet, cutting tools, reach, active hull-adhesion, relevant vehicle scale/location | `mechanics`, `repair`, `climb`, `equipment`, `movement`, `modification` | `droid_locomotion`; `droid_integrated_weapons` only for genuine combat tools. |
| **Tunnel Borer / Excavator** vs `prospector`, `combat_engineer` | Industrial skill and selected terrain-access abilities; no invented universal tunneling feat | **Active burrower drive** and its printed movement/condition consequences | `movement`, `mobility`, `mechanics`, `survival` if earned | `droid_locomotion` |
| **Scrapheap Bruiser** vs `warrior`, `battle_droid_veteran` | **Slammer**, **Tool Frenzy**, **Pincer**, perhaps Heavy-Duty Actuators | Legal claws/hands/tools, mounting and weapon-active status | `unarmed`, `melee`, `grapple`, `damage`, `control` | `droid_integrated_weapons`; `droid_chassis_resilience` only on a separate defensive investment |
| **Power Support Droid** vs `repair_droid`, `combat_engineer` | **Power Supply** (TFU), **On-Board System Link** (SGD), possibly **Shield Surge** (SGD) | Actually installed and legal power linkage, active connectors and shield/vehicle interaction | `power_systems`, `support`, `ally_support`, `shields`, `vehicle`, `mechanics` | `droid_power_management`, `droid_data_link` if specific |
| **Lightsaber Training Droid** vs `warrior`, `melee` identities | **Legal Duelist Elite lightsaber-sparring conversion** + real sparring/teaching skill/talent evidence if present | Converted training module, real weapon proficiency after swap, actual training gear | `lightsaber`, `melee`, `weapon_training`, `support`, `skills` only from real benefits | **No mandatory new droid tag**; an instructional specialty is a separate unapproved ontology question, not implicit in holding a lightsaber. |
| **Pit-Crew Droid** vs `repair_droid`, `mechanic` | **Task Optimization**, **Quick Astrogation** only if role truly includes relevant checks; any legal fast vehicle-repair feature | Repair-tool appendages, accessible vehicle systems, deployed kit | `mechanics`, `repair`, `vehicle`, `skills`, `action_economy` | `droid_task_optimization`; `droid_data_link` if special servicing interface |
| **Recon Probe Droid** vs `recon_scout`, `spy` | **Sensor Link**, **Burst Transfer**, **Target Lock** only if combat/tracking relevant | Upgraded effective sensors/telemetry/comlink; separate default sensor grant | `sensors`, `recon`, `perception`, `network`, `stealth` only if earned | `droid_data_link`; `droid_targeting` only if actual acquisition/lock behavior |
| **Interrogation Droid** vs `investigator`, `forensic_specialist` | **Distracting Droid**, actual interrogation/investigation and social investment; **Break Program** only for explicitly droid-targeted programming interference | Certified scanners/recorders/control devices; do not borrow TO-D NPC abilities | `investigation`, `perception`, `persuasion`, `social`, `control`, `use_computer` | `droid_reprogramming` only when interfering with droid programming; **do not** treat ordinary interrogation as reprogramming |
| **Hull Saboteur Droid** vs `saboteur`, `shipbreaker_droid` | Legally obtained **Turn and Burn**, **Scomp Link Slicer** and approved sabotage options as applicable | Active hull traversal, legal slicing/explosive devices, explicit starship rules | `slicing`, `use_computer`, `movement`, `infiltration`, `modification`, `vehicle` when exact | `droid_locomotion`, `droid_data_link`; integrated weapon tag only if used |

**Do not turn the above ten proposals into ten new permanent archetypes.** Each must pass the admission test in Section 12.6. The display layer can expose a job-style descriptor under an existing canonical archetype with source-backed reasons. If a genuinely new identity is later certified, owner approval is required to add to the archetype SSOT and curate primary/supporting tags.

### 14.6 Required tag-by-tag impact report before approving any ontology extension

The audit should print, for **each of the ten** proposed tags:

1. **Existing 190-tag overlap:** all competing exact definitions, particularly `command`, `targeting`, `target-designation`, `sensors`, `network`, `modification`, `skill_substitution`, `action_economy`, `power_systems`, `durability`, `resilience`, `movement`, `mobility`, `shields`, `ion`, `repair` and `self_repair`.
2. **Published positive examples:** every candidate feat/talent above with sourcebook, printed page, tree, exact canonical identity, ID, owned mechanical benefit and prerequisites; **do not assume this list is complete** without a full droid content census.
3. **Negative examples / exclusions:** the five feat non-targets above; generic blasters, ordinary training, standard chassis grants, installed-but-disabled components, NPC-only modules, generic command not directed specifically at droids.
4. **What the new tag adds:** at least one evidence-supported distinction in ranking or player-facing explanation that cannot be expressed faithfully with the existing tag combinations alone. If only cosmetic, keep it as a typed droid-capability label or display role instead of expanding the ontology.
5. **Impact on existing authority:** whether a new tag is applied to **feat/talent semantic `system.tags`**, projected from a **class feature**, or derived from a **physical part effect**. Those are **three different update paths** and must not be merged into a single pack-edit script.
6. **Companion-tag and implication review:** retain existing tags, apply explicitly approved ontology implications, and ensure feats usable by cyborgs remain legal for cyborgs. One new droid refinement may coexist with general `targeting`/`command`/`power_systems` semantics when both are genuinely supported.
7. **Record-level write manifest:** `canonicalId`, book/page/tree, `beforeTags`, `addedTags`, expected `afterTags`, reason/provenance, and `beforeHash` / `afterHash` (or equivalent deterministic checksum) for every record selected. No fuzzy matching, no name-only writes, no broad wildcard application.
8. **Archetype-side follow-up:** inspect the existing 297 archetype identities/Phase12B certified primary/supporting relationships. A content-side addition does **not** automatically change a curated archetype's tag profile. Propose each optional archetype change separately with a specific signed owner ruling.
9. **Uniqueness and reversibility:** one tag source per exact published effect; no stacking by duplicate ledger/embedded item, no accidental inflation when equipment is merely possessed, and a reversible shadow-only comparison before production activation.

### 14.7 Addendum to the roadmap (Sections D0–D8)

Insert a **required D1.5: droid feat/talent/component content census** between D1 ontology adjudication and D2 evidence extraction. This is an amendment to the existing roadmap, not a new parallel implementation plan:

- Census every droid-exclusive or droid-focused published feat, degree talent, Droid Commander talent, Independent Droid talent, class feature and equipment/modification effect. Include cross-species/cyborg eligibility and model-only features. Start with the candidates above; **scan the entire canonical feat/talent authority** for additional true positives and false positives.
- Resolve printed page, tree and stable canonical identity from the final repository authority; compare latest `system.tags` / final authoritative tag payload against the certified 190 ontology, including any later production rollout.
- Produce **two separate outputs**: (a) a **design-only proposed tag delta manifest** (exact feature-to-tag decisions) and (b) an **evidence bridge schema** for class features and installed parts. Do not manufacture Item records to simplify ingestion.
- Apply approved content-tag mutations **only after** the owner signs the ontology + exact record manifest; do not automatically rewrite the already certified Phase 3/12 authorities in place. Use one authorized migration/overlay and prove idempotency and exact read-back.
- Shadow-score matched organic/droid builds under identical class/skill investment and varying chassis, degree, size and components. Verify that **Cargo Hauler** and **Power Supply** create stronger industrial matches than merely having fifth-degree status; verify the lightsaber training conversion expresses martial competence but not Force training.

**D1.5 acceptance gate:** Full droid-content candidate census complete; all proposed tag additions source/identity verified; old ontology preserved; no unsupported tag from tree/name/context; part and class-feature projections tested separately; 0 unreviewed direct production writes; baseline and rollback hash captured.

### 14.8 Rolling decision log / owner checkpoint

- **Section 12 and Section 13 remain the active ten-role design queue** (industrial 5 + Star Wars-specific 5), with other conditional variants recorded there; this section adds their **exact content evidence pathway**.
- **New high-value published findings:** TFU fifth-degree **Cargo Hauler** and **Power Supply**, CW **Overclocked Troops** / **Reinforced Commands**, and the SGD **Lightsaber Sparring Partner** model modification's actual pistol-to-lightsaber proficiency exchange.
- **Tag candidate list stays at TEN** for now. Do not silently add `droid_loader`, `droid_lightsaber_teacher`, `mining`, `shipbreaker`, `power_droid`, `interrogation_droid` or any degree/size/chassis labels to the frozen 190 semantic ontology.
- **Feat/talent mapping is a reviewed proposal**, not a verified production `beforeTags -> afterTags` manifest. Exact IDs, latest tag arrays, and every published page still require execution-time validation before they can be treated as ready-to-write changes.
- **No production changes**: no feat or talent `system.tags` changed, no class features or hardware changed, no new archetype records, no ontology extension and no scoring code modified by this document update.

---

## 15. Implementation agent handoff — phased execution, validation, Git delivery (2026-11-03)

**Purpose:** This is the execution contract for ChatGPT, Claude, or another repository agent. It turns Sections 0–14 into independently auditable implementation work. **This section authorizes a future implementation workflow, not an unreviewed mass rewrite.** At the time this document was added, all new droid tags, archetype additions, scorer changes, and feat/talent writes remain proposals. The existing 297-archetype authority and frozen 190-tag feat/talent ontology are the starting point, not artifacts to recreate.

### 15.1 First commands and non-negotiable rules

1. **Read the entire rolling document, including Sections 12–14 and D1.5.** Then inspect the *actual* repository state and all existing migrations, PRs, branches, and current tests. Never assume a historical file status is still current.
2. **Pin the exact starting revision:** report `git status --short`, current branch, `git rev-parse HEAD`, upstream, existing relevant PRs, and any uncommitted/unpushed work. Do not discard or overwrite unrelated user work; stop for an ownership decision if the tree is dirty or overlapping feature work exists.
3. Start from the **latest agreed integration base**. For the implementation, create a dedicated branch such as `feature/droid-semantic-archetype-scoring` (or use a preexisting owner-authorized implementation branch). **Do not work directly on `main`.** Create a **draft PR** for review when the first implementation commit is ready; do not auto-merge.
4. **SSOT is mandatory.** Consume `data/audits/talent-feat-phase3-final-ontology.json`, `data/archetypes.json`, canonical feat/talent IDs and final semantic authority, `scripts/domain/droids/droid-installed-component-resolver.js`, `scripts/data/droid-part-schema.js`, `scripts/engine/progression/droids/droid-trait-rules.js`, and `scripts/actors/droid/droid-mode-adapter.js`. Check newer authority versions at runtime. Do not introduce competing registries, a second droid archetype database, another part-identity resolver, or an independent droid-only scoring formula.
5. **Source first, semantics second, scoring third.** Read published benefit/prerequisites (TXT for searching; printed PDF when ambiguous), then certify meaning; compare to existing ontology; only then propose a tag decision. Neither archetype names nor degree/talent-tree membership alone justify tags.
6. **Distinguish documentation, approved ontology changes, approved record changes, and executable code.** Never treat a proposal, fictional sample build, NPC statblock, chassis description, or draft tag matrix as an already-certified machine authority. Do not rewrite historical audit artifacts to conceal drift.
7. **Legality precedes recommendation.** Existing character creation, class/progression, chassis constraints, feats, talent prerequisites, part installation and current active state remain authoritative. Suggestions are read-only and cannot grant skills, install parts, create feats or modify actors.
8. **Guardrail for exceptional actors:** droids normally lack CON; Strength is relevant to droid Fortitude where the published rule specifies. Do **not** substitute Strength into all Constitution rules, grant organic healing/Force options, or erase exceptional Shard/cyborg published traits. Frozen stock statblocks are not presumed legal editable player builds.
9. **Incremental delivery:** After **every completed phase** below, commit its scoped changes, push the implementation branch, verify the remote branch's exact HEAD, record commit SHA/changed files/tests, and update the same draft PR. Do not describe a phase as pushed without independently verifying the ref. Never merge without explicit owner authorization.

### 15.2 Planned phase schedule and stop gates

| Phase | Scope and primary existing roadmap references | Required committed output | **Do not proceed until** |
|---|---|---|---|
| **P0 — Baseline and ownership** | D0 | Baseline inventory, exact HEAD, call graph, existing PR/feature ownership, authority/consumer matrix; immutable before-state and regression fixtures | All live scorers, tag producers/consumers, droid actor modes, and install authorities are identified; no dirty-tree conflict |
| **P1 — Droid rules/corpus audit** | D1.5, D9, D10 | Certified published feat/talent/class-feature/component census with exact IDs, page/tree, current tags, legal audience, positive and negative cases; list of existing archetype collisions | Every candidate from Sections 12–14 resolved or explicitly marked `UNVERIFIED`; no guessed IDs or behavior |
| **P2 — Ontology decisions** | D1 | One design-adjudication manifest for each of the **ten candidates**: `ACCEPT_NEW`, `USE_EXISTING`, `ALIAS_ONLY`, or `REJECT`, with definitions/implications and owner-review fields | Owner approves the ontology delta; unapproved names remain draft labels; do not assume 190→200 |
| **P3 — Content semantic migration** | D3, D1.5 | Deterministic *approved-only* feat/talent tag delta by canonical ID; before/after hashes; provenance and validators; separate read-only class-feature projections | Every edited ID is exact, additions match P2, implications validate, generated state can be rebuilt, no unauthorized pack edits |
| **P4 — Droid evidence adapter** | D2, D3, D4, D10 | Pure read-only `DroidCapabilityEvidence` projection from existing component, size, degree, chassis and ability authorities; applicability and no-CON handling | Installed/active/disabled state, part dedupe, size and degree effects, provenance and exceptional actor cases have automated tests |
| **P5 — Unified archetype scorer** | D5 | Feature-flagged integration with the existing shared scorer/297-record SSOT; central policy for grant vs investment vs repeated evidence; deterministic reason traces | Organic baseline parity and droid expected differences pass; no parallel scoring engine and no hand-authored per-archetype numeric weights |
| **P6 — Player-facing descriptions** | D6, D12 | V2-facing explanation contract: rank, strongest tagged evidence, actual parts/feats/talents, source of grant, legal next steps, optional droid job descriptor | Every displayed claim resolves to canonical source/state; no unsupported or unavailable mechanic is presented as active |
| **P7 — Shadow comparison / calibration** | D7, D11 | Read-only fixture runner and before/after comparison report for organic/droid matched pairs and all candidate industrial/Star Wars jobs; owner decision packet | No unauthorized changes to live ranking; all severe rank inversions and confidence/coverage regressions adjudicated |
| **P8 — Optional archetype admissions** | D9, Sections 12–13 | Ten-candidate decision sheet (`NEW_ARCHETYPE`, `EXISTING_ARCHETYPE_EXPRESSION`, `BUILD_RECIPE_ONLY`, `REJECT`); only approved, legal new records/recipes | Every proposed new ID passes six-part admission test in §12.6, precise record schema/parent/references/tag provenance and legal build fixtures |
| **P9 — Controlled activation / cleanup** | D8 | Guarded production cutover, migration/rollback manifest, compatibility retirement only after consumers converge, release notes, verified CI, final PR review packet | Explicit owner approval, exact-head green required validations, retained rollback, no remaining active legacy scorer dependency missed by audit |

**Dependencies:** P0 → P1 → P2 → P3; P1 also feeds P4; P3 + P4 → P5 → P6 → P7. P8 is **optional**, only after P7 distinguishes genuinely missing identities; P9 requires P7 and any accepted P8 changes. If P2 rejects all new tags, continue using existing ontology plus typed droid evidence rather than stopping development.

### 15.3 Data contracts the agent must establish before production edits

Maintain **separate, versioned authorities** for: (a) proposed/approved ontology decisions; (b) record-level tag migration; (c) runtime *projected evidence* from installed parts and derived mechanics; (d) archetype admission decisions. Do not combine these into a raw, mutable `actor.system.tags` bag.

For every record-level semantic change, require: `kind` (`feat`/`talent`), stable `canonicalId`, exact sourcebook + printed page + tree/identity where applicable, old tag array, approved added/removed tags, resulting tag array, justification, source citation, approval state, before/after hash, and validator result. **Changes to current production `system.tags` must be done by a narrowly scoped generator/migration**, not via name matching, search-and-replace or guessing from prose.

For each projected droid capability, retain: actor mode; canonical part ID; effect/feature ID; effective `installed`, `enabled`, `active`; physical versus inventory location; trait/degree/size/processor constraints; source kind; grant-vs-purchase provenance (`unknown` where not provable); applicable existing canonical tags; **only approved** new droid tags; evidence quality (`access`, `grant`, `equipped-active`, `selected`, `invested`); and human-readable explanation. One logical part/effect may contribute **once**, regardless of multiple ledger/item representations.

**Typed facts are not semantic tags:** degree (`1st`–`5th`), chassis/model, size, movement hardware selection, processor category, absent CON, and restrictions live in typed rules data. Map their *verified mechanical effects* to existing tags (`movement`, `mobility`, `sensors`, `repair`, `tech`, `durability`, `slicing`, `power_systems`, etc.), then to new tags only if approved. Default size/degree alone must not force an archetype; a large droid with high STR is not automatically a Loadlifter.

### 15.4 Tests that must be checked at each relevant phase

- **Ontology and migration:** valid tags only; hard implications hold; retired aliases zero; exact canonical ID membership; idempotent rerun; independent recorded `before`/`after` reproducibility; rollback tested; no hidden overwrite of 12B owner curation or feat/talent certification.
- **Component authority:** one contribution when the same part appears in `installedSystems`, embedded Items and chassis draft; removed/disabled/offline part does not give active effects; raw stock part lists do not masquerade as player investment; part incompatibility and missing required attachments cannot be bypassed.
- **Droid identity:** size/degree baseline versus deliberate specialization; Cargo Hauler versus ordinary fifth-degree carry bonus; Power Supply versus generic fifth-degree chassis; basic versus heuristic processor; ion/stun effects, shield interactions, skill prerequisites, and legal equipment source; special Shard/cyborg cases.
- **Attributes and parity:** no synthetic CON=10 for ordinary droids; STR-for-Fortitude only where applicable; not-applicable ability axes excluded from score denominator rather than treated as failure or generic STR substitutes; skills and feats remain legal; organic matched-build scores stable unless a separately approved correction applies.
- **Archetype ranking:** distinguish Scavenger Droid vs Salvager vs Salvage Engineer; Droid Commander vs Tactical Droid; Loadlifter vs generic labor chassis; Shipbreaker vs Repair Droid; training-droid martial skill vs actual Force training; Recon Probe vs generic scout; unlocked but unselected capability does not overpower selected feats/talents; primary/supporting tagged intent is preserved.
- **Safety and UI:** scorer never mutates actor/Item, installs a system, changes eligibility, writes rank to canonical records, leaks hidden GM/NPC statblock content as a PC grant, or invents a source. Explanations show score as **heuristic match**, not percent likelihood or mechanical legality.

Before each push run **targeted tests**, relevant existing audit/validator commands discovered from the current package/repo, and the **full feasible suite**; report failures as preexisting or introduced only after checking an unchanged baseline. Do not claim full green if any required suite fails; mark unresolved blockers and leave feature flag off. Test CI against the pushed **exact SHA**, not a stale run from a previous commit.

### 15.5 Git branch, commit, push and PR protocol

**Documentation-only first delivery:** Commit this rolling MD on a **dedicated documentation branch**. This is not a production implementation, tag approval, new archetype certification, or merge request for executable behavior.

**Future implementation branch:** `feature/droid-semantic-archetype-scoring` (or another explicitly agreed branch), branched from the latest approved integration base. If that branch already exists, **inspect it rather than overwriting it**. For each phase P0–P9:

1. `git fetch origin` and inspect base, upstream, dirty state, open PRs, recent concurrent changes, and current exact ontology/SSOT paths. Avoid rebasing/force-pushing an active collaborator branch without permission.
2. Implement **only the scoped phase** with tests and documentation. Record all changed paths and identify untouched authorities. Run format/parse/validation and relevant tests before committing.
3. Use a phase-labeled conventional commit, e.g. `audit: inventory droid archetype scoring authorities (P0)`; `feat: add verified droid evidence projection (P4)`; `test: shadow compare organic and droid archetype ranking (P7)`. No unreviewed P2/P3/P8 writes.
4. `git push -u origin <implementation-branch>` (or plain `git push` when upstream exists). Fetch/read back the **remote branch head** and confirm it equals `git rev-parse HEAD`; inspect the committed file list. Record full SHA and exact validation output in a rolling execution ledger inside the repo.
5. Create or update one **draft PR**, attach the phase ledger, evidence/rule sources, test logs, feature-flag state, and explicit next-phase dependencies. Wait for required owner semantics/ontology/archetype decisions before their corresponding gates; independent code work can continue only where the phases explicitly allow it.
6. Do not squash or hide unresolved negative cases, delete the rollback manifest, turn on the scoring flag, retire transitional consumers, or merge without owner's explicit approval. Once final production activation is authorized, verify merge base and remote commit and include the final SHA/PR/CI links in the closeout ledger.

**Reporting contract after each phase:** `phase; branch; HEAD; remote HEAD; commit; PR; files added/changed; exact tests + counts; design decisions; blockers; next authorized phase`. If a remote push or CI verification fails, report **local completion only** and never write “pushed” or “CI passed.”

### 15.6 Fast start command for Claude or ChatGPT

> Read `docs/design/droid-semantic-archetype-scoring-rollout.md` in full and treat Section 15 as the phase-execution contract, with Sections 0–14 as the substantive design and source-backed candidate list. Start at **P0 only** on the agreed implementation branch after establishing current main/PR/authority state. Audit the 190-tag ontology, 297 SSOT archetypes, 12B curated tags, 353 feats, 1,187 talents, existing droid installed-component resolver, part schema, size/degree/processor rules, and all live suggestion consumers. Report the exact branch/commit, conflicts, and baseline tests. Produce and push **P0 read-only documentation/fixtures**, verify remote HEAD, and stop at P0's acceptance gate for review. Progress P1–P9 in order, commit/push/verify each phase, and **never silently add ontology tags, alter certified feat/talent tags, create new archetype records, or activate scoring without the recorded owner decisions and corresponding validation gates.**

### 15.7 Rolling execution log (initial entry)

| Date | Workstream | Status | Commit/PR | Next step |
|---|---|---|---|---|
| 2026-11-03 | Section 15 implementation handoff and Git delivery instructions | **Documentation only; implementation not begun** | Record actual docs-branch commit after push; no implementation PR implied | P0 baseline census on a new authorized implementation branch |

**Final boundary:** P0–P9 are future instructions, not claims of completed work. An assistant must not report code edits, tag approvals, legal build certification, phase completion, a push, or CI success unless performed and verified against the repository in that turn.
