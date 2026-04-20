/**
 * Species Ability Migration Tool
 *
 * Migrates legacy species-traits.json activated abilities to ACTIVE/EFFECT execution model.
 *
 * Current Status:
 * - 10 species have activated abilities in legacy format
 * - These should be migrated to ACTIVE/EFFECT schema
 * - Format: { id, name, actionType, usage: {perEncounter?, perDay?}, description }
 *
 * Usage:
 * node migrate-species-abilities.js --analyze     // Show what needs migration
 * node migrate-species-abilities.js --migrate     // Apply migration
 * node migrate-species-abilities.js --validate    // Verify migrated abilities
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const speciesTraitsJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../data/species-traits.json'), 'utf8')
);

/**
 * Migration candidates (species with activated abilities)
 */
const CANDIDATES = [
  {
    species: 'Balosar',
    ability: 'toxic-breath',
    name: 'Toxic Breath',
    actionType: 'standard',
    frequency: 'unlimited',
    effect: 'Apply -2 penalty to attack rolls (aura effect)'
  },
  {
    species: 'Clawdite',
    ability: 'shapeshifter',
    name: 'Shapeshifter',
    actionType: 'fullRound',
    frequency: 'unlimited',
    effect: 'Alter appearance (custom effect)'
  },
  {
    species: 'Falleen',
    ability: 'pheromones',
    name: 'Pheromones',
    actionType: 'standard',
    frequency: 'unlimited',
    effect: 'Apply -2 penalty to Will Defense in 6 square radius'
  },
  {
    species: 'Gungan',
    ability: 'lucky',
    name: 'Lucky',
    actionType: 'free',
    frequency: 'encounter',
    maxUses: 1,
    effect: 'Reroll attack/skill/ability check (must accept)'
  },
  {
    species: 'Ithorian',
    ability: 'sonic-bellow',
    name: 'Sonic Bellow',
    actionType: 'standard',
    frequency: 'unlimited',
    effect: 'Deal 1d6 sonic damage to adjacent enemies'
  },
  {
    species: 'Mantellian Savrip',
    ability: 'rage',
    name: 'Rage',
    actionType: 'swift',
    frequency: 'day',
    maxUses: 1,
    effect: '+2 bonus on melee attack/damage, penalties on skills, lasts CON_MOD rounds'
  },
  {
    species: 'Trandoshan',
    ability: 'regeneration',
    name: 'Regeneration',
    actionType: 'free',
    frequency: 'encounter',
    maxUses: 1,
    effect: 'Regain hit points equal to level when below half HP'
  },
  {
    species: 'Zabrak',
    ability: 'irrepressible',
    name: 'Irrepressible',
    actionType: 'free',
    frequency: 'encounter',
    maxUses: 1,
    effect: 'Ignore stunned/dazed effects for one turn'
  },
  {
    species: 'Anzat',
    ability: 'quey-drain',
    name: 'Quey Drain',
    actionType: 'standard',
    frequency: 'unlimited',
    effect: 'Deal 1d6 damage to helpless creature, heal self for damage dealt'
  },
  {
    species: 'Ikkrukkian',
    ability: 'war-cry',
    name: 'War Cry',
    actionType: 'swift',
    frequency: 'unlimited',
    effect: 'Grant allies within 6 squares +1 attack bonus until end of encounter'
  }
];

/**
 * Map legacy actionType to ACTIVE schema actionType
 */
const ACTION_TYPE_MAP = {
  'standard': 'standard',
  'move': 'move',
  'swift': 'swift',
  'free': 'free',
  'fullRound': 'full_round',
  'full-round': 'full_round',
  'full round': 'full_round'
};

/**
 * Map legacy frequency to ACTIVE schema frequency
 */
const FREQUENCY_MAP = {
  'unlimited': { type: 'unlimited' },
  'encounter': { type: 'encounter', max: 1 },
  'perEncounter': { type: 'encounter', max: 1 },
  'day': { type: 'day', max: 1 },
  'perDay': { type: 'day', max: 1 },
  'round': { type: 'round', max: 1 },
  'scene': { type: 'scene', max: 1 }
};

/**
 * Analyze what needs migration
 */
function analyze() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SPECIES ABILITY MIGRATION ANALYSIS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`Found ${CANDIDATES.length} species abilities to migrate:\n`);

  CANDIDATES.forEach((candidate, idx) => {
    console.log(`${idx + 1}. ${candidate.species} - ${candidate.name}`);
    console.log(`   Action: ${candidate.actionType}`);
    console.log(`   Frequency: ${candidate.frequency}${candidate.maxUses ? ` (${candidate.maxUses}x)` : ''}`);
    console.log(`   Effect: ${candidate.effect}`);
    console.log();
  });

  console.log('\nMIGRATION STRATEGY:\n');
  console.log('Each ability will be migrated to ACTIVE/EFFECT schema with:');
  console.log('- executionModel: "ACTIVE"');
  console.log('- subType: "EFFECT"');
  console.log('- activation.actionType: mapped from legacy actionType');
  console.log('- frequency: mapped from usage (perEncounter/perDay)');
  console.log('- effect: placeholder for manual implementation');
  console.log('\nNote: Effects require custom handlers (damage rolls, modifiers, etc.)');
  console.log('      These should be implemented in EffectResolver as new effect types.\n');
}

/**
 * Generate ACTIVE/EFFECT schema from legacy ability
 */
function migrateAbility(candidate) {
  const actionType = ACTION_TYPE_MAP[candidate.actionType] || candidate.actionType;
  const frequency = FREQUENCY_MAP[candidate.frequency] || { type: 'unlimited' };

  if (candidate.maxUses) {
    frequency.max = candidate.maxUses;
  }

  return {
    type: 'talent', // or 'feat', depending on delivery method
    name: candidate.name,
    system: {
      executionModel: 'ACTIVE',
      subType: 'EFFECT',
      abilityMeta: {
        activation: {
          actionType: actionType
        },
        frequency: frequency,
        // planned: effect type depends on ability
        // Some are MODIFIER, some are DAMAGE_ROLL, some are CUSTOM
        effect: {
          type: 'CUSTOM', // Placeholder - requires specific implementation
          description: candidate.effect,
          handlerRequired: true
        },
        targeting: {
          // planned: Determine targeting based on effect description
          // Most species abilities are SELF or AREA
          type: 'self',
          notes: 'Targeting requirement: determine from effect description'
        }
      },
      description: candidate.effect
    }
  };
}

/**
 * Generate migration schema for all candidates
 */
function generateMigrationSchema() {
  const schema = {
    migrationDate: new Date().toISOString(),
    totalCandidates: CANDIDATES.length,
    abilities: {}
  };

  CANDIDATES.forEach(candidate => {
    schema.abilities[candidate.ability] = migrateAbility(candidate);
  });

  return schema;
}

/**
 * Show migration details
 */
function showMigrationDetails(ability, schema) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`MIGRATION EXAMPLE: ${ability}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Migrated Schema:');
  console.log(JSON.stringify(schema.abilities[ability], null, 2));

  console.log('\n\nIMPLEMENTATION CHECKLIST:\n');
  const abilityData = schema.abilities[ability];
  const effectType = abilityData.system.abilityMeta.effect.type;

  console.log(`Effect Type: ${effectType}`);
  console.log('Next Steps:');
  console.log('1. [ ] Define effect payload structure (what data does this effect need?)');
  console.log('2. [ ] Implement handler in EffectResolver');
  console.log('3. [ ] Add targeting rules if needed');
  console.log('4. [ ] Add frequency limits if applicable');
  console.log('5. [ ] Create sample ability with this schema');
  console.log('6. [ ] Test in-game activation');
  console.log('7. [ ] Validate against ActiveContractValidator\n');
}

/**
 * Validate migrated schema
 */
function validateSchema(schema) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SCHEMA VALIDATION RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let passCount = 0;
  let failCount = 0;

  for (const [abilityId, ability] of Object.entries(schema.abilities)) {
    const meta = ability.system?.abilityMeta;
    const checks = [];

    // Check required fields
    checks.push({
      name: 'Has executionModel = ACTIVE',
      pass: ability.system?.executionModel === 'ACTIVE'
    });
    checks.push({
      name: 'Has subType = EFFECT',
      pass: ability.system?.subType === 'EFFECT'
    });
    checks.push({
      name: 'Has activation.actionType',
      pass: !!meta?.activation?.actionType
    });
    checks.push({
      name: 'Has frequency',
      pass: !!meta?.frequency
    });
    checks.push({
      name: 'Has effect',
      pass: !!meta?.effect
    });
    checks.push({
      name: 'Has targeting',
      pass: !!meta?.targeting
    });

    const failed = checks.filter(c => !c.pass);
    if (failed.length === 0) {
      passCount++;
      console.log(`✅ ${ability.name}`);
    } else {
      failCount++;
      console.log(`❌ ${ability.name}`);
      failed.forEach(f => console.log(`   - Missing: ${f.name}`));
    }
  }

  console.log(`\nResults: ${passCount} valid, ${failCount} invalid\n`);
}

/**
 * Save migration schema to file
 */
function saveMigrationSchema(schema, outputPath) {
  fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2));
  console.log(`\n✅ Migration schema saved to: ${outputPath}\n`);
}

/**
 * Main CLI
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || '--analyze';

  switch (command) {
    case '--analyze':
      analyze();
      break;

    case '--schema':
      const schema = generateMigrationSchema();
      console.log(JSON.stringify(schema, null, 2));
      break;

    case '--example':
      const exampleSchema = generateMigrationSchema();
      showMigrationDetails('toxic-breath', exampleSchema);
      break;

    case '--validate':
      const validSchema = generateMigrationSchema();
      validateSchema(validSchema);
      break;

    case '--save':
      const outputPath = args[1] || './species-abilities-migrated.json';
      const saveSchema = generateMigrationSchema();
      saveMigrationSchema(saveSchema, outputPath);
      break;

    default:
      console.log(`Unknown command: ${command}`);
      console.log('Available commands:');
      console.log('  --analyze   Show what needs migration');
      console.log('  --schema    Generate migration schema');
      console.log('  --example   Show migration example');
      console.log('  --validate  Validate schema');
      console.log('  --save [path] Save schema to file');
  }
}

main();
