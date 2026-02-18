#!/usr/bin/env node

/**
 * migrate-species-to-structured-rules.js
 *
 * Bulk migration script: Convert all 121 species from text-based traits to structured rules
 *
 * Usage:
 *   node scripts/migration/migrate-species-to-structured-rules.js
 *
 * Input:  data/species-traits.json (current format)
 * Output: data/species-traits-migrated.json (structured rule format)
 *
 * Steps:
 * 1. Read all species from species-traits.json
 * 2. For each trait, parse description and convert to structured rules
 * 3. Use canonical IDs from skills.json
 * 4. Generate unique rule IDs per species
 * 5. Preserve all human-readable descriptions
 * 6. Output migrated JSON
 * 7. Compare before/after for validation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../');

/**
 * Skill name to canonical ID mapping
 */
const SKILL_ID_MAP = {
  'acrobatics': 'acrobatics',
  'climb': 'climb',
  'deception': 'deception',
  'endurance': 'endurance',
  'gather information': 'gatherInfo',
  'gatherinfo': 'gatherInfo',
  'initiative': 'initiative',
  'jump': 'jump',
  'mechanics': 'mechanics',
  'perception': 'perception',
  'perform': 'perform',
  'persuasion': 'persuasion',
  'pilot': 'pilot',
  'stealth': 'stealth',
  'survival': 'survival',
  'swim': 'swim',
  'treat injury': 'treatInjury',
  'treatinjury': 'treatInjury',
  'use computer': 'useComputer',
  'usecomputer': 'useComputer',
  'use the force': 'useTheForce',
  'usetheforce': 'useTheForce',
  'intimidate': 'persuasion', // SWSE combines Intimidate into Persuasion
  // Knowledge skills - dynamic
  'knowledge': 'knowledgeGalacticLore',
  'knowledge (bureaucracy)': 'knowledgeBureaucracy',
  'knowledge (galactic lore)': 'knowledgeGalacticLore',
  'knowledge (life sciences)': 'knowledgeLifeSciences',
  'knowledge (physical sciences)': 'knowledgePhysicalSciences',
  'knowledge (social sciences)': 'knowledgeSocialSciences',
  'knowledge (tactics)': 'knowledgeTactics',
  'knowledge (technology)': 'knowledgeTechnology',
  // Defenses as ability bonuses
  'strength': 'str',
  'dexterity': 'dex',
  'constitution': 'con',
  'intelligence': 'int',
  'wisdom': 'wis',
  'charisma': 'cha'
};

/**
 * Defense name normalization
 */
const DEFENSE_NAMES = {
  'fortitude': 'fortitude',
  'fort': 'fortitude',
  'reflex': 'reflex',
  'ref': 'reflex',
  'will': 'will'
};

class SpeciesMigrator {
  constructor() {
    this.stats = {
      totalSpecies: 0,
      totalTraits: 0,
      convertedTraits: 0,
      skillBonuses: 0,
      defenseBonuses: 0,
      damageBonuses: 0,
      damageReductions: 0,
      fastHealing: 0,
      naturalWeapon: 0,
      movement: 0,
      breathing: 0,
      immunity: 0,
      reroll: 0,
      sense: 0,
      size: 0,
      naturalArmor: 0,
      rage: 0,
      meleeCultureBonus: 0,
      multiLimb: 0,
      restriction: 0,
      featGrants: 0,
      specialAbilities: 0,
      failed: 0
    };
    this.errors = [];
  }

  /**
   * Main migration entry point
   */
  async migrate() {
    try {
      // Load species data
      const speciesPath = path.join(projectRoot, 'data/species-traits.json');
      const speciesData = JSON.parse(fs.readFileSync(speciesPath, 'utf-8'));

      console.log(`\n📦 Loading ${speciesData.length} species...`);
      this.stats.totalSpecies = speciesData.length;

      // Migrate each species
      const migratedSpecies = speciesData.map((species, index) => {
        try {
          return this._migrateSpecies(species);
        } catch (err) {
          this.errors.push(`Species ${species.name}: ${err.message}`);
          this.stats.failed++;
          return species; // Return unchanged on error
        }
      });

      // Write output
      const outputPath = path.join(projectRoot, 'data/species-traits-migrated.json');
      fs.writeFileSync(outputPath, JSON.stringify(migratedSpecies, null, 2));

      console.log(`\n✅ Migration complete!`);
      console.log(`📁 Output: ${outputPath}`);
      this._printStats();

      if (this.errors.length > 0) {
        console.log(`\n⚠️  ${this.errors.length} errors encountered:`);
        this.errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
      }
    } catch (err) {
      console.error(`Fatal error:`, err);
      process.exit(1);
    }
  }

  /**
   * Migrate a single species
   */
  _migrateSpecies(species) {
    const migrated = { ...species };

    // Ensure ID exists
    if (!migrated.id) {
      migrated.id = this._slugify(species.name);
    }

    // Migrate trait arrays
    migrated.structuralTraits = this._migrateTraitArray(
      species.structuralTraits || [],
      species.name
    );

    migrated.conditionalTraits = this._migrateTraitArray(
      species.conditionalTraits || [],
      species.name
    );

    migrated.bonusFeats = this._migrateTraitArray(species.bonusFeats || [], species.name);

    return migrated;
  }

  /**
   * Migrate an array of traits
   */
  _migrateTraitArray(traits, speciesName) {
    if (!Array.isArray(traits)) {
      return [];
    }

    return traits.map(trait => {
      this.stats.totalTraits++;

      const migrated = {
        id: trait.id || this._slugify(trait.name || 'trait'),
        name: trait.name || 'Unknown Trait',
        description: trait.description || trait.name || ''
      };

      // If trait already has rules, keep them
      if (trait.rules && Array.isArray(trait.rules)) {
        migrated.rules = trait.rules;
        this.stats.convertedTraits++;
        return migrated;
      }

      // Otherwise, parse description to create rules
      const description = trait.description || '';
      const rules = this._parseDescription(description, speciesName, migrated.id);

      if (rules.length > 0) {
        migrated.rules = rules;
        this.stats.convertedTraits++;
      }

      return migrated;
    });
  }

  /**
   * Parse trait description and generate structured rules
   */
  _parseDescription(description, speciesName, traitId) {
    const rules = [];

    if (!description) {
      return rules;
    }

    const text = description.toLowerCase();
    let ruleIndex = 0;

    // Try each pattern in order
    const patterns = [
      this._tryParseSkillBonus,
      this._tryParseDefenseBonus,
      this._tryParseWillDefenseBonus,
      this._tryParseDamageBonus,
      this._tryParseDamageReduction,
      this._tryParseFastHealing,
      this._tryParseNaturalWeapon,
      this._tryParseMovement,
      this._tryParseBreathing,
      this._tryParseImmunity,
      this._tryParseReroll,
      this._tryParseSense,
      this._tryParseSize,
      this._tryParseNaturalArmor,
      this._tryParseRage,
      this._tryParseMeleeCultureBonus,
      this._tryParseMultiLimb,
      this._tryParseRestriction,
      this._tryParseForceAbility,
      this._tryParseFeatGrant
    ];

    for (const parser of patterns) {
      const result = parser.call(this, text, description);
      if (result) {
        result.forEach((rule, idx) => {
          rule.id = `${traitId}-rule-${ruleIndex + idx}`;
        });
        rules.push(...result);
        Object.keys(result[0]).forEach(key => {
          if (key.includes('Bonus')) this.stats.skillBonuses++;
          if (key.includes('Defense')) this.stats.defenseBonuses++;
          if (key.includes('Damage')) this.stats.damageBonuses++;
          if (key.includes('Feat')) this.stats.featGrants++;
        });
        break;
      }
    }

    if (rules.length === 0) {
      this.stats.specialAbilities++;
    }

    return rules;
  }

  /**
   * Parse skill bonus pattern: "+X species bonus on [Skill]"
   */
  _tryParseSkillBonus(text, originalText) {
    const patterns = [
      /\+(\d+)\s+species\s+bonus\s+on\s+([a-z\s()]+?)\s+checks?/i,
      /\+(\d+)\s+species\s+bonus\s+(?:to|on)\s+([a-z\s()]+?)(?:\s+checks?)?/i,
      /gains?\s+a?\s*\+(\d+)\s+species\s+bonus\s+(?:to|on)\s+([a-z\s()]+?)\s+(?:skill)?/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseInt(match[1], 10);
        const skillName = match[2].trim();
        const skillId = this._normalizeSkill(skillName);

        if (!skillId) continue;

        // Check for context condition
        const context = this._extractContext(originalText);

        const rule = {
          type: 'skillModifier',
          skillId,
          value,
          bonusType: 'species',
          when: { type: 'always' }
        };

        if (context) {
          rule.context = context;
        }

        this.stats.skillBonuses++;
        return [rule];
      }
    }

    return null;
  }

  /**
   * Parse defense bonus pattern: "+X species bonus to [Defense] Defense"
   */
  _tryParseDefenseBonus(text, originalText) {
    const patterns = [
      /\+(\d+)\s+species\s+bonus\s+to\s+(fortitude|reflex|will)\s+defense/i,
      /\+(\d+)\s+(?:species\s+)?bonus\s+(?:to\s+)?([a-z]+)\s+defense/i,
      /[-–](\d+)\s+species\s+(?:penalty|bonus)\s+(?:to|on)\s+(fortitude|reflex|will)\s+defense/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let value = parseInt(match[1], 10);
        let defense = match[2].toLowerCase().trim();

        // Normalize defense name
        defense = DEFENSE_NAMES[defense] || defense;
        if (!['fortitude', 'reflex', 'will'].includes(defense)) continue;

        // Check if it's a penalty (negative value)
        if (originalText.includes('penalty')) {
          value = -value;
        }

        const rule = {
          type: 'defenseModifier',
          defense,
          value,
          bonusType: 'species',
          when: { type: 'always' }
        };

        this.stats.defenseBonuses++;
        return [rule];
      }
    }

    return null;
  }

  /**
   * Parse damage bonus pattern: "+X species bonus on [Damage]" or grapple checks
   */
  _tryParseDamageBonus(text, originalText) {
    // Check for grapple bonus
    if (text.includes('grapple')) {
      const pattern = /\+(\d+)\s+species\s+bonus\s+on\s+grapple/i;
      const match = text.match(pattern);
      if (match) {
        const value = parseInt(match[1], 10);

        const rule = {
          type: 'damageModifier',
          attackType: 'melee',
          target: 'attackRoll',  // grapple uses attack roll mechanics
          value,
          bonusType: 'species',
          description: 'Grapple bonus',
          when: { type: 'always' }
        };

        this.stats.damageBonuses++;
        return [rule];
      }
    }

    if (!text.includes('damage')) return null;

    const patterns = [
      /\+(\d+)\s+species\s+bonus\s+on\s+(melee|ranged)?\s*attack\s+rolls?/i,
      /\+(\d+)\s+species\s+bonus\s+on\s+(melee|ranged)?\s*damage\s+rolls?/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseInt(match[1], 10);
        const attackType = (match[2] || 'melee').toLowerCase();

        const isAttack = originalText.includes('attack');
        const isDamage = originalText.includes('damage');

        const rule = {
          type: 'damageModifier',
          attackType,
          target: isDamage ? 'damageRoll' : isAttack ? 'attackRoll' : 'both',
          value,
          bonusType: 'species',
          when: { type: 'always' }
        };

        this.stats.damageBonuses++;
        return [rule];
      }
    }

    return null;
  }

  /**
   * Parse special ability that adds to Will Defense
   */
  _tryParseWillDefenseBonus(text, originalText) {
    const pattern = /\+(\d+).*?will\s+defense|gains?\s+.*?\+(\d+).*?will/i;
    const match = originalText.match(pattern);

    if (match) {
      const value = parseInt(match[1] || match[2], 10);

      const rule = {
        type: 'defenseModifier',
        defense: 'will',
        value,
        bonusType: 'species',
        when: { type: 'always' }
      };

      this.stats.defenseBonuses = (this.stats.defenseBonuses || 0) + 1;
      return [rule];
    }

    return null;
  }

  /**
   * Parse Force Sensitivity feat grant
   */
  _tryParseForceAbility(text, originalText) {
    if (text.includes('force') && (text.includes('sensitivity') || text.includes('use the force') || text.includes('force training'))) {
      let featId = 'force-sensitivity';

      if (text.includes('training') || text.includes('force training')) {
        featId = 'force-training';
      }

      const rule = {
        type: 'featGrant',
        featId,
        when: { type: 'always' },
        allowMultiple: false
      };

      this.stats.featGrants++;
      return [rule];
    }

    return null;
  }

  /**
   * Parse feat grant pattern: "gains a bonus feat" or "gains Feat Name"
   */
  _tryParseFeatGrant(text, originalText) {
    const patterns = [/gains?\s+(?:a\s+)?bonus\s+feat(?:\s+at\s+\d+(?:st|nd|rd|th)\s+level)?/i];

    for (const pattern of patterns) {
      if (pattern.test(text)) {
        const rule = {
          type: 'featGrant',
          featId: 'bonus-feat', // TBD: Extract actual feat ID
          when: { type: 'always' },
          allowMultiple: false
        };

        this.stats.featGrants++;
        return [rule];
      }
    }

    return null;
  }

  /**
   * Parse damage reduction pattern: "Damage Reduction X" or "DR X"
   */
  _tryParseDamageReduction(text, originalText) {
    const patterns = [
      /damage\s+reduction\s+(\d+)(?:\s+vs?\.?\s+([a-z\s,]+))?/i,
      /dr\s+(\d+)(?:\s+vs?\.?\s+([a-z\s,]+))?/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseInt(match[1], 10);
        let damageTypes = ['all'];

        if (match[2]) {
          damageTypes = match[2]
            .split(/[,;]/)
            .map(t => t.trim().toLowerCase())
            .filter(t => t);
        }

        const rule = {
          type: 'damageReduction',
          value,
          appliesTo: { damageTypes },
          stacking: 'highest',
          when: { type: 'always' }
        };

        this.stats.damageReductions = (this.stats.damageReductions || 0) + 1;
        return [rule];
      }
    }

    return null;
  }

  /**
   * Parse fast healing pattern: "regains hit points", "regeneration", etc.
   */
  _tryParseFastHealing(text, originalText) {
    const patterns = [
      /(?:automatically\s+)?regains?\s+hit\s+points?\s+equal\s+to\s+(?:its\s+)?(\w+)/i,
      /(?:automatically\s+)?regains?\s+(\d+)\s+hit\s+points?/i,
      /fast\s+healing\s+(\d+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let value;

        // If it's "level" or similar, use a reasonable default
        if (match[1] === 'level' || match[1] === 'character' || !isNaN(match[1])) {
          value = isNaN(match[1]) ? 1 : parseInt(match[1], 10);
        } else {
          continue;
        }

        const rule = {
          type: 'fastHealing',
          value,
          trigger: 'startOfTurn',
          when: { type: 'always' }
        };

        // Check for suppression (e.g., "unless damaged by fire or acid")
        const suppressMatch = originalText.match(/unless\s+(?:damaged\s+by\s+)?([a-z\s]+?)(?:\s+damage)?(?:\s+or|\.)/i);
        if (suppressMatch) {
          const damageType = suppressMatch[1].trim().toLowerCase();
          rule.suppressedBy = {
            type: 'damageType',
            value: [damageType]
          };
        }

        this.stats.fastHealing = (this.stats.fastHealing || 0) + 1;
        return [rule];
      }
    }

    return null;
  }

  /**
   * Parse movement pattern: "swim speed", "fly", "wings", "glide", etc.
   */
  _tryParseMovement(text, originalText) {
    const patterns = [
      { regex: /(\d+)\s*(?:ft|feet|sq|square)?\.?\s+(climb|swim|fly|burrow)\s+speed/i, hasValue: true },
      { regex: /(climb|swim|fly|burrow)\s+speed\s+equal\s+to\s+(?:its\s+)?base\s+speed/i, hasValue: false },
      { regex: /gains?\s+a?\s+(climb|swim|fly|burrow)\s+speed\s+equal\s+to\s+(?:its\s+)?base\s+speed/i, hasValue: false },
      { regex: /gains?\s+(?:a\s+)?(climb|swim|fly|burrow)\s+speed\s+of\s+(\d+)/i, hasValue: true },
      { regex: /can\s+(climb|swim|fly)\s+at\s+(\d+)\s*(?:ft|feet)?/i, hasValue: true },
      { regex: /may\s+fly\s+with\s+a\s+speed\s+of\s+(\d+)\s+squares?/i, mode: 'fly', speedGroup: 1 },
      { regex: /wings?.*?fly.*?(\d+)\s+squares?/i, mode: 'fly', speedGroup: 1 },
      { regex: /\bwings\b.*?\(([a-z]+)\)/i, mode: 'fly', speedValue: 6 },
      { regex: /\bglide\b/i, mode: 'fly', speedValue: 6 }
    ];

    for (const pp of patterns) {
      const match = text.match(pp.regex);
      if (match) {
        let mode, speed;

        // Handle different pattern types
        if (pp.mode && pp.speedValue) {
          // Direct mode and speed
          mode = pp.mode;
          speed = pp.speedValue;
        } else if (pp.mode && pp.speedGroup) {
          // Mode with speed from capture group
          mode = pp.mode;
          speed = match[pp.speedGroup] ? parseInt(match[pp.speedGroup], 10) : 6;
        } else if (pp.hasValue) {
          // Pattern has explicit value
          if (!isNaN(match[1])) {
            speed = parseInt(match[1], 10);
            mode = match[2] ? match[2].toLowerCase() : 'walk';
          } else {
            mode = match[1].toLowerCase();
            speed = match[2] ? parseInt(match[2], 10) : 30;
          }
        } else {
          // "equal to base speed" - assume standard speed (6 squares = 30 ft)
          mode = match[1].toLowerCase();
          speed = 30;
        }

        // Convert feet to squares if needed (1 square = 5 ft)
        const speedInSquares = speed > 10 ? Math.floor(speed / 5) : speed;

        const rule = {
          type: 'movement',
          mode,
          speed: speedInSquares || 1,
          combatMovement: true,
          when: { type: 'always' }
        };

        this.stats.movement = (this.stats.movement || 0) + 1;
        return [rule];
      }
    }

    return null;
  }

  /**
   * Parse breathing/environment pattern: "can breathe water", "does not need to breathe", etc.
   */
  _tryParseBreathing(text, originalText) {
    const patterns = [
      { regex: /can\s+breathe\s+(?:both\s+)?(?:air\s+and\s+)?water|breathe(?:s)?\s+water/i, type: 'aquatic' },
      { regex: /aquatic.*breathing|can\s+breathe\s+water/i, type: 'aquatic' },
      { regex: /can\s+breathe\s+(?:in\s+)?(?:a\s+)?vacuum|vacuum.*breathing/i, type: 'vacuum' },
      { regex: /does\s+not\s+need\s+to\s+breathe/i, type: 'vacuum-adapted' },
      { regex: /amphibious.*breathing|breathe.*both\s+air.*water|can\s+breathe\s+air\s+and\s+water/i, type: 'amphibious' },
      { regex: /poison\s+(?:resistant|immunity|immune)/i, type: 'poison-resistant' }
    ];

    for (const pp of patterns) {
      if (pp.regex.test(text)) {
        const rule = {
          type: 'breathing',
          breathType: pp.type,
          immune: text.toLowerCase().includes('immune'),
          description: originalText.substring(0, 100),
          when: { type: 'always' }
        };

        this.stats.breathing = (this.stats.breathing || 0) + 1;
        return [rule];
      }
    }

    return null;
  }

  /**
   * Parse immunity pattern: "immune to", "immunity to", etc.
   */
  _tryParseImmunity(text, originalText) {
    const patterns = [
      /immun(?:e|ity)\s+to\s+([a-z\s,]+?)(?:\s+(?:damage|condition))?/i,
      /cannot\s+be\s+([a-z\s,]+?)(?:\s+by|\.)?/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let values = match[1]
          .split(/[,;and]+/)
          .map(v => v.trim().toLowerCase())
          .filter(v => v);

        if (values.length === 0) continue;

        // Determine if it's damage type or condition
        const damageTypes = ['fire', 'cold', 'electricity', 'energy', 'sonic', 'acid', 'physical', 'piercing', 'slashing', 'bludgeoning'];
        const conditions = ['poison', 'disease', 'sleep', 'charm', 'fear', 'stun', 'paralysis'];

        const isDamage = values.some(v => damageTypes.some(dt => v.includes(dt)));
        const isCondition = values.some(v => conditions.some(cond => v.includes(cond)));

        const rule = {
          type: 'immunity',
          immuneTo: {
            type: isDamage ? 'damageType' : isCondition ? 'condition' : 'effect',
            values
          },
          severity: 'full',
          when: { type: 'always' }
        };

        this.stats.immunity = (this.stats.immunity || 0) + 1;
        return [rule];
      }
    }

    return null;
  }

  /**
   * Parse natural weapon pattern: "claws", "bite", "natural weapons", etc.
   */
  _tryParseNaturalWeapon(text, originalText) {
    const patterns = [
      { regex: /natural\s+(?:claw|bite)\s+attacks?|has\s+(?:natural\s+)?claw/i, type: 'claws', damage: '1d4' },
      { regex: /has\s+natural\s+claw.*?(\d+d\d+)\s+points?.*?slashing/i, type: 'claws', damageGroup: 1 },
      { regex: /natural\s+weapons?/i, type: 'claws', damage: '1d4' },
      { regex: /claw\s+attacks?.*?deal\s+(\d+d\d+)/i, type: 'claws', damageGroup: 1 },
      { regex: /bite\s+attack/i, type: 'bite', damage: '1d6' }
    ];

    for (const pp of patterns) {
      if (pp.regex.test(text)) {
        let damage = pp.damage;
        const match = originalText.match(pp.regex);
        if (pp.damageGroup && match && match[pp.damageGroup]) {
          damage = match[pp.damageGroup];
        }

        const rule = {
          type: 'naturalWeapon',
          id: pp.type,
          name: pp.type === 'claws' ? 'Claws' : 'Bite',
          weaponCategory: 'melee',
          attackAbility: 'str',
          damage: {
            formula: damage,
            damageType: pp.type === 'bite' ? 'piercing' : 'slashing'
          },
          critical: { range: 20, multiplier: 2 },
          proficiency: { type: 'natural', isProficient: true },
          traits: {
            alwaysArmed: true,
            countsAsWeapon: true,
            finesse: false,
            light: false,
            twoHanded: false
          },
          when: { type: 'always' }
        };

        this.stats.naturalWeapon = (this.stats.naturalWeapon || 0) + 1;
        return [rule];
      }
    }

    return null;
  }

  /**
   * Parse reroll pattern: "may reroll", "reroll and keep higher", etc.
   */
  _tryParseReroll(text, originalText) {
    const patterns = [
      { regex: /may\s+reroll\s+any\s+([a-z\s]+)\s+(?:checks?|rolls?)/i, outcome: 'mustAccept' },
      { regex: /may\s+(?:choose\s+to\s+)?reroll\s+(?:any\s+)?([a-z\s]+),\s+but\s+(?:must\s+)?accept/i, outcome: 'mustAccept' },
      { regex: /may\s+(?:choose\s+to\s+)?reroll\s+(?:any\s+)?([a-z\s]+)(?:\s+(?:rolls?|checks))?(?:\s+and\s+use|,\s+using)?\s+(?:the\s+)?(?:higher|better)/i, outcome: 'keepHigher' },
      { regex: /may\s+reroll\s+([a-z\s]+)\s+(?:checks?|rolls?),\s+(?:result|outcome)\s+must\s+be\s+accepted/i, outcome: 'mustAccept' }
    ];

    for (const pp of patterns) {
      const match = text.match(pp.regex);
      if (match) {
        const skillOrAbility = match[1].trim().toLowerCase();

        // Try to map to skill ID
        let triggeredBy = { type: 'skillCheck' };
        const skillId = this._normalizeSkill(skillOrAbility);
        if (skillId) {
          triggeredBy.skillId = skillId;
        } else if (skillOrAbility.includes('initiative')) {
          triggeredBy = { type: 'initiative' };
        } else if (skillOrAbility.includes('attack')) {
          triggeredBy = { type: 'attack' };
        }

        const rule = {
          type: 'reroll',
          triggeredBy,
          timesPerEncounter: 1,
          outcome: pp.outcome,
          description: originalText.substring(0, 150),
          when: { type: 'always' }
        };

        this.stats.reroll = (this.stats.reroll || 0) + 1;
        return [rule];
      }
    }

    return null;
  }

  /**
   * Parse sense pattern: "darkvision", "blindsense", "gains blindsense", etc.
   */
  _tryParseSense(text, originalText) {
    const patterns = [
      { regex: /ignores?\s+concealment.*?darkness|darkvision/i, type: 'darkvision', range: null },
      { regex: /(?:gains?\s+)?blindsense\s+out\s+to\s+(\d+)\s+squares?/i, type: 'blindsense', rangeGroup: 1 },
      { regex: /force.?sight|perceives?\s+.*?\s+through\s+the\s+force|blind\s+but\s+perceives/i, type: 'force-sight', range: null },
      { regex: /tremorsense/i, type: 'tremorsense', range: null }
    ];

    for (const pp of patterns) {
      const match = text.match(pp.regex);
      if (match) {
        let range = pp.range;
        if (pp.rangeGroup && match[pp.rangeGroup]) {
          range = parseInt(match[pp.rangeGroup], 10);
        }

        const rule = {
          type: 'sense',
          senseType: pp.type,
          range,
          description: originalText.substring(0, 100),
          when: { type: 'always' }
        };

        this.stats.sense = (this.stats.sense || 0) + 1;
        return [rule];
      }
    }

    return null;
  }

  /**
   * Parse size pattern: "large size", "as large creatures", etc.
   */
  _tryParseSize(text, originalText) {
    const patterns = [
      { regex: /(?:as\s+)?large\s+creatures?/i, size: 'large' },
      { regex: /(?:as\s+)?small\s+creatures?/i, size: 'small' },
      { regex: /(?:as\s+)?huge\s+creatures?/i, size: 'huge' }
    ];

    for (const pp of patterns) {
      if (pp.regex.test(text)) {
        // Parse effects from description
        const effects = {};

        if (originalText.includes('-1') && originalText.includes('reflex')) {
          effects.reflexDefensePenalty = -1;
        }
        if (originalText.includes('-5') && originalText.includes('stealth')) {
          effects.stealthPenalty = -5;
        }
        if (originalText.includes('+5') && originalText.includes('damage threshold')) {
          effects.damageThresholdBonus = 5;
        }
        if (originalText.includes('double') && originalText.includes('carry')) {
          effects.carryingCapacityMultiplier = 2;
        }

        const rule = {
          type: 'size',
          sizeCategory: pp.size,
          effects,
          when: { type: 'always' }
        };

        this.stats.size = (this.stats.size || 0) + 1;
        return [rule];
      }
    }

    return null;
  }

  /**
   * Parse natural armor pattern: "natural armor bonus", etc.
   */
  _tryParseNaturalArmor(text, originalText) {
    const pattern = /natural\s+armor\s+(?:bonus\s+)?(?:of\s+)?(\+?)(\d+)/i;
    const match = text.match(pattern);

    if (match) {
      const value = parseInt(match[2], 10);

      const rule = {
        type: 'naturalArmor',
        value,
        defense: 'reflex',
        when: { type: 'always' }
      };

      this.stats.naturalArmor = (this.stats.naturalArmor || 0) + 1;
      return [rule];
    }

    return null;
  }

  /**
   * Parse rage pattern: "when reduced to half", "gains bonus on melee", etc.
   */
  _tryParseRage(text, originalText) {
    // Check if this is a rage ability
    if (!originalText.includes('reduced') && !originalText.includes('half') && !originalText.includes('rage')) {
      return null;
    }

    const patterns = [
      /(?:when\s+)?reduced\s+to\s+half\s+hit\s+points?(?:\s+or\s+fewer)?.*?gains?\s+(?:a\s+)?\+(\d+)\s+(?:species\s+)?bonus\s+on\s+([a-z\s]+)/i,
      /(?:when\s+)?reduced\s+to\s+half\s+hit\s+points?.*?\+(\d+)(?:\s+species)?\s+bonus.*?melee/i
    ];

    for (const pattern of patterns) {
      const match = originalText.match(pattern);
      if (match) {
        const bonus = parseInt(match[1], 10);
        const appliesTo = originalText.toLowerCase().includes('damage') ? 'both' : 'melee';

        const bonuses = {};
        if (appliesTo === 'both' || appliesTo === 'melee') {
          bonuses.meleeAttackBonus = bonus;
          if (originalText.includes('damage')) {
            bonuses.meleeDamageBonus = bonus;
          }
        }

        const rule = {
          type: 'rage',
          trigger: {
            type: 'hpThreshold',
            value: 50
          },
          duration: 'untilEndOfEncounter',
          bonuses,
          description: originalText.substring(0, 150),
          when: { type: 'always' }
        };

        this.stats.rage = (this.stats.rage || 0) + 1;
        return [rule];
      }
    }

    return null;
  }

  /**
   * Parse melee culture bonus: "warrior culture", "martial culture", "powerful arms", etc.
   */
  _tryParseMeleeCultureBonus(text, originalText) {
    const patterns = [
      /(?:warrior|martial)\s+culture.*?\+(\d+).*?melee/i,
      /powerful\s+(?:arms|strength).*?\+(\d+).*?melee/i,
      /gains?\s+(?:a\s+)?\+(\d+)\s+species\s+bonus\s+on\s+melee\s+attack/i
    ];

    for (const pattern of patterns) {
      const match = originalText.match(pattern);
      if (match) {
        const value = parseInt(match[1], 10);

        const rule = {
          type: 'meleeCultureBonus',
          value,
          appliesTo: 'all',
          bonusType: 'species',
          description: originalText.substring(0, 100),
          when: { type: 'always' }
        };

        this.stats.meleeCultureBonus = (this.stats.meleeCultureBonus || 0) + 1;
        return [rule];
      }
    }

    return null;
  }

  /**
   * Parse multi-limb pattern: "four arms", "extra limbs", "elongated reach", "quad-limbed", etc.
   */
  _tryParseMultiLimb(text, originalText) {
    const patterns = [
      { regex: /four\s+(?:arms?|hands?)/i, count: 4, grapple: true },
      { regex: /(?:multiple|extra)\s+limbs?/i, count: 2 },
      { regex: /quad\s*-?limbed/i, count: 4, grapple: true },
      { regex: /elongated\s+reach/i, count: 2, grapple: true }
    ];

    for (const pp of patterns) {
      if (pp.regex.test(text)) {
        const effects = {};

        // Parse effects
        if (pp.grapple || originalText.toLowerCase().includes('grapple')) {
          effects.grappleBonus = 2;
        }
        if (originalText.toLowerCase().includes('multi') && originalText.toLowerCase().includes('weapon')) {
          effects.weaponPenaltyIgnore = true;
        }

        const rule = {
          type: 'multiLimb',
          limbCount: pp.count,
          effects,
          description: originalText.substring(0, 100),
          when: { type: 'always' }
        };

        this.stats.multiLimb = (this.stats.multiLimb || 0) + 1;
        return [rule];
      }
    }

    return null;
  }

  /**
   * Parse restriction pattern: "does not gain", "cannot", "only use", etc.
   */
  _tryParseRestriction(text, originalText) {
    const patterns = [
      { regex: /does\s+not\s+gain\s+weapon\s+proficiency\s+\(heavy\s+weapons\)/i, targets: ['heavy-weapons'], restricts: 'weaponType', reason: 'Does not gain proficiency with heavy weapons' },
      { regex: /does\s+not\s+gain\s+weapon\s+proficiency\s+\((.*?)\)/i, restricts: 'weaponType', reason: 'Limited weapon proficiency' },
      { regex: /only\s+use\s+organic\s+equipment/i, targets: ['inorganic-equipment'], restricts: 'equipmentType', reason: 'Can only use organic equipment' },
      { regex: /cannot\s+benefit\s+from\s+organic\s+healing/i, targets: ['organic-healing'], restricts: 'ability', reason: 'Cannot benefit from organic healing' }
    ];

    for (const pp of patterns) {
      const match = originalText.match(pp.regex);
      if (match) {
        let targets = pp.targets;
        if (!targets && match[1]) {
          targets = [match[1].toLowerCase().replace(/[()]/g, '').trim()];
        }

        const rule = {
          type: 'restriction',
          restricts: pp.restricts,
          targets: targets || [],
          reason: pp.reason,
          description: originalText.substring(0, 100),
          when: { type: 'always' }
        };

        this.stats.restriction = (this.stats.restriction || 0) + 1;
        return [rule];
      }
    }

    return null;
  }

  /**
   * Extract context condition from description
   */
  _extractContext(text) {
    const contextPatterns = [
      { pattern: /involving\s+([a-z\s]+)/i, type: 'machinery' },
      { pattern: /energy\s+weapon/i, type: 'energy-weapons' },
      { pattern: /underwater|swimming/i, type: 'underwater' },
      { pattern: /sound/i, type: 'sound' },
      { pattern: /trade|negotiation|business|bargain/i, type: 'trade' }
    ];

    for (const cp of contextPatterns) {
      const match = text.match(cp.pattern);
      if (match) {
        return {
          type: cp.type,
          description: match[1] || cp.type
        };
      }
    }

    return null;
  }

  /**
   * Normalize skill name to canonical ID
   */
  _normalizeSkill(skillName) {
    const normalized = skillName.toLowerCase().trim();

    // Direct lookup
    if (SKILL_ID_MAP[normalized]) {
      return SKILL_ID_MAP[normalized];
    }

    // Partial match for knowledge skills
    for (const [key, value] of Object.entries(SKILL_ID_MAP)) {
      if (normalized.includes(key)) {
        return value;
      }
    }

    return null;
  }

  /**
   * Slugify a name to create an ID
   */
  _slugify(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Print migration statistics
   */
  _printStats() {
    console.log(`\n📊 Migration Statistics:`);
    console.log(`   Total species:      ${this.stats.totalSpecies}`);
    console.log(`   Total traits:       ${this.stats.totalTraits}`);
    console.log(`   Converted traits:   ${this.stats.convertedTraits}`);
    console.log(`\n   Rule Types Found:`);
    console.log(`   - Skill bonuses:       ${this.stats.skillBonuses}`);
    console.log(`   - Defense bonuses:     ${this.stats.defenseBonuses}`);
    console.log(`   - Damage bonuses:      ${this.stats.damageBonuses}`);
    console.log(`   - Natural weapons:     ${this.stats.naturalWeapon}`);
    console.log(`   - Rerolls:             ${this.stats.reroll}`);
    console.log(`   - Senses:              ${this.stats.sense}`);
    console.log(`   - Size effects:        ${this.stats.size}`);
    console.log(`   - Natural armor:       ${this.stats.naturalArmor}`);
    console.log(`   - Rage:                ${this.stats.rage}`);
    console.log(`   - Melee culture bonus: ${this.stats.meleeCultureBonus}`);
    console.log(`   - Multi-limb:          ${this.stats.multiLimb}`);
    console.log(`   - Restrictions:        ${this.stats.restriction}`);
    console.log(`   - Damage reduction:    ${this.stats.damageReductions}`);
    console.log(`   - Fast healing:        ${this.stats.fastHealing}`);
    console.log(`   - Movement:            ${this.stats.movement}`);
    console.log(`   - Breathing:           ${this.stats.breathing}`);
    console.log(`   - Immunity:            ${this.stats.immunity}`);
    console.log(`   - Feat grants:         ${this.stats.featGrants}`);
    console.log(`   - Special abilities:   ${this.stats.specialAbilities}`);
    console.log(`   - Failed:              ${this.stats.failed}`);

    const conversionRate = (
      (this.stats.convertedTraits / this.stats.totalTraits) *
      100
    ).toFixed(1);
    console.log(`\n   Conversion rate:    ${conversionRate}%`);
  }
}

// Run migration
const migrator = new SpeciesMigrator();
migrator.migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
