/**
 * Compare template equipment with actual compendium items
 * Identifies missing items and suggests fuzzy matches
 */

const fs = require('fs');
const path = require('path');

// Load character templates
const templatesPath = path.join(__dirname, '..', 'data', 'character-templates.json');
const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));

// Extract all unique equipment items from templates
const templateEquipment = new Set();
templates.templates.forEach(template => {
  if (template.startingEquipment) {
    template.startingEquipment.forEach(item => {
      templateEquipment.add(item.trim());
    });
  }
});

// Load items from compendium packs
const packPaths = [
  '../packs/equipment.db',
  '../packs/weapons.db',
  '../packs/armor.db',
  '../packs/armor-light.db',
  '../packs/armor-medium.db',
  '../packs/armor-heavy.db'
];

const compendiumItems = new Map(); // name -> full item data
packPaths.forEach(packPath => {
  const fullPath = path.join(__dirname, packPath);
  if (!fs.existsSync(fullPath)) return;

  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());

  lines.forEach(line => {
    try {
      const item = JSON.parse(line);
      if (item.name) {
        compendiumItems.set(item.name, item);
      }
    } catch (e) {
      // Skip invalid JSON lines
    }
  });
});

console.log('='.repeat(80));
console.log('COMPENDIUM ANALYSIS');
console.log('='.repeat(80));
console.log(`Total items in compendia: ${compendiumItems.size}`);
console.log(`Total unique items in templates: ${templateEquipment.size}\n`);

// Function to calculate string similarity (Levenshtein distance)
function similarity(s1, s2) {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(s1, s2) {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

// Find matches and mismatches
const exactMatches = [];
const fuzzyMatches = [];
const notFound = [];

Array.from(templateEquipment).sort().forEach(templateItem => {
  // Remove quantity indicators for matching
  const cleanItem = templateItem.replace(/\s*\(\d+\)$/, '');

  // Check for exact match
  if (compendiumItems.has(templateItem)) {
    exactMatches.push(templateItem);
    return;
  }

  // Check for match without quantity
  if (compendiumItems.has(cleanItem)) {
    fuzzyMatches.push({
      template: templateItem,
      compendium: cleanItem,
      type: 'quantity_stripped',
      similarity: 1.0
    });
    return;
  }

  // Find best fuzzy matches
  const matches = [];
  compendiumItems.forEach((item, name) => {
    const sim = similarity(cleanItem, name);
    if (sim > 0.6) {  // 60% similarity threshold
      matches.push({ name, similarity: sim });
    }
  });

  matches.sort((a, b) => b.similarity - a.similarity);

  if (matches.length > 0) {
    fuzzyMatches.push({
      template: templateItem,
      compendium: matches[0].name,
      type: 'fuzzy',
      similarity: matches[0].similarity,
      alternatives: matches.slice(1, 3).map(m => `${m.name} (${(m.similarity * 100).toFixed(0)}%)`),
    });
  } else {
    notFound.push(templateItem);
  }
});

console.log('\n' + '='.repeat(80));
console.log('EXACT MATCHES');
console.log('='.repeat(80));
console.log(`Found ${exactMatches.length} exact matches\n`);

console.log('\n' + '='.repeat(80));
console.log('FUZZY MATCHES (Items that need updating)');
console.log('='.repeat(80));
console.log(`Found ${fuzzyMatches.length} fuzzy matches\n`);

fuzzyMatches.forEach(match => {
  console.log(`❌ Template: "${match.template}"`);
  console.log(`✓  Suggested: "${match.compendium}" (${(match.similarity * 100).toFixed(0)}% match)`);
  if (match.alternatives && match.alternatives.length > 0) {
    console.log(`   Alternatives: ${match.alternatives.join(', ')}`);
  }
  console.log('');
});

console.log('\n' + '='.repeat(80));
console.log('NOT FOUND (Items missing from compendia)');
console.log('='.repeat(80));
console.log(`Found ${notFound.length} items with no match\n`);

notFound.forEach(item => {
  console.log(`❌ ${item}`);
});

console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`✓ Exact matches: ${exactMatches.length}`);
console.log(`⚠ Needs updating: ${fuzzyMatches.length}`);
console.log(`❌ Missing: ${notFound.length}`);
console.log(`Total: ${templateEquipment.size}`);
