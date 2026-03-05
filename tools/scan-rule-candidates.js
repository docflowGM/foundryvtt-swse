/**
 * RULE Candidate Scanner
 *
 * Scans feats.db and talents.db for clean RULE-eligible content.
 * Identifies items that can be cleanly converted to PASSIVE/RULE subtypes.
 *
 * Criteria:
 * - Simple RULE: No duration, no conditions, pure boolean behavior
 * - Must match one of 6 defined RULE types
 * - Reject: duration, action cost, damage, numeric bonuses, complex conditions
 */

import * as fs from 'fs';
import * as readline from 'readline';

const RULE_CATEGORIES = {
  IMMUNE_FEAR: [],
  IMMUNE_POISON: [],
  IMMUNE_MIND_AFFECTING: [],
  IGNORE_COVER: [],
  CANNOT_BE_FLANKED: [],
  TREAT_SKILL_AS_TRAINED: []
};

// Rejection keywords - items matching these are excluded
const REJECTION_KEYWORDS = [
  'duration',
  'round',
  'turn',
  'next',
  'until end',
  'temporary',
  'bonus',
  'modifier',
  '+1', '+2', '+3', '+4', '+5',
  'damage',
  'd6', 'd8', 'd10', 'd20',
  'ally', 'allies', 'adjacent',
  'weapon',
  'level-based',
  'scaling',
  'based on',
  'prerequisite',
  'requires',
  'once per',
  'attack bonus',
  'skill check bonus'
];

/**
 * Check if text contains rejection keywords
 */
function hasRejectionKeywords(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return REJECTION_KEYWORDS.some(keyword => lower.includes(keyword));
}

/**
 * Categorize item by name/description
 */
function categorizeItem(item) {
  const name = (item.name || '').toLowerCase();
  const description = (item.system?.description || '').toLowerCase();
  const fullText = name + ' ' + description;

  // Check for immunity types
  if (fullText.includes('immune') && fullText.includes('fear')) {
    return 'IMMUNE_FEAR';
  }
  if (fullText.includes('immune') && fullText.includes('poison')) {
    return 'IMMUNE_POISON';
  }
  if (fullText.includes('immune') && (fullText.includes('mind') || fullText.includes('mental'))) {
    return 'IMMUNE_MIND_AFFECTING';
  }

  // Check for combat modifiers
  if (fullText.includes('ignore') && fullText.includes('cover')) {
    return 'IGNORE_COVER';
  }
  if (fullText.includes('flank') && (fullText.includes('cannot') || fullText.includes('not be'))) {
    return 'CANNOT_BE_FLANKED';
  }

  // Check for skill training
  if (fullText.includes('treat') && fullText.includes('trained')) {
    return 'TREAT_SKILL_AS_TRAINED';
  }
  if (fullText.includes('skill') && fullText.includes('trained')) {
    return 'TREAT_SKILL_AS_TRAINED';
  }

  return null;
}

/**
 * Process single item
 */
function processItem(item) {
  if (!item || !item.name) return null;

  // Skip items without description
  if (!item.system?.description) return null;

  // Reject items with rejection keywords
  const description = item.system.description || '';
  const name = item.name || '';
  if (hasRejectionKeywords(name + ' ' + description)) {
    return null;
  }

  // Try to categorize
  const category = categorizeItem(item);
  if (!category) return null;

  return {
    id: item._id,
    name: item.name,
    type: item.type,
    category,
    description: description.substring(0, 200), // First 200 chars
    fullDescription: description
  };
}

/**
 * Read and process NDJSON file
 */
async function scanFile(filepath) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filepath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const candidates = [];

    rl.on('line', (line) => {
      try {
        if (line.trim()) {
          const item = JSON.parse(line);
          const candidate = processItem(item);
          if (candidate) {
            candidates.push(candidate);
          }
        }
      } catch (e) {
        // Skip malformed lines
      }
    });

    rl.on('close', () => resolve(candidates));
    rl.on('error', reject);
  });
}

/**
 * Main scan
 */
async function scanRuleCandidates() {
  console.log('\n' + '='.repeat(70));
  console.log('  RULE CANDIDATE SCANNER');
  console.log('='.repeat(70) + '\n');

  // Scan feats
  console.log('Scanning feats.db...');
  const feats = await scanFile('/home/user/foundryvtt-swse/packs/feats.db');
  console.log(`  Found ${feats.length} feat candidates\n`);

  // Scan talents
  console.log('Scanning talents.db...');
  const talents = await scanFile('/home/user/foundryvtt-swse/packs/talents.db');
  console.log(`  Found ${talents.length} talent candidates\n`);

  // Combine and categorize
  const allCandidates = [...feats, ...talents];

  const categorized = {};
  for (const candidate of allCandidates) {
    const cat = candidate.category;
    if (!categorized[cat]) {
      categorized[cat] = [];
    }
    categorized[cat].push(candidate);
  }

  // Output by category
  console.log('='.repeat(70));
  console.log('  CANDIDATES BY CATEGORY');
  console.log('='.repeat(70) + '\n');

  for (const [category, items] of Object.entries(categorized)) {
    console.log(`${category} (${items.length} items)`);
    console.log('-'.repeat(70));

    for (const item of items.slice(0, 5)) { // Show first 5 per category
      console.log(`  ✓ ${item.name} (${item.type})`);
      console.log(`    ID: ${item.id}`);
      console.log(`    "${item.description}..."`);
      console.log();
    }

    if (items.length > 5) {
      console.log(`  ... and ${items.length - 5} more\n`);
    }
  }

  // Summary
  console.log('='.repeat(70));
  console.log('  SUMMARY');
  console.log('='.repeat(70) + '\n');

  for (const [category, items] of Object.entries(categorized)) {
    console.log(`  ${category}: ${items.length}`);
  }

  console.log(`\n  TOTAL: ${allCandidates.length} candidates\n`);

  // Save full list to file
  const output = {
    timestamp: new Date().toISOString(),
    totalCandidates: allCandidates.length,
    categorized: Object.fromEntries(
      Object.entries(categorized).map(([cat, items]) => [
        cat,
        items.map(i => ({ id: i.id, name: i.name, type: i.type }))
      ])
    )
  };

  fs.writeFileSync(
    '/home/user/foundryvtt-swse/tools/rule-candidates.json',
    JSON.stringify(output, null, 2)
  );

  console.log('Full candidate list saved to: tools/rule-candidates.json\n');

  return categorized;
}

// Run
scanRuleCandidates().catch(console.error);
