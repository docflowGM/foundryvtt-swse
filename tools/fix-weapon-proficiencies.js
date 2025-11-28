#!/usr/bin/env node

/**
 * Fix weapon proficiencies to match official SWSE rules
 */

const fs = require('fs');
const path = require('path');

const WEAPONS_DB = path.join(__dirname, '..', 'packs', 'weapons.db');

// Corrections based on official SWSE weapon tables
const CORRECTIONS = {
    'Sith Sword': { proficiency: 'simple', subcategory: 'simple' },
    'Sith Tremor Sword': { proficiency: 'simple', subcategory: 'simple' },
    'Wookiee Ryyk Blade': { proficiency: 'exotic', subcategory: 'exotic' }
};

// Read the database
const data = fs.readFileSync(WEAPONS_DB, 'utf8');
const lines = data.split('\n').filter(line => line.trim());

console.log('Fixing weapon proficiencies to match official SWSE rules...\n');

const updatedLines = lines.map(line => {
    try {
        const weapon = JSON.parse(line);

        if (CORRECTIONS[weapon.name]) {
            const correction = CORRECTIONS[weapon.name];
            console.log(`Correcting ${weapon.name}:`);
            console.log(`  Old: proficiency=${weapon.system.proficiency}, subcategory=${weapon.system.subcategory}`);

            weapon.system.proficiency = correction.proficiency;
            weapon.system.subcategory = correction.subcategory;

            console.log(`  New: proficiency=${weapon.system.proficiency}, subcategory=${weapon.system.subcategory}\n`);
        }

        return JSON.stringify(weapon);
    } catch (err) {
        console.error('Error processing line:', err.message);
        return line;
    }
});

// Write back to database
fs.writeFileSync(WEAPONS_DB, updatedLines.join('\n') + '\n', 'utf8');

console.log('✓ Successfully corrected weapon proficiencies');
console.log('\nCorrected weapons:');
console.log('  - Sith Sword: advanced-melee → simple');
console.log('  - Sith Tremor Sword: advanced-melee → simple');
console.log('  - Wookiee Ryyk Blade: advanced-melee → exotic');
