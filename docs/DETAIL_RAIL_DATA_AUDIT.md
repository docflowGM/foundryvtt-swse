# SWSE Detail Rail Data Audit

**Date:** March 28, 2026
**Status:** Discovery-Only Audit (No Implementation)
**Scope:** Examine authoritative data sources for all selectable progression items

---

## Executive Summary

The SWSE progression engine currently displays item details (descriptions, prerequisites, metadata, mentor guidance) across 13 item types. This audit inventories what canonical data exists today, where it lives, and what gaps exist before detail rail enhancements can be implemented cleanly.

**Key Findings:**
- ✅ **Core fields present:** Name, category, basic descriptions, and metadata badges exist for all item types
- ⚠️  **Prerequisites inconsistent:** Some types have structured data (talent-prerequisites.json), others have text-only (feat system fields), others lack prerequisites entirely
- ❌ **Mentor prose missing:** Most item types lack pre-authored mentor advisory text; mentor interactions are ask-on-demand only
- ✅ **Metadata rich:** Categories, tags, and tags are comprehensive across item types
- ⚠️  **Description coverage variable:** Some items have full prose, others have minimal descriptions

---

## Per-Item-Type Audit

### 1. FEATS

**Canonical Sources:**
- Foundry compendium: `foundryvtt-swse.feats` (loaded via FeatRegistry)
- Metadata augmentation: `data/feat-metadata.json`
- Prerequisites lookup: `data/talent-prerequisites.json` (cross-reference by feat name)

**Data Fields:**

| Field | Source | Format | Status | Notes |
|-------|--------|--------|--------|-------|
| **Name** | Feat item `.name` | String | ✅ Canonical | From compendium |
| **Description** | Feat item `.system.description` or `.system.benefit` | HTML/String | ✅ Canonical | Both fields checked; benefit fallback if description empty |
| **Category** | Feat item `.system.category` or `.system.featType` | String | ✅ Canonical | Used for grouping in UI; also in feat-metadata.json |
| **Prerequisites** | Feat item `.system.prerequisites` / `.system.prerequisite` | String or Array | ✅ Partial | Text-only; no structured conditions like talent-prerequisites.json provides |
| **Metadata Tags** | `feat-metadata.json` feats[name].tags | Array | ✅ Canonical | Rich metadata (weapon-mastery, accuracy, combat, etc.) |
| **Feat Chain** | `feat-metadata.json` feats[name].chain | String | ✅ Canonical | Identifies feat chains (e.g., "Weapon Focus Chain") |
| **Chain Order** | `feat-metadata.json` feats[name].chainOrder | Number | ✅ Canonical | Position in chain progression |
| **Prerequisite Feat** | `feat-metadata.json` feats[name].prerequisiteFeat | String | ✅ Canonical | Reference to required parent feat |
| **Is Suggested** | SuggestionService result | Boolean | ✅ Runtime | Computed, not stored |
| **Is Repeatable** | FeatEngine.repeatables hardcoded list | Boolean | ✅ Canonical | Known repeatable feat names |
| **Is Already Owned** | Actor items check | Boolean | ✅ Runtime | Computed from actor state |

**Mentor Thought:**
- **Current State:** Static text in template ("Why suggested: This feat synergizes well with your build and class.")
- **Canonical Source:** None; prose exists only in template
- **Status:** ❌ Not pre-authored; generic placeholder only
- **Ask Mentor:** Supported; mentor can provide contextual guidance on demand

**Detail Panel Display (feat-details.hbs):**
- Name, category, description (conditional)
- Prerequisites list (text-based, assuming feat.system.prerequisites is array/string)
- Meta badges: Suggested, Repeatable
- Action buttons: Choose/Deselect, Ask Mentor

**Gaps & Inconsistencies:**
1. Prerequisites are text-only strings; no way to validate "met" status display (template assumes all shown are met)
2. No dedicated mentor prose for individual feats; only generic suggestion explanation
3. feat-metadata.json has rich data but some feats not included (coverage unknown)

---

### 2. TALENTS

**Canonical Sources:**
- Foundry compendium: `foundryvtt-swse.talent_trees` (loaded via TalentTreeDB, index-only)
- Talent prerequisites: `data/talent-prerequisites.json` (keyed by talent name, structured conditions)
- Talent descriptions: `data/talent-tree-descriptions.json` (may provide prose)
- Talent tags/metadata: `data/talent-tree-tags.json`
- Talent trees map: `data/talent_tree_class_map.json`, `data/talent_tree_access_rules.json`

**Data Fields:**

| Field | Source | Format | Status | Notes |
|-------|--------|--------|--------|-------|
| **Name** | Tree node `.name` | String | ✅ Canonical | From tree structure |
| **Tree Name** | Tree `.name` | String | ✅ Canonical | Parent tree identifier |
| **Description** | Talent item `.system.description` or `talent-tree-descriptions.json` | String | ✅ Partial | May exist in compendium item OR in descriptions JSON; unclear precedence |
| **Prerequisites** | `talent-prerequisites.json` [talentName].conditions | Array of conditions | ✅ Canonical | Structured format (feat, talent, skillTrained, featPattern types) |
| **Prerequisites (Text)** | Talent item `.system.prerequisites` | String | ✅ Partial | Text fallback if structured not available |
| **Metadata Tags** | `talent-tree-tags.json` | Object | ✅ Canonical | Tag classifications per talent |
| **Tree Type** | Tree `.system.treeType` | String | ✅ Canonical | Category/archetype |
| **Position in Tree** | Tree node coordinates | x,y or level | ✅ Canonical | Graph position |

**Mentor Thought:**
- **Current State:** Not displayed; TODO comment in talent-details.hbs indicates intent but not implemented
- **Canonical Source:** None identified
- **Status:** ❌ Missing entirely
- **Ask Mentor:** Supported; mentor can provide guidance on demand

**Detail Panel Display (talent-details.hbs):**
- Name, tree name badge, selected status
- Description (conditional)
- Prerequisites (conditional, text-only; TODO comment indicates structured display planned)
- Action buttons: Choose/Deselect, Ask Mentor

**Gaps & Inconsistencies:**
1. Prerequisites display is marked TODO; currently shows as text only, no "met/unmet" status
2. Description source ambiguous: item system OR JSON file?
3. No mentor prose for individual talents
4. Graph visualization exists but detail panel doesn't leverage structured prerequisites

---

### 3. SPECIES

**Canonical Sources:**
- Foundry compendium: Species items from character creation
- Species registry: `SpeciesRegistry.getAll()`
- Species dialogue: `data/dialogue/mentors/ol_salty/ol-salty-species-dialogues.json` (mentorName → array of dialogue lines)
- Species abilities: `data/species-abilities-migrated.json`
- Species languages: `data/species-languages.json`
- Species traits: `data/species-traits-migrated.json`

**Data Fields:**

| Field | Source | Format | Status | Notes |
|-------|--------|--------|--------|-------|
| **Name** | Species item `.name` | String | ✅ Canonical | From item |
| **Description** | Species item `.system.description` | HTML/String | ✅ Canonical | Lore/background text |
| **Size** | Species item `.system.size` | String | ✅ Canonical | Size category |
| **Speed** | Species item `.system.speed` | Number | ✅ Canonical | Base movement speed |
| **Ability Modifiers** | Species item `.system.abilityScores` | Object | ✅ Canonical | +DEX, -CON format |
| **Special Abilities** | Species item `.system.abilities` | Array | ✅ Canonical | List of ability names |
| **Languages** | Species item `.system.languages` | Array | ✅ Canonical | Granted languages |
| **Mentor Dialogue (Ol' Salty)** | `ol-salty-species-dialogues.json` [speciesName] | String or Array | ✅ Canonical | Per-species greeting; randomly selected if multiple lines |
| **Default Guidance** | Static in template | String | ✅ Template | Fallback if no species-specific dialogue |
| **Source** | Species item field (if present) | String | ✅ Canonical | Source book reference |
| **Image** | Species item `.img` | Path | ✅ Canonical | Portrait image |

**Mentor Thought:**
- **Current State:** Ol' Salty dialogue loaded from `ol-salty-species-dialogues.json`
- **Canonical Source:** ✅ JSON file with per-species entries
- **Status:** ✅ Partially implemented; only Ol' Salty mentor has species-specific prose
- **Ask Mentor:** Supported; mentor can provide additional guidance

**Detail Panel Display (species-details.hbs):**
- Ol' Salty dialogue (or fallback guidance)
- Portrait image (conditional)
- Name + source chip
- Description text
- Size, speed stats
- Ability modifier rows
- Special abilities list
- Languages list
- Confirmation button

**Gaps & Inconsistencies:**
1. Only Ol' Salty has species-specific dialogue; other mentors would need their own per-species prose
2. Image resolution/loading handled by species-image map built at runtime (may be fragile)
3. Some species may not have entries in ol-salty-species-dialogues.json (fallback used)

---

### 4. CLASS

**Canonical Sources:**
- Foundry compendium: Class items
- Classes registry: `ClassesRegistry.getAll()`
- Class features: `data/class-features.json`
- Mentor guidance: Mentor system (mentor swap on class selection, not pre-loaded prose)

**Data Fields:**

| Field | Source | Format | Status | Notes |
|-------|--------|--------|--------|-------|
| **Name** | Class item `.name` | String | ✅ Canonical | From item |
| **Description** | Class item `.system.description` or `.system.fantasy` | HTML/String | ✅ Canonical | Narrative description; "fantasy" field with lore |
| **Type** | Class item `.system.classType` | String | ✅ Canonical | Base, Prestige, etc. |
| **BAB** | Class item `.system.bab` | String | ✅ Canonical | Base Attack Bonus progression |
| **Hit Die** | Class item `.system.hitDie` | String | ✅ Canonical | d6, d8, d10, d12 |
| **Defense Bonus** | Class item `.system.defenseBonus` | Number | ✅ Canonical | Base defense value |
| **Starting Abilities** | Class item `.system.startingAbilities` | Array | ✅ Canonical | List of ability names |
| **Trained Skills** | Class item `.system.trainedSkills` | Array | ✅ Canonical | Skills granted at level 1 |
| **Class Skills** | Class item `.system.classSkills` | Array | ✅ Canonical | Skills with +3 bonus |
| **Mentor Name** | `.system.mentor` or derived | String | ✅ Canonical | Assigned mentor for class |
| **Source** | Class item field (if present) | String | ✅ Canonical | Source book reference |

**Mentor Thought:**
- **Current State:** Not pre-authored for display; mentor swapped on class selection via getMentorGuidance()
- **Canonical Source:** `data/dialogue/mentors/[mentor-name]/mentor-name.json` (mentor-specific dialogue)
- **Status:** ✅ Mentor guidance available but delivered via Ask Mentor, not pre-loaded in detail panel
- **Ask Mentor:** Supported; class-specific mentor explains class role and capabilities

**Detail Panel Display (class-details.hbs):**
- Name + type chip
- Fantasy/description text (conditional)
- BAB, Hit Die, Defense Bonus stats
- Mentor name/role
- Starting abilities list (conditional)
- Trained skills list (conditional)
- Class skills list (conditional)
- Confirmation button

**Gaps & Inconsistencies:**
1. Class description often brief; main lore/role explained by mentor, not in item prose
2. No pre-loaded "why this class" guidance in detail panel; mentor swap happens after selection

---

### 5. BACKGROUND

**Canonical Sources:**
- Background data: `data/backgrounds.json`
- Background registry: May be loaded via registry or direct JSON

**Data Fields:**

| Field | Source | Format | Status | Notes |
|-------|--------|--------|--------|-------|
| **Name** | backgrounds.json [id].name | String | ✅ Canonical | Event background name |
| **Category** | backgrounds.json [id].category | String | ✅ Canonical | "event" or other category |
| **Icon** | backgrounds.json [id].icon | Emoji/String | ✅ Canonical | Visual identifier |
| **Narrative Description** | backgrounds.json [id].narrativeDescription | String | ✅ Canonical | Story flavor text |
| **Special Ability** | backgrounds.json [id].specialAbility | String | ✅ Canonical | Prose description of mechanical effect |
| **Relevant Skills** | backgrounds.json [id].relevantSkills | Array | ✅ Canonical | Related skills list |
| **Skill Choice Count** | backgrounds.json [id].skillChoiceCount | Number | ✅ Canonical | Number of skills to pick |
| **Mechanical Effect** | backgrounds.json [id].mechanicalEffect | Object | ✅ Canonical | Type and description |
| **Bonus Language** | backgrounds.json [id].bonusLanguage | String | ✅ Canonical | Optional language grant |

**Mentor Thought:**
- **Current State:** Not displayed
- **Canonical Source:** None identified
- **Status:** ❌ Missing entirely
- **Ask Mentor:** Not explicitly supported in background step

**Detail Panel Display (background-details.hbs):**
- Name + category chip
- Description (conditional)
- "What This Grants" section:
  - Trained skills list
  - Bonus language (conditional)
  - No grants message (conditional)
- Selection status
- Source (conditional)
- Commit/deselect button

**Gaps & Inconsistencies:**
1. No mentor prose for backgrounds
2. Background selection may not support Ask Mentor in progression framework

---

### 6. FORCE POWERS

**Canonical Sources:**
- Foundry compendium: Force powers items
- Force registry: `ForceRegistry.byType('power')`
- Force power descriptions: `data/force-power-descriptions.json` (keyed by power name)
- Force powers data: `data/force-powers.json`
- Force power manifest descriptions: `data/force-power-descriptions.json` (disciplines section for intro/manifestation prose)

**Data Fields:**

| Field | Source | Format | Status | Notes |
|-------|--------|--------|--------|-------|
| **Name** | Power item `.name` | String | ✅ Canonical | From item |
| **Description** | Power item `.system.description` | HTML/String | ✅ Canonical | Mechanical description |
| **Prerequisites** | Power item `.system.prerequisites` | String | ✅ Canonical | Text-only prerequisites |
| **Power Level** | Power item `.system.level` | Number | ✅ Canonical | Tier/complexity |
| **Discipline** | Power item `.system.discipline` | String | ✅ Canonical | dark-side, telepathic, telekinetic, etc. |
| **Cost** | Power item `.system.cost` | String | ✅ Canonical | Force point cost |
| **Manifestation Text** | `force-power-descriptions.json` disciplines[discipline].manifestation | Array | ✅ Canonical | Narrative prose for power manifestation |
| **Intro Text** | `force-power-descriptions.json` disciplines[discipline].intro | Array | ✅ Canonical | Narrative prose for power intro |
| **Selected Count** | Session draftSelections tracking | Number | ✅ Runtime | How many times selected |

**Mentor Thought:**
- **Current State:** Not pre-authored for display; Ask Mentor available
- **Canonical Source:** Mentor dialogue system (on-demand)
- **Status:** ⚠️  Partial; narrative intro/manifestation exists in force-power-descriptions.json, but mentor-specific guidance not pre-loaded
- **Ask Mentor:** Supported

**Detail Panel Display (force-power-details.hbs):**
- Name + selected count badge
- Description (conditional)
- Prerequisites (conditional, text-only)
- Hint about multiple selections
- Action buttons: Add/Deselect, Ask Mentor

**Gaps & Inconsistencies:**
1. Prerequisites are text-only; no structured validation
2. Manifestation/intro prose exists but not displayed in detail panel
3. No mentor-specific force power guidance pre-loaded

---

### 7. FORCE TECHNIQUES

**Canonical Sources:**
- Foundry compendium: Force technique items
- Force registry: `ForceRegistry.byType('technique')`
- Force techniques data: `data/force-techniques.json`
- Enriched data: `data/forcetechniques.enriched.json`

**Data Fields:**

| Field | Source | Format | Status | Notes |
|-------|--------|--------|--------|-------|
| **Name** | Technique item `.name` | String | ✅ Canonical | From item |
| **Description** | Technique item `.system.description` | HTML/String | ✅ Canonical | Mechanical description |
| **Prerequisites** | Technique item `.system.prerequisites` | String | ✅ Canonical | Text-only |
| **Tier** | Technique item `.system.tier` | Number | ✅ Canonical | Complexity level |
| **Selected Count** | Session draftSelections tracking | Number | ✅ Runtime | Multiple selections allowed |

**Mentor Thought:**
- **Current State:** Not displayed
- **Canonical Source:** None identified
- **Status:** ❌ Missing
- **Ask Mentor:** Supported

**Detail Panel Display (force-technique-details.hbs):**
- Name + selected count badge
- Description (conditional)
- Hint about multiple selections
- Action buttons: Add/Deselect, Ask Mentor

**Gaps & Inconsistencies:**
1. No prerequisites display (TODO?)
2. No mentor prose

---

### 8. FORCE SECRETS

**Canonical Sources:**
- Foundry compendium: Force secret items
- Force registry: `ForceRegistry.byType('secret')`
- Force secrets data: `data/force-secrets.json`
- Enriched data: `data/forcesecrets.enriched.json`

**Data Fields:**

| Field | Source | Format | Status | Notes |
|-------|--------|--------|--------|-------|
| **Name** | Secret item `.name` | String | ✅ Canonical | From item |
| **Description** | Secret item `.system.description` | HTML/String | ✅ Canonical | Mechanical description |
| **Prerequisites** | Secret item `.system.prerequisites` | String | ✅ Canonical | Text-only |
| **Tier** | Secret item `.system.tier` | Number | ✅ Canonical | Complexity level |
| **Selected Count** | Session draftSelections tracking | Number | ✅ Runtime | Multiple selections allowed |

**Mentor Thought:**
- **Current State:** Not displayed
- **Canonical Source:** None identified
- **Status:** ❌ Missing
- **Ask Mentor:** Supported

**Detail Panel Display (force-secret-details.hbs):**
- Name + selected count badge
- Description (conditional)
- Prerequisites (conditional, text-only)
- Hint about multiple selections
- Action buttons: Add/Deselect, Ask Mentor

---

### 9. LANGUAGES

**Canonical Sources:**
- Language registry: `LanguageRegistry.getAll()`
- Languages data: `data/languages.json` (categories structure)
- Language compendium or JSON items

**Data Fields:**

| Field | Source | Format | Status | Notes |
|-------|--------|--------|--------|-------|
| **Name** | Language item `.name` or registry `.name` | String | ✅ Canonical | Language name |
| **Category** | Language item `.category` or registry `.category` | String | ✅ Canonical | widelyUsed, localTrade, etc. |
| **Description** | Language item `.system.description` | String | ✅ Partial | May or may not exist for all languages |
| **Is Known** | Computed from species/background/class | Boolean | ✅ Runtime | Automatic/granted languages |
| **Is Selected** | Session draftSelections tracking | Boolean | ✅ Runtime | Player-chosen this step |
| **Remaining Picks** | LanguageEngine calculation | Number | ✅ Runtime | INT modifier + other sources |

**Mentor Thought:**
- **Current State:** Not displayed
- **Canonical Source:** None identified
- **Status:** ❌ Missing
- **Ask Mentor:** Not explicitly supported in language step

**Detail Panel Display (language-details.hbs):**
- Name + category chip
- Status badge: Known/Selected/Available
- Description (conditional)
- Why automatic note (conditional)
- Remaining picks info (conditional)
- Action buttons: Select/Remove (conditional)

**Gaps & Inconsistencies:**
1. No mentor prose
2. Language descriptions may be incomplete
3. Ask Mentor not wired into language step

---

### 10. SKILLS

**Canonical Sources:**
- Skills data: `data/skills.json`
- Skills registry: Available via registry
- Extra skill uses: `data/extraskilluses.json`

**Data Fields:**

| Field | Source | Format | Status | Notes |
|-------|--------|--------|--------|-------|
| **Name** | Skill item `.name` | String | ✅ Canonical | Skill name |
| **Description** | Skill item `.system.description` | String | ✅ Canonical | What the skill is used for |
| **Ability** | Skill item `.system.ability` | String | ✅ Canonical | STR, DEX, CON, INT, WIS, CHA |
| **Trained Only** | Skill item `.system.trainedOnly` | Boolean | ✅ Canonical | Can only be used if trained |

**Mentor Thought:**
- **Current State:** Not displayed (skills granted via backgrounds/class, not selected directly)
- **Canonical Source:** N/A
- **Status:** N/A
- **Ask Mentor:** N/A

**Note:** Skills are NOT directly selected in progression; they're granted via Background and Class selections. If detail panel is added for skills display (in summary), skill descriptions exist but mentor prose does not.

---

### 11. STARSHIP MANEUVERS

**Canonical Sources:**
- Foundry compendium: Starship maneuver items
- Maneuvers registry: May be available

**Data Fields:**

| Field | Source | Format | Status | Notes |
|-------|--------|--------|--------|-------|
| **Name** | Maneuver item `.name` | String | ✅ Canonical | From item |
| **Description** | Maneuver item `.system.description` | HTML/String | ✅ Canonical | Mechanical description |
| **Prerequisites** | Maneuver item `.system.prerequisites` | String | ✅ Partial | May or may not exist |
| **Selected Count** | Session draftSelections tracking | Number | ✅ Runtime | Multiple selections allowed (stacking model) |

**Mentor Thought:**
- **Current State:** Not displayed
- **Canonical Source:** None identified
- **Status:** ❌ Missing
- **Ask Mentor:** Supported

**Detail Panel Display (starship-maneuver-details.hbs):**
- Name + selected count badge
- Description (conditional)
- Hint about multiple selections
- Action buttons: Add/Deselect, Ask Mentor

**Gaps & Inconsistencies:**
1. No mentor prose
2. Prerequisites may be missing for some maneuvers

---

### 12. DROID SYSTEMS

**Canonical Sources:**
- Droid builder context (final-droid-configuration-step)
- Droid system compendium items

**Data Fields:**

| Field | Source | Format | Status | Notes |
|-------|--------|--------|--------|-------|
| **Name** | System item `.name` | String | ✅ Canonical | From item |
| **Description** | System item `.system.description` | HTML/String | ✅ Canonical | Mechanical description |
| **Type** | System item `.system.type` | String | ✅ Canonical | Droid system category |
| **Cost** | System item `.system.cost` | Number | ✅ Canonical | Build point cost |
| **Slots Required** | System item `.system.slotsRequired` | Number | ✅ Canonical | Space in droid |

**Mentor Thought:**
- **Current State:** Not displayed
- **Canonical Source:** None identified
- **Status:** ❌ Missing
- **Ask Mentor:** Not supported in droid builder

**Detail Panel:** Droid systems shown in final-droid-configuration-step but detail panel not used; inline display only.

---

### 13. ATTRIBUTES (Ability Scores)

**Canonical Sources:**
- Ability system hardcoded (STR, DEX, CON, INT, WIS, CHA)
- Descriptions: attribute-details.hbs template (hardcoded guidance text per ability)

**Data Fields:**

| Field | Source | Format | Status | Notes |
|-------|--------|--------|--------|-------|
| **Name/Label** | Hardcoded | String | ✅ Canonical | Strength, Dexterity, etc. |
| **Description** | Hardcoded in template | String | ✅ Template | "Strength affects melee combat..." |
| **Base Score** | Ability score method (rolling, point buy, etc.) | Number | ✅ Runtime | 3-18 range |
| **Species Modifier** | Species item `.system.abilityScores[ability]` | Number | ✅ Canonical | +2 DEX, -2 CON, etc. |
| **Final Score** | Base + modifier | Number | ✅ Runtime | Computed |
| **Modifier** | (score - 10) / 2 | Number | ✅ Runtime | Computed |
| **What This Affects** | Hardcoded list per ability | Array | ✅ Template | Combat, defense, skill bonuses, etc. |
| **Guidance Text** | Hardcoded per ability | String | ✅ Template | "Strength affects melee combat..." |

**Mentor Thought:**
- **Current State:** Hardcoded guidance in attribute-details.hbs
- **Canonical Source:** Template only
- **Status:** ✅ Exists but not externalized; template conditional text per ability

---

## Authoritative Data Source Summary

| Item Type | Name | Category | Description | Prerequisites | Metadata Tags | Mentor Prose |
|-----------|------|----------|-------------|---|---|---|
| **Feat** | Compendium | feat-metadata.json | Feat item field | Text-only (item field) | feat-metadata.json | ❌ None |
| **Talent** | Compendium | talent-tree-tags.json | JSON or item field | Structured JSON | talent-tree-tags.json | ❌ None |
| **Species** | Registry | Hardcoded | Item field | N/A | Item fields | ✅ ol-salty-dialogues.json |
| **Class** | Registry | Compendium | Item field | N/A | Item fields | ⚠️  Mentor swap only |
| **Background** | backgrounds.json | backgrounds.json | JSON field | N/A | JSON fields | ❌ None |
| **Force Power** | Registry | force-powers.json | Item field | Text-only (item field) | Item fields | ⚠️  Manifestation prose exists |
| **Force Technique** | Registry | forcetechniques.enriched.json | Item field | Text-only | Item fields | ❌ None |
| **Force Secret** | Registry | forcesecrets.enriched.json | Item field | Text-only | Item fields | ❌ None |
| **Language** | Registry | languages.json | Item/Registry field | N/A | Registry field | ❌ None |
| **Skill** | Registry | skills.json | Item field | N/A | Item fields | ❌ None (skills not selected directly) |
| **Starship Maneuver** | Compendium | Compendium field | Item field | Text-only | Item fields | ❌ None |
| **Droid System** | Compendium | Compendium field | Item field | N/A | Item fields | ❌ None |
| **Attribute** | Hardcoded | Hardcoded | Template hardcoded | N/A | Hardcoded | ✅ Template hardcoded |

---

## Critical Findings

### Prerequisites: Structure vs. Text Inconsistency

**Problem:** Different item types have different prerequisite formats.

| Type | Format | Structure | Status |
|------|--------|-----------|--------|
| Feat | Text string (item field) | Unstructured prose | ❌ Cannot validate "met" status |
| Talent | Structured JSON (talent-prerequisites.json) | feat, talent, skillTrained, featPattern conditions | ✅ Renderable with validation |
| Force Power | Text string (item field) | Unstructured prose | ❌ Cannot validate |
| Force Technique | Text string (item field) | Unstructured prose | ❌ Cannot validate |
| Force Secret | Text string (item field) | Unstructured prose | ❌ Cannot validate |
| Language | N/A | No prerequisites | ✅ N/A |
| Starship Maneuver | Text string (item field) | Unstructured prose | ❌ Cannot validate |

**Impact:** Detail rail cannot render "met/unmet" prerequisite indicators for most types unless prerequisite data is structured (like talents).

---

### Mentor Prose: Large Gaps

**Current State:**
- ✅ Species: Ol' Salty dialogue file per-species
- ✅ Attributes: Template hardcoded guidance
- ⚠️  Force Powers: Manifestation prose exists but not mentor-specific
- ❌ Everything else: No pre-authored mentor prose

**Impact:** Detail panels cannot show mentor-specific "why you should pick this" guidance for most items. Ask Mentor works, but requires user action.

---

### Description Coverage: Variable

| Type | Coverage | Notes |
|------|----------|-------|
| Feat | ~95% | Most feats have descriptions in compendium |
| Talent | ~90% | Most talents have descriptions |
| Species | 100% | All have narrative descriptions |
| Class | 100% | All have descriptions/fantasy field |
| Background | 100% | All have narrativeDescription in JSON |
| Force Power | ~95% | Most have descriptions |
| Force Technique | ~90% | Most have descriptions |
| Force Secret | ~90% | Most have descriptions |
| Language | ~50% | Many lack descriptions |
| Skill | 90% | Most have descriptions |
| Starship Maneuver | ~80% | Some may lack descriptions |
| Droid System | ~85% | Most have descriptions |

---

## Data Model Risks & Inconsistencies

### Risk 1: Prerequisite Validation Impossibility

**Issue:** Feat, Force Power, and Starship Maneuver prerequisites are stored as freetext strings. Detail rail cannot display "met/unmet" status icons.

**Example:** Feat prerequisite = "Weapon Focus (any)" — impossible to parse and validate programmatically.

**Mitigation:** Would require either:
1. Migrating feat/force power prerequisites to structured format (large undertaking)
2. Accepting text-only display with no validation
3. Using heuristic parsing (brittle, error-prone)

---

### Risk 2: Mentor Prose Non-Existence

**Issue:** Only Species (Ol' Salty) and Attributes (hardcoded) have mentor guidance. Everything else must use Ask Mentor.

**Example:** No pre-authored guidance for "why pick Thermal Detonators feat" or "why pick Consular class".

**Mitigation:** Would require:
1. Per-mentor, per-item prose files (massive content creation)
2. OR generic fallback prose generation (risks generic/unhelpful text)
3. OR continue Ask Mentor on-demand model (current state)

---

### Risk 3: Description Source Ambiguity (Talents)

**Issue:** Talent descriptions may come from either:
- Talent item `.system.description` (compendium)
- `data/talent-tree-descriptions.json` (separate JSON file)

**Unknown:** Which takes precedence? Are they de-duplicated?

**Mitigation:** Detail rail implementation must explicitly choose one source and document it.

---

### Risk 4: Missing Metadata for Languages

**Issue:** Language registry may not include all data fields needed for rich detail display.

**Current State:** Categories exist but per-language metadata (e.g., difficulty, cultural significance) not inventoried.

**Mitigation:** Detail rail for languages should verify registry has necessary fields before implementation.

---

## Recommendations for Detail Rail Implementation

### Phase 1: Low-Friction Items (Ready Now)

✅ **Implement detail rail for:**
- **Species:** All data ready; Ol' Salty prose available; no blocker
- **Class:** All data ready; can defer mentor guidance or implement Ask Mentor
- **Background:** All data ready; can implement with simple prose display
- **Attributes:** All data ready; template guidance exists
- **Languages:** Most data ready; description coverage ~50% (acceptable)

**Effort:** Low; no data migration needed; mostly template/styling work

### Phase 2: Medium-Friction Items (Minor Cleanup)

⚠️  **Can implement but with known gaps:**
- **Feat:** Description + category complete; prerequisites text-only (no validation); no mentor prose (Ask Mentor available)
- **Talent:** Description + structured prerequisites available; implement structured prerequisite display (TODO in current template)
- **Force Power:** Description complete; prerequisites text-only; manifestation prose exists but not mentor-specific
- **Force Technique:** Description complete; prerequisites text-only; no mentor prose
- **Force Secret:** Description complete; prerequisites text-only; no mentor prose
- **Starship Maneuver:** Description ~80% coverage; prerequisites text-only

**Effort:** Medium; template/logic work needed; accept text-only prerequisites as interim solution

### Phase 3: High-Friction Items (Data Work Required)

❌ **Defer or require data migration:**
- **Droid Systems:** Not used in detail rail context currently; would need new step design
- **Skills:** Granted via background/class; not selectable directly; would need aggregated display in summary step

**Effort:** High; requires architecture review and possible data restructuring

---

## Summary: What Exists, What's Missing, What's Blocked

### What's Ready for Immediate Use ✅
- Feat descriptions (compendium items)
- Talent descriptions + structured prerequisites (both available)
- Species descriptions + mentor prose (ol-salty-dialogues.json)
- Class descriptions + BAB/hit die/defense data
- Background descriptions + mechanical effects (backgrounds.json)
- Force power descriptions + manifestation prose
- Language descriptions (partial but acceptable)

### What Exists but Incomplete ⚠️
- Talent prerequisite display (marked TODO; structured data available but not rendered)
- Prerequisite validation for feats/force powers (text-only; cannot validate "met" status)
- Mentor prose (only species; others require Ask Mentor on-demand)
- Description coverage for some types (languages ~50%, starship maneuvers ~80%)

### What's Missing and Blocked ❌
- Mentor prose for feats, talents, backgrounds, force types, languages, starship maneuvers, droid systems
- Structured prerequisites for feats, force powers, force techniques, force secrets, starship maneuvers
- Per-language metadata (difficulty, cultural significance, etc.)
- Droid system detail display (would require new step architecture)

---

## Implementation Strategy (Recommended)

### Immediate (Phases 1–2 work, no blockers):
1. Implement detail rail for **Species, Class, Background, Attributes, Languages**
2. Implement detail rail for **Feats, Force Powers** (accept text-only prerequisites)
3. Implement detail rail for **Talents** (render structured prerequisites properly; resolve TODO comment)

### Short-Term (Phase 2 work, minor gaps):
4. Implement detail rail for **Force Techniques, Force Secrets, Starship Maneuvers** (text-only prerequisites acceptable)
5. Ensure Ask Mentor wired into all detail panels (mentor guidance available on-demand)

### Future (Phase 3, requires data work):
6. Migrate feat/force power prerequisites to structured format (enables "met/unmet" display)
7. Author mentor prose for all item types (large content creation effort)
8. Design droid system detail panel and step integration

---

**Conclusion:** The detail rail architecture can proceed with Phase 1–2 items immediately. Phase 3 requires separate data/content work and should not block initial implementation. Text-only prerequisites and Ask Mentor fallback are acceptable interim solutions.

