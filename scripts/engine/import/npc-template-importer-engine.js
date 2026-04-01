// scripts/engine/import/npc-template-importer-engine.js
/**
 * NPC Template Importer Engine
 * Handles the actual import logic for Beast, Nonheroic, and Heroic NPC templates
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { NPCTemplateDataLoader } from "/systems/foundryvtt-swse/scripts/core/npc-template-data-loader.js";

export class NPCTemplateImporterEngine {
  /**
   * Import a Beast template from the compendium
   * @param {string} actorId - Actor ID in the beasts pack
   * @param {Object|null} customData - Optional custom data (name, portrait, etc.)
   * @returns {Promise<Object|null>} Created actor document or null on failure
   */
  static async importBeastTemplate(actorId, customData = null) {
    try {
      SWSELogger.log(`[NPCTemplateImporterEngine] Importing beast template: ${actorId}`);

      // Get the actor document from the beasts pack
      const actorData = await NPCTemplateDataLoader.getBeastActorDocument(actorId);
      if (!actorData) {
        SWSELogger.error(`[NPCTemplateImporterEngine] Beast actor not found: ${actorId}`);
        return null;
      }

      // Clone the data to avoid modifying the compendium
      const newActorData = foundry.utils.deepClone(actorData);

      // Ensure type is npc
      newActorData.type = 'npc';

      // Apply custom data if provided
      if (customData) {
        newActorData.name = customData.name || newActorData.name;
        newActorData.img = customData.portrait || newActorData.img;
        if (newActorData.prototypeToken) {
          newActorData.prototypeToken.img = customData.portrait || newActorData.prototypeToken.img;
        }
      }

      // PHASE 2: Include biography in initial actor creation data
      // This avoids post-creation direct mutations
      if (customData && (customData.notes || customData.biography)) {
        const biographyText = [customData.notes, customData.biography]
          .filter(t => t && t.trim())
          .join('\n\n');
        if (biographyText) {
          newActorData.system.biography = biographyText;
        }
      }

      // Create the actor in the world (includes biography in initial data)
      const actor = await Actor.create(newActorData);

      SWSELogger.log(`[NPCTemplateImporterEngine] Beast imported successfully: ${actor.name} (${actor.id})`);

      return actor;
    } catch (err) {
      SWSELogger.error(`[NPCTemplateImporterEngine] Error importing beast template:`, err);
      return null;
    }
  }

  /**
   * Import a Nonheroic NPC template from JSON data
   * @param {Object} template - Template object from loader
   * @param {Object|null} customData - Optional custom data (name, portrait, etc.)
   * @returns {Promise<Object|null>} Created actor document or null on failure
   */
  static async importNonheroicTemplate(template, customData = null) {
    try {
      if (!template.sourceData) {
        throw new Error('Template missing sourceData');
      }

      SWSELogger.log(`[NPCTemplateImporterEngine] Importing nonheroic template: ${template.name}`);

      const actorName = customData?.name || template.name;
      const actor = await this._buildActorFromStatblock(
        actorName,
        template.sourceData,
        'nonheroic',
        customData
      );

      if (actor) {
        SWSELogger.log(`[NPCTemplateImporterEngine] Nonheroic NPC imported successfully: ${actor.name}`);
      }

      return actor;
    } catch (err) {
      SWSELogger.error(`[NPCTemplateImporterEngine] Error importing nonheroic template:`, err);
      return null;
    }
  }

  /**
   * Import a Heroic NPC template from JSON data
   * @param {Object} template - Template object from loader
   * @param {Object|null} customData - Optional custom data (name, portrait, etc.)
   * @returns {Promise<Object|null>} Created actor document or null on failure
   */
  static async importHeroicTemplate(template, customData = null) {
    try {
      if (!template.sourceData) {
        throw new Error('Template missing sourceData');
      }

      SWSELogger.log(`[NPCTemplateImporterEngine] Importing heroic template: ${template.name}`);

      const actorName = customData?.name || template.name;
      const actor = await this._buildActorFromStatblock(
        actorName,
        template.sourceData,
        'heroic',
        customData
      );

      if (actor) {
        SWSELogger.log(`[NPCTemplateImporterEngine] Heroic NPC imported successfully: ${actor.name}`);
      }

      return actor;
    } catch (err) {
      SWSELogger.error(`[NPCTemplateImporterEngine] Error importing heroic template:`, err);
      return null;
    }
  }

  /**
   * Build an actor from a statblock (Nonheroic/Heroic)
   * @private
   * @param {string} name - Actor name
   * @param {Object} statblock - Statblock data from JSON
   * @param {string} npcType - 'nonheroic' or 'heroic'
   * @param {Object|null} customData - Optional custom data from wizard
   * @returns {Promise<Object>} Created actor document
   */
  static async _buildActorFromStatblock(name, statblock, npcType, customData = null) {
    // Use custom portrait if provided, otherwise use default
    const portrait = customData?.portrait || 'systems/foundryvtt-swse/assets/token-default.png';

    // PHASE 2: Compute biography upfront to include in initial actor creation
    // This avoids post-creation direct mutations
    let biography = '';
    if (customData && (customData.notes || customData.biography)) {
      const parts = [customData.notes, customData.biography].filter(t => t && t.trim());
      biography = parts.join('\n\n');
    }

    // Create base actor data
    const actorData = {
      type: 'npc',
      name: name,
      img: portrait,
      prototypeToken: {
        name: name,
        img: portrait
      },
      system: {
        attributes: {
          hp: {
            value: this._parseHitPoints(statblock['Hit Points']) || 10,
            max: this._parseHitPoints(statblock['Hit Points']) || 10,
            temp: 0,
            tempmax: 0
          }
        },
        // Map ability scores
        abilities: this._mapAbilities(statblock),
        // Map defenses
        defenses: this._mapDefenses(statblock),
        // Mark as imported NPC
        npcType: npcType,
        // Store species
        species: statblock.Species || 'Unknown',
        // PHASE 2: Include biography in initial creation to avoid post-creation mutation
        biography: biography || ''
      },
      items: [],
      flags: {
        'foundryvtt-swse': {
          imported: true,
          importDate: new Date().toISOString(),
          templateType: npcType,
          originalStatblock: statblock
        }
      }
    };

    // Create the actor (includes biography in initial data)
    const actor = await Actor.create(actorData);

    // Now add items (weapons, feats, talents, etc.)
    if (actor) {
      await this._addItemsToActor(actor, statblock);
    }

    return actor;
  }

  /**
   * Parse hit points from statblock
   * @private
   */
  static _parseHitPoints(hpString) {
    if (!hpString) return null;
    const match = String(hpString).match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Map ability scores from statblock to actor system
   * @private
   */
  static _mapAbilities(statblock) {
    const abilityMap = {
      Strength: 'str',
      Dexterity: 'dex',
      Constitution: 'con',
      Intelligence: 'int',
      Wisdom: 'wis',
      Charisma: 'cha'
    };

    const abilities = {};
    for (const [statKey, sysKey] of Object.entries(abilityMap)) {
      const score = statblock[statKey] || 10;
      const mod = Math.floor((score - 10) / 2);
      abilities[sysKey] = {
        score: score,
        modifier: mod
      };
    }

    return abilities;
  }

  /**
   * Map defenses from statblock to actor system
   * @private
   */
  static _mapDefenses(statblock) {
    return {
      reflex: {
        value: this._parseDefense(statblock['Reflex Defense']) || 10
      },
      fortitude: {
        value: this._parseDefense(statblock['Fortitude Defense']) || 10
      },
      will: {
        value: this._parseDefense(statblock['Will Defense']) || 10
      },
      flatFooted: {
        value: this._parseDefense(statblock['Flat-Footed Defense']) || 10
      }
    };
  }

  /**
   * Parse defense value from statblock
   * @private
   */
  static _parseDefense(defenseString) {
    if (!defenseString) return null;
    const match = String(defenseString).match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Add items (weapons, skills, feats, talents) to actor
   * @private
   */
  static async _addItemsToActor(actor, statblock) {
    const items = [];

    // Add weapons
    if (statblock['Melee Weapons']) {
      items.push(...this._parseWeapons(statblock['Melee Weapons'], 'melee'));
    }
    if (statblock['Ranged Weapons']) {
      items.push(...this._parseWeapons(statblock['Ranged Weapons'], 'ranged'));
    }

    // Add feats if available
    if (statblock.Feats && Array.isArray(statblock.Feats)) {
      for (const feat of statblock.Feats) {
        items.push(this._createFeatItem(feat));
      }
    }

    // Add talents if available
    if (statblock.Talents && Array.isArray(statblock.Talents)) {
      for (const talent of statblock.Talents) {
        items.push(this._createTalentItem(talent));
      }
    }

    // Add languages if available
    if (statblock.Languages && Array.isArray(statblock.Languages)) {
      for (const lang of statblock.Languages) {
        items.push(this._createLanguageItem(lang));
      }
    }

    // Create all items in the actor
    if (items.length > 0) {
      try {
        await actor.createEmbeddedDocuments('Item', items);  // @mutation-exception: Governance audit/test code
        SWSELogger.log(`[NPCTemplateImporterEngine] Added ${items.length} items to ${actor.name}`);
      } catch (err) {
        SWSELogger.warn(`[NPCTemplateImporterEngine] Error adding items to actor:`, err);
      }
    }
  }

  /**
   * Parse weapons from statblock string
   * @private
   */
  static _parseWeapons(weaponString, type) {
    const weapons = [];
    if (!weaponString) return weapons;

    // Parse weapon entries (e.g., "Blaster Pistol +7 (3d6+6)")
    const weaponEntries = String(weaponString).split(',');
    for (const entry of weaponEntries) {
      const trimmed = entry.trim();
      if (trimmed) {
        weapons.push({
          name: trimmed,
          type: 'weapon',
          img: 'systems/foundryvtt-swse/assets/icons/weapon.png',
          system: {
            weaponType: type,
            description: trimmed,
            rarity: 'common'
          }
        });
      }
    }

    return weapons;
  }

  /**
   * Create a feat item
   * @private
   */
  static _createFeatItem(featName) {
    return {
      name: featName,
      type: 'feat',
      img: 'systems/foundryvtt-swse/assets/icons/feat.png',
      system: {
        description: `Imported from NPC template: ${featName}`,
        rarity: 'common'
      }
    };
  }

  /**
   * Create a talent item
   * @private
   */
  static _createTalentItem(talentName) {
    return {
      name: talentName,
      type: 'talent',
      img: 'systems/foundryvtt-swse/assets/icons/talent.png',
      system: {
        description: `Imported from NPC template: ${talentName}`,
        rarity: 'common'
      }
    };
  }

  /**
   * Create a language item
   * @private
   */
  static _createLanguageItem(langName) {
    return {
      name: langName,
      type: 'language',
      img: 'systems/foundryvtt-swse/assets/icons/language.png',
      system: {
        description: `Imported language: ${langName}`
      }
    };
  }
}

export default NPCTemplateImporterEngine;
