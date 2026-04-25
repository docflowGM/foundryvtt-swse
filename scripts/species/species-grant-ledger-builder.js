/**
 * Species Grant Ledger Builder
 *
 * SSOT Authority for Phase 1: Normalizes species data from multiple sources
 * into a canonical ledger for downstream consumption.
 *
 * Input: Species identity (compendium item or document)
 * Output: Fully normalized ledger entry with all trait classifications
 *
 * Architecture:
 * - Accepts species item OR raw document
 * - Merges compendium data + JSON trait supplements
 * - Returns normalized ledger with complete trait catalog
 * - No rule logic, no actor mutations - PURE DATA NORMALIZATION
 *
 * Schema is designed for:
 * - Phase 2: Progression system species selection
 * - Phase 3: Actor item grants and trait application
 * - Phase 4: Sheet rendering and UI
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * @typedef {Object} SpeciesGrantLedger
 * @property {Object} identity - Species identification
 * @property {string} identity.id - Stable unique identifier
 * @property {string} identity.name - Human-readable name
 * @property {string} identity.slug - Normalized kebab-case slug
 * @property {string} identity.source - Content source (book, UA, etc.)
 * @property {string} identity.uuid - Compendium UUID if available
 *
 * @property {Object} physical - Physical characteristics
 * @property {string} physical.size - Size category (Small, Medium, Large, etc.)
 * @property {Object} physical.movements - Movement modes { walk, swim, fly, etc. }
 * @property {number} physical.movements.walk - Base walk speed in squares
 * @property {number} physical.movements.swim - Swim speed or null
 * @property {number} physical.movements.fly - Fly speed or null
 * @property {number} physical.movements.hover - Hover capability or null
 * @property {number} physical.movements.glide - Glide speed or null
 * @property {number} physical.movements.burrow - Burrow speed or null
 * @property {number} physical.movements.climb - Climb speed or null
 *
 * @property {Object} senses - Sensory capabilities
 * @property {Array} senses.vision - Vision types (darkvision, low-light, etc.)
 * @property {string} senses.vision[].type - Sense type key
 * @property {number} senses.vision[].range - Range or null for unlimited
 * @property {string} senses.vision[].description - Human description
 * @property {Array} senses.other - Other senses (scent, blindsense, tremorsense)
 *
 * @property {Object} abilities - Ability score adjustments
 * @property {number} abilities.str - Strength modifier
 * @property {number} abilities.dex - Dexterity modifier
 * @property {number} abilities.con - Constitution modifier
 * @property {number} abilities.int - Intelligence modifier
 * @property {number} abilities.wis - Wisdom modifier
 * @property {number} abilities.cha - Charisma modifier
 *
 * @property {Array} naturalWeapons - Natural weapons with full item data
 * @property {Object} naturalWeapons[] - Single natural weapon
 * @property {string} naturalWeapons[].id - Unique ID
 * @property {string} naturalWeapons[].name - Name (Claws, Bite, etc.)
 * @property {string} naturalWeapons[].type - weaponType for actor items
 * @property {Object} naturalWeapons[].damage - Damage data
 * @property {string} naturalWeapons[].damage.formula - Dice formula (1d6, 1d8, etc.)
 * @property {string} naturalWeapons[].damage.type - Damage type (slashing, piercing, etc.)
 * @property {string} naturalWeapons[].attackAbility - Attack ability (str, dex)
 * @property {string} naturalWeapons[].category - melee, ranged
 * @property {Object} naturalWeapons[].properties - Special weapon properties
 * @property {boolean} naturalWeapons[].properties.alwaysArmed - Always counts as armed
 * @property {boolean} naturalWeapons[].properties.countsAsWeapon - Counts as weapon
 * @property {boolean} naturalWeapons[].properties.finesse - Has finesse
 *
 * @property {Array} traits - All species traits classified
 *
 * @property {Array} traits[].identity - Trait classification
 * @property {string} traits[].id - Unique trait ID
 * @property {string} traits[].name - Trait name
 * @property {string} traits[].description - Full description
 * @property {string} traits[].type - Trait type (bonus, reroll, sense, grant, etc.)
 * @property {string} traits[].classification - identity|bonus|grant|reroll|conditional|activated|unresolved
 *
 * @property {Array} traits[].passive - Passive bonuses (always apply)
 * @property {string} traits[].passive.targetType - skill|defense|ability|damage|etc.
 * @property {string} traits[].passive.target - skill key, defense name, ability, etc.
 * @property {number} traits[].passive.value - Bonus amount
 * @property {string} traits[].passive.bonusType - species, size, trait, etc.
 * @property {Array} traits[].passive.conditions - When applies (always, conditional)
 *
 * @property {Array} traits[].rerolls - Reroll mechanics (if classification = reroll)
 * @property {string} traits[].rerolls[].scope - skill, attack, ability, any
 * @property {string} traits[].rerolls[].target - skill key or attack type
 * @property {string} traits[].rerolls[].frequency - oncePerEncounter, oncePerDay, atWill
 * @property {string} traits[].rerolls[].outcome - mustAccept, canChoose
 *
 * @property {Array} traits[].grants - Grants (if classification = grant)
 * @property {string} traits[].grants[].grantType - feat, skill, proficiency, language, etc.
 * @property {string} traits[].grants[].target - feat name, skill key, etc.
 * @property {string} traits[].grants[].frequency - always, conditional, choice
 * @property {string} traits[].grants[].condition - Condition for grant (if conditional)
 *
 * @property {Array} traits[].activated - Activated abilities (if classification = activated)
 * @property {string} traits[].activated[].actionType - standard, move, swift, full_round
 * @property {string} traits[].activated[].frequency - oncePerRound, oncePerEncounter, oncePerDay, unlimited
 * @property {number} traits[].activated[].frequencyValue - Count per period
 *
 * @property {Array} traits[].prerequisites - Prerequisite flags
 * @property {string} traits[].prerequisites[] - Flag (droid, rage, shapeshift, etc.)
 *
 * @property {Object} languages - Languages granted
 * @property {Array} languages.automatic - Always-granted languages
 * @property {Array} languages.bonus - Bonus languages (choose from pool)
 * @property {boolean} languages.canSpeakAll - Bonus Languages feat prereq
 * @property {boolean} languages.understands - Can understand but not speak
 *
 * @property {Object} proficiencies - Proficiency grants
 * @property {Array} proficiencies.weapons - Weapon proficiencies
 * @property {Array} proficiencies.armor - Armor proficiencies
 *
 * @property {Object} skills - Skill grants and bonuses
 * @property {Array} skills.trained - Always-trained skills
 * @property {Array} skills.bonusPoints - Bonus skill points
 * @property {Object} skills.bonusPoints[].skill - skill key
 * @property {number} skills.bonusPoints[].points - Bonus points
 *
 * @property {Object} immunities - Immunities and resistances
 * @property {Array} immunities.immune - Complete immunities
 * @property {Array} immunities.resistant - Damage resistances
 *
 * @property {Array} feats - Feat grants
 * @property {string} feats[].id - Feat ID
 * @property {string} feats[].name - Feat name
 * @property {string} feats[].grantType - always, conditional, choice
 * @property {string} feats[].condition - Condition if conditional
 *
 * @property {Array} unresolved - Traits needing manual review
 * @property {string} unresolved[].id - Trait ID
 * @property {string} unresolved[].name - Trait name
 * @property {string} unresolved[].description - Full description
 * @property {string} unresolved[].reason - Why it's unresolved
 */

export class SpeciesGrantLedgerBuilder {

  /**
   * Build a complete species grant ledger from a species identity
   * @param {Item|Object|string} speciesRef - Species item, compendium doc, or ID
   * @param {Object} supplementaryTraits - Optional trait data (from JSON)
   * @returns {Promise<SpeciesGrantLedger|null>} Complete ledger or null if not found
   */
  static async build(speciesRef, supplementaryTraits = null) {
    try {
      // Resolve reference to actual species document
      const doc = await this._resolveSpeciesDocument(speciesRef);
      if (!doc) {
        SWSELogger.warn('[SpeciesGrantLedgerBuilder] Unable to resolve species reference:', speciesRef);
        return null;
      }

      // Initialize ledger structure
      const ledger = this._initializeLedger();

      // Populate identity from document
      this._populateIdentity(ledger, doc);

      // Extract and normalize physical traits
      this._populatePhysical(ledger, doc);

      // Extract senses
      this._populateSenses(ledger, doc);

      // Extract ability modifiers
      this._populateAbilities(ledger, doc);

      // Extract languages
      this._populateLanguages(ledger, doc);

      // Extract and classify all traits from both doc and supplementary
      this._populateTraits(ledger, doc, supplementaryTraits);

      // Extract natural weapons
      this._populateNaturalWeapons(ledger, doc);

      // Validate and finalize
      this._validateLedger(ledger);

      return ledger;

    } catch (err) {
      SWSELogger.error('[SpeciesGrantLedgerBuilder] Error building ledger:', err);
      return null;
    }
  }

  /**
   * Resolve a species reference to its document
   * @private
   */
  static async _resolveSpeciesDocument(speciesRef) {
    // If already a document/item, return it
    if (speciesRef && typeof speciesRef === 'object' && speciesRef.name) {
      return speciesRef;
    }

    // If string ID, try to fetch from compendium
    if (typeof speciesRef === 'string') {
      const systemId = game?.system?.id || 'foundryvtt-swse';
      const pack = game?.packs?.get(`${systemId}.species`);
      if (pack) {
        try {
          return await pack.getDocument(speciesRef);
        } catch (err) {
          SWSELogger.warn('[SpeciesGrantLedgerBuilder] Failed to fetch species by ID:', speciesRef, err);
          return null;
        }
      }
    }

    return null;
  }

  /**
   * Initialize empty ledger structure
   * @private
   */
  static _initializeLedger() {
    return {
      identity: {
        id: null,
        name: null,
        slug: null,
        source: null,
        uuid: null
      },
      physical: {
        size: null,
        movements: {
          walk: 6,
          swim: null,
          fly: null,
          hover: null,
          glide: null,
          burrow: null,
          climb: null
        }
      },
      senses: {
        vision: [],
        other: []
      },
      abilities: {
        str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0
      },
      naturalWeapons: [],
      traits: [],
      languages: {
        automatic: [],
        bonus: [],
        canSpeakAll: false,
        understands: []
      },
      proficiencies: {
        weapons: [],
        armor: []
      },
      skills: {
        trained: [],
        bonusPoints: []
      },
      immunities: {
        immune: [],
        resistant: []
      },
      feats: [],
      unresolved: []
    };
  }

  /**
   * Populate identity section
   * @private
   */
  static _populateIdentity(ledger, doc) {
    ledger.identity.id = doc._id || doc.id || null;
    ledger.identity.name = doc.name || null;
    ledger.identity.slug = this._slugify(doc.name);
    ledger.identity.source = doc.system?.source || null;
    ledger.identity.uuid = doc.uuid || null;
  }

  /**
   * Populate physical traits (size, speed)
   * @private
   */
  static _populatePhysical(ledger, doc) {
    const system = doc.system || {};

    // Size
    if (system.size) {
      ledger.physical.size = String(system.size).trim();
    }

    // Speed - base walk speed
    if (system.speed) {
      ledger.physical.movements.walk = Number(system.speed);
    }

    // Try to extract other movement modes from special traits
    // This is parsed from descriptions for now
    if (system.special && Array.isArray(system.special)) {
      for (const special of system.special) {
        const text = String(special).toLowerCase();
        // Heuristic: if mentions fly/flight, assume has fly speed
        if (text.includes('fly') || text.includes('flight')) {
          if (!ledger.physical.movements.fly) {
            ledger.physical.movements.fly = ledger.physical.movements.walk;
          }
        }
        if (text.includes('swim')) {
          if (!ledger.physical.movements.swim) {
            ledger.physical.movements.swim = ledger.physical.movements.walk;
          }
        }
      }
    }
  }

  /**
   * Populate senses
   * @private
   */
  static _populateSenses(ledger, doc) {
    const system = doc.system || {};

    // Check special for vision traits
    if (system.special && Array.isArray(system.special)) {
      for (const special of system.special) {
        const text = String(special).toLowerCase();

        if (text.includes('darkvision')) {
          ledger.senses.vision.push({
            type: 'darkvision',
            range: null,
            description: 'Ignores concealment caused by darkness'
          });
        }
        if (text.includes('low-light') || text.includes('low light')) {
          ledger.senses.vision.push({
            type: 'lowLight',
            range: null,
            description: 'Treats dim light as bright light'
          });
        }
        if (text.includes('blindsense')) {
          ledger.senses.other.push({
            type: 'blindsense',
            range: null,
            description: special
          });
        }
        if (text.includes('scent')) {
          ledger.senses.other.push({
            type: 'scent',
            range: null,
            description: special
          });
        }
      }
    }
  }

  /**
   * Populate ability score modifications
   * @private
   */
  static _populateAbilities(ledger, doc) {
    const system = doc.system || {};

    // Parse ability string "+2 Wis, -2 Cha" format
    if (system.abilities) {
      const mods = this._parseAbilityString(system.abilities);
      ledger.abilities = { ...ledger.abilities, ...mods };
    }
  }

  /**
   * Parse ability modifier string
   * @private
   */
  static _parseAbilityString(abilityString) {
    const result = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };

    if (!abilityString) return result;

    const parts = String(abilityString).split(',');
    for (const part of parts) {
      const trimmed = part.trim();

      // Try format: "+2 Wis" or "-2 Con"
      let match = trimmed.match(/^([+-])(\d+)\s+([A-Za-z]+)$/);
      if (match) {
        const sign = match[1] === '+' ? 1 : -1;
        const value = parseInt(match[2], 10) * sign;
        const ability = match[3].toLowerCase().substring(0, 3);
        const abilityKey = this._normalizeAbilityKey(ability);
        if (abilityKey) {
          result[abilityKey] = value;
        }
        continue;
      }

      // Try format: "Strength +2" or "STR -1"
      match = trimmed.match(/^([A-Za-z]+)\s+([+-])(\d+)$/);
      if (match) {
        const ability = match[1].toLowerCase().substring(0, 3);
        const sign = match[2] === '+' ? 1 : -1;
        const value = parseInt(match[3], 10) * sign;
        const abilityKey = this._normalizeAbilityKey(ability);
        if (abilityKey) {
          result[abilityKey] = value;
        }
      }
    }

    return result;
  }

  /**
   * Normalize ability abbreviation to key
   * @private
   */
  static _normalizeAbilityKey(abbr) {
    const map = {
      'str': 'str', 's': 'str',
      'dex': 'dex', 'd': 'dex',
      'con': 'con', 'c': 'con',
      'int': 'int', 'i': 'int',
      'wis': 'wis', 'w': 'wis',
      'cha': 'cha', 'ch': 'cha'
    };
    return map[abbr.toLowerCase()] || null;
  }

  /**
   * Populate languages
   * @private
   */
  static _populateLanguages(ledger, doc) {
    const system = doc.system || {};

    if (system.languages && Array.isArray(system.languages)) {
      ledger.languages.automatic = [...system.languages];
    }

    // Check for Bonus Languages flag
    if (system.tags && Array.isArray(system.tags)) {
      ledger.languages.canSpeakAll = system.tags.includes('bonus languages');
    }
  }

  /**
   * Populate traits from all sources
   * @private
   */
  static _populateTraits(ledger, doc, supplementaryTraits) {
    // Get traits from supplementary JSON if provided
    let jsonTraits = [];
    if (supplementaryTraits && typeof supplementaryTraits === 'object') {
      // Could be array of trait objects or a single species object
      if (Array.isArray(supplementaryTraits)) {
        jsonTraits = supplementaryTraits;
      } else if (supplementaryTraits.structuralTraits) {
        // It's a species object from traits-migrated.json
        jsonTraits = [
          ...(supplementaryTraits.structuralTraits || []),
          ...(supplementaryTraits.activatedAbilities || []),
          ...(supplementaryTraits.conditionalTraits || [])
        ];
      }
    }

    // Build trait catalog from JSON traits
    for (const jsonTrait of jsonTraits) {
      const trait = this._classifyTrait(jsonTrait, 'json');
      ledger.traits.push(trait);
    }

    // Extract and classify traits from compendium document
    const system = doc.system || {};

    // From skillBonuses
    if (system.skillBonuses && Array.isArray(system.skillBonuses)) {
      for (const skillBonus of system.skillBonuses) {
        const trait = this._classifySkillBonus(skillBonus);
        if (trait) ledger.traits.push(trait);
      }
    }

    // From special abilities
    if (system.special && Array.isArray(system.special)) {
      for (const special of system.special) {
        const trait = this._classifySpecial(special);
        if (trait) ledger.traits.push(trait);
      }
    }
  }

  /**
   * Classify and normalize a trait object
   * @private
   */
  static _classifyTrait(trait, source = 'json') {
    const classified = {
      id: trait.id || this._slugify(trait.name),
      name: trait.name || 'Unknown Trait',
      description: trait.description || '',
      type: trait.type || 'unknown',
      classification: 'unresolved',
      passive: [],
      rerolls: [],
      grants: [],
      activated: [],
      prerequisites: [],
      rules: trait.rules || []
    };

    // Classify based on type/structure
    if (trait.type === 'sense' || (trait.rules && trait.rules[0]?.type === 'sense')) {
      classified.classification = 'identity'; // Senses are identity traits
    } else if (trait.type === 'reroll' || (trait.rules && trait.rules[0]?.type === 'reroll')) {
      classified.classification = 'reroll';
      this._extractRerollData(classified, trait);
    } else if (trait.rules) {
      // Try to classify based on rules
      for (const rule of trait.rules) {
        if (rule.type === 'skillModifier') {
          classified.classification = 'bonus';
          classified.passive.push({
            targetType: 'skill',
            target: rule.skillId,
            value: rule.value,
            bonusType: rule.bonusType || 'species'
          });
        } else if (rule.type === 'defenseModifier') {
          classified.classification = 'bonus';
          classified.passive.push({
            targetType: 'defense',
            target: rule.defense,
            value: rule.value,
            bonusType: rule.bonusType || 'species'
          });
        } else if (rule.type === 'naturalWeapon') {
          classified.classification = 'identity';
        } else if (rule.type === 'reroll') {
          classified.classification = 'reroll';
        }
      }
    }

    // Extract feat grants if present
    if (trait.bonusFeats && Array.isArray(trait.bonusFeats)) {
      classified.classification = 'grant';
      for (const feat of trait.bonusFeats) {
        classified.grants.push({
          grantType: 'feat',
          target: feat.name || feat,
          frequency: 'always'
        });
      }
    }

    // Detect conditional traits
    if (trait.id && trait.id.includes('reroll')) {
      classified.classification = 'reroll';
    }

    return classified;
  }

  /**
   * Extract reroll data from trait
   * @private
   */
  static _extractRerollData(classified, trait) {
    if (trait.rules && trait.rules[0]) {
      const rule = trait.rules[0];
      if (rule.triggeredBy) {
        const reroll = {
          scope: rule.triggeredBy.type === 'skillCheck' ? 'skill' : 'any',
          target: rule.triggeredBy.skillId || rule.triggeredBy.type,
          frequency: rule.timesPerEncounter ? 'oncePerEncounter' : rule.timesPerDay ? 'oncePerDay' : 'atWill',
          outcome: rule.outcome || 'mustAccept'
        };
        classified.rerolls.push(reroll);
      }
    }
  }

  /**
   * Classify a skill bonus text
   * @private
   */
  static _classifySkillBonus(bonusText) {
    if (!bonusText) return null;

    const text = String(bonusText);
    const match = text.match(/([+-])(\d+)\s+(.+)/);
    if (!match) return null;

    const value = parseInt(match[1] + match[2], 10);
    const skillName = match[3].trim();

    return {
      id: this._slugify(skillName),
      name: skillName,
      description: bonusText,
      type: 'bonus',
      classification: 'bonus',
      passive: [{
        targetType: 'skill',
        target: this._normalizeSkillKey(skillName),
        value: value,
        bonusType: 'species'
      }],
      rerolls: [],
      grants: [],
      activated: [],
      prerequisites: []
    };
  }

  /**
   * Classify a special ability
   * @private
   */
  static _classifySpecial(special) {
    if (!special) return null;

    const text = String(special).toLowerCase();
    let classification = 'identity';

    // Heuristics for classification
    if (text.includes('force-sensitive')) {
      return {
        id: 'force-sensitive',
        name: 'Force-Sensitive Species',
        description: special,
        type: 'special',
        classification: 'grant',
        passive: [],
        rerolls: [],
        grants: [{
          grantType: 'feat',
          target: 'Force Sensitivity',
          frequency: 'always'
        }],
        activated: [],
        prerequisites: ['force-sensitive']
      };
    }

    return {
      id: this._slugify(special),
      name: special,
      description: special,
      type: 'special',
      classification: classification,
      passive: [],
      rerolls: [],
      grants: [],
      activated: [],
      prerequisites: []
    };
  }

  /**
   * Populate natural weapons
   * @private
   */
  static _populateNaturalWeapons(ledger, doc) {
    // Natural weapons come from trait rules of type naturalWeapon
    for (const trait of ledger.traits) {
      for (const rule of trait.rules || []) {
        if (rule.type === 'naturalWeapon' && rule.name) {
          const weapon = {
            id: rule.id || this._slugify(rule.name),
            name: rule.name,
            type: 'weapon',
            damage: {
              formula: rule.damage?.formula || '1d4',
              type: rule.damage?.damageType || 'slashing'
            },
            attackAbility: rule.attackAbility || 'str',
            category: rule.weaponCategory || 'melee',
            properties: {
              alwaysArmed: rule.traits?.alwaysArmed || false,
              countsAsWeapon: rule.traits?.countsAsWeapon || false,
              finesse: rule.traits?.finesse || false
            }
          };
          ledger.naturalWeapons.push(weapon);
        }
      }
    }
  }

  /**
   * Normalize skill key from display name
   * @private
   */
  static _normalizeSkillKey(skillName) {
    const map = {
      'acrobatics': 'acrobatics',
      'climb': 'climb',
      'deception': 'deception',
      'endurance': 'endurance',
      'gather information': 'gatherInformation',
      'initiative': 'initiative',
      'jump': 'jump',
      'knowledge (bureaucracy)': 'knowledgeBureaucracy',
      'knowledge (galactic lore)': 'knowledgeGalacticLore',
      'knowledge (life sciences)': 'knowledgeLifeSciences',
      'knowledge (physical sciences)': 'knowledgePhysicalSciences',
      'knowledge (social sciences)': 'knowledgeSocialSciences',
      'knowledge (tactics)': 'knowledgeTactics',
      'knowledge (technology)': 'knowledgeTechnology',
      'mechanics': 'mechanics',
      'perception': 'perception',
      'persuasion': 'persuasion',
      'pilot': 'pilot',
      'ride': 'ride',
      'stealth': 'stealth',
      'survival': 'survival',
      'swim': 'swim',
      'treat injury': 'treatInjury',
      'use computer': 'useComputer',
      'use the force': 'useTheForce'
    };

    const lower = skillName.toLowerCase().trim();
    return map[lower] || this._slugify(lower);
  }

  /**
   * Convert to kebab-case slug
   * @private
   */
  static _slugify(text) {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Validate ledger completeness
   * @private
   */
  static _validateLedger(ledger) {
    // Mark unresolved traits if classification still unresolved
    for (const trait of ledger.traits) {
      if (trait.classification === 'unresolved') {
        ledger.unresolved.push({
          id: trait.id,
          name: trait.name,
          description: trait.description,
          reason: 'Unable to classify trait automatically - needs manual review'
        });
      }
    }
  }
}

export default SpeciesGrantLedgerBuilder;
