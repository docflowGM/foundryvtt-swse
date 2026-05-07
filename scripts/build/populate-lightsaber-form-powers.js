#!/usr/bin/env node
/**
 * Populate Lightsaber Form Powers Compendium
 *
 * This script reads lightsaber-form-powers.json and populates the
 * packs/lightsaberformpowers.db SQLite database with forcepower items.
 *
 * Lightsaber form powers are modeled as bonus riders on base forcepower mechanics.
 * The bonusTalent field indicates which talent enhances the power, NOT a prerequisite.
 *
 * Usage:
 *   node scripts/build/populate-lightsaber-form-powers.js
 */

const fs = require('fs');
const path = require('path');

/**
 * Extract talent name from formBonus text like 'Lightsaber Form (Juyo): ...'
 */
function extractBonusTalent(formBonusText) {
  if (!formBonusText) return '';
  const match = formBonusText.match(/Lightsaber Form \(([^)]+)\)/);
  return match ? match[1] : '';
}

// Try to use better-sqlite3, fall back to simple approach if not available
let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  console.error('better-sqlite3 not found. Installing would be needed for direct DB writes.');
  console.error('Alternatively, use the Foundry macro version in import-lightsaber-form-powers-to-compendium.js');
  process.exit(1);
}

async function populateLightsaberFormPowers() {
  try {
    // Read JSON data
    const jsonPath = path.join(__dirname, '../../data/lightsaber-form-powers.json');
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const powers = jsonData.powers;

    console.log(`Loaded ${powers.length} lightsaber form powers from JSON`);

    // Open database
    const dbPath = path.join(__dirname, '../../packs/lightsaberformpowers.db');
    const db = new Database(dbPath);

    // Ensure table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS items (
        _id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        img TEXT,
        system TEXT,
        folder TEXT,
        flags TEXT,
        sort INTEGER DEFAULT 0,
        prototypeToken TEXT,
        _stats TEXT
      )
    `);

    const stmt = db.prepare(`
      INSERT INTO items (_id, name, type, img, system, folder, flags, sort, prototypeToken, _stats)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const powerData of powers) {
      try {
        // Check if already exists
        const existing = db.prepare('SELECT _id FROM items WHERE name = ?').get(powerData.name);
        if (existing) {
          console.log(`Skipping "${powerData.name}" - already exists`);
          skipped++;
          continue;
        }

        // Generate ID (Foundry uses 16-char lowercase alphanumeric)
        const id = generateId();

        // Build description
        let fullDescription = '';
        if (powerData.description) {
          fullDescription += powerData.description;
        }
        if (powerData.effect) {
          if (fullDescription) fullDescription += '\n\n';
          fullDescription += powerData.effect;
        }

        // Map discipline
        let discipline = 'telekinetic';
        if (powerData.discipline) {
          const disc = powerData.discipline.toLowerCase();
          if (disc.includes('telekinetic')) discipline = 'telekinetic';
          else if (disc.includes('telepathic')) discipline = 'telepathic';
          else if (disc.includes('vital')) discipline = 'vital';
          else if (disc.includes('dark')) discipline = 'dark-side';
          else if (disc.includes('light')) discipline = 'light-side';
        }

        // Determine useTheForce DC
        let useTheForce = 15;
        if (powerData.dcChart && powerData.dcChart.length > 0) {
          const dcs = powerData.dcChart.map(item => item.dc).sort((a, b) => a - b);
          useTheForce = dcs[0];
        }

        // Extract bonus talent from formBonus text for semantic clarity
        const formBonusText = powerData.formBonus || '';
        const bonusTalent = extractBonusTalent(formBonusText);

        // Build system object
        const system = {
          powerLevel: 1,
          discipline: discipline,
          useTheForce: useTheForce,
          time: powerData.time || 'Standard Action',
          range: powerData.range || '',
          target: powerData.target || '',
          duration: powerData.duration || 'Instantaneous',
          effect: fullDescription,
          special: powerData.special || '',
          dcChart: (powerData.dcChart || []).map(item => ({
            dc: item.dc,
            effect: item.effect,
            description: item.description || ''
          })),
          maintainable: false,
          forcePointEffect: powerData.forcePointEffect || '',
          forcePointCost: powerData.forcePointCost || 0,
          sourcebook: powerData.source || 'Jedi Academy Training Manual',
          page: null,
          tags: powerData.tags || ['lightsaber-form'],
          descriptor: [],
          inSuite: false,
          spent: false,
          uses: {
            current: 0,
            max: 0
          },
          // Lightsaber form power extensions (bonus rider relationship, NOT prerequisites)
          form: powerData.form || '',
          bonusTalent: bonusTalent,
          trigger: powerData.trigger || '',
          formBonus: formBonusText,
          canRebuke: powerData.canRebuke || false
        };

        // Insert into database
        stmt.run(
          id,
          powerData.name,
          'force-power',
          'icons/magic/light/orb-lightbulb-gray.webp',
          JSON.stringify(system),
          null,
          JSON.stringify({}),
          imported + skipped,
          null,
          JSON.stringify({ created: new Date().toISOString(), modified: new Date().toISOString() })
        );

        imported++;

        if (imported % 10 === 0) {
          console.log(`Progress: ${imported} imported, ${skipped} skipped`);
        }

      } catch (error) {
        console.error(`Error importing "${powerData.name}":`, error.message);
        errors++;
      }
    }

    db.close();

    console.log(`\n=== Import Complete ===`);
    console.log(`Imported: ${imported}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log(`Database: ${dbPath}`);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

/**
 * Generate a Foundry-compatible ID (16 characters, lowercase alphanumeric)
 */
function generateId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 16; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

populateLightsaberFormPowers();
