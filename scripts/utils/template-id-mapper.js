/**
 * Template ID Mapper
 * Converts template data from name-based references to compendium IDs
 * Uses existing SSOT registries (TalentDB, ClassesDB, FeatureIndex, etc.)
 *
 * This mapper leverages the existing Foundry infrastructure:
 * - TalentDB for talent lookups (SSOT)
 * - ClassesDB for class lookups (SSOT)
 * - TalentTreeDB for talent tree lookups (SSOT)
 * - FeatureIndex for feat/power lookups (indexed at init)
 * - CompendiumLoader for fallback searches
 *
 * No mapping tables needed - compendiums are the system of record.
 */

import { swseLogger } from './logger.js';
import { BackgroundRegistry } from '../registries/background-registry.js';
import { slugify } from './stable-id.js';
import { ForceRegistry } from '../engine/registries/force-registry.js';

export class TemplateIdMapper {
  /**
   * Convert a template from name-based format to ID-based format
   * @param {Object} oldTemplate - Template with name-based references
   * @returns {Promise<Object>} Template with compendium IDs
   */
  static async convertTemplate(oldTemplate) {
    if (!oldTemplate?.id) {
      throw new Error('Template must have an id field');
    }

    swseLogger.log(`[TEMPLATE-MAPPER] Converting template: ${oldTemplate.id}`);

    return {
      // Display fields (unchanged)
      id: oldTemplate.id,
      name: oldTemplate.name,
      class: oldTemplate.class,
      archetype: oldTemplate.archetype,
      description: oldTemplate.description,
      quote: oldTemplate.quote,
      imagePath: oldTemplate.imagePath,
      abilityScores: oldTemplate.abilityScores,
      level: oldTemplate.level,
      credits: oldTemplate.credits,
      notes: oldTemplate.notes,

      // Converted to compendium IDs
      speciesId: await this._getSpeciesId(oldTemplate.species),
      backgroundId: (await this._getBackgroundId(oldTemplate.background))?.id || null,
      backgroundUuid: (await this._getBackgroundId(oldTemplate.background))?.uuid || '',
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

      forcePowerIds: oldTemplate.forcePowers && Array.isArray(oldTemplate.forcePowers)
        ? await Promise.all(oldTemplate.forcePowers.map(name => this._getForcePowerId(name)))
        : [],

      itemIds: oldTemplate.startingEquipment && Array.isArray(oldTemplate.startingEquipment)
        ? await Promise.all(oldTemplate.startingEquipment.map(name => this._getItemId(name)))
        : [],

      trainedSkillIds: oldTemplate.trainedSkills || [],  // Already IDs, no change
      mentorClass: oldTemplate.mentor || null  // Keep as-is or map to mentor class if needed
    };
  }

  // ============================================================================
  // PRIVATE LOOKUP METHODS - Use existing SSOT registries
  // ============================================================================

  /**
   * Get species ID from compendium
   * Species IDs follow slug format: "species-advozse"
   * @param {string} speciesName - Species name (e.g., "Mirialan")
   * @returns {Promise<string>} Species ID
   */
  static async _getSpeciesId(speciesName) {
    if (!speciesName) {return null;}

    try {
      // Species uses slug format: species-lowercase-name
      const slugId = `species-${speciesName.toLowerCase().replace(/\s+/g, '-')}`;

      // Verify it exists by trying to get the document
      const speciesPack = game.packs.get('foundryvtt-swse.species');
      if (!speciesPack) {
        throw new Error('Species compendium not found');
      }

      const doc = await speciesPack.getDocument(slugId).catch(() => null);
      if (doc) {
        swseLogger.log(`[TEMPLATE-MAPPER] Species found: ${speciesName} → ${slugId}`);
        return slugId;
      }

      // If slug format doesn't work, search by name
      const index = await speciesPack.getIndex();
      const speciesEntry = Array.from(index).find(e =>
        e.name.toLowerCase() === speciesName.toLowerCase()
      );

      if (!speciesEntry) {
        throw new Error(`Species not found: "${speciesName}"`);
      }

      swseLogger.log(`[TEMPLATE-MAPPER] Species found by name: ${speciesName} → ${speciesEntry._id}`);
      return speciesEntry._id;
    } catch (err) {
      swseLogger.error(`[TEMPLATE-MAPPER] Error finding species "${speciesName}":`, err);
      throw err;
    }
  }

  /**
   * Get background ID from compendium
   * @param {string} backgroundName - Background name
   * @returns {Promise<string>} Background ID
   */
  static async _getBackgroundId(backgroundName) {
    if (!backgroundName) {return null;}

    try {
      const all = await BackgroundRegistry.all();
      const exact = all.find(b => (b.name || '').toLowerCase() === String(backgroundName).toLowerCase());
      if (exact?.id) {
        swseLogger.log(`[TEMPLATE-MAPPER] Background found: ${backgroundName} → ${exact.id}`);
        return { id: exact.internalId || exact.id, uuid: exact.uuid || '' };
      }

      const slug = slugify(backgroundName);
      const bySlug = await BackgroundRegistry.getBySlug(slug);
      if (bySlug?.id) {
        swseLogger.log(`[TEMPLATE-MAPPER] Background found by slug: ${backgroundName} → ${bySlug.id}`);
        return bySlug.id;
      }

      throw new Error(`Background not found: "${backgroundName}"`);
    } catch (err) {
      swseLogger.error(`[TEMPLATE-MAPPER] Error finding background "${backgroundName}":`, err);
      throw err;
    }
  }

  /**
   * Get class ID from ClassesDB (SSOT registry)
   * @param {string} className - Class name
   * @returns {Promise<string>} Class ID
   */
  static async _getClassId(className) {
    if (!className) {return null;}

    try {
      // Import ClassesDB
      const { ClassesDB } = await import('../data/classes-db.js');

      // Try exact match first
      const classData = ClassesDB.getByName(className);
      if (classData) {
        swseLogger.log(`[TEMPLATE-MAPPER] Class found: ${className} → ${classData._id}`);
        return classData._id;
      }

      // Try case-insensitive search
      const classMatch = Object.values(ClassesDB.data || {}).find(c =>
        c.name.toLowerCase() === className.toLowerCase()
      );

      if (classMatch) {
        swseLogger.log(`[TEMPLATE-MAPPER] Class found (case-insensitive): ${className} → ${classMatch._id}`);
        return classMatch._id;
      }

      // Fallback: search compendium directly
      const classPack = game.packs.get('foundryvtt-swse.classes');
      if (!classPack) {
        throw new Error('Classes compendium not found');
      }

      const index = await classPack.getIndex();
      const classEntry = Array.from(index).find(e =>
        e.name.toLowerCase() === className.toLowerCase()
      );

      if (!classEntry) {
        throw new Error(`Class not found: "${className}"`);
      }

      swseLogger.log(`[TEMPLATE-MAPPER] Class found via compendium: ${className} → ${classEntry._id}`);
      return classEntry._id;
    } catch (err) {
      swseLogger.error(`[TEMPLATE-MAPPER] Error finding class "${className}":`, err);
      throw err;
    }
  }

  /**
   * Get feat ID from FeatureIndex or compendium
   * @param {string} featName - Feat name
   * @returns {Promise<string>} Feat ID
   */
  static async _getFeatId(featName) {
    if (!featName) {return null;}

    try {
      // Try FeatureIndex first (SSOT for indexed features)
      const { FeatureIndex } = await import('../../engines/progression/engine/feature-index.js');
      const feat = FeatureIndex.getFeat?.(featName);
      if (feat) {
        swseLogger.log(`[TEMPLATE-MAPPER] Feat found in FeatureIndex: ${featName} → ${feat._id}`);
        return feat._id;
      }

      // Fallback: search compendium
      const featPack = game.packs.get('foundryvtt-swse.feats');
      if (!featPack) {
        throw new Error('Feats compendium not found');
      }

      const index = await featPack.getIndex();
      const featEntry = Array.from(index).find(e =>
        e.name.toLowerCase() === featName.toLowerCase()
      );

      if (!featEntry) {
        throw new Error(`Feat not found: "${featName}"`);
      }

      swseLogger.log(`[TEMPLATE-MAPPER] Feat found in compendium: ${featName} → ${featEntry._id}`);
      return featEntry._id;
    } catch (err) {
      swseLogger.error(`[TEMPLATE-MAPPER] Error finding feat "${featName}":`, err);
      throw err;
    }
  }

  /**
   * Get talent ID from TalentDB (SSOT registry)
   * @param {string} talentName - Talent name
   * @returns {Promise<string>} Talent ID
   */
  static async _getTalentId(talentName) {
    if (!talentName) {return null;}

    try {
      // Import TalentDB
      const { TalentDB } = await import('../data/talent-db.js');

      // Try exact match first
      const talent = TalentDB.getByName(talentName);
      if (talent) {
        swseLogger.log(`[TEMPLATE-MAPPER] Talent found: ${talentName} → ${talent._id}`);
        return talent._id;
      }

      // Try case-insensitive search
      const talentMatch = Object.values(TalentDB.data || {}).find(t =>
        t.name.toLowerCase() === talentName.toLowerCase()
      );

      if (talentMatch) {
        swseLogger.log(`[TEMPLATE-MAPPER] Talent found (case-insensitive): ${talentName} → ${talentMatch._id}`);
        return talentMatch._id;
      }

      // Fallback: search compendium directly
      const talentPack = game.packs.get('foundryvtt-swse.talents');
      if (!talentPack) {
        throw new Error('Talents compendium not found');
      }

      const index = await talentPack.getIndex();
      const talentEntry = Array.from(index).find(e =>
        e.name.toLowerCase() === talentName.toLowerCase()
      );

      if (!talentEntry) {
        throw new Error(`Talent not found: "${talentName}"`);
      }

      swseLogger.log(`[TEMPLATE-MAPPER] Talent found in compendium: ${talentName} → ${talentEntry._id}`);
      return talentEntry._id;
    } catch (err) {
      swseLogger.error(`[TEMPLATE-MAPPER] Error finding talent "${talentName}":`, err);
      throw err;
    }
  }

  /**
   * Get talent tree ID from TalentTreeDB (SSOT registry)
   * @param {string} treeName - Talent tree name
   * @returns {Promise<string>} Talent tree ID
   */
  static async _getTalentTreeId(treeName) {
    if (!treeName) {return null;}

    try {
      // Import TalentTreeDB
      const { TalentTreeDB } = await import('../data/talent-tree-db.js');

      // Try exact match first
      const tree = TalentTreeDB.getByName(treeName);
      if (tree) {
        swseLogger.log(`[TEMPLATE-MAPPER] Talent tree found: ${treeName} → ${tree._id}`);
        return tree._id;
      }

      // Try case-insensitive search
      const treeMatch = Object.values(TalentTreeDB.data || {}).find(t =>
        t.name.toLowerCase() === treeName.toLowerCase()
      );

      if (treeMatch) {
        swseLogger.log(`[TEMPLATE-MAPPER] Talent tree found (case-insensitive): ${treeName} → ${treeMatch._id}`);
        return treeMatch._id;
      }

      // Fallback: search compendium directly
      const treePack = game.packs.get('foundryvtt-swse.talent_trees');
      if (!treePack) {
        throw new Error('Talent trees compendium not found');
      }

      const index = await treePack.getIndex();
      const treeEntry = Array.from(index).find(e =>
        e.name.toLowerCase() === treeName.toLowerCase()
      );

      if (!treeEntry) {
        throw new Error(`Talent tree not found: "${treeName}"`);
      }

      swseLogger.log(`[TEMPLATE-MAPPER] Talent tree found in compendium: ${treeName} → ${treeEntry._id}`);
      return treeEntry._id;
    } catch (err) {
      swseLogger.error(`[TEMPLATE-MAPPER] Error finding talent tree "${treeName}":`, err);
      throw err;
    }
  }

  /**
   * Get force power ID from FeatureIndex or compendium
   * @param {string} powerName - Force power name
   * @returns {Promise<string>} Force power ID
   */
  static async _getForcePowerId(powerName) {
    if (!powerName) {return null;}

    try {
      // Try FeatureIndex first (SSOT for indexed features)
      const { FeatureIndex } = await import('../../engines/progression/engine/feature-index.js');
      const power = FeatureIndex.getPower?.(powerName);
      if (power) {
        swseLogger.log(`[TEMPLATE-MAPPER] Force power found in FeatureIndex: ${powerName} → ${power._id}`);
        return power._id;
      }

      // Fallback: search registry
      const powerEntry = ForceRegistry.getByName(powerName);
      if (!powerEntry) {
        throw new Error(`Force power not found: "${powerName}"`);
      }

      swseLogger.log(`[TEMPLATE-MAPPER] Force power found in registry: ${powerName} → ${powerEntry.id}`);
      return powerEntry.id;
    } catch (err) {
      swseLogger.error(`[TEMPLATE-MAPPER] Error finding force power "${powerName}":`, err);
      throw err;
    }
  }

  /**
   * Get item ID from equipment/weapons/armor compendiums
   * Searches in order: equipment → weapons → armor
   * @param {string} itemName - Item name
   * @returns {Promise<string>} Item ID
   */
  static async _getItemId(itemName) {
    if (!itemName) {return null;}

    try {
      const packNames = ['foundryvtt-swse.equipment', 'foundryvtt-swse.weapons', 'foundryvtt-swse.armor'];

      for (const packName of packNames) {
        const pack = game.packs.get(packName);
        if (!pack) {continue;}

        const index = await pack.getIndex();
        const entry = Array.from(index).find(e =>
          e.name.toLowerCase() === itemName.toLowerCase()
        );

        if (entry) {
          swseLogger.log(`[TEMPLATE-MAPPER] Item found in ${packName}: ${itemName} → ${entry._id}`);
          return entry._id;
        }
      }

      throw new Error(`Item not found in any compendium: "${itemName}"`);
    } catch (err) {
      swseLogger.error(`[TEMPLATE-MAPPER] Error finding item "${itemName}":`, err);
      throw err;
    }
  }

  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================

  /**
   * Validate all references in a template and report issues
   * Returns array of error messages (empty if valid)
   * @param {Object} oldTemplate - Template to validate
   * @returns {Promise<Array<string>>} Array of validation issues
   */
  static async validateTemplate(oldTemplate) {
    const issues = [];

    if (!oldTemplate?.id) {
      issues.push('❌ Template must have an id field');
      return issues;
    }

    swseLogger.log(`[TEMPLATE-MAPPER] Validating template: ${oldTemplate.id}`);

    // Validate species
    if (oldTemplate.species) {
      try {
        await this._getSpeciesId(oldTemplate.species);
      } catch (e) {
        issues.push(`❌ Species: ${e.message}`);
      }
    }

    // Validate background
    if (oldTemplate.background) {
      try {
        await this._getBackgroundId(oldTemplate.background);
      } catch (e) {
        issues.push(`❌ Background: ${e.message}`);
      }
    }

    // Validate class
    if (oldTemplate.className || oldTemplate.class) {
      try {
        await this._getClassId(oldTemplate.className || oldTemplate.class);
      } catch (e) {
        issues.push(`❌ Class: ${e.message}`);
      }
    }

    // Validate feat
    if (oldTemplate.feat) {
      try {
        await this._getFeatId(oldTemplate.feat);
      } catch (e) {
        issues.push(`❌ Feat: ${e.message}`);
      }
    }

    // Validate talent
    if (oldTemplate.talent) {
      try {
        await this._getTalentId(oldTemplate.talent);
      } catch (e) {
        issues.push(`❌ Talent: ${e.message}`);
      }
    }

    // Validate talent tree
    if (oldTemplate.talentTree) {
      try {
        await this._getTalentTreeId(oldTemplate.talentTree);
      } catch (e) {
        issues.push(`❌ Talent Tree: ${e.message}`);
      }
    }

    // Validate force powers
    if (oldTemplate.forcePowers && Array.isArray(oldTemplate.forcePowers)) {
      for (const power of oldTemplate.forcePowers) {
        try {
          await this._getForcePowerId(power);
        } catch (e) {
          issues.push(`❌ Force Power "${power}": ${e.message}`);
        }
      }
    }

    // Validate items
    if (oldTemplate.startingEquipment && Array.isArray(oldTemplate.startingEquipment)) {
      for (const item of oldTemplate.startingEquipment) {
        try {
          await this._getItemId(item);
        } catch (e) {
          issues.push(`❌ Item "${item}": ${e.message}`);
        }
      }
    }

    if (issues.length === 0) {
      swseLogger.log(`[TEMPLATE-MAPPER] Template ${oldTemplate.id} validated successfully ✅`);
    } else {
      swseLogger.warn(`[TEMPLATE-MAPPER] Template ${oldTemplate.id} has ${issues.length} validation issues`);
      issues.forEach(issue => swseLogger.warn(`  ${issue}`));
    }

    return issues;
  }

  /**
   * Validate all templates and return summary report
   * @param {Array<Object>} templates - Array of templates to validate
   * @returns {Promise<Object>} Validation report
   */
  static async validateAllTemplates(templates) {
    swseLogger.log(`[TEMPLATE-MAPPER] Validating ${templates.length} templates...`);

    const report = {
      totalTemplates: templates.length,
      validCount: 0,
      invalidCount: 0,
      issues: {}
    };

    for (const template of templates) {
      const issues = await this.validateTemplate(template);

      if (issues.length === 0) {
        report.validCount++;
      } else {
        report.invalidCount++;
        report.issues[template.id] = issues;
      }
    }

    swseLogger.log(`[TEMPLATE-MAPPER] Validation complete: ${report.validCount}/${report.totalTemplates} valid`);

    return report;
  }
}
