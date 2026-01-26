# Template Data ID Conversion Strategy

**Date:** 2026-01-26
**Scope:** Convert all template data from names to IDs for reliability
**Goal:** Eliminate fragility of name-based lookups in chargen

---

## The Problem: Name-Based Lookups Are Fragile

Current templates use **names** for all references:
```json
{
  "background": "Alderaan Origin",     // Name lookup
  "species": "Mirialan",                // Name lookup
  "feat": "Weapon Finesse",             // Name lookup
  "talent": "Block",                    // Name lookup
  "forcePowers": ["Battle Strike", ...] // Name lookup
}
```

**Issues:**
- If item is renamed in compendium, template breaks
- If item is deleted, template silently fails
- Typos in template data aren't caught
- No guarantee item with that name exists

---

## The Solution: Use IDs Instead

Convert all template data to use **stable compendium IDs**:
```json
{
  "backgroundId": "spacer",            // ID lookup
  "speciesId": "mirialan",             // ID lookup
  "featIds": ["weapon-finesse"],       // ID lookup
  "talentIds": ["block"],              // ID lookup
  "forcePowerIds": ["battle-strike"]   // ID lookup
}
```

**Benefits:**
- IDs don't change if item is renamed
- System can validate that ID exists at startup
- Safer chargen (fail-fast on missing data)
- Easier to audit template data

---

## Data Fields That Need ID Conversion

### 1. Species (CURRENTLY: String Name)
```json
// CURRENT
"species": "Mirialan"

// TARGET
"speciesId": "mirialan"
```

**ID Source:** `PROGRESSION_RULES.species` keys
**Available IDs:** Human, Bothan, Droid, Mirialan, Miraluka, Twi'lek, Wookiee, etc.
**Fallback:** Use exact key from PROGRESSION_RULES

---

### 2. Background (CURRENTLY: String Name)
```json
// CURRENT
"background": "Alderaan Origin"

// TARGET
"backgroundId": "alderaan-origin"
```

**ID Source:** `PROGRESSION_RULES.backgrounds` keys
**Mapping Required:** Name → ID (need to create mapping table)
**Example Mapping:**
- "Spacer" → "spacer"
- "Alderaan Origin" → "alderaan-origin"
- "Scarred" → "scarred"

---

### 3. Class (CURRENTLY: className String)
```json
// CURRENT
"className": "Jedi"
"class": "Jedi"

// TARGET
"classId": "jedi"
```

**ID Source:** `PROGRESSION_RULES.classes` keys
**Available IDs:** Jedi, Noble, Scout, Scoundrel, Soldier, etc.
**Mapping:** All appear to be lowercase versions of names

---

### 4. Feats (CURRENTLY: Single String Name)
```json
// CURRENT
"feat": "Weapon Finesse"

// TARGET
"featIds": ["weapon-finesse"]
```

**ID Source:** Feat compendium (need to map names to IDs)
**Mapping Required:** Feat name → Feat ID
**Complexity:** HIGH - Need to find where feat IDs are stored

**Potential sources:**
1. `PROGRESSION_RULES.feats` if available
2. Foundry compendium system (actor.itemTypes('feat'))
3. External feat registry

---

### 5. Talents (CURRENTLY: Single String Name)
```json
// CURRENT
"talent": "Block"

// TARGET
"talentIds": ["block"]
```

**ID Source:** Talent compendium (need to map names to IDs)
**Mapping Required:** Talent name → Talent ID
**Same complexity as feats**

---

### 6. Talent Tree (CURRENTLY: String Name)
```json
// CURRENT
"talentTree": "Jedi Guardian"

// TARGET
"talentTreeId": "jedi-guardian"
```

**ID Source:** Talent tree registry (need to determine where these are defined)
**Note:** This might be a class-specific designation, not a separate entity

---

### 7. Force Powers (CURRENTLY: Array of Names)
```json
// CURRENT
"forcePowers": ["Battle Strike", "Surge"]

// TARGET
"forcePowerIds": ["battle-strike", "surge"]
```

**ID Source:** Force power compendium (need to map names to IDs)
**Mapping Required:** Force power name → Force power ID

---

### 8. Starting Equipment (CURRENTLY: Array of Names)
```json
// CURRENT
"startingEquipment": ["Lightsaber", "Medpac", "Comlink, Short-Range"]

// TARGET
"itemIds": ["lightsaber", "medpac", "comlink-short-range"]
```

**ID Source:** Item compendium (need to map names to IDs)
**Mapping Required:** Item name → Item ID
**Complexity:** HIGH - Many items, names vary

---

### 9. Trained Skills (ALREADY ID-BASED)
```json
// CURRENT
"trainedSkills": ["useTheForce", "acrobatics", "initiative", "perception"]

// NO CHANGE NEEDED - These are already IDs
```

✅ **No conversion needed** - Already using IDs

---

### 10. Mentor (CURRENTLY: Lowercase String)
```json
// CURRENT
"mentor": "miraj"

// TARGET
"mentorClass": "Jedi"  // Or keep as is if this is already an ID
```

**Note:** This appears to already be using a mentor identifier. Need to clarify if this should be:
- Mentor class (Jedi, Scout, Scoundrel, Noble)
- Mentor instance ID (specific NPC mentor)
- Current mapping (miraj → Jedi mentor)

---

## ID Convention Standards

### Proposed Conventions
1. **Species IDs:** Exact case from PROGRESSION_RULES (Human, Bothan, Mirialan, etc.)
2. **Background IDs:** Lowercase, hyphenated (spacer, alderaan-origin, scarred)
3. **Class IDs:** Lowercase (jedi, noble, scout, scoundrel, soldier)
4. **Feat IDs:** Lowercase, hyphenated (weapon-finesse, skill-focus, etc.)
5. **Talent IDs:** Lowercase, hyphenated (block, force-focus, etc.)
6. **Power IDs:** Lowercase, hyphenated (battle-strike, surge, etc.)
7. **Item IDs:** Lowercase, hyphenated (lightsaber, medpac, etc.)

---

## Implementation Strategy

### Phase 1: Create ID Mapping Tables
Build lookup tables to convert names to IDs:

```javascript
// scripts/progression/data/template-id-mappings.js
export const TEMPLATE_ID_MAPPINGS = {
  // Species: Name → ID (from PROGRESSION_RULES)
  speciesByName: {
    "Mirialan": "Mirialan",
    "Miraluka": "Miraluka",
    "Bothan": "Bothan",
    // ...
  },

  // Backgrounds: Name → ID (need to verify)
  backgroundByName: {
    "Spacer": "spacer",
    "Alderaan Origin": "alderaan-origin",
    "Scarred": "scarred",
    // ...
  },

  // Classes: Name → ID
  classByName: {
    "Jedi": "jedi",
    "Noble": "noble",
    "Scout": "scout",
    // ...
  },

  // Feats: Name → ID (need to build from compendium)
  featByName: {
    "Weapon Finesse": "weapon-finesse",
    "Skill Focus (Use the Force)": "skill-focus",
    // ...
  },

  // Talents: Name → ID (need to build from compendium)
  talentByName: {
    "Block": "block",
    "Force Focus": "force-focus",
    // ...
  },

  // Force Powers: Name → ID
  forcePowerByName: {
    "Battle Strike": "battle-strike",
    "Surge": "surge",
    "Move Object": "move-object",
    // ...
  },

  // Starting Equipment: Name → ID
  itemByName: {
    "Lightsaber": "lightsaber",
    "Medpac": "medpac",
    "Comlink, Short-Range": "comlink-short-range",
    // ...
  }
};

// Function to convert old format to new
export function convertTemplateToIds(oldTemplate) {
  return {
    id: oldTemplate.id,
    name: oldTemplate.name,
    class: oldTemplate.class,
    archetype: oldTemplate.archetype,
    // ... other display fields unchanged

    // Converted IDs
    speciesId: TEMPLATE_ID_MAPPINGS.speciesByName[oldTemplate.species],
    backgroundId: TEMPLATE_ID_MAPPINGS.backgroundByName[oldTemplate.background],
    classId: TEMPLATE_ID_MAPPINGS.classByName[oldTemplate.className],
    featIds: [TEMPLATE_ID_MAPPINGS.featByName[oldTemplate.feat]],
    talentIds: [TEMPLATE_ID_MAPPINGS.talentByName[oldTemplate.talent]],
    forcePowerIds: oldTemplate.forcePowers?.map(name =>
      TEMPLATE_ID_MAPPINGS.forcePowerByName[name]
    ) || [],
    itemIds: oldTemplate.startingEquipment?.map(name =>
      TEMPLATE_ID_MAPPINGS.itemByName[name]
    ) || [],
    trainedSkills: oldTemplate.trainedSkills, // Already IDs
  };
}
```

---

### Phase 2: Update Template JSON
Convert `character-templates.json` to ID-based format:

```json
{
  "templates": [
    {
      "id": "jedi_guardian",
      "name": "Guardian",
      "class": "Jedi",
      "archetype": "Guardian",
      "description": "...",
      "imagePath": "...",

      // IDs (New)
      "speciesId": "Mirialan",
      "backgroundId": "alderaan-origin",
      "classId": "jedi",
      "featIds": ["weapon-finesse"],
      "talentIds": ["block"],
      "talentTreeId": "jedi-guardian",
      "forcePowerIds": ["battle-strike", "surge"],
      "itemIds": ["lightsaber", "medpac", "comlink-short-range", "glow-rod"],
      "trainedSkills": ["useTheForce", "acrobatics", "initiative", "perception"],
      "mentorClass": "Jedi",

      "abilityScores": { "str": 10, "dex": 16, ... },
      "level": 1,
      "credits": 465
    }
  ]
}
```

---

### Phase 3: Update Progression Engine
Ensure public API methods work with IDs:

```javascript
// In progression.js - confirmFeat already works with IDs
async confirmFeat(featId, options = {}) {
  return this.confirmFeats([featId], options);
}

// In progression.js - applyTemplatePackage already expects IDs
async applyTemplatePackage(templateId, options = {}) {
  const template = PROGRESSION_RULES.templates?.[templateId];

  if (template.speciesId) {
    await this.confirmSpecies(template.speciesId);
  }

  if (template.featIds && Array.isArray(template.featIds)) {
    await this.confirmFeats(template.featIds);
  }

  // ... etc
}

// ✅ No changes needed - progression engine already uses IDs internally
```

---

### Phase 4: Update Chargen/Template Loader
Update code that loads templates to validate IDs:

```javascript
// scripts/apps/chargen/chargen-templates.js
export class CharacterTemplates {
  static async loadTemplates() {
    const response = await fetch('data/character-templates.json');
    const data = await response.json();

    // Validate all IDs exist
    for (const template of data.templates) {
      this._validateTemplateIds(template);
    }

    return data.templates;
  }

  static _validateTemplateIds(template) {
    const { PROGRESSION_RULES } = await import('../progression/data/progression-data.js');

    if (!PROGRESSION_RULES.species[template.speciesId]) {
      throw new Error(`Template "${template.id}": Unknown species ID "${template.speciesId}"`);
    }

    if (!PROGRESSION_RULES.backgrounds[template.backgroundId]) {
      throw new Error(`Template "${template.id}": Unknown background ID "${template.backgroundId}"`);
    }

    // ... validate all IDs
  }
}
```

---

### Phase 5: Migration & Audit
Run migration to ensure data integrity:

```javascript
// scripts/maintenance/migrate-templates-to-ids.js
export async function migrateTemplatesToIds() {
  // Load old format templates
  const oldTemplates = await CharacterTemplates.loadTemplates();

  // Convert to new format
  const newTemplates = oldTemplates.map(convertTemplateToIds);

  // Validate all converted IDs exist
  for (const template of newTemplates) {
    validateAllIds(template);
  }

  // Write new format to file
  const output = {
    generated: new Date().toISOString(),
    source: 'character-templates.json',
    templates: newTemplates
  };

  await fs.writeFile('data/character-templates.json', JSON.stringify(output, null, 2));

  console.log(`Migrated ${newTemplates.length} templates to ID-based format`);
}
```

---

## ID Availability Questions

Need to research/determine for each data type:

1. **Where are Feat IDs stored?**
   - PROGRESSION_RULES.feats?
   - Compendium lookup?
   - Hard-coded mapping table?

2. **Where are Talent IDs stored?**
   - PROGRESSION_RULES.talents?
   - Compendium lookup?
   - Hard-coded mapping table?

3. **Where are Force Power IDs stored?**
   - PROGRESSION_RULES.forcePowers?
   - Compendium lookup?
   - Part of talent system?

4. **Where are Item IDs stored?**
   - Foundry compendium system?
   - Hard-coded in startingEquipment?
   - Part of character class grants?

5. **What about Mentor?**
   - Is "miraj" already an ID or does it need conversion?
   - Should map to mentor class (Jedi, Scout, Scoundrel, Noble)?

---

## Benefits of ID-Based Templates

✅ **Reliability:**
- Fail-fast if referenced item doesn't exist
- Rename items without breaking templates
- Delete items and know immediately

✅ **Maintainability:**
- Easier to audit template data
- Easier to find all templates using a specific item
- Easier to update item definitions

✅ **Consistency:**
- All template data uses same format (IDs)
- Same format as chargen/progression system uses internally
- No name→ID conversion needed at runtime

✅ **Performance:**
- Direct ID lookup instead of name search
- No fuzzy matching needed
- Can prevalidate at load time

---

## Timeline

- **Phase 1:** Create ID mapping tables - 2 hours
- **Phase 2:** Convert template JSON - 1 hour
- **Phase 3:** Update progression engine - 30 minutes (mostly done)
- **Phase 4:** Update loaders with validation - 1 hour
- **Phase 5:** Migration & audit - 1 hour

**Total:** ~5-6 hours

---

## Decision Points

**Before proceeding, need to answer:**

1. Where should we get feat/talent/power IDs?
   - Are they in PROGRESSION_RULES?
   - Or do we need to scan compendiums?
   - Or create a mapping table?

2. Should we keep JSON format or move to JavaScript?
   - JSON is user-editable but no validation
   - JavaScript allows validation at import time

3. Should we validate template IDs at load or at runtime?
   - At load: Catch errors immediately, fail-fast
   - At runtime: More flexible but errors appear during play

4. What about multi-feat/talent templates?
   - Should templates support multiple feats/talents?
   - Current templates only have one of each

---

## Next Steps

1. **Inventory existing systems:**
   - Where are feat IDs defined?
   - Where are talent IDs defined?
   - Where are power IDs defined?
   - Where are item IDs defined?

2. **Build ID mapping tables:**
   - Create lookup tables for each data type
   - Verify all template data has valid mappings

3. **Create conversion script:**
   - Script to convert templates.json to ID format
   - Script to validate all IDs exist

4. **Update progression engine:**
   - Ensure applyTemplatePackage expects IDs
   - Add validation that IDs exist

5. **Test with real templates:**
   - Boot system with ID-based templates
   - Run chargen, verify template application works

---

## Current Template Summary

**Existing templates in character-templates.json:**
- jedi_guardian
- jedi_consular
- jedi_defender
- noble_diplomat
- noble_officer
- noble_court_official
- scout_gunslinger
- scout_tracker
- scoundrel_gambler
- scoundrel_smuggler
- soldier_commando
- soldier_merc
- spacer_trader
- spacer_pilot
- droid_combat
- droid_utility

**Each template contains:** species, background, abilities, class, feats, talents, force powers, equipment

**Total templates:** 16 pre-configured character options

---

This strategy ensures templates are:
1. ✅ Static (IDs don't change)
2. ✅ Reliable (system validates at startup)
3. ✅ Consistent (same format as internal progression engine)
4. ✅ Maintainable (easy to audit and update)

