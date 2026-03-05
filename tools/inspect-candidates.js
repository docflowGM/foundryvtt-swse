/**
 * Detailed Candidate Inspector
 *
 * Extracts full descriptions and system data for review.
 */

import * as fs from 'fs';
import * as readline from 'readline';

const CANDIDATES_TO_INSPECT = [
  '0adc25cfaa35147a', // Insight of the Force
  '63143040b7c229a7', // Scholarly Knowledge
  'd46612d82307f0db', // Drain Knowledge
  '34669d959223b187', // Boarder
  '76eb427551c6495c', // Curved Throw
  '3df46d093b31411d', // Indomitable
  '6714ab8e28708f50', // Fortified Body
  'c7f46a5c92d7dd5e'  // Uncanny Dodge II
];

async function inspectFile(filepath) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filepath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const items = {};

    rl.on('line', (line) => {
      try {
        if (line.trim()) {
          const item = JSON.parse(line);
          if (item._id && CANDIDATES_TO_INSPECT.includes(item._id)) {
            items[item._id] = item;
          }
        }
      } catch (e) {
        // Skip malformed
      }
    });

    rl.on('close', () => resolve(items));
    rl.on('error', reject);
  });
}

async function inspect() {
  console.log('\n' + '='.repeat(80));
  console.log('  DETAILED CANDIDATE INSPECTION');
  console.log('='.repeat(80) + '\n');

  const talents = await inspectFile('/home/user/foundryvtt-swse/packs/talents.db');
  const feats = await inspectFile('/home/user/foundryvtt-swse/packs/feats.db');

  const allItems = { ...talents, ...feats };

  const candidateGroups = {
    'TREAT_SKILL_AS_TRAINED': [
      '0adc25cfaa35147a',
      '63143040b7c229a7',
      'd46612d82307f0db'
    ],
    'IGNORE_COVER': [
      '34669d959223b187',
      '76eb427551c6495c'
    ],
    'IMMUNE_MIND_AFFECTING': ['3df46d093b31411d'],
    'IMMUNE_POISON': ['6714ab8e28708f50'],
    'CANNOT_BE_FLANKED': ['c7f46a5c92d7dd5e']
  };

  for (const [category, ids] of Object.entries(candidateGroups)) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`  ${category}`);
    console.log('='.repeat(80) + '\n');

    for (const id of ids) {
      const item = allItems[id];
      if (!item) {
        console.log(`❌ NOT FOUND: ${id}\n`);
        continue;
      }

      console.log(`📋 ${item.name}`);
      console.log(`   Type: ${item.type}`);
      console.log(`   ID: ${item._id}\n`);

      console.log(`Description:`);
      console.log(`${item.system?.description || '(no description)'}\n`);

      // Check for concerning fields
      const fields = [];
      if (item.system?.grants) fields.push(`  ⚠️  has 'grants' field`);
      if (item.system?.prerequisites) fields.push(`  ⚠️  has 'prerequisites' field`);
      if (item.system?.benefit) fields.push(`  ℹ️  has 'benefit' field`);
      if (item.system?.special) fields.push(`  ℹ️  has 'special' field`);

      if (fields.length > 0) {
        console.log('Fields of interest:');
        fields.forEach(f => console.log(f));
        console.log();
      }

      console.log('-'.repeat(80) + '\n');
    }
  }
}

inspect().catch(console.error);
