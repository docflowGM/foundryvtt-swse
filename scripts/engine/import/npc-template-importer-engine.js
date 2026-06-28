// scripts/engine/import/npc-template-importer-engine.js
/**
 * NPC Template Importer Engine
 * Handles the actual import logic for Beast, Nonheroic, and Heroic NPC templates
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { NPCTemplateDataLoader } from "/systems/foundryvtt-swse/scripts/core/npc-template-data-loader.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";


const NPC_IMPORT_NAMESPACE = 'swse';
const NPC_LEGACY_IMPORT_NAMESPACE = 'foundryvtt-swse';

function cleanText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = String(value).match(/-?\d+/);
  return match ? Number(match[0]) : null;
}

function abilityMod(score) {
  return Math.floor((Number(score || 10) - 10) / 2);
}

function buildImportProfile(kind, source = {}) {
  const normalizedKind = ['heroic', 'nonheroic', 'beast', 'mount'].includes(kind) ? kind : 'imported';
  const legalProfile = normalizedKind === 'beast' || normalizedKind === 'mount'
    ? 'beast'
    : normalizedKind === 'heroic' || normalizedKind === 'nonheroic'
      ? normalizedKind
      : 'imported-statblock';

  return {
    kind: normalizedKind,
    mode: 'play',
    importMode: 'play',
    sourceAuthority: 'statblock',
    legalProfile,
    legalState: 'playable-unchecked',
    source: {
      importer: 'npc-template-importer',
      sourceType: source.sourceType || 'template',
      pack: source.pack || null,
      templateId: source.templateId || null,
      templateName: source.templateName || null,
      importedAt: new Date().toISOString()
    },
    overrides: {
      hp: true,
      defenses: true,
      bab: true,
      skills: true,
      attacks: true
    },
    legalReview: {
      status: 'not-run',
      summary: 'Imported in Play Mode using statblock authority. Legal Review has not been run.'
    }
  };
}

function buildImportFlags(kind, statblock, source = {}) {
  const raw = foundry.utils.deepClone(statblock || {});
  const importData = {
    imported: true,
    importDate: new Date().toISOString(),
    templateType: kind,
    category: kind,
    mode: 'play',
    sourceAuthority: 'statblock',
    legalProfile: kind === 'beast' || kind === 'mount' ? 'beast' : kind,
    pack: source.pack || null,
    templateId: source.templateId || null,
    templateName: source.templateName || null,
    raw
  };

  return {
    [NPC_IMPORT_NAMESPACE]: {
      import: importData
    },
    [NPC_LEGACY_IMPORT_NAMESPACE]: {
      imported: true,
      importDate: importData.importDate,
      templateType: kind,
      originalStatblock: raw,
      import: importData
    }
  };
}

function mergeFlags(existingFlags, kind, statblock, source = {}) {
  const merged = foundry.utils.deepClone(existingFlags || {});
  const importFlags = buildImportFlags(kind, statblock, source);
  return foundry.utils.mergeObject(merged, importFlags, { inplace: false, recursive: true });
}

function normalizeSize(value) {
  return cleanText(value) || 'Medium';
}

function normalizeLanguages(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(v => String(v).trim()).filter(Boolean);
  if (!value) return [];
  return String(value).split(/[,;]/).map(v => v.trim()).filter(Boolean);
}

function classLevelLabel(classLevels) {
  if (!classLevels || typeof classLevels !== 'object') return '';
  return Object.entries(classLevels)
    .filter(([, levels]) => levels !== null && levels !== undefined && levels !== '')
    .map(([name, levels]) => `${name} ${levels}`.trim())
    .join(' / ');
}

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

      newActorData.system = newActorData.system || {};
      newActorData.system.npcProfile = foundry.utils.mergeObject(
        buildImportProfile('beast', {
          sourceType: 'compendium',
          pack: 'foundryvtt-swse.beasts',
          templateId: actorId,
          templateName: newActorData.name
        }),
        newActorData.system.npcProfile || {},
        { inplace: false, recursive: true }
      );
      newActorData.system.npcType = newActorData.system.npcType || 'beast';
      newActorData.system.creatureType = newActorData.system.creatureType || 'beast';
      newActorData.system.useProgression = false;
      newActorData.flags = mergeFlags(
        newActorData.flags,
        'beast',
        newActorData.flags?.swse?.beastData || newActorData.flags?.['foundryvtt-swse']?.beastData || newActorData.system?.beastData || {},
        {
          sourceType: 'compendium',
          pack: 'foundryvtt-swse.beasts',
          templateId: actorId,
          templateName: newActorData.name
        }
      );

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

      // Create the actor in the world (includes biography/profile data in initial data)
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

    const hpValue = this._parseHitPoints(statblock['Hit Points']) || 10;
    const babValue = numberOrNull(statblock['Base Attack Bonus'] ?? statblock.BAB ?? statblock['Attack Bonus']) ?? 0;
    const damageThreshold = numberOrNull(statblock['Damage Threshold']);
    const classLevels = statblock['Class Levels'] || {};
    const classLabel = classLevelLabel(classLevels) || cleanText(statblock.Class || statblock.className) || (statblock['Nonheroic Level'] ? `Nonheroic ${statblock['Nonheroic Level']}` : '');
    const species = cleanText(statblock.Species) || 'Unknown';
    const size = normalizeSize(statblock.Size);
    const speed = cleanText(statblock.Speed) || '6 Squares';
    const npcProfile = buildImportProfile(npcType, {
      sourceType: 'json',
      templateName: name
    });

    // Create base actor data. Keep source/statblock values as first-class
    // Play Mode values and do not require derived/progression legality yet.
    const actorData = {
      type: 'npc',
      name: name,
      img: portrait,
      prototypeToken: {
        name: name,
        img: portrait
      },
      system: {
        hp: {
          value: hpValue,
          max: hpValue,
          temp: 0
        },
        attributes: this._mapAttributes(statblock),
        abilities: this._mapAbilities(statblock),
        defenses: this._mapDefenses(statblock),
        npcProfile,
        npcType,
        useProgression: false,
        species,
        race: species,
        size,
        speed,
        class: classLabel,
        className: classLabel,
        level: this._inferLevel(statblock, npcType),
        bab: babValue,
        damageThreshold: damageThreshold ?? hpValue,
        forcePoints: numberOrNull(statblock['Force Points']) ?? 0,
        destinyPoints: numberOrNull(statblock['Destiny Points']) ?? 0,
        darkSideScore: numberOrNull(statblock['Dark Side Points']) ?? 0,
        languages: normalizeLanguages(statblock.Languages),
        source: {
          mode: 'play',
          authority: 'statblock',
          imported: true
        },
        biography: biography || cleanText(statblock.Biography || statblock.Description || '')
      },
      items: [],
      flags: mergeFlags({}, npcType, statblock, {
        sourceType: 'json',
        templateName: name
      })
    };

    // Create the actor (includes biography in initial data)
    const actor = await Actor.create(actorData);

    // Now add items (weapons, feats, talents, etc.). If item creation fails,
    // delete the actor instead of leaving a partial statblock NPC with HP and
    // defenses but no weapons/feats/talents.
    if (actor) {
      const itemResult = await this._addItemsToActor(actor, statblock);
      if (itemResult && itemResult.success === false) {
        SWSELogger.error(`[NPCTemplateImporterEngine] Item creation failed for ${actor.name}; removing partial import.`);
        try { await actor.delete?.(); } catch (_deleteErr) {}
        return null;
      }
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
      const score = numberOrNull(statblock[statKey]) ?? 10;
      const mod = abilityMod(score);
      abilities[sysKey] = {
        base: score,
        score,
        total: score,
        mod,
        modifier: mod,
        racial: 0,
        temp: 0
      };
    }

    return abilities;
  }

  /**
   * Map ability scores to the actor-concept attributes contract.
   * @private
   */
  static _mapAttributes(statblock) {
    const abilityMap = {
      Strength: 'str',
      Dexterity: 'dex',
      Constitution: 'con',
      Intelligence: 'int',
      Wisdom: 'wis',
      Charisma: 'cha'
    };

    const attributes = {};
    for (const [statKey, sysKey] of Object.entries(abilityMap)) {
      const score = numberOrNull(statblock[statKey]) ?? 10;
      attributes[sysKey] = {
        base: score,
        racial: 0,
        enhancement: 0,
        temp: 0
      };
    }
    return attributes;
  }

  /**
   * Infer a simple display level from class-level text without creating legal class history.
   * @private
   */
  static _inferLevel(statblock, npcType) {
    const classLevels = statblock?.['Class Levels'];
    if (classLevels && typeof classLevels === 'object') {
      const total = Object.values(classLevels).reduce((sum, value) => sum + (numberOrNull(value) ?? 0), 0);
      if (total > 0) return total;
    }
    const nonheroic = numberOrNull(statblock?.['Nonheroic Level']);
    if (npcType === 'nonheroic' && nonheroic !== null) return Math.max(1, nonheroic);
    return 1;
  }

  /**
   * Map defenses from statblock to actor system
   * @private
   */
  static _mapDefenses(statblock) {
    const reflex = this._parseDefense(statblock['Reflex Defense']) || 10;
    const fortitude = this._parseDefense(statblock['Fortitude Defense']) || 10;
    const will = this._parseDefense(statblock['Will Defense']) || 10;
    const flatFooted = this._parseDefense(statblock['Flat-Footed Defense']) || reflex;

    return {
      reflex: { base: 10, value: reflex, total: reflex, misc: 0 },
      fort: { base: 10, value: fortitude, total: fortitude, misc: 0 },
      fortitude: { base: 10, value: fortitude, total: fortitude, misc: 0 },
      will: { base: 10, value: will, total: will, misc: 0 },
      flatFooted: { value: flatFooted, total: flatFooted }
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

    // Add Force powers as readable Play Mode reference items if available.
    if (statblock['Force Powers'] && Array.isArray(statblock['Force Powers'])) {
      for (const power of statblock['Force Powers']) {
        items.push(this._createForcePowerItem(power));
      }
    }

    // Add languages if available
    if (statblock.Languages && Array.isArray(statblock.Languages)) {
      for (const lang of statblock.Languages) {
        items.push(this._createLanguageItem(lang));
      }
    }

    // Add gear as source-reference items rather than pretending it is fully legalized equipment.
    if (statblock.Gear) {
      for (const gear of this._splitSourceList(statblock.Gear)) {
        items.push(this._createGearItem(gear));
      }
    }

    // Create all items in the actor
    if (items.length > 0) {
      try {
        await ActorEngine.createEmbeddedDocuments(actor, 'Item', items, { source: 'npc-template-importer' });
        SWSELogger.log(`[NPCTemplateImporterEngine] Added ${items.length} items to ${actor.name}`);
        return { success: true, intended: items.length, created: items.length };
      } catch (err) {
        SWSELogger.warn(`[NPCTemplateImporterEngine] Error adding items to actor:`, err);
        return { success: false, intended: items.length, created: 0, error: err?.message };
      }
    }
    return { success: true, intended: 0, created: 0 };
  }

  /**
   * Parse weapons from statblock string
   * @private
   */
  static _parseWeapons(weaponString, type) {
    const weapons = [];
    if (!weaponString) return weapons;

    // Parse weapon entries (e.g., "Blaster Pistol +7 (3d6+6)")
    const weaponEntries = this._splitSourceList(weaponString);
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
            rarity: 'common',
            sourceAuthority: 'statblock',
            playModeReference: true
          },
          flags: {
            swse: { import: { sourceAuthority: 'statblock', raw: trimmed } }
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
        rarity: 'common',
        sourceAuthority: 'statblock',
        playModeReference: true
      },
      flags: {
        swse: { import: { sourceAuthority: 'statblock', raw: featName } }
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
        rarity: 'common',
        sourceAuthority: 'statblock',
        playModeReference: true
      },
      flags: {
        swse: { import: { sourceAuthority: 'statblock', raw: talentName } }
      }
    };
  }

  /**
   * Split source-list strings while preserving complex entries as best as possible.
   * @private
   */
  static _splitSourceList(value) {
    if (Array.isArray(value)) return value.filter(Boolean).map(v => String(v).trim()).filter(Boolean);
    if (!value) return [];
    return String(value)
      .split(/,(?![^()]*\))/)
      .map(part => part.trim())
      .filter(Boolean);
  }

  /**
   * Create a Force power item from imported source data.
   * @private
   */
  static _createForcePowerItem(powerName) {
    return {
      name: String(powerName).replace(/^Force Powers\s*:\s*/i, '').trim(),
      type: 'force-power',
      img: 'systems/foundryvtt-swse/assets/icons/force-power.png',
      system: {
        description: `Imported source power: ${powerName}`,
        sourceAuthority: 'statblock',
        playModeReference: true
      },
      flags: {
        swse: { import: { sourceAuthority: 'statblock', raw: powerName } }
      }
    };
  }

  /**
   * Create a gear reference item from imported source data.
   * @private
   */
  static _createGearItem(gearName) {
    return {
      name: String(gearName).trim(),
      type: 'equipment',
      img: 'systems/foundryvtt-swse/assets/icons/equipment.png',
      system: {
        description: `Imported gear reference: ${gearName}`,
        sourceAuthority: 'statblock',
        playModeReference: true
      },
      flags: {
        swse: { import: { sourceAuthority: 'statblock', raw: gearName } }
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
