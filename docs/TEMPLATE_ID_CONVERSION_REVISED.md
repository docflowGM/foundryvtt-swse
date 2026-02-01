# Template Data ID Conversion - REVISED (Using Compendium IDs)

**Date:** 2026-01-26
**Updated Approach:** Use actual Foundry compendium IDs instead of creating mapping tables
**Source of Truth:** Compendium .db files in `/packs/`
**Validation:** Existing SSOT registries (TalentDB, ClassesDB, FeatureIndex, etc.)

---

## The Better Approach: Use Compendium IDs Directly

Instead of creating mapping tables, **use the actual Foundry compendium IDs** that are already the system of record.

### Compendium Structure

```
/packs/
├── feats.db              → 420 feats (ID: 16-char hex like "0053d97632b02e4a")
├── talents.db            → 986 talents (ID: 16-char hex like "001ae84d5862af55")
├── classes.db            → 37 classes (ID: 16-char hex like "06f4d9029debf827")
├── species.db            → 111 species (ID: slug format like "species-advozse")
├── forcepowers.db        → 31 force powers (ID: 16-char hex)
├── forcetechniques.db    → 57 force techniques (ID: 16-char hex)
├── forcesecrets.db       → 20 force secrets (ID: 16-char hex)
├── talent_trees.db       → 187 talent trees (ID: 16-char hex)
└── ... other equipment, weapons, armor, skills, etc.
```

---

## Template Data: Current vs. Target

### Before (Fragile - Name-Based)
```json
{
  "id": "jedi_guardian",
  "species": "Mirialan",
  "background": "Alderaan Origin",
  "class": "Jedi",
  "feat": "Weapon Finesse",
  "talent": "Block",
  "talentTree": "Jedi Guardian",
  "forcePowers": ["Battle Strike", "Surge"],
  "startingEquipment": ["Lightsaber", "Medpac"],
  "trainedSkills": ["useTheForce", "acrobatics"]
}
```

**Problems:**
- If "Weapon Finesse" is renamed in the feat compendium, template breaks silently
- No validation that "Mirialan" exists
- No way to distinguish between duplicate names

### After (Reliable - ID-Based)
```json
{
  "id": "jedi_guardian",

  // All values now reference actual compendium IDs
  "speciesId": "species-mirialan",              // From species.db
  "backgroundId": "0c7a9e2f1d4b6e3a",         // From backgrounds.db (hex ID)
  "classId": "06f4d9029debf827",               // From classes.db (hex ID)

  "featIds": ["0053d97632b02e4a"],             // From feats.db (hex ID)
  "talentIds": ["001ae84d5862af55"],           // From talents.db (hex ID)
  "talentTreeIds": ["a212850887fe41da"],       // From talent_trees.db (hex ID)

  "forcePowerIds": [
    "00b65e47a4dd7d76",  // Battle Strike
    "1a3c2e5f8d9b4c7a"   // Surge
  ],

  "itemIds": [
    "weapon-lightsaber-standard",  // From weapons.db
    "equipment-medpac"              // From equipment.db
  ],

  // Already ID-based, no change
  "trainedSkillIds": ["useTheForce", "acrobatics"]
}
```

---

## Implementation: 4 Phases

### Phase 1: Build Compendium ID Mapper

Create a utility that leverages existing infrastructure to map names → IDs:

```javascript
// scripts/utils/template-id-mapper.js

import { TalentDB } from '../data/talent-db.js';
import { ClassesDB } from '../data/classes-db.js';
import { TalentTreeDB } from '../data/talent-tree-db.js';
import { FeatureIndex } from '../progression/engine/feature-index.js';
import { compendiumLoader } from './compendium-loader.js';

export class TemplateIdMapper {
  /**
   * Convert template name-based data to ID-based data
   * Uses existing SSOT registries for lookups
   */
  static async convertTemplate(oldTemplate) {
    return {
      // Display fields (unchanged)
      id: oldTemplate.id,
      name: oldTemplate.name,
      class: oldTemplate.class,
      archetype: oldTemplate.archetype,
      description: oldTemplate.description,
      imagePath: oldTemplate.imagePath,
      abilityScores: oldTemplate.abilityScores,
      level: oldTemplate.level,
      credits: oldTemplate.credits,

      // Converted to IDs using SSOT registries
      speciesId: await this._getSpeciesId(oldTemplate.species),
      backgroundId: await this._getBackgroundId(oldTemplate.background),
      classId: await this._getClassId(oldTemplate.className || oldTemplate.class),

      featIds: oldTemplate.feat
        ? [await this._getFeatId(oldTemplate.feat)]
        : [],

      talentIds: oldTemplate.talent
        ? [await this._getTalentId(oldTemplate.talent)]
        : [],

      talentTreeIds: oldTemplate.talentTree
        ? [await this._getTalentTreeId(oldTemplate.talentTree)]
        : [],

      forcePowerIds: oldTemplate.forcePowers
        ? await Promise.all(oldTemplate.forcePowers.map(name => this._getForcePowerId(name)))
        : [],

      itemIds: oldTemplate.startingEquipment
        ? await Promise.all(oldTemplate.startingEquipment.map(name => this._getItemId(name)))
        : [],

      trainedSkillIds: oldTemplate.trainedSkills || [], // Already IDs
      mentorClass: oldTemplate.mentor || null
    };
  }

  // ============================================================================
  // Private lookup methods - use existing SSOT registries
  // ============================================================================

  /**
   * Get species ID from PROGRESSION_RULES or compendium
   * Species IDs follow slug format: "species-advozse"
   */
  static async _getSpeciesId(speciesName) {
    if (!speciesName) return null;

    // Try PROGRESSION_RULES first (it's already indexed)
    const { PROGRESSION_RULES } = await import('../progression/data/progression-data.js');

    // PROGRESSION_RULES.species uses keys like "Human", "Mirialan", etc.
    if (PROGRESSION_RULES.species[speciesName]) {
      // Return the slug ID format
      return `species-${speciesName.toLowerCase()}`;
    }

    // If not found, query compendium to be sure
    const speciesPack = game.packs.get('foundryvtt-swse.species');
    const index = await speciesPack.getIndex();
    const speciesEntry = Array.from(index).find(e =>
      e.name.toLowerCase() === speciesName.toLowerCase()
    );

    if (!speciesEntry) {
      throw new Error(`Species not found in compendium: "${speciesName}"`);
    }

    return speciesEntry._id;
  }

  /**
   * Get background ID from compendium
   */
  static async _getBackgroundId(backgroundName) {
    if (!backgroundName) return null;

    const bgPack = game.packs.get('foundryvtt-swse.backgrounds');
    const index = await bgPack.getIndex();
    const bgEntry = Array.from(index).find(e =>
      e.name.toLowerCase() === backgroundName.toLowerCase()
    );

    if (!bgEntry) {
      throw new Error(`Background not found in compendium: "${backgroundName}"`);
    }

    return bgEntry._id;
  }

  /**
   * Get class ID from ClassesDB (SSOT)
   */
  static async _getClassId(className) {
    if (!className) return null;

    const classData = ClassesDB.getByName(className);
    if (!classData) {
      throw new Error(`Class not found: "${className}"`);
    }

    return classData._id;
  }

  /**
   * Get feat ID from FeatureIndex (SSOT)
   */
  static async _getFeatId(featName) {
    if (!featName) return null;

    const feat = FeatureIndex.getFeat(featName);
    if (!feat) {
      // Fallback: search compendium
      const featPack = game.packs.get('foundryvtt-swse.feats');
      const index = await featPack.getIndex();
      const featEntry = Array.from(index).find(e =>
        e.name.toLowerCase() === featName.toLowerCase()
      );

      if (!featEntry) {
        throw new Error(`Feat not found in compendium: "${featName}"`);
      }
      return featEntry._id;
    }

    return feat._id;
  }

  /**
   * Get talent ID from TalentDB (SSOT)
   */
  static async _getTalentId(talentName) {
    if (!talentName) return null;

    const talent = TalentDB.getByName(talentName);
    if (!talent) {
      throw new Error(`Talent not found: "${talentName}"`);
    }

    return talent._id;
  }

  /**
   * Get talent tree ID from TalentTreeDB (SSOT)
   */
  static async _getTalentTreeId(treeName) {
    if (!treeName) return null;

    const tree = TalentTreeDB.getByName(treeName);
    if (!tree) {
      throw new Error(`Talent tree not found: "${treeName}"`);
    }

    return tree._id;
  }

  /**
   * Get force power ID from FeatureIndex
   */
  static async _getForcePowerId(powerName) {
    if (!powerName) return null;

    const power = FeatureIndex.getPower(powerName);
    if (!power) {
      // Fallback: search compendium
      const powerPack = game.packs.get('foundryvtt-swse.forcepowers');
      const index = await powerPack.getIndex();
      const powerEntry = Array.from(index).find(e =>
        e.name.toLowerCase() === powerName.toLowerCase()
      );

      if (!powerEntry) {
        throw new Error(`Force power not found: "${powerName}"`);
      }
      return powerEntry._id;
    }

    return power._id;
  }

  /**
   * Get item ID from equipment/weapons compendiums
   * Try to find in equipment, weapons, or armor packs
   */
  static async _getItemId(itemName) {
    if (!itemName) return null;

    // Try equipment pack first
    let pack = game.packs.get('foundryvtt-swse.equipment');
    let index = await pack.getIndex();
    let entry = Array.from(index).find(e =>
      e.name.toLowerCase() === itemName.toLowerCase()
    );

    if (entry) return entry._id;

    // Try weapons pack
    pack = game.packs.get('foundryvtt-swse.weapons');
    index = await pack.getIndex();
    entry = Array.from(index).find(e =>
      e.name.toLowerCase() === itemName.toLowerCase()
    );

    if (entry) return entry._id;

    // Try armor pack
    pack = game.packs.get('foundryvtt-swse.armor');
    index = await pack.getIndex();
    entry = Array.from(index).find(e =>
      e.name.toLowerCase() === itemName.toLowerCase()
    );

    if (entry) return entry._id;

    throw new Error(`Item not found in any compendium: "${itemName}"`);
  }

  /**
   * Report all conversion issues for a template
   * Returns array of errors/warnings
   */
  static async validateTemplate(oldTemplate) {
    const issues = [];

    try {
      await this._getSpeciesId(oldTemplate.species);
    } catch (e) {
      issues.push(`❌ Species: ${e.message}`);
    }

    try {
      await this._getBackgroundId(oldTemplate.background);
    } catch (e) {
      issues.push(`❌ Background: ${e.message}`);
    }

    try {
      await this._getClassId(oldTemplate.className || oldTemplate.class);
    } catch (e) {
      issues.push(`❌ Class: ${e.message}`);
    }

    if (oldTemplate.feat) {
      try {
        await this._getFeatId(oldTemplate.feat);
      } catch (e) {
        issues.push(`❌ Feat: ${e.message}`);
      }
    }

    if (oldTemplate.talent) {
      try {
        await this._getTalentId(oldTemplate.talent);
      } catch (e) {
        issues.push(`❌ Talent: ${e.message}`);
      }
    }

    if (oldTemplate.forcePowers) {
      for (const power of oldTemplate.forcePowers) {
        try {
          await this._getForcePowerId(power);
        } catch (e) {
          issues.push(`❌ Force Power "${power}": ${e.message}`);
        }
      }
    }

    if (oldTemplate.startingEquipment) {
      for (const item of oldTemplate.startingEquipment) {
        try {
          await this._getItemId(item);
        } catch (e) {
          issues.push(`❌ Item "${item}": ${e.message}`);
        }
      }
    }

    return issues;
  }
}
```

---

### Phase 2: Migrate Templates

Create migration script that uses the mapper:

```javascript
// scripts/maintenance/migrate-templates-to-ids.js

import { TemplateIdMapper } from '../utils/template-id-mapper.js';

/**
 * Migrate templates from name-based to ID-based format
 * Safe for production - validates before writing
 */
export async function migrateTemplatesToIds() {
  console.log('[TEMPLATE MIGRATION] Starting migration to compendium IDs...');

  // Load old templates
  const response = await fetch('data/character-templates.json');
  const data = await response.json();
  const oldTemplates = data.templates;

  console.log(`[TEMPLATE MIGRATION] Loaded ${oldTemplates.length} templates`);

  // Validate all templates first
  console.log('[TEMPLATE MIGRATION] Validating templates...');
  const allIssues = {};
  let validCount = 0;

  for (const template of oldTemplates) {
    const issues = await TemplateIdMapper.validateTemplate(template);
    if (issues.length === 0) {
      validCount++;
    } else {
      allIssues[template.id] = issues;
    }
  }

  console.log(`[TEMPLATE MIGRATION] Validation: ${validCount}/${oldTemplates.length} valid`);

  if (Object.keys(allIssues).length > 0) {
    console.warn('[TEMPLATE MIGRATION] Issues found:');
    for (const [templateId, issues] of Object.entries(allIssues)) {
      console.warn(`  ${templateId}:`);
      issues.forEach(issue => console.warn(`    ${issue}`));
    }

    // If validation fails, don't proceed
    if (validCount === 0) {
      throw new Error('Template validation failed - cannot proceed');
    }

    console.warn(`[TEMPLATE MIGRATION] Continuing with ${validCount} valid templates...`);
  }

  // Convert valid templates
  console.log('[TEMPLATE MIGRATION] Converting templates...');
  const newTemplates = [];

  for (const template of oldTemplates) {
    if (!allIssues[template.id]) {
      try {
        const converted = await TemplateIdMapper.convertTemplate(template);
        newTemplates.push(converted);
        console.log(`  ✅ ${template.id}`);
      } catch (err) {
        console.error(`  ❌ ${template.id}: ${err.message}`);
      }
    }
  }

  // Write output
  const output = {
    version: 2,
    migrated: new Date().toISOString(),
    source: 'character-templates.json',
    notes: 'All template data converted to use compendium IDs',
    templates: newTemplates
  };

  console.log(`[TEMPLATE MIGRATION] Migration complete: ${newTemplates.length} templates`);
  console.log('[TEMPLATE MIGRATION] To save, copy output and paste into data/character-templates.json');

  return output;
}
```

---

### Phase 3: Update Template Loader with Validation

Add ID-based validation to template loader:

```javascript
// scripts/apps/chargen/chargen-templates.js (updated)

export class CharacterTemplates {
  static async loadTemplates() {
    const response = await fetch('data/character-templates.json');
    const data = await response.json();

    // Check if templates are ID-based (version 2) or name-based (version 1)
    if (!data.version || data.version === 1) {
      console.warn('[TEMPLATES] Old format (name-based). Consider running migration.');
      return data.templates;
    }

    // ID-based format - validate that all IDs exist
    const templates = data.templates;
    const errors = [];

    for (const template of templates) {
      const templateErrors = await this._validateTemplateIds(template);
      if (templateErrors.length > 0) {
        errors.push({
          templateId: template.id,
          issues: templateErrors
        });
      }
    }

    // Report errors
    if (errors.length > 0) {
      console.error('[TEMPLATES] ID Validation Errors:');
      errors.forEach(({ templateId, issues }) => {
        console.error(`  ${templateId}:`);
        issues.forEach(issue => console.error(`    ${issue}`));
      });

      throw new Error(`Template validation failed: ${errors.length} templates with invalid IDs`);
    }

    console.log(`[TEMPLATES] Loaded ${templates.length} ID-based templates - all IDs valid ✅`);
    return templates;
  }

  /**
   * Validate all IDs in a template exist in compendiums
   * Returns array of error messages (empty if valid)
   */
  static async _validateTemplateIds(template) {
    const errors = [];

    // Validate species ID
    if (template.speciesId) {
      const speciesPack = game.packs.get('foundryvtt-swse.species');
      const doc = await speciesPack.getDocument(template.speciesId).catch(() => null);
      if (!doc) {
        errors.push(`Species ID not found: ${template.speciesId}`);
      }
    }

    // Validate class ID
    if (template.classId) {
      const classPack = game.packs.get('foundryvtt-swse.classes');
      const doc = await classPack.getDocument(template.classId).catch(() => null);
      if (!doc) {
        errors.push(`Class ID not found: ${template.classId}`);
      }
    }

    // Validate feat IDs
    if (template.featIds && Array.isArray(template.featIds)) {
      const featPack = game.packs.get('foundryvtt-swse.feats');
      for (const featId of template.featIds) {
        const doc = await featPack.getDocument(featId).catch(() => null);
        if (!doc) {
          errors.push(`Feat ID not found: ${featId}`);
        }
      }
    }

    // Similar validation for talents, powers, items, etc.
    // ... (same pattern)

    return errors;
  }
}
```

---

### Phase 4: Update Progression Engine

Progression engine already works with IDs! Just ensure applyTemplatePackage uses them:

```javascript
// scripts/engine/progression.js (already mostly correct)

async applyTemplatePackage(templateId, options = {}) {
  const { PROGRESSION_RULES } = await import('../progression/data/progression-data.js');
  const template = PROGRESSION_RULES.templates?.[templateId];

  if (!template) {
    throw new Error(`Unknown template: ${templateId}`);
  }

  try {
    // Template data is NOW ID-based, so pass IDs directly
    if (template.speciesId) {
      await this.confirmSpecies(template.speciesId);  // ID passed directly ✅
    }

    if (template.classId) {
      await this.confirmClass(template.classId);      // ID passed directly ✅
    }

    if (template.featIds && Array.isArray(template.featIds)) {
      await this.confirmFeats(template.featIds);      // IDs passed directly ✅
    }

    if (template.talentIds && Array.isArray(template.talentIds)) {
      await this.confirmTalents(template.talentIds);  // IDs passed directly ✅
    }

    // ... rest of template application

    return true;
  } catch (err) {
    swseLogger.error(`[PROGRESSION-TEMPLATE] Error applying template ${templateId}:`, err);
    throw err;
  }
}
```

---

## Advantages of Using Compendium IDs

✅ **Single Source of Truth**
- No mapping tables needed - compendiums are SSOT
- Progression engine already uses these IDs internally

✅ **Fail-Fast Validation**
- Template loader validates IDs exist at startup
- Detects renamed/deleted items immediately
- Clear error messages

✅ **Future-Proof**
- If items are renamed in compendium, templates don't break
- If items are deleted, you get clear error (not silent failure)
- Can easily add/rename items without template updates

✅ **Leverages Existing Infrastructure**
- Uses TalentDB, ClassesDB, FeatureIndex (already built)
- Uses CompendiumLoader (already implemented)
- No new systems to maintain

✅ **Direct Lookup**
- Progression engine looks up IDs directly in compendiums
- No indirect name→ID conversion needed
- Better performance

---

## Migration Process (Practical Steps)

### Step 1: Run Validation Report
```javascript
// In Foundry console:
const templates = await fetch('data/character-templates.json').then(r => r.json());
for (const tpl of templates.templates) {
  const issues = await TemplateIdMapper.validateTemplate(tpl);
  if (issues.length > 0) {
    console.warn(`${tpl.id}:`, issues);
  }
}
```

### Step 2: Run Migration
```javascript
// In Foundry console:
import { migrateTemplatesToIds } from './scripts/maintenance/migrate-templates-to-ids.js';
const result = await migrateTemplatesToIds();
console.log(JSON.stringify(result, null, 2));
// Copy output, paste into data/character-templates.json
```

### Step 3: Test in Chargen
1. Load character creation
2. Select template with new ID-based format
3. Verify all selections apply correctly
4. Check console for any [SSOT] warnings

### Step 4: Validate in System
```javascript
// In Foundry console:
const templates = await CharacterTemplates.loadTemplates();
console.log(`Loaded ${templates.length} ID-based templates`);
```

---

## Timeline

- **Phase 1:** Create TemplateIdMapper utility - 2 hours
- **Phase 2:** Run migration and convert templates.json - 1 hour
- **Phase 3:** Add validation to template loader - 1 hour
- **Phase 4:** Test in Foundry - 1-2 hours
- **Total:** ~5-6 hours

---

## Current Compendium Status

All necessary compendiums exist and are active:
- ✅ talents.db (986 items)
- ✅ feats.db (420 items)
- ✅ classes.db (37 items)
- ✅ species.db (111 items)
- ✅ forcepowers.db (31 items)
- ✅ equipment.db (128 items)
- ✅ weapons.db (171 items)
- ✅ backgrounds.db (73 items)

All lookup infrastructure is in place and tested.

---

## Why This Is Better Than Mapping Tables

| Aspect | Mapping Tables | Compendium IDs |
|--------|---|---|
| **Source of Truth** | Duplicate (hardcoded) | Single (compendium) |
| **Maintenance** | Manual table updates | Automatic (compendium is SSOT) |
| **Validation** | At runtime (slow) | At load time (fail-fast) |
| **Rename Safety** | Breaks silently | Clear error |
| **Implementation** | New system | Use existing system |
| **Performance** | Lookup + reference | Direct ID lookup |
| **Flexibility** | Limited | Full |

---

## Next Action

Ready to proceed with:
1. Create `template-id-mapper.js` utility (Phase 1)
2. Build it into `scripts/maintenance/` for migration
3. Run on actual templates.json
4. Test in Foundry

Or review this approach first?

