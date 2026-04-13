# SWSE Actor Data Ownership Matrix v1

**Status:** Authoritative companion to Phase 1 contract  
**Last Updated:** 2026-04-12  
**Owner:** Architecture Team

---

## Purpose

This document assigns initialization and maintenance ownership for every important actor data domain. It exists to prevent ambiguity between progression, ActorEngine, derived systems, and sheet code.

Each domain is classified into exactly ONE ownership bucket. This matrix is the source of truth for answering:
- "Is this a progression bug?" (Bucket A)
- "Is this a template/init bug?" (Bucket B)
- "Is this a derivation bug?" (Bucket C)
- "Is this optional?" (Bucket D)

The matrix works with Phase 1 contract (which defines WHAT the canonical paths should be) to define WHO is responsible for making each one exist and stay correct.

---

## The Four Ownership Buckets

### Bucket A: Must be written by progression

These are explicit user selections during chargen/levelup/follower flow. If the player chose it, progression must express it in the mutation plan.

**Responsibility:** ProgressionFinalizer compiles intent into mutation plan. ActorEngine applies it.

**Examples:**
- Species selection
- Class selection
- Trained skills (user-selected training)
- Feat choices
- Talent choices
- Force power choices
- Language choices
- Background selection
- Ability allocation (user's score selection)

**Rule:** If the player explicitly chose it in progression UI, progression must write it.

---

### Bucket B: Must be initialized outside progression

These are required for a valid playable actor, but they are not user selections. They come from template defaults, ActorEngine initialization, or actor bootstrap.

**Responsibility:** Template.json and ActorEngine.init(), NOT progression.

**Examples:**
- HP container existence
- Condition track container
- Force/destiny resource containers
- Credits baseline
- Speed baseline (if not user-selected)
- XP field/container structure
- Skill object structure
- Defense base containers
- Defenses base values
- Ability object structure (if not user-selected)

**Rule:** Progression should not be forced to bootstrap boilerplate document structure.

---

### Bucket C: Must be derived only

These should not be treated as stored canonical truth. They are computational outputs that can be recalculated at any time from canonical stored inputs.

**Responsibility:** DerivedCalculator and downstream derivation systems, NOT progression or storage.

**Examples:**
- Ability modifiers
- Defense totals
- BAB (base attack bonus)
- Initiative
- Skill totals
- Attack lists
- Actions lists
- Encumbrance totals
- Summary aggregates (derived class display, identity fields)
- HP display mirrors

**Rule:** If it is calculable from canonical stored inputs, it must be derived-only. Do not store it as base truth.

---

### Bucket D: Optional/manual-edit only

These are NOT required for a fresh playable actor and do not need chargen ownership. They are cosmetic, biographical, or GM-tuning fields.

**Responsibility:** Manual sheet editing post-chargen, NOT progression.

**Examples:**
- Age
- Gender
- Character notes
- Biography text
- Descriptive fields
- Niche per-skill overrides (not part of chargen)
- GM-tuning values
- Cosmetic metadata

**Rule:** Do not let these muddy progression or core data audits. They are convenience fields, not requirements.

---

## Ownership Matrix Table

| Domain | Canonical Stored Path | Canonical Derived Path | Init Owner | Mutation Owner | Display Owner | Bucket | Playable? | Render? | Current Owner | Desired Owner | Notes |
|--------|---|---|---|---|---|---|---|---|---|---|---|
| **Identity Fields** | | | | | | | | | | | |
| name | name (actor doc) | (none) | ProgressionFinalizer | ActorEngine | actor.name | **A** | YES | YES | ProgressionFinalizer | ProgressionFinalizer | User selection at chargen |
| level | system.level | derived.identity.level | ProgressionFinalizer | ActorEngine | derived.identity | **A** | YES | YES | ProgressionFinalizer | ProgressionFinalizer | Chargen selection only |
| **Species/Race/Background** | | | | | | | | | | | |
| species | system.species | derived.identity.species | ProgressionFinalizer | ActorEngine | derived.identity | **A** | YES | YES | ProgressionFinalizer | ProgressionFinalizer | Species selection |
| race | system.race | (mirrors species) | ProgressionFinalizer | ActorEngine | derived.identity | **A** | YES | NO | ProgressionFinalizer | ProgressionFinalizer | Legacy duplicate of species (Bucket A for now) |
| background | system.background | derived.identity.background | ProgressionFinalizer | ActorEngine | derived.identity | **A** | YES | YES | ProgressionFinalizer | ProgressionFinalizer | Background selection |
| profession | system.profession | (none) | ProgressionFinalizer | ActorEngine | sheet | **A** | NO | NO | ProgressionFinalizer | ProgressionFinalizer | Derived from background |
| planetOfOrigin | system.planetOfOrigin | (none) | ProgressionFinalizer | ActorEngine | sheet | **A** | NO | NO | ProgressionFinalizer | ProgressionFinalizer | Derived from background |
| event | system.event | (none) | ProgressionFinalizer | ActorEngine | sheet | **A** | NO | NO | ProgressionFinalizer | ProgressionFinalizer | Derived from background |
| **Class Identity** | | | | | | | | | | | |
| class (selection) | system.class | derived.identity.className | ProgressionFinalizer | ActorEngine | derived.identity | **A** | YES | YES | ProgressionFinalizer | ProgressionFinalizer | Class selection, object storage |
| class (multiclass) | progression.classLevels | (computed) | ProgressionEngine | ProgressionEngine | sheet | **C** | YES | YES | ProgressionEngine | ProgressionEngine | Multiclass tracking (derived computation) |
| **Abilities** | | | | | | | | | | | |
| ability selection (input) | (session state) | (none) | ProgressionFinalizer | ActorEngine → abilities.*.base | (none) | **A** | YES | NO | ProgressionFinalizer | ProgressionFinalizer | User allocation at chargen |
| ability storage (base) | abilities.{key}.base | (none) | ActorEngine (normalization) | ActorEngine | stored | **B** | YES | YES | ActorEngine | ActorEngine | Store canonical ability score |
| ability storage (racial) | abilities.{key}.racial | (none) | Template | Sheet edit | stored | **B** | YES | YES | Template | Template | Species bonus or sheet edit |
| ability storage (temp) | abilities.{key}.temp | (none) | Template | Sheet edit | stored | **B** | YES | YES | Template | Template | Temporary buff/debuff |
| ability modifiers | (computed) | derived.attributes.{key} | DerivedCalculator | DerivedCalculator | derived | **C** | YES | YES | DerivedCalculator | DerivedCalculator | Computed from base+racial+temp |
| **HP** | | | | | | | | | | | |
| hp container | system.hp | (none) | Template | ActorEngine/manual edit | system.hp | **B** | YES | YES | Template | Template | Container existence required |
| hp.max | system.hp.max | derived.hp.max | Template + ActorEngine | ActorEngine recomputeHP (future) | both | **B** | YES | YES | Template → computed | ActorEngine recomputeHP | Maximum HP value |
| hp.value | system.hp.value | (mirrored) | Template | Manual sheet edit | system.hp.value | **B** | YES | YES | Template → manual edit | Manual edit | Current HP, editable during play |
| hp.temp | system.hp.temp | (none) | Template | Manual sheet edit | system.hp.temp | **B** | NO | YES | Template | Template | Temporary damage/healing |
| **Defenses** | | | | | | | | | | | |
| defense base (misc) | defenses.{fort\|ref\|will}.misc | (none) | Template | Sheet edit | stored | **B** | YES | YES | Template | Template | Manual override modifiers |
| defense totals | (computed) | derived.defenses.{fortitude\|reflex\|will}.total | DerivedCalculator | DerivedCalculator | derived | **C** | YES | YES | DerivedCalculator | DerivedCalculator | Computed from base + all mods |
| **Skills** | | | | | | | | | | | |
| skill trained (flag) | skills.{key}.trained | (mirrored) | ProgressionFinalizer | ActorEngine | both | **A** | YES | YES | ProgressionFinalizer | ProgressionFinalizer | User selection at chargen |
| skill structure | skills.{key} object | (none) | Template | Sheet edit | stored | **B** | YES | YES | Template | Template | Object schema and defaults |
| skill misc mods | skills.{key}.miscMod | (computed in) | Template | Sheet edit | stored | **B** | NO | YES | Template | Template | Manual overrides, form-editable |
| skill focused | skills.{key}.focused | (mirrored) | Template | Sheet edit | stored | **B** | NO | YES | Template | Template | Optional, form-editable |
| skill ability | skills.{key}.ability | (used in) | Template | Template | stored | **B** | YES | NO | Template | Template | Governing ability for skill |
| skill totals | (computed) | derived.skills.{key}.total | DerivedCalculator | DerivedCalculator | derived | **C** | YES | YES | DerivedCalculator | DerivedCalculator | Computed from components |
| **Items (Feats/Talents/Powers)** | | | | | | | | | | | |
| feats (granted) | actor.items (type='feat') | derived.feats.list | ProgressionFinalizer | ActorEngine (embedded) | derived | **A** | YES | YES | ProgressionFinalizer | ProgressionFinalizer | Chargen grant, item-based |
| talents (granted) | actor.items (type='talent') | derived.talents.list | ProgressionFinalizer | ActorEngine (embedded) | derived | **A** | YES | YES | ProgressionFinalizer | ProgressionFinalizer | Chargen grant, item-based |
| force powers | actor.items (type='forcepower') | derived.forcePowers.list | ProgressionFinalizer | ActorEngine (embedded) | derived | **A** | NO* | YES | ProgressionFinalizer | ProgressionFinalizer | Force users only, chargen grant |
| force techniques | actor.items (type='forcetechnique') | derived.forceTechniques.list | ProgressionFinalizer | ActorEngine (embedded) | derived | **A** | NO* | YES | ProgressionFinalizer | ProgressionFinalizer | Force users only, chargen grant |
| force secrets | actor.items (type='forcesecret') | derived.forceSecrets.list | ProgressionFinalizer | ActorEngine (embedded) | derived | **A** | NO* | YES | ProgressionFinalizer | ProgressionFinalizer | Force users only, chargen grant |
| **Languages & Knowledge** | | | | | | | | | | | |
| languages | system.languages (array) | (none) | ProgressionFinalizer | ActorEngine | system.languages | **A** | NO | NO | ProgressionFinalizer | ProgressionFinalizer | Selection of language IDs |
| **Resources** | | | | | | | | | | | |
| xp.total | system.xp.total | derived.xp (if computed) | Template | Gameplay systems | both | **B** | NO | YES | Template | Template | Not set by progression (post-chargen) |
| credits | system.credits | (none) | Template | Sheet edit | system.credits | **B** | NO | NO | Template | Template | Not chargen responsibility |
| destinyPoints.value | destinyPoints.value | (mirrored) | Template | Sheet edit | both | **B** | YES | YES | Template | Template | Resource, template default=1 |
| destinyPoints.max | destinyPoints.max | (mirrored) | Template | ActorEngine/manual | both | **B** | YES | YES | Template | Template | Resource cap, template default=1 |
| forcePoints.value | forcePoints.value | (mirrored) | Template | Sheet edit | both | **B** | NO* | YES | Template | Template | Force users only, template=0 |
| forcePoints.max | forcePoints.max | (mirrored) | Template | ActorEngine/manual | both | **B** | NO* | YES | Template | Template | Force users only, template=0 |
| **Condition Track** | | | | | | | | | | | |
| condition track | system.conditionTrack | (mirrored) | Template | Sheet edit | both | **B** | YES | YES | Template | Template | Status meter, template default=0 |
| **Movement/Speed** | | | | | | | | | | | |
| speed | system.speed | (mirrored if needed) | Template | Sheet edit | system.speed | **B** | YES | YES | Template | Template | Base movement, template default=6 |
| **Combat/Actions** | | | | | | | | | | | |
| attacks list | (computed) | derived.attacks.list | DerivedCalculator | DerivedCalculator | derived | **C** | YES | YES | DerivedCalculator | DerivedCalculator | Computed from equipment/feats |
| actions list | (computed) | derived.actions.list | DerivedCalculator | DerivedCalculator | derived | **C** | YES | YES | DerivedCalculator | DerivedCalculator | Computed from class/feats |
| **Encumbrance** | | | | | | | | | | | |
| encumbrance state | (computed) | derived.encumbrance | EncumbranceEngine | EncumbranceEngine | derived | **C** | NO | NO | EncumbranceEngine | EncumbranceEngine | Computed from item weights |
| **Optional/Cosmetic** | | | | | | | | | | | |
| age | system.age | (none) | (none, manual) | Sheet edit | system.age | **D** | NO | NO | Manual | Manual | Optional biography field |
| gender | system.gender | (none) | (none, manual) | Sheet edit | system.gender | **D** | NO | NO | Manual | Manual | Optional biography field |
| notes | system.notes | (none) | (none, manual) | Sheet edit | system.notes | **D** | NO | NO | Manual | Manual | Optional biography field |

---

## Detailed Domain Notes

### Domain: Abilities (Split into Three Subdomains)

**Why split:**
Abilities have mixed responsibilities. The user selection is Bucket A, the stored structure is Bucket B, and the computed modifiers are Bucket C. Lumping them together causes confusion.

**Subdomain 1: Ability selection (Bucket A)**
- What: User allocates 6 scores during chargen (STR 14, DEX 13, etc.)
- Who selects: Player during progression chargen
- Who owns initialization: ProgressionFinalizer (expresses intent)
- ActorEngine normalizes: Intent into stored system.abilities.{key}.base
- Current state: ProgressionFinalizer line 399 writes to `.value` (WRONG path)
- Desired state: Write to `.base` (Phase 3A)
- Conflict: Progression writes `.value` but template/form expect `.base`

**Subdomain 2: Ability stored structure (Bucket B)**
- What: The persistent data structure holding base, racial, temp, total, mod
- Who owns initialization: Template.json (defines schema)
- Current state: Template defines correctly (base, racial, temp)
- Desired state: No change needed
- Conflict: ProgressionFinalizer writes to wrong path (.value), masked by fallback

**Subdomain 3: Ability modifiers (Bucket C)**
- What: Computed modifiers (e.g., STR 14 = +2 mod)
- Who computes: DerivedCalculator
- Where stored: system.derived.attributes.{key} (and mirrored to derived.identity for display)
- Current state: DerivedCalculator correctly computes and stores
- Desired state: No change needed
- Conflict: None observed

**Resolution for Phase 3A:**
- ProgressionFinalizer must write to `.base` not `.value`
- DerivedCalculator already reads from correct path
- Remove fallback chain in character-actor.js once schema is unified

---

### Domain: Class Identity (Split into Two Subdomains)

**Why split:**
Class selection (user choice) is different from class representation (how it's stored and displayed).

**Subdomain 1: Class selection (Bucket A)**
- What: User selects one class during chargen (Jedi, Soldier, Scoundrel, etc.)
- Who selects: Player during chargen
- Who owns initialization: ProgressionFinalizer (expresses choice)
- Where stored: system.class (object)
- Current state: ProgressionFinalizer writes to three paths (class, className, classes)
- Desired state: Write only to system.class, remove className and classes scalars
- Conflict: Redundant multiple paths created for "compatibility"; className and classes never read

**Subdomain 2: Class multiclass tracking (Bucket C)**
- What: Tracking multiple classes and levels (Jedi 2 / Soldier 3 / etc.)
- Who computes: Progression engine (computed during chargen or levelup)
- Where stored: system.progression.classLevels (array of {class, level})
- Current state: Progression engine correctly populates
- Desired state: No change needed
- Conflict: None, this is already computed correctly

**Class display (also Bucket C):**
- What: Display string "Jedi 3 / Soldier 2"
- Who computes: Derived mirror (character-actor.js) and DerivedCalculator
- Where stored: system.derived.identity.className (and progression.classLevels for multiclass display)
- Current state: Correct, reads from correct sources
- Desired state: No change needed

**Resolution for Phase 3B:**
- ProgressionFinalizer removes className and classes writes (lines 391-392)
- Sheet continues reading from progression.classLevels and derived.identity.className
- ActorEngine may normalize legacy paths if they appear

---

### Domain: Skills (Split into Two Subdomains)

**Why split:**
Skills have both user selections (trained flag) and infrastructure (object structure and computed totals).

**Subdomain 1: Skill trained flag (Bucket A)**
- What: Did player select this skill for training?
- Who selects: Player during chargen
- Who owns initialization: ProgressionFinalizer (writes system.skills.{key}.trained = true/false)
- Current state: ProgressionFinalizer correctly sets (line 406)
- Desired state: No change needed
- Conflict: None

**Subdomain 2: Skill object structure and modifiers (Bucket B)**
- What: The persistent object holding trained, focused, ability, miscMod, etc.
- Who owns initialization: Template.json (should define full schema)
- Current state: Template has empty skills: {} (NO SCHEMA)
- Desired state: Template defines full schema with all properties and defaults
- Conflict: Undefined schema causes character-actor.js to use fallback logic (line 155)

**Subdomain 3: Skill totals (Bucket C)**
- What: Computed skill total (trained bonus + ability mod + misc mod + focus bonus)
- Who computes: DerivedCalculator (and ModifierEngine)
- Where stored: system.derived.skills.{key}.total
- Current state: DerivedCalculator correctly computes
- Desired state: No change needed
- Conflict: None observed

**Resolution for Phase 5:**
- Template.json must define full skills schema with default values for all properties
- Phase 7 can then remove fallback logic in character-actor.js (line 155)
- Progression continues writing only .trained (correct)
- DerivedCalculator continues computing totals (correct)

---

### Domain: XP and Resources (Split into Four Concerns)

**Why split:**
XP, credits, and destiny/force points have different ownership patterns and should not be lumped together.

**XP (Bucket B):**
- What: experience points for character progression
- Who selects: Not selected at chargen; earned post-chargen via gameplay
- Who owns initialization: Template.json (default = 0)
- Who mutates during play: Gameplay systems (levelup, rewards)
- Current state: system.xp.total expected by sheet (context.js line 167)
- Desired state: Unify naming to system.xp.total (not system.experience)
- Conflict: Two paths exist (experience vs xp.total); need unified naming

**Credits (Bucket B or D?):**
- What: Currency for equipment purchases
- Who selects: Class may grant starting credits, but not user chargen selection
- Who owns initialization: Template.json (default = 0)
- Who mutates: Sheet edit, equipment system
- Current state: form.js line 84 expects system.credits
- Desired state: Template owns, progression doesn't set
- Conflict: None, clear ownership

**Destiny Points (Bucket B):**
- What: Resource pool for heroic deeds
- Who selects: Not selected at chargen; given by template
- Who owns initialization: Template.json (default value=1, max=1)
- Who mutates: Gameplay systems (actions consume, rest restores)
- Current state: Template correctly defaults to 1
- Desired state: No change needed
- Conflict: None

**Force Points (Bucket B):**
- What: Force user resource
- Who selects: Not selected at chargen; conditionally granted based on class
- Who owns initialization: Template.json (default value=0, max=0)
- Who mutates: Gameplay systems (force use consumes, meditation restores)
- Current state: Template correctly defaults to 0
- Desired state: No change needed for template; progression may later set if force user
- Conflict: May need ActorEngine normalization to set max based on class

**Resolution:**
- Phase 3D: Unify naming to system.xp.total (canonical path)
- Template owns all resource containers and defaults
- Progression does not set resources at chargen (template handles)
- Gameplay systems handle in-play mutation

---

### Domain: Defenses (Bucket B for Base, Bucket C for Totals)

**Why split:**
Defenses have base configuration (Bucket B) separate from computed totals (Bucket C).

**Defense base (Bucket B):**
- What: Baseline defense values and misc overrides
- Who owns initialization: Template.json (defines base structure)
- Who mutates: Sheet edit for misc override, ActorEngine for computed base
- Current state: system.defenses correctly structured in template
- Desired state: No change needed
- Conflict: None

**Defense totals (Bucket C):**
- What: Computed total with all modifiers applied (ability, class, equipment, misc)
- Who computes: DerivedCalculator (via DefenseCalculator)
- Where stored: system.derived.defenses.{fortitude|reflex|will}.total
- Current state: DerivedCalculator correctly computes
- Desired state: No change needed
- Conflict: None observed

**Resolution:**
- Keep base/derived separation as-is
- Phase 6 verifies DerivedCalculator uses canonical base paths
- No changes needed for defenses

---

### Domain: Condition Track (Bucket B)

**Current state:** Template defines correctly, form expects it

**Conflict:** None observed, ownership is clear

**Desired state:** No changes needed

---

### Domain: Speed (Bucket B)

**Current state:** Template provides default (6), not set by progression

**Conflict:** None if template default is sensible

**Desired state:** No changes needed (progression may override if class grants speed, handled post-chargen)

---

### Domain: Attacks / Actions / Encumbrance (Bucket C)

All three are purely derived/computed. No storage by progression needed.

**Current state:** DerivedCalculator + specialized engines handle computation

**Desired state:** No changes needed

---

## Dispute Resolution Rules

Use these rules to settle ownership ambiguity in future discussions:

1. **If explicitly chosen by user in progression UI → Bucket A**
   - Progression must write it
   - ActorEngine applies it
   - Example: feats, species, class, trained skills

2. **If required for playable new character, but not user-chosen → Bucket B**
   - Template or ActorEngine must initialize
   - Progression must NOT bootstrap it
   - Example: HP container, condition track, resource pools

3. **If computational output → Bucket C**
   - DerivedCalculator or specialized engine must compute
   - Never store as canonical truth
   - May be displayed/mirrored but always derived
   - Example: defense totals, skill totals, attacks, BAB

4. **If not required for playability or correctness → Bucket D**
   - Manual edit only, not progression responsibility
   - Do not let these block chargen audits
   - Example: notes, age, gender, cosmetic metadata

5. **Sheet code cannot own gameplay truth**
   - Sheet is consumer only
   - Sheet may use fallback for defensive null-safety
   - Sheet fallback can never become core logic

6. **ActorEngine remains mutation gatekeeper**
   - All writes route through ActorEngine
   - Progression expresses intent, ActorEngine applies and normalizes
   - Derived systems compute, do not store to non-derived paths

7. **Derived remains owner of computed outputs**
   - DerivedCalculator is sole authority for system.derived.*
   - No other code writes to derived paths
   - Derived reads only from canonical stored paths

---

## Open Questions (Requiring Runtime Proof)

These domains have ambiguities that cannot be settled by code analysis alone:

### Q1: Are progression.classLevels correctly computed during chargen?

**Uncertainty:** Does system.progression.classLevels exist and contain correct data immediately after chargen finalize()?

**Expected:** `[{class: 'jedi', level: 1}]`

**How to prove:** Create fresh level 1 character, inspect post-finalize

**Ownership impact:** If multiclass tracking is broken, may need to shift class ownership from progression.classLevels to alternative storage

---

### Q2: Does template.json actually define a full skills schema?

**Uncertainty:** Is system.skills.{key} fully initialized with all properties (trained, focused, ability, miscMod)?

**Expected:** Every skill initialized with sensible defaults

**How to prove:** Create fresh character without progression, inspect actor.system.skills

**Ownership impact:** If template has no schema, skills must move to Bucket B(init) with required template work in Phase 5

---

### Q3: Can ActorEngine initialization handle boot-time schema gaps?

**Uncertainty:** Should ActorEngine normalize missing schema during applyMutationPlan(), or should template prevent gaps?

**Expected:** Template prevents gaps, ActorEngine handles legacy compatibility only

**How to prove:** Audit ActorEngine.applyMutationPlan() for bootstrap logic

**Ownership impact:** Clarifies whether ActorEngine owns init (Bucket B shared) or template owns init (pure Bucket B)

---

### Q4: Is sheet fallback logic currently masking missing Bucket B initialization?

**Uncertainty:** Are fallbacks in character-actor.js and character-sheet.js hiding template schema defects?

**Expected:** No fallbacks should be required for Bucket B fields; template should guarantee existence

**How to prove:** Remove fallbacks, create character, check for errors

**Ownership impact:** If yes, confirms template must provide full schema (Phase 5 priority)

---

### Q5: Do form.js field expectations match current actor schema?

**Uncertainty:** Does every field in FORM_FIELD_SCHEMA (form.js lines 16-90) actually exist in actor after chargen?

**Expected:** Yes, all fields exist (either from template or progression)

**How to prove:** Create fresh character, open form, verify every field is accessible

**Ownership impact:** If no, identifies which fields are mislabeled (Bucket A vs B vs D)

---

## Summary: What Ownership Matrix Clarifies

This matrix answers questions like:

- **"Is HP initialization a progression bug?"** NO (Bucket B, template owns)
- **"Is trained skills a progression bug?"** YES (Bucket A, progression must plan)
- **"Is skill total wrong?"** NO (Bucket C, DerivedCalculator owns)
- **"Should sheet compute defense totals?"** NO (Bucket C, DerivedCalculator owns)
- **"Why doesn't age exist on fresh character?"** CORRECT (Bucket D, optional)
- **"Is conditions track a progression bug?"** NO (Bucket B, template owns)
- **"Should progression set credits?"** NO (Bucket B, template owns)

These answers are the foundation for Phase 3+ implementation.

---

**End of Actor Data Ownership Matrix v1**
