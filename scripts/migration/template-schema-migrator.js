/**
 * Template Schema Migrator v1 → v2
 *
 * Converts character-templates.json from v1 (mixed name/ref fields, singular feats/talents)
 * to v2 (canonical refs only, arrays for all options).
 *
 * Usage:
 *   node scripts/migration/template-schema-migrator.js
 *
 * Output:
 *   - Migrated JSON printed to stdout
 *   - Migration report to console.error
 */

import fs from 'fs';
import path from 'path';

const TEMPLATE_FILE = new URL('../../data/character-templates.json', import.meta.url);

/**
 * Migrate a single v1 template to v2 canonical schema.
 */
function migrateTemplate(oldTemplate) {
  const migrated = {
    // A. Identification & Presentation
    id: oldTemplate.id,
    name: oldTemplate.name,
    description: oldTemplate.description,
    quote: oldTemplate.quote,
    imagePath: oldTemplate.imagePath,

    // B. Build Classification
    subtype: oldTemplate.subtype || 'actor',
    level: oldTemplate.level || 1,
    supportLevel: oldTemplate.supportLevel || 'FULL',

    // C. Mechanical Selections

    // Class (convert from classRef or className)
    classId: oldTemplate.classRef || {
      pack: 'foundryvtt-swse.classes',
      id: oldTemplate.class || oldTemplate.className,
      name: oldTemplate.className || oldTemplate.class,
      type: 'class'
    },

    // Species (convert from speciesRef or species)
    speciesId: oldTemplate.speciesRef || (oldTemplate.species ? {
      pack: 'foundryvtt-swse.species',
      id: oldTemplate.species.toLowerCase().replace(/\s+/g, '-'),
      name: oldTemplate.species,
      type: 'species'
    } : null),

    // Background (convert from backgroundRef or background)
    backgroundId: oldTemplate.backgroundRef || (oldTemplate.background ? {
      pack: 'foundryvtt-swse.backgrounds',
      id: oldTemplate.background.toLowerCase().replace(/\s+/g, '-'),
      name: oldTemplate.background,
      type: 'background'
    } : null),

    // Ability Scores (use as-is)
    abilityScores: oldTemplate.abilityScores || oldTemplate.abilities || {},

    // Trained Skills (normalize all to objects with id and name)
    trainedSkills: normalizeSkills(oldTemplate.trainedSkills || oldTemplate.skills || []),

    // Feats (merge singular feat + featRef into array)
    feats: normalizeFeats(oldTemplate),

    // Talents (merge singular talent + talentRef into array)
    talents: normalizeTalents(oldTemplate),

    // Talent Tree (convert from talentTreeRef or talentTree)
    talentTreeId: oldTemplate.talentTreeRef || (oldTemplate.talentTree ? {
      pack: 'foundryvtt-swse.talent_trees',
      id: oldTemplate.talentTree.toLowerCase().replace(/\s+/g, '-'),
      name: oldTemplate.talentTree,
      type: 'talenttree'
    } : null),

    // Force Powers (use forcePowerRefs as canonical, or convert from names)
    forcePowers: normalizeForcePowers(oldTemplate),

    // Languages (use as-is or derive from species)
    languages: oldTemplate.languages || deriveLanguagesFromSpecies(oldTemplate),

    // Equipment (convert from equipmentRefs or startingEquipment names)
    equipment: normalizeEquipment(oldTemplate),

    // Credits (use as-is)
    credits: oldTemplate.credits || 0,

    // D. Traversal Policy
    mentor: oldTemplate.mentor || null,
    archetype: oldTemplate.archetype || oldTemplate.name || null,
    roleTags: oldTemplate.roleTags || deriveRoleTags(oldTemplate),
    forceUser: determineForceUser(oldTemplate),

    // E. Metadata
    notes: oldTemplate.notes || null
  };

  return migrated;
}

function normalizeSkills(skillList) {
  if (!Array.isArray(skillList)) {
    return [];
  }

  return skillList.map(skill => {
    if (typeof skill === 'object' && skill.id) {
      return skill;
    }
    // It's a string (UUID or name)
    return {
      id: skill,
      name: skill  // Display name will be looked up later if needed
    };
  });
}

function normalizeFeats(oldTemplate) {
  const feats = [];

  // Add singular feat if present (v1)
  if (oldTemplate.feat) {
    feats.push({
      pack: 'foundryvtt-swse.feats',
      id: oldTemplate.feat.toLowerCase().replace(/\s+/g, '-'),
      name: oldTemplate.feat,
      type: 'feat'
    });
  }

  // Add featRef if present and different from singular
  if (oldTemplate.featRef && oldTemplate.featRef.id) {
    // Check if not duplicate
    if (!feats.some(f => f.id === oldTemplate.featRef.id)) {
      feats.push(oldTemplate.featRef);
    }
  }

  // Add feats array if present (some templates already use arrays)
  if (Array.isArray(oldTemplate.feats)) {
    for (const feat of oldTemplate.feats) {
      if (typeof feat === 'string') {
        feats.push({
          pack: 'foundryvtt-swse.feats',
          id: feat.toLowerCase().replace(/\s+/g, '-'),
          name: feat,
          type: 'feat'
        });
      } else if (typeof feat === 'object' && feat.id) {
        if (!feats.some(f => f.id === feat.id)) {
          feats.push(feat);
        }
      }
    }
  }

  return feats;
}

function normalizeTalents(oldTemplate) {
  const talents = [];

  // Add singular talent if present (v1)
  if (oldTemplate.talent) {
    talents.push({
      pack: 'foundryvtt-swse.talents',
      id: oldTemplate.talent.toLowerCase().replace(/\s+/g, '-'),
      name: oldTemplate.talent,
      type: 'talent'
    });
  }

  // Add talentRef if present and different from singular
  if (oldTemplate.talentRef && oldTemplate.talentRef.id) {
    if (!talents.some(t => t.id === oldTemplate.talentRef.id)) {
      talents.push(oldTemplate.talentRef);
    }
  }

  // Add talents array if present
  if (Array.isArray(oldTemplate.talents)) {
    for (const talent of oldTemplate.talents) {
      if (typeof talent === 'string') {
        talents.push({
          pack: 'foundryvtt-swse.talents',
          id: talent.toLowerCase().replace(/\s+/g, '-'),
          name: talent,
          type: 'talent'
        });
      } else if (typeof talent === 'object' && talent.id) {
        if (!talents.some(t => t.id === talent.id)) {
          talents.push(talent);
        }
      }
    }
  }

  return talents;
}

function normalizeForcePowers(oldTemplate) {
  const powers = [];

  // Use forcePowerRefs if available (most reliable)
  if (Array.isArray(oldTemplate.forcePowerRefs)) {
    return oldTemplate.forcePowerRefs;
  }

  // Fall back to forcePowers array of names
  if (Array.isArray(oldTemplate.forcePowers)) {
    for (const power of oldTemplate.forcePowers) {
      if (typeof power === 'string') {
        powers.push({
          pack: 'foundryvtt-swse.forcepowers',
          id: power.toLowerCase().replace(/\s+/g, '-'),
          name: power,
          type: 'forcepower'
        });
      } else if (typeof power === 'object' && power.id) {
        powers.push(power);
      }
    }
  }

  return powers;
}

function normalizeEquipment(oldTemplate) {
  // Use equipmentRefs if available (most reliable)
  if (Array.isArray(oldTemplate.equipmentRefs)) {
    return oldTemplate.equipmentRefs;
  }

  // Fall back to startingEquipment array of names
  const equipment = [];
  if (Array.isArray(oldTemplate.startingEquipment)) {
    for (const item of oldTemplate.startingEquipment) {
      if (typeof item === 'string') {
        equipment.push({
          pack: 'foundryvtt-swse.equipment',
          id: item.toLowerCase().replace(/\s+/g, '-'),
          name: item,
          type: 'equipment',
          quantity: 1
        });
      } else if (typeof item === 'object') {
        equipment.push(item);
      }
    }
  }

  return equipment;
}

function deriveLanguagesFromSpecies(oldTemplate) {
  const speciesName = oldTemplate.species || oldTemplate.speciesRef?.name;

  const languageMap = {
    'Human': ['Basic'],
    'Droid': ['Binary'],
    'Wookiee': ['Shyriiwook', 'Basic'],
    'Twi\'lek': ['Ryl', 'Basic'],
    'Bothan': ['Bothese', 'Basic'],
    'Mirialan': ['Basic'],
    'Miraluka': ['Basic'],
    'Zabrak': ['Basic'],
    'Sullustan': ['Sullustese', 'Basic'],
    'Trandoshan': ['Dosh'],
    'Mon Calamari': ['Mon Calamarian', 'Basic']
  };

  return languageMap[speciesName] || ['Basic'];
}

function deriveRoleTags(oldTemplate) {
  const tags = [];
  const archetype = (oldTemplate.archetype || oldTemplate.name || '').toLowerCase();
  const className = (oldTemplate.classRef?.name || oldTemplate.className || '').toLowerCase();

  // Add Force-user tag if applicable
  if (oldTemplate.forcePowers?.length || oldTemplate.forcePowerRefs?.length ||
      className.includes('jedi') || className.includes('force')) {
    tags.push('force-user');
  }

  // Add class-based tags
  if (className.includes('soldier')) tags.push('warrior');
  if (className.includes('scoundrel') || className.includes('scout')) tags.push('rogue');
  if (className.includes('noble')) tags.push('diplomat');

  // Add archetype-based tags
  if (archetype.includes('tank') || archetype.includes('defender')) tags.push('tank');
  if (archetype.includes('striker') || archetype.includes('assassin')) tags.push('damage-dealer');
  if (archetype.includes('gunner') || archetype.includes('sniper')) tags.push('ranged');
  if (archetype.includes('guardian')) tags.push('melee');
  if (archetype.includes('diplomat') || archetype.includes('leader')) tags.push('support');

  return tags.length > 0 ? tags : [];
}

function determineForceUser(oldTemplate) {
  if (oldTemplate.forceUser !== undefined) {
    return oldTemplate.forceUser;
  }

  const className = (oldTemplate.classRef?.name || oldTemplate.className || '').toLowerCase();
  const hasForcePowers = (oldTemplate.forcePowers?.length || 0) +
                         (oldTemplate.forcePowerRefs?.length || 0) > 0;

  return className.includes('jedi') || className.includes('force') || hasForcePowers;
}

/**
 * Main migration.
 */
async function main() {
  try {
    const jsonPath = new URL(TEMPLATE_FILE).pathname;
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    console.error(`\n=== Template Schema Migration ===`);
    console.error(`Reading ${jsonData.templates.length} templates from ${jsonPath}`);

    const migrated = {
      version: 2,
      templates: []
    };

    const report = {
      total: jsonData.templates.length,
      success: 0,
      failed: 0,
      issues: []
    };

    for (const oldTemplate of jsonData.templates) {
      try {
        if (!oldTemplate.id) {
          report.issues.push(`Template without ID at index, skipping`);
          report.failed++;
          continue;
        }

        const newTemplate = migrateTemplate(oldTemplate);
        migrated.templates.push(newTemplate);
        report.success++;

        console.error(`  ✓ ${newTemplate.id}`);
      } catch (err) {
        report.failed++;
        report.issues.push(`Error migrating ${oldTemplate.id}: ${err.message}`);
        console.error(`  ✗ ${oldTemplate.id || '(no id)'}: ${err.message}`);
      }
    }

    // Output migrated JSON
    console.log(JSON.stringify(migrated, null, 2));

    // Output report to stderr
    console.error(`\n=== Migration Report ===`);
    console.error(`Total: ${report.total}`);
    console.error(`Success: ${report.success}`);
    console.error(`Failed: ${report.failed}`);

    if (report.issues.length > 0) {
      console.error(`\nIssues:`);
      for (const issue of report.issues) {
        console.error(`  - ${issue}`);
      }
    }

    console.error(`\nNew canonical templates written to stdout.`);
    process.exit(report.failed > 0 ? 1 : 0);
  } catch (err) {
    console.error(`Fatal error during migration:`, err);
    process.exit(1);
  }
}

main();
