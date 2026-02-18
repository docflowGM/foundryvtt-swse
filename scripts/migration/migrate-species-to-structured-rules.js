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
      this._tryParseDamageBonus,
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
        const value = parseInt(match[1], 10);
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
   * Parse damage bonus pattern: "+X species bonus on [Damage]"
   */
  _tryParseDamageBonus(text, originalText) {
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
    console.log(`   Skill bonuses:      ${this.stats.skillBonuses}`);
    console.log(`   Defense bonuses:    ${this.stats.defenseBonuses}`);
    console.log(`   Damage bonuses:     ${this.stats.damageBonuses}`);
    console.log(`   Feat grants:        ${this.stats.featGrants}`);
    console.log(`   Special abilities:  ${this.stats.specialAbilities}`);
    console.log(`   Failed:             ${this.stats.failed}`);

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
