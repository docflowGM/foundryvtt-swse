#!/usr/bin/env node
/**
 * Validate compendium content completeness
 *
 * Reports:
 * - Missing descriptions by pack
 * - Missing images/generic images by pack
 * - Missing mechanical fields by category
 * - Samples of problematic documents
 *
 * Read-only audit tool. Safe to rerun.
 */

import fs from 'fs/promises';
import path from 'path';

const REPO_ROOT = process.cwd();

async function parseNDJSON(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.trim());
    return lines.map((line, idx) => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return { _error: `Line ${idx + 1}`, _line: line.substring(0, 100) };
      }
    });
  } catch (e) {
    return [];
  }
}

async function auditPack(name, packPath, categories = {}) {
  const fullPath = path.join(REPO_ROOT, packPath);
  const docs = await parseNDJSON(fullPath);

  if (docs.length === 0) {
    return { name, total: 0, error: 'Empty or unreadable' };
  }

  const stats = {
    name,
    total: docs.length,
    missingDesc: 0,
    missingImg: 0,
    genericImg: 0,
    missingType: 0,
    samples: []
  };

  docs.forEach((doc, idx) => {
    if (doc._error) return;

    // Count missing fields
    if (!doc.description || doc.description === '') stats.missingDesc++;
    if (!doc.img || doc.img === '') stats.missingImg++;
    if (doc.img && (doc.img.includes('icons/svg') || doc.img.includes('modules/'))) stats.genericImg++;
    if (!doc.type) stats.missingType++;

    // Collect samples of problematic items
    if (idx < 3 && (!doc.description || !doc.img)) {
      stats.samples.push({
        name: doc.name || '(unnamed)',
        hasDesc: !!doc.description && doc.description !== '',
        hasImg: !!doc.img && doc.img !== '',
      });
    }
  });

  return stats;
}

function formatStats(stats) {
  if (stats.error) {
    return `  ❌ ${stats.name}: ${stats.error}`;
  }

  const descPct = stats.missingDesc > 0 ? (stats.missingDesc / stats.total * 100).toFixed(0) : 0;
  const imgStatus = stats.missingImg > 0 ? '❌' : (stats.genericImg > 0 ? '🟡' : '✅');

  let line = `  ${imgStatus} ${stats.name.padEnd(20)} | Total: ${stats.total.toString().padStart(4)} | Desc: ${stats.missingDesc}/${stats.total} (${descPct}%)`;

  if (stats.genericImg > 0) {
    line += ` | Generic Images: ${stats.genericImg}`;
  }

  return line;
}

async function main() {
  console.log('=== SWSE COMPENDIUM CONTENT COMPLETENESS VALIDATOR ===\n');

  const packs = [
    ['classes', 'packs/classes.db'],
    ['species', 'packs/species.db'],
    ['backgrounds', 'packs/backgrounds.db'],
    ['skills', 'packs/skills.db'],
    ['languages', 'packs/languages.db'],
    ['feats', 'packs/feats.db'],
    ['talents', 'packs/talents.db'],
    ['force-powers', 'packs/forcepowers.db'],
    ['equipment', 'packs/equipment.db'],
    ['weapons', 'packs/weapons.db'],
    ['armor', 'packs/armor.db'],
    ['heroic-npcs', 'packs/heroic.db'],
    ['nonheroic-npcs', 'packs/nonheroic.db'],
    ['beasts', 'packs/beasts.db'],
    ['vehicles', 'packs/vehicles.db'],
    ['starships', 'packs/vehicles-starships.db'],
  ];

  console.log('Pack Content Status:');
  console.log('─'.repeat(100));

  let totalDocs = 0;
  let totalMissingDesc = 0;
  let totalGenericImg = 0;

  const results = [];

  for (const [name, packPath] of packs) {
    const stats = await auditPack(name, packPath);
    results.push(stats);

    if (!stats.error) {
      console.log(formatStats(stats));
      totalDocs += stats.total;
      totalMissingDesc += stats.missingDesc;
      totalGenericImg += stats.genericImg;
    } else {
      console.log(formatStats(stats));
    }
  }

  console.log('─'.repeat(100));

  const descPct = totalDocs > 0 ? (totalMissingDesc / totalDocs * 100).toFixed(1) : 0;
  console.log(`\nTOTAL: ${totalDocs} documents | Missing descriptions: ${totalMissingDesc} (${descPct}%) | Generic images: ${totalGenericImg}`);

  // Alert on critical gaps
  console.log('\n=== CRITICAL GAPS ===');

  const criticalGaps = results.filter(r => !r.error && r.missingDesc === r.total);
  if (criticalGaps.length > 0) {
    console.log(`\n🔴 ${criticalGaps.length} packs with 100% missing descriptions:`);
    criticalGaps.forEach(r => console.log(`   - ${r.name} (${r.total} items)`));
  }

  console.log('\n✅ VALIDATOR COMPLETE');
  console.log('\nRecommendations:');
  console.log('  1. Classes & Species descriptions: P0 - required for alpha');
  console.log('  2. Force Powers descriptions: P1 - nice to have');
  console.log('  3. Custom images: Post-alpha art task');
  console.log('\nFor details, see: docs/reports/phase-5-content-feature-backlog.md');
}

main().catch(console.error);
